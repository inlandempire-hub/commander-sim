import { describe, expect, it } from "vitest";
import { TAP_STAGGER_MS, diffTapped, tapDelayMs } from "../tapOrder.js";

describe("diffTapped", () => {
  it("queues newly tapped permanents in the order given", () => {
    const { order } = diffTapped(new Set(), ["a", "b", "c"]);

    expect([...order.entries()]).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("ignores permanents that were already tapped", () => {
    const { order } = diffTapped(new Set(["a", "b"]), ["a", "b", "c"]);

    expect([...order.entries()]).toEqual([["c", 0]]);
  });

  it("numbers from zero even when the new ones come after old ones", () => {
    // The queue is a position among *the newly tapped*, not an index into the
    // battlefield - otherwise the first land to turn would wait for the ones
    // that were already down.
    const { order } = diffTapped(new Set(["a"]), ["a", "b", "c"]);

    expect(order.get("b")).toBe(0);
    expect(order.get("c")).toBe(1);
  });

  it("reports everything currently tapped as the next baseline", () => {
    const { tappedNow } = diffTapped(new Set(["a"]), ["a", "c"]);

    expect([...tappedNow].sort()).toEqual(["a", "c"]);
  });

  it("drops permanents that have untapped from the baseline", () => {
    // An untap step clears the board; nothing about "b" should survive it.
    const { order, tappedNow } = diffTapped(new Set(["a", "b"]), []);

    expect(order.size).toBe(0);
    expect(tappedNow.size).toBe(0);
  });

  it("treats a permanent that untapped and tapped again as newly tapped", () => {
    const afterUntap = diffTapped(new Set(["a"]), []);
    const afterRetap = diffTapped(afterUntap.tappedNow, ["a"]);

    expect(afterRetap.order.get("a")).toBe(0);
  });

  it("finds nothing new when nothing changed", () => {
    const { order } = diffTapped(new Set(["a", "b"]), ["a", "b"]);

    expect(order.size).toBe(0);
  });

  it("copes with an empty board", () => {
    expect(diffTapped(new Set(), []).order.size).toBe(0);
  });
});

describe("tapDelayMs", () => {
  it("gives the first one no delay at all", () => {
    expect(tapDelayMs(0)).toBe(0);
  });

  it("spaces the rest evenly", () => {
    expect(tapDelayMs(1)).toBe(TAP_STAGGER_MS);
    expect(tapDelayMs(3)).toBe(TAP_STAGGER_MS * 3);
  });

  it("gives a permanent that is not newly tapped no delay", () => {
    // Which matters: a card re-rendering for an unrelated reason must not sit
    // waiting before it draws.
    expect(tapDelayMs(undefined)).toBe(0);
  });
});
