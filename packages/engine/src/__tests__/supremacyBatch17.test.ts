import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { declareAttackers } from "../combat.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { chooseTriggerTargets } from "../permanents.js";
import { hasKeyword } from "../counters.js";

function settle(state: ReturnType<typeof makeTestGame>, pay = true): void {
  let g = 40;
  while (g-- > 0) {
    if (state.pendingTargetChoices?.length) { const t = state.pendingTargetChoices[0]!; chooseTriggerTargets(state, t.playerId, t.candidates.slice(0, Math.max(t.min, 1))); continue; }
    if (state.pendingConfirmation) { resolveConfirmation(state, state.pendingConfirmation.playerId, pay); continue; }
    if (state.stack.length > 0) { resolveTopOfStack(state); continue; }
    break;
  }
}

describe("Supremacy batch 17 (Guide of Souls / energy)", () => {
  it("gains life and energy when another creature enters", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "guide-of-souls", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "library");
    const lifeBefore = alice.life;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    putOntoBattlefield(state, bears.instanceId, { wasCast: true });
    settle(state);
    expect(alice.life, "gained 1 life").toBe(lifeBefore + 1);
    expect(alice.energy, "got 1 energy").toBe(1);
  });

  it("attack: pay 3 energy to pump an attacker with flying and make it an Angel", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "guide-of-souls", alice.id, "battlefield");
    alice.energy = 3;
    const attacker = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    attacker.summoningSickness = false;
    state.phase = "combat"; state.step = "declare-attackers";
    declareAttackers(state, alice.id, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: bob.id }]);
    settle(state, true);
    expect(alice.energy, "3 energy spent").toBe(0);
    expect(attacker.plusOneCounters, "two +1/+1 counters").toBe(2);
    expect(hasKeyword(state, attacker, "Flying"), "flying counter").toBe(true);
    expect(attacker.grantedSubtypes, "became an Angel").toContain("Angel");
  });
});
