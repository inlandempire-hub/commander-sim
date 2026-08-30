import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { activateAbility } from "../abilities.js";
import { resolveTopOfStack } from "../stack.js";
import { damagePlayer } from "../damage.js";

function resolveStack(state: ReturnType<typeof makeTestGame>): void {
  let g = 20; while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 19 (The One Ring)", () => {
  it("{T}: adds a burden counter and draws that many; protection prevents damage", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main";
    for (let i = 0; i < 10; i++) createCardInstance(state, "plains", alice.id, "library");
    const ring = createCardInstance(state, "the-one-ring", alice.id, "battlefield");
    ring.summoningSickness = false;

    // First activation: 1 burden counter, draw 1.
    let hand = alice.hand.length;
    activateAbility(state, alice.id, ring.instanceId, 0);
    resolveStack(state);
    expect(ring.otherCounters).toBe(1);
    expect(alice.hand.length).toBe(hand + 1);

    // Second activation: 2 counters, draw 2.
    ring.tapped = false;
    hand = alice.hand.length;
    activateAbility(state, alice.id, ring.instanceId, 0);
    resolveStack(state);
    expect(ring.otherCounters).toBe(2);
    expect(alice.hand.length).toBe(hand + 2);

    // Protection: with the flag set, damage to Alice is prevented.
    alice.protectionFromEverything = true;
    const before = alice.life;
    damagePlayer(state, alice, 5);
    expect(alice.life, "all damage prevented").toBe(before);
  });
});
