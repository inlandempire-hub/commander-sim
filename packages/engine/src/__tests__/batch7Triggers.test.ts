import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, requirePlayer } from "../state.js";
import { activateAbility } from "../abilities.js";
import { enteredBattlefield, putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { playLand } from "../casting.js";
import { declareAttackers } from "../combat.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * The two trigger events batch 7 needed: a land actually being *played*, and a
 * permanent *becoming* tapped.
 *
 * Both are distinctions rather than new machinery, and both distinctions are the
 * card: City of Traitors written as landfall eats itself to a fetchland, and City
 * of Brass written as a rider on its mana ability lets an attack through free.
 */
describe("batch 7 trigger events", () => {
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

  function inHand(state: GameState, definitionId: string, playerId: string): CardInstance {
    return createCardInstance(state, definitionId, playerId, "hand");
  }

  const stillInPlay = (state: GameState, instance: CardInstance) =>
    findInstance(state, instance.instanceId)?.instance.zone === "battlefield";

  describe("City of Traitors", () => {
    it("sacrifices itself when you play another land", () => {
      const { state, me } = game();
      const city = put(state, "city-of-traitors", me);
      const forest = inHand(state, "forest", me);

      playLand(state, me, forest.instanceId);
      resolveTopOfStack(state);

      expect(stillInPlay(state, city)).toBe(false);
      expect(stillInPlay(state, forest)).toBe(true);
    });

    it("survives its own arrival", () => {
      const { state, me } = game();
      const city = inHand(state, "city-of-traitors", me);

      playLand(state, me, city.instanceId);
      // "**another** land" - the watcher default excludes the card that moved, so
      // there is nothing on the stack at all.
      expect(state.stack).toHaveLength(0);
      expect(stillInPlay(state, city)).toBe(true);
    });

    it("is not set off by a land that merely arrives", () => {
      const { state, me } = game();
      const city = put(state, "city-of-traitors", me);
      const fetched = createCardInstance(state, "forest", me, "hand");

      // A fetchland or a ramp spell puts a land onto the battlefield without it
      // being played. Landfall fires; this must not.
      putOntoBattlefield(state, fetched.instanceId);
      expect(state.stack).toHaveLength(0);
      expect(stillInPlay(state, city)).toBe(true);
    });

    it("does not watch an opponent's land drops", () => {
      const { state, me, them } = game();
      const city = put(state, "city-of-traitors", me);
      const theirForest = inHand(state, "forest", them);

      state.activePlayerIndex = 1;
      state.priorityPlayerIndex = 1;
      playLand(state, them, theirForest.instanceId);

      expect(state.stack).toHaveLength(0);
      expect(stillInPlay(state, city)).toBe(true);
    });

    it("taps for two colourless", () => {
      const { state, me } = game();
      const city = put(state, "city-of-traitors", me);
      activateAbility(state, me, city.instanceId, 0);
      expect(requirePlayer(state, me).manaPool.generic).toBe(2);
    });
  });

  describe("City of Brass", () => {
    it("hurts you for tapping it for mana", () => {
      const { state, me } = game();
      const city = put(state, "city-of-brass", me);

      activateAbility(state, me, city.instanceId, 0);
      // The mana is in the pool immediately - a mana ability does not use the
      // stack - and the damage is a triggered ability waiting on top of it.
      expect(requirePlayer(state, me).manaPool.W).toBe(1);
      expect(requirePlayer(state, me).life).toBe(40);

      resolveTopOfStack(state);
      expect(requirePlayer(state, me).life).toBe(39);
    });

    it("does not hurt you on arrival", () => {
      const { state, me } = game();
      put(state, "city-of-brass", me);
      // It entered untapped, so it never *became* tapped.
      expect(state.stack).toHaveLength(0);
      expect(requirePlayer(state, me).life).toBe(40);
    });

    it("does not fire twice for a land that is already tapped", () => {
      const { state, me } = game();
      const city = put(state, "city-of-brass", me);

      activateAbility(state, me, city.instanceId, 0);
      resolveTopOfStack(state);
      expect(requirePlayer(state, me).life).toBe(39);

      // Tapped already: "becomes tapped" is a change of state, not a state.
      expect(() => activateAbility(state, me, city.instanceId, 1)).toThrow(/already tapped/);
      expect(state.stack).toHaveLength(0);
    });

    it("fires when a creature carrying the trigger attacks", () => {
      const { state, me } = game();
      /*
       * City of Brass is a land, so this uses the same trigger on a creature to
       * prove the other tap site is wired: attacking taps an attacker without
       * vigilance, and that is a real tapping.
       */
      const bears = put(state, "grizzly-bears", me);
      bears.grantedTriggers.push({ event: "becomes-tapped", effect: { kind: "damageController", amount: 1 } });

      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [
        { attackerInstanceId: bears.instanceId, defendingPlayerId: state.players[1]!.id },
      ]);
      expect(bears.tapped).toBe(true);
      resolveTopOfStack(state);
      expect(requirePlayer(state, me).life).toBe(39);
    });

    it("is prevented by a shield like any other damage", () => {
      const { state, me } = game();
      const city = put(state, "city-of-brass", me);
      requirePlayer(state, me).damagePrevention = 1;

      activateAbility(state, me, city.instanceId, 0);
      resolveTopOfStack(state);
      // Damage, not life loss - which is the whole reason it is written as damage.
      expect(requirePlayer(state, me).life).toBe(40);
    });
  });
});
