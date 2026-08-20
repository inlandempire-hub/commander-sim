import { describe, expect, it } from "vitest";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { WINOTA_DECK } from "../winotaDeck.js";
import { validateCommanderDeck } from "../commander.js";
import { ARCHETYPES } from "../archetypes.js";

/**
 * The Winota list, as a deck rather than as a hundred separate fixtures.
 *
 * Every card in it was implemented because the list wanted it, over eleven
 * batches. This is the test that says so out loud: the deck is legal Commander,
 * every id in it is a card the engine really has, and nothing in it is a token
 * or a back face that cannot be put in a deck.
 */
describe("the Winota deck", () => {
  const all = [WINOTA_DECK.commanderId, ...WINOTA_DECK.libraryIds];

  it("is a hundred cards", () => {
    expect(all).toHaveLength(100);
  });

  it("names only cards the engine actually has", () => {
    const unknown = all.filter((id) => TEST_CARD_DEFINITIONS[id] === undefined);
    expect(unknown).toEqual([]);
  });

  it("is legal Commander", () => {
    const result = validateCommanderDeck(WINOTA_DECK, TEST_CARD_DEFINITIONS);
    // Printed in full on failure - "the deck is illegal" is not a useful message
    // when the answer is which card and why.
    expect(result.errors).toEqual([]);
    expect(result.legal).toBe(true);
  });

  it("holds no tokens and no back faces", () => {
    /*
     * Neither can be put in a deck, and both are in `TEST_CARD_DEFINITIONS`
     * alongside real cards - so "the id resolves" is not enough on its own. A
     * back face slipping in would be a deck that is legal on paper and cannot be
     * drawn.
     */
    const notCards = all.filter((id) => {
      const def = TEST_CARD_DEFINITIONS[id]!;
      return def.isToken === true || def.isBackFace === true;
    });
    expect(notCards).toEqual([]);
  });

  it("is offered as an archetype, so it can actually be played", () => {
    const winota = ARCHETYPES.find((a) => a.deck.commanderId === "winota-joiner-of-forces");
    expect(winota).toBeDefined();
    expect(winota!.plan).toContain("Winota");
  });
});
