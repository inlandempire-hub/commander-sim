import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { declareAttackers } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import type { GameState, StackTarget } from "../types.js";

/**
 * The 2026-08-15 pair: Infectious Bite's two-target one-sided fight, and
 * Twenty-Toed Toad's hand-size raise, whole-declaration attack trigger and win.
 */

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

describe("Infectious Bite", () => {
  it("your creature deals its power to their creature, and each opponent is poisoned", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield"); // 2/2
    const wurm = createCardInstance(state, "craw-wurm", bob.id, "battlefield"); // 6/4
    const bite = createCardInstance(state, "infectious-bite", alice.id, "hand");
    fillPool(state, alice.id);

    const targets: StackTarget[] = [
      { kind: "card", instanceId: bears.instanceId },
      { kind: "card", instanceId: wurm.instanceId },
    ];
    castSpell(state, alice.id, bite.instanceId, targets);
    drain(state);

    expect(findInstance(state, wurm.instanceId)!.instance.damageMarked).toBe(2);
    expect(bob.poisonCounters).toBe(1);
    // The bite is a spell, so it is spent to the graveyard, not left on the stack.
    expect(findInstance(state, bite.instanceId)!.instance.zone).toBe("graveyard");
  });

  it("rejects a dealer you do not control and a recipient you do", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const mine = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const theirs = createCardInstance(state, "craw-wurm", bob.id, "battlefield");
    const bite = createCardInstance(state, "infectious-bite", alice.id, "hand");
    fillPool(state, alice.id);

    // Dealer must be yours; recipient must not be. Swapping them is illegal.
    expect(() =>
      castSpell(state, alice.id, bite.instanceId, [
        { kind: "card", instanceId: theirs.instanceId },
        { kind: "card", instanceId: mine.instanceId },
      ]),
    ).toThrow(/illegal target/i);
  });
});

describe("Twenty-Toed Toad", () => {
  it("raises its controller's maximum hand size to twenty", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "twenty-toed-toad", alice.id, "battlefield");
    for (let i = 0; i < 15; i++) createCardInstance(state, "grizzly-bears", alice.id, "hand");

    state.activePlayerIndex = 0;
    let guard = 40;
    while (state.step !== "cleanup" && guard-- > 0) advanceStep(state);
    // Nothing is discarded to hand size: fifteen is under the raised limit of twenty.
    expect(alice.hand.length).toBe(15);
  });

  it("attacking with two or more creatures grows it and draws a card", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const toad = createCardInstance(state, "twenty-toed-toad", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    toad.summoningSickness = false;
    bears.summoningSickness = false;
    createCardInstance(state, "grizzly-bears", alice.id, "library"); // something to draw
    const handBefore = alice.hand.length;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: toad.instanceId, defendingPlayerId: bob.id },
      { attackerInstanceId: bears.instanceId, defendingPlayerId: bob.id },
    ]);
    drain(state);

    expect(findInstance(state, toad.instanceId)!.instance.plusOneCounters).toBe(1);
    expect(alice.hand.length).toBe(handBefore + 1);
  });

  it("wins the game on attack once it has twenty counters", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const toad = createCardInstance(state, "twenty-toed-toad", alice.id, "battlefield");
    toad.summoningSickness = false;
    toad.plusOneCounters = 20;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: toad.instanceId, defendingPlayerId: bob.id },
    ]);
    drain(state);

    expect(bob.hasLost).toBe(true);
  });

  it("does not win on attack with fewer than twenty counters and a small hand", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const toad = createCardInstance(state, "twenty-toed-toad", alice.id, "battlefield");
    toad.summoningSickness = false;
    toad.plusOneCounters = 19;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: toad.instanceId, defendingPlayerId: bob.id },
    ]);
    drain(state);

    expect(bob.hasLost).toBe(false);
  });
});
