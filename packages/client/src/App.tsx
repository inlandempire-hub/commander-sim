import { useEffect, useRef, useState } from "react";
import {
  attackProblem,
  blockProblem,
  canMulliganAgain,
  canPlayCardNow,
  castingCostOf,
  modesOf,
  mustNotAutoPass,
  planManaPayment,
  shouldAutoPass,
  targetSelectorOf,
  type CardDefinition,
  type Effect,
} from "@mtg-commander-sim/engine";
import type { GameController } from "./gameController.js";
import { PlayerBoard } from "./components/PlayerBoard.js";
import { StackView } from "./components/StackView.js";
import { ActionBar, ConcedeButton } from "./components/ActionBar.js";
import { CardDetail } from "./components/CardDetail.js";
import { CardPicker, ModePicker } from "./components/CardPicker.js";
import { GameLog } from "./components/GameLog.js";
import { CardFlightLayer } from "./components/CardFlightLayer.js";
import { TableBeat } from "./components/TableBeat.js";
import { TablePrompt } from "./components/TablePrompt.js";
import { TargetArrow } from "./components/TargetArrow.js";
import { BlockLines } from "./components/BlockLines.js";
import { MulliganOverlay } from "./components/MulliganOverlay.js";
import { cueForLogLine, play, setSoundEnabled, soundEnabled } from "./sound.js";
import { CardInspect } from "./components/CardInspect.js";
import { ManaPipLayer } from "./components/ManaPipLayer.js";
import { ParticleLayer } from "./components/ParticleLayer.js";
import { StopSettings } from "./components/StopSettings.js";
import { burstForFlight } from "./particles.js";
import {
  emitParticles,
  particlesEnabled,
  particlesSuppressedByMotionPreference,
  setParticlesEnabled,
} from "./particleBus.js";
import { ArtOverridesProvider, type ArtOverridesByPlayer } from "./artContext.js";
import { FlyingProvider } from "./flightContext.js";
import { InspectProvider } from "./inspectContext.js";
import { FLIGHT_MS, useCardFlight } from "./useCardFlight.js";
import { useManaTaps } from "./useManaTaps.js";
import {
  defaultStops,
  loadStops,
  resolveAutoPass,
  saveStops,
  stopKeyFor,
  type StopPreferences,
} from "./stops.js";

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
  /**
   * Which copy. The detail panel only needs the definition, but working out
   * what a card would cost to cast does not: commander tax is counted per
   * instance, and a hand can hold two of the same card.
   */
  instanceId?: string;
}

function toggleSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/**
 * The three things every card on the table needs that aren't in the game
 * state: which printing's art this seat chose, whether this card is currently
 * mid-flight between zones and should stay hidden, and how to ask for itself
 * to be shown large. Combined into one wrapper purely so the table below
 * doesn't gain a level of nesting per context.
 */
