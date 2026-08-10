import { describe, expect, it } from "vitest";
import { TEST_CARD_DEFINITIONS } from "@mtg-commander-sim/engine";
import { describeActivated, describeCard } from "../cardText.js";

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

/**
 * The trigger families added on 2026-08-10. Each expectation is the printed
 * card, near enough that a reader can hold the two side by side - which is the
 * only way this renderer is ever checked for being *right* rather than merely
 * non-empty.
 */
describe("triggers that are not about entering the battlefield", () => {
  it("names whose step a turn-based trigger watches", () => {
    // "Morbid - At the beginning of each end step, if a creature died this
    // turn, you may draw a card."
    expect(textOf("deathreap-ritual")).toContain(
      "At the beginning of each end step, if a creature died this turn, you may draw a card.",
    );
  });

  it("renders a death watcher with its counter filter", () => {
    // "Whenever a creature you control with a +1/+1 counter on it dies, draw a card."
    expect(textOf("meltstrider-eulogist")).toContain(
      "Whenever a creature you control with a +1/+1 counter on it dies, draw a card.",
    );
  });

  it("says 'you may' where the card does", () => {
    // Lifegift: "Whenever a land enters, you may gain 1 life." Not "you may
    // you gain 1 life" - the effect text already speaks about you.
    expect(textOf("lifegift")).toContain("you may gain 1 life.");
    expect(textOf("lifegift")).not.toContain("you may you");
  });

  it("distinguishes a landfall that watches every player from one that does not", () => {
    // Lifegift says "a land enters"; Eumidian Terrabotanist says "a land you
    // control enters", and the difference is whether an opponent's fetchland
    // pays you.
    expect(textOf("lifegift")).toContain("Whenever a land enters the battlefield,");
    expect(textOf("eumidian-terrabotanist")).toContain("under your control");
  });

  it("renders an attacks trigger whose effect is not a counter", () => {
    expect(textOf("shopkeepers-bane")).toContain("Whenever this creature attacks, you gain 2 life.");
  });

  it("writes 'draw a card', which is what cards actually print", () => {
    expect(textOf("tanglespan-lookout")).toContain("draw a card.");
    expect(textOf("tanglespan-lookout")).not.toContain("draw 1 card");
  });
});

/**
 * Sacrifice, and a defect it uncovered.
 *
 * Every fetchland's panel used to read "{T}: Search your library for a land
 * card, put it onto the battlefield, then shuffle" - no life, no sacrifice, no
 * restriction on what it finds. That is a free repeatable unrestricted tutor,
 * which is a strictly better card than the one being played. Nobody noticed
 * because nothing asserted the cost was there.
 */
describe("costs and searches, printed in full", () => {
  it("prints a fetchland's whole cost, not just the tap", () => {
    // "{T}, Pay 1 life, Sacrifice this land: Search your library for a Swamp or
    // Mountain card, put it onto the battlefield, then shuffle."
    const text = textOf("bloodstained-mire");
    expect(text).toContain("{T}, Pay 1 life, Sacrifice this land:");
    expect(text).toContain("a Swamp or Mountain card");
  });

  it("prints every fetchland's life payment and sacrifice", () => {
    // One assertion per card is how the first one got missed. This one catches
    // any fetch added later that quietly renders as free.
    for (const def of Object.values(TEST_CARD_DEFINITIONS)) {
      for (const ability of def.activatedAbilities ?? []) {
        if (!ability.cost.sacrificeSelf) continue;
        const line = describeActivated(ability, TEST_CARD_DEFINITIONS, def);
        expect(line, def.name).toContain("Sacrifice this ");
        if (ability.cost.payLife !== undefined) {
          expect(line, def.name).toContain(`Pay ${ability.cost.payLife} life`);
        }
      }
    }
  });

  it("names both card types and the noncreature restriction", () => {
    // Haywire Mite: "{G}, Sacrifice this creature: Exile target noncreature
    // artifact or noncreature enchantment."
    expect(textOf("haywire-mite")).toContain(
      "{G}, Sacrifice this creature: Exile target noncreature artifact or noncreature enchantment.",
    );
  });

  it("reads a sequenced trigger as one line of prose", () => {
    // Riveteers Overlook, and "this land" rather than "this permanent" - which
    // is a phrase no printed card uses.
    const text = textOf("riveteers-overlook");
    expect(text).toContain("When this land enters the battlefield, sacrifice it.");
    expect(text).toContain("a basic Swamp, Mountain, or Forest card");
    expect(text).toContain("You gain 1 life.");
  });
});

