import type { Amount, Effect, ManaCost } from "./types.js";

/**
 * {X} in a mana cost, and the numbers in an effect that read it.
 *
 * X is settled once, as the spell is cast (rule 601.2b), and never changes
 * afterwards. That is what makes this a *substitution* rather than something
 * the effects layer has to understand: `resolveAmounts` walks the effect and
 * replaces every X with the announced value before the effect goes anywhere
 * near `applyEffect`. Nothing in effects.ts, the bot, or the card-text
 * renderer had to learn what X is.
 *
 * The alternative - carrying X on the stack object and resolving it at
 * resolution time - would have meant every reader of every numeric field
 * asking "is this a number or is it X?", forever.
 */

/**
 * The concrete cost of casting a spell for a chosen X.
 *
 * Each {X} symbol adds X generic, so Pest Infestation's {X}{X}{G} at X = 3
 * costs {6}{G} and not {3}{G} - the doubled symbol is the entire reason `x` is
 * a count rather than a flag.
 */
export function costWithX(cost: ManaCost, chosenX: number): ManaCost {
  if (!cost.x) return cost;
  return { ...cost, generic: cost.generic + cost.x * chosenX };
}

/** Whether a cost needs an X to be announced before it can be paid. */
export function requiresX(cost: ManaCost | undefined): boolean {
  return (cost?.x ?? 0) > 0;
}

function value(amount: Amount, chosenX: number): number {
  if (typeof amount === "number") return amount;
  const resolved = chosenX;
  return amount.negate ? -resolved : resolved;
}

/**
 * A copy of the effect with every X replaced by the announced value.
 *
 * Recurses through `sequence` and `modal` so a card that wraps an X-valued
 * effect is not silently left holding a marker. Returns the effect unchanged
 * when there is nothing to substitute, which is every card in the pool but one.
 */
export function resolveAmounts(effect: Effect, chosenX: number): Effect {
  switch (effect.kind) {
    case "pumpAll":
      return {
        ...effect,
        power: value(effect.power, chosenX),
        toughness: value(effect.toughness, chosenX),
      };
    case "sequence":
      return { ...effect, effects: effect.effects.map((step) => resolveAmounts(step, chosenX)) };
    case "modal":
      return {
        ...effect,
        modes: effect.modes.map((mode) => ({ ...mode, effect: resolveAmounts(mode.effect, chosenX) })),
      };
    default:
      return effect;
  }
}

/**
 * An `Amount` that should already be a plain number by now.
 *
 * Loud rather than silently treating an unresolved X as zero, which would
 * present as The Meathook Massacre wiping nothing and looking like a targeting
 * bug. Same posture as the `modal` case in applyEffect: reaching here means a
 * fire site skipped `resolveAmounts`, and that is a bug in the engine rather
 * than something a card can cause.
 */
export function requireNumber(amount: Amount, what: string): number {
  if (typeof amount === "number") return amount;
  throw new Error(`${what} still contains an unresolved X - resolveAmounts was not called`);
}
