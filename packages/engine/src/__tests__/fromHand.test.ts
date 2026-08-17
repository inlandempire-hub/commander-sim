import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, requirePlayer } from "../state.js";
import { abilityManaCost, activateAbility, activatableAbilities } from "../abilities.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { declareAttackers, declareBlockers } from "../combat.js";
import { checkStateBasedActions } from "../sba.js";
import { isValidTarget } from "../targeting.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { CardInstance, GameState, TargetSelector } from "../types.js";

/**
 * Abilities activated from your hand - Simian Spirit Guide's exile-for-mana, and
 * Channel on Eiganjo and Sokenzan.
 *
 * The engine could already activate abilities and pay costs; what it could not do
 * was believe the source was anywhere but the battlefield. So most of these tests
 * are about zones: the ability is offered from hand and not from play, the card is
 * gone before the ability resolves, and the ability resolves anyway.
 */
describe("abilities activated from hand", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    state.players[0]!.manaPool.generic = 4;
    state.players[0]!.manaPool.W = 1;
    state.players[0]!.manaPool.R = 1;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  const inHand = (state: GameState, definitionId: string, playerId: string) =>
    createCardInstance(state, definitionId, playerId, "hand");

  describe("Simian Spirit Guide", () => {
    it("makes red mana from the hand and exiles itself", () => {
      const { state, me } = game();
      const ape = inHand(state, "simian-spirit-guide", me);

      expect(activatableAbilities(state, me, ape.instanceId)).toEqual([0]);
      activateAbility(state, me, ape.instanceId, 0);

      // A mana ability, so it resolved immediately without using the stack.
      expect(state.stack).toHaveLength(0);
      expect(requirePlayer(state, me).manaPool.R).toBe(2);
      expect(findInstance(state, ape.instanceId)?.instance.zone).toBe("exile");
    });

    it("is not activatable from the battlefield", () => {
      const { state, me } = game();
      const ape = put(state, "simian-spirit-guide", me);
      expect(activatableAbilities(state, me, ape.instanceId)).toEqual([]);
      expect(() => activateAbility(state, me, ape.instanceId, 0)).toThrow(/from your hand/);
    });
  });

  describe("Channel", () => {
    it("offers only the channel half from hand, and only the mana half in play", () => {
      const { state, me } = game();
      const inPlay = put(state, "eiganjo-seat-of-the-empire", me);
      const held = inHand(state, "eiganjo-seat-of-the-empire", me);

      // Nothing is attacking, so the channel half has no legal target either way.
      expect(activatableAbilities(state, me, inPlay.instanceId)).toEqual([0]);
      expect(activatableAbilities(state, me, held.instanceId)).toEqual([]);
    });

    it("Eiganjo kills an attacking creature and goes to the graveyard", () => {
      const { state, me, them } = game();
      const eiganjo = inHand(state, "eiganjo-seat-of-the-empire", me);
      const attacker = put(state, "grizzly-bears", them);

      // Their turn, their attacker.
      state.activePlayerIndex = 1;
      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, them, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: me }]);
      state.priorityPlayerIndex = 0;

      expect(activatableAbilities(state, me, eiganjo.instanceId)).toEqual([1]);
      activateAbility(state, me, eiganjo.instanceId, 1, [{ kind: "card", instanceId: attacker.instanceId }]);

      // The card is a cost, so it is already in the graveyard with the ability
      // still on the stack - the same shape a fetchland's search has.
      expect(findInstance(state, eiganjo.instanceId)?.instance.zone).toBe("graveyard");
      expect(state.stack).toHaveLength(1);

      resolveTopOfStack(state);
      checkStateBasedActions(state);
      expect(findInstance(state, attacker.instanceId)?.instance.zone).toBe("graveyard");
    });

    it("can point at a blocker, which is the half that makes it flexible", () => {
      const { state, me, them } = game();
      const mine = put(state, "grizzly-bears", me);
      const blocker = put(state, "grizzly-bears", them);
      const selector: TargetSelector = {
        kind: "permanent",
        cardTypes: ["Creature"],
        attackingOrBlocking: true,
      };

      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [{ attackerInstanceId: mine.instanceId, defendingPlayerId: them }]);
      state.step = "declare-blockers";
      declareBlockers(state, them, [
        { blockerInstanceId: blocker.instanceId, attackerInstanceId: mine.instanceId },
      ]);

      expect(isValidTarget(state, selector, { kind: "card", instanceId: blocker.instanceId }, me)).toBe(true);
    });

    it("is not a legal target when the creature is in neither map", () => {
      const { state, me, them } = game();
      const bystander = put(state, "grizzly-bears", them);
      const selector: TargetSelector = {
        kind: "permanent",
        cardTypes: ["Creature"],
        attackingOrBlocking: true,
      };
      expect(isValidTarget(state, selector, { kind: "card", instanceId: bystander.instanceId }, me)).toBe(
        false,
      );
    });

    it("Sokenzan makes two hasty Spirits", () => {
      const { state, me } = game();
      const sokenzan = inHand(state, "sokenzan-crucible-of-defiance", me);

      activateAbility(state, me, sokenzan.instanceId, 1);
      resolveTopOfStack(state);

      const spirits = requirePlayer(state, me).battlefield.filter(
        (c) => c.definitionId === "token-c-11-spirit",
      );
      expect(spirits).toHaveLength(2);
      // Granted rather than printed: the tokens are hasty this turn only.
      for (const spirit of spirits) expect(spirit.grantedKeywords).toContain("Haste");
      expect(TEST_CARD_DEFINITIONS["token-c-11-spirit"]!.keywords ?? []).not.toContain("Haste");
    });
  });

  describe("the channel discount", () => {
    it("takes {1} off for each legendary creature you control", () => {
      const { state, me } = game();
      const eiganjo = TEST_CARD_DEFINITIONS["eiganjo-seat-of-the-empire"]!;
      const channel = eiganjo.activatedAbilities![1]!;

      expect(abilityManaCost(state, me, channel)).toEqual({ generic: 2, colors: { W: 1 } });

      put(state, "winota-joiner-of-forces", me);
      expect(abilityManaCost(state, me, channel)).toEqual({ generic: 1, colors: { W: 1 } });

      put(state, "kiki-jiki-mirror-breaker", me);
      expect(abilityManaCost(state, me, channel)).toEqual({ generic: 0, colors: { W: 1 } });
    });

    it("never eats the coloured pip, however many legends are out", () => {
      const { state, me } = game();
      const channel = TEST_CARD_DEFINITIONS["eiganjo-seat-of-the-empire"]!.activatedAbilities![1]!;
      for (let i = 0; i < 4; i++) put(state, "winota-joiner-of-forces", me);
      // Four legends, a cost of {2}{W}: the generic bottoms out at zero and the
      // white pip is still there to pay.
      expect(abilityManaCost(state, me, channel)).toEqual({ generic: 0, colors: { W: 1 } });
    });

    it("counts only legendary creatures, not legendary anything", () => {
      const { state, me } = game();
      const channel = TEST_CARD_DEFINITIONS["eiganjo-seat-of-the-empire"]!.activatedAbilities![1]!;
      // Mox Amber is a Legendary Artifact and does not count.
      put(state, "mox-amber", me);
      expect(abilityManaCost(state, me, channel)).toEqual({ generic: 2, colors: { W: 1 } });
    });

    it("is what the payment actually charges, not just what the offer says", () => {
      const { state, me } = game();
      const sokenzan = inHand(state, "sokenzan-crucible-of-defiance", me);
      put(state, "winota-joiner-of-forces", me);
      const player = requirePlayer(state, me);
      /*
       * The whole pool, not the generic and red halves of it: the generic part of
       * a cost is paid with whatever is floating, so counting only the colours the
       * cost names measures the wrong thing. That is what this test got wrong
       * first time round, and it read as the discount being applied twice.
       */
      const total = () => Object.values(player.manaPool).reduce((sum, n) => sum + (n ?? 0), 0);
      const before = total();

      // {3}{R} less one legend is {2}{R} - three mana.
      activateAbility(state, me, sokenzan.instanceId, 1);

      expect(before - total()).toBe(3);
    });
  });
});
