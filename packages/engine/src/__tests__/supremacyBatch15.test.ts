import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { chooseTriggerTargets } from "../permanents.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let g = 40;
  while (g-- > 0) {
    if (state.pendingTargetChoices?.length) { const t = state.pendingTargetChoices[0]!; chooseTriggerTargets(state, t.playerId, t.candidates.slice(0, Math.max(t.min, 0))); continue; }
    if (state.stack.length > 0) { resolveTopOfStack(state); continue; }
    break;
  }
}

describe("Supremacy batch 15 (Solitude / evoke)", () => {
  it("evoked by exiling a white card, exiles a creature and its controller gains life", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    // A white card in hand to pay evoke, plus Solitude.
    const whiteCard = createCardInstance(state, "swords-to-plowshares", alice.id, "hand");
    const solitude = createCardInstance(state, "solitude", alice.id, "hand");
    const target = createCardInstance(state, "necropolis-regent", bob.id, "battlefield"); // 6/5
    const bobBefore = bob.life;

    castSpell(state, alice.id, solitude.instanceId, [], {
      useAlternativeCost: true,
      exileFromHandInstanceId: whiteCard.instanceId,
    });
    // The ETB trigger picks the target; settle drives it.
    settle(state);

    expect(alice.exile.some((c) => c.definitionId === "swords-to-plowshares"), "white card exiled for evoke").toBe(true);
    expect(alice.battlefield.some((c) => c.definitionId === "solitude"), "Solitude resolved onto the battlefield").toBe(true);
    // The Regent was exiled and Bob gained its power (6) in life.
    expect(bob.battlefield.some((c) => c.definitionId === "necropolis-regent")).toBe(false);
    expect(bob.life, "controller gained life equal to its power").toBe(bobBefore + 6);
  });
});
