import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { activateAbility } from "../abilities.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";
import { hasKeyword } from "../counters.js";
import type { GameState } from "../types.js";

function drain(state: GameState): void {
  let guard = 60;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Psychic Frog", () => {
  it("Discard a card: put a +1/+1 counter on it", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const frog = createCardInstance(state, "psychic-frog", alice.id, "battlefield");
    const fodder = createCardInstance(state, "grizzly-bears", alice.id, "hand");

    activateAbility(state, alice.id, frog.instanceId, 0, [], undefined, { discardInstanceIds: [fodder.instanceId] });
    drain(state);

    expect(findInstance(state, frog.instanceId)!.instance.plusOneCounters).toBe(1);
    expect(findInstance(state, fodder.instanceId)!.instance.zone).toBe("graveyard");
  });

  it("the discard cost is refused with no card to discard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const frog = createCardInstance(state, "psychic-frog", alice.id, "battlefield");

    expect(() => activateAbility(state, alice.id, frog.instanceId, 0, [], undefined, { discardInstanceIds: [] })).toThrow(
      /discard/i,
    );
  });

  it("Exile three cards from your graveyard: it gains flying", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const frog = createCardInstance(state, "psychic-frog", alice.id, "battlefield");
    const gy = [0, 1, 2].map(() => createCardInstance(state, "grizzly-bears", alice.id, "graveyard"));

    activateAbility(state, alice.id, frog.instanceId, 1);
    drain(state);

    expect(hasKeyword(state, findInstance(state, frog.instanceId)!.instance, "Flying")).toBe(true);
    for (const c of gy) expect(findInstance(state, c.instanceId)!.instance.zone).toBe("exile");
  });

  it("the exile cost needs three cards in the graveyard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const frog = createCardInstance(state, "psychic-frog", alice.id, "battlefield");
    createCardInstance(state, "grizzly-bears", alice.id, "graveyard");
    createCardInstance(state, "grizzly-bears", alice.id, "graveyard");

    expect(() => activateAbility(state, alice.id, frog.instanceId, 1)).toThrow(/graveyard/i);
  });

  it("draws a card on combat damage to a player", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const frog = createCardInstance(state, "psychic-frog", alice.id, "battlefield");
    frog.summoningSickness = false;
    createCardInstance(state, "grizzly-bears", alice.id, "library");
    const handBefore = alice.hand.length;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: frog.instanceId, defendingPlayerId: bob.id }]);
    state.step = "combat-damage";
    dealCombatDamage(state, "regular");
    drain(state);

    expect(alice.hand.length).toBe(handBefore + 1);
  });
});
