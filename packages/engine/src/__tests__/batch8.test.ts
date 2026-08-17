import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, moveCard, requirePlayer } from "../state.js";
import { enteredBattlefield } from "../permanents.js";
import { applyEffect } from "../effects.js";
import { damageCreature, damagePlayer } from "../damage.js";
import { isValidTarget } from "../targeting.js";
import { effectiveToughness } from "../counters.js";
import { checkStateBasedActions } from "../sba.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { CardInstance, GameState, TargetSelector } from "../types.js";

/**
 * Batch 8 - the singles. Nothing here shares machinery with anything else, so
 * the tests are per card, and each one is about the half of the card that is
 * easy to get subtly wrong.
 */
describe("batch 8 singles", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  /**
   * A spell mid-resolution: the stack is a shared list rather than a per-player
   * zone, so the card is made in hand and moved rather than created there.
   */
  function onStack(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "hand");
    return moveCard(state, instance.instanceId, "stack");
  }

  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  describe("Swords to Plowshares", () => {
    const effect = () => TEST_CARD_DEFINITIONS["swords-to-plowshares"]!.castEffect!;

    it("exiles the creature and gives its controller life equal to its power", () => {
      const { state, me, them } = game();
      const bears = put(state, "grizzly-bears", them);

      applyEffect(state, me, "spell", effect(), [{ kind: "card", instanceId: bears.instanceId }]);

      expect(findInstance(state, bears.instanceId)?.instance.zone).toBe("exile");
      // Their creature, their life - which is what makes the card fair.
      expect(requirePlayer(state, them).life).toBe(42);
      expect(requirePlayer(state, me).life).toBe(40);
    });

    it("counts counters and anthems, not the printed number", () => {
      const { state, me, them } = game();
      const bears = put(state, "grizzly-bears", them);
      bears.plusOneCounters = 3;

      applyEffect(state, me, "spell", effect(), [{ kind: "card", instanceId: bears.instanceId }]);
      expect(requirePlayer(state, them).life).toBe(45);
    });

    it("gives nothing for a 0-power creature and still exiles it", () => {
      const { state, me, them } = game();
      const pest = put(state, "signal-pest", them);

      applyEffect(state, me, "spell", effect(), [{ kind: "card", instanceId: pest.instanceId }]);
      expect(requirePlayer(state, them).life).toBe(40);
      expect(findInstance(state, pest.instanceId)?.instance.zone).toBe("exile");
    });
  });

  describe("Gamble", () => {
    it("discards blind, from the caster's own hand", () => {
      const { state, me } = game();
      const first = createCardInstance(state, "grizzly-bears", me, "hand");
      const second = createCardInstance(state, "forest", me, "hand");

      applyEffect(state, me, "spell", { kind: "discardRandom", amount: 1 }, []);

      const hand = requirePlayer(state, me).hand;
      expect(hand).toHaveLength(1);
      // Whichever survived, the other is in the graveyard - the point is that
      // nobody was asked which.
      const survivor = hand[0]!.instanceId;
      expect([first.instanceId, second.instanceId]).toContain(survivor);
      expect(requirePlayer(state, me).graveyard).toHaveLength(1);
    });

    it("does nothing with an empty hand rather than erroring", () => {
      const { state, me } = game();
      expect(() => applyEffect(state, me, "spell", { kind: "discardRandom", amount: 1 }, [])).not.toThrow();
    });

    it("really is random, not the first card every time", () => {
      // Ten runs of a two-card hand: a discard that always took the same card
      // would show one distinct victim, and this asserts both are reachable.
      const victims = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const { state, me } = game();
        createCardInstance(state, "grizzly-bears", me, "hand");
        createCardInstance(state, "forest", me, "hand");
        applyEffect(state, me, "spell", { kind: "discardRandom", amount: 1 }, []);
        victims.add(requirePlayer(state, me).graveyard[0]!.definitionId);
      }
      expect(victims.size).toBe(2);
    });
  });

  describe("Rite of Flame", () => {
    const effect = () => TEST_CARD_DEFINITIONS["rite-of-flame"]!.castEffect!;

    it("adds two red with no copies in any graveyard", () => {
      const { state, me } = game();
      const rite = onStack(state, "rite-of-flame", me);
      applyEffect(state, me, rite.instanceId, effect(), []);
      expect(requirePlayer(state, me).manaPool.R).toBe(2);
    });

    it("counts copies in every graveyard, including an opponent's", () => {
      const { state, me, them } = game();
      createCardInstance(state, "rite-of-flame", me, "graveyard");
      createCardInstance(state, "rite-of-flame", them, "graveyard");
      const rite = onStack(state, "rite-of-flame", me);

      applyEffect(state, me, rite.instanceId, effect(), []);
      expect(requirePlayer(state, me).manaPool.R).toBe(4);
    });

    it("does not count itself - it is still on the stack", () => {
      const { state, me } = game();
      const rite = onStack(state, "rite-of-flame", me);
      applyEffect(state, me, rite.instanceId, effect(), []);
      expect(requirePlayer(state, me).manaPool.R).toBe(2);
    });

    it("counts by name, so another card in the graveyard is not a copy", () => {
      const { state, me } = game();
      createCardInstance(state, "gamble", me, "graveyard");
      const rite = onStack(state, "rite-of-flame", me);
      applyEffect(state, me, rite.instanceId, effect(), []);
      expect(requirePlayer(state, me).manaPool.R).toBe(2);
    });
  });

  describe("the two blasts are not the same card", () => {
    it("Red Elemental Blast may only be pointed at something blue", () => {
      const { state, me, them } = game();
      const blueThing = put(state, "wind-drake", them);
      const redThing = put(state, "raging-goblin", them);
      const selector: TargetSelector = { kind: "permanent", color: "U" };

      expect(isValidTarget(state, selector, { kind: "card", instanceId: blueThing.instanceId }, me)).toBe(
        true,
      );
      expect(isValidTarget(state, selector, { kind: "card", instanceId: redThing.instanceId }, me)).toBe(
        false,
      );
    });

    it("Pyroblast may be pointed at anything and does nothing to a red one", () => {
      const { state, me, them } = game();
      const redThing = put(state, "raging-goblin", them);
      const pyroblast = TEST_CARD_DEFINITIONS["pyroblast"]!.castEffect!;
      if (pyroblast.kind !== "modal") throw new Error("Pyroblast should be modal");
      const destroyMode = pyroblast.modes[1]!.effect;

      // Legal target: the card says "target permanent", not "target blue permanent".
      expect(
        isValidTarget(state, { kind: "permanent" }, { kind: "card", instanceId: redThing.instanceId }, me),
      ).toBe(true);

      applyEffect(state, me, "spell", destroyMode, [{ kind: "card", instanceId: redThing.instanceId }]);
      expect(findInstance(state, redThing.instanceId)?.instance.zone).toBe("battlefield");
    });

    it("Pyroblast destroys the blue one", () => {
      const { state, me, them } = game();
      const blueThing = put(state, "wind-drake", them);
      const pyroblast = TEST_CARD_DEFINITIONS["pyroblast"]!.castEffect!;
      if (pyroblast.kind !== "modal") throw new Error("Pyroblast should be modal");

      applyEffect(state, me, "spell", pyroblast.modes[1]!.effect, [
        { kind: "card", instanceId: blueThing.instanceId },
      ]);
      expect(findInstance(state, blueThing.instanceId)?.instance.zone).toBe("graveyard");
    });
  });

  describe("Angrath's Marauders", () => {
    it("doubles damage from a source its controller owns", () => {
      const { state, me, them } = game();
      put(state, "angraths-marauders", me);
      const source = put(state, "raging-goblin", me);

      damagePlayer(state, requirePlayer(state, them), 3, { sourceInstanceId: source.instanceId });
      expect(requirePlayer(state, them).life).toBe(34);
    });

    it("does not double an opponent's damage", () => {
      const { state, me, them } = game();
      put(state, "angraths-marauders", me);
      const theirSource = put(state, "raging-goblin", them);

      damagePlayer(state, requirePlayer(state, me), 3, { sourceInstanceId: theirSource.instanceId });
      expect(requirePlayer(state, me).life).toBe(37);
    });

    it("doubles damage to creatures too", () => {
      const { state, me, them } = game();
      put(state, "angraths-marauders", me);
      const source = put(state, "raging-goblin", me);
      const victim = put(state, "grizzly-bears", them);

      damageCreature(state, victim, 1, { sourceInstanceId: source.instanceId });
      expect(victim.damageMarked).toBe(2);
      checkStateBasedActions(state);
      expect(effectiveToughness(state, victim)).toBe(2);
      expect(findInstance(state, victim.instanceId)?.instance.zone).toBe("graveyard");
    });

    it("two of them make it four times, not three", () => {
      const { state, me, them } = game();
      put(state, "angraths-marauders", me);
      put(state, "angraths-marauders", me);
      const source = put(state, "raging-goblin", me);

      damagePlayer(state, requirePlayer(state, them), 1, { sourceInstanceId: source.instanceId });
      expect(requirePlayer(state, them).life).toBe(36);
    });

    it("leaves damage with no source alone", () => {
      const { state, me, them } = game();
      put(state, "angraths-marauders", me);
      damagePlayer(state, requirePlayer(state, them), 3);
      expect(requirePlayer(state, them).life).toBe(37);
    });
  });
});
