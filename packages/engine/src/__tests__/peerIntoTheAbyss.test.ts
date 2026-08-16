import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";

describe("Peer into the Abyss", () => {
  it("the target draws half their library (round up) and loses half their life (round up)", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    // A known library of 7 and life of 40 on the target.
    bob.library = [];
    bob.hand = [];
    for (let i = 0; i < 7; i++) createCardInstance(state, "grizzly-bears", bob.id, "library");
    bob.life = 40;

    const peer = createCardInstance(state, "peer-into-the-abyss", alice.id, "hand");
    alice.manaPool = { B: 7 }; // {4}{B}{B}{B}
    state.priorityPlayerIndex = 0;

    castSpell(state, alice.id, peer.instanceId, [{ kind: "player", playerId: bob.id }]);
    resolveTopOfStack(state);

    // ceil(7 / 2) = 4 drawn, leaving 3 in the library.
    expect(bob.hand.length).toBe(4);
    expect(bob.library.length).toBe(3);
    // ceil(40 / 2) = 20 lost.
    expect(bob.life).toBe(20);
    // The caster is untouched.
    expect(alice.life).toBe(40);
  });
});
