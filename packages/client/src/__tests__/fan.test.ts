import { describe, expect, it } from "vitest";
import {
  arcFor,
  FAN_MAX_SPREAD_DEG,
  FAN_STEP_DEG,
  MIN_VISIBLE_PX,
  OPEN_MIN_PX,
  openAround,
  overlapFor,
} from "../fan.js";

/** A row 800px wide holding cards 64px across with the table's 4px gap. */
const row = { available: 800, cardWidth: 64, gap: 4 };

describe("overlapFor", () => {
  it("leaves cards alone when they already fit", () => {
    // 7 cards: 7*64 + 6*4 = 472, well inside 800.
    expect(overlapFor({ ...row, count: 7 })).toBe(0);
  });

  it("does not overlap a single card with itself", () => {
    expect(overlapFor({ ...row, count: 1 })).toBe(0);
  });

  it("closes the row up by exactly the excess when it does not fit", () => {
    const count = 15;
    const overlap = overlapFor({ ...row, count });
    const natural = count * row.cardWidth + (count - 1) * row.gap;

    expect(overlap).toBeGreaterThan(0);
    // Each of the count-1 cards after the first absorbs an equal share, and
    // the row comes out exactly the width it had available - not less.
    expect(natural - (count - 1) * overlap).toBeCloseTo(row.available, 5);
  });

  it("overlaps more the more crowded the row gets", () => {
    expect(overlapFor({ ...row, count: 20 })).toBeGreaterThan(overlapFor({ ...row, count: 14 }));
  });

  it("never hides a card completely, however many there are", () => {
    const overlap = overlapFor({ ...row, count: 400 });
    // What is left showing of each card, once the gap is eaten too.
    expect(row.cardWidth + row.gap - overlap).toBeGreaterThanOrEqual(MIN_VISIBLE_PX);
  });

  it("returns nothing for a row that has not been laid out yet", () => {
    // A first render measures zeroes, and dividing by them would put the whole
    // row at NaN - which CSS silently ignores, hiding the bug.
    expect(overlapFor({ available: 0, count: 8, cardWidth: 0, gap: 4 })).toBe(0);
    expect(overlapFor({ available: 800, count: 8, cardWidth: 0, gap: 4 })).toBe(0);
  });

  it("never returns a negative overlap, which would push cards apart", () => {
    for (const count of [2, 3, 5, 9, 12, 30]) {
      expect(overlapFor({ ...row, count })).toBeGreaterThanOrEqual(0);
    }
  });
});

/** Cards on this table are 5:7, so a 64px-wide card is about 90 tall. */
const cardHeight = 90;

describe("arcFor", () => {
  it("gives one card no lean at all", () => {
    expect(arcFor({ count: 1, cardHeight })).toEqual([{ tiltDeg: 0, liftPx: 0 }]);
  });

  it("returns a pose per card", () => {
    expect(arcFor({ count: 7, cardHeight })).toHaveLength(7);
  });

  it("is symmetric about the middle of the hand", () => {
    const poses = arcFor({ count: 6, cardHeight });
    for (let i = 0; i < poses.length; i++) {
      const mirrored = poses[poses.length - 1 - i]!;
      expect(poses[i]!.tiltDeg).toBeCloseTo(-mirrored.tiltDeg, 8);
      expect(poses[i]!.liftPx).toBeCloseTo(mirrored.liftPx, 8);
    }
  });

  it("leans left cards left and right cards right, with the middle upright", () => {
    const poses = arcFor({ count: 5, cardHeight });
    expect(poses[0]!.tiltDeg).toBeLessThan(0);
    expect(poses[2]!.tiltDeg).toBe(0);
    expect(poses[4]!.tiltDeg).toBeGreaterThan(0);
  });

  it("drops the outer cards below the middle one, never above it", () => {
    const poses = arcFor({ count: 9, cardHeight });
    expect(poses[4]!.liftPx).toBeCloseTo(0, 8);
    for (const pose of poses) expect(pose.liftPx).toBeGreaterThanOrEqual(0);
    // Monotone out from the centre - a hand where card three sat lower than
    // card two would read as one card slipping rather than as a fan.
    for (let i = 5; i < poses.length; i++) {
      expect(poses[i]!.liftPx).toBeGreaterThan(poses[i - 1]!.liftPx);
    }
  });

  it("uses the full step while the hand is small enough for it", () => {
    const poses = arcFor({ count: 5, cardHeight });
    expect(poses[1]!.tiltDeg - poses[0]!.tiltDeg).toBeCloseTo(FAN_STEP_DEG, 8);
  });

  it("keeps a big hand inside the total spread by tightening the step", () => {
    // 20 cards at the full 4 degrees each would bend through 76; the fan has to
    // close up instead, or the outer cards end up nearly sideways.
    const poses = arcFor({ count: 20, cardHeight });
    const spread = poses[19]!.tiltDeg - poses[0]!.tiltDeg;
    expect(spread).toBeCloseTo(FAN_MAX_SPREAD_DEG, 8);
    expect(poses[1]!.tiltDeg - poses[0]!.tiltDeg).toBeLessThan(FAN_STEP_DEG);
  });

  it("scales the drop with the cards, not with a fixed number of pixels", () => {
    const small = arcFor({ count: 7, cardHeight: 60 });
    const large = arcFor({ count: 7, cardHeight: 120 });
    expect(large[0]!.tiltDeg).toBeCloseTo(small[0]!.tiltDeg, 8);
    expect(large[0]!.liftPx).toBeCloseTo(small[0]!.liftPx * 2, 8);
  });

  it("stays flat for a row that has not been laid out yet", () => {
    // Same trap as overlapFor: a first render measures zero height, and a drop
    // computed from it would be NaN, which CSS ignores silently.
    for (const pose of arcFor({ count: 7, cardHeight: 0 })) {
      expect(pose).toEqual({ tiltDeg: 0, liftPx: 0 });
    }
  });
});

