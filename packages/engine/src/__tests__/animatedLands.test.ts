import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, requirePlayer } from "../state.js";
import { activateAbility, activatableAbilities } from "../abilities.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { attackProblem, declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { checkStateBasedActions } from "../sba.js";
import { damageCreature } from "../damage.js";
import { effectivePower, effectiveToughness, hasKeyword, typesOf } from "../counters.js";
import { isValidTarget } from "../targeting.js";
import type { CardInstance, GameState, TargetSelector } from "../types.js";

/**
 * Lands that become creatures - Blinkmoth Nexus and Inkmoth Nexus.
 *
 * The point of the card is that it is *not* a creature most of the time: it
 * dodges every sorcery-speed wrath and every "destroy target creature", and turns
 * into a threat only in the window where it matters. So the tests come in pairs -
 * what it is before the ability, and what it is after.
 */
describe("lands that become creatures", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    state.players[0]!.manaPool.generic = 6;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  /** {1}: becomes a 1/1. */
  function animate(state: GameState, playerId: string, land: CardInstance): void {
    activateAbility(state, playerId, land.instanceId, 1);
    resolveTopOfStack(state);
  }

  describe("before the ability, it is only a land", () => {
    it("is not a creature and cannot attack", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);

      expect(typesOf(state, nexus)).toEqual(["Land"]);
      expect(attackProblem(state, me, nexus.instanceId)).toContain("not a creature");
    });

    it("is not a legal target for target creature", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      expect(
        isValidTarget(state, { kind: "creature" }, { kind: "card", instanceId: nexus.instanceId }, me),
      ).toBe(false);
    });

    it("does not die to state-based actions with no toughness", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      checkStateBasedActions(state);
      expect(findInstance(state, nexus.instanceId)?.instance.zone).toBe("battlefield");
    });
  });

  describe("after the ability", () => {
    it("is a 1/1 artifact creature and still a land", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      animate(state, me, nexus);

      // "It's still a land" - the types are added, not swapped.
      expect(typesOf(state, nexus)).toEqual(["Land", "Artifact", "Creature"]);
      expect(effectivePower(state, nexus)).toBe(1);
      expect(effectiveToughness(state, nexus)).toBe(1);
      expect(hasKeyword(state, nexus, "Flying")).toBe(true);
    });

    it("can attack", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      animate(state, me, nexus);

      expect(attackProblem(state, me, nexus.instanceId)).toBeNull();
      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [
        { attackerInstanceId: nexus.instanceId, defendingPlayerId: state.players[1]!.id },
      ]);
      state.step = "declare-blockers";
      declareBlockers(state, state.players[1]!.id, []);
      dealCombatDamage(state);
      expect(state.players[1]!.life).toBe(39);
    });

    it("dies to a single point of damage", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      animate(state, me, nexus);

      damageCreature(state, nexus, 1, {});
      checkStateBasedActions(state);
      expect(findInstance(state, nexus.instanceId)?.instance.zone).toBe("graveyard");
    });

    it("stops being a creature in the cleanup step", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      animate(state, me, nexus);

      state.phase = "ending";
      state.step = "end";
      advanceStep(state);

      expect(nexus.animation).toBeUndefined();
      expect(typesOf(state, nexus)).toEqual(["Land"]);
    });

    it("does not stack: a second activation is another 1/1, not a 2/2", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      animate(state, me, nexus);
      animate(state, me, nexus);
      expect(effectivePower(state, nexus)).toBe(1);
    });
  });

  describe("Blinkmoth Nexus pumps Blinkmoths, including itself", () => {
    it("sees the creature type the animation granted", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      const other = put(state, "blinkmoth-nexus", me);
      animate(state, me, other);

      // The pump ability targets "Blinkmoth creature" - the animated one qualifies
      // and the un-animated one does not, because it is not a creature at all.
      const selector: TargetSelector = { kind: "creature", subtypes: ["Blinkmoth"] };
      expect(isValidTarget(state, selector, { kind: "card", instanceId: other.instanceId }, me)).toBe(true);
      expect(isValidTarget(state, selector, { kind: "card", instanceId: nexus.instanceId }, me)).toBe(false);

      activateAbility(state, me, nexus.instanceId, 2, [{ kind: "card", instanceId: other.instanceId }]);
      resolveTopOfStack(state);
      expect(effectivePower(state, other)).toBe(2);
      expect(effectiveToughness(state, other)).toBe(2);
    });

    it("has no legal pump target with nothing animated, so the ability is not offered", () => {
      const { state, me } = game();
      const nexus = put(state, "blinkmoth-nexus", me);
      // The mana ability and the animate ability, but not the pump - there is no
      // Blinkmoth creature anywhere to point it at.
      expect(activatableAbilities(state, me, nexus.instanceId)).toEqual([0, 1]);
    });
  });

  describe("Inkmoth Nexus", () => {
    it("deals its damage as poison counters", () => {
      const { state, me, them } = game();
      const nexus = put(state, "inkmoth-nexus", me);
      animate(state, me, nexus);
      expect(hasKeyword(state, nexus, "Infect")).toBe(true);

      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [{ attackerInstanceId: nexus.instanceId, defendingPlayerId: them }]);
      state.step = "declare-blockers";
      declareBlockers(state, them, []);
      dealCombatDamage(state);

      // Infect: the life total is untouched and a poison counter arrives instead.
      expect(requirePlayer(state, them).life).toBe(40);
      expect(requirePlayer(state, them).poisonCounters).toBe(1);
    });

    it("is both a Phyrexian and a Blinkmoth while animated", () => {
      const { state, me } = game();
      const nexus = put(state, "inkmoth-nexus", me);
      animate(state, me, nexus);
      expect(nexus.animation?.subtypes).toEqual(["Phyrexian", "Blinkmoth"]);
    });
  });

  describe("summoning sickness follows what it is now", () => {
    it("a land animated the turn it arrived cannot attack or tap for mana", () => {
      const { state, me } = game();
      const nexus = createCardInstance(state, "blinkmoth-nexus", me, "battlefield");
      enteredBattlefield(state, nexus);
      // Left summoning-sick, as a land played this turn is.
      animate(state, me, nexus);

      expect(attackProblem(state, me, nexus.instanceId)).toContain("came into play this turn");
      /*
       * And its mana ability is off too, which is the part that surprises people:
       * a {T} ability on something that is a creature right now obeys rule 302.6,
       * so animating a land the turn it arrives costs you its mana.
       */
      expect(activatableAbilities(state, me, nexus.instanceId)).toEqual([1]);
    });
  });
});
