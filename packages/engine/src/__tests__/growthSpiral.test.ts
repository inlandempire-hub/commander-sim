import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { resolveCardChoice } from "../effects.js";

describe("Growth Spiral", () => {
  it("draws a card and may put a land from hand onto the battlefield", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;

    alice.hand = [];
    alice.library = [];
    const forest = createCardInstance(state, "forest", alice.id, "hand");
    createCardInstance(state, "grizzly-bears", alice.id, "library"); // the card drawn
    const spiral = createCardInstance(state, "growth-spiral", alice.id, "hand");
    alice.manaPool = { G: 1, U: 1 };
    state.priorityPlayerIndex = 0;

    castSpell(state, alice.id, spiral.instanceId, []);
    resolveTopOfStack(state);

    // Drew the creature, and is now offered the land in hand.
    expect(alice.hand.some((c) => c.instanceId !== forest.instanceId)).toBe(true);
    expect(state.pendingCardChoices.length).toBe(1);

    resolveCardChoice(state, alice.id, [forest.instanceId]);
    expect(alice.battlefield.some((c) => c.instanceId === forest.instanceId)).toBe(true);
  });
});
