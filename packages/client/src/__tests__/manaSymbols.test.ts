import { describe, expect, it } from "vitest";
import type { ManaCost } from "@mtg-commander-sim/engine";
import { MAX_GENERIC_ICON, manaSymbols } from "../manaSymbols.js";
import { formatManaCost } from "../format.js";

const cost = (generic: number, colors: ManaCost["colors"] = {}): ManaCost => ({ generic, colors });

describe("manaSymbols", () => {
  it("gives nothing for a card with no cost at all - most lands", () => {
    expect(manaSymbols(undefined)).toEqual([]);
  });

  it("puts generic first, then WUBRG, whatever order the colours were stored in", () => {
    const symbols = manaSymbols(cost(2, { G: 1, W: 1, B: 1 }));
    expect(symbols.map((s) => s.label)).toEqual(["2", "W", "B", "G"]);
  });

  it("repeats a pip once per point of that colour", () => {
    expect(manaSymbols(cost(0, { B: 3 })).map((s) => s.label)).toEqual(["B", "B", "B"]);
  });

  it("gives every pip a key of its own so React can tell repeats apart", () => {
    const keys = manaSymbols(cost(1, { R: 2 })).map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("drops a zero generic when there are coloured pips - nobody prints {0}{W}", () => {
    expect(manaSymbols(cost(0, { W: 1 })).map((s) => s.label)).toEqual(["W"]);
  });

  it("shows {0} on a card that genuinely costs nothing", () => {
    expect(manaSymbols(cost(0)).map((s) => s.label)).toEqual(["0"]);
  });

  it("has an icon for every generic amount up to the highest one on disk", () => {
    for (let n = 0; n <= MAX_GENERIC_ICON; n++) {
      expect(manaSymbols(cost(n))[0]?.src).toBe(`/mana/${n}.png`);
    }
  });

  it("falls back to no icon above that, rather than pointing at a file that isn't there", () => {
    // A cost this large is only reachable through commander tax, but a broken
    // image on the card is worse than the text, and a 404 per render is worse
    // than both.
    expect(manaSymbols(cost(MAX_GENERIC_ICON + 1))[0]?.src).toBeUndefined();
  });

  it("names its colour icons in lower case, which is what the files are called", () => {
    const byLabel = Object.fromEntries(
      manaSymbols(cost(0, { W: 1, U: 1, B: 1, R: 1, G: 1 })).map((s) => [s.label, s.src]),
    );
    expect(byLabel).toEqual({
      W: "/mana/w.png",
      U: "/mana/u.png",
      B: "/mana/b.png",
      R: "/mana/r.png",
      G: "/mana/g.png",
    });
  });

  it("draws the same number of pips as the braces text has braces", () => {
    // The pips and the text fallback are two renderings of one cost, and the
    // fallback is what people see if the icons are missing - they must not
    // disagree about what the card costs.
    for (const c of [cost(3, { B: 2 }), cost(0, { G: 1 }), cost(7), cost(0)]) {
      expect(manaSymbols(c)).toHaveLength((formatManaCost(c).match(/\{/g) ?? []).length);
    }
  });
});
