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

/**
 * What the numbers an effect could not know in advance turn out to be.
 *
 * Both are settled before the effect goes on the stack and never change
 * afterwards, which is what lets them be substituted rather than understood.
 */
export interface AmountContext {
  /** The value announced for {X} when the source was cast. */
  x: number;
  /**
   * The number the event carried - how much damage was just dealt, for a
   * `damaged` trigger. Zero for every event that carries no number, so a card
   * written with `event-amount` on the wrong trigger does nothing rather than
   * inventing a figure.
   */
  eventAmount?: number;
}

function value(amount: Amount, values: AmountContext): number {
  if (typeof amount === "number") return amount;
  if (amount.kind === "event-amount") return values.eventAmount ?? 0;
  return amount.negate ? -values.x : values.x;
}

/**
 * A copy of the effect with every X replaced by the announced value.
 *
 * Recurses through `sequence` and `modal` so a card that wraps an X-valued
 * effect is not silently left holding a marker. Returns the effect unchanged
 * when there is nothing to substitute, which is every card in the pool but one.
 */
export function resolveAmounts(effect: Effect, values: AmountContext): Effect {
  switch (effect.kind) {
    case "pumpAll":
      return {
        ...effect,
        power: value(effect.power, values),
        toughness: value(effect.toughness, values),
      };
    case "createToken":
      return { ...effect, count: value(effect.count, values) };
    case "sequence":
      return { ...effect, effects: effect.effects.map((step) => resolveAmounts(step, values)) };
    case "modal":
      return {
        ...effect,
        modes: effect.modes.map((mode) => ({ ...mode, effect: resolveAmounts(mode.effect, values) })),
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
  throw new Error(`${what} still contains an unresolved ${amount.kind} - resolveAmounts was not called`);
}
