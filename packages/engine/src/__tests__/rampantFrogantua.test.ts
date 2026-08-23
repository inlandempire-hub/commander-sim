import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { resolveCardChoice } from "../effects.js";
import { effectivePower, effectiveToughness } from "../counters.js";
import type { GameState } from "../types.js";

function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Rampant Frogantua", () => {
  it("gets +10/+10 for each player who has lost the game, read live", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const frog = createCardInstance(state, "rampant-frogantua", alice.id, "battlefield");

    expect(effectivePower(state, frog)).toBe(3); // nobody has lost yet
    expect(effectiveToughness(state, frog)).toBe(3);

    state.players[1]!.hasLost = true;
    expect(effectivePower(state, findInstance(state, frog.instanceId)!.instance)).toBe(13);
    expect(effectiveToughness(state, findInstance(state, frog.instanceId)!.instance)).toBe(13);
  });

  it("on combat damage may mill that many and put milled lands onto the battlefield tapped", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const frog = createCardInstance(state, "rampant-frogantua", alice.id, "battlefield"); // 3 power
    frog.summoningSickness = false;
    // Top three of the library: two lands and a creature.
    alice.library = [];
    const landA = createCardInstance(state, "forest", alice.id, "library");
    const landB = createCardInstance(state, "forest", alice.id, "library");
    const creature = createCardInstance(state, "grizzly-bears", alice.id, "library");

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: frog.instanceId, defendingPlayerId: bob.id }]);
    state.step = "combat-damage";
    dealCombatDamage(state, "regular");
    drain(state);

    // "You may mill that many cards" - the optional trigger asks first.
    expect(state.pendingConfirmation?.playerId).toBe(alice.id);
    resolveConfirmation(state, alice.id, true);

    // It milled three (its power); the two lands are offered to put out tapped.
    expect(findInstance(state, creature.instanceId)!.instance.zone).toBe("graveyard");
    const choice = state.pendingCardChoices[0]!;
    expect(new Set(choice.candidateInstanceIds)).toEqual(new Set([landA.instanceId, landB.instanceId]));
    resolveCardChoice(state, alice.id, [landA.instanceId, landB.instanceId]);

    for (const land of [landA, landB]) {
      const inst = findInstance(state, land.instanceId)!.instance;
      expect(inst.zone).toBe("battlefield");
      expect(inst.tapped).toBe(true);
    }
  });
});
