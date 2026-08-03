import { describe, expect, it } from "vitest";
import { LAND_SIZE_STEPS, SMALLEST_LAND_HEIGHT, landCardHeight } from "../landSize.js";

describe("landCardHeight", () => {
  it("gives a nearly empty board the biggest cards", () => {
    expect(landCardHeight(0)).toBe(LAND_SIZE_STEPS[0]!.height);
    expect(landCardHeight(1)).toBe(LAND_SIZE_STEPS[0]!.height);
    expect(landCardHeight(6)).toBe(LAND_SIZE_STEPS[0]!.height);
  });

  it("steps down as the board fills, and never back up", () => {
    let previous = Infinity;
    for (let count = 0; count <= 40; count++) {
      const height = landCardHeight(count);
      expect(height).toBeLessThanOrEqual(previous);
      previous = height;
    }
  });

  it("changes only at the milestones, and stays put in between", () => {
    // The point of stepping rather than sliding: playing a land should not
    // usually resize everything already on the table.
    expect(landCardHeight(7)).toBe(landCardHeight(10));
    expect(landCardHeight(11)).toBe(landCardHeight(16));
    expect(landCardHeight(6)).not.toBe(landCardHeight(7));
    expect(landCardHeight(10)).not.toBe(landCardHeight(11));
  });

  it("bottoms out rather than shrinking forever", () => {
    expect(landCardHeight(25)).toBe(SMALLEST_LAND_HEIGHT);
    expect(landCardHeight(500)).toBe(SMALLEST_LAND_HEIGHT);
  });

  it("stays a sensible size even at the floor", () => {
    // Below roughly this a card is a stripe with no readable name.
    expect(SMALLEST_LAND_HEIGHT).toBeGreaterThanOrEqual(40);
  });
});
