import type { CardInstance, CardType, GameState, ReplacementEffect } from "./types.js";
import { requirePlayer } from "./state.js";

/**
 * Replacement effects - "if an effect would X, do Y instead".
 *
 * Deliberately two events rather than a general event bus. The real rules let
 * a replacement modify almost anything that happens, and modelling that
 * faithfully would mean routing every effect in the engine through an
 * interception point. Two events cover every card of this shape in the pool,
 * and each is a single line in effects.ts: counters going onto a permanent,
 * and tokens being created. The day a card replaces damage or a draw, this
 * file grows a third function rather than the engine growing a bus.
 *
 * Both events are asked *before* anything happens, and the answer is a number.
 * Nothing here mutates.
 */

/** The replacements in play right now, from every permanent the player controls. */
function activeFor(state: GameState, controllerId: string): ReplacementEffect[] {
  const controller = requirePlayer(state, controllerId);
  const found: ReplacementEffect[] = [];
  for (const instance of controller.battlefield) {
    const definition = state.cardDefinitions[instance.definitionId];
    if (definition?.replacementEffects) found.push(...definition.replacementEffects);
  }
  return found;
}

/**
 * How many counters actually go on, once every replacement has had its say.
 *
 * **On the order.** Rule 616.1 gives the choice to the affected object's
 * controller when two replacements both apply, and it genuinely matters:
 * Doubling Season plus Winding Constrictor turn one counter into either three
 * (double, then add) or four (add, then double). There is no mid-resolution
 * choice flow for this, so rather than pick an arbitrary board order, every
 * `add` is applied before every `multiply` - which is always the larger
 * result, and therefore always the order the player would choose.
 *
 * That equivalence holds because the engine models exactly one kind of
 * counter, +1/+1, and more of those is never worse for the permanent's
 * controller. The day this engine gets -1/-1 counters, or counters an opponent
 * puts on your permanents, the choice stops being automatic and has to be
 * asked for real.
 */
export function countersPlaced(state: GameState, instance: CardInstance, amount: number): number {
  // "would put one or more counters" - replacing nothing is not an event.
  if (amount <= 0) return amount;
  const definition = state.cardDefinitions[instance.definitionId];
  if (!definition) return amount;
  // Only permanents on the battlefield; a card in a graveyard is not something
  // a counter goes on, and nothing in the pool tries.
  if (instance.zone !== "battlefield") return amount;

  const applicable = activeFor(state, instance.controllerId).filter(
    (r): r is Extract<ReplacementEffect, { kind: "counters-placed" }> =>
      r.kind === "counters-placed" && matchesTypes(r.cardTypes, definition.types),
  );

  let total = amount;
  for (const rule of applicable) total += rule.add ?? 0;
  for (const rule of applicable) total *= rule.multiply ?? 1;

  /*
   * Iridescent Hornbeetle's tally, counted after the replacements have had
   * their say - which is right, because Doubling Season genuinely does make the
   * Hornbeetle pay for twice as many.
   *
   * "On creatures under your control", so a counter this player puts on
   * somebody else's creature does not count, and neither does one on a
   * non-creature.
   */
  if (definition.types.includes("Creature")) {
    requirePlayer(state, instance.controllerId).plusOneCountersPlacedThisTurn += total;
  }
  return total;
}

/** How many tokens are actually created. Pure multiplication, so order is irrelevant. */
export function tokensCreated(state: GameState, controllerId: string, count: number): number {
  if (count <= 0) return count;
  let total = count;
  for (const rule of activeFor(state, controllerId)) {
    if (rule.kind === "tokens-created") total *= rule.multiply;
  }
  return total;
}

/** No list means every permanent qualifies, which is what Doubling Season says. */
function matchesTypes(cardTypes: CardType[] | undefined, actual: CardType[]): boolean {
  if (!cardTypes) return true;
  return cardTypes.some((t) => actual.includes(t));
}
