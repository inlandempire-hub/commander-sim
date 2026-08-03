import { useEffect, useRef, useState } from "react";
import {
  canMulliganAgain,
  canPlayCardNow,
  modesOf,
  shouldAutoPass,
  targetSelectorOf,
  type Effect,
} from "@mtg-commander-sim/engine";
import type { GameController } from "./gameController.js";
import { PlayerBoard } from "./components/PlayerBoard.js";
import { StackView } from "./components/StackView.js";
import { ActionBar } from "./components/ActionBar.js";
import { CardDetail } from "./components/CardDetail.js";
import { CardPicker, ModePicker } from "./components/CardPicker.js";
import { GameLog } from "./components/GameLog.js";
import { CardFlightLayer } from "./components/CardFlightLayer.js";
import { TableBeat } from "./components/TableBeat.js";
import { TargetArrow } from "./components/TargetArrow.js";
import { MulliganOverlay } from "./components/MulliganOverlay.js";
import { cueForLogLine, play, setSoundEnabled, soundEnabled } from "./sound.js";
import { ArtOverridesProvider, type ArtOverridesByPlayer } from "./artContext.js";
import { FlyingProvider } from "./flightContext.js";
import { useCardFlight } from "./useCardFlight.js";

interface PendingTarget {
  ownerId: string;
  sourceInstanceId: string;
  cardName: string;
  /** Any effect that takes a target - damage, destroy, exile. */
  effect: Effect;
  /** Whether resolving the chosen target should cast a spell or activate a permanent's ability. */
  kind: "cast" | "ability";
  /** Only set when kind is "ability" - which of the source's activatedAbilities to activate. */
  abilityIndex?: number;
  /** Set for a modal spell, chosen before targets since the legal targets depend on it. */
  chosenMode?: number;
}

/** The card the detail panel is reading out, and whose copy of it. */
interface HoveredCard {
  definitionId: string;
  ownerId?: string;
}

function toggleSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * The two things every card on the table needs to know that aren't in the game
 * state: which printing's art this seat chose, and whether this card is
 * currently mid-flight between zones and should stay hidden. Combined into one
 * wrapper purely so the table below doesn't gain a level of nesting per
 * context.
 */
function TableContext({
  art,
  flying,
  children,
}: {
  art: ArtOverridesByPlayer;
  flying: ReadonlySet<string>;
  children: React.ReactNode;
}) {
  return (
    <ArtOverridesProvider value={art}>
      <FlyingProvider value={flying}>{children}</FlyingProvider>
    </ArtOverridesProvider>
  );
}

export interface AppProps {
  controller: GameController;
  modeNotice: string;
  /** Per-deck card art choices, keyed by the seat that chose them. */
  artOverrides?: ArtOverridesByPlayer;
}

