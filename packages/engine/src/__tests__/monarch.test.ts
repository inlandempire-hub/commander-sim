import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, requirePlayer } from "../state.js";
import { enteredBattlefield } from "../permanents.js";
import { applyEffect } from "../effects.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { effectivePower } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * The monarch, and Eomer who hands it out.
 *
 * Three rules that live nowhere else: exactly one player has the crown, that
 * player draws a card at their end step, and combat damage to them takes it away.
 * None of them belong to a permanent, which is why they are enforced by the turn
 * machine and the combat step.
 */
describe("the monarch", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  it("nobody is the monarch until something says so", () => {
    const { state } = game();
    expect(state.monarchPlayerId).toBeNull();
  });

  it("the crown moves rather than being shared", () => {
    const { state, me, them } = game();
    applyEffect(state, me, "source", { kind: "becomeMonarch", who: "target" }, [
      { kind: "player", playerId: me },
    ]);
    expect(state.monarchPlayerId).toBe(me);

    applyEffect(state, me, "source", { kind: "becomeMonarch", who: "target" }, [
      { kind: "player", playerId: them },
    ]);
    expect(state.monarchPlayerId).toBe(them);
  });

  it("draws the monarch a card at their own end step", () => {
    const { state, me } = game();
    state.monarchPlayerId = me;
    createCardInstance(state, "forest", me, "library");
    const before = requirePlayer(state, me).hand.length;

    state.phase = "postcombat-main";
    state.step = "main";
    advanceStep(state);

    expect(state.step).toBe("end");
    expect(requirePlayer(state, me).hand.length).toBe(before + 1);
  });

  it("does not draw at somebody else's end step", () => {
    const { state, me, them } = game();
    state.monarchPlayerId = them;
    createCardInstance(state, "forest", them, "library");
    const before = requirePlayer(state, them).hand.length;

    // My turn, my end step - the crown pays out on its holder's turn only.
    state.phase = "postcombat-main";
    state.step = "main";
    advanceStep(state);

    expect(requirePlayer(state, them).hand.length).toBe(before);
  });

  it("combat damage to the monarch takes the crown", () => {
    const { state, me, them } = game();
    state.monarchPlayerId = them;
    const attacker = put(state, "grizzly-bears", me);

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";
    declareBlockers(state, them, []);
    dealCombatDamage(state);

    expect(state.monarchPlayerId).toBe(me);
  });

  it("damage that never lands leaves the crown alone", () => {
    const { state, me, them } = game();
    state.monarchPlayerId = them;
    const attacker = put(state, "grizzly-bears", me);
    const blocker = put(state, "capital-guard", them);

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";
    declareBlockers(state, them, [
      { blockerInstanceId: blocker.instanceId, attackerInstanceId: attacker.instanceId },
    ]);
    dealCombatDamage(state);

    expect(state.monarchPlayerId).toBe(them);
  });

  describe("Eomer, King of Rohan", () => {
    it("arrives bigger for each other Human, and shoots for that much", () => {
      const { state, me, them } = game();
      put(state, "grizzly-bears", me); // not a Human
      put(state, "capital-guard", me); // Human Soldier
      put(state, "mountain-bandit", me); // Human Soldier Rogue

      const eomer = createCardInstance(state, "eomer-king-of-rohan", me, "battlefield");
      enteredBattlefield(state, eomer);

      // 2/2 plus a counter for each of the two other Humans.
      expect(eomer.plusOneCounters).toBe(2);
      expect(effectivePower(state, eomer)).toBe(4);

      // The trigger is on the stack with a target to choose; point it at them.
      state.pendingTargetChoices.forEach((choice) => {
        choice.object.targets = [{ kind: "player", playerId: them }];
        state.stack.push(choice.object);
      });
      state.pendingTargetChoices = [];
      if (state.stack.length > 0) resolveTopOfStack(state);

      // The crown went somewhere and the damage was read off the *big* Eomer.
      expect(state.monarchPlayerId).toBe(them);
      expect(requirePlayer(state, them).life).toBe(36);
    });

    it("does not count itself among the Humans", () => {
      const { state, me } = game();
      const eomer = createCardInstance(state, "eomer-king-of-rohan", me, "battlefield");
      enteredBattlefield(state, eomer);
      expect(eomer.plusOneCounters).toBe(0);
    });

    it("leaves the crown behind when it dies", () => {
      const { state, me } = game();
      state.monarchPlayerId = me;
      const eomer = put(state, "eomer-king-of-rohan", me);
      requirePlayer(state, me).battlefield = requirePlayer(state, me).battlefield.filter(
        (c) => c.instanceId !== eomer.instanceId,
      );
      // The crown is a property of the game, not of the card that granted it -
      // Eomer is off the table and his controller is still the monarch.
      expect(findInstance(state, eomer.instanceId)).toBeUndefined();
      expect(state.monarchPlayerId).toBe(me);
    });
  });
});
