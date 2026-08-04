/**
 * Which permanents have just been tapped, and in what order to show it.
 *
 * The engine taps every land for a spell in one synchronous call, so by the
 * time React renders they are all tapped at once. On screen that reads as the
 * board blinking rather than as paying a cost - you see that something was
 * spent but not what, and five lands turning simultaneously looks like a
 * rendering glitch rather than an action.
 *
 * The fix is entirely presentational: work out which permanents are newly
 * tapped since the last render and give each one a position in a queue, which
 * the stylesheet turns into a transition delay so they turn one after another.
 * The game state is untouched and the arithmetic is here, in a plain module,
 * so it can be tested without a browser.
 */

/** Milliseconds between one permanent turning and the next. */
export const TAP_STAGGER_MS = 90;

/**
 * How long a newly-tapped permanent stays "newly tapped". Long enough for the
 * whole queue plus the turn itself; after this the delays are dropped so a
 * later re-render does not replay the sequence.
 */
export const TAP_SETTLE_MS = 900;

export interface TapDiff {
  /** Instance id to its place in the queue, 0 first. Only newly-tapped ones appear. */
  order: Map<string, number>;
  /** Every instance id that is tapped now - the baseline for the next comparison. */
  tappedNow: Set<string>;
}

/**
 * Compares two sets of tapped permanents.
 *
 * `currentlyTapped` must be in a stable order across renders - battlefield
 * order is, and it is also the order the engine's greedy payment walks, so
 * the queue matches the order the lands were actually spent in.
 *
 * Untapping is deliberately not staggered. Every permanent untaps at once at
 * the start of a turn, that is what the rules say happens, and animating it as
 * a queue would invent a sequence the game does not have.
 */
export function diffTapped(previous: Set<string>, currentlyTapped: readonly string[]): TapDiff {
  const order = new Map<string, number>();
  const tappedNow = new Set<string>();
  let position = 0;
  for (const instanceId of currentlyTapped) {
    tappedNow.add(instanceId);
    if (!previous.has(instanceId)) {
      order.set(instanceId, position);
      position += 1;
    }
  }
  return { order, tappedNow };
}

/** The delay to hand the stylesheet for a card at this place in the queue. */
export function tapDelayMs(position: number | undefined): number {
  if (position === undefined) return 0;
  return position * TAP_STAGGER_MS;
}