/**
 * Minted tokens.
 *
 * A token's colour and keywords are its whole identity - the pool now holds a
 * 1/1 green Insect and a 1/1 green Insect with flying and deathtouch, and
 * "1/1 Insect" describes both. The panel has to tell them apart.
 */
describe("tokens, as the card prints them", () => {
  it("names the count, colour, subtype and keywords", () => {
    // "When this creature enters, create four 1/1 green Insect creature tokens
    // with flying and deathtouch."
    expect(textOf("hornet-queen")).toContain(
      "create four 1/1 green Insect creature tokens with flying and deathtouch.",
    );
  });

  it("uses the article for one, not the digit", () => {
    // "create a 1/1 black Snake creature token with deathtouch" - no card
    // prints "create 1 Snake token".
    expect(textOf("ophiomancer")).toContain("create a 1/1 black Snake creature token with deathtouch.");
  });

  it("negates a board condition in the card's own words", () => {
    // "if you control no Snakes". Built from the condition's parts - editing
    // the positive sentence produced "if you control no a Snake".
    expect(textOf("ophiomancer")).toContain("if you control no Snakes,");
    expect(textOf("ophiomancer")).not.toContain("no a ");
  });

  it("describes every token in the pool distinctly", () => {
    // Two tokens rendering identically is the failure this guards: it would
    // mean the panel cannot tell you which one a card actually makes.
    const rendered = Object.values(TEST_CARD_DEFINITIONS)
      .filter((def) => def.isToken)
      .map((def) => `${def.power}/${def.toughness} ${(def.colorIdentity ?? []).join("")} ${def.name} ${(def.keywords ?? []).join(",")}`);
    expect(new Set(rendered).size).toBe(rendered.length);
  });
});

/**
 * The three cards added on 2026-08-10, and the wordings that could go wrong.
 */
describe("rituals, top-of-library tutors and a rider somebody else answers", () => {
  it("prints a ritual in mana symbols, as the card does", () => {
    // "Add {B}{B}{B}." - three separate pips, not "Add 3 black mana".
    expect(textOf("dark-ritual")).toContain("Add {B}{B}{B}.");
  });

  it("keeps the shuffle before the card goes on top", () => {
    // "Search your library for a creature card, then shuffle and put that card
    // on top." Printed the other way round it would describe a card that finds
    // something and then loses it again.
    const text = textOf("sylvan-tutor");
    expect(text).toContain("then shuffle and put that card on top");
    expect(text).not.toContain("on top, then shuffle");
  });

  it("names the opponent restriction, so the card does not read as unrestricted removal", () => {
    expect(textOf("assassins-trophy")).toContain("target permanent an opponent controls");
  });

  it("says whose library the rider searches", () => {
    // "Its controller may search their library" - printed as "your library"
    // this would read as though Assassin's Trophy ramped the caster.
    const text = textOf("assassins-trophy");
    expect(text).toContain("Its controller may search their library");
    expect(text).not.toContain("Search your library for a basic land");
  });
});

/**
 * Replacement effects read as replacements, not as things that happen after.
 */
describe("replacement effects", () => {
  it("keeps the 'if an effect would ... instead' shape", () => {
    const text = textOf("doubling-season");
    expect(text).toContain("If an effect would create one or more tokens under your control");
    expect(text).toContain("twice that many");
    expect(text).toContain("instead");
  });

  it("says which permanents a narrowed one covers", () => {
    // "an artifact or creature you control" - printed as "a permanent" this
    // would read as Doubling Season with a body attached.
    expect(textOf("winding-constrictor")).toContain("artifact or creature you control");
    expect(textOf("winding-constrictor")).toContain("that many plus 1");
  });

  it("does not print a narrowing Doubling Season never had", () => {
    expect(textOf("doubling-season")).toContain("a permanent you control");
  });
});
