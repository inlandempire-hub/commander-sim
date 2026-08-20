import { castRestrictionProblem } from "./restrictions.js";
import type { CardDefinition, CardInstance, Effect, GameState, ManaCost, StackTarget } from "./types.js";
import { findInstance, log, moveCard, requireDefinition, requirePlayer } from "./state.js";
import {
  applyCommanderTax,
  canPayManaCostFromPool,
  commanderCreatureTypes,
  payManaCostFor,
  spendablePool,
} from "./mana.js";
import { controllerMeets } from "./conditions.js";
import { effectivePower } from "./counters.js";
import { sacrificePermanent } from "./sba.js";
import { describeSubject, fireLandPlayed, fireWatchers, pushOntoStack, putOntoBattlefield } from "./permanents.js";
import { isValidTarget, legalTargetsFor, targetCountOf, targetSelectorOf } from "./targeting.js";
import { attemptWardPayments } from "./ward.js";
import { costWithX, requiresX, resolveAmounts } from "./x.js";

const PERMANENT_TYPES = new Set(["Creature", "Artifact", "Enchantment", "Planeswalker", "Battle", "Land"]);

/** Flash lets an otherwise sorcery-speed card (almost always a creature) be cast like an instant. */
function isSorcerySpeedOnly(def: CardDefinition): boolean {
  return !def.types.includes("Instant") && !(def.keywords?.includes("Flash") ?? false);
}

/** Sorcery-speed casting requires: you're the active player, it's a main phase, and the stack is empty. */
export function canCastAtSorcerySpeed(state: GameState, playerId: string): boolean {
  const isMainPhase = state.phase === "precombat-main" || state.phase === "postcombat-main";
  return state.players[state.activePlayerIndex]?.id === playerId && isMainPhase && state.stack.length === 0;
}

export interface CastOptions {
  /** Cast the player's commander from the command zone (applies commander tax) instead of from hand. */
  fromCommandZone?: boolean;
  /**
   * Which mode of a "choose one" spell is being cast, as an index into its
   * `modal` effect's `modes`. Required for a modal spell and meaningless for
   * anything else. Modes are chosen as part of casting (rule 601.2b), which is
   * also why the targets passed alongside must be legal for *that* mode.
   */
  chosenMode?: number;
  /**
   * The value announced for {X}. Required for a card with {X} in its cost and
   * meaningless for anything else.
   *
   * Announced rather than inferred from the mana available: "cast it for as
   * much as I can afford" is a common play but it is not the only one, and a
   * player who wants to keep mana up for something else must be able to.
   */
  chosenX?: number;
  /**
   * "X damage divided as you choose among up to two targets" - how much goes to
   * each, in the order the targets were named.
   *
   * Announced with the spell rather than settled on resolution, which is the
   * rule and is visible in play: kill one of the two in response and the damage
   * assigned to it is lost. Divided at resolution you would move it to the
   * survivor, which is a materially better card.
   *
   * Absent with one target, where there is nothing to divide.
   */
  damageSplit?: number[];
  /**
   * "You may cast this spell for its **dash** cost." - Ragavan.
   *
   * A decision made as the spell is cast and never afterwards, which is why it
   * rides here with the other announcements rather than being asked about on
   * resolution.
   */
  useDashCost?: boolean;
  /**
   * Which creature is being given up for an "as an additional cost, sacrifice a
   * creature" - Tend the Pests.
   *
   * Announced with the spell rather than asked for afterwards, because that is
   * when the cost is paid (rule 601.2h). It is also what makes the card's own
   * X knowable: the creature's power is read here, while it is still on the
   * battlefield.
   */
  sacrificeInstanceId?: string;
  /**
   * Take the card's alternative cost - "you may cast this spell without paying
   * its mana cost".
   *
   * Opt-in, because every printing of this shape is a "may" and paying the
   * mana is sometimes the better line: Deadly Rollick cast for {3}{B} leaves
   * the commander requirement alone.
   */
  useAlternativeCost?: boolean;
  /**
   * Cast this without paying its mana cost, for a reason that is not the
   * card's own alternative cost - Rishkar's Expertise granting it, or the far
   * side of suspend.
   *
   * Separate from `useAlternativeCost` because that one checks the card's own
   * condition and this one is granted from outside: a spell made free by
   * something else has no condition of its own to meet.
   */
  free?: boolean;
  /**
   * Cast this as a bestowed Aura for its bestow cost, attached to the creature
   * handed in as the target. It is still a creature card - it is simply not a
   * creature while it is attached to one.
   */
  bestowOnto?: string;
  /**
   * Skip the sorcery-speed check.
   *
   * Only suspend uses it: the card is cast as its last time counter is removed,
   * which happens in the upkeep - a step where a sorcery could never normally
   * be cast. The rules say to cast it then regardless, so the timing rule is
   * the thing that has to give.
   */
  ignoreTiming?: boolean;
}

