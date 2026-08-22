import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { advanceStep } from "../turn.js";
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

function mainPhase(state: GameState): void {
  state.phase = "precombat-main";
  state.step = "main";
  state.stack = [];
}

describe("Starwinder - Warp", () => {
  it("cast for its warp cost, then exiled at the next end step and castable from exile later", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.activePlayerIndex = 0;
    mainPhase(state);
    const star = createCardInstance(state, "starwinder", alice.id, "hand");
    fillPool(state, alice.id);

    castSpell(state, alice.id, star.instanceId, [], { useWarp: true });
    drain(state);
    // It resolves as the 7/7, marked to leave at the next end step.
    expect(findInstance(state, star.instanceId)!.instance.zone).toBe("battlefield");
    expect(findInstance(state, star.instanceId)!.instance.exileAtNextEndStep).toBe(true);

    // Run the turn out: the end step exiles it, and marks it recastable.
    let guard = 40;
    while (findInstance(state, star.instanceId)!.instance.zone !== "exile" && guard-- > 0) {
      advanceStep(state);
    }
    expect(findInstance(state, star.instanceId)!.instance.zone).toBe("exile");
    expect(findInstance(state, star.instanceId)!.instance.warpedInExile).toBe(true);

    // A later turn: cast it from exile for its ordinary cost.
    state.activePlayerIndex = 0;
    mainPhase(state);
    fillPool(state, alice.id);
    castSpell(state, alice.id, star.instanceId, []);
    drain(state);
    expect(findInstance(state, star.instanceId)!.instance.zone).toBe("battlefield");
    // Cast normally, it is just a creature now - no second exile queued.
    expect(findInstance(state, star.instanceId)!.instance.exileAtNextEndStep).toBeFalsy();
  });

  it("may draw that many when a creature you control deals combat damage to a player", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const star = createCardInstance(state, "starwinder", alice.id, "battlefield"); // 7/7
    star.summoningSickness = false;
    const handBefore = alice.hand.length;
    for (let i = 0; i < 10; i++) createCardInstance(state, "grizzly-bears", alice.id, "library");

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: star.instanceId, defendingPlayerId: bob.id }]);
    state.step = "combat-damage";
    dealCombatDamage(state, "regular");
    drain(state);

    // "You may draw that many": the optional trigger stops and asks.
    expect(state.pendingConfirmation?.playerId).toBe(alice.id);
    resolveConfirmation(state, alice.id, true);
    expect(alice.hand.length).toBe(handBefore + 7);
  });
});
