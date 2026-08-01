import {
  effectivePower,
  effectiveToughness,
  manaValue,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Player,
} from "@mtg-commander-sim/engine";

/** Every heuristic in this package reads stats through the engine's helpers, never `definition.power`, so counters and until-end-of-turn pumps are always accounted for. */
export function power(state: GameState, instance: CardInstance): number {
  return effectivePower(state, instance);
}

export function toughness(state: GameState, instance: CardInstance): number {
  return effectiveToughness(state, instance);
}

export function definitionOf(state: GameState, instance: CardInstance): CardDefinition | undefined {
  return state.cardDefinitions[instance.definitionId];
}

export function hasKeyword(state: GameState, instance: CardInstance, keyword: string): boolean {
  return definitionOf(state, instance)?.keywords?.includes(keyword as never) ?? false;
}

export function isCreature(state: GameState, instance: CardInstance): boolean {
  return definitionOf(state, instance)?.types.includes("Creature") ?? false;
}

export function creaturesOf(state: GameState, player: Player): CardInstance[] {
  return player.battlefield.filter((c) => isCreature(state, c));
}

export function opponentsOf(state: GameState, botPlayerId: string): Player[] {
  return state.players.filter((p) => p.id !== botPlayerId && !p.hasLost);
}

/**
 * A rough "how much do I care about losing this creature" score. Deliberately
 * crude - stats plus a bonus for evasion and for keywords that make a trade
 * one-sided, plus mana value so a 6-drop isn't chump-blocked away for a
 * 1-drop. It only ever gets compared against other creatures' scores, so the
 * absolute numbers don't mean anything.
 */
export function creatureValue(state: GameState, instance: CardInstance): number {
  const def = definitionOf(state, instance);
  if (!def) return 0;
  let score = power(state, instance) * 2 + toughness(state, instance) + manaValue(def.manaCost ?? { generic: 0, colors: {} });
  if (hasKeyword(state, instance, "Flying")) score += 3;
  if (hasKeyword(state, instance, "Deathtouch")) score += 3;
  if (hasKeyword(state, instance, "Lifelink")) score += 2;
  if (hasKeyword(state, instance, "Trample")) score += 2;
  if (hasKeyword(state, instance, "Menace")) score += 2;
  if (hasKeyword(state, instance, "Indestructible")) score += 4;
  // Striking first often means winning a fight without losing anything.
  if (hasKeyword(state, instance, "First Strike")) score += 3;
  if (hasKeyword(state, instance, "Double Strike")) score += 5;
  if (instance.isCommander) score += 6; // losing a commander costs tax on every recast
  return score;
}

/** First Strike and Double Strike both deal damage in the first sub-step. */
export function strikesEarly(state: GameState, instance: CardInstance): boolean {
  return hasKeyword(state, instance, "First Strike") || hasKeyword(state, instance, "Double Strike");
}

/**
 * Damage a creature deals across a whole combat - twice for Double Strike,
 * which hits in both sub-steps.
 *
 * Slight over-estimate for a double striker that dies to an opposing first
 * striker before its second hit; it lands on the safe side, since it makes the
 * bot value its own double strikers correctly and be cautious about theirs.
 */
export function combatDamage(state: GameState, instance: CardInstance): number {
  return power(state, instance) * (hasKeyword(state, instance, "Double Strike") ? 2 : 1);
}

/**
 * Does `aggressor` kill `victim` in a fight between them?
 *
 * First Strike is the whole reason this can't just compare power to toughness:
 * a creature killed in the first damage sub-step never deals any damage at all,
 * so the fight is one-sided rather than a trade. Both sides call this, which is
 * what makes "will I lose my creature?" and "will I kill theirs?" agree.
 */
export function killsInFight(state: GameState, aggressor: CardInstance, victim: CardInstance): boolean {
  const victimStrikesFirst = strikesEarly(state, victim) && !strikesEarly(state, aggressor);
  if (
    victimStrikesFirst &&
    wouldDie(state, aggressor, power(state, victim), hasKeyword(state, victim, "Deathtouch"))
  ) {
    return false; // dead before it could swing back
  }
  return wouldDie(state, victim, combatDamage(state, aggressor), hasKeyword(state, aggressor, "Deathtouch"));
}

/** Whether `amount` damage would finish `instance` off, accounting for damage already marked and for Deathtouch/Indestructible. */
export function wouldDie(
  state: GameState,
  instance: CardInstance,
  amount: number,
  fromDeathtouch = false,
): boolean {
  if (hasKeyword(state, instance, "Indestructible")) return false;
  if (fromDeathtouch && amount > 0) return true;
  if (instance.deathtouchDamage) return true;
  return instance.damageMarked + amount >= toughness(state, instance);
}

/** Whether `blocker` is legally able to block `attacker` - the Flying/Reach rule. Menace needs two blockers and is handled where blocks are grouped, not here. */
export function canBlock(state: GameState, blocker: CardInstance, attacker: CardInstance): boolean {
  if (blocker.tapped) return false;
  if (!isCreature(state, blocker)) return false;
  if (!hasKeyword(state, attacker, "Flying")) return true;
  return hasKeyword(state, blocker, "Flying") || hasKeyword(state, blocker, "Reach");
}

/** Creatures that could legally be declared as attackers right now. */
export function eligibleAttackers(state: GameState, player: Player): CardInstance[] {
  return creaturesOf(state, player).filter((c) => {
    if (c.tapped) return false;
    if (hasKeyword(state, c, "Defender")) return false;
    if (c.summoningSickness && !hasKeyword(state, c, "Haste")) return false;
    return true;
  });
}

export function untappedCreatures(state: GameState, player: Player): CardInstance[] {
  return creaturesOf(state, player).filter((c) => !c.tapped);
}
