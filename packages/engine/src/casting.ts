import type { CardDefinition, Effect, GameState, ManaCost, StackTarget } from "./types.js";
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
import { describeSubject, fireWatchers, pushOntoStack, putOntoBattlefield } from "./permanents.js";
import { isValidTarget, targetSelectorOf } from "./targeting.js";
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

  const expectedZone = options.fromCommandZone ? "command" : "hand";
  if (instance.zone !== expectedZone) {
    throw new Error(`${instanceId} is not in ${playerId}'s ${expectedZone} zone`);
  }
  if (instance.ownerId !== playerId) {
    throw new Error(`${playerId} does not own ${instanceId}`);
  }

  const def = requireDefinition(state, instance.definitionId);
  const isPermanentSpell = def.types.some((t) => PERMANENT_TYPES.has(t));

  if (isSorcerySpeedOnly(def) && !canCastAtSorcerySpeed(state, playerId)) {
    throw new Error(`${def.name} can only be cast at sorcery speed`);
  }

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

  let cost: ManaCost = alternative
    ? { generic: 0, colors: {} }
    : costWithX(def.manaCost ?? { generic: 0, colors: {} }, chosenX);
  if (options.fromCommandZone && !alternative) {
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

  // Validated before anything is paid or moved. Every throw below this point
  // would otherwise leave the game half-cast - mana spent and the card sitting
  // on the stack - and an illegal target is the easy way to hit that now that
  // targets can disappear in response to a spell.
  const selector = targetSelectorOf(effect);
  if (selector) {
    if (targets.length === 0) throw new Error(`${def.name} requires a target`);
    for (const target of targets) {
      if (!isValidTarget(state, selector, target, playerId)) {
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

/** Playing a land is not "casting a spell" - it doesn't use the stack and is capped at one per turn. */
export function playLand(state: GameState, playerId: string, instanceId: string): void {
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
  if ((instance.zone !== "hand" && !fromGraveyard) || instance.ownerId !== playerId) {
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
  if (back?.types.includes("Land") && !front.types.includes("Land")) {
    instance.definitionId = front.backFaceId!;
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

  state.passesInSuccession = 0;
}