/**
 * How many lands this player may play this turn.
 *
 * One, plus whatever their permanents grant. Read fresh every time rather than
 * being counted onto the player when a permanent arrives, so an Icetill
 * Explorer that dies mid-turn takes its extra drop with it - which is the rule,
 * and the alternative would need every removal spell to know about land drops.
 */
export function landDropsAllowed(state: GameState, playerId: string): number {
  const player = requirePlayer(state, playerId);
  let allowed = 1;
  for (const instance of player.battlefield) {
    allowed += state.cardDefinitions[instance.definitionId]?.staticRules?.extraLandDrops ?? 0;
  }
  return allowed;
}

/** "You may play lands from your graveyard" - Icetill Explorer's second line. */
export function canPlayLandsFromGraveyard(state: GameState, playerId: string): boolean {
  return requirePlayer(state, playerId).battlefield.some(
    (instance) => state.cardDefinitions[instance.definitionId]?.staticRules?.playLandsFromGraveyard === true,
  );
}

/**
 * Whether this player could pay the card's additional cost right now.
 *
 * Asked before a card is offered as playable, not only when it is cast. A spell
 * whose additional cost cannot be paid cannot be cast at all (rule 601.2f), so
 * a client that offered Tend the Pests with an empty board would be offering a
 * play the engine is about to refuse.
 */
export function canPayAdditionalCost(
  state: GameState,
  playerId: string,
  def: CardDefinition,
  chosenX = 0,
): boolean {
  const cost = def.additionalCost;
  if (!cost) return true;
  const player = requirePlayer(state, playerId);
  switch (cost.kind) {
    case "pay-life": {
      const amount = typeof cost.amount === "number" ? cost.amount : chosenX;
      // You may pay life only down to nothing, and paying to exactly 0 is legal
      // - it loses you the game to the usual state-based action, which is the
      // real rule and Toxic Deluge's real ceiling.
      return player.life >= amount;
    }
    case "sacrifice-creature":
      return player.battlefield.some((instance) =>
        state.cardDefinitions[instance.definitionId]?.types.includes("Creature"),
      );
  }
}

/** The modes of a "choose one" card, or undefined if it isn't modal. */
export function modesOf(def: CardDefinition): Array<{ label: string; effect: Effect }> | undefined {
  return def.castEffect?.kind === "modal" ? def.castEffect.modes : undefined;
}

/**
 * Casts a spell: validates timing and mana, pays the cost (including commander tax if applicable),
 * moves the card to the stack, and registers a stack object for its effect (or battlefield entry).
 */