describe("openAround", () => {
  it("leaves the hand alone when nothing is hovered", () => {
    expect(openAround({ count: 7, hovered: -1, overlap: 30 })).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("holds the hovered card still", () => {
    // It is already lifting and straightening. Sliding it too would make the
    // card you are pointing at the one thing that moves away from the cursor.
    expect(openAround({ count: 5, hovered: 2, overlap: 30 })[2]).toBe(0);
  });

  it("pushes the cards on each side away from it", () => {
    const shifts = openAround({ count: 5, hovered: 2, overlap: 30 });
    expect(shifts[1]).toBeLessThan(0);
    expect(shifts[3]).toBeGreaterThan(0);
    // The two on the ends hold still - see the taper. In a crowded row they
    // are exactly on the edge that clips, so moving them would cut them.
    expect(shifts[0]).toBe(0);
    expect(shifts[4]).toBe(0);
  });

  it("spreads the whole row when it has the width to spare", () => {
    // The taper is a response to being clipped, so a row that is not crowded
    // parts all the way to its ends.
    const shifts = openAround({ count: 5, hovered: 2, overlap: 0 });
    expect(shifts[0]).toBeLessThan(0);
    expect(shifts[4]).toBeGreaterThan(0);
  });

  it("pushes hardest right beside the cursor and fades out from there", () => {
    const shifts = openAround({ count: 6, hovered: 0, overlap: 30 });
    for (let i = 2; i < shifts.length; i++) {
      expect(shifts[i]!).toBeLessThan(shifts[i - 1]!);
    }
  });

  it("gives the card next to the cursor the full push", () => {
    // The taper must not quietly shrink the one movement that matters - the
    // neighbour has to clear the hovered card, which is the entire point.
    const shifts = openAround({ count: 8, hovered: 3, overlap: 40 });
    expect(shifts[4]).toBeCloseTo(40 * 0.75, 8);
    expect(shifts[2]).toBeCloseTo(-40 * 0.75, 8);
  });

  it("does not move either end of the hand at all", () => {
    // The property that keeps this safe rather than a nicety. A crowded row is
    // exactly as wide as the space it has and clips at its edges, so a card at
    // the end that moved even a few pixels would have those pixels shaved off.
    // Before the taper, hovering the middle of a seven-card hand pushed the
    // last card 7.34px past the edge.
    for (const hovered of [0, 1, 3, 5, 7]) {
      const shifts = openAround({ count: 8, hovered, overlap: 40 });
      expect(shifts[0], `hovering ${hovered}`).toBe(0);
      expect(shifts[7], `hovering ${hovered}`).toBe(0);
    }
  });

  it("tapers each side against its own end", () => {
    // The hovered card is rarely in the middle. With two cards on the left and
    // five on the right, both sides still have to reach zero - at different
    // distances - or the short side lurches while the long side creeps.
    const shifts = openAround({ count: 8, hovered: 2, overlap: 40 });
    expect(shifts[0]).toBe(0);
    expect(shifts[7]).toBe(0);
    expect(Math.abs(shifts[1]!)).toBeGreaterThan(0);
    expect(Math.abs(shifts[3]!)).toBeGreaterThan(0);
  });

  it("is symmetric about the hovered card", () => {
    const shifts = openAround({ count: 7, hovered: 3, overlap: 30 });
    for (let d = 1; d <= 3; d++) {
      expect(shifts[3 + d]).toBeCloseTo(-shifts[3 - d]!, 8);
    }
  });

  it("opens further the more crowded the hand is", () => {
    const roomy = openAround({ count: 6, hovered: 3, overlap: 10 });
    const crowded = openAround({ count: 6, hovered: 3, overlap: 50 });
    expect(Math.abs(crowded[4]!)).toBeGreaterThan(Math.abs(roomy[4]!));
  });

  it("still parts a little when the cards are not overlapping at all", () => {
    const shifts = openAround({ count: 6, hovered: 3, overlap: 0 });
    expect(Math.abs(shifts[4]!)).toBe(OPEN_MIN_PX);
  });

  it("parts a two-card hand, which has no room to taper", () => {
    // The one case with nothing to taper against. Safe precisely because a
    // hand this short never overlaps, so the row has slack to grow into.
    expect(openAround({ count: 2, hovered: 0, overlap: 0 })[1]).toBe(OPEN_MIN_PX);
  });

  it("ignores a hovered index that is not in the row", () => {
    // Stale by one frame: a card left the hand between the pointer event and
    // the measurement. Indexing past the end must not throw or shift anything.
    expect(openAround({ count: 3, hovered: 9, overlap: 30 })).toEqual([0, 0, 0]);
    expect(openAround({ count: 0, hovered: 0, overlap: 30 })).toEqual([]);
  });

  it("returns one number per card", () => {
    expect(openAround({ count: 9, hovered: 4, overlap: 20 })).toHaveLength(9);
  });
});
