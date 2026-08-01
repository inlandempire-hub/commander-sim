import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, moveCard } from "../state.js";
import { activateAbility } from "../abilities.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";

describe("+1/+1 counters", () => {
  it("a counter increases effective power and toughness in combat", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    state.activePlayerIndex = 0;

    const bear = createCardInstance(state, "grizzly-bears", alice.id, "battlefield"); // 2/2
    bear.summoningSickness = false;
    bear.plusOneCounters = 2; // now a 4/4

    declareAttackers(state, alice.id, [{ attackerInstanceId: bear.instanceId, defendingPlayerId: bob.id }]);
    dealCombatDamage(state);

    expect(bob.life).toBe(36); // 40 - 4 damage from the buffed bear
  });

  it("counters are removed when a permanent changes zones", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bear = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bear.plusOneCounters = 3;

    moveCard(state, bear.instanceId, "graveyard");
    expect(bear.plusOneCounters).toBe(0);
  });

  it("counters can push a creature past lethal damage it would otherwise survive", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bear = createCardInstance(state, "grizzly-bears", alice.id, "battlefield"); // 2/2
    bear.damageMarked = 2; // exactly lethal for a 2-toughness creature
    bear.plusOneCounters = 1; // now a 3/3 - 2 damage marked is no longer lethal

    checkStateBasedActions(state);
    expect(alice.battlefield.some((c) => c.instanceId === bear.instanceId)).toBe(true);
  });
});

describe("Ant-Man, Scott Lang - {4}: Put a +1/+1 counter on Ant-Man", () => {
  it("puts the counter on itself when the ability has no target", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;

    const antMan = createCardInstance(state, "ant-man-scott-lang", alice.id, "battlefield");
    antMan.summoningSickness = false;
    alice.manaPool = { generic: 4 };

    activateAbility(state, alice.id, antMan.instanceId, 0);
    expect(antMan.tapped).toBe(false); // the ability has no tap cost
    resolveTopOfStack(state);

    expect(antMan.plusOneCounters).toBe(1);
  });
});