function TableContext({
  art,
  flying,
  onInspect,
  children,
}: {
  art: ArtOverridesByPlayer;
  flying: ReadonlySet<string>;
  onInspect: (definition: CardDefinition, ownerId?: string) => void;
  children: React.ReactNode;
}) {
  return (
    <ArtOverridesProvider value={art}>
      <FlyingProvider value={flying}>
        <InspectProvider onInspect={onInspect}>{children}</InspectProvider>
      </FlyingProvider>
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
  const [particles, setParticles] = useState(particlesEnabled);
  /**
   * Something the interface itself wants to say - almost always "you cannot do
   * that, and here is why". Separate from the controller's lastError, which
   * only ever carries what the engine threw.
   */
  const [notice, setNotice] = useState<string | null>(null);
  /** The card being read at full size, from a right-click anywhere. */
  const [inspecting, setInspecting] = useState<{ definition: CardDefinition; ownerId?: string } | null>(
    null,
  );
  const [showStops, setShowStops] = useState(false);
  /**
   * Where the game should stop and ask. Read from storage once, on the first
   * render, rather than in an effect - an effect would play the first step of
   * the game under the defaults before the real settings arrived.
   */
  const [stops, setStops] = useState<StopPreferences>(() =>
    loadStops(typeof window === "undefined" ? undefined : window.localStorage),
  );
  const [fullControl, setFullControl] = useState(false);
  /** How far through the log we've already made a noise about. */
  const soundedTo = useRef(0);
  /*
   * Cards physically travelling between zones. This has to be called here,
   * above the "no state yet" return, because hooks can't be conditional - and
   * it wants to be at the top of the tree anyway, since React runs layout
   * effects from the inside out and this one has to measure a fully committed
   * board.
   *
   * Paused for the whole of the mulligan, for every player, so the opening
   * hand deals out when the last one keeps rather than behind the overlay
   * that is covering the hand at the time.
   */
  const { flights, flying } = useCardFlight(state?.mulligan != null);
  /*
   * Lands turning one at a time, and a pip of mana leaving each for the pool.
   * Same reason as above for living up here: it measures a committed board,
   * and hooks cannot be conditional.
   */
  const manaPips = useManaTaps(state);
  /*
   * Which card journeys have already thrown a burst. Rebuilt from the live
   * flights each time rather than accumulated, so it stays the size of what is
   * currently in the air instead of growing by one string per card moved for
   * the whole game. A flight key carries a sequence number, so a key that has
   * dropped out of the set can never legitimately come back.
   */
  const bursted = useRef<Set<string>>(new Set());
  const burstTimers = useRef<number[]>([]);

  /*
   * Ash when a permanent reaches the graveyard, motes when a spell leaves the
   * stack - both worked out from the same measurements that decide which cards
   * physically travel (see flight.ts), rather than from the engine. The client
   * is never told a creature died; it notices one moved.
   */
  useEffect(() => {
    for (const flight of flights) {
      if (bursted.current.has(flight.key)) continue;
      const scheduled = burstForFlight(flight, FLIGHT_MS);
      if (!scheduled) continue;
      if (scheduled.delayMs <= 0) {
        emitParticles(scheduled.burst);
        continue;
      }
      const timer = window.setTimeout(() => {
        burstTimers.current = burstTimers.current.filter((id) => id !== timer);
        emitParticles(scheduled.burst);
      }, scheduled.delayMs);
      burstTimers.current.push(timer);
    }
    bursted.current = new Set(flights.map((flight) => flight.key));
  }, [flights]);

  useEffect(
    () => () => {
      for (const timer of burstTimers.current) window.clearTimeout(timer);
      burstTimers.current = [];
    },
    [],
  );

  const changeStops = (next: StopPreferences) => {
    setStops(next);
    saveStops(typeof window === "undefined" ? undefined : window.localStorage, next);
  };

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
    for (const entry of fresh) {
      const cue = cueForLogLine(entry.text);
      if (cue) play(cue);
    }
  }, [state?.log.length, state]);

  /*
   * Auto-pass: whenever the priority holder (a seat this client controls) has
   * nothing productive to do, pass on their behalf instead of making them
   * click through an empty window. Paused while a target-selection is in
   * progress so we don't yank the game forward mid-interaction.
   *
   * The engine's answer is now the default rather than the verdict - see
   * stops.ts. `resolveAutoPass` folds in the player's per-step settings and
   * the full-control toggle, but checks `mustNotAutoPass` first, so no
   * combination of preferences can pass on a declaration the rules require.
   *
   * Also paused while the settings panel is open: changing a stop should not
   * fast-forward the game underneath the dialog you are changing it in.
   */
  useEffect(() => {
    if (!state || pendingTarget || showStops) return;
    if (state.players.some((p) => p.hasLost)) return;
    const priorityPlayerId = state.players[state.priorityPlayerIndex]?.id;
    if (!priorityPlayerId || !controller.canControlPlayer(priorityPlayerId)) return;

    const key = stopKeyFor(state.phase, state.step);
    const pass = resolveAutoPass({
      mustNotAutoPass: mustNotAutoPass(state, priorityPlayerId),
      engineWouldAutoPass: shouldAutoPass(state, priorityPlayerId),
      setting: key ? stops[key] : null,
      fullControl,
    });
    if (pass) controller.passPriority(priorityPlayerId);
  }, [state, controller, pendingTarget, stops, fullControl, showStops]);

  /*
   * A noise when the game refuses something.
   *
   * The sound module has had an "error" cue since sound was added and nothing
   * ever played it - every other cue is picked off a log line, and a refusal
   * never reaches the log, because nothing happened. Being told no is exactly
   * the moment a cue earns its place: the message appears in the middle of the
   * table and it is easy to click straight past it.
   */
  const refusal = lastError ?? notice;
  useEffect(() => {
    if (refusal) play("error");
  }, [refusal]);

  if (!state) {
    return (
      <div className="table table--waiting">
        <p className="table__notice">{modeNotice}</p>
        <p className="table__waiting">
          {lastError ?? "Waiting for the other player to connect..."}
        </p>
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

  function handleHover(definitionId: string | null, ownerId?: string, instanceId?: string) {
    setHovered(definitionId ? { definitionId, ownerId, instanceId } : null);
  }

  /**
   * Which of your permanents the hovered card is about to tap.
   *
   * Only for a card you could actually play right now: a spell you cannot
   * afford taps nothing, and a card in someone's graveyard is not being cast
   * at all. `planManaPayment` walks the same greedy choice the real payment
   * does, so the lands that light up are the lands that turn.
   */
  const willTapIds = ((): Set<string> => {
    const owner = hovered?.ownerId;
    if (!owner || !hovered?.instanceId) return new Set();
    const player = state.players.find((p) => p.id === owner);
    if (!player) return new Set();
    const instance =
      player.hand.find((c) => c.instanceId === hovered.instanceId) ??
      player.command.find((c) => c.instanceId === hovered.instanceId);
    if (!instance) return new Set();
    if (!canPlayCardNow(state, owner, instance.instanceId)) return new Set();
    const fromCommandZone = instance.zone === "command";
    const cost = castingCostOf(state, owner, instance.instanceId, fromCommandZone);
    return new Set(planManaPayment(state, owner, cost).taps.map((t) => t.instanceId));
  })();

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
      // Deselecting is always allowed; selecting has to be legal. Asking the
      // engine rather than re-deriving the rule here means the answer is the
      // same one declareAttackers would give, in the same words.
      if (!selectedAttackerIds.has(instanceId)) {
        const problem = attackProblem(state!, ownerId, instanceId);
        if (problem) {
          setNotice(problem);
          return;
        }
      }
      setNotice(null);
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
      if (!(instanceId in state!.attackers)) {
        setNotice("That creature is not attacking");
        return;
      }
      const blockerId = selectedBlockerSourceId;
      const defenderId = state!.players.find((p) => p.id !== activePlayer.id)!.id;
      // Flying is the one that bites: a ground creature can be pointed at a
      // flier all day and the block simply would not happen.
      const problem = blockProblem(state!, defenderId, blockerId, instanceId);
      if (problem) {
        setNotice(problem);
        return;
      }
      setNotice(null);
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
    /*
     * Deliberately does NOT pass priority afterwards.
     *
     * Blocks having been declared is exactly when the attacker gets to respond
     * - the combat trick, the pump spell, the removal on a blocker. Passing
     *   here on their behalf skipped that window entirely, and since this
     *   client drives both seats in hotseat it skipped it silently. Auto-pass
     *   already moves things on when there is genuinely nothing castable, so
     *   leaving priority alone costs nothing when nobody has a play.
     */
  }

  /**
   * Whose seat concedes. In hotseat this client drives both, so it is whoever
   * currently holds priority - the person actually sitting at the keyboard.
   */
  function handleConcede() {
    const holder = state!.players[state!.priorityPlayerIndex]!.id;
    const mine = controller.canControlPlayer(holder)
      ? holder
      : (state!.players.find((p) => controller.canControlPlayer(p.id))?.id ?? holder);
    controller.concede(mine);
  }

  function handlePassPriority() {
    const priorityPlayerId = state!.players[state!.priorityPlayerIndex]!.id;
    controller.passPriority(priorityPlayerId);
  }

  /*
   * Who is blocking what, from both halves of the story.
   *
   * `blockerAssignments` is what this client has picked and not yet confirmed;
   * `state.blockers` is what the engine has actually recorded. Reading only the
   * first meant every sign of a block vanished the instant it was declared -
   * the badges, the highlights and the lines - because confirming clears the
   * client's copy. And declaring blockers deliberately does not pass priority,
   * so the very next thing that happens is an instant window in which the board
   * showed no evidence that a block had been set up at all.
   *
   * The engine clears its own map at end of combat, so nothing here has to
   * remember to stop drawing them.
   */
  const declaredBlocks: Record<string, string> = { ...state.blockers, ...blockerAssignments };

  /**
   * Every creature that could legally be declared as an attacker right now.
   *
   * Asked of the engine rather than re-derived, so the blue highlight and the
   * refusal you get for clicking the wrong card can never disagree.
   */
  const eligibleAttackerIds =
    isDeclareAttackersStep && controller.canControlPlayer(activePlayer.id)
      ? new Set(
          activePlayer.battlefield
            .filter((c) => attackProblem(state, activePlayer.id, c.instanceId) === null)
            .map((c) => c.instanceId),
        )
      : new Set<string>();

  /** Shared by both sides, so the only difference between them is `flipped`. */
  const boardProps = (player: (typeof state.players)[number]) => ({
    player,
    state: state!,
    cardDefinitions: state!.cardDefinitions,
    isActivePlayer: player.id === activePlayer.id,
    hasPriority: player.id === priorityPlayerId,
    selectedAttackerIds: player.id === activePlayer.id ? selectedAttackerIds : new Set<string>(),
    eligibleAttackerIds: player.id === activePlayer.id ? eligibleAttackerIds : new Set<string>(),
    attackingIds: new Set(Object.keys(state!.attackers)),
    selectedBlockerSourceId,
    blockerAssignments: declaredBlocks,
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
    willTapIds,
  });

  return (
    <TableContext
      art={artOverrides ?? {}}
      flying={flying}
      onInspect={(definition, ownerId) => setInspecting({ definition, ownerId })}
    >
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
          {fullControl && (
            // Said in the top bar as well as in the panel: it stops the game
            // at every step, which looks like something being broken if you
            // have forgotten it is on.
            <button
              type="button"
              className="table__full-control"
              title="Full control is on - the game stops at every step. Click to turn it off."
              onClick={() => setFullControl(false)}
            >
              Full control
            </button>
          )}
          <button
            type="button"
            className="table__stops"
            title="Choose which steps the game stops at"
            onClick={() => setShowStops(true)}
          >
            Stops
          </button>
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
          <button
            type="button"
            className="table__sound"
            disabled={particlesSuppressedByMotionPreference()}
            title={
              particlesSuppressedByMotionPreference()
                ? "Your system is set to reduce motion, so particles stay off"
                : particles
                  ? "Particle effects on - click to turn them off"
                  : "Particle effects off - click to turn them on"
            }
            onClick={() => {
              const next = !particles;
              setParticles(next);
              setParticlesEnabled(next);
              // Fires a burst as the confirmation, since the whole point of the
              // setting is something you have to see to judge.
              if (next) {
                emitParticles({
                  kind: "mana-absorb",
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                  color: "#7fce6c",
                });
              }
            }}
          >
            {particlesSuppressedByMotionPreference()
              ? "Effects off (system)"
              : particles
                ? "Effects on"
                : "Effects off"}
          </button>
          <a className="table__link" href="?mode=deck">
            Deck builder
          </a>
        </header>

        {topPlayers.map((player) => (
          <PlayerBoard key={player.id} flipped {...boardProps(player)} />
        ))}

        {/* The controls ride in the gap under the bottom seat's command zone -
            see ActionBar. Concede goes in the rail instead, above the piles,
            because it must never move. */}
        <PlayerBoard
          key={bottomPlayer.id}
          {...boardProps(bottomPlayer)}
          actions={
            <ActionBar
              state={state}
              onPassPriority={handlePassPriority}
              showConfirmAttackers={isDeclareAttackersStep && controller.canControlPlayer(activePlayer.id)}
              onConfirmAttackers={handleConfirmAttackers}
              showConfirmBlockers={isDeclareBlockersStep && controller.canControlPlayer(defendingPlayerId)}
              onConfirmBlockers={handleConfirmBlockers}
              canActForPriorityPlayer={canActForPriorityPlayer}
            />
          }
          concede={<ConcedeButton onConcede={handleConcede} />}
        />

        <TablePrompt
          prompt={
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
          error={lastError ?? notice}
          onClearError={() => {
            clearError();
            setNotice(null);
          }}
          showCancel={pendingTarget !== null}
          onCancel={() => setPendingTarget(null)}
        />

        {/* What you're looking at, what is resolving, what has happened. The
            stack sits here rather than between the two boards because it kept
            changing the height of that strip and moving the whole game. */}
        <div className="sidebar">
          <CardDetail
            definition={detailDefinitionId ? state.cardDefinitions[detailDefinitionId] : undefined}
            cardDefinitions={state.cardDefinitions}
            ownerId={detailOwnerId}
          />
          <StackView
            state={state}
            cardDefinitions={state.cardDefinitions}
            selectingSpellTarget={pendingSelectorKind === "spell"}
            onStackObjectClick={handleStackObjectClick}
            onHover={handleHover}
          />
          <GameLog entries={state.log} currentTurn={state.turnNumber} />
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
          />
        )}

        {showStops && (
          <StopSettings
            stops={stops}
            onChange={changeStops}
            fullControl={fullControl}
            onFullControlChange={setFullControl}
            onClose={() => setShowStops(false)}
            onReset={() => changeStops(defaultStops())}
          />
        )}

        {/* Above every other overlay, because it can be opened from inside one
            - reading a card during the mulligan is exactly when you most need
            to. */}
        {inspecting && (
          <CardInspect
            definition={inspecting.definition}
            cardDefinitions={state.cardDefinitions}
            ownerId={inspecting.ownerId}
            onClose={() => setInspecting(null)}
          />
        )}

        <TableBeat state={state} />

        {/* Mana leaving the lands that were just tapped. Purely decorative:
            the pool in the rail is already correct before the first one
            arrives. */}
        <ManaPipLayer pips={manaPips} />

        {/* Mana landing in the pool, sparks off a creature taking damage, ash
            where a permanent hit the graveyard. One canvas for all of it, and
            nothing here is ever the only thing reporting an event - see the
            note at the top of particles.ts. */}
        <ParticleLayer />

        {/* Every block that has been declared, held on screen until combat
            damage clears them. Under the live arrow, so a block being chosen
            still reads as the thing in progress. */}
        <BlockLines assignments={declaredBlocks} />

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