export function castSpell(
  state: GameState,
  playerId: string,
  instanceId: string,
  targets: StackTarget[] = [],
  options: CastOptions = {},
): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }

  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;

  /*
   * "Until end of turn, you may cast that card" - Ragavan and Professional
   * Face-Breaker, the only way a card is cast from anywhere but a hand or the
   * command zone.
   *
   * The permission names the player as well as the card, which is what makes
   * Ragavan work at all: the card is exiled from the *defender's* library and
   * cast by Ragavan's controller, so ownership is deliberately not checked on
   * this path.
   */
  const fromExile = mayPlayFromExile(state, playerId, instance);
  const expectedZone = options.fromCommandZone ? "command" : "hand";
  if (!fromExile && instance.zone !== expectedZone) {
    throw new Error(`${instanceId} is not in ${playerId}'s ${expectedZone} zone`);
  }
  if (!fromExile && instance.ownerId !== playerId) {
    throw new Error(`${playerId} does not own ${instanceId}`);
  }

  const def = requireDefinition(state, instance.definitionId);
  const isPermanentSpell = def.types.some((t) => PERMANENT_TYPES.has(t));

  if (isSorcerySpeedOnly(def) && !options.ignoreTiming && !canCastAtSorcerySpeed(state, playerId)) {
    throw new Error(`${def.name} can only be cast at sorcery speed`);
  }

  /*
   * The hate pieces. Checked before anything is announced or paid, because
   * "can't" in Magic means the action is never taken - not that it is taken and
   * undone.
   */
  const forbidden = castRestrictionProblem(state, playerId, def, expectedZone);
  if (forbidden) throw new Error(forbidden);

  /*
   * {X} is announced as the spell is cast (rule 601.2b), before anything is
   * paid, and it never changes afterwards. Recorded on the card instance
   * rather than only on the stack object because a permanent spell's own
   * abilities go on referring to it once it has resolved - see
   * `CardInstance.chosenX`.
   */
  /*
   * X is not always in the mana cost. Toxic Deluge prints {2}{B} and asks for X
   * *life*, so a card announces an X whenever either half of its cost needs
   * one - reading the mana cost alone would silently take X = 0 and wipe
   * nothing.
   */
  const needsX = requiresX(def.manaCost) || additionalCostNeedsX(def);
  const chosenX = needsX ? (options.chosenX ?? 0) : 0;
  if (needsX && options.chosenX === undefined) {
    throw new Error(`${def.name} has {X} in its cost - a value for X must be chosen`);
  }
  if (chosenX < 0 || !Number.isInteger(chosenX)) {
    throw new Error(`X must be a whole number, not ${chosenX}`);
  }

  /*
   * "You may cast this spell without paying its mana cost."
   *
   * The mana cost is replaced outright rather than reduced to nothing by
   * degrees, and the condition is checked here rather than trusted from the
   * client: an alternative cost taken while its condition is false is simply a
   * free spell.
   */
  const alternative = options.useAlternativeCost ? def.alternativeCost : undefined;
  if (options.useAlternativeCost) {
    if (!def.alternativeCost) throw new Error(`${def.name} has no alternative cost`);
    if (!controllerMeets(state, playerId, def.alternativeCost.condition)) {
      throw new Error(`${def.name}'s alternative cost is not available`);
    }
  }

  if (options.bestowOnto && !def.bestowCost) throw new Error(`${def.name} has no bestow cost`);
  // "You may cast this spell for its dash cost" - a price, not a discount, and
  // the two riders that come with it are applied as the permanent arrives.
  if (options.useDashCost && !def.dashCost) throw new Error(`${def.name} has no dash cost`);
  const free = alternative !== undefined || options.free === true;
  let cost: ManaCost = free
    ? { generic: 0, colors: {} }
    : options.useDashCost
      ? def.dashCost!
      : options.bestowOnto
        ? def.bestowCost!
        : costWithX(def.manaCost ?? { generic: 0, colors: {} }, chosenX);
  if (options.fromCommandZone && !free) {
    const timesCast = player.commanderCastCount[instance.instanceId] ?? 0;
    cost = applyCommanderTax(cost, timesCast);
  }

  /*
   * The additional cost, validated before anything at all is paid or moved.
   *
   * The creature's power is read here, while it is still on the battlefield,
   * because that is the number Tend the Pests goes on to use and it cannot be
   * recovered a line later. The sacrifice itself happens below, with the mana,
   * because that is when a cost is paid.
   */
  if (!canPayAdditionalCost(state, playerId, def, chosenX)) {
    throw new Error(`${playerId} cannot pay ${def.name}'s additional cost`);
  }
  let sacrificedPower = 0;
  let sacrificeId: string | undefined;
  if (def.additionalCost?.kind === "sacrifice-creature") {
    sacrificeId = options.sacrificeInstanceId;
    if (!sacrificeId) throw new Error(`${def.name} requires a creature to sacrifice`);
    const victim = player.battlefield.find((c) => c.instanceId === sacrificeId);
    if (!victim) throw new Error(`${playerId} does not control ${sacrificeId}`);
    if (!requireDefinition(state, victim.definitionId).types.includes("Creature")) {
      throw new Error(`${cardNameOf(state, victim.definitionId)} is not a creature`);
    }
    sacrificedPower = effectivePower(state, victim);
  }

  // A mode is chosen as the spell is cast, so the modal wrapper is unwrapped
  // here and never reaches the stack. Everything downstream - targeting,
  // resolution, the bot, the client - sees a plain single effect.
  let effect: Effect = def.castEffect ?? { kind: "draw", amount: 0 };
  if (effect.kind === "modal") {
    const modes = effect.modes;
    const chosen = options.chosenMode;
    if (chosen === undefined) throw new Error(`${def.name} is modal - a mode must be chosen`);
    const mode = modes[chosen];
    if (!mode) throw new Error(`${def.name} has no mode ${chosen}`);
    effect = mode.effect;
  }
  // X is substituted here for the same reason the mode is: it is settled at
  // cast time, so nothing downstream ever has to know it was once a symbol.
  // The sacrificed creature's power rides along: it is settled at exactly the
  // same moment and for exactly the same reason.
  effect = resolveAmounts(effect, { x: chosenX, sacrificedPower });

  /*
   * "X damage divided as you choose among up to two targets", and its kicker:
   * "if X is 6 or more, twice X divided among them instead."
   *
   * Settled here, with X and the mode, because that is when it is announced -
   * and the difference from settling it at resolution is real: kill one of the
   * two in response and the damage assigned to it is lost rather than moved.
   *
   * Validated rather than trusted. A split that does not add up, or that gives a
   * named target nothing, is not a legal announcement, and letting one through
   * would be a burn spell that deals more damage than it says.
   */
  if (effect.kind === "damage" && effect.dividedAmongTargets) {
    // The amount is X on the only card of this shape, announced a moment ago.
    const base = effect.amountFrom === "x" ? chosenX : effect.amount;
    const threshold = effect.doubleWhenAmountAtLeast;
    const total = threshold !== undefined && base >= threshold ? base * 2 : base;
    const split = options.damageSplit ?? (targets.length === 1 ? [total] : undefined);
    if (!split) throw new Error(`${def.name} divides its damage - say how much each target takes`);
    if (split.length !== targets.length) {
      throw new Error(`${def.name} was given ${split.length} amounts for ${targets.length} targets`);
    }
    if (split.some((n) => !Number.isInteger(n) || n < 1)) {
      // "Divided as you choose" assigns at least 1 to each target named - a
      // target given nothing was never a legal target to name.
      throw new Error(`Each target of ${def.name} must be assigned at least 1 damage`);
    }
    if (split.reduce((sum, n) => sum + n, 0) !== total) {
      throw new Error(`${def.name} deals ${total} damage - the division must add up to it`);
    }
    effect = { ...effect, amount: total, splitAmounts: split };
  }

  // Validated before anything is paid or moved. Every throw below this point
  // would otherwise leave the game half-cast - mana spent and the card sitting
  // on the stack - and an illegal target is the easy way to hit that now that
  // targets can disappear in response to a spell.
  const selector = targetSelectorOf(effect);
  if (selector) {
    /*
     * How many, not merely whether. "Up to X target artifacts" with X = 2 is a
     * legal cast for nought, one or two of them and an illegal cast for three -
     * and "choose two target players" is not satisfied by one.
     */
    const { min, max } = targetCountOf(selector, chosenX);
    if (targets.length < min) {
      throw new Error(
        min === 1 ? `${def.name} requires a target` : `${def.name} requires ${min} targets`,
      );
    }
    if (targets.length > max) throw new Error(`${def.name} takes at most ${max} target(s)`);
    for (const target of targets) {
      if (!isValidTarget(state, selector, target, playerId, instanceId)) {
        throw new Error(`Illegal target for ${def.name}`);
      }
    }
  }

  // Restricted mana counts here and nowhere else: this is the only place that
  // knows *what* is being cast, which is the whole question its restriction
  // asks. See spendablePool in mana.ts.
  if (!canPayManaCostFromPool(spendablePool(player, def), cost)) {
    throw new Error(`${playerId} cannot afford to cast ${def.name}`);
  }
  const payment = payManaCostFor(player, cost, def);
  const restrictionsUsed = payment.restrictions;

  /*
   * The rest of the cost, paid in the same breath as the mana (rule 601.2h).
   *
   * After the mana rather than before, so a spell that turns out to be
   * unaffordable has not already eaten a creature - the mana check above throws
   * before this line is reached.
   */
  if (def.additionalCost?.kind === "pay-life") {
    const life = typeof def.additionalCost.amount === "number" ? def.additionalCost.amount : chosenX;
    player.life -= life;
    log(state, `${playerId} pays ${life} life`);
  }
  if (sacrificeId) sacrificePermanent(state, sacrificeId);
  /*
   * "...and that spell can't be countered." A property of this casting rather
   * than of the card, so it is recorded on the spell on the stack: the same
   * Blech cast without Delighted Halfling's mana is counterable as normal.
   */
  const uncounterable =
    def.cantBeCountered === true || restrictionsUsed.some((used) => used.grantsUncounterable === true);

  // Recorded on the card, not just the spell: The Meathook Massacre's own
  // enters-the-battlefield trigger fires after the spell has left the stack.
  instance.chosenX = chosenX;
  /*
   * Recorded on the card rather than on the spell, because attaching happens
   * as the permanent arrives - long after the stack object has gone.
   */
  instance.bestowTarget = options.bestowOnto;
  // Dash, for the same reason: the haste and the return home are applied as the
  // creature arrives, not while it is a spell.
  instance.dashed = options.useDashCost === true;
  // Dash, for the same reason: the haste and the return home are applied as the
  // creature arrives, not while it is a spell.
  instance.dashed = options.useDashCost === true;

  moveCard(state, instanceId, "stack");
  log(state, `${playerId} casts ${def.name}`);

  if (options.fromCommandZone) {
    player.commanderCastCount[instance.instanceId] = (player.commanderCastCount[instance.instanceId] ?? 0) + 1;
  }

  if (targets.length > 0 && !attemptWardPayments(state, playerId, targets)) {
    // Ward's cost went unpaid - the spell is countered: it still leaves play (to the graveyard),
    // but never resolves. The mana already spent to cast it is not refunded.
    moveCard(state, instanceId, "graveyard");
    state.passesInSuccession = 0;
    return;
  }

  pushOntoStack(state, instanceId, playerId, effect, targets, isPermanentSpell, uncounterable);

  /*
   * "Whenever an opponent casts an instant or sorcery spell" - Arasta of the
   * Endless Web.
   *
   * Fired after the spell is on the stack, so the trigger goes on top of it
   * and resolves first. That is the real ordering, and it is visible: Arasta
   * has its Spider before the removal spell that provoked it resolves.
   */
  /*
   * Recorded here rather than on resolution: "cast" happens when the spell goes
   * on the stack, so a countered spell still counts against Archon of Emeria.
   * That is the rule, and it is also what makes these cards worth playing.
   */
  player.spellTypesCastThisTurn.push([...def.types]);
  fireWatchers(state, "spell-cast", describeSubject(state, instance, def));

  /*
   * "When that mana is spent to cast a creature spell that shares a creature
   * type with your commander, scry 1." - Path of Ancestry.
   *
   * Fired here, after the spell is on the stack, for the same reason the
   * cast watchers are: the trigger goes on top of the spell it paid for and
   * resolves first, so the scry happens before the creature arrives. The
   * condition is checked against the card actually cast rather than remembered
   * on the mana, because "shares a creature type with your commander" is a
   * question about both cards at once.
   */
  for (const mark of payment.marks) {
    if (mark.rider.kind !== "scry-on-creature-sharing-commander-type") continue;
    if (!def.types.includes("Creature")) continue;
    const shared = commanderCreatureTypes(state, playerId);
    if (!(def.subtypes ?? []).some((subtype) => shared.includes(subtype))) continue;
    pushOntoStack(
      state,
      mark.sourceInstanceId,
      playerId,
      { kind: "scry", amount: mark.rider.amount },
      [],
      false,
    );
  }

  state.passesInSuccession = 0;
}

