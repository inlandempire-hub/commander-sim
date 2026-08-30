import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { activateLoyaltyAbility } from "../abilities.js";
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

describe("Supremacy batch 14 (Elspeth, Storm Slayer)", () => {
  it("+1 makes a Soldier, doubled by her own static", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main";
    const elspeth = createCardInstance(state, "elspeth-storm-slayer", alice.id, "battlefield");
    elspeth.loyalty = 5;
    activateLoyaltyAbility(state, alice.id, elspeth.instanceId, 0);
    settle(state);
    const soldiers = alice.battlefield.filter((c) => c.definitionId === "soldier-token").length;
    expect(soldiers, "one token doubled to two").toBe(2);
    expect(elspeth.loyalty).toBe(6);
  });

  it("0 counters each of your creatures and grants flying", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main";
    const elspeth = createCardInstance(state, "elspeth-storm-slayer", alice.id, "battlefield");
    elspeth.loyalty = 5;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    activateLoyaltyAbility(state, alice.id, elspeth.instanceId, 1);
    settle(state);
    expect(bears.plusOneCounters, "a +1/+1 counter").toBe(1);
    expect(bears.grantedKeywordsUntilYourNextTurn, "flying until your next turn").toContain("Flying");
  });

  it("-3 destroys only an opponent's mana-value-3+ creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    state.phase = "precombat-main"; state.step = "main";
    const elspeth = createCardInstance(state, "elspeth-storm-slayer", alice.id, "battlefield");
    elspeth.loyalty = 5;
    const big = createCardInstance(state, "necropolis-regent", bob.id, "battlefield"); // mv 6
    activateLoyaltyAbility(state, alice.id, elspeth.instanceId, 2, [{ kind: "card", instanceId: big.instanceId }]);
    settle(state);
    expect(bob.battlefield.some((c) => c.definitionId === "necropolis-regent")).toBe(false);
    expect(elspeth.loyalty).toBe(2);
  });
});
