import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { resolveCardChoice } from "../effects.js";
import { effectivePower, effectiveToughness } from "../counters.js";
import type { GameState } from "../types.js";

/** Resolve the stack, declining any card choice that stops it, until quiet. */
function settle(state: GameState, playerId: string): void {
  let guard = 80;
  while (guard-- > 0) {
    if (state.stack.length > 0) {
      resolveTopOfStack(state);
      continue;
    }
    if (state.pendingCardChoices.length > 0) {
      resolveCardChoice(state, state.pendingCardChoices[0]!.playerId, []);
      continue;
    }
    break;
  }
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
  state.activePlayerIndex = 0;
}

describe("Thundertrap Trainer", () => {
  it("looks at the top four, takes a noncreature nonland, and bottoms the rest", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    mainPhase(state);
    // A known top four: only the instant is a legal take.
    alice.library = [];
    const instant = createCardInstance(state, "reach-through-mists", alice.id, "library");
    const land = createCardInstance(state, "forest", alice.id, "library");
    const bearA = createCardInstance(state, "grizzly-bears", alice.id, "library");
    const bearB = createCardInstance(state, "grizzly-bears", alice.id, "library");

    const trainer = createCardInstance(state, "thundertrap-trainer", alice.id, "hand");
    fillPool(state, alice.id);
    castSpell(state, alice.id, trainer.instanceId, []);
    // Resolve the creature and its ETB trigger, stopping at the choice.
    let guard = 20;
    while (state.pendingCardChoices.length === 0 && guard-- > 0) resolveTopOfStack(state);

    const choice = state.pendingCardChoices[0]!;
    expect(choice.candidateInstanceIds).toEqual([instant.instanceId]); // creatures and land excluded
    resolveCardChoice(state, alice.id, [instant.instanceId]);

    expect(findInstance(state, instant.instanceId)!.instance.zone).toBe("hand");
    // The other three are on the bottom, so the whole (four-minus-one) library is them.
    expect(alice.library.map((c) => c.instanceId)).toEqual([land.instanceId, bearA.instanceId, bearB.instanceId]);
  });

  it("Offspring makes a 1/1 token copy of it as it enters", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 8; i++) createCardInstance(state, "grizzly-bears", alice.id, "library");

    const trainer = createCardInstance(state, "thundertrap-trainer", alice.id, "hand");
    fillPool(state, alice.id);
    castSpell(state, alice.id, trainer.instanceId, [], { payOffspring: true });
    settle(state, alice.id);

    const copies = alice.battlefield.filter((c) => c.definitionId === "thundertrap-trainer");
    expect(copies.length).toBe(2); // the real one and its token copy
    const token = copies.find((c) => c.isTokenCopy)!;
    expect(token).toBeTruthy();
    expect(effectivePower(state, token)).toBe(1); // printed 1/1, not the original's 1/2
    expect(effectiveToughness(state, token)).toBe(1);
  });

  it("without paying Offspring, no token copy is made", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 8; i++) createCardInstance(state, "grizzly-bears", alice.id, "library");

    const trainer = createCardInstance(state, "thundertrap-trainer", alice.id, "hand");
    fillPool(state, alice.id);
    castSpell(state, alice.id, trainer.instanceId, []);
    settle(state, alice.id);

    expect(alice.battlefield.filter((c) => c.definitionId === "thundertrap-trainer").length).toBe(1);
  });
});