/**
 * Whether the card's additional cost is the kind that needs an X announced -
 * Toxic Deluge's "pay X life", where the mana cost prints no {X} at all.
 */
function additionalCostNeedsX(def: CardDefinition): boolean {
  const cost = def.additionalCost;
  if (!cost) return false;
  return cost.kind === "pay-life" && typeof cost.amount !== "number" && cost.amount.kind === "x";
}

/** A definition's name, for an error raised before anything has an instance to look up. */
function cardNameOf(state: GameState, definitionId: string): string {
  return state.cardDefinitions[definitionId]?.name ?? "That permanent";
}


/**
 * "Rather than cast this card from your hand, pay {1}{B} and exile it with two
 * time counters on it." - Profane Tutor.
 *
 * A way of *playing* the card rather than a way of casting it, which is why it
 * is its own function: nothing goes on the stack, no cast triggers fire, and it
 * is sorcery-speed because the real rule ties it to when you could cast the
 * card.
 */
export function suspendCard(state: GameState, playerId: string, instanceId: string): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;
  if (instance.zone !== "hand" || instance.ownerId !== playerId) {
    throw new Error(`${instanceId} is not in ${playerId}'s hand`);
  }
  const def = requireDefinition(state, instance.definitionId);
  if (!def.suspend) throw new Error(`${def.name} has no suspend cost`);
  if (!canCastAtSorcerySpeed(state, playerId)) {
    throw new Error(`${def.name} can only be suspended at sorcery speed`);
  }
  if (!canPayManaCostFromPool(spendablePool(player, def), def.suspend.cost)) {
    throw new Error(`${playerId} cannot afford to suspend ${def.name}`);
  }
  payManaCostFor(player, def.suspend.cost, def);
  moveCard(state, instanceId, "exile");
  instance.timeCounters = def.suspend.timeCounters;
  log(state, `${playerId} suspends ${def.name} with ${def.suspend.timeCounters} time counters`);
  state.passesInSuccession = 0;
}

