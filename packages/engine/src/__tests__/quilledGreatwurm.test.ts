import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";
import type { GameState } from "../types.js";

function drain(state: GameState): void {
  let guard = 60;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

function fillPool(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId)!;
  player.manaPool.generic = 20;
  for (const color of ["W", "U", "B", "R", "G"] as const) player.manaPool[color] = 20;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
}

function attackAll(state: GameState, playerId: string, defenderId: string, attackers: string[]): void {
  state.phase = "combat";
  state.step = "declare-attackers";
  state.activePlayerIndex = state.players.findIndex((p) => p.id === playerId);
  declareAttackers(
    state,
    playerId,
    attackers.map((attackerInstanceId) => ({ attackerInstanceId, defendingPlayerId: defenderId })),
  );
  state.step = "combat-damage";
  dealCombatDamage(state, "regular");
  drain(state);
}

describe("Quilled Greatwurm", () => {
  it("puts counters equal to the combat damage each of your creatures dealt", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const wurm = createCardInstance(state, "quilled-greatwurm", alice.id, "battlefield"); // 7/7
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield"); // 2/2
    wurm.summoningSickness = false;
    bears.summoningSickness = false;

    attackAll(state, alice.id, bob.id, [wurm.instanceId, bears.instanceId]);

    // The watcher fires for every creature you control that connected, counters
    // landing on each one for the damage it dealt.
    expect(findInstance(state, wurm.instanceId)!.instance.plusOneCounters).toBe(7);
    expect(findInstance(state, bears.instanceId)!.instance.plusOneCounters).toBe(2);
  });

  it("counts trample damage through a blocker as one total", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const wurm = createCardInstance(state, "quilled-greatwurm", alice.id, "battlefield"); // 7/7 trample
    wurm.summoningSickness = false;
    const blocker = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // 2/2

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    state.blockers = { [blocker.instanceId]: wurm.instanceId };
    state.blockersDeclared = true;
    state.step = "combat-damage";
    dealCombatDamage(state, "regular");
    drain(state);

    // 2 to the blocker + 5 trampled to the player = 7 dealt, one trigger.
    expect(findInstance(state, wurm.instanceId)!.instance.plusOneCounters).toBe(7);
  });

  it("can be cast from the graveyard by removing six +1/+1 counters", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const wurm = createCardInstance(state, "quilled-greatwurm", alice.id, "graveyard");
    const a = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const b = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    a.plusOneCounters = 4;
    b.plusOneCounters = 2;
    fillPool(state, alice.id);
    state.phase = "precombat-main";
    state.step = "main";

    const removeCounterFrom = [
      a.instanceId, a.instanceId, a.instanceId, a.instanceId, // 4 off a
      b.instanceId, b.instanceId, // 2 off b
    ];
    castSpell(state, alice.id, wurm.instanceId, [], { removeCounterFrom });
    drain(state);

    expect(findInstance(state, wurm.instanceId)!.instance.zone).toBe("battlefield");
    expect(findInstance(state, a.instanceId)!.instance.plusOneCounters).toBe(0);
    expect(findInstance(state, b.instanceId)!.instance.plusOneCounters).toBe(0);
  });

  it("refuses the graveyard cast without exactly six counters removed", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const wurm = createCardInstance(state, "quilled-greatwurm", alice.id, "graveyard");
    const a = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    a.plusOneCounters = 3;
    fillPool(state, alice.id);
    state.phase = "precombat-main";
    state.step = "main";

    expect(() =>
      castSpell(state, alice.id, wurm.instanceId, [], {
        removeCounterFrom: [a.instanceId, a.instanceId, a.instanceId],
      }),
    ).toThrow(/counters removed/i);
  });
});
