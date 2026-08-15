import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { resolveArrange } from "../effects.js";

/**
 * Ponder and Halimar Depths: "look at the top N cards, then put them back in
 * any order". The look stops resolution and asks; `resolveArrange` puts the
 * cards back in the named order without their leaving the library, and any
 * follow-up (Ponder's draw) waits until then.
 */
describe("lookAndArrange (Ponder, Halimar Depths)", () => {
  function seedThreeOnTop(state: ReturnType<typeof makeTestGame>, playerId: string) {
    // Created in order, so a is on top (index 0), then b, then c.
    const a = createCardInstance(state, "grizzly-bears", playerId, "library");
    const b = createCardInstance(state, "llanowar-elves", playerId, "library");
    const c = createCardInstance(state, "elvish-mystic", playerId, "library");
    return { a, b, c };
  }

  it("stops for the arrangement, then reorders the top and draws the new top card", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.priorityPlayerIndex = 0;
    const alice = state.players[0]!;

    const { a, b, c } = seedThreeOnTop(state, alice.id);
    const ponder = createCardInstance(state, "ponder", alice.id, "hand");
    alice.manaPool = { U: 1 };

    castSpell(state, alice.id, ponder.instanceId, []);
    resolveTopOfStack(state);

    // The look has stopped the spell and is asking alice, before the draw.
    expect(state.pendingArrange?.playerId).toBe(alice.id);
    expect(state.pendingArrange?.cardInstanceIds).toEqual([
      a.instanceId,
      b.instanceId,
      c.instanceId,
    ]);
    expect(alice.hand.some((card) => card.instanceId === ponder.instanceId)).toBe(false);

    // Put them back reversed: c, b, a. The draw then takes c.
    resolveArrange(state, alice.id, [c.instanceId, b.instanceId, a.instanceId]);

    expect(state.pendingArrange).toBeNull();
    // c was on top after the reorder, so c is the card drawn.
    expect(alice.hand.some((card) => card.instanceId === c.instanceId)).toBe(true);
    // b is now on top of the library, a beneath it.
    expect(alice.library[0]!.instanceId).toBe(b.instanceId);
    expect(alice.library[1]!.instanceId).toBe(a.instanceId);
  });

  it("may shuffle instead, and still draws", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.priorityPlayerIndex = 0;
    const alice = state.players[0]!;

    seedThreeOnTop(state, alice.id);
    const ponder = createCardInstance(state, "ponder", alice.id, "hand");
    alice.manaPool = { U: 1 };
    const handBefore = alice.hand.length;

    castSpell(state, alice.id, ponder.instanceId, []);
    resolveTopOfStack(state);
    resolveArrange(state, alice.id, state.pendingArrange!.cardInstanceIds, true);

    expect(state.pendingArrange).toBeNull();
    // Ponder left hand (cast), one card drawn: net hand size is unchanged.
    expect(alice.hand.length).toBe(handBefore);
  });

  it("rejects an order that is not exactly the cards shown", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.priorityPlayerIndex = 0;
    const alice = state.players[0]!;

    const { a, b } = seedThreeOnTop(state, alice.id);
    const ponder = createCardInstance(state, "ponder", alice.id, "hand");
    alice.manaPool = { U: 1 };

    castSpell(state, alice.id, ponder.instanceId, []);
    resolveTopOfStack(state);

    // Two of the three, so not a permutation of what was shown.
    expect(() => resolveArrange(state, alice.id, [a.instanceId, b.instanceId])).toThrow();
    // And the wrong owner cannot answer it either.
    expect(() =>
      resolveArrange(state, state.players[1]!.id, state.pendingArrange!.cardInstanceIds),
    ).toThrow();
  });
});
