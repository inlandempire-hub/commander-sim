import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let g = 40; while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 22 (Roaming Throne)", () => {
  it("doubles the enter trigger of another creature of the chosen type", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const throne = createCardInstance(state, "roaming-throne", alice.id, "battlefield");
    throne.chosenOnEntry = { creatureType: "Cat" }; // Helpful Hunter is a Cat
    createCardInstance(state, "plains", alice.id, "library");
    createCardInstance(state, "plains", alice.id, "library");
    const handBefore = alice.hand.length;

    // Helpful Hunter (a Cat) draws on enter -> doubled to two.
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "hand");
    putOntoBattlefield(state, hunter.instanceId, { wasCast: true });
    settle(state);
    expect(alice.hand.length, "Cat's draw doubled").toBe(handBefore + 2);
  });

  it("does not double a creature of a different type", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const throne = createCardInstance(state, "roaming-throne", alice.id, "battlefield");
    throne.chosenOnEntry = { creatureType: "Elf" };
    createCardInstance(state, "plains", alice.id, "library");
    const handBefore = alice.hand.length;
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "hand"); // a Cat, not an Elf
    putOntoBattlefield(state, hunter.instanceId, { wasCast: true });
    settle(state);
    expect(alice.hand.length, "not doubled").toBe(handBefore + 1);
  });
});