/**
 * Casts a suspended card as its last time counter is removed, free.
 *
 * Exported for turn.ts, which is the only caller: the upkeep is the one moment
 * this can happen. A card whose spell has no legal target is simply left in
 * exile with no counters rather than being cast into nothing.
 */
export function castSuspended(state: GameState, playerId: string, instanceId: string): void {
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "exile") return;
  const def = requireDefinition(state, found.instance.definitionId);
  const selector = targetSelectorOf(def.castEffect ?? { kind: "draw", amount: 0 });
  const targets = selector ? legalTargetsFor(state, selector, playerId, instanceId).slice(0, 1) : [];
  if (selector && targets.length === 0) return;

  /*
   * Cast from exile, which no other card in the pool does - so the zone check
   * in `castSpell` is bypassed by moving the card to hand first. That is not a
   * cheat: the card is genuinely being cast, and every other consequence of
   * casting (cast triggers, ward, a permanent arriving properly) has to follow.
   */
  moveCard(state, instanceId, "hand");
  const priorityBefore = state.priorityPlayerIndex;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  try {
    castSpell(state, playerId, instanceId, targets, { free: true, ignoreTiming: true });
  } finally {
    state.priorityPlayerIndex = priorityBefore;
  }
}

/**
 * "While it's prepared, you may cast a copy of its spell." - Eccentric
 * Pestfinder.
 *
 * A copy of a spell is not a card, so nothing moves zones: the back face's
 * effect goes on the stack on its own, paid for at the back face's cost, and
 * the permanent stays where it is with its flag cleared.
 */
