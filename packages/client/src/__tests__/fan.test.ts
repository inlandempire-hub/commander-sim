import { describe, expect, it } from "vitest";
import { MIN_VISIBLE_PX, overlapFor } from "../fan.js";

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
