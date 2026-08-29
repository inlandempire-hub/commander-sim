import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { activateAbility } from "../abilities.js";
import { resolveTopOfStack } from "../stack.js";

describe("Supremacy batch 10 (Library of Alexandria)", () => {
  it("draws only with exactly seven cards in hand", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main";
    state.step = "main";
    const lib = createCardInstance(state, "library-of-alexandria", alice.id, "battlefield");
    for (let i = 0; i < 10; i++) createCardInstance(state, "plains", alice.id, "library");

    // Six in hand -> the draw ability is illegal.
    for (let i = 0; i < 6; i++) createCardInstance(state, "plains", alice.id, "hand");
    expect(() => activateAbility(state, alice.id, lib.instanceId, 1)).toThrow();

    // Bring the hand to exactly seven -> now it works.
    createCardInstance(state, "plains", alice.id, "hand");
    lib.tapped = false;
    const handBefore = alice.hand.length; // 7
    activateAbility(state, alice.id, lib.instanceId, 1);
    let guard = 10;
    while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
    expect(alice.hand.length).toBe(handBefore + 1);
  });
});
