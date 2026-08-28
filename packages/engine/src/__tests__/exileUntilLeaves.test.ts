import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { applyEffect } from "../effects.js";

/**
 * The Oblivion Ring capability: exile a permanent linked to a source, and return
 * it when the source leaves. Here the two handlers are exercised directly; the
 * full "destroy the enchantment and the creature comes back" loop is covered by
 * the Banishing Light fixture on the deck branch, which carries the
 * leaves-battlefield trigger that fires returnExiledByThis.
 */
describe("exile until this leaves the battlefield", () => {
  it("exiles the target and links it to the source", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const ring = createCardInstance(state, "howling-mine", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");

    applyEffect(state, alice.id, ring.instanceId, { kind: "exileUntilLeaves", target: { kind: "creature" } }, [
      { kind: "card", instanceId: bears.instanceId },
    ]);

    const exiled = bob.exile.find((c) => c.definitionId === "grizzly-bears");
    expect(exiled, "the creature is in its owner's exile").toBeDefined();
    expect(exiled!.exiledBy, "linked back to the source").toBe(ring.instanceId);
    expect(bob.battlefield.some((c) => c.definitionId === "grizzly-bears")).toBe(false);
  });

  it("returnExiledByThis brings back everything the source exiled, under owner control", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const ring = createCardInstance(state, "howling-mine", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");

    applyEffect(state, alice.id, ring.instanceId, { kind: "exileUntilLeaves", target: { kind: "creature" } }, [
      { kind: "card", instanceId: bears.instanceId },
    ]);
    expect(bob.exile.some((c) => c.definitionId === "grizzly-bears")).toBe(true);

    // Source leaves -> its trigger body runs.
    applyEffect(state, alice.id, ring.instanceId, { kind: "returnExiledByThis" }, []);

    expect(bob.battlefield.some((c) => c.definitionId === "grizzly-bears"), "returned under Bob's control").toBe(true);
    expect(bob.exile.some((c) => c.definitionId === "grizzly-bears")).toBe(false);
  });
});
