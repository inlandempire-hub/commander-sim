import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { destroyPermanent } from "../sba.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect } from "../effects.js";

/** Resolve the whole stack, answering nothing (single-target triggers auto-aim). */
function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 1", () => {
  it("Banishing Light: exiles an opponent's permanent on enter, returns it when destroyed", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const ring = createCardInstance(state, "banishing-light", alice.id, "hand");

    putOntoBattlefield(state, ring.instanceId);
    settle(state);
    expect(bob.battlefield.some((c) => c.definitionId === "grizzly-bears"), "exiled by Banishing Light").toBe(false);
    expect(bob.exile.some((c) => c.definitionId === "grizzly-bears")).toBe(true);

    // Destroy Banishing Light -> the creature comes back under Bob's control.
    destroyPermanent(state, alice.battlefield.find((c) => c.definitionId === "banishing-light")!.instanceId);
    settle(state);
    expect(bob.battlefield.some((c) => c.definitionId === "grizzly-bears"), "returned when the ring left").toBe(true);
  });

  it("Inspiring Overseer: gains 1 life and draws on enter", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "plains", alice.id, "library");
    const lifeBefore = alice.life;
    const handBefore = alice.hand.length;
    const overseer = createCardInstance(state, "inspiring-overseer", alice.id, "hand");
    putOntoBattlefield(state, overseer.instanceId);
    settle(state);
    expect(alice.life).toBe(lifeBefore + 1);
    expect(alice.hand.length).toBe(handBefore + 1);
  });

  it("Thraben Inspector: investigates, and the Clue draws when sacrificed", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "plains", alice.id, "library");
    const insp = createCardInstance(state, "thraben-inspector", alice.id, "hand");
    putOntoBattlefield(state, insp.instanceId);
    settle(state);
    const clue = alice.battlefield.find((c) => c.definitionId === "clue-token");
    expect(clue, "a Clue token was made").toBeDefined();
    const handBefore = alice.hand.length;
    // {2}, Sacrifice: draw.
    applyEffect(state, alice.id, clue!.instanceId, { kind: "draw", amount: 1 }, []);
    expect(alice.hand.length).toBe(handBefore + 1);
  });

  it("Fumigate: destroys all creatures and gains life per creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    createCardInstance(state, "silvercoat-lion", bob.id, "battlefield");
    createCardInstance(state, "runeclaw-bear", bob.id, "battlefield");
    const lifeBefore = alice.life;
    const fum = createCardInstance(state, "fumigate", alice.id, "hand");
    applyEffect(state, alice.id, fum.instanceId, { kind: "destroyAll", cardTypes: ["Creature"], thenGainLife: true }, []);
    expect(alice.battlefield.some((c) => c.definitionId === "grizzly-bears")).toBe(false);
    expect(bob.battlefield.filter((c) => c.definitionId !== undefined).length).toBe(0);
    expect(alice.life, "3 creatures destroyed -> +3 life").toBe(lifeBefore + 3);
  });

  it("Phelia: attacking flickers a permanent and grows when it was yours", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const phelia = createCardInstance(state, "phelia-exuberant-shepherd", alice.id, "battlefield");
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "library");

    // Fire Phelia's attack trigger directly against your own creature.
    applyEffect(
      state,
      alice.id,
      phelia.instanceId,
      { kind: "flicker", timing: "next-end-step", counterSourceIfYours: true, target: { kind: "permanent", nonland: true, excludeSource: true, count: { min: 0, max: 1 } } },
      [{ kind: "card", instanceId: hunter.instanceId }],
    );
    expect(alice.exile.some((c) => c.definitionId === "helpful-hunter"), "held in exile until end step").toBe(true);
  });
});
