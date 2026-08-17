import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { activateAbility } from "../abilities.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { blockProblem, declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { blockRestrictionsOn, describeBlockRestriction } from "../blocking.js";
import { effectivePower } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * "Can't be blocked except by ..." - the evasion family, which is a restriction
 * on *which* creatures may block rather than on how many.
 *
 * Signal Pest prints one; Gingerbrute grants itself one for a turn; flying is the
 * same rule with its keywords in the reminder text, so it is tested here too -
 * that unification is the change, and a test suite that only covered the two new
 * cards would not notice flying quietly breaking.
 */
describe("block restrictions", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    // Gingerbrute's ability costs {1}, and `activateAbility` pays from the pool
    // rather than tapping lands on the player's behalf - that is the client's
    // job. Floating a few generic saves every test standing up a mana base.
    state.players[0]!.manaPool.generic = 5;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  /** Walk from a main phase to declare-blockers with one attacker declared. */
  function attackWith(state: GameState, me: string, attacker: CardInstance): void {
    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [
      { attackerInstanceId: attacker.instanceId, defendingPlayerId: state.players[1]!.id },
    ]);
    state.step = "declare-blockers";
  }

  describe("Signal Pest - printed on the card", () => {
    it("cannot be blocked by a creature with neither flying nor reach", () => {
      const { state, me, them } = game();
      const pest = put(state, "signal-pest", me);
      const bears = put(state, "grizzly-bears", them);
      attackWith(state, me, pest);

      const problem = blockProblem(state, them, bears.instanceId, pest.instanceId);
      expect(problem).toContain("can only be blocked by creatures with flying or reach");
    });

    it("can be blocked by a flier", () => {
      const { state, me, them } = game();
      const pest = put(state, "signal-pest", me);
      const flier = put(state, "wind-drake", them);
      attackWith(state, me, pest);

      expect(blockProblem(state, them, flier.instanceId, pest.instanceId)).toBeNull();
    });

    it("can be blocked by reach, which is the other half of the printed phrase", () => {
      const { state, me, them } = game();
      const pest = put(state, "signal-pest", me);
      const spider = put(state, "giant-spider", them);
      attackWith(state, me, pest);

      expect(blockProblem(state, them, spider.instanceId, pest.instanceId)).toBeNull();
    });
  });

  describe("battle cry", () => {
    it("pumps the other attackers and not itself", () => {
      const { state, me } = game();
      const pest = put(state, "signal-pest", me);
      const bears = put(state, "grizzly-bears", me);

      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [
        { attackerInstanceId: pest.instanceId, defendingPlayerId: state.players[1]!.id },
        { attackerInstanceId: bears.instanceId, defendingPlayerId: state.players[1]!.id },
      ]);
      resolveTopOfStack(state);

      expect(effectivePower(state, bears)).toBe(3);
      // A 0/1 that pumped itself would be a 1/1 attacker, which is not the card.
      expect(effectivePower(state, pest)).toBe(0);
    });

    it("does not reach a creature that stayed home", () => {
      const { state, me } = game();
      const pest = put(state, "signal-pest", me);
      const homebody = put(state, "grizzly-bears", me);

      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [
        { attackerInstanceId: pest.instanceId, defendingPlayerId: state.players[1]!.id },
      ]);
      resolveTopOfStack(state);

      expect(effectivePower(state, homebody)).toBe(2);
    });
  });

  describe("Gingerbrute - granted for the turn", () => {
    it("is blockable by anything until the ability is used", () => {
      const { state, me, them } = game();
      const brute = put(state, "gingerbrute", me);
      const bears = put(state, "grizzly-bears", them);
      attackWith(state, me, brute);

      expect(blockProblem(state, them, bears.instanceId, brute.instanceId)).toBeNull();
    });

    it("can only be blocked by haste once activated", () => {
      const { state, me, them } = game();
      const brute = put(state, "gingerbrute", me);
      const bears = put(state, "grizzly-bears", them);
      const hasty = put(state, "raging-goblin", them);

      activateAbility(state, me, brute.instanceId, 0);
      resolveTopOfStack(state);
      attackWith(state, me, brute);

      expect(blockProblem(state, them, bears.instanceId, brute.instanceId)).toContain(
        "can only be blocked by creatures with haste",
      );
      expect(blockProblem(state, them, hasty.instanceId, brute.instanceId)).toBeNull();
    });

    it("wears off in the cleanup step", () => {
      const { state, me } = game();
      const brute = put(state, "gingerbrute", me);

      activateAbility(state, me, brute.instanceId, 0);
      resolveTopOfStack(state);
      expect(brute.blockRestrictionsThisTurn).toHaveLength(1);

      /*
       * Round the turn to its cleanup, where the rest of the until-end-of-turn
       * state is cleared. Cleanup never holds priority, so one step from the end
       * step runs it and carries on into the next turn - which is why the
       * assertion is about the restriction rather than about the step.
       */
      state.phase = "ending";
      state.step = "end";
      advanceStep(state);
      expect(brute.blockRestrictionsThisTurn).toHaveLength(0);
    });

    it("still deals its damage when nothing can legally block", () => {
      const { state, me, them } = game();
      const brute = put(state, "gingerbrute", me);
      put(state, "grizzly-bears", them);

      activateAbility(state, me, brute.instanceId, 0);
      resolveTopOfStack(state);
      attackWith(state, me, brute);
      declareBlockers(state, them, []);
      dealCombatDamage(state);

      expect(state.players[1]!.life).toBe(39);
    });
  });

  describe("restrictions accumulate", () => {
    it("a flying attacker that also demands haste needs a blocker with both", () => {
      const { state, me, them } = game();
      const brute = put(state, "gingerbrute", me);
      brute.grantedKeywords.push("Flying");
      const hastyGround = put(state, "raging-goblin", them);
      const flier = put(state, "wind-drake", them);

      activateAbility(state, me, brute.instanceId, 0);
      resolveTopOfStack(state);
      attackWith(state, me, brute);

      expect(blockRestrictionsOn(state, brute)).toHaveLength(2);
      // Hasty but earthbound, and airborne but slow: each fails a different half.
      expect(blockProblem(state, them, hastyGround.instanceId, brute.instanceId)).toContain("flying or reach");
      expect(blockProblem(state, them, flier.instanceId, brute.instanceId)).toContain("haste");
    });

    it("does not restrict blocking in the other direction", () => {
      const { state, me, them } = game();
      // A Signal Pest on defence blocks whatever it likes: the restriction is on
      // being blocked, not on blocking, and reading it the other way round is the
      // mistake that would make every one of these cards better than printed.
      const attacker = put(state, "grizzly-bears", them);
      const pest = put(state, "signal-pest", me);
      state.activePlayerIndex = 1;
      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, them, [
        { attackerInstanceId: attacker.instanceId, defendingPlayerId: me },
      ]);
      state.step = "declare-blockers";

      expect(blockProblem(state, me, pest.instanceId, attacker.instanceId)).toBeNull();
    });
  });

  it("prints the phrase the card prints", () => {
    expect(describeBlockRestriction({ kind: "only-with-keyword", keywords: ["Flying", "Reach"] })).toBe(
      "creatures with flying or reach",
    );
    expect(describeBlockRestriction({ kind: "only-with-keyword", keywords: ["Haste"] })).toBe(
      "creatures with haste",
    );
  });
});
