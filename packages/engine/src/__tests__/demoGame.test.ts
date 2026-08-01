import { describe, expect, it } from "vitest";
import { validateCommanderDeck } from "../commander.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { createDemoGame, DEADLY_DONNY, DONNY_DECK, MIKE_DECK, SALTY_MIKE } from "../demoGame.js";

describe("Demo decks", () => {
  it("Deadly Donny's mono-white deck is a legal 100-card Commander deck", () => {
    const result = validateCommanderDeck(DONNY_DECK, TEST_CARD_DEFINITIONS);
    expect(result.errors).toEqual([]);
    expect(result.legal).toBe(true);
  });

  it("Salty Mike's mono-green deck is a legal 100-card Commander deck", () => {
    const result = validateCommanderDeck(MIKE_DECK, TEST_CARD_DEFINITIONS);
    expect(result.errors).toEqual([]);
    expect(result.legal).toBe(true);
  });

  it("createDemoGame deals both players a full library and a 7-card opening hand", () => {
    const state = createDemoGame();
    const donny = state.players.find((p) => p.id === DEADLY_DONNY)!;
    const mike = state.players.find((p) => p.id === SALTY_MIKE)!;

    expect(donny.hand.length).toBe(7);
    expect(mike.hand.length).toBe(7);
    expect(donny.command.length).toBe(1);
    expect(mike.command.length).toBe(1);
    expect(donny.hand.length + donny.library.length + donny.command.length).toBe(100);
    expect(mike.hand.length + mike.library.length + mike.command.length).toBe(100);
  });
});
