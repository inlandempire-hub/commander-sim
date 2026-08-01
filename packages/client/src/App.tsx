import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { canPlayCardNow, shouldAutoPass, targetSelectorOf, type Effect } from "@mtg-commander-sim/engine";
import type { GameController } from "./gameController.js";
import { PlayerBoard } from "./components/PlayerBoard.js";
import { StackView } from "./components/StackView.js";
import { ActionBar } from "./components/ActionBar.js";
import { CardDetail } from "./components/CardDetail.js";

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
}

function toggleSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export interface AppProps {
  controller: GameController;
  modeNotice: string;
}

export function App({ controller, modeNotice }: AppProps) {
  const { state, lastError, clearError } = controller;
  const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);
  const [selectedAttackerIds, setSelectedAttackerIds] = useState<Set<string>>(new Set());
  const [selectedBlockerSourceId, setSelectedBlockerSourceId] = useState<string | null>(null);
  const [blockerAssignments, setBlockerAssignments] = useState<Record<string, string>>({});
  const [hoveredDefinitionId, setHoveredDefinitionId] = useState<string | null>(null);

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
      <div className="app">
        <h1 className="app__title">MTG Commander Sim</h1>
        <p className="app__notice">{modeNotice}</p>
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

  // What the detail panel reads out. A hovered card wins, because that's you
  // deliberately asking; otherwise it falls back to whatever is currently on
  // the stack, which is the thing you most need to be able to read and the one
  // moment you can't hover it before it resolves.
  const topOfStack = state.stack[state.stack.length - 1];
  const topOfStackCard = topOfStack
    ? state.stackCards.find((c) => c.instanceId === topOfStack.sourceInstanceId)
    : undefined;
  const detailDefinitionId = hoveredDefinitionId ?? topOfStackCard?.definitionId;
  const detailReason = hoveredDefinitionId ? "hover" : topOfStackCard ? "stack" : undefined;

  function handleHandCardClick(ownerId: string, instanceId: string) {
    const owner = state!.players.find((p) => p.id === ownerId)!;
    const instance = owner.hand.find((c) => c.instanceId === instanceId);
    if (!instance) return;
    const def = state!.cardDefinitions[instance.definitionId]!;

    if (def.types.includes("Land")) {
      controller.playLand(ownerId, instanceId);
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
        controller.castSpell(casterId, sourceInstanceId, [{ kind: "card", instanceId }]);
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
      controller.castSpell(ownerId, sourceInstanceId, [target]);
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
      controller.castSpell(ownerId, sourceInstanceId, [target]);
    }
    setPendingTarget(null);
  }

  function handlePlayerTargetClick(playerId: string) {
    if (!pendingTarget) return;
    const { ownerId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
    if (kind === "ability") {
      controller.activateAbility(ownerId, sourceInstanceId, abilityIndex ?? 0, [{ kind: "player", playerId }]);
    } else {
      controller.castSpell(ownerId, sourceInstanceId, [{ kind: "player", playerId }]);
    }
    setPendingTarget(null);
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

  return (
    <div className="app">
      <h1 className="app__title">MTG Commander Sim</h1>
      <p className="app__notice">
        {modeNotice}{" "}
        <a className="app__link" href="?mode=deck">
          Deck builder
        </a>
      </p>

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

      <AnimatePresence>
        {state.players.map((player) => (
          <PlayerBoard
            key={player.id}
            player={player}
            state={state}
            cardDefinitions={state.cardDefinitions}
            isActivePlayer={player.id === activePlayer.id}
            hasPriority={player.id === state.players[state.priorityPlayerIndex]!.id}
            selectedAttackerIds={player.id === activePlayer.id ? selectedAttackerIds : new Set()}
            attackingIds={new Set(Object.keys(state.attackers))}
            selectedBlockerSourceId={selectedBlockerSourceId}
            blockerAssignments={blockerAssignments}
            onHandCardClick={(instanceId) => handleHandCardClick(player.id, instanceId)}
            onCommandCardClick={(instanceId) => handleCommandCardClick(player.id, instanceId)}
            onBattlefieldCardClick={(instanceId) => handleBattlefieldCardClick(player.id, instanceId)}
            onGraveyardCardClick={handleGraveyardCardClick}
            selectingGraveyardTarget={
              pendingSelectorKind === "card-in-your-graveyard" && player.id === pendingTarget?.ownerId
            }
            selectingPermanentType={pendingPermanentType}
            canPlay={
              // Only for seats this client actually plays, and only while
              // they hold priority - a highlight during someone else's window
              // would be promising something you can't do yet.
              controller.canControlPlayer(player.id) && player.id === priorityPlayerId
                ? (instanceId) => canPlayCardNow(state!, player.id, instanceId)
                : undefined
            }
            onHover={setHoveredDefinitionId}
            onLifeClick={() => handlePlayerTargetClick(player.id)}
          />
        ))}
      </AnimatePresence>

      <StackView
        state={state}
        cardDefinitions={state.cardDefinitions}
        selectingSpellTarget={pendingSelectorKind === "spell"}
        onStackObjectClick={handleStackObjectClick}
        onHover={setHoveredDefinitionId}
      />

      <CardDetail
        definition={detailDefinitionId ? state.cardDefinitions[detailDefinitionId] : undefined}
        cardDefinitions={state.cardDefinitions}
        reason={detailReason}
      />
    </div>
  );
}