export function castPreparedSpell(state: GameState, playerId: string, instanceId: string): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "battlefield") {
    throw new Error(`${instanceId} is not on the battlefield`);
  }
  if (found.instance.controllerId !== playerId) throw new Error(`${playerId} does not control ${instanceId}`);
  if (!found.instance.prepared) throw new Error("That permanent is not prepared");

  const front = requireDefinition(state, found.instance.definitionId);
  const back = front.backFaceId ? requireDefinition(state, front.backFaceId) : undefined;
  if (!back?.castEffect) throw new Error(`${front.name} has no spell to copy`);
  const cost = back.manaCost ?? { generic: 0, colors: {} };
  if (!canCastAtSorcerySpeed(state, playerId) && !back.types.includes("Instant")) {
    throw new Error(`${back.name} can only be cast at sorcery speed`);
  }
  if (!canPayManaCostFromPool(spendablePool(player, back), cost)) {
    throw new Error(`${playerId} cannot afford ${back.name}`);
  }
  payManaCostFor(player, cost, back);
  // Unprepared by the casting, whether or not the copy resolves - "doing so
  // unprepares it" is about the cast, not the outcome.
  found.instance.prepared = false;
  log(state, `${playerId} casts a copy of ${back.name}`);
  pushOntoStack(state, instanceId, playerId, back.castEffect, [], false);
  state.passesInSuccession = 0;
}

