import { describe, expect, it } from "vitest";
import { TEST_CARD_DEFINITIONS, type CardDefinition } from "@mtg-commander-sim/engine";
import { describeCard, describeEffect, manaValue } from "../cardText.js";
import { buildPool, filterPool, EMPTY_FILTERS, withinIdentity } from "../cardPool.js";
import {
  addCard,
  canAdd,
  countOf,
  deckStatus,
  fillWithBasics,
  groupByType,
  manaCurve,
  removeCard,
  setCommander,
  setCount,
  swapCard,
  totalCards,
} from "../deckOps.js";
import {
  createDeck,
  duplicateDeck,
  loadDecks,
  memoryStore,
  parseTags,
  saveDecks,
  toDeckList,
  upsertDeck,
  deleteDeck,
} from "../deckStorage.js";
import { exportDeckText, importDeckText } from "../deckText.js";

const defs = TEST_CARD_DEFINITIONS;
const card = (id: string): CardDefinition => {
  const def = defs[id];
  if (!def) throw new Error(`test fixture ${id} is missing`);
  return def;
};

describe("card text", () => {
  it("renders a damage spell the way the card reads", () => {
    expect(describeCard(card("lightning-bolt"), defs)).toEqual(["Deal 3 damage to any target."]);
  });

  it("renders a counterspell with its unless-pays clause", () => {
    expect(describeCard(card("mana-leak"), defs)).toEqual([
      "Counter target spell unless its controller pays {3}.",
    ]);
  });

  it("renders land destruction with the right permanent type", () => {
    expect(describeCard(card("stone-rain"), defs)).toEqual(["Destroy target land."]);
  });

  it("calls out a spell that can't be countered", () => {
    const lines = describeCard(card("terra-stomper"), defs);
    expect(lines).toContain("This spell can't be countered.");
    expect(lines).toContain("Trample");
  });

  it("renders an anthem's static buff", () => {
    expect(describeCard(card("glorious-anthem"), defs)).toEqual([
      "Other creatures you control get +1/+1.",
    ]);
  });

  it("signs a negative pump rather than printing +-2", () => {
    expect(describeEffect({ kind: "pump", power: -2, toughness: -2, target: { kind: "creature" } })).toBe(
      "Target creature gets -2/-2 until end of turn.",
    );
  });

  it("reads a mana value straight off the cost", () => {
    expect(manaValue(card("craw-wurm"))).toBe(6); // {4}{G}{G}
    expect(manaValue(card("forest"))).toBe(0);
  });
});

describe("card pool search", () => {
  const pool = buildPool(defs);

  it("excludes tokens, which are created rather than drafted", () => {
    expect(pool.some((c) => c.def.isToken)).toBe(false);
  });

  it("matches search words in any order, across name and rules text", () => {
    const byName = filterPool(pool, { ...EMPTY_FILTERS, text: "bolt lightning" });
    expect(byName.map((c) => c.def.id)).toContain("lightning-bolt");

    const byRules = filterPool(pool, { ...EMPTY_FILTERS, text: "counter target spell" });
    expect(byRules.map((c) => c.def.id)).toContain("counterspell");
  });

  it("hides basic lands by default and shows them on request", () => {
    expect(filterPool(pool, EMPTY_FILTERS).some((c) => c.def.id === "forest")).toBe(false);
    expect(
      filterPool(pool, { ...EMPTY_FILTERS, hideBasicLands: false }).some((c) => c.def.id === "forest"),
    ).toBe(true);
  });

  it("filters to a commander's colour identity", () => {
    const mono = filterPool(pool, { ...EMPTY_FILTERS, identity: ["G"] });
    expect(mono.every((c) => withinIdentity(c.def, ["G"]))).toBe(true);
    expect(mono.some((c) => c.def.id === "lightning-bolt")).toBe(false);
    expect(mono.some((c) => c.def.id === "craw-wurm")).toBe(true);
  });

  it("caps by mana value, treating the top bucket as no cap at all", () => {
    const cheap = filterPool(pool, { ...EMPTY_FILTERS, manaValueMax: 1 });
    expect(cheap.every((c) => c.manaValue <= 1)).toBe(true);
    expect(filterPool(pool, { ...EMPTY_FILTERS, manaValueMax: 7 }).length).toBe(
      filterPool(pool, EMPTY_FILTERS).length,
    );
  });

  it("finds only legal commanders when asked", () => {
    const commanders = filterPool(pool, { ...EMPTY_FILTERS, commandersOnly: true });
    expect(commanders.length).toBeGreaterThan(0);
    expect(commanders.every((c) => c.def.canBeCommander)).toBe(true);
  });

  it("sorts by mana value with name as the tiebreak", () => {
    const sorted = filterPool(pool, { ...EMPTY_FILTERS, sort: "mana-value" });
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.manaValue).toBeGreaterThanOrEqual(sorted[i - 1]!.manaValue);
    }
  });
});

