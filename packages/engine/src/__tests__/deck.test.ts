import { describe, expect, it } from "vitest";
import { validateCommanderDeck } from "../commander.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";

function repeat(id: string, n: number): string[] {
  return Array.from({ length: n }, () => id);
}

describe("Commander deck validation", () => {
  it("accepts a legal 100-card singleton Gruul deck", () => {
    const libraryIds = [
      "grizzly-bears",
      "lightning-bolt",
      "llanowar-elves",
      "elvish-visionary",
      ...repeat("mountain", 48),
      ...repeat("forest", 47),
    ];
    expect(libraryIds.length).toBe(99);

    const result = validateCommanderDeck({ commanderId: "jerrard-of-the-closed-fist", libraryIds }, TEST_CARD_DEFINITIONS);
    expect(result.errors).toEqual([]);
    expect(result.legal).toBe(true);
  });

  it("rejects a duplicate nonbasic card (singleton rule)", () => {
    const libraryIds = ["lightning-bolt", "lightning-bolt", ...repeat("mountain", 97)];
    const result = validateCommanderDeck({ commanderId: "jerrard-of-the-closed-fist", libraryIds }, TEST_CARD_DEFINITIONS);
    expect(result.legal).toBe(false);
    expect(result.errors.some((e) => e.includes("Lightning Bolt"))).toBe(true);
  });

  it("allows multiple copies of a basic land", () => {
    const libraryIds = repeat("mountain", 99);
    const result = validateCommanderDeck({ commanderId: "jerrard-of-the-closed-fist", libraryIds }, TEST_CARD_DEFINITIONS);
    expect(result.errors.some((e) => e.includes("Mountain"))).toBe(false);
  });

  it("rejects a card outside the commander's color identity", () => {
    const libraryIds = ["healing-salve", ...repeat("mountain", 98)];
    const result = validateCommanderDeck({ commanderId: "jerrard-of-the-closed-fist", libraryIds }, TEST_CARD_DEFINITIONS);
    expect(result.legal).toBe(false);
    expect(result.errors.some((e) => e.includes("Healing Salve"))).toBe(true);
  });

  it("rejects a deck that isn't exactly 100 cards", () => {
    const result = validateCommanderDeck(
      { commanderId: "jerrard-of-the-closed-fist", libraryIds: repeat("mountain", 50) },
      TEST_CARD_DEFINITIONS,
    );
    expect(result.legal).toBe(false);
    expect(result.errors.some((e) => e.includes("100"))).toBe(true);
  });

  it("rejects a commander that isn't commander-legal", () => {
    const result = validateCommanderDeck(
      { commanderId: "grizzly-bears", libraryIds: repeat("mountain", 99) },
      TEST_CARD_DEFINITIONS,
    );
    expect(result.legal).toBe(false);
    expect(result.errors.some((e) => e.includes("cannot be a commander"))).toBe(true);
  });
});
