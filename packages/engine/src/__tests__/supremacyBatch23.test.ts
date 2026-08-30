import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { advanceStep } from "../turn.js";
import { resolveTopOfStack } from "../stack.js";
import { chooseTriggerTargets } from "../permanents.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let g = 40;
  while (g-- > 0) {
    if (state.pendingTargetChoices?.length) { const t = state.pendingTargetChoices[0]!; chooseTriggerTargets(state, t.playerId, t.candidates.slice(0, Math.max(t.min, 0))); continue; }
    if (state.pendingSearch) break;
    if (state.stack.length > 0) { resolveTopOfStack(state); continue; }
    break;
  }
}

describe("Supremacy batch 23 (The Mountain-king's Return / saga)", () => {
  it("chapter I fires on enter; a lore counter is added; chapter II reanimates after the draw step", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "plains", alice.id, "library");
    createCardInstance(state, "plains", alice.id, "hand"); // something to discard for the loot
    createCardInstance(state, "grizzly-bears", alice.id, "graveyard"); // mv 2 - chapter II target
    const saga = createCardInstance(state, "the-mountain-kings-return", alice.id, "hand");
    putOntoBattlefield(state, saga.instanceId, { wasCast: true });
    settle(state);
    expect(saga.loreCounters, "one lore counter on enter").toBe(1);

    // Advance Alice's turn to her next draw step: chapter II fires and reanimates.
    // End Alice's current turn, run through Bob's, back to Alice's draw step.
    state.activePlayerIndex = 1; // Bob active
    state.phase = "ending"; state.step = "end";
    advanceStep(state); // -> Alice's untap...
    let guard = 30;
    while (!(state.activePlayerIndex === 0 && (state.phase as string) === "precombat-main") && guard-- > 0) advanceStep(state);
    settle(state);
    expect(saga.loreCounters, "second lore counter after the draw step").toBe(2);
    expect(alice.battlefield.some((c) => c.definitionId === "grizzly-bears"), "chapter II reanimated the Bears").toBe(true);
  });
});