describe("deck editing", () => {
  it("enforces singleton on everything but basic lands", () => {
    let deck = createDeck("test");
    deck = addCard(deck, card("lightning-bolt"));
    deck = addCard(deck, card("lightning-bolt"));
    expect(countOf(deck, "lightning-bolt")).toBe(1);
    expect(canAdd(deck, card("lightning-bolt"))).toBe(false);

    deck = addCard(addCard(deck, card("mountain")), card("mountain"));
    expect(countOf(deck, "mountain")).toBe(2);
  });

  it("removes one copy at a time", () => {
    let deck = setCount(createDeck("test"), card("forest"), 3);
    deck = removeCard(deck, "forest");
    expect(countOf(deck, "forest")).toBe(2);
  });

  it("swaps one card out and another in as a single step", () => {
    let deck = addCard(createDeck("test"), card("shock"));
    deck = swapCard(deck, "shock", card("lightning-bolt"));
    expect(countOf(deck, "shock")).toBe(0);
    expect(countOf(deck, "lightning-bolt")).toBe(1);
  });

  it("takes the commander out of the library and puts the old one back", () => {
    let deck = addCard(createDeck("test"), card("rorix-bladewing"));
    deck = setCommander(deck, card("rorix-bladewing"), defs);
    expect(deck.commanderId).toBe("rorix-bladewing");
    expect(countOf(deck, "rorix-bladewing")).toBe(0); // it's in the command zone now

    deck = setCommander(deck, card("tifa-lockhart"), defs);
    expect(deck.commanderId).toBe("tifa-lockhart");
    expect(countOf(deck, "rorix-bladewing")).toBe(1); // demoted back into the 99
  });

  it("fills to exactly 100 with basics, commander included in the count", () => {
    let deck = setCommander(createDeck("test"), card("rorix-bladewing"), defs);
    deck = addCard(deck, card("lightning-bolt"));
    deck = fillWithBasics(deck, "mountain");
    expect(totalCards(deck)).toBe(100);
    expect(countOf(deck, "mountain")).toBe(98);
  });

  it("trims basics back down when the deck is over 100", () => {
    let deck = setCommander(createDeck("test"), card("rorix-bladewing"), defs);
    deck = setCount(deck, card("mountain"), 120);
    deck = fillWithBasics(deck, "mountain");
    expect(totalCards(deck)).toBe(100);
  });

  it("groups a decklist by type and counts physical cards", () => {
    let deck = createDeck("test");
    deck = addCard(deck, card("grizzly-bears"));
    deck = addCard(deck, card("giant-growth"));
    deck = setCount(deck, card("forest"), 5);

    const sections = groupByType(deck, defs);
    expect(sections.map((s) => s.type)).toEqual(["Creature", "Instant", "Land"]);
    expect(sections.find((s) => s.type === "Land")!.count).toBe(5);
  });

  it("builds a mana curve from nonlands only", () => {
    let deck = createDeck("test");
    deck = addCard(deck, card("grizzly-bears")); // {1}{G}
    deck = addCard(deck, card("craw-wurm")); // {4}{G}{G}
    deck = setCount(deck, card("forest"), 10);

    const curve = manaCurve(deck, defs);
    expect(curve[2]).toBe(1);
    expect(curve[6]).toBe(1);
    expect(curve[0]).toBe(0); // the forests are excluded, not bucketed at zero
  });
});

describe("deck status", () => {
  function legalMonoRedDeck() {
    let deck = setCommander(createDeck("Warband"), card("rorix-bladewing"), defs);
    deck = addCard(deck, card("lightning-bolt"));
    return fillWithBasics(deck, "mountain");
  }

  it("reports a finished legal deck as playable", () => {
    const status = deckStatus(legalMonoRedDeck(), defs);
    expect(status.total).toBe(100);
    expect(status.errors).toEqual([]);
    expect(status.playable).toBe(true);
    expect(status.lands).toBe(98);
  });

  it("asks for a commander before anything else", () => {
    const status = deckStatus(createDeck("empty"), defs);
    expect(status.playable).toBe(false);
    expect(status.errors).toEqual(["Choose a commander."]);
  });

  it("flags cards outside the commander's colour identity", () => {
    const deck = addCard(legalMonoRedDeck(), card("giant-growth")); // green, in a red deck
    const status = deckStatus(deck, defs);
    expect(status.offIdentityIds).toContain("giant-growth");
    expect(status.playable).toBe(false);
  });

  it("counts an unfinished deck as not playable", () => {
    let deck = setCommander(createDeck("wip"), card("rorix-bladewing"), defs);
    deck = addCard(deck, card("lightning-bolt"));
    const status = deckStatus(deck, defs);
    expect(status.remaining).toBe(98);
    expect(status.playable).toBe(false);
  });
});

