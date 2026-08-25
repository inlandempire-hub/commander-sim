import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { castSpell } from "../casting.js";
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

describe("Radstorm - Storm + proliferate", () => {
  it("copies once per prior spell, each copy proliferating", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.plusOneCounters = 1;
    bob.poisonCounters = 1;
    // Two spells already cast this turn: Storm makes two copies, so proliferate
    // resolves three times in all (the spell plus its two copies).
    state.spellsCastThisTurn = 2;

    const rad = createCardInstance(state, "radstorm", alice.id, "hand");
    fillPool(state, alice.id);
    castSpell(state, alice.id, rad.instanceId, []);
    expect(state.stack.length).toBe(3); // Radstorm + two copies
    drain(state);

    expect(findInstance(state, bears.instanceId)!.instance.plusOneCounters).toBe(4); // 1 + 3
    expect(bob.poisonCounters).toBe(4); // 1 + 3
    // The real card goes to the graveyard; the copies simply ceased to exist.
    expect(findInstance(state, rad.instanceId)!.instance.zone).toBe("graveyard");
    expect(state.spellsCastThisTurn).toBe(3);
  });

  it("with no prior spells this turn makes no copies", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.plusOneCounters = 1;
    state.spellsCastThisTurn = 0;

    const rad = createCardInstance(state, "radstorm", alice.id, "hand");
    fillPool(state, alice.id);
    castSpell(state, alice.id, rad.instanceId, []);
    expect(state.stack.length).toBe(1);
    drain(state);

    expect(findInstance(state, bears.instanceId)!.instance.plusOneCounters).toBe(2); // proliferated once
  });

  it("does not proliferate an opponent's counters or your own -1/-1", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const mine = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    mine.minusOneCounters = 1;
    const theirs = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    theirs.plusOneCounters = 2;
    state.spellsCastThisTurn = 0;

    const rad = createCardInstance(state, "radstorm", alice.id, "hand");
    fillPool(state, alice.id);
    castSpell(state, alice.id, rad.instanceId, []);
    drain(state);

    expect(findInstance(state, mine.instanceId)!.instance.minusOneCounters).toBe(1); // untouched
    expect(findInstance(state, theirs.instanceId)!.instance.plusOneCounters).toBe(2); // untouched
  });
});