export function App({ controller, modeNotice, artOverrides }: AppProps) {
  const { state, lastError, clearError } = controller;
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);
  const [selectedAttackerIds, setSelectedAttackerIds] = useState<Set<string>>(new Set());
  const [selectedBlockerSourceId, setSelectedBlockerSourceId] = useState<string | null>(null);
  const [blockerAssignments, setBlockerAssignments] = useState<Record<string, string>>({});
  const [hovered, setHovered] = useState<HoveredCard | null>(null);
  /** A modal spell waiting on you to choose which mode you're casting. */
  const [pendingMode, setPendingMode] = useState<{ ownerId: string; instanceId: string } | null>(null);
  const [sound, setSound] = useState(soundEnabled);
  /** How far through the log we've already made a noise about. */
  const soundedTo = useRef(0);
  /*
   * Cards physically travelling between zones. This has to be called here,
   * above the "no state yet" return, because hooks can't be conditional - and
   * it wants to be at the top of the tree anyway, since React runs layout
   * effects from the inside out and this one has to measure a fully committed
   * board.
   */
  const { flights, flying } = useCardFlight();

  /*
   * Sound is driven off the log rather than off each action, so anything the
   * engine learns to describe gets a cue for free. Only new lines fire, and
   * only the last few, so catching up after a bot's fast turn doesn't play a
   * chord.
   */
  useEffect(() => {
    const lines = state?.log ?? [];
    if (lines.length < soundedTo.current) soundedTo.current = 0; // log was trimmed
    const fresh = lines.slice(Math.max(soundedTo.current, lines.length - 3));
    soundedTo.current = lines.length;
    for (const line of fresh) {
      const cue = cueForLogLine(line);
      if (cue) play(cue);
    }
  }, [state?.log.length, state]);

  // Auto-pass: whenever the priority holder (a seat this client controls) has
  // nothing productive to do, pass on their behalf instead of making them
  // click through an empty window. Paused while a target-selection is in
  // progress so we don't yank the game forward mid-interaction.
  useEffect(() => {
    if (!state || pendingTarget) return;
    if (state.players.some((p) => p.hasLost)) return;
    const priorityPlayerId = state.players[state.priorityPlayerIndex]?.id;
    if (!priorityPlayerId || !controller.canControlPlayer(priorityPlayerId)) return;
    if (shouldAutoPass(state, priorityPlayerId)) {
      controller.passPriority(priorityPlayerId);
    }
  }, [state, controller, pendingTarget]);

  if (!state) {
    return (
      <div className="table table--waiting">
        <p className="table__notice">{modeNotice}</p>
        <div className="action-bar">
          <div className="action-bar__status">
            <span>{lastError ?? "Waiting for the other player to connect..."}</span>
          </div>
        </div>
      </div>
    );
  }

  const activePlayer = state.players[state.activePlayerIndex]!;
  const priorityPlayerId = state.players[state.priorityPlayerIndex]!.id;
  const defendingPlayerId = state.players.find((p) => p.id !== activePlayer.id)?.id ?? activePlayer.id;
  const canActForPriorityPlayer = controller.canControlPlayer(priorityPlayerId);
  const isDeclareAttackersStep = state.phase === "combat" && state.step === "declare-attackers";
  const isDeclareBlockersStep = state.phase === "combat" && state.step === "declare-blockers";
  // Which zone the pending spell wants a target from, so only that zone lights up.
  const pendingSelector = pendingTarget ? targetSelectorOf(pendingTarget.effect) : undefined;
  const pendingSelectorKind = pendingSelector?.kind;
  const pendingPermanentType = pendingSelector?.kind === "permanent" ? pendingSelector.cardType : undefined;

  /**
   * Who sits at the near edge of the table. In network and bot modes that's
   * the seat this client drives; in hotseat, where the client drives both, it
   * is fixed to the first player rather than following the turn - two people
   * sharing one screen need the board to stay put, and swapping sides every
   * turn would send every card animating across the table.
   */
  const controlled = state.players.filter((p) => controller.canControlPlayer(p.id));
  const bottomPlayer = controlled.length === 1 ? controlled[0]! : state.players[0]!;
  const topPlayers = state.players.filter((p) => p.id !== bottomPlayer.id);

  // What the detail panel reads out. A hovered card wins, because that's you
  // deliberately asking; otherwise it falls back to whatever is currently on
  // the stack, which is the thing you most need to be able to read and the one
  // moment you can't hover it before it resolves.
  const topOfStack = state.stack[state.stack.length - 1];
  const topOfStackCard = topOfStack
    ? state.stackCards.find((c) => c.instanceId === topOfStack.sourceInstanceId)
    : undefined;
  const detailDefinitionId = hovered?.definitionId ?? topOfStackCard?.definitionId;
  const detailOwnerId = hovered ? hovered.ownerId : topOfStackCard?.ownerId;
  const detailReason = hovered ? "hover" : topOfStackCard ? "stack" : undefined;

  // Only surfaced for a seat this client actually drives; the bot answers its
  // own searches, and over the network the other player answers theirs.
  const pendingSearch =
    state.pendingSearch && controller.canControlPlayer(state.pendingSearch.playerId)
      ? state.pendingSearch
      : undefined;
  const searchCandidates = pendingSearch
    ? (state.players.find((p) => p.id === pendingSearch.playerId)?.library ?? []).filter((card) =>
        pendingSearch.candidateInstanceIds.includes(card.instanceId),
      )
    : [];

  /*
   * An opening hand waiting on this client. Same rule as a pending search: the
   * bot answers its own through the engine, and over the network each player
   * answers theirs, so a seat this client doesn't drive shows nothing.
   */
  const mulligan =
    state.mulligan && controller.canControlPlayer(state.mulligan.playerId) ? state.mulligan : undefined;
  const mulliganHand = mulligan
    ? (state.players.find((p) => p.id === mulligan.playerId)?.hand ?? [])
    : [];

  const modeCardDefinition = pendingMode
    ? state.cardDefinitions[
        state.players
          .find((p) => p.id === pendingMode.ownerId)
          ?.hand.find((c) => c.instanceId === pendingMode.instanceId)?.definitionId ?? ""
      ]
    : undefined;
  const modeOptions = modeCardDefinition ? modesOf(modeCardDefinition) : undefined;
  const modeCardName = modeCardDefinition?.name ?? "";

  function handleHover(definitionId: string | null, ownerId?: string) {
    setHovered(definitionId ? { definitionId, ownerId } : null);
  }

  function handleHandCardClick(ownerId: string, instanceId: string) {
    const owner = state!.players.find((p) => p.id === ownerId)!;
    const instance = owner.hand.find((c) => c.instanceId === instanceId);
    if (!instance) return;
    const def = state!.cardDefinitions[instance.definitionId]!;

    if (def.types.includes("Land")) {
      controller.playLand(ownerId, instanceId);
      return;
    }
    // A mode is part of casting, so it's asked before targets - the legal
    // targets depend on which mode you picked.
    if (modesOf(def)) {
      setPendingMode({ ownerId, instanceId });
      return;
    }
    // Any targeted effect opens the same "choose a target" flow - asking
    // targetSelectorOf rather than checking for "damage" specifically means a
    // new targeted effect kind can't quietly end up castable with no target.
    if (def.castEffect && targetSelectorOf(def.castEffect)) {
      setPendingTarget({ ownerId, sourceInstanceId: instanceId, cardName: def.name, effect: def.castEffect, kind: "cast" });
      return;
    }
    controller.castSpell(ownerId, instanceId);
  }

  function handleCommandCardClick(ownerId: string, instanceId: string) {
    controller.castSpell(ownerId, instanceId, [], { fromCommandZone: true });
  }

  function handleBattlefieldCardClick(ownerId: string, instanceId: string) {
    if (pendingTarget) {
      const { ownerId: casterId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
      if (kind === "ability") {
        controller.activateAbility(casterId, sourceInstanceId, abilityIndex ?? 0, [{ kind: "card", instanceId }]);
      } else {
        controller.castSpell(casterId, sourceInstanceId, [{ kind: "card", instanceId }], {
          chosenMode: pendingTarget.chosenMode,
        });
      }
      setPendingTarget(null);
      return;
    }

    if (isDeclareAttackersStep && ownerId === activePlayer.id) {
      setSelectedAttackerIds((prev) => toggleSet(prev, instanceId));
      return;
    }

    if (isDeclareBlockersStep && ownerId !== activePlayer.id) {
      // Clicking a creature that's already blocking takes the block back,
      // rather than silently re-selecting it and leaving the old assignment.
      if (blockerAssignments[instanceId]) {
        setBlockerAssignments((prev) => {
          const next = { ...prev };
          delete next[instanceId];
          return next;
        });
        setSelectedBlockerSourceId(null);
        return;
      }
      setSelectedBlockerSourceId((prev) => (prev === instanceId ? null : instanceId));
      return;
    }

    if (isDeclareBlockersStep && ownerId === activePlayer.id && selectedBlockerSourceId) {
      if (!(instanceId in state!.attackers)) return;
      const blockerId = selectedBlockerSourceId;
      setBlockerAssignments((prev) => ({ ...prev, [blockerId]: instanceId }));
      setSelectedBlockerSourceId(null);
      return;
    }

    if (isDeclareBlockersStep) return;

    const owner = state!.players.find((p) => p.id === ownerId)!;
    const instance = owner.battlefield.find((c) => c.instanceId === instanceId);
    const def = instance ? state!.cardDefinitions[instance.definitionId] : undefined;
    const ability = def?.activatedAbilities?.[0];
    if (ability && targetSelectorOf(ability.effect)) {
      setPendingTarget({
        ownerId,
        sourceInstanceId: instanceId,
        cardName: def!.name,
        effect: ability!.effect,
        kind: "ability",
        abilityIndex: 0,
      });
      return;
    }

    controller.activateAbility(ownerId, instanceId, 0);
  }

  /** Recursion: the chosen target is a card sitting in a graveyard. */
  function handleGraveyardCardClick(instanceId: string) {
    if (!pendingTarget) return;
    const { ownerId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
    const target = { kind: "card" as const, instanceId };
    if (kind === "ability") {
      controller.activateAbility(ownerId, sourceInstanceId, abilityIndex ?? 0, [target]);
    } else {
      controller.castSpell(ownerId, sourceInstanceId, [target], { chosenMode: pendingTarget.chosenMode });
    }
    setPendingTarget(null);
  }

  /** Countering: the chosen target is a spell already on the stack, not a card in a zone. */
  function handleStackObjectClick(stackObjectId: string) {
    if (!pendingTarget) return;
    const { ownerId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
    const target = { kind: "spell" as const, stackObjectId };
    if (kind === "ability") {
      controller.activateAbility(ownerId, sourceInstanceId, abilityIndex ?? 0, [target]);
    } else {
      controller.castSpell(ownerId, sourceInstanceId, [target], { chosenMode: pendingTarget.chosenMode });
    }
    setPendingTarget(null);
  }

  function handlePlayerTargetClick(playerId: string) {
    if (!pendingTarget) return;
    const { ownerId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
    if (kind === "ability") {
      controller.activateAbility(ownerId, sourceInstanceId, abilityIndex ?? 0, [{ kind: "player", playerId }]);
    } else {
      controller.castSpell(ownerId, sourceInstanceId, [{ kind: "player", playerId }], {
        chosenMode: pendingTarget.chosenMode,
      });
    }
    setPendingTarget(null);
  }

  /**
   * A mode has been chosen. If that mode targets, fall straight into the
   * normal target-selection flow carrying the mode with it; if it doesn't,
   * the spell is fully specified and can be cast.
   */
  function handleModeChosen(index: number) {
    if (!pendingMode) return;
    const { ownerId, instanceId } = pendingMode;
    const owner = state!.players.find((p) => p.id === ownerId)!;
    const instance = owner.hand.find((c) => c.instanceId === instanceId);
    const def = instance ? state!.cardDefinitions[instance.definitionId] : undefined;
    const modes = def ? modesOf(def) : undefined;
    const mode = modes?.[index];
    setPendingMode(null);
    if (!def || !mode) return;

    if (targetSelectorOf(mode.effect)) {
      setPendingTarget({
        ownerId,
        sourceInstanceId: instanceId,
        cardName: def.name,
        effect: mode.effect,
        kind: "cast",
        chosenMode: index,
      });
      return;
    }
    controller.castSpell(ownerId, instanceId, [], { chosenMode: index });
  }

  /**
   * Declaring is not the same as being finished: the engine records the
   * declaration but leaves you holding priority, and auto-pass deliberately
   * won't move on while you still have an untapped creature that *could*
   * attack. So confirming has to pass priority too, or the board sits there
   * looking frozen with no indication that a second click is needed.
   */
  function handleConfirmAttackers() {
    const defender = state!.players.find((p) => p.id !== activePlayer.id)!;
    const declarations = [...selectedAttackerIds].map((attackerInstanceId) => ({
      attackerInstanceId,
      defendingPlayerId: defender.id,
    }));
    controller.declareAttackers(activePlayer.id, declarations);
    setSelectedAttackerIds(new Set());
    controller.passPriority(activePlayer.id);
  }

  function handleConfirmBlockers() {
    const defendingPlayer = state!.players.find((p) => p.id !== activePlayer.id)!;
    const declarations = Object.entries(blockerAssignments).map(([blockerInstanceId, attackerInstanceId]) => ({
      blockerInstanceId,
      attackerInstanceId,
    }));
    controller.declareBlockers(defendingPlayer.id, declarations);
    setBlockerAssignments({});
    setSelectedBlockerSourceId(null);
    // The attacker holds priority during declare-blockers, so it's their pass
    // that moves combat on - not the defender's.
    const priorityHolder = state!.players[state!.priorityPlayerIndex]!.id;
    if (controller.canControlPlayer(priorityHolder)) controller.passPriority(priorityHolder);
  }

  function handlePassPriority() {
    const priorityPlayerId = state!.players[state!.priorityPlayerIndex]!.id;
    controller.passPriority(priorityPlayerId);
  }

  /** Shared by both sides, so the only difference between them is `flipped`. */
  const boardProps = (player: (typeof state.players)[number]) => ({
    player,
    state: state!,
    cardDefinitions: state!.cardDefinitions,
    isActivePlayer: player.id === activePlayer.id,
    hasPriority: player.id === priorityPlayerId,
    selectedAttackerIds: player.id === activePlayer.id ? selectedAttackerIds : new Set<string>(),
    attackingIds: new Set(Object.keys(state!.attackers)),
    selectedBlockerSourceId,
    blockerAssignments,
    onHandCardClick: (instanceId: string) => handleHandCardClick(player.id, instanceId),
    onCommandCardClick: (instanceId: string) => handleCommandCardClick(player.id, instanceId),
    onBattlefieldCardClick: (instanceId: string) => handleBattlefieldCardClick(player.id, instanceId),
    onGraveyardCardClick: handleGraveyardCardClick,
    selectingGraveyardTarget:
      pendingSelectorKind === "card-in-your-graveyard" && player.id === pendingTarget?.ownerId,
    selectingPermanentType: pendingPermanentType,
    canPlay:
      // Only for seats this client actually plays, and only while they hold
      // priority - a highlight during someone else's window would be promising
      // something you can't do yet.
      controller.canControlPlayer(player.id) && player.id === priorityPlayerId
        ? (instanceId: string) => canPlayCardNow(state!, player.id, instanceId)
        : undefined,
    onHover: handleHover,
    onLifeClick: () => handlePlayerTargetClick(player.id),
  });

  return (
    <TableContext art={artOverrides ?? {}} flying={flying}>
      <div className="table">
        <header className="table__top">
          <span className="table__title">MTG Commander Sim</span>
          <span className="table__turn">
            Turn {state.turnNumber} — {activePlayer.id}
          </span>
          <span className="table__step">
            {state.phase} / {state.step}
          </span>
          <span className="table__notice">{modeNotice}</span>
          <button
            type="button"
            className="table__sound"
            title={sound ? "Sound on - click to mute" : "Sound off - click to unmute"}
            onClick={() => {
              const next = !sound;
              setSound(next);
              setSoundEnabled(next);
              if (next) play("card");
            }}
          >
            {sound ? "Sound on" : "Sound off"}
          </button>
          <a className="table__link" href="?mode=deck">
            Deck builder
          </a>
        </header>

        {topPlayers.map((player) => (
          <PlayerBoard key={player.id} flipped {...boardProps(player)} />
        ))}

        <div className="table__centre">
            <ActionBar
              state={state}
              onPassPriority={handlePassPriority}
              showConfirmAttackers={isDeclareAttackersStep && controller.canControlPlayer(activePlayer.id)}
              onConfirmAttackers={handleConfirmAttackers}
              showConfirmBlockers={isDeclareBlockersStep && controller.canControlPlayer(defendingPlayerId)}
              onConfirmBlockers={handleConfirmBlockers}
              canActForPriorityPlayer={canActForPriorityPlayer}
              pendingTargetPrompt={
                pendingTarget
                  ? `Choose a target for ${pendingTarget.cardName}`
                  : // Blocking is two clicks and neither is guessable, so say so.
                    isDeclareBlockersStep && controller.canControlPlayer(defendingPlayerId)
                    ? selectedBlockerSourceId
                      ? "Now click the attacker it should block. Click the blocker again to cancel."
                      : `Click one of your creatures, then the attacker it blocks. ${
                          Object.keys(blockerAssignments).length
                        } block(s) set - several creatures can gang up on one attacker.`
                    : null
              }
              showCancel={pendingTarget !== null}
              onCancelTargeting={() => setPendingTarget(null)}
              lastError={lastError}
              onClearError={clearError}
            />
        </div>

        <PlayerBoard key={bottomPlayer.id} {...boardProps(bottomPlayer)} />

        {/* What you're looking at, what is resolving, what has happened. The
            stack sits here rather than between the two boards because it kept
            changing the height of that strip and moving the whole game. */}
        <div className="sidebar">
          <CardDetail
            definition={detailDefinitionId ? state.cardDefinitions[detailDefinitionId] : undefined}
            cardDefinitions={state.cardDefinitions}
            reason={detailReason}
            ownerId={detailOwnerId}
          />
          <StackView
            state={state}
            cardDefinitions={state.cardDefinitions}
            selectingSpellTarget={pendingSelectorKind === "spell"}
            onStackObjectClick={handleStackObjectClick}
            onHover={handleHover}
          />
          <GameLog lines={state.log} />
        </div>

        {/* A tutor has stopped mid-resolution. Only the player it belongs to
            is asked, and only if this client drives that seat - the bot
            answers its own through the same engine call. */}
        {pendingSearch && (
          <CardPicker
            title={`${pendingSearch.playerId}'s library`}
            prompt={pendingSearch.prompt}
            cards={searchCandidates}
            cardDefinitions={state.cardDefinitions}
            onChoose={(instanceId) => controller.resolveSearch(pendingSearch.playerId, instanceId)}
            onDecline={() => controller.resolveSearch(pendingSearch.playerId, null)}
            onHover={handleHover}
          />
        )}

        {pendingMode && modeOptions && (
          <ModePicker
            cardName={modeCardName}
            modes={modeOptions}
            onChoose={handleModeChosen}
            onCancel={() => setPendingMode(null)}
          />
        )}

        {mulligan && (
          <MulliganOverlay
            playerId={mulligan.playerId}
            hand={mulliganHand}
            cardDefinitions={state.cardDefinitions}
            mulligansTaken={mulligan.mulligansTaken}
            bottoming={mulligan.bottoming}
            canMulligan={canMulliganAgain(state)}
            onKeep={() => controller.keepHand(mulligan.playerId)}
            onMulligan={() => controller.takeMulligan(mulligan.playerId)}
            onPutOnBottom={(ids) => controller.putOnBottom(mulligan.playerId, ids)}
            onHover={handleHover}
          />
        )}

        <TableBeat state={state} />

        {/* Both halves of a two-click decision, drawn as a line from the card
            that is waiting on you to wherever you are pointing. Targeting wins
            if somehow both are live - it is the one that has a spell on hold. */}
        {pendingTarget ? (
          <TargetArrow sourceInstanceId={pendingTarget.sourceInstanceId} intent="target" />
        ) : selectedBlockerSourceId ? (
          <TargetArrow sourceInstanceId={selectedBlockerSourceId} intent="block" />
        ) : null}

        {/* Last, and outside every scroll container, so a card crossing the
            table isn't clipped at the edge of the row it left. */}
        <CardFlightLayer state={state} flights={flights} />
      </div>
    </TableContext>
  );
}
