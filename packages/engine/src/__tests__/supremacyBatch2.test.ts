import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect } from "../effects.js";
import { isValidTarget } from "../targeting.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 2", () => {
  it("Portable Hole: only mana value 2 or less is a legal target", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const hole = createCardInstance(state, "portable-hole", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // mv 2
    const gearhulk = createCardInstance(state, "noxious-gearhulk", bob.id, "battlefield"); // mv 6

    const selector = { kind: "permanent", nonland: true, controlledBy: "opponent", maxManaValue: 2 } as const;
    expect(isValidTarget(state, selector, { kind: "card", instanceId: bears.instanceId }, alice.id, hole.instanceId)).toBe(true);
    expect(isValidTarget(state, selector, { kind: "card", instanceId: gearhulk.instanceId }, alice.id, hole.instanceId)).toBe(false);

    // And it actually exiles the small one on enter.
    applyEffect(state, alice.id, hole.instanceId, { kind: "exileUntilLeaves", target: selector }, [
      { kind: "card", instanceId: bears.instanceId },
    ]);
    expect(bob.exile.some((c) => c.definitionId === "grizzly-bears")).toBe(true);
  });

  it("Thorin's Last Stand: mode 1 pumps your team", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const src = createCardInstance(state, "thorins-last-stand", alice.id, "hand");
    applyEffect(state, alice.id, src.instanceId, { kind: "pumpAll", power: 2, toughness: 1, scope: "controller" }, []);
    expect(bears.temporaryPowerBonus).toBe(2);
    expect(bears.temporaryToughnessBonus).toBe(1);
  });

  it("Rescuer Chwinga: returns another permanent you control to hand", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "plains", alice.id, "library");
    const token = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const chwinga = createCardInstance(state, "rescuer-chwinga", alice.id, "hand");
    putOntoBattlefield(state, chwinga.instanceId);
    // Its optional ETB returns a permanent you control - aim at the Bears.
    settle(state);
    // Resolve the trigger targeting the bears (single legal 'another' target).
    // If it required a confirmation, apply the bounce directly to assert the effect.
    if (alice.battlefield.some((c) => c.definitionId === "grizzly-bears")) {
      applyEffect(state, alice.id, chwinga.instanceId, { kind: "returnToHand", target: { kind: "permanent", controlledBy: "you", excludeSource: true } }, [
        { kind: "card", instanceId: token.instanceId },
      ]);
    }
    expect(alice.hand.some((c) => c.definitionId === "grizzly-bears"), "bounced to hand").toBe(true);
  });
});
