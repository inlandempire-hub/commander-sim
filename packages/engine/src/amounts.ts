import type { Amount, Countable, GameState } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";
import { effectivePower } from "./counters.js";

/**
 * Numbers an effect reads off the game when it resolves.
 *
 * The third and last kind of unknown number, and the only one the effects layer
 * has to understand:
 *
 *   {X}             settled as the spell is cast, substituted by x.ts
 *   event-amount    settled as the trigger fires, substituted by x.ts
 *   count           read at resolution, evaluated here
 *
 * The first two are substitutions precisely because they can never change after
 * they are fixed. This one can and does: "draw a card for each creature you
 * control with a +1/+1 counter on it" counts the board at the moment Inspiring
 * Call resolves, so killing one of those creatures in response really does take
 * a card away. Substituting it early would quietly make the card uncounterable
 * in the way that matters.
 */

export function evaluateAmount(
  state: GameState,
  controllerId: string,
  amount: Amount,
  what: string,
): number {
  if (typeof amount === "number") return amount;
  if (amount.kind === "count") return countOf(state, controllerId, amount.of);
  /*
   * An unresolved X or event-amount reaching here means a fire site skipped
   * `resolveAmounts`. Loud, because the alternative is a board wipe that
   * silently does nothing and looks like a targeting bug. Same posture as
   * `requireNumber`, which this replaces at every site that has a state to
   * read.
   */
  throw new Error(`${what} still contains an unresolved ${amount.kind} - resolveAmounts was not called`);
}

function countOf(state: GameState, controllerId: string, of: Countable): number {
  const player = requirePlayer(state, controllerId);
  const creatures = player.battlefield.filter((instance) =>
    requireDefinition(state, instance.definitionId).types.includes("Creature"),
  );

  switch (of.what) {
    case "creatures": {
      return creatures.filter((instance) => {
        if (of.withCounter && instance.plusOneCounters <= 0) return false;
        if (of.excludeSubtype) {
          const def = requireDefinition(state, instance.definitionId);
          if (def.subtypes?.includes(of.excludeSubtype)) return false;
        }
        return true;
      }).length;
    }
    case "greatest-power": {
      const eligible = creatures.filter((instance) => {
        if (!of.excludeSubtype) return true;
        return !requireDefinition(state, instance.definitionId).subtypes?.includes(of.excludeSubtype);
      });
      // No creatures means zero, not negative infinity - "draw cards equal to
      // the greatest power" with an empty board draws nothing.
      if (eligible.length === 0) return 0;
      // Effective power, so counters and anthems count. A card that read the
      // printed number would be a different card the moment anything pumped.
      return Math.max(...eligible.map((instance) => effectivePower(state, instance)));
    }
    case "counters-placed-this-turn":
      return player.plusOneCountersPlacedThisTurn;
    case "creatures-attacking-you":
      // `state.attackers` maps an attacker to the player it is attacking, so
      // this is a count of the entries pointed at us - not of our creatures,
      // and not of every attacker on the table.
      return Object.values(state.attackers).filter((defenderId) => defenderId === controllerId).length;
  }
}
