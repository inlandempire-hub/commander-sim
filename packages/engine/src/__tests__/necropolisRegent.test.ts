import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { dealCombatDamage } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";

describe("Necropolis Regent", () => {
  it("puts counters equal to combat damage on each of the controller's creatures that connected", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "combat-damage";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    createCardInstance(state, "necropolis-regent", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");

    // Grizzly Bears attacks Bob unblocked.
    state.attackers = { [bears.instanceId]: bob.id };
    state.blockers = {};

    dealCombatDamage(state, "regular");
    // Necropolis Regent's trigger is on the stack; resolve it.
    resolveTopOfStack(state);

    const bearsNow = alice.battlefield.find((c) => c.instanceId === bears.instanceId)!;
    // Dealt 2 combat damage -> two +1/+1 counters on the attacker.
    expect(bearsNow.plusOneCounters).toBe(2);
  });
});
