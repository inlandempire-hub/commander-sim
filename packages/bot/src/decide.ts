import type { ChosenOnEntry } from "@mtg-commander-sim/engine";
import { activateRestrictionProblem, staticBuffsOf } from "@mtg-commander-sim/engine";
import {
  abilityAvailable,
  isValidTarget,
  legalTargetsFor,
  targetCountOf,
  targetSelectorOf,
  manaValue,
  type CardDefinition,
  type Effect,
  type GameState,
  type ManaCost,
  type Player,
  type StackTarget,
  type TargetSelector,
} from "@mtg-commander-sim/engine";
import { chooseAttackers, chooseBlockers } from "./combat.js";
import {
  creatureValue,
  definitionOf,
  fixedAmount,
  hasKeyword,
  opponentsOf,
  power,
  toughness,
  wouldDie,
} from "./evaluate.js";
import { chooseSearchResult, couldAfford } from "./mana.js";
import { chooseCardsToBottom, shouldKeepHand } from "./mulligan.js";
import {
  castableCommander,
  castableFromHand,
  castOrTapToward,
  NO_COST,
  type Castable,
} from "./handOptions.js";
import { combatTrick, counterSomething, reserveForCounterspell } from "./instants.js";
import { PASS, type BotAction } from "./types.js";

/**
 * Roughly a vanilla 2/2 on the `creatureValue` scale. Hard removal is a card;
 * trading it for something smaller than this loses more than it gains.
 */
const WORTH_A_REMOVAL_SPELL = 8;

/**
 * Whether to take a "you may" trigger.
 *
 * Yes, with one exception that matters: a draw is refused when the library
 * cannot pay for it. Every card of this family in the pool is upside, so the
 * default is to accept - but drawing from an empty library is an immediate
 * loss under state-based actions, and a bot that says yes to Deathreap Ritual
 * on its last card decks itself for one card it did not need.
 *
 * Deliberately reads the effect off the pending object rather than looking the
 * ability up on the card again: the permanent that printed it may already be
 * in a graveyard, and the trigger still resolves.
 */
function shouldAcceptTrigger(state: GameState, botPlayerId: string): boolean {
  const pending = state.pendingConfirmation;
  if (!pending) return false;
  const me = state.players.find((p) => p.id === botPlayerId);
  const effect = pending.object.effect;
  if (effect.kind === "draw" && me) {
    // A draw whose size is counted at resolution cannot be checked against the
    // library here, so the "would this deck me out?" guard does not apply and
    // the trigger is simply taken. Same posture as everywhere else the bot
    // meets a dynamic amount: skip the heuristic rather than guess a number.
    const amount = fixedAmount(effect.amount);
    return amount === null || me.library.length >= amount;
  }
  return true;
}

/**
 * Decides the single next thing the bot should do, given the game state as
 * the bot is allowed to see it.
 *
 * Deliberately returns ONE action rather than a plan. The caller loops -
 * feeding each action back through the engine and asking again - which keeps
 * this function pure and means the bot re-reads reality after every step
 * instead of committing to a plan that a trigger might have invalidated.
 * Multi-step sequences (tap three lands, then cast) fall out of the loop
 * naturally: each call taps one more land until the cost is payable.
 *
 * IMPORTANT: `state` must be the *filtered* view (see the protocol package's
 * filterGameStateForViewer). The bot must not be able to read hidden zones,
 * and the runners guarantee that so this file never has to think about it.
 */
/**
 * Where to point a triggered ability the engine has parked.
 *
 * Deliberately crude. A trigger aimed at a player goes at an opponent - Blood
 * Artist drains them rather than the bot. One aimed at a permanent goes at the
 * bot's own best creature, which is right for Duskshell Crawler's +1/+1 counter.
 *
 * It reads the effect for the one shape where the target is not a gift: "gain
 * control of target permanent" wants somebody else's board, and Zealous
 * Conscripts pointed at the bot's own creature is a five-mana 3/3 that untapped
 * something. Anything else added later whose target is a cost rather than a
 * present belongs in the same check.
 *
 * The engine only parks a choice when there are two or more legal targets, and
 * guarantees every candidate here is one of them.
 */
function chooseTriggerTargets(state: GameState, botPlayerId: string): StackTarget[] {
  const pending = state.pendingTargetChoices[0]!;
  /*
   * "Untap **one or two** target attacking creatures" - Raph & Leo, the first
   * trigger that may point at more than one thing.
   *
   * The bot takes as many as it is allowed, which is right for every card of
   * this shape in the pool today because all of them are pure upside on the
   * bot's own board. It is a heuristic and not a rule: a card that made
   * targeting a *cost* would need this to read the effect rather than assume
   * more is better, exactly as `chooseTriggerTarget` below already warns.
   */
  if (pending.max > 1) {
    const ranked = [...pending.candidates].sort(
      (a, b) => targetPreference(state, botPlayerId, b) - targetPreference(state, botPlayerId, a),
    );
    return ranked.slice(0, pending.max);
  }
  return [chooseTriggerTarget(state, botPlayerId)];
}