describe("deck storage", () => {
  it("round-trips decks through the store", () => {
    const store = memoryStore();
    const deck = addCard(createDeck("Warband"), card("lightning-bolt"));
    saveDecks(store, [deck]);
    expect(loadDecks(store)).toEqual([deck]);
  });

  it("returns nothing rather than throwing on corrupt storage", () => {
    expect(loadDecks(memoryStore({ "mtg-commander-sim.decks.v1": "{not json" }))).toEqual([]);
    expect(loadDecks(memoryStore({ "mtg-commander-sim.decks.v1": '[{"nope":1}]' }))).toEqual([]);
  });

  it("gives a duplicate its own id, so editing the copy leaves the original alone", () => {
    const original = addCard(createDeck("Warband"), card("lightning-bolt"));
    const copy = addCard(duplicateDeck(original), card("shock"));
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Warband (copy)");
    expect(countOf(original, "shock")).toBe(0);
  });

  it("replaces on upsert and removes on delete", () => {
    const deck = createDeck("Warband");
    let decks = upsertDeck([], deck);
    decks = upsertDeck(decks, { ...deck, name: "Renamed" });
    expect(decks).toHaveLength(1);
    expect(decks[0]!.name).toBe("Renamed");
    expect(deleteDeck(decks, deck.id)).toEqual([]);
  });

  it("refuses to hand the engine a deck with no commander", () => {
    expect(toDeckList(createDeck("Warband"))).toBeUndefined();
    const withCommander = setCommander(createDeck("Warband"), card("rorix-bladewing"), defs);
    expect(toDeckList(withCommander)).toEqual({ commanderId: "rorix-bladewing", libraryIds: [] });
  });

  it("cleans up a comma-separated tag field", () => {
    expect(parseTags(" aggro , testing,, aggro ")).toEqual(["aggro", "testing"]);
  });
});

describe("deck text import and export", () => {
  it("round-trips a deck through its own text format", () => {
    let deck = setCommander(createDeck("Warband"), card("rorix-bladewing"), defs);
    deck = addCard(deck, card("lightning-bolt"));
    deck = setCount(deck, card("mountain"), 37);

    const { deck: reimported, unknownNames } = importDeckText(exportDeckText(deck, defs), defs);
    expect(unknownNames).toEqual([]);
    expect(reimported.commanderId).toBe("rorix-bladewing");
    expect(countOf(reimported, "mountain")).toBe(37);
    expect(countOf(reimported, "lightning-bolt")).toBe(1);
  });

  it("names the cards this engine has not implemented instead of dropping them quietly", () => {
    const { deck, unknownNames } = importDeckText("1 Lightning Bolt\n1 Black Lotus", defs);
    expect(unknownNames).toEqual(["Black Lotus"]);
    expect(countOf(deck, "lightning-bolt")).toBe(1);
  });

  it("cuts extra copies down to one and says so", () => {
    const { deck, overCopies } = importDeckText("4 Lightning Bolt", defs);
    expect(countOf(deck, "lightning-bolt")).toBe(1);
    expect(overCopies).toEqual(["Lightning Bolt"]);
  });

  it("ignores set codes, collector numbers and comments", () => {
    const { deck, unknownNames } = importDeckText(
      "// my list\n1 Lightning Bolt (M21) 149\n2x Mountain\n",
      defs,
    );
    expect(unknownNames).toEqual([]);
    expect(countOf(deck, "lightning-bolt")).toBe(1);
    expect(countOf(deck, "mountain")).toBe(2);
  });

  it("promotes a legal commander out of a headerless list", () => {
    const { deck } = importDeckText("1 Rorix Bladewing\n1 Lightning Bolt", defs);
    expect(deck.commanderId).toBe("rorix-bladewing");
    expect(countOf(deck, "rorix-bladewing")).toBe(0);
  });

  it("imports a real archetype list end to end and the engine accepts it", () => {
    let source = setCommander(createDeck("Warband"), card("rorix-bladewing"), defs);
    source = addCard(source, card("lightning-bolt"));
    source = fillWithBasics(source, "mountain");

    const { deck } = importDeckText(exportDeckText(source, defs), defs);
    expect(deckStatus(deck, defs).playable).toBe(true);
  });
});
