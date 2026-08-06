/**
 * How far cards in a row should overlap each other.
 *
 * Real cards in a hand overlap. A row of them that grows a scrollbar instead
 * is the single most spreadsheet-like thing left on this table: it says
 * "container of items" rather than "cards someone is holding", and it hides
 * half the board behind a scroll nobody thinks to use mid-game.
 *
 * So rows never scroll. When there is not enough width, the cards slide over
 * each other by exactly enough to fit, which is what a person would do.
 *
 * Kept as a pure function - no React, no DOM - because the arithmetic is the
 * part that can be wrong in ways nobody notices until a hand hits nine cards.
 */

/** Never let a card show less than this much of itself. */
export const MIN_VISIBLE_PX = 16;

export interface FanInput {
  /** Width the row has to play with. */
  available: number;
  /** How many cards are in it. */
  count: number;
  /** The natural width of one card. */
  cardWidth: number;
  /** The row's normal gap between cards, which the overlap eats into first. */
  gap: number;
}

/**
 * Returns how many pixels each card after the first should be pulled back by.
 * Zero means they fit as they are and nothing should move.
 */
export function overlapFor({ available, count, cardWidth, gap }: FanInput): number {
  // One card cannot overlap anything, and nonsense measurements (a row that
  // has not been laid out yet) must not produce a nonsense offset.
  if (count < 2 || cardWidth <= 0 || available <= 0) return 0;

  const natural = count * cardWidth + (count - 1) * gap;
  if (natural <= available) return 0;

  // Each of the count-1 cards after the first has to absorb an equal share of
  // the excess.
  const needed = (natural - available) / (count - 1);

  // Past this the row stops being readable, and it is better to let it run
  // past the edge than to reduce every card to a stripe. Reaching this cap
  // takes a genuinely absurd number of cards in one row.
  const most = Math.max(0, cardWidth + gap - MIN_VISIBLE_PX);
  return Math.min(needed, most);
}

/**
 * The bend of a fanned hand.
 *
 * Overlapping alone gets a hand most of the way there, but it still reads as a
 * stack of cards pushed together rather than as a hand somebody is holding: a
 * real hand pivots around the fist at the bottom, so the cards splay outwards
 * and the outer ones ride lower than the middle one.
 *
 * Modelled as exactly that pivot rather than as a tilt-per-card lookup. Each
 * card sits on the rim of a large wheel whose hub is `FAN_RADIUS_IN_CARDS` card
 * heights below the row, and turning card `i` by its angle drops its centre by
 * `radius * (1 - cos angle)` - the sagitta of that arc. Anything else needs the
 * lift and the rotation kept in step with each other by hand, and they drift
 * apart the moment either is adjusted.
 */

/** Degrees between one card in a fanned row and the next. */
export const FAN_STEP_DEG = 4;

/**
 * The most the whole fan may bend, first card to last. Past roughly this a
 * ten-card hand starts turning its outer cards sideways, and the names stop
 * being readable at a glance - which is the entire job of the hand.
 */
export const FAN_MAX_SPREAD_DEG = 30;

/**
 * How far below the row the pivot sits, in card heights. Small numbers curl the
 * hand into a tight arc; large ones flatten it. Three reads as a held hand
 * without the outer cards dropping far enough to collide with the row below.
 */
export const FAN_RADIUS_IN_CARDS = 3;

export interface ArcInput {
  /** How many cards are in the row. */
  count: number;
  /** The natural height of one card, which the drop is measured in. */
  cardHeight: number;
}

export interface ArcPose {
  /** Clockwise degrees. Negative on the left of the row, positive on the right. */
  tiltDeg: number;
  /** Pixels *down* the screen - always zero or more, largest at the ends. */
  liftPx: number;
}

/** The pose of every card in a fanned row, left to right. */
export function arcFor({ count, cardHeight }: ArcInput): ArcPose[] {
  const flat: ArcPose[] = Array.from({ length: Math.max(0, count) }, () => ({
    tiltDeg: 0,
    liftPx: 0,
  }));
  // One card is not a fan, and a row measured before layout would produce a
  // drop of NaN pixels rather than no drop at all.
  if (count < 2 || cardHeight <= 0) return flat;

  // The step shrinks once a hand is big enough that keeping it would push the
  // fan past its total spread. A three-card hand and a twelve-card hand then
  // bend by the same amount overall, which is what a real hand does - you open
  // your fingers wider, you do not grow a wider hand.
  const step = Math.min(FAN_STEP_DEG, FAN_MAX_SPREAD_DEG / (count - 1));
  const radius = cardHeight * FAN_RADIUS_IN_CARDS;
  const middle = (count - 1) / 2;

  return flat.map((_, index) => {
    const tiltDeg = (index - middle) * step;
    const radians = (tiltDeg * Math.PI) / 180;
    return { tiltDeg, liftPx: radius * (1 - Math.cos(radians)) };
  });
}
