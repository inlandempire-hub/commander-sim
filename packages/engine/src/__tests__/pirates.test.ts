import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, requirePlayer } from "../state.js";
import { enteredBattlefield } from "../permanents.js";
import { activateAbility, activatableAbilities } from "../abilities.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { castSpell, mayPlayFromExile, playLand } from "../casting.js";
import { hasKeyword } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * The two Pirates, and the three things they needed: combat damage to a player
 * as an event, Treasure, and permission to play a card out of exile.
 */
describe("Professional Face-Breaker and Ragavan", () => {
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

  /** Attack with everything named, and let the damage through unblocked. */
  function swingWith(state: GameState, me: string, them: string, attackers: CardInstance[]): void {
    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(
      state,
      me,
      attackers.map((a) => ({ attackerInstanceId: a.instanceId, defendingPlayerId: them })),
    );
    state.step = "declare-blockers";
    declareBlockers(state, them, []);
    dealCombatDamage(state);
  }

  const treasures = (state: GameState, playerId: string) =>
    requirePlayer(state, playerId).battlefield.filter((c) => c.definitionId === "token-treasure");

  describe("the trigger fires once, not once per creature", () => {
    it("makes one Treasure however many creatures connected", () => {
      const { state, me, them } = game();
      const breaker = put(state, "professional-face-breaker", me);
      const bears = put(state, "grizzly-bears", me);
      const goblin = put(state, "raging-goblin", me);

      swingWith(state, me, them, [breaker, bears, goblin]);
      // One trigger on the stack, whatever the attack looked like.
      expect(state.stack).toHaveLength(1);
      resolveTopOfStack(state);
      expect(treasures(state, me)).toHaveLength(1);
    });

    it("does not fire when everything was blocked", () => {
      const { state, me, them } = game();
      const breaker = put(state, "professional-face-breaker", me);
      const blocker = put(state, "capital-guard", them);

      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [
        { attackerInstanceId: breaker.instanceId, defendingPlayerId: them },
      ]);
      state.step = "declare-blockers";
      // Menace needs two, and the point here is only that nothing got through.
      state.blockers[blocker.instanceId] = breaker.instanceId;
      dealCombatDamage(state);

      expect(state.stack).toHaveLength(0);
      expect(treasures(state, me)).toHaveLength(0);
    });

    it("Ragavan's own trigger fires per creature, because it says 'Ragavan'", () => {
      const { state, me, them } = game();
      const ragavan = put(state, "ragavan-nimble-pilferer", me);
      const bears = put(state, "grizzly-bears", me);
      createCardInstance(state, "forest", them, "library");

      swingWith(state, me, them, [ragavan, bears]);
      // Only Ragavan's, even though two creatures connected.
      expect(state.stack).toHaveLength(1);
    });
  });

  describe("Treasure", () => {
    it("taps and sacrifices itself for one mana of any colour", () => {
      const { state, me, them } = game();
      const breaker = put(state, "professional-face-breaker", me);
      swingWith(state, me, them, [breaker]);
      resolveTopOfStack(state);

      const treasure = treasures(state, me)[0]!;
      treasure.summoningSickness = false;
      activateAbility(state, me, treasure.instanceId, 3); // the red half

      expect(requirePlayer(state, me).manaPool.R).toBe(1);
      expect(findInstance(state, treasure.instanceId)?.instance.zone).not.toBe("battlefield");
    });
  });

  describe("playing a card out of exile", () => {
    it("Face-Breaker exiles from its own library and may play a land off it", () => {
      const { state, me, them } = game();
      const breaker = put(state, "professional-face-breaker", me);
      const top = createCardInstance(state, "forest", me, "library");
      swingWith(state, me, them, [breaker]);
      resolveTopOfStack(state);

      const treasure = treasures(state, me)[0]!;
      treasure.summoningSickness = false;
      activateAbility(state, me, breaker.instanceId, 0);
      resolveTopOfStack(state);

      expect(findInstance(state, top.instanceId)?.instance.zone).toBe("exile");
      expect(mayPlayFromExile(state, me, top)).toBe(true);

      // "You may **play** that card" - a land drop is a play.
      state.phase = "precombat-main";
      state.step = "main";
      state.activePlayerIndex = 0;
      state.priorityPlayerIndex = 0;
      playLand(state, me, top.instanceId);
      expect(findInstance(state, top.instanceId)?.instance.zone).toBe("battlefield");
    });

    it("Ragavan exiles from the player it hit, and casting it is not a land drop", () => {
      const { state, me, them } = game();
      const ragavan = put(state, "ragavan-nimble-pilferer", me);
      const theirTop = createCardInstance(state, "forest", them, "library");

      swingWith(state, me, them, [ragavan]);
      resolveTopOfStack(state);

      // Their card, in exile, and mine to cast - the one place in the engine
      // where the owner and the player allowed to play it come apart.
      expect(findInstance(state, theirTop.instanceId)?.instance.zone).toBe("exile");
      expect(theirTop.ownerId).toBe(them);
      // "Cast", not "play": a land is not castable, so the permission excludes it.
      expect(mayPlayFromExile(state, me, theirTop)).toBe(false);
    });

    it("Ragavan lets its controller cast a spell off the other player's library", () => {
      const { state, me, them } = game();
      const ragavan = put(state, "ragavan-nimble-pilferer", me);
      const theirTop = createCardInstance(state, "grizzly-bears", them, "library");

      swingWith(state, me, them, [ragavan]);
      resolveTopOfStack(state);
      expect(mayPlayFromExile(state, me, theirTop)).toBe(true);

      state.phase = "postcombat-main";
      state.step = "main";
      state.priorityPlayerIndex = 0;
      requirePlayer(state, me).manaPool.generic = 5;
      requirePlayer(state, me).manaPool.G = 1;
      castSpell(state, me, theirTop.instanceId);
      expect(findInstance(state, theirTop.instanceId)?.instance.zone).toBe("stack");
    });

    it("the permission expires with the turn", () => {
      const { state, me, them } = game();
      const ragavan = put(state, "ragavan-nimble-pilferer", me);
      const theirTop = createCardInstance(state, "grizzly-bears", them, "library");
      swingWith(state, me, them, [ragavan]);
      resolveTopOfStack(state);

      expect(mayPlayFromExile(state, me, theirTop)).toBe(true);
      // Stamped with the turn rather than swept in cleanup, so the next turn
      // number is all it takes.
      state.turnNumber += 1;
      expect(mayPlayFromExile(state, me, theirTop)).toBe(false);
    });
  });

  describe("Dash", () => {
    it("costs the dash price, arrives hasty, and goes home at the end step", () => {
      const { state, me } = game();
      const card = createCardInstance(state, "ragavan-nimble-pilferer", me, "hand");
      requirePlayer(state, me).manaPool.generic = 1;
      requirePlayer(state, me).manaPool.R = 1;

      castSpell(state, me, card.instanceId, [], { useDashCost: true });
      resolveTopOfStack(state);

      const inPlay = findInstance(state, card.instanceId)!.instance;
      expect(inPlay.zone).toBe("battlefield");
      expect(hasKeyword(state, inPlay, "Haste")).toBe(true);
      expect(inPlay.summoningSickness).toBe(false);

      /*
       * Into the end step rather than sitting in it: delayed triggers fire as the
       * step is reached, so a test that starts there has already missed them.
       */
      state.phase = "postcombat-main";
      state.step = "main";
      advanceStep(state);
      expect(state.step).toBe("end");
      // The delayed trigger is on the stack; resolving it sends the Monkey home.
      resolveTopOfStack(state);
      expect(findInstance(state, card.instanceId)?.instance.zone).toBe("hand");
    });

    it("cast for its printed cost, it stays", () => {
      const { state, me } = game();
      const card = createCardInstance(state, "ragavan-nimble-pilferer", me, "hand");
      requirePlayer(state, me).manaPool.R = 1;

      castSpell(state, me, card.instanceId);
      resolveTopOfStack(state);

      const inPlay = findInstance(state, card.instanceId)!.instance;
      expect(inPlay.dashed).toBe(false);
      expect(state.delayedTriggers).toHaveLength(0);
    });
  });
});
