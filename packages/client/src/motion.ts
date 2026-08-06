/**
 * How long anything on this table takes, and how it eases.
 *
 * Every duration and curve in the client used to be chosen where it was
 * written: 0.16s here, 0.14s there, `ease` on almost everything. Individually
 * each was defensible and together they were not a system - two things that do
 * the same job moved at different speeds for no reason anyone could state, and
 * a card lifting under the cursor eased the same way as a life total falling.
 *
 * The two ideas this replaces them with:
 *
 * **Five durations, picked by what the motion is for rather than by feel.**
 * Perception is the constraint, not taste. Under about 100ms a change is not
 * seen as movement at all, only as a jump - fine for a button acknowledging a
 * click, wrong for a card. Over about 250ms a small change starts registering
 * as a wait. So poses live at 150ms, in the middle of the band where a change
 * reads as the object moving; a control answers in 70ms, comfortably inside the
 * threshold where a click feels connected to its result; and the long ones are
 * long because something has to be *read* - a floating number nobody can read
 * is worse than no number.
 *
 * **Every curve decelerates.** This is the change that is actually visible.
 * CSS's default `ease` accelerates and decelerates about equally, which suits
 * something passing through and suits nothing here: a card arriving in a zone,
 * a hand lifting, a life total settling are all objects coming to rest, and
 * objects coming to rest slow down at the end and not at the start. Everything
 * below spends most of its distance early and most of its time finishing.
 *
 * These are duplicated as custom properties in styles.css, because CSS cannot
 * import a module and JavaScript should not be writing the stylesheet at boot.
 * The duplication is checked by a test that parses styles.css, so the two
 * cannot drift - see motion.test.ts.
 */

/**
 * Milliseconds.
 *
 * Widened by about a fifth on 2026-08-06: everything was inside its band but
 * sat at the fast end of it, and against the bot - which answers in well under
 * a second - the effect was a game that resolved itself faster than you could
 * watch it. Slower here is not decoration; it is the difference between seeing
 * a card move and finding it has moved.
 */
export const DURATIONS = {
  /** A control acknowledging a click. Fast enough to feel like the click itself. */
  press: 80,
  /** A card changing pose: hovering, tapping, leaning into combat, fanning. */
  pose: 190,
  /** Something crossing the table - a card flying between zones. */
  travel: 460,
  /** A one-shot impact: the clash, the flinch, the damage number appearing. */
  strike: 500,
  /** Long enough to read: a life total ticking, a number floating away. */
  linger: 1050,
} as const;

/**
 * Dealing the opening hand.
 *
 * Its own pair rather than part of the scale above, because it is the only
 * motion in the game with a *rhythm* - seven cards arriving one after another
 * rather than one thing moving. `card` is how long a single card takes to
 * land; `step` is the gap between one starting and the next, and is what makes
 * it read as dealing rather than as a hand appearing.
 *
 * Seven cards at these numbers takes just over 1.1 seconds, which is about as
 * long as a real deal and comfortably short of feeling like a loading screen.
 */
export const DEAL = {
  /** One card, from off the left edge to its place in the fan. */
  card: 300,
  /** The gap between one card being dealt and the next. */
  step: 130,
} as const;

/** Control points of a cubic-bezier, as CSS and Framer Motion both want them. */
export type Easing = readonly [number, number, number, number];

export const EASINGS = {
  /**
   * Arriving somewhere. Covers most of the distance in the first third and
   * spends the rest stopping - the curve for anything that lands.
   */
  settle: [0.16, 0.84, 0.32, 1],
  /**
   * Changing pose in place. A gentler start than `settle`, because a hover
   * that leaps on the first frame reads as a flicker rather than as a lift.
   */
  lift: [0.32, 0.72, 0.4, 1],
  /**
   * Lands slightly past where it is going and comes back. For the small number
   * of things that should read as having weight rather than as being placed.
   */
  snap: [0.22, 1, 0.36, 1.18],
  /** A punch: driven hard, no wind-up, recovers slowly. */
  strike: [0.3, 0.85, 0.35, 1],
} as const satisfies Record<string, Easing>;

/** `cubic-bezier(...)`, for anywhere a string is wanted rather than four numbers. */
export function cssEase(easing: Easing): string {
  return `cubic-bezier(${easing.join(", ")})`;
}
