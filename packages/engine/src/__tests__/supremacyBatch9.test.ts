import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 9 (Elesh Norn)", () => {
  it("doubles your own ETB triggers", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "elesh-norn-mother-of-machines", alice.id, "battlefield");
    for (let i = 0; i < 4; i++) createCardInstance(state, "plains", alice.id, "library");
    const handBefore = alice.hand.length;

    // Helpful Hunter's "draw a card" ETB fires twice.
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "hand");
    putOntoBattlefield(state, hunter.instanceId, { wasCast: true });
    settle(state);
    expect(alice.hand.length, "drew twice").toBe(handBefore + 2);
  });

  it("suppresses an opponent's ETB triggers", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "elesh-norn-mother-of-machines", alice.id, "battlefield");
    for (let i = 0; i < 4; i++) createCardInstance(state, "plains", bob.id, "library");
    const bobHandBefore = bob.hand.length;

    const bobHunter = createCardInstance(state, "helpful-hunter", bob.id, "hand");
    putOntoBattlefield(state, bobHunter.instanceId, { wasCast: true });
    settle(state);
    expect(bob.hand.length, "opponent's ETB draw suppressed").toBe(bobHandBefore);
  });

  it("doubles a permanent-enters watcher (Impassioned Orator)", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "elesh-norn-mother-of-machines", alice.id, "battlefield");
    createCardInstance(state, "impassioned-orator", alice.id, "battlefield"); // gain 1 when another creature enters
    const lifeBefore = alice.life;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    putOntoBattlefield(state, bears.instanceId, { wasCast: true });
    settle(state);
    expect(alice.life, "Orator's gain-1 fired twice").toBe(lifeBefore + 2);
  });
});
