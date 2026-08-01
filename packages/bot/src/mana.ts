import {
  ALL_COLORS,
  canPayManaCostFromPool,
  potentialAvailableMana,
  type CardInstance,
  type Color,
  type GameState,
  type ManaCost,
  type Player,
} from "@mtg-commander-sim/engine";
import { definitionOf } from "./evaluate.js";

/** A permanent that taps for mana with no additional cost, plus which colour it makes. */
interface ManaSource {
  instance: CardInstance;
  abilityIndex: number;
  color: Color;
  amount: number;
}

export function manaSources(state: GameState, player: Player): ManaSource[] {
  const sources: ManaSource[] = [];
  for (const instance of player.battlefield) {
    if (instance.tapped) continue;
    const def = definitionOf(state, instance);
    if (!def) continue;
    // Summoning-sick creatures can't use tap abilities, but lands always can.
    if (def.types.includes("Creature") && instance.summoningSickness) continue;
    def.activatedAbilities?.forEach((ability, abilityIndex) => {
      if (!ability.cost.tap || ability.cost.mana) return;
      if (ability.effect.kind !== "addMana") return;
      sources.push({ instance, abilityIndex, color: ability.effect.color, amount: ability.effect.amount });
    });
  }
  return sources;
}

/** Whether the player could pay `cost` if they tapped everything available, floating mana included. */
export function couldAfford(state: GameState, playerId: string, cost: ManaCost): boolean {
  return canPayManaCostFromPool(potentialAvailableMana(state, playerId), cost);
}

/**
 * Picks the next land (or mana creature) to tap toward paying `cost`.
 * Colour requirements are satisfied first, since a source producing a colour
 * the cost actually needs is strictly more useful than one that only helps
 * with the generic portion. Returns null when the pool already covers the
 * cost or nothing left can help.
 *
 * This is deliberately greedy rather than a real cost solver. With the
 * current mono-coloured pools every source produces the deck's one colour,
 * so greedy is optimal; a card with hybrid or multi-colour requirements
 * would need proper solving (see the limitations note in ROADMAP.md).
 */
export function nextSourceToTap(
  state: GameState,
  player: Player,
  cost: ManaCost,
): { instanceId: string; abilityIndex: number } | null {
  if (canPayManaCostFromPool(player.manaPool, cost)) return null;

  const sources = manaSources(state, player);
  if (sources.length === 0) return null;

  const shortfallColors = ALL_COLORS.filter(
    (color) => (player.manaPool[color] ?? 0) < (cost.colors[color] ?? 0),
  );

  const preferred =
    shortfallColors.length > 0
      ? sources.find((s) => shortfallColors.includes(s.color))
      : // Colour requirements are met; anything untapped now helps with the generic part.
        sources[0];

  const chosen = preferred ?? sources[0];
  if (!chosen) return null;
  return { instanceId: chosen.instance.instanceId, abilityIndex: chosen.abilityIndex };
}
