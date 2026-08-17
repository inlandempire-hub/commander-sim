import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";

describe("Death Begets Life", () => {
  it("destroys all creatures and enchantments and draws one per permanent destroyed", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    // Two creatures and an enchantment across both boards; a land stays.
    createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    createCardInstance(state, "glorious-anthem", alice.id, "battlefield");
    const land = createCardInstance(state, "forest", alice.id, "battlefield");

    alice.library = [];
    for (let i = 0; i < 5; i++) createCardInstance(state, "island", alice.id, "library");
    alice.hand = [];
    const spell = createCardInstance(state, "death-begets-life", alice.id, "hand");
    alice.manaPool = { B: 6, G: 1, U: 1 }; // {5}{B}{G}{U}, generic paid from the extra black
    state.priorityPlayerIndex = 0;

    castSpell(state, alice.id, spell.instanceId, []);
    resolveTopOfStack(state);
    checkStateBasedActions(state);

    // Three permanents destroyed (2 creatures + 1 enchantment); the land survives.
    const creaturesLeft = [...alice.battlefield, ...bob.battlefield].filter((c) => c.instanceId !== land.instanceId);
    expect(creaturesLeft.length).toBe(0);
    expect(alice.battlefield.some((c) => c.instanceId === land.instanceId)).toBe(true);
    // Drew 3.
    expect(alice.hand.length).toBe(3);
  });
});
