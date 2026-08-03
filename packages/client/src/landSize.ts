/**
 * How tall to draw the cards in a player's lands and other-permanents area.
 *
 * These start comfortably big, because for most of a game there are only a few
 * of them and shrinking them early wastes the space they were given. As the
 * board fills they step down, so a long game does not end up with thirty
 * slivers overlapping into an unreadable smear.
 *
 * Stepped rather than continuous on purpose. A size that slid a pixel smaller
 * with every land played would mean the whole area twitched constantly - the
 * same restlessness that made the old centre strip unpleasant. Steps mean it
 * changes rarely and deliberately, and stays put in between.
 */

export interface LandSizeStep {
  /** Applies while the count is at most this. */
  upTo: number;
  height: number;
}

export const LAND_SIZE_STEPS: LandSizeStep[] = [
  { upTo: 6, height: 92 },
  { upTo: 10, height: 78 },
  { upTo: 16, height: 64 },
  { upTo: 24, height: 54 },
];

/** The floor, once a board is genuinely crowded. */
export const SMALLEST_LAND_HEIGHT = 46;

export function landCardHeight(count: number): number {
  for (const step of LAND_SIZE_STEPS) {
    if (count <= step.upTo) return step.height;
  }
  return SMALLEST_LAND_HEIGHT;
}
