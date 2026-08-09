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

  it("calls a card by its own type, as the card does", () => {
    // Scryfall prints "This artifact enters tapped." on Charcoal Diamond, not
    // "This permanent" - the renderer used to flatten every nonland to
    // "permanent", which read as a house style rather than the card.
    expect(textOf("charcoal-diamond")).toContain("This artifact enters tapped.");
    expect(textOf("golgari-guildgate")).toContain("This land enters tapped.");
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

  it("says what a conditional tapland's condition is", () => {
    /*
     * "This land enters tapped." on its own is the wrong card. Deathcap Glade
     * is priced as a dual that comes in untapped from turn three onward, and a
     * panel that only shows the drawback understates it exactly as badly as
     * leaving the drawback off would overstate Golgari Guildgate.
     */
    expect(textOf("deathcap-glade")).toContain(
      "This land enters tapped unless you control 2 or more other lands.",
    );
    expect(textOf("woodland-cemetery")).toContain(
      "This land enters tapped unless you control a Swamp or a Forest.",
    );
    expect(textOf("undergrowth-stadium")).toContain(
      "This land enters tapped unless you have 2 or more opponents.",
    );
  });

  it("says a painland hurts, in the card's own words", () => {
    // The printed wording names the card's type: "This land deals 1 damage to
    // you" on Llanowar Wastes, "This creature" on Elves of Deep Shadow.
    expect(textOf("llanowar-wastes")).toContain("{T}: Add {B}. This land deals 1 damage to you.");
    expect(textOf("elves-of-deep-shadow")).toContain("This creature deals 1 damage to you.");
    // And says nothing of the sort about the colourless half, which is free.
    expect(textOf("llanowar-wastes")).toContain("{T}: Add {C}.");
  });

  it("says when a restricted ability may be used", () => {
    expect(textOf("tainted-wood")).toContain("Activate only if you control a Swamp.");
    expect(textOf("wastewood-verge")).toContain(
      "Activate only if you control a Swamp or a Forest.",
    );
    expect(textOf("sapseep-forest")).toContain(
      "Activate only if you control 2 or more green permanents.",
    );
  });

  it("renders a filter land's cost as one hybrid symbol", () => {
    const text = textOf("twilight-mire");
    expect(text).toContain("{B/G}, {T}: Add {B}{G}.");
    expect(text).toContain("{B/G}, {T}: Add {B}{B}.");
  });

  it("lists the types a regenerate ability may point at", () => {
    expect(textOf("swarmyard")).toContain(
      "Regenerate target Insect, Rat, Spider, or Squirrel.",
    );
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
