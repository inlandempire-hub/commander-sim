import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { declareAttackers } from "../combat.js";
import { advanceStep } from "../turn.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { chooseTriggerTargets } from "../permanents.js";
import { hasKeyword } from "../counters.js";
import { manaValue } from "../mana.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

/**
 * Batch 4 of the Winota list: a turn with more than one combat phase.
 *
 * The turn machine had exactly one, and a fixed sequence of steps to walk. The
 * thing worth testing hardest is not that a second phase happens - it is that
 * the second one is a real combat phase, with combat cleared and creatures
 * that can attack again, and that neither card can hand out phases forever.
 */
describe("an additional combat phase", () => {
  /** Combat open on alice's turn, with nothing declared yet. */
  function inCombat(): { state: GameState; alice: string; bob: string } {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    state.combatPhasesThisTurn = 1;
    return { state, alice: state.players[0]!.id, bob: state.players[1]!.id };
  }

  it("the pool contains the three cards these tests assume", () => {
    // Guards the fixtures rather than the engine - a rename would otherwise
    // make every test below pass for the wrong reason.
    expect(TEST_CARD_DEFINITIONS["combat-celebrant"]?.name).toBe("Combat Celebrant");
    expect(TEST_CARD_DEFINITIONS["raph-and-leo-sibling-rivals"]?.name).toBe("Raph & Leo, Sibling Rivals");
    expect(TEST_CARD_DEFINITIONS["blade-historian"]?.name).toBe("Blade Historian");
  });

  describe("the turn machine", () => {
    it("goes back to begin-combat instead of on to the main phase", () => {
      const { state } = inCombat();
      state.step = "end-combat";
      state.extraCombatPhases = 1;

      advanceStep(state);

      expect(state.phase).toBe("combat");
      expect(state.step).toBe("begin-combat");
      // Spent, so the phase is granted once and not every time round.
      expect(state.extraCombatPhases).toBe(0);
      expect(state.combatPhasesThisTurn).toBe(2);
    });

    it("carries on to the postcombat main phase when none is owed", () => {
      const { state } = inCombat();
      state.step = "end-combat";

      advanceStep(state);

      expect(state.phase).toBe("postcombat-main");
    });

    it("does not owe an extra phase to the next player's turn", () => {
      const { state } = inCombat();
      state.extraCombatPhases = 2;
      state.phase = "ending";
      state.step = "cleanup";

      advanceStep(state);

      expect(state.turnNumber).toBe(2);
      expect(state.extraCombatPhases).toBe(0);
      expect(state.combatPhasesThisTurn).toBe(0);
    });
  });

  describe("Combat Celebrant", () => {
    /** The Celebrant plus one other creature of alice's, already tapped. */
    function setUp() {
      const { state, alice, bob } = inCombat();
      const celebrant = createCardInstance(state, "combat-celebrant", alice, "battlefield");
      celebrant.summoningSickness = false;
      const other = createCardInstance(state, "grizzly-bears", alice, "battlefield");
      other.summoningSickness = false;
      other.tapped = true;
      return { state, alice, bob, celebrant, other };
    }

    it("asks before exerting, and does nothing at all if declined", () => {
      const { state, alice, bob, celebrant, other } = setUp();
      declareAttackers(state, alice, [{ attackerInstanceId: celebrant.instanceId, defendingPlayerId: bob }]);
      resolveTopOfStack(state);

      expect(state.pendingConfirmation?.playerId).toBe(alice);
      resolveConfirmation(state, alice, false);

      expect(celebrant.exerted).toBe(false);
      expect(other.tapped).toBe(true);
      expect(state.extraCombatPhases).toBe(0);
    });

    it("untaps your other creatures, stays tapped itself, and owes a phase", () => {
      const { state, alice, bob, celebrant, other } = setUp();
      declareAttackers(state, alice, [{ attackerInstanceId: celebrant.instanceId, defendingPlayerId: bob }]);
      resolveTopOfStack(state);
      resolveConfirmation(state, alice, true);

      expect(celebrant.exerted).toBe(true);
      // "all **other** creatures" - the Celebrant attacked, so it is tapped and
      // this is the one creature its own ability does not reach.
      expect(celebrant.tapped).toBe(true);
      expect(other.tapped).toBe(false);
      expect(state.extraCombatPhases).toBe(1);
    });

    it("an untapped creature the ability reaches is left alone rather than tapped", () => {
      const { state, alice, bob, celebrant } = setUp();
      const fresh = createCardInstance(state, "grizzly-bears", alice, "battlefield");
      fresh.summoningSickness = false;

      declareAttackers(state, alice, [{ attackerInstanceId: celebrant.instanceId, defendingPlayerId: bob }]);
      resolveTopOfStack(state);
      resolveConfirmation(state, alice, true);

      expect(fresh.tapped).toBe(false);
    });

    it("does not offer the choice a second time in the same turn", () => {
      const { state, alice, bob, celebrant } = setUp();
      celebrant.exerted = true;
      // Something untapped it - a second Celebrant, or Raph & Leo.
      celebrant.tapped = false;

      declareAttackers(state, alice, [{ attackerInstanceId: celebrant.instanceId, defendingPlayerId: bob }]);

      // The intervening-if is false, so the ability never reaches the stack.
      expect(state.stack.length).toBe(0);
    });
  });

  describe("exert", () => {
    it("skips the untap step once, then untaps normally the turn after", () => {
      const state = makeTestGame();
      const alice = state.players[0]!;
      const celebrant = createCardInstance(state, "combat-celebrant", alice.id, "battlefield");
      celebrant.tapped = true;
      celebrant.exerted = true;

      // Bob's turn ending, so the next untap step is alice's.
      state.activePlayerIndex = 1;
      state.phase = "ending";
      state.step = "cleanup";
      advanceStep(state);

      expect(state.players[state.activePlayerIndex]!.id).toBe(alice.id);
      expect(celebrant.tapped).toBe(true);
      // Spent here: the flag is what "your **next** untap step" means.
      expect(celebrant.exerted).toBe(false);
      // Being exerted is not being new - summoning sickness still wears off.
      expect(celebrant.summoningSickness).toBe(false);

      // Round again, and it untaps like anything else.
      state.activePlayerIndex = 1;
      state.phase = "ending";
      state.step = "cleanup";
      advanceStep(state);
      expect(celebrant.tapped).toBe(false);
    });
  });

  describe("Raph & Leo, Sibling Rivals", () => {
    function setUp() {
      const { state, alice, bob } = inCombat();
      const raph = createCardInstance(state, "raph-and-leo-sibling-rivals", alice, "battlefield");
      raph.summoningSickness = false;
      const bear = createCardInstance(state, "grizzly-bears", alice, "battlefield");
      bear.summoningSickness = false;
      return { state, alice, bob, raph, bear };
    }

    it("costs three mana, two of them hybrid", () => {
      // The first hybrid cost in the pool, and the only thing that was ever
      // blocking this card.
      const cost = TEST_CARD_DEFINITIONS["raph-and-leo-sibling-rivals"]!.manaCost!;
      expect(cost.hybrid).toEqual([["R", "W"], ["R", "W"]]);
      expect(manaValue(cost)).toBe(3);
    });

    it("offers only attacking creatures, and up to two of them", () => {
      const { state, alice, bob, raph, bear } = setUp();
      const bench = createCardInstance(state, "grizzly-bears", alice, "battlefield");
      bench.summoningSickness = false;

      declareAttackers(state, alice, [
        { attackerInstanceId: raph.instanceId, defendingPlayerId: bob },
        { attackerInstanceId: bear.instanceId, defendingPlayerId: bob },
      ]);

      const pending = state.pendingTargetChoices[0]!;
      expect(pending.min).toBe(1);
      expect(pending.max).toBe(2);
      const offered = pending.candidates
        .filter((c): c is Extract<typeof c, { kind: "card" }> => c.kind === "card")
        .map((c) => c.instanceId);
      expect(offered).toContain(raph.instanceId);
      expect(offered).toContain(bear.instanceId);
      // The creature that stayed home is not a legal target, whatever else it is.
      expect(offered).not.toContain(bench.instanceId);
    });

    it("untaps both chosen attackers, which stay attacking", () => {
      const { state, alice, bob, raph, bear } = setUp();
      declareAttackers(state, alice, [
        { attackerInstanceId: raph.instanceId, defendingPlayerId: bob },
        { attackerInstanceId: bear.instanceId, defendingPlayerId: bob },
      ]);
      expect(raph.tapped).toBe(true);
      expect(bear.tapped).toBe(true);

      chooseTriggerTargets(state, alice, [
        { kind: "card", instanceId: raph.instanceId },
        { kind: "card", instanceId: bear.instanceId },
      ]);
      resolveTopOfStack(state);

      expect(raph.tapped).toBe(false);
      expect(bear.tapped).toBe(false);
      // Untapping does not remove a creature from combat - the whole trick.
      expect(state.attackers[raph.instanceId]).toBe(bob);
      expect(state.attackers[bear.instanceId]).toBe(bob);
      expect(state.extraCombatPhases).toBe(1);
    });

    it("refuses more targets than the card offers", () => {
      const { state, alice, bob, raph, bear } = setUp();
      const third = createCardInstance(state, "grizzly-bears", alice, "battlefield");
      third.summoningSickness = false;
      declareAttackers(state, alice, [
        { attackerInstanceId: raph.instanceId, defendingPlayerId: bob },
        { attackerInstanceId: bear.instanceId, defendingPlayerId: bob },
        { attackerInstanceId: third.instanceId, defendingPlayerId: bob },
      ]);

      expect(() =>
        chooseTriggerTargets(state, alice, [
          { kind: "card", instanceId: raph.instanceId },
          { kind: "card", instanceId: bear.instanceId },
          { kind: "card", instanceId: third.instanceId },
        ]),
      ).toThrow(/between 1 and 2/);
    });

    it("refuses the same target named twice", () => {
      const { state, alice, bob, raph, bear } = setUp();
      declareAttackers(state, alice, [
        { attackerInstanceId: raph.instanceId, defendingPlayerId: bob },
        { attackerInstanceId: bear.instanceId, defendingPlayerId: bob },
      ]);

      expect(() =>
        chooseTriggerTargets(state, alice, [
          { kind: "card", instanceId: raph.instanceId },
          { kind: "card", instanceId: raph.instanceId },
        ]),
      ).toThrow(/twice/);
    });

    it("does nothing in the second combat phase, which is what stops the loop", () => {
      const { state, alice, bob, raph } = setUp();
      state.combatPhasesThisTurn = 2;

      declareAttackers(state, alice, [{ attackerInstanceId: raph.instanceId, defendingPlayerId: bob }]);

      expect(state.stack.length).toBe(0);
      expect(state.pendingTargetChoices.length).toBe(0);
      expect(state.extraCombatPhases).toBe(0);
    });
  });

  describe("Blade Historian", () => {
    it("gives double strike to attacking creatures you control, itself included", () => {
      const { state, alice, bob } = inCombat();
      const historian = createCardInstance(state, "blade-historian", alice, "battlefield");
      historian.summoningSickness = false;
      const bear = createCardInstance(state, "grizzly-bears", alice, "battlefield");
      bear.summoningSickness = false;
      const bench = createCardInstance(state, "grizzly-bears", alice, "battlefield");
      bench.summoningSickness = false;

      expect(hasKeyword(state, bear, "Double Strike")).toBe(false);

      declareAttackers(state, alice, [
        { attackerInstanceId: historian.instanceId, defendingPlayerId: bob },
        { attackerInstanceId: bear.instanceId, defendingPlayerId: bob },
      ]);

      expect(hasKeyword(state, bear, "Double Strike")).toBe(true);
      // No "other" on the card, so it arms itself when it attacks.
      expect(hasKeyword(state, historian, "Double Strike")).toBe(true);
      // "Attacking" is a real narrowing - the creature that stayed home has nothing.
      expect(hasKeyword(state, bench, "Double Strike")).toBe(false);
    });

    it("does not reach an opponent's attackers", () => {
      const { state, alice, bob } = inCombat();
      const historian = createCardInstance(state, "blade-historian", alice, "battlefield");
      historian.summoningSickness = false;
      const theirs = createCardInstance(state, "grizzly-bears", bob, "battlefield");
      theirs.summoningSickness = false;
      state.attackers[theirs.instanceId] = alice;

      expect(hasKeyword(state, theirs, "Double Strike")).toBe(false);
    });
  });
});
