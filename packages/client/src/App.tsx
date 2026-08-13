import { useEffect, useRef, useState } from "react";
import {
  activatableAbilities,
  affordableXValues,
  attackProblem,
  blockProblem,
  canMulliganAgain,
  canPlayCardNow,
  canPlayLandsFromGraveyard,
  castingCostOf,
  meetsBoardCondition,
  modesOf,
  mustNotAutoPass,
  planManaPayment,
  requiresX,
  shouldAutoPass,
  targetSelectorOf,
  type CardDefinition,
  type Effect,
  type StackTarget,
} from "@mtg-commander-sim/engine";
import type { GameController } from "./gameController.js";
import { PlayerBoard } from "./components/PlayerBoard.js";
import {
  MAX_VOLUME,
  cueForLogLine,
  play,
  primeSounds,
  setSoundEnabled,
  setSoundVolume,
  soundEnabled,
  soundVolume,
} from "./sound.js";
import { StackView } from "./components/StackView.js";
import { ActionBar, ConcedeButton } from "./components/ActionBar.js";
import { CardDetail } from "./components/CardDetail.js";
import { CardPicker, FacePicker, ModePicker, XPicker } from "./components/CardPicker.js";
import { GameLog } from "./components/GameLog.js";
import { CardFlightLayer } from "./components/CardFlightLayer.js";
import { TableBeat } from "./components/TableBeat.js";
import { TablePrompt } from "./components/TablePrompt.js";
import { TargetArrow } from "./components/TargetArrow.js";
import { BlockLines } from "./components/BlockLines.js";
import { MulliganOverlay } from "./components/MulliganOverlay.js";
import { CardInspect } from "./components/CardInspect.js";
import { ManaPipLayer } from "./components/ManaPipLayer.js";
import { ParticleLayer } from "./components/ParticleLayer.js";
import { StopSettings } from "./components/StopSettings.js";
import { AbilityPicker, type AbilityOption } from "./components/AbilityPicker.js";
import { ConfirmTrigger } from "./components/ConfirmTrigger.js";
import { describeActivated, describeCard } from "./cardText.js";
import { burstsForFlight, spellColor } from "./particles.js";
import { findInstance } from "./cardLookup.js";
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
  /** Set for a spell with {X}, announced before targets for the same reason. */
  chosenX?: number;
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
  /** A spell with {X} in its cost, waiting on a value. Asked before targets, like a mode. */
  const [pendingX, setPendingX] = useState<{ ownerId: string; instanceId: string } | null>(null);
  /**
   * A modal double-faced card waiting on which half you meant. Asked before X
   * and before a mode, since the other face has neither.
   */
  const [pendingFace, setPendingFace] = useState<{ ownerId: string; instanceId: string } | null>(null);
  /**
   * What has already been announced for a spell part-way through being cast -
   * the creature given up for an additional cost, and whether the alternative
   * cost is being taken.
   *
   * Held beside the flow rather than threaded through `pendingX`, `pendingMode`
   * and `pendingTarget` in turn, because a card can want all of them at once
   * and each hop would have to carry the others. Keyed by instance so a stale
   * answer cannot attach itself to the next spell cast.
   */
  const [castExtras, setCastExtras] = useState<{
    instanceId: string;
    sacrificeInstanceId?: string;
    useAlternativeCost?: boolean;
  } | null>(null);
  /**
   * "As an additional cost to cast this spell, sacrifice a creature" - waiting
   * on which one. Asked before X, a mode or targets, because a cost that
   * cannot be paid means the spell is not cast at all.
   */
  const [pendingSacrificeCost, setPendingSacrificeCost] = useState<{
    ownerId: string;
    instanceId: string;
  } | null>(null);
  const [sound, setSound] = useState(soundEnabled);
  const [volume, setVolume] = useState(soundVolume);
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
  /** A permanent with more than one usable ability, waiting on which one. */
  const [abilityChoice, setAbilityChoice] = useState<{
    ownerId: string;
    instanceId: string;
    cardName: string;
    options: AbilityOption[];
  } | null>(null);
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
      // What colour a resolving spell goes off in. Looked up by instance id
      // because the card has already left the stack by the time this runs -
      // see cardLookup.ts.
      const instance = state ? findInstance(state, flight.instanceId) : undefined;
      const definition = instance ? state?.cardDefinitions[instance.definitionId] : undefined;
      for (const scheduled of burstsForFlight(flight, FLIGHT_MS, {
        color: definition ? spellColor(definition.manaCost) : undefined,
      })) {
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
    }
    bursted.current = new Set(flights.map((flight) => flight.key));
  }, [flights, state]);

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
   * only the last few, so catching up after a bot's fast turn plays a handful
   * of samples rather than thirty at once.
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
   * A chip laid down for every land that taps. Not off the log - mana payment
   * writes no line, because it is a step on the way to casting rather than an
   * event in its own right. One cue per batch rather than per land: paying
   * {4} taps four lands inside a few hundred milliseconds and four clacks on
   * top of each other is a rattle.
   */
  const manaHeard = useRef(0);
  useEffect(() => {
    if (manaPips.length > manaHeard.current) play("mana");
    manaHeard.current = manaPips.length;
  }, [manaPips.length]);

  /*
   * A noise when the game refuses something. Being told no never reaches the
   * log - nothing happened - and the message appears in the middle of the
   * table where it is easy to click straight past.
   */
  const refusal = lastError ?? notice;
  useEffect(() => {
    if (refusal) play("refuse");
  }, [refusal]);

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
  // A list, because a selector may name more than one ("noncreature artifact
  // or noncreature enchantment"), and every zone it could point at should light
  // up rather than only the first.
  const pendingPermanentTypes =
    pendingSelector?.kind === "permanent" ? pendingSelector.cardTypes : undefined;

  /**
   * Who sits at the near edge of the table: the one seat this client drives.
   * Every other seat is drawn across the table with its hand face-down - see
   * `hideHand` on PlayerBoard. The fallback to the first player only covers a
   * controller reporting no controllable seat at all, which no shipped mode
   * does; it keeps the board renderable rather than crashing on it.
   */
  const controlled = state.players.filter((p) => controller.canControlPlayer(p.id));
  const bottomPlayer = controlled[0] ?? state.players[0]!;
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

  // Same rule for a "you may" trigger: only the seat it belongs to is asked.
  const pendingConfirmation =
    state.pendingConfirmation && controller.canControlPlayer(state.pendingConfirmation.playerId)
      ? state.pendingConfirmation
      : undefined;

  /*
   * A discard somebody else's spell has demanded of a seat this client drives.
   *
   * The only question in the game that arrives on your turn or theirs, from a
   * spell you did not cast - so the same "is this my seat" rule matters more
   * here than anywhere else: over the network the caster must not be shown
   * their opponent's hand, and the filtered state means they could not read it
   * even if the picker were rendered.
   */
  const pendingDiscard =
    state.pendingDiscards[0] && controller.canControlPlayer(state.pendingDiscards[0].playerId)
      ? state.pendingDiscards[0]
      : undefined;
  /**
   * A resolution that has stopped to ask which creature you are giving up -
   * Disciple of Freyalise. Only shown to the seat it belongs to, like every
   * other mid-resolution question.
   */
  const pendingSacrifice =
    state.pendingSacrifice && controller.canControlPlayer(state.pendingSacrifice.playerId)
      ? state.pendingSacrifice
      : null;
  const sacrificeCandidates = pendingSacrifice
    ? (state.players.find((p) => p.id === pendingSacrifice.playerId)?.battlefield ?? []).filter((c) =>
        pendingSacrifice.candidateInstanceIds.includes(c.instanceId),
      )
    : [];
  /** The creatures that could pay an additional cost on the spell being cast. */
  const sacrificeCostCandidates = pendingSacrificeCost
    ? (state.players.find((p) => p.id === pendingSacrificeCost.ownerId)?.battlefield ?? []).filter(
        (c) => state.cardDefinitions[c.definitionId]?.types.includes("Creature"),
      )
    : [];
  const discardCandidates = pendingDiscard
    ? (state.players.find((p) => p.id === pendingDiscard.playerId)?.hand ?? [])
    : [];

  /*
   * A triggered ability parked waiting for a target - Blood Artist, Duskshell
   * Crawler. Same rule again: only the seat that owns it is asked.
   *
   * Unlike `pendingTarget`, this is not something this client set up. The
   * engine decided the ability targets, worked out every legal answer, and is
   * holding the whole game until one is named - so the candidate list comes
   * from the state rather than from a selector evaluated here, and the board
   * lights up from that list.
   */
  const pendingTriggerChoice =
    state.pendingTargetChoices[0] && controller.canControlPlayer(state.pendingTargetChoices[0].playerId)
      ? state.pendingTargetChoices[0]
      : undefined;
  const triggerCandidateInstanceIds = new Set(
    (pendingTriggerChoice?.candidates ?? [])
      .filter((c): c is Extract<typeof c, { kind: "card" }> => c.kind === "card")
      .map((c) => c.instanceId),
  );
  const triggerCandidatePlayerIds = new Set(
    (pendingTriggerChoice?.candidates ?? [])
      .filter((c): c is Extract<typeof c, { kind: "player" }> => c.kind === "player")
      .map((c) => c.playerId),
  );

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

  const xCardDefinition = pendingX
    ? state.cardDefinitions[
        state.players
          .find((p) => p.id === pendingX.ownerId)
          ?.hand.find((c) => c.instanceId === pendingX.instanceId)?.definitionId ?? ""
      ]
    : undefined;
  const xCardName = xCardDefinition?.name ?? "";
  // Asked of the engine rather than worked out here, so the list offered is the
  // list the engine will accept.
  const xValues = pendingX ? affordableXValues(state, pendingX.ownerId, pendingX.instanceId) : [];

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

  function handleHandCardClick(
    ownerId: string,
    instanceId: string,
    /**
     * Answers already collected this pass, handed straight in rather than read
     * back from state - a `setState` in the same tick has not landed yet, so
     * re-entering the flow would ask the same question again forever.
     */
    already: { sacrificeInstanceId?: string } = {},
  ) {
    const owner = state!.players.find((p) => p.id === ownerId)!;
    const instance = owner.hand.find((c) => c.instanceId === instanceId);
    if (!instance) return;
    const def = state!.cardDefinitions[instance.definitionId]!;

    if (def.types.includes("Land")) {
      controller.playLand(ownerId, instanceId);
      return;
    }

    /*
     * "You may cast this spell without paying its mana cost."
     *
     * Taken rather than offered. It is a "may" on the card, and the real rules
     * let you decline - but nothing in this engine makes paying the mana
     * better, so an overlay here would be a question with one sensible answer.
     * The same shortcut ward and "unless its controller pays" already take,
     * and the day a card punishes free spells this is where the question goes.
     */
    const freeCast =
      def.alternativeCost !== undefined &&
      meetsBoardCondition(state!, ownerId, def.alternativeCost.condition);
    if (freeCast && castExtras?.instanceId !== instanceId) {
      setCastExtras({ instanceId, useAlternativeCost: true });
    }

    /*
     * The additional cost comes before everything else, because a cost that
     * cannot be paid means the spell was never cast - not a spell that resolves
     * and does less.
     */
    if (def.additionalCost?.kind === "sacrifice-creature" && !already.sacrificeInstanceId) {
      setPendingSacrificeCost({ ownerId, instanceId });
      return;
    }
    /*
     * A modal double-faced card is two cards in one, and which one you meant is
     * the first question - before X, before a mode, before targets, because the
     * other face has none of those. Asked every time rather than guessed: "cast
     * the spell if you can afford it, otherwise play the land" would take the
     * land drop away from you on the turn you wanted it.
     */
    if (def.backFaceId && !pendingFace) {
      setPendingFace({ ownerId, instanceId });
      return;
    }
    // X is announced first of all - before the mode and before targets -
    // because it is part of the cost, and the cost is what decides whether the
    // spell can be cast at all.
    if (affordableXValues(state!, ownerId, instanceId).length > 0 && !def.types.includes("Land")) {
      setPendingX({ ownerId, instanceId });
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
    finishCast(ownerId, instanceId, [], {
      // Handed in rather than read back: a spell that asked no further question
      // reaches here in the same tick the free cast was decided.
      justDecided: {
        useAlternativeCost: freeCast || undefined,
        sacrificeInstanceId: already.sacrificeInstanceId,
      },
    });
  }

  /**
   * Casts, folding in whatever was announced earlier in the flow.
   *
   * Every cast that came through the hand goes through here, so a card that
   * asks two questions cannot have one of the answers dropped on the way - the
   * exact failure `chosenMode` had over the network.
   */
  function finishCast(
    ownerId: string,
    instanceId: string,
    targets: StackTarget[] = [],
    options: {
      chosenMode?: number;
      chosenX?: number;
      /**
       * Answers decided in this same tick, which `castExtras` cannot supply -
       * a `setState` has not landed by the time the cast goes out, so a spell
       * that asked no further question would be cast without them.
       */
      justDecided?: { sacrificeInstanceId?: string; useAlternativeCost?: boolean };
    } = {},
  ) {
    const stored = castExtras?.instanceId === instanceId ? castExtras : null;
    const { justDecided, ...rest } = options;
    setCastExtras(null);
    controller.castSpell(ownerId, instanceId, targets, {
      ...rest,
      sacrificeInstanceId: justDecided?.sacrificeInstanceId ?? stored?.sacrificeInstanceId,
      useAlternativeCost: justDecided?.useAlternativeCost ?? stored?.useAlternativeCost,
    });
  }

  /** The creature chosen to pay an additional cost - the spell carries on from here. */
  function handleSacrificeCostChosen(sacrificeInstanceId: string) {
    if (!pendingSacrificeCost) return;
    const { ownerId, instanceId } = pendingSacrificeCost;
    setPendingSacrificeCost(null);
    setCastExtras((current) => ({ ...(current ?? { instanceId }), instanceId, sacrificeInstanceId }));
    // Re-enter the ordinary path now the cost is settled. The guard in
    // `handleHandCardClick` reads `castExtras`, so it does not ask again.
    handleHandCardClick(ownerId, instanceId, { sacrificeInstanceId });
  }

  function handleCommandCardClick(ownerId: string, instanceId: string) {
    controller.castSpell(ownerId, instanceId, [], { fromCommandZone: true });
  }

  function handleBattlefieldCardClick(ownerId: string, instanceId: string) {
    // A parked trigger comes first: nobody has priority while one is waiting,
    // so no other click on the board can mean anything yet.
    if (pendingTriggerChoice && triggerCandidateInstanceIds.has(instanceId)) {
      controller.chooseTriggerTarget(pendingTriggerChoice.playerId, { kind: "card", instanceId });
      return;
    }
    if (pendingTarget) {
      const { ownerId: casterId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
      if (kind === "ability") {
        controller.activateAbility(casterId, sourceInstanceId, abilityIndex ?? 0, [{ kind: "card", instanceId }]);
      } else {
        finishCast(casterId, sourceInstanceId, [{ kind: "card", instanceId }], {
          chosenMode: pendingTarget.chosenMode,
          chosenX: pendingTarget.chosenX,
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
    if (!def) return;

    /*
     * Which ability, when a permanent has more than one usable right now.
     *
     * This used to activate index 0 unconditionally, which was survivable while
     * the only multi-ability cards were dual lands - the auto-tapper picks the
     * right half of those when paying for a spell, so nobody clicked them. It
     * stopped being survivable once a card's interesting half was not its
     * first: Swarmyard's regenerate, Twilight Mire's filter modes, Delighted
     * Halfling's restricted mana were all in the pool and unreachable.
     */
    const usable = activatableAbilities(state!, ownerId, instanceId);
    if (usable.length === 0) return;
    if (usable.length > 1) {
      setAbilityChoice({
        ownerId,
        instanceId,
        cardName: def.name,
        options: usable.map((index) => ({
          index,
          text: describeActivated(def.activatedAbilities![index]!, state!.cardDefinitions, def),
        })),
      });
      return;
    }

    activateChosenAbility(ownerId, instanceId, usable[0]!);
  }

  /**
   * Runs one specific ability: straight to the engine, or into the targeting
   * flow first if it needs something to point at. Shared by the single-ability
   * path and the picker, so both behave identically once the choice is made.
   */
  function activateChosenAbility(ownerId: string, instanceId: string, abilityIndex: number) {
    const owner = state!.players.find((p) => p.id === ownerId)!;
    const instance = owner.battlefield.find((c) => c.instanceId === instanceId);
    const def = instance ? state!.cardDefinitions[instance.definitionId] : undefined;
    const ability = def?.activatedAbilities?.[abilityIndex];
    if (!ability || !def) return;

    if (targetSelectorOf(ability.effect)) {
      setPendingTarget({
        ownerId,
        sourceInstanceId: instanceId,
        cardName: def.name,
        effect: ability.effect,
        kind: "ability",
        abilityIndex,
      });
      return;
    }

    controller.activateAbility(ownerId, instanceId, abilityIndex);
  }

  /** Recursion: the chosen target is a card sitting in a graveyard. */
  function handleGraveyardCardClick(instanceId: string) {
    /*
     * "You may play lands from your graveyard" - Icetill Explorer.
     *
     * Checked before the targeting path, because with no spell waiting for a
     * target a click on the graveyard can only mean this. The engine re-checks
     * the permission, the land drop and the timing, so an illegal click gets
     * the ordinary refusal rather than a silent nothing.
     */
    if (!pendingTarget) {
      const found = findInstance(state!, instanceId);
      if (!found) return;
      const def = state!.cardDefinitions[found.definitionId];
      if (!def?.types.includes("Land")) return;
      if (!controller.canControlPlayer(found.ownerId)) return;
      if (!canPlayLandsFromGraveyard(state!, found.ownerId)) return;
      controller.playLand(found.ownerId, instanceId);
      return;
    }
    const { ownerId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
    const target = { kind: "card" as const, instanceId };
    if (kind === "ability") {
      controller.activateAbility(ownerId, sourceInstanceId, abilityIndex ?? 0, [target]);
    } else {
      finishCast(ownerId, sourceInstanceId, [target], {
        chosenMode: pendingTarget.chosenMode,
        chosenX: pendingTarget.chosenX,
      });
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
      finishCast(ownerId, sourceInstanceId, [target], {
        chosenMode: pendingTarget.chosenMode,
        chosenX: pendingTarget.chosenX,
      });
    }
    setPendingTarget(null);
  }

  function handlePlayerTargetClick(playerId: string) {
    if (pendingTriggerChoice && triggerCandidatePlayerIds.has(playerId)) {
      controller.chooseTriggerTarget(pendingTriggerChoice.playerId, { kind: "player", playerId });
      return;
    }
    if (!pendingTarget) return;
    const { ownerId, sourceInstanceId, kind, abilityIndex } = pendingTarget;
    if (kind === "ability") {
      controller.activateAbility(ownerId, sourceInstanceId, abilityIndex ?? 0, [{ kind: "player", playerId }]);
    } else {
      finishCast(ownerId, sourceInstanceId, [{ kind: "player", playerId }], {
        chosenMode: pendingTarget.chosenMode,
        chosenX: pendingTarget.chosenX,
      });
    }
    setPendingTarget(null);
  }

  /**
   * A mode has been chosen. If that mode targets, fall straight into the
   * normal target-selection flow carrying the mode with it; if it doesn't,
   * the spell is fully specified and can be cast.
   */
  /**
   * A face has been chosen. The back is always a land here, so it goes down as
   * a land drop; the front falls into the ordinary casting flow, which still
   * has to ask about X, modes and targets afterwards.
   */
  function handleFaceChosen(face: "front" | "back") {
    if (!pendingFace) return;
    const { ownerId, instanceId } = pendingFace;
    setPendingFace(null);
    if (face === "back") {
      controller.playLand(ownerId, instanceId);
      return;
    }
    // Re-enter the normal path now that the face is settled. `pendingFace` is
    // already cleared, so the guard at the top does not bounce it straight back.
    handleHandCardClick(ownerId, instanceId);
  }

  function handleXChosen(x: number) {
    if (!pendingX) return;
    const { ownerId, instanceId } = pendingX;
    const owner = state!.players.find((p) => p.id === ownerId)!;
    const instance = owner.hand.find((c) => c.instanceId === instanceId);
    const def = instance ? state!.cardDefinitions[instance.definitionId] : undefined;
    setPendingX(null);
    if (!def) return;

    if (def.castEffect && targetSelectorOf(def.castEffect)) {
      setPendingTarget({
        ownerId,
        sourceInstanceId: instanceId,
        cardName: def.name,
        effect: def.castEffect,
        kind: "cast",
        chosenX: x,
      });
      return;
    }
    finishCast(ownerId, instanceId, [], { chosenX: x });
  }

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
    finishCast(ownerId, instanceId, [], { chosenMode: index });
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
     *   here on their behalf skipped that window entirely. Auto-pass already
     *   moves things on when there is genuinely nothing castable, so leaving
     *   priority alone costs nothing when nobody has a play.
     */
  }

  /**
   * Whose seat concedes: yours, whether or not you hold priority at the time.
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
      (pendingSelectorKind === "card-in-your-graveyard" && player.id === pendingTarget?.ownerId) ||
      // Or the graveyard is a place you can play a land from, which is the
      // only other reason a card in it is ever clickable.
      (controller.canControlPlayer(player.id) &&
        player.id === priorityPlayerId &&
        canPlayLandsFromGraveyard(state, player.id) &&
        player.graveyard.some((c) => state.cardDefinitions[c.definitionId]?.types.includes("Land"))),
    selectingPermanentTypes: pendingPermanentTypes,
    triggerTargetIds: triggerCandidateInstanceIds,
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
            className="table__particles"
            title={sound ? "Sound on - click to mute" : "Sound off - click to unmute"}
            onClick={() => {
              const next = !sound;
              setSound(next);
              setSoundEnabled(next);
              // Turning it on is also the click that lets the browser start an
              // audio context at all, so it is the right moment to fetch every
              // sample and to play one as the confirmation.
              if (next) {
                primeSounds();
                play("card");
              }
            }}
          >
            {sound ? "Sound on" : "Sound off"}
          </button>
          {/*
              The level, beside the switch that turns it on.
              
              Only when sound is on: a volume slider on a muted game is a
              control that does nothing, and the first thing anyone does with
              one of those is drag it and conclude the sound is broken.

              `input` moves the gain live so you hear the level as you drag;
              `change` fires once on release and plays a card, because the
              only way to judge a level is against the thing it applies to.
              The gain is ramped rather than assigned - see setSoundVolume.
          */}
          {sound && (
            <input
              type="range"
              className="table__volume"
              min={0}
              max={MAX_VOLUME}
              step={0.05}
              value={volume}
              title={`Volume ${Math.round((volume / MAX_VOLUME) * 100)}%`}
              aria-label="Volume"
              onChange={(e) => {
                const next = Number(e.target.value);
                setVolume(next);
                setSoundVolume(next);
              }}
              onPointerUp={() => play("card")}
              onKeyUp={() => play("card")}
            />
          )}
          <button
            type="button"
            className="table__particles"
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

        {/* Face-down, always. There is no mode in which you may look at
            another player's hand - see the note on `hideHand`. */}
        {topPlayers.map((player) => (
          <PlayerBoard key={player.id} flipped hideHand {...boardProps(player)} />
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
            // A parked trigger holds the whole game, so its question comes
            // first - there is nothing else the player could be doing.
            pendingTriggerChoice
              ? pendingTriggerChoice.prompt
              : pendingTarget
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
            // A surveil that finds nothing leaves the card where it was; a
            // tutor that finds nothing takes nothing. Different sentences.
            declineLabel={pendingSearch.destination === "graveyard" ? "Leave it on top" : undefined}
            onHover={handleHover}
          />
        )}

        {/* Somebody's spell has made *this* seat discard. The same picker as a
            tutor, over your own hand, and with no way to decline - discarding
            is not optional, so there is no "take nothing" button here. */}
        {pendingDiscard && (
          <CardPicker
            title={`${pendingDiscard.playerId}'s hand`}
            prompt={pendingDiscard.prompt}
            cards={discardCandidates}
            cardDefinitions={state.cardDefinitions}
            onChoose={(instanceId) => controller.resolveDiscard(pendingDiscard.playerId, instanceId)}
            onHover={handleHover}
          />
        )}

        {/* A resolution waiting on which creature you give up. Declining is
            offered only when the card said "may" - the engine refuses it
            otherwise, so a button that led to an error would be worse than
            none. */}
        {pendingSacrifice && (
          <CardPicker
            title="Sacrifice a creature"
            prompt={pendingSacrifice.prompt}
            cards={sacrificeCandidates}
            cardDefinitions={state.cardDefinitions}
            onChoose={(instanceId) =>
              controller.resolveSacrificeChoice(pendingSacrifice.playerId, instanceId)
            }
            onDecline={
              pendingSacrifice.optional
                ? () => controller.resolveSacrificeChoice(pendingSacrifice.playerId, null)
                : undefined
            }
            declineLabel="Sacrifice nothing"
            onHover={handleHover}
          />
        )}

        {/* The same question asked a step earlier, as part of casting: "as an
            additional cost, sacrifice a creature". No decline - a cost is not
            optional, and a spell whose cost goes unpaid is not cast. Cancelling
            is the picker's own escape, which leaves the card in hand. */}
        {pendingSacrificeCost && (
          <CardPicker
            title="Additional cost"
            prompt="Sacrifice a creature to cast this spell"
            cards={sacrificeCostCandidates}
            cardDefinitions={state.cardDefinitions}
            onChoose={handleSacrificeCostChosen}
            onDecline={() => setPendingSacrificeCost(null)}
            declineLabel="Don't cast it"
            onHover={handleHover}
          />
        )}

        {pendingFace && (() => {
          const owner = state.players.find((p) => p.id === pendingFace.ownerId);
          const card = owner?.hand.find((c) => c.instanceId === pendingFace.instanceId);
          const front = card ? state.cardDefinitions[card.definitionId] : undefined;
          const back = front?.backFaceId ? state.cardDefinitions[front.backFaceId] : undefined;
          if (!front || !back) return null;
          return (
            <FacePicker
              front={{ name: front.name, lines: describeCard(front, state.cardDefinitions) }}
              back={{ name: back.name, lines: describeCard(back, state.cardDefinitions) }}
              onChoose={(face) => handleFaceChosen(face)}
              onCancel={() => setPendingFace(null)}
            />
          );
        })()}

        {pendingConfirmation && (
          <ConfirmTrigger
            prompt={pendingConfirmation.prompt}
            onAnswer={(accept) => controller.resolveConfirmation(pendingConfirmation.playerId, accept)}
          />
        )}

        {pendingX && (
          <XPicker
            cardName={xCardName}
            values={xValues}
            onChoose={handleXChosen}
            onCancel={() => setPendingX(null)}
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

        {abilityChoice && (
          <AbilityPicker
            cardName={abilityChoice.cardName}
            options={abilityChoice.options}
            onChoose={(index) => {
              const { ownerId, instanceId } = abilityChoice;
              setAbilityChoice(null);
              activateChosenAbility(ownerId, instanceId, index);
            }}
            onCancel={() => setAbilityChoice(null)}
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

        <TableBeat
          state={state}
          nearPlayerId={bottomPlayer.id}
          youId={controlled.length === 1 ? controlled[0]!.id : undefined}
        />

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
        <CardFlightLayer
          state={state}
          flights={flights}
          hiddenHandOwnerIds={new Set(topPlayers.map((p) => p.id))}
        />
      </div>
    </TableContext>
  );
}
