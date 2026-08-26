import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { enteredBattlefield, pushTrigger } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import type { GameState } from "../types.js";

function settle(state: GameState): void {
  let guard = 0;
  while (state.stack.length > 0 && guard++ < 50) resolveTopOfStack(state);
}

// Give each player a library to draw from, so a symmetric draw does not run
// them into an empty-library loss.
function stockLibraries(state: GameState): void {
  for (const player of state.players) {
    player.library = [];
    // createCardInstance files the card into its zone itself - pushing as well
    // would put the same instance in the library twice.
    for (let i = 0; i < 5; i++) createCardInstance(state, "swamp", player.id, "library");
  }
}

describe("Winter batch 1: symmetric each-player effects", () => {
  it("Stormfist Crusader's upkeep makes every player draw a card and lose 1 life", () => {
    const state = makeTestGame();
    stockLibraries(state);
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const crusader = createCardInstance(state, "stormfist-crusader", alice.id, "battlefield");
    enteredBattlefield(state, crusader);

    const aliceHand = requirePlayer(state, alice.id).hand.length;
    const bobHand = requirePlayer(state, bob.id).hand.length;

    const upkeep = state.cardDefinitions["stormfist-crusader"]!.triggeredAbilities!.find(
      (t) => t.event === "upkeep",
    )!;
    pushTrigger(state, crusader.instanceId, alice.id, upkeep);
    settle(state);

    // Each player - the controller included - draws one and loses one life.
    expect(requirePlayer(state, alice.id).hand.length).toBe(aliceHand + 1);
    expect(requirePlayer(state, bob.id).hand.length).toBe(bobHand + 1);
    expect(requirePlayer(state, alice.id).life).toBe(39);
    expect(requirePlayer(state, bob.id).life).toBe(39);
  });

  it("Mire Triton's enter trigger mills two and gains two life", () => {
    const state = makeTestGame();
    stockLibraries(state);
    const alice = state.players[0]!;
    const before = { life: requirePlayer(state, alice.id).life, gy: requirePlayer(state, alice.id).graveyard.length };

    const triton = createCardInstance(state, "mire-triton", alice.id, "battlefield");
    const etb = state.cardDefinitions["mire-triton"]!.triggeredAbilities!.find(
      (t) => t.event === "enters-battlefield",
    )!;
    pushTrigger(state, triton.instanceId, alice.id, etb);
    settle(state);

    expect(requirePlayer(state, alice.id).graveyard.length).toBe(before.gy + 2);
    expect(requirePlayer(state, alice.id).life).toBe(before.life + 2);
  });
});
