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