/** Playing a land is not "casting a spell" - it doesn't use the stack and is capped at one per turn. */
/**
 * Plays a land for the turn. See `fireLandPlayed` for why the event it fires is
 * not the same as landfall.
 */
/**
 * Whether this player has been given permission to play this specific card out of
 * exile, and it has not expired.
 *
 * Read rather than cleared: the permission is stamped with the turn it was
 * granted, so a card exiled on turn 7 stops being playable the moment turn 8
 * begins without anything having to remember to sweep it.
 */
export function mayPlayFromExile(state: GameState, playerId: string, instance: CardInstance): boolean {
  const permission = instance.playableFromExile;
  if (!permission || instance.zone !== "exile") return false;
  if (permission.playerId !== playerId) return false;
  if (state.turnNumber !== permission.untilTurn) return false;
  const def = state.cardDefinitions[instance.definitionId];
  // "You may **cast** that card" does not include a land drop.
  if (!permission.lands && def?.types.includes("Land")) return false;
  return true;
}

export function playLand(
  state: GameState,
  playerId: string,
  instanceId: string,
  /**
   * Which face of a modal double-faced card is being played.
   *
   * Only ever consulted when *both* faces are lands - Needleverge Pathway - and
   * ignored otherwise, because there is nothing to choose: a card with a spell
   * on the front and a land on the back can only be reaching `playLand` for its
   * land. Defaults to the front, which is what a client that has never heard of
   * two-land cards would mean.
   */
  face: "front" | "back" = "front",
): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;

  /*
   * From hand, or - with Icetill Explorer out - from the graveyard.
   *
   * A permission rather than a different action: everything below is identical
   * either way, which is what the card means by "you may play lands from your
   * graveyard". Checked here rather than widened unconditionally, because a
   * land in a graveyard is otherwise as unplayable as any other card there.
   */
  const fromGraveyard = instance.zone === "graveyard" && canPlayLandsFromGraveyard(state, playerId);
  // "You may **play** that card this turn" - Face-Breaker's permission covers a
  // land drop, which is the whole reason its wording differs from Ragavan's.
  const fromExile = mayPlayFromExile(state, playerId, instance);
  if ((instance.zone !== "hand" && !fromGraveyard && !fromExile) || (!fromExile && instance.ownerId !== playerId)) {
    throw new Error(`${instanceId} is not in ${playerId}'s hand`);
  }
  /*
   * A modal double-faced card played for its land half *becomes* that half.
   *
   * Done before anything else reads the definition, so every check below and
   * every trigger afterwards sees a plain land - which is exactly what it is
   * once it is on the battlefield. `moveCard` turns it back over on the way
   * out. Only when the back face is a land: nothing in the pool has a spell on
   * the back, and `playLand` is not the door a spell comes through.
   */
  const front = requireDefinition(state, instance.definitionId);
  const back = front.backFaceId ? requireDefinition(state, front.backFaceId) : undefined;
  if (back?.types.includes("Land")) {
    /*
     * One land face means there is nothing to decide: a spell on the front and a
     * land on the back can only be here for the land. Two land faces - the
     * Pathway cycle - is a genuine choice, and it is the entire card.
     */
    const wanted = front.types.includes("Land") ? face : "back";
    if (wanted === "back") instance.definitionId = front.backFaceId!;
  }

  const def = requireDefinition(state, instance.definitionId);
  if (!def.types.includes("Land")) throw new Error(`${def.name} is not a land`);
  if (!canCastAtSorcerySpeed(state, playerId)) throw new Error("Lands can only be played at sorcery speed");
  // One a turn, plus whatever the board grants - see `landDropsAllowed`.
  if (player.landsPlayedThisTurn >= landDropsAllowed(state, playerId)) {
    throw new Error(`${playerId} has already played a land this turn`);
  }

  /*
   * Logged like every other action, which it was not until now.
   *
   * Playing a land was the one thing a player could do that left no trace: the
   * log jumped from one spell to the next with the land drop invisible, and
   * "did I already play a land this turn?" is a question the log is the natural
   * place to answer. The client also drives its sound cues off log lines, so a
   * land going down was silent purely because there was no line to read.
   *
   * Before the land actually arrives, so the log reads in the order things
   * happened rather than reporting a landfall trigger ahead of its cause.
   */
  log(state, `${playerId} plays ${def.name}`);

  /*
   * Via putOntoBattlefield rather than moveCard, so a land carrying an
   * enters-the-battlefield trigger fires it like any other permanent would.
   *
   * Landfall used to be a second loop written out here, which meant it only
   * ever fired for a land *played* from hand. A land put onto the battlefield
   * any other way - a fetchland cracking, Sakura-Tribe Elder, a ramp spell -
   * arrived in total silence, even though the rules make no distinction. It now
   * lives in `enteredBattlefield`, the one door every land goes through.
   */
  putOntoBattlefield(state, instanceId);
  player.landsPlayedThisTurn += 1;
  /*
   * "When you play another land" - City of Traitors, and only here.
   *
   * After the land has arrived, so a City of Traitors sacrificing itself does so
   * with the new land already on the battlefield - which is the order the card
   * describes and the order that leaves the player with the land they paid for.
   */
  fireLandPlayed(state, instance);

  state.passesInSuccession = 0;
}
