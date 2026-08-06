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

/**
 * The hand parting around the card you are looking at.
 *
 * Hovering already lifts a card and straightens it out of the fan, but the two
 * cards beside it stayed exactly where they were - so in a crowded hand the one
 * you were trying to read came up still half-buried under its neighbour. What a
 * person does is push the neighbours aside with their thumb.
 *
 * The push is largest for the card immediately beside the hovered one and
 * decays from there, which is what a hand does: the gap opens locally and
 * closes up again further out rather than shoving the whole row sideways.
 *
 * It decays to *exactly* zero at each end, which is not a nicety. A crowded row
 * is precisely as wide as the space it has and clips at its edges, so a card at
 * the end that moved even a few pixels would have those pixels shaved off it.
 * Measured before this was added: hovering the middle of a seven-card hand
 * pushed the last card 7.34px past the edge.
 */

/** How far the card next to the hovered one is pushed, at minimum. */
export const OPEN_MIN_PX = 7;

/**
 * The share of the current overlap the nearest neighbour moves by. A crowded
 * hand hides more of each card, so it has to open further to show the same
 * amount - a fixed number would be too much in a four-card hand and useless in
 * a twelve-card one.
 */
export const OPEN_SHARE_OF_OVERLAP = 0.75;

/** How much of the push each further card gets. */
export const OPEN_FALLOFF = 0.45;

export interface OpenInput {
  count: number;
  /** Index of the card under the cursor, or -1 for none. */
  hovered: number;
  /** How far the row is currently overlapping its cards - see `overlapFor`. */
  overlap: number;
}

/** Pixels each card should slide sideways. Negative is left. */
export function openAround({ count, hovered, overlap }: OpenInput): number[] {
  const shifts: number[] = new Array(Math.max(0, count)).fill(0);
  if (hovered < 0 || hovered >= count || count < 2) return shifts;

  const magnitude = Math.max(OPEN_MIN_PX, overlap * OPEN_SHARE_OF_OVERLAP);
  // Each side of the hovered card is tapered against its own end, because the
  // hovered card is rarely in the middle - two cards to the left and six to
  // the right have to reach zero at different distances.
  const reach = { left: hovered, right: count - 1 - hovered };

  for (let i = 0; i < count; i++) {
    // The hovered card holds its place. It is already lifting and straightening;
    // sliding it as well would make the card you are pointing at the one thing
    // on the table that moves away from the cursor.
    const offset = i - hovered;
    if (offset === 0) continue;

    const distance = Math.abs(offset);
    const furthest = offset < 0 ? reach.left : reach.right;
    const decay = Math.pow(OPEN_FALLOFF, distance - 1);

    /*
     * The taper only applies to a crowded row, and that is the whole of the
     * reasoning. A row is only ever exactly as wide as its space *because* it
     * was overlapped to fit; a row that is not overlapping has slack, cannot be
     * clipped, and is free to spread.
     *
     * The cost is that when the row is crowded and the hovered card is second
     * from an end, the single card beyond it does not move - it is both the
     * neighbour that should make room and the edge that must not. The edge
     * wins, and it costs nothing: cards overlap towards the left, so the card
     * outside the hovered one is underneath it and was never covering it.
     */
    const atEnd = Math.pow(OPEN_FALLOFF, furthest - 1);
    const crowded = overlap > 0;
    const scaled = !crowded ? decay : furthest <= 1 ? 0 : (decay - atEnd) / (1 - atEnd);

    // `|| 0` normalises negative zero, which the taper produces for every card
    // on the left-hand end. It is numerically identical to zero and prints as
    // "-0.00px", which is a confusing thing to find in the DOM.
    shifts[i] = Math.sign(offset) * magnitude * scaled || 0;
  }
  return shifts;
}