/** How much the bot would rather have this target than another. */
function targetPreference(state: GameState, botPlayerId: string, target: StackTarget): number {
  if (target.kind !== "card") return 0;
  const instance = findOnBattlefield(state, target.instanceId);
  if (!instance || instance.controllerId !== botPlayerId) return -1;
  return creatureValue(state, instance);
}

function chooseTriggerTarget(state: GameState, botPlayerId: string): StackTarget {
  const pending = state.pendingTargetChoices[0]!;
  const candidates = pending.candidates;
  const opponent = candidates.find((c) => c.kind === "player" && c.playerId !== botPlayerId);
  if (opponent) return opponent;

  // Whose board this trigger wants. Stealing something is the one case where the
  // answer is not the bot's own best creature.
  const steals = pending.object.effect.kind === "gainControl";
  const wanted = candidates
    .filter((c): c is Extract<StackTarget, { kind: "card" }> => c.kind === "card")
    .map((c) => ({ target: c as StackTarget, instance: findOnBattlefield(state, c.instanceId) }))
    .filter((entry) =>
      steals
        ? entry.instance !== undefined && entry.instance.controllerId !== botPlayerId
        : entry.instance?.controllerId === botPlayerId,
    );
  if (wanted.length > 0) {
    const best = wanted.reduce((a, b) =>
      creatureValue(state, b.instance!) > creatureValue(state, a.instance!) ? b : a,
    );
    return best.target;
  }
  return candidates[0]!;
}

