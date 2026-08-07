import { describe, expect, it } from "vitest";
import { TEST_CARD_DEFINITIONS } from "@mtg-commander-sim/engine";
import { describeCard } from "../cardText.js";

/**
 * The card panel is the only place a player reads what a card does - there is
 * no printed card to check against. So anything a fixture carries that the
 * renderer does not know about is a card that silently reads better, or worse,
 * than it is.
 */

function textOf(id: string): string {
  const def = TEST_CARD_DEFINITIONS[id];
  if (!def) throw new Error(`no fixture ${id}`);
  return describeCard(def, TEST_CARD_DEFINITIONS).join("\n");
}

describe("lands and mana rocks", () => {
  it("says a tapland enters tapped", () => {
    // Left out, Golgari Guildgate reads as a free dual land. The drawback is
    // the entire cost of the card.
    expect(textOf("golgari-guildgate")).toContain("This land enters tapped.");
  });

  it("puts the drawback before the abilities, as the card prints it", () => {
    const lines = describeCard(TEST_CARD_DEFINITIONS["golgari-guildgate"]!, TEST_CARD_DEFINITIONS);
    expect(lines[0]).toBe("This land enters tapped.");
  });

  it("says nothing of the sort about a land that does not", () => {
    expect(textOf("bayou")).not.toContain("enters tapped");
  });

  it("calls a nonland permanent a permanent", () => {
    expect(textOf("charcoal-diamond")).toContain("This permanent enters tapped.");
  });

  it("renders colourless mana", () => {
    expect(textOf("sol-ring")).toContain("Add {C}{C}.");
  });

  it("renders a dual land as both halves", () => {
    const text = textOf("bayou");
    expect(text).toContain("Add {B}.");
    expect(text).toContain("Add {G}.");
  });

  it("renders a land's enters-the-battlefield trigger", () => {
    expect(textOf("radiant-fountain")).toContain("2 life");
  });

  it("describes every land in the pool rather than leaving one blank", () => {
    // A card whose panel is empty looks broken, and is how a fixture carrying
    // something the renderer has never heard of shows up.
    for (const def of Object.values(TEST_CARD_DEFINITIONS)) {
      if (!def.types.includes("Land")) continue;
      expect(describeCard(def, TEST_CARD_DEFINITIONS).length, def.name).toBeGreaterThan(0);
    }
  });
});
