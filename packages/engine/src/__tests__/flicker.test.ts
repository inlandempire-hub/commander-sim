import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { applyEffect } from "../effects.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";

/**
 * The flicker capability: exile a permanent and return it, either at once or at
 * the next end step, as a new object under its owner's control with its enter
 * triggers re-firing. Phelia's rider puts a +1/+1 counter on the source when the
 * returned card comes back under the flickerer's control.
 */
describe("flicker", () => {
  it("immediate: exiles and returns at once, re-firing enter triggers and clearing counters", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const source = createCardInstance(state, "mother-of-runes", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "library"); // something to draw
    // Helpful Hunter draws on enter; give it a counter that a blink should wipe.
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "battlefield");
    hunter.plusOneCounters = 3;
    const handBefore = alice.hand.length;

    applyEffect(state, alice.id, source.instanceId, { kind: "flicker", target: { kind: "creature" }, timing: "immediate" }, [
      { kind: "card", instanceId: hunter.instanceId },
    ]);
    // Its enter trigger is on the stack.
    resolveTopOfStack(state);

    const returned = alice.battlefield.find((c) => c.definitionId === "helpful-hunter");
    expect(returned, "Helpful Hunter is back on the battlefield").toBeDefined();
    expect(returned!.plusOneCounters, "a blink makes a new object - counters gone").toBe(0);
    expect(alice.hand.length, "the enter trigger drew a card").toBe(handBefore + 1);
    expect(state.players[0]!.exile.some((c) => c.definitionId === "helpful-hunter")).toBe(false);
  });

  it("next-end-step: holds the card in exile, returns it at the end step", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const source = createCardInstance(state, "mother-of-runes", alice.id, "battlefield");
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "battlefield");

    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;

    applyEffect(state, alice.id, source.instanceId, { kind: "flicker", target: { kind: "creature" }, timing: "next-end-step" }, [
      { kind: "card", instanceId: hunter.instanceId },
    ]);

    // Right away it is in exile, not on the battlefield.
    expect(alice.battlefield.some((c) => c.definitionId === "helpful-hunter")).toBe(false);
    expect(alice.exile.some((c) => c.definitionId === "helpful-hunter")).toBe(true);

    // Advance to the end step; the delayed return fires and goes on the stack.
    let guard = 20;
    while ((state.step as string) !== "end" && guard-- > 0) advanceStep(state);
    let g2 = 20;
    while (state.stack.length > 0 && g2-- > 0) resolveTopOfStack(state);

    expect(alice.battlefield.some((c) => c.definitionId === "helpful-hunter"), "returned at end step").toBe(true);
    expect(alice.exile.some((c) => c.definitionId === "helpful-hunter")).toBe(false);
  });

  it("Phelia's rider: a +1/+1 counter when the returned card was yours", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const phelia = createCardInstance(state, "mother-of-runes", alice.id, "battlefield"); // stand-in source
    const yours = createCardInstance(state, "helpful-hunter", alice.id, "battlefield");

    // Return under your control -> counter.
    applyEffect(state, alice.id, phelia.instanceId, { kind: "flicker", target: { kind: "creature" }, timing: "immediate", counterSourceIfYours: true }, [
      { kind: "card", instanceId: yours.instanceId },
    ]);
    resolveTopOfStack(state);
    expect(phelia.plusOneCounters, "yours entered under your control").toBe(1);

    // Return an opponent's permanent -> no counter.
    const theirs = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    applyEffect(state, alice.id, phelia.instanceId, { kind: "flicker", target: { kind: "creature" }, timing: "immediate", counterSourceIfYours: true }, [
      { kind: "card", instanceId: theirs.instanceId },
    ]);
    expect(phelia.plusOneCounters, "theirs did not enter under your control").toBe(1);
  });
});