function findOnBattlefield(state: GameState, instanceId: string) {
  for (const player of state.players) {
    const found = player.battlefield.find((c) => c.instanceId === instanceId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Which card the bot gives up when something makes it discard.
 *
 * Pitches the least useful thing it can: a surplus land first - counting what
 * is already on the battlefield, since the fifth land in hand is worth far less
 * than the second - and otherwise the most expensive card, which is the one
 * least likely to be castable before the game is decided.
 *
 * Deliberately not "the cheapest": a bot that pitched its one-mana removal and
 * kept a seven-drop it will never cast is making the discard *better* for the
 * opponent than a random one, which is the failure this whole change exists to
 * fix.
 */
function chooseDiscard(state: GameState, me: Player): string {
  const landsInPlay = me.battlefield.filter(
    (c) => definitionOf(state, c)?.types.includes("Land"),
  ).length;
  const scored = me.hand.map((card) => {
    const def = definitionOf(state, card);
    const isLand = def?.types.includes("Land") ?? false;
    // A land is the obvious pitch once there are enough of them, and the last
    // thing to go when there are not.
    const score = isLand
      ? landsInPlay >= 5
        ? 100
        : -100
      : manaValue(def?.manaCost ?? { generic: 0, colors: {} });
    return { id: card.instanceId, score };
  });
  return scored.reduce((a, b) => (b.score > a.score ? b : a)).id;
}

export function decideAction(state: GameState, botPlayerId: string): BotAction {
  const me = state.players.find((p) => p.id === botPlayerId);
  if (!me || me.hasLost) return PASS;
  if (state.players.some((p) => p.hasLost)) return PASS; // game's over, stop playing

  // A tutor of the bot's own has stopped to ask which card to take. Nothing
  // else can happen in the game until it answers, so this comes before
  // everything - including the priority gate, since mid-resolution nobody has
  // priority at all.
  if (state.pendingSearch?.playerId === botPlayerId) {
    return { kind: "resolveSearch", instanceId: chooseSearchResult(state, botPlayerId) };
  }

  /*
   * A permanent of the bot's own has entered and is waiting to be told what it
   * chose. Nothing at all can happen until it is answered - not even priority -
   * so this comes first alongside the other mid-resolution questions. A bot
   * with no opinion here is a hung game rather than a weak opponent.
   */
  if (state.pendingEnterChoice?.playerId === botPlayerId) {
    return { kind: "chooseOnEntry", answer: chooseOnEntry(state, me) };
  }

  // Same for a "you may" trigger of the bot's own.
  if (state.pendingConfirmation?.playerId === botPlayerId) {
    return { kind: "resolveConfirmation", accept: shouldAcceptTrigger(state, botPlayerId) };
  }

  // And for a trigger of the bot's own waiting to be pointed at something.
  if (state.pendingTargetChoices[0]?.playerId === botPlayerId) {
    return { kind: "chooseTriggerTargets", targets: chooseTriggerTargets(state, botPlayerId) };
  }

  // A discard an opponent's spell has demanded. Not the bot's own spell - this
  // is the one question in the game aimed at the player who is *not* resolving.
  if (state.pendingDiscards[0]?.playerId === botPlayerId) {
    return { kind: "resolveDiscard", instanceId: chooseDiscard(state, me) };
  }

  /*
   * "You may sacrifice another creature." Declined outright when the card
   * allows it.
   *
   * Not because giving one up is never right - Disciple of Freyalise trades a
   * creature for that many cards and that much life, which is often a fine
   * deal - but because the bot has no way to weigh a creature against cards,
   * and a rule that always said yes would feed it its best creature every
   * time. Declining is the play it can defend.
   */
  /*
   * A "choose some cards". Declined whenever the card allows it, for the same
   * reason the sacrifice choice is: the bot has no way to weigh a creature
   * against cards, and a rule that always said yes would feed it its board.
   *
   * The one exception is a choice it is *required* to answer, where it takes
   * the cheapest legal set rather than stalling the game.
   */
  if (state.pendingCardChoices[0]?.playerId === botPlayerId) {
    const pending = state.pendingCardChoices[0];
    if (pending.min === 0) return { kind: "resolveCardChoice", instanceIds: [] };
    return {
      kind: "resolveCardChoice",
      instanceIds: pending.candidateInstanceIds.slice(0, pending.min),
    };
  }

  /*
   * "Pay any amount of life." Zero, always: the bot cannot judge what the cards
   * are worth against its own life total, and any other answer would be a
   * number picked for no reason.
   */
  if (state.pendingAmount?.playerId === botPlayerId) {
    return { kind: "resolveAmountChoice", amount: 0 };
  }

  if (state.pendingSacrifice?.playerId === botPlayerId) {
    const pending = state.pendingSacrifice;
    if (pending.optional) return { kind: "resolveSacrificeChoice", instanceId: null };
    // Not optional: give up the weakest thing on the board, the same rule the
    // additional-cost version uses.
    const weakest = pending.candidateInstanceIds
      .map((id) => me.battlefield.find((c) => c.instanceId === id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
      .sort((a, b) => power(state, a) - power(state, b))[0];
    return { kind: "resolveSacrificeChoice", instanceId: weakest?.instanceId ?? null };
  }

  // Opening hands come before even that: the game has not started, nobody has
  // priority, and nothing at all can happen until this is settled.
  if (state.mulligan?.playerId === botPlayerId) {
    if (state.mulligan.bottoming) {
      return { kind: "putOnBottom", instanceIds: chooseCardsToBottom(state, botPlayerId) };
    }
    return shouldKeepHand(state, botPlayerId) ? { kind: "keepHand" } : { kind: "takeMulligan" };
  }

  const isMyTurn = state.players[state.activePlayerIndex]?.id === botPlayerId;

  // Combat declarations aren't priority actions, so they're checked before the
  // priority gate. Each is only offered while nothing has been declared yet -
  // that's what stops the loop re-declaring forever, without needing the bot
  // to remember anything between calls.
  if (state.phase === "combat" && state.step === "declare-attackers" && isMyTurn) {
    if (Object.keys(state.attackers).length === 0) {
      const declarations = chooseAttackers(state, botPlayerId);
      if (declarations.length > 0) return { kind: "declareAttackers", declarations };
    }
  }
  if (state.phase === "combat" && state.step === "declare-blockers" && !isMyTurn) {
    // Always declare, even with nothing: "I block with nothing" is a real
    // decision, and the attacker's priority window doesn't open until it has
    // been made. Staying silent used to leave the step waiting forever.
    if (!state.blockersDeclared) {
      return { kind: "declareBlockers", declarations: chooseBlockers(state, botPlayerId) };
    }
  }

  const hasPriority = state.players[state.priorityPlayerIndex]?.id === botPlayerId;
  if (!hasPriority) return PASS;

  // Instant-speed responses come first, because they're the only actions legal
  // in the windows where everything below is not: an opponent's turn, or with
  // something already on the stack.
  const response = counterSomething(state, me) ?? combatTrick(state, me);
  if (response) return response;

  const inMainPhase = state.phase === "precombat-main" || state.phase === "postcombat-main";
  if (!isMyTurn || !inMainPhase || state.stack.length > 0) return PASS;

  // Mana kept untapped so a counterspell in hand is still castable on the way
  // back around. Everything sorcery-speed has to fit around it.
  const reserve = reserveForCounterspell(state, me);

  return (
    playALand(state, me) ??
    sweepTheBoard(state, me) ??
    reanimate(state, me, reserve) ??
    developTheBoard(state, me, reserve) ??
    useValueAbility(state, me) ??
    removeSomething(state, me, reserve) ??
    destroyAPermanent(state, me, reserve) ??
    searchLibrary(state, me, reserve) ??
    drawCards(state, me, reserve) ??
    gainLifeIfDesperate(state, me) ??
    PASS
  );
}

/**
 * "Return target creature card from your graveyard." Ranked ahead of casting
 * something from hand, because the best creature already in the graveyard is
 * usually better than anything left in hand - that is why it died.
 *
 * Only fires for a target worth a card, so the bot doesn't spend Raise Dead on
 * the Storm Crow that chump-blocked three turns ago.
 */
function reanimate(state: GameState, me: Player, reserve: ManaCost = NO_COST): BotAction | null {
  const spells = castableFromHand(state, me, (def) => def.castEffect?.kind === "returnFromGraveyard", reserve);
  if (spells.length === 0) return null;
  spells.sort((a, b) => manaValue(a.cost) - manaValue(b.cost));

  for (const spell of spells) {
    const effect = spell.definition.castEffect;
    if (effect?.kind !== "returnFromGraveyard") continue;

    const legal = me.graveyard
      .filter((c) => isValidTarget(state, effect.target, { kind: "card", instanceId: c.instanceId }, me.id))
      .sort((a, b) => creatureValue(state, b) - creatureValue(state, a));

    const best = legal[0];
    if (!best) continue;
    // A creature card scores on its stats; anything else (an artifact, a
    // sorcery) has no creatureValue, so fall back to what it cost to cast.
    const worth = Math.max(
      creatureValue(state, best),
      manaValue(definitionOf(state, best)?.manaCost ?? NO_COST) * 2,
    );
    if (worth < WORTH_A_REMOVAL_SPELL) continue;
    return castOrTapToward(state, me, spell, [{ kind: "card", instanceId: best.instanceId }]);
  }
  return null;
}

/**
 * Tutors. A land tutor is ramp and stops being worth a card once the mana is
 * already there, so it is gated on still being short of lands; everything else
 * finds the best card in the deck and is worth casting whenever there is
 * nothing better to do with the mana.
 */
function searchLibrary(state: GameState, me: Player, reserve: ManaCost = NO_COST): BotAction | null {
  const tutors = castableFromHand(state, me, (def) => def.castEffect?.kind === "searchLibrary", reserve);
  if (tutors.length === 0) return null;
  tutors.sort((a, b) => manaValue(a.cost) - manaValue(b.cost));

  const landCount = me.battlefield.filter((c) => definitionOf(state, c)?.types.includes("Land")).length;

  for (const tutor of tutors) {
    const effect = tutor.definition.castEffect;
    if (effect?.kind !== "searchLibrary") continue;
    // "An artifact or enchantment card" - a list now, so the ramp test asks
    // whether Land is among the types rather than whether it is the type.
    const wantedTypes = effect.cardType
      ? Array.isArray(effect.cardType)
        ? effect.cardType
        : [effect.cardType]
      : [];
    const isRamp = wantedTypes.includes("Land");
    if (isRamp && landCount >= 6) continue;
    // Nothing in the library matches - the spell would resolve for nothing.
    const hasMatch = me.library.some((c) => {
      const def = definitionOf(state, c);
      if (!def) return false;
      if (effect.basicLandOnly && !def.supertypes?.includes("Basic")) return false;
      return wantedTypes.length === 0 || wantedTypes.some((type) => def.types.includes(type));
    });
    if (!hasMatch) continue;
    /*
     * "Choose **two** target players. Each of them searches their library" -
     * Scheming Symmetry, the one tutor in the pool that targets at all.
     *
     * Every other printing names its searcher and carries no selector, so this
     * branch used to cast with no targets whatever the card said - which the
     * engine refused, ending the game. Read off the selector rather than
     * special-cased by name: a tutor that needs targets and has too few legal
     * ones is simply not castable.
     */
    const selector = targetSelectorOf(effect);
    let targets: StackTarget[] = [];
    if (selector) {
      const { min, max } = targetCountOf(selector);
      const legal = legalTargetsFor(state, selector, me.id, tutor.instance.instanceId);
      if (legal.length < min) continue;
      targets = legal.slice(0, max);
    }
    return castOrTapToward(state, me, tutor, targets);
  }
  return null;
}

/**
 * "All creatures get -N/-N" is symmetrical, so it's only worth casting when
 * we're behind on board - measured by what each side actually loses, not by
 * creature count, so a wipe that kills their commander and two of our tokens
 * still reads as good.
 *
 * Checked before developing, since casting a creature into your own sweeper is
 * the classic way to waste both cards.
 */
function sweepTheBoard(state: GameState, me: Player): BotAction | null {
  const wipes = castableFromHand(
    state,
    me,
    (def) =>
      def.castEffect?.kind === "pumpAll" &&
      def.castEffect.scope === "all" &&
      (fixedAmount(def.castEffect.toughness) ?? 0) < 0,
  );
  if (wipes.length === 0) return null;

  for (const wipe of wipes) {
    const effect = wipe.definition.castEffect;
    if (effect?.kind !== "pumpAll") continue;
    // -X/-X: how much it kills depends on a value nobody has chosen yet, so
    // there is nothing here to weigh. Skipped rather than played for X = 0.
    const shrink = fixedAmount(effect.toughness);
    if (shrink === null) continue;

    const lossFor = (player: Player): number =>
      player.battlefield
        .filter((c) => definitionOf(state, c)?.types.includes("Creature"))
        .filter((c) => !hasKeyword(state, c, "Indestructible"))
        .filter((c) => toughness(state, c) + shrink <= 0)
        .reduce((total, c) => total + creatureValue(state, c), 0);

    const theirLoss = opponentsOf(state, me.id).reduce((total, p) => total + lossFor(p), 0);
    const myLoss = lossFor(me);
    if (theirLoss > myLoss + WORTH_A_REMOVAL_SPELL) return castOrTapToward(state, me, wipe);
  }
  return null;
}

/**
 * Refill. Sits near the end of the chain deliberately: anything that affects
 * the board is a better use of the same mana, so this only fires on a turn
 * with nothing else to do - which is exactly when a control deck wants it.
 */
function drawCards(state: GameState, me: Player, reserve: ManaCost = NO_COST): BotAction | null {
  const draws = castableFromHand(state, me, (def) => def.castEffect?.kind === "draw", reserve);
  if (draws.length === 0) return null;
  // Most cards per cast; the mana is otherwise going unspent anyway.
  draws.sort((a, b) => {
    // Dynamic draws sort last rather than being guessed at - the bot has no
    // way to know Inspiring Call draws three until it resolves.
    const amountOf = (c: Castable): number =>
      c.definition.castEffect?.kind === "draw" ? (fixedAmount(c.definition.castEffect.amount) ?? 0) : 0;
    return amountOf(b) - amountOf(a);
  });
  return castOrTapToward(state, me, draws[0]!);
}

/** Land drops are close to free value - always take one if it's available. */
function playALand(state: GameState, me: Player): BotAction | null {
  if (me.landsPlayedThisTurn >= 1) return null;
  const land = me.hand.find((c) => definitionOf(state, c)?.types.includes("Land"));
  if (!land) return null;
  return { kind: "playLand", instanceId: land.instanceId };
}

/** Anything that puts power on the board: a creature, a token maker, or an anthem. */
function developsTheBoard(def: CardDefinition): boolean {
  if (def.types.includes("Creature")) return true;
  if (def.castEffect?.kind === "createToken") return true;
  if (staticBuffsOf(def).length > 0) return true;
  return false;
}

/**
 * "Efficient mana use": get the commander down early (its tax only grows) and
 * otherwise play the most expensive board-developing spell affordable, which
 * curves out better than dumping several cheap ones and wasting the rest of
 * the mana.
 *
 * Anthems are deliberately ranked by how much they'd actually add rather than
 * by cost - a +1/+1 to an empty board is worth nothing, and casting one on
 * turn three over a creature is a real mistake.
 */
function developTheBoard(state: GameState, me: Player, reserve: ManaCost = NO_COST): BotAction | null {
  const commander = castableCommander(state, me, reserve);
  if (commander) return castOrTapToward(state, me, commander);

  const options = castableFromHand(state, me, developsTheBoard, reserve);
  if (options.length === 0) return null;

  const creatureCount = me.battlefield.filter((c) => definitionOf(state, c)?.types.includes("Creature")).length;

  /**
   * A tie-breaker between equally-costed creatures, not a re-ranking. A 0/8
   * Defender and a 4/4 flier both cost four and the old "most expensive wins"
   * rule treated them as interchangeable - which is how the control deck ended
   * up boarding five walls with three total power and no way to win.
   */
  const offense = (def: CardDefinition): number => {
    if (!def.types.includes("Creature")) return 0;
    if (def.keywords?.includes("Defender")) return -0.5;
    if (def.keywords?.includes("Flying")) return 0.5;
    return (def.power ?? 0) >= 2 ? 0.25 : 0;
  };

  const priority = (c: Castable): number => {
    if (staticBuffsOf(c.definition).length > 0) {
      // Worth roughly one point of power per creature it would pump. Below two
      // creatures it isn't worth a card, so push it behind everything else.
      const buff = staticBuffsOf(c.definition)[0]!;
      return creatureCount >= 2 ? creatureCount * (buff.power + buff.toughness) : -1;
    }
    return manaValue(c.cost) + offense(c.definition);
  };

  options.sort((a, b) => priority(b) - priority(a));
  const best = options[0]!;
  if (priority(best) < 0) return null; // only an anthem left, and nothing to pump
  return castOrTapToward(state, me, best);
}

/**
 * Untargeted activated abilities that are pure upside - Agent Phil Coulson's
 * counters, Ant-Man's self-pump. Anything that costs a tap is only used
 * pre-combat if the permanent wasn't going to attack for more than the
 * ability is worth.
 */
function useValueAbility(state: GameState, me: Player): BotAction | null {
  for (const instance of me.battlefield) {
    if (instance.tapped) continue;
    const def = definitionOf(state, instance);
    if (!def) continue;
    if (def.types.includes("Creature") && instance.summoningSickness) continue;

    const abilityIndex = def.activatedAbilities?.findIndex((ability) => {
      // Mana is tapped for on demand, not speculatively - either shape of it.
      if (ability.effect.kind === "addMana") return false;
      if (ability.effect.kind === "addManaCombination") return false;
      // Anything that needs a target is handled by removeSomething, which picks one.
      if (ability.effect.kind === "damage") return false;
      if (ability.effect.kind === "destroy" || ability.effect.kind === "exile") return false;
      /*
       * Regeneration is a response, not a play. Nothing in the bot knows how to
       * hold a shield for the moment something would die, and spending a tap on
       * a pre-emptive one every turn would be worse than never using it - so it
       * is left out until the bot can tell that a creature is about to be lost.
       */
      if (ability.effect.kind === "regenerate") return false;
      if (!abilityAvailable(state, me.id, ability)) return false;
      return true;
    });
    if (abilityIndex === undefined || abilityIndex < 0) continue;
    const ability = def.activatedAbilities![abilityIndex]!;

    const cost = ability.cost.mana ?? NO_COST;
    // The permanent cannot pay for its own tap - see `couldAfford`.
    if (!couldAfford(state, me.id, cost, ability.cost.tap ? instance.instanceId : undefined)) continue;
    // Clarion Conqueror switches off every artifact and creature ability on the
    // table, its controller's included. Asked before the cost, because a
    // forbidden ability is not activated at any price.
    if (activateRestrictionProblem(state, me.id, def) !== undefined) continue;

    if (ability.effect.kind === "addCounterToEachOther") {
      const subtype = ability.effect.subtypes?.[0];
      const beneficiaries = me.battlefield.filter((c) => {
        if (c.instanceId === instance.instanceId) return false;
        const other = definitionOf(state, c);
        if (!other?.types.includes("Creature")) return false;
        return subtype ? (other.subtypes?.includes(subtype) ?? false) : true;
      });
      // Tapping to buff one creature by +1/+1 is worse than just attacking with this one.
      if (beneficiaries.length === 0) continue;
      if (ability.cost.tap && beneficiaries.length < power(state, instance)) continue;
    }

    // No tapping step: activateAbilityWithAutoTap pays the mana part of the
    // cost, the same way the human's click does. See castOrTapToward.
    return { kind: "activateAbility", instanceId: instance.instanceId, abilityIndex, targets: [] };
  }
  return null;
}

/**
 * Point damage: burn an opponent out if it's lethal, otherwise use it to kill
 * the most valuable creature it can actually finish. Never fired just to have
 * fired - a damage spell held is better than one wasted.
 */
function removeSomething(state: GameState, me: Player, reserve: ManaCost = NO_COST): BotAction | null {
  const opponents = opponentsOf(state, me.id);
  if (opponents.length === 0) return null;

  const enemyCreatures = opponents
    .flatMap((opponent) => opponent.battlefield)
    .filter((c) => definitionOf(state, c)?.types.includes("Creature"))
    .filter((c) => !hasKeyword(state, c, "Hexproof"));

  // Hard removal first: it answers things burn can't, so spending it on the
  // biggest threat is nearly always right. The floor stops a Murder being
  // thrown at a Llanowar Elves on turn two.
  //
  // Restricted to the creature-targeting kind on purpose: "Destroy target land"
  // is the same effect with a different selector, and pointing it at a creature
  // would be an illegal target the engine rightly rejects. See destroyAPermanent.
  const hardRemoval = castableFromHand(
    state,
    me,
    (def) =>
      (def.castEffect?.kind === "destroy" || def.castEffect?.kind === "exile") &&
      def.castEffect.target.kind === "creature",
    reserve,
  );
  hardRemoval.sort((a, b) => manaValue(a.cost) - manaValue(b.cost));

  for (const spell of hardRemoval) {
    const effect = spell.definition.castEffect;
    if (effect?.kind !== "destroy" && effect?.kind !== "exile") continue;
    const isDestroy = effect.kind === "destroy";
    const legal = enemyCreatures
      .filter((c) => !(isDestroy && hasKeyword(state, c, "Indestructible")))
      .filter((c) => isValidTarget(state, effect.target, { kind: "card", instanceId: c.instanceId }, me.id))
      .sort((a, b) => creatureValue(state, b) - creatureValue(state, a));

    const best = legal[0];
    if (best && creatureValue(state, best) >= WORTH_A_REMOVAL_SPELL) {
      return castOrTapToward(state, me, spell, [{ kind: "card", instanceId: best.instanceId }]);
    }
  }

  // "-N/-N until end of turn" is removal in everything but name: a creature
  // whose toughness reaches 0 dies to a state-based action.
  const shrink = castableFromHand(
    state,
    me,
    (def) => def.castEffect?.kind === "pump" && def.castEffect.toughness < 0,
    reserve,
  );
  shrink.sort((a, b) => manaValue(a.cost) - manaValue(b.cost));

  for (const spell of shrink) {
    const effect = spell.definition.castEffect;
    if (effect?.kind !== "pump" || !effect.target) continue;
    const killable = enemyCreatures
      .filter((c) => !hasKeyword(state, c, "Indestructible"))
      .filter((c) => toughness(state, c) + effect.toughness <= 0)
      .filter((c) => isValidTarget(state, effect.target!, { kind: "card", instanceId: c.instanceId }, me.id))
      .sort((a, b) => creatureValue(state, b) - creatureValue(state, a));
    const best = killable[0];
    if (best && creatureValue(state, best) >= WORTH_A_REMOVAL_SPELL) {
      return castOrTapToward(state, me, spell, [{ kind: "card", instanceId: best.instanceId }]);
    }
  }

  const burn = castableFromHand(state, me, (def) => def.castEffect?.kind === "damage", reserve);
  if (burn.length === 0) return null;
  burn.sort((a, b) => manaValue(a.cost) - manaValue(b.cost)); // cheapest that does the job

  for (const spell of burn) {
    const effect = spell.definition.castEffect;
    if (effect?.kind !== "damage") continue;

    const lethalTarget = opponents.find((opponent) => opponent.life <= effect.amount);
    if (lethalTarget) {
      const target: StackTarget = { kind: "player", playerId: lethalTarget.id };
      if (isValidTarget(state, effect.target, target, me.id)) {
        return castOrTapToward(state, me, spell, [target]);
      }
    }

    const killable = opponents
      .flatMap((opponent) => opponent.battlefield)
      .filter((c) => definitionOf(state, c)?.types.includes("Creature"))
      .filter((c) => !hasKeyword(state, c, "Hexproof"))
      .filter((c) => wouldDie(state, c, effect.amount))
      .filter((c) => isValidTarget(state, effect.target, { kind: "card", instanceId: c.instanceId }, me.id))
      .sort((a, b) => creatureValue(state, b) - creatureValue(state, a));

    const best = killable[0];
    if (best) {
      return castOrTapToward(state, me, spell, [{ kind: "card", instanceId: best.instanceId }]);
    }
  }
  return null;
}

/**
 * "Destroy target land / artifact / enchantment" - everything the `permanent`
 * selector covers.
 *
 * Land destruction is a tempo play, not removal: taking one land off a player
 * who already has eight does nothing, so it's gated on the opponent still being
 * short of mana, and it prefers an untapped land so they lose the use of it this
 * turn rather than next. Artifacts and enchantments are judged like any other
 * removal target - worth a card only if the thing being destroyed is worth one,
 * which for an anthem means it's actually pumping a board.
 *
 * Sits low in the chain deliberately: developing our own board beats attacking
 * theirs at the same cost, so this fires on a turn with nothing better to do.
 */
/**
 * The "destroy target permanent" step of a spell, whether that is the whole
 * spell or the first half of one.
 *
 * Assassin's Trophy is a sequence - destroy, then its controller searches - and
 * without this the bot would refuse to cast it at all, because it only ever
 * looked for a bare `destroy`. The rider costs the bot nothing to ignore: the
 * search belongs to the player being blown up, and they answer it themselves.
 */
function destroyStepOf(
  effect: Effect | undefined,
): (Effect & { kind: "destroy"; target: TargetSelector & { kind: "permanent" } }) | null {
  const steps = effect?.kind === "sequence" ? effect.effects : effect ? [effect] : [];
  for (const step of steps) {
    if (step.kind === "destroy" && step.target.kind === "permanent") {
      return step as Effect & { kind: "destroy"; target: TargetSelector & { kind: "permanent" } };
    }
  }
  return null;
}

function destroyAPermanent(state: GameState, me: Player, reserve: ManaCost = NO_COST): BotAction | null {
  const spells = castableFromHand(state, me, (def) => destroyStepOf(def.castEffect) !== null, reserve);
  if (spells.length === 0) return null;
  spells.sort((a, b) => manaValue(a.cost) - manaValue(b.cost));

  const opponents = opponentsOf(state, me.id);
  if (opponents.length === 0) return null;

  for (const spell of spells) {
    const effect = destroyStepOf(spell.definition.castEffect);
    if (!effect) continue;
    const wantedTypes = effect.target.cardTypes;
    const excludeCreatures = effect.target.noncreature === true;

    for (const opponent of opponents) {
      const legal = opponent.battlefield
        .filter((c) => {
          const types = definitionOf(state, c)?.types ?? [];
          // No list at all is "target permanent", so every type qualifies.
          if (wantedTypes && !wantedTypes.some((t) => types.includes(t))) return false;
          return !(excludeCreatures && types.includes("Creature"));
        })
        .filter((c) => !hasKeyword(state, c, "Indestructible"))
        .filter((c) => isValidTarget(state, effect.target, { kind: "card", instanceId: c.instanceId }, me.id));
      if (legal.length === 0) continue;

      // A spell that names Land is land destruction and is judged as tempo. A
      // spell that names no type at all ("target permanent") is not - it can
      // hit a land, but spending Assassin's Trophy on one would be a waste.
      if (wantedTypes?.includes("Land")) {
        // Past this much mana, one land is a rounding error and the card is
        // better spent elsewhere - or held.
        const lands = opponent.battlefield.filter((c) => definitionOf(state, c)?.types.includes("Land"));
        if (lands.length > 5) continue;
        // An untapped land is mana they still have; a tapped one is mana already spent.
        const best = legal.find((c) => !c.tapped) ?? legal[0]!;
        return castOrTapToward(state, me, spell, [{ kind: "card", instanceId: best.instanceId }]);
      }

      // Everything else: same bar as creature removal. An anthem is scored by
      // what it's actually adding, so destroying one that pumps nothing is not
      // worth a card.
      const worthOf = (instance: (typeof legal)[number]): number => {
        const def = definitionOf(state, instance);
        if (!def) return 0;
        if (def.types.includes("Creature")) return creatureValue(state, instance);
        if (staticBuffsOf(def).length > 0) {
          const pumped = opponent.battlefield.filter(
            (c) => c.instanceId !== instance.instanceId && definitionOf(state, c)?.types.includes("Creature"),
          ).length;
          const totals = staticBuffsOf(def).reduce(
            (sum: number, buff) => sum + buff.power + buff.toughness,
            0,
          );
          return pumped * totals * 2;
        }
        return manaValue(def.manaCost ?? NO_COST) * 2;
      };

      const ranked = [...legal].sort((a, b) => worthOf(b) - worthOf(a));
      const best = ranked[0]!;
      if (worthOf(best) < WORTH_A_REMOVAL_SPELL) continue;
      return castOrTapToward(state, me, spell, [{ kind: "card", instanceId: best.instanceId }]);
    }
  }
  return null;
}

/** Life gain is a last resort - only when we're low enough that it might actually matter. */
function gainLifeIfDesperate(state: GameState, me: Player): BotAction | null {
  if (me.life > 15) return null;
  const heals = castableFromHand(state, me, (def) => def.castEffect?.kind === "gainLife");
  if (heals.length === 0) return null;
  // A gain-life amount can now be a phrase rather than a number - Disciple of
  // Freyalise gains "that creature's power". Sorting is only about which heal
  // is biggest, so anything the bot cannot read a number out of sorts last
  // rather than being excluded: it is still a heal, just not a countable one.
  const healFor = (entry: (typeof heals)[number]): number => {
    const effect = entry.definition.castEffect;
    if (effect?.kind !== "gainLife") return 0;
    return typeof effect.amount === "number" ? effect.amount : 0;
  };
  heals.sort((a, b) => healFor(b) - healFor(a));
  return castOrTapToward(state, me, heals[0]!, [{ kind: "player", playerId: me.id }]);
}

/**
 * What the bot names when a permanent asks as it enters.
 *
 * Every answer here is a defensible default rather than a considered play - the
 * point is that the game continues. Sanctum Prelate naming a number is the only
 * one that is a real decision, and even that is guesswork without seeing hands.
 */
function chooseOnEntry(state: GameState, me: Player): ChosenOnEntry {
  const choice = state.pendingEnterChoice!.choice;
  switch (choice.kind) {
    case "number":
      /*
       * Three, arbitrarily but not thoughtlessly: it is the commonest mana
       * value among removal and card draw in this pool, and the bot cannot see
       * an opponent's hand to do better. Named here rather than buried so it is
       * obvious what to improve when the bot learns to read a board.
       */
      return { number: Math.min(3, choice.max) };
    case "creature-type": {
      // Whatever it has most of, so its own Cavern of Souls points at its deck.
      const counts = new Map<string, number>();
      for (const instance of me.battlefield) {
        for (const subtype of definitionOf(state, instance)?.subtypes ?? []) {
          counts.set(subtype, (counts.get(subtype) ?? 0) + 1);
        }
      }
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return { creatureType: best?.[0] ?? "Human" };
    }
    case "basic-land-type": {
      const counts = new Map<string, number>();
      for (const instance of me.battlefield) {
        for (const subtype of definitionOf(state, instance)?.subtypes ?? []) {
          if (["Plains", "Island", "Swamp", "Mountain", "Forest"].includes(subtype)) {
            counts.set(subtype, (counts.get(subtype) ?? 0) + 1);
          }
        }
      }
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return { basicLandType: best?.[0] ?? "Plains" };
    }
    case "keywords":
      return { keywords: choice.from.slice(0, choice.count) };
    case "mode":
      return { mode: choice.options[0]! };
  }
}
