import { describe, expect, it } from "vitest";
import { TEST_CARD_DEFINITIONS, type CardDefinition } from "@mtg-commander-sim/engine";
import { artIdFor, cardArtUrl, scryfallImageUrl } from "../cardArt.js";
import { toPrintings } from "../deckbuilder/printings.js";
import { artChoiceCount, pruneCardArt, setCardArt } from "../deckbuilder/deckOps.js";
import { createDeck, type SavedDeck } from "../deckbuilder/deckStorage.js";

// A real Scryfall id, from Lightning Bolt's representative printing.
const BOLT_ID = "7673784e-db4b-43a1-8d55-1bb9fc1e284f";
const ALT_ID = "4457ed35-7c10-48c8-9776-456485fdf070";

describe("scryfallImageUrl", () => {
  it("builds a CDN url from the id's first two characters", () => {
    expect(scryfallImageUrl(BOLT_ID, "art_crop")).toBe(
      `https://cards.scryfall.io/art_crop/front/7/6/${BOLT_ID}.jpg`,
    );
  });

  it("uses the requested size", () => {
    expect(scryfallImageUrl(BOLT_ID, "normal")).toContain("/normal/");
    expect(scryfallImageUrl(BOLT_ID, "small")).toContain("/small/");
  });

  // A malformed id would build a URL that 404s, and a broken image is worse
  // than no image - the card falls back to its text box instead.
  it("refuses anything that is not a uuid", () => {
    expect(scryfallImageUrl("lightning-bolt", "normal")).toBeUndefined();
    expect(scryfallImageUrl("", "normal")).toBeUndefined();
    expect(scryfallImageUrl(BOLT_ID.toUpperCase(), "normal")).toBeUndefined();
  });
});

describe("card art selection", () => {
  const bolt = TEST_CARD_DEFINITIONS["lightning-bolt"]!;

  it("every non-token fixture carries a Scryfall id", () => {
    const missing = Object.values(TEST_CARD_DEFINITIONS).filter(
      (def: CardDefinition) => !def.isToken && !def.scryfallId,
    );
    expect(missing.map((d) => d.name)).toEqual([]);
  });

  it("falls back to the card's default printing with no overrides", () => {
    expect(artIdFor(bolt)).toBe(bolt.scryfallId);
    expect(artIdFor(bolt, {})).toBe(bolt.scryfallId);
  });

  it("prefers a deck's chosen printing", () => {
    expect(artIdFor(bolt, { "lightning-bolt": ALT_ID })).toBe(ALT_ID);
    expect(cardArtUrl(bolt, "art_crop", { "lightning-bolt": ALT_ID })).toContain(ALT_ID);
  });

  it("an override for a different card is ignored", () => {
    expect(artIdFor(bolt, { mountain: ALT_ID })).toBe(bolt.scryfallId);
  });

  // Tokens are made by the game, not printed, so they have no card row and
  // no artwork to fetch.
  it("has no url for a token", () => {
    const token = Object.values(TEST_CARD_DEFINITIONS).find((d: CardDefinition) => d.isToken)!;
    expect(cardArtUrl(token, "art_crop")).toBeUndefined();
  });
});

describe("setCardArt", () => {
  it("records a choice", () => {
    const deck = setCardArt(createDeck("Deadly Donny's deck"), "lightning-bolt", ALT_ID);
    expect(deck.artOverrides).toEqual({ "lightning-bolt": ALT_ID });
    expect(artChoiceCount(deck)).toBe(1);
  });

  // A deck that never opened the art picker should store nothing at all, so
  // that clearing the last choice leaves no residue behind either.
  it("drops the field entirely once the last choice is cleared", () => {
    const chosen = setCardArt(createDeck("Salty Mike's deck"), "lightning-bolt", ALT_ID);
    const cleared = setCardArt(chosen, "lightning-bolt", null);
    expect("artOverrides" in cleared).toBe(false);
    expect(artChoiceCount(cleared)).toBe(0);
  });

  it("leaves other cards' choices alone", () => {
    let deck = setCardArt(createDeck("Mixed"), "lightning-bolt", ALT_ID);
    deck = setCardArt(deck, "mountain", BOLT_ID);
    deck = setCardArt(deck, "lightning-bolt", null);
    expect(deck.artOverrides).toEqual({ mountain: BOLT_ID });
  });

  it("does not touch the deck's contents", () => {
    const base: SavedDeck = {
      ...createDeck("Untouched"),
      libraryIds: ["mountain", "mountain"],
      commanderId: "rorix-bladewing",
    };
    const after = setCardArt(base, "mountain", ALT_ID);
    expect(after.libraryIds).toEqual(base.libraryIds);
    expect(after.commanderId).toBe(base.commanderId);
  });
});

describe("pruneCardArt", () => {
  it("forgets choices for cards no longer in the deck", () => {
    let deck: SavedDeck = {
      ...createDeck("Trimmed"),
      libraryIds: ["mountain"],
      commanderId: "rorix-bladewing",
    };
    deck = setCardArt(deck, "mountain", ALT_ID);
    deck = setCardArt(deck, "lightning-bolt", BOLT_ID);
    expect(pruneCardArt(deck).artOverrides).toEqual({ mountain: ALT_ID });
  });

  it("keeps the commander's own choice", () => {
    let deck: SavedDeck = { ...createDeck("Cmd"), libraryIds: [], commanderId: "rorix-bladewing" };
    deck = setCardArt(deck, "rorix-bladewing", ALT_ID);
    expect(pruneCardArt(deck).artOverrides).toEqual({ "rorix-bladewing": ALT_ID });
  });

  it("returns the same deck when nothing needs pruning", () => {
    const deck = createDeck("Clean");
    expect(pruneCardArt(deck)).toBe(deck);
  });
});

describe("toPrintings", () => {
  const rows = [
    {
      id: BOLT_ID,
      set: "lea",
      set_name: "Limited Edition Alpha",
      collector_number: "161",
      artist: "Christopher Rush",
      released_at: "1993-08-05",
      image_status: "highres_scan",
    },
    { id: ALT_ID, set: "m10", image_status: "missing" },
  ];

  it("keeps printings with artwork and drops the ones without", () => {
    const printings = toPrintings(rows);
    expect(printings).toHaveLength(1);
    expect(printings[0]).toEqual({
      scryfallId: BOLT_ID,
      setCode: "LEA",
      setName: "Limited Edition Alpha",
      collectorNumber: "161",
      artist: "Christopher Rush",
      releasedAt: "1993-08-05",
    });
  });

  it("survives a row with only an id and a set", () => {
    expect(toPrintings([{ id: BOLT_ID, set: "lea" }])[0]).toMatchObject({
      setCode: "LEA",
      setName: "LEA",
      artist: "",
    });
  });
});
