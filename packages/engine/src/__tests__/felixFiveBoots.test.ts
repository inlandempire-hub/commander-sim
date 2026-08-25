import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { dealCombatDamage } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";

describe("Felix Five-Boots", () => {
  it("makes a combat-damage trigger of a permanent you control fire an extra time", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "combat-damage";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    createCardInstance(state, "felix-five-boots", alice.id, "battlefield");
    createCardInstance(state, "necropolis-regent", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");

    state.attackers = { [bears.instanceId]: bob.id };
    state.blockers = {};

    dealCombatDamage(state, "regular");
    // Necropolis Regent's trigger fires twice (Felix), so two stack objects.
    resolveTopOfStack(state);
    resolveTopOfStack(state);

    const bearsNow = alice.battlefield.find((c) => c.instanceId === bears.instanceId)!;
    // 2 damage, doubled by Felix -> 4 counters.
    expect(bearsNow.plusOneCounters).toBe(4);
  });
});
