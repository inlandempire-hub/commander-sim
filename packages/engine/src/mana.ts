import type { ActivatedAbility, Color, Effect, GameState, ManaColor, ManaCost, ManaPool, Player } from "./types.js";
import { ALL_COLORS } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";

export function manaValue(cost: ManaCost): number {
  const pips = ALL_COLORS.reduce((sum, c) => sum + (cost.colors[c] ?? 0), 0);
  return cost.generic + pips;
}

/** The commander tax rule: +{2} generic per previous cast from the command zone this game. */
export function applyCommanderTax(cost: ManaCost, timesPreviouslyCast: number): ManaCost {
  return {
    generic: cost.generic + 2 * timesPreviouslyCast,
    colors: { ...cost.colors },
  };
}

/** Whether `cost` is payable out of a given mana pool, without mutating anything. */
export function canPayManaCostFromPool(pool: ManaPool, cost: ManaCost): boolean {
  const remaining = { ...pool };
  for (const color of ALL_COLORS) {
    const need = cost.colors[color] ?? 0;
    const have = remaining[color] ?? 0;
    if (have < need) return false;
    remaining[color] = have - need;
  }
  const leftover = ALL_COLORS.reduce((sum, c) => sum + (remaining[c] ?? 0), 0) + (remaining.generic ?? 0);
  return leftover >= cost.generic;
}

export function canPayManaCost(player: Player, cost: ManaCost): boolean {
  return canPayManaCostFromPool(player.manaPool, cost);
}

/** Deducts a mana cost from the player's mana pool. Throws if they can't pay - callers must check canPayManaCost first. */
export function payManaCost(player: Player, cost: ManaCost): void {
  if (!canPayManaCost(player, cost)) {
    throw new Error(`${player.id} cannot pay mana cost`);
  }
  for (const color of ALL_COLORS) {
    const need = cost.colors[color] ?? 0;
    player.manaPool[color] = (player.manaPool[color] ?? 0) - need;
  }
  let genericRemaining = cost.generic;
  // Spend leftover colored mana first, then generic-pool mana.
  for (const color of ALL_COLORS) {
    if (genericRemaining <= 0) break;
    const have = player.manaPool[color] ?? 0;
    const spend = Math.min(have, genericRemaining);
    player.manaPool[color] = have - spend;
    genericRemaining -= spend;
  }
  if (genericRemaining > 0) {
    player.manaPool.generic = (player.manaPool.generic ?? 0) - genericRemaining;
  }
}

/**
 * Colourless goes into the `generic` bucket, which is already exactly how
 * colourless mana behaves: it pays the generic part of a cost and never a
 * coloured pip. See ManaColor in types.ts for the one case that does not cover.
 */
export function addMana(pool: ManaPool, color: ManaColor, amount: number): void {
  if (color === "C") {
    pool.generic = (pool.generic ?? 0) + amount;
    return;
  }
  pool[color] = (pool[color] ?? 0) + amount;
}

export function emptyManaPool(player: Player): void {
  player.manaPool = {};
}

/**
 * A mana ability whose only cost is tapping the permanent.
 *
 * The distinction matters everywhere mana is counted without being spent -
 * "could this player afford that spell", "which lands should auto-tap turn" -
 * because all of those treat a source as free. A fetchland taps, pays a life
 * and sacrifices itself to produce no mana at all, and counting it would have
 * the game offer you spells you cannot cast, then tap a land to nothing trying
 * to pay for one.
 */
export function isFreeManaAbility(
  ability: ActivatedAbility,
): ability is ActivatedAbility & { effect: Extract<Effect, { kind: "addMana" }> } {
  return (
    ability.cost.tap === true &&
    ability.cost.mana === undefined &&
    ability.cost.payLife === undefined &&
    ability.cost.sacrificeSelf !== true &&
    ability.effect.kind === "addMana"
  );
}

/**
 * What a player's mana pool WOULD look like if they tapped every untapped
 * mana-producing permanent they control (in addition to whatever's already
 * floating). Used to decide "is there any point asking this player to act" -
 * not a real mutation, and deliberately ignores mana abilities that also
 * require an additional mana cost of their own (none exist in the card pool
 * yet, but a card like that would need real cost-solving, not this
 * approximation).
 */
export function potentialAvailableMana(state: GameState, playerId: string): ManaPool {
  const player = requirePlayer(state, playerId);
  const pool: ManaPool = { ...player.manaPool };
  for (const instance of player.battlefield) {
    if (instance.tapped) continue;
    const def = requireDefinition(state, instance.definitionId);
    if (def.types.includes("Creature") && instance.summoningSickness) continue;
    for (const ability of def.activatedAbilities ?? []) {
      if (!isFreeManaAbility(ability)) continue;
      addMana(pool, ability.effect.color, ability.effect.amount);
    }
  }
  return pool;
}
