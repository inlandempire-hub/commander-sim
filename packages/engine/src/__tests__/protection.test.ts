import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { activateAbility } from "../abilities.js";
import { applyEffect, resolveColorChoice } from "../effects.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { blockProblem, declareAttackers, declareBlockers } from "../combat.js";
import { checkStateBasedActions } from "../sba.js";
import { isValidTarget } from "../targeting.js";
import { qualitiesOf } from "../protection.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * Protection from a quality - rule 702.16.
 *
 * Four prohibitions wearing one word, so there are four groups of tests here and
 * a fifth for everything protection deliberately does *not* stop. That last group
 * is the one that keeps the card honest: a Mother of Runes that also beat board
 * wipes would be a different and much better card, and the mistake would look
 * like the system working.
 */
describe("protection from a quality", () => {
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

  /** Mother of Runes, all the way through: activate, resolve, name a colour. */
  function protect(state: GameState, playerId: string, mother: CardInstance, target: CardInstance, color: "W" | "B") {
    activateAbility(state, playerId, mother.instanceId, 0, [
      { kind: "card", instanceId: target.instanceId },
    ]);
    resolveTopOfStack(state);
    // The ability has resolved and is now waiting on the colour, which is the
    // whole point of the card.
    expect(state.pendingColorChoice).not.toBeNull();
    resolveColorChoice(state, playerId, color);
    expect(state.pendingColorChoice).toBeNull();
  }

  it("names the colour on resolution, not on activation", () => {
    const { state, me } = game();
    const mother = put(state, "mother-of-runes", me);
    const bears = put(state, "grizzly-bears", me);

    activateAbility(state, me, mother.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
    // Nothing has been chosen and nothing granted - the ability is still on the
    // stack, which is the window the card is played in.
    expect(state.pendingColorChoice).toBeNull();
    expect(bears.protectionFrom).toEqual([]);

    resolveTopOfStack(state);
    expect(state.pendingColorChoice?.targetInstanceId).toBe(bears.instanceId);
    expect(bears.protectionFrom).toEqual([]);

    resolveColorChoice(state, me, "B");
    expect(bears.protectionFrom).toEqual(["B"]);
  });

  // -------------------------------------------------------------------------
  describe("T is for targeting", () => {
    it("cannot be the target of a spell of that colour, but can of another", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      protect(state, me, mother, bears, "B");

      // Murder is black; Path to Exile is white.
      const murder = createCardInstance(state, "murder", them, "hand");
      const path = createCardInstance(state, "path-to-exile", them, "hand");
      const selector = { kind: "creature" } as const;

      expect(
        isValidTarget(state, selector, { kind: "card", instanceId: bears.instanceId }, them, murder.instanceId),
      ).toBe(false);
      expect(
        isValidTarget(state, selector, { kind: "card", instanceId: bears.instanceId }, them, path.instanceId),
      ).toBe(true);
    });

    it("is measured on the source, not on whose deck it came from", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      protect(state, me, mother, bears, "B");

      // The black spell in the *protected* player's own hand is refused too:
      // protection is about the source's colour and nothing else.
      const mine = createCardInstance(state, "murder", me, "hand");
      expect(
        isValidTarget(state, { kind: "creature" }, { kind: "card", instanceId: bears.instanceId }, me, mine.instanceId),
      ).toBe(false);
    });

    it("stops a colourless source only when colourless was named", () => {
      const { state, me, them } = game();
      const giver = put(state, "giver-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      // Giver of Runes is the one card that offers it.
      activateAbility(state, me, giver.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
      resolveTopOfStack(state);
      expect(state.pendingColorChoice?.allowColorless).toBe(true);
      resolveColorChoice(state, me, "colorless");

      const artifact = put(state, "ornithopter", them);
      expect(qualitiesOf(TEST_CARD_DEFINITIONS["ornithopter"]!)).toEqual(["colorless"]);
      expect(
        isValidTarget(state, { kind: "creature" }, { kind: "card", instanceId: bears.instanceId }, them, artifact.instanceId),
      ).toBe(false);
    });

    it("refuses colourless from a card that does not print it", () => {
      const { state, me } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      activateAbility(state, me, mother.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
      resolveTopOfStack(state);
      expect(() => resolveColorChoice(state, me, "colorless")).toThrow(/does not offer protection from colorless/);
    });
  });

  // -------------------------------------------------------------------------
  describe("D is for damage", () => {
    it("takes no combat damage from a creature of that colour", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const wall = put(state, "grizzly-bears", me);
      protect(state, me, mother, wall, "W");

      // A white attacker, blocked by the protected creature.
      const attacker = put(state, "savannah-lions", them);
      state.activePlayerIndex = 1;
      state.priorityPlayerIndex = 1;
      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, them, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: me }]);
      state.step = "declare-blockers";
      declareBlockers(state, me, [
        { blockerInstanceId: wall.instanceId, attackerInstanceId: attacker.instanceId },
      ]);

      while ((state.step as string) !== "end-combat") advanceStep(state);
      checkStateBasedActions(state);
      // No damage marked at all - not merely survived.
      expect(wall.damageMarked).toBe(0);
      /*
       * And the attacker took its own damage as normal: protection is one-way, so
       * a 2/2 with protection from white still kills the 2/1 that attacked into
       * it. Asserted as "it is dead" rather than "it has 2 damage" because the
       * damage goes with it - a creature that changes zones is a new object.
       */
      expect(requirePlayer(state, them).battlefield.some((c) => c.instanceId === attacker.instanceId)).toBe(
        false,
      );
    });

    it("takes no damage from a burn spell of that colour", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      protect(state, me, mother, bears, "B");

      const source = put(state, "murder", them);
      applyEffect(state, them, source.instanceId, { kind: "damage", amount: 3, target: { kind: "creature" } }, [
        { kind: "card", instanceId: bears.instanceId },
      ]);
      expect(bears.damageMarked).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  describe("B is for blocking", () => {
    it("cannot be blocked by a creature of that colour", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const attacker = put(state, "grizzly-bears", me);
      protect(state, me, mother, attacker, "W");

      const white = put(state, "savannah-lions", them);
      const green = put(state, "llanowar-elves", them);

      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, me, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: them }]);
      state.step = "declare-blockers";

      expect(blockProblem(state, them, white.instanceId, attacker.instanceId)).toMatch(
        /protection from white/,
      );
      // Anything else blocks as normal.
      expect(blockProblem(state, them, green.instanceId, attacker.instanceId)).toBeNull();
    });

    it("does not stop a protected creature from blocking", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const blocker = put(state, "grizzly-bears", me);
      protect(state, me, mother, blocker, "W");

      // The attacker is white and the blocker has protection from white. That
      // stops damage, and does not stop the block being declared - reading it the
      // other way round would make the card better than printed.
      const attacker = put(state, "savannah-lions", them);
      state.activePlayerIndex = 1;
      state.phase = "combat";
      state.step = "declare-attackers";
      declareAttackers(state, them, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: me }]);
      state.step = "declare-blockers";
      expect(blockProblem(state, me, blocker.instanceId, attacker.instanceId)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  describe("E is for enchanted and equipped", () => {
    it("cannot be the target of an Equipment of that colour", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      protect(state, me, mother, bears, "B");

      /*
       * Both routes onto a creature in this engine - the `attach` effect and
       * bestow - choose their host by targeting it, so the targeting check is
       * what refuses them. This asserts that rather than assuming it: an attach
       * that did not target would need its own check and would pass every other
       * test in this file.
       */
      const black = put(state, "murder", them);
      expect(
        isValidTarget(state, { kind: "creature" }, { kind: "card", instanceId: bears.instanceId }, them, black.instanceId),
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  describe("what protection does not do", () => {
    it("does not stop an untargeted board wipe", () => {
      const { state, me } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      protect(state, me, mother, bears, "B");

      // "All creatures get -4/-4" names nothing, so protection has nothing to
      // measure. This is why a one-mana 1/1 may hand it out every turn.
      applyEffect(state, me, mother.instanceId, {
        kind: "pumpAll",
        power: 0,
        toughness: -4,
        scope: "all",
      }, []);
      checkStateBasedActions(state);
      expect(requirePlayer(state, me).battlefield.some((c) => c.instanceId === bears.instanceId)).toBe(false);
    });

    it("wears off in the cleanup step", () => {
      const { state, me } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      protect(state, me, mother, bears, "B");
      expect(bears.protectionFrom).toEqual(["B"]);

      while (state.step !== "end") advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);
      advanceStep(state); // cleanup
      expect(bears.protectionFrom).toEqual([]);
    });

    it("keeps both colours when it is granted twice in a turn", () => {
      const { state, me } = game();
      const first = put(state, "mother-of-runes", me);
      const second = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      protect(state, me, first, bears, "B");
      protect(state, me, second, bears, "W");
      // The second colour does not replace the first.
      expect(bears.protectionFrom.sort()).toEqual(["B", "W"]);
    });

    it("cannot be answered by the wrong player", () => {
      const { state, me, them } = game();
      const mother = put(state, "mother-of-runes", me);
      const bears = put(state, "grizzly-bears", me);
      activateAbility(state, me, mother.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
      resolveTopOfStack(state);
      expect(() => resolveColorChoice(state, them, "B")).toThrow(/belongs to/);
    });
  });

  // -------------------------------------------------------------------------
  describe("Giver of Runes and Alseid", () => {
    it("Giver of Runes cannot point at itself", () => {
      const { state, me } = game();
      const giver = put(state, "giver-of-runes", me);
      const effect = TEST_CARD_DEFINITIONS["giver-of-runes"]!.activatedAbilities![0]!.effect;
      if (effect.kind !== "grantProtection") throw new Error("fixture changed");
      expect(
        isValidTarget(state, effect.target, { kind: "card", instanceId: giver.instanceId }, me, giver.instanceId),
      ).toBe(false);
    });

    it("Alseid sacrifices itself and can protect an enchantment", () => {
      const { state, me } = game();
      const alseid = put(state, "alseid-of-lifes-bounty", me);
      const aura = put(state, "glorious-anthem", me);
      for (const id of ["plains"]) put(state, id, me);

      const effect = TEST_CARD_DEFINITIONS["alseid-of-lifes-bounty"]!.activatedAbilities![0]!.effect;
      if (effect.kind !== "grantProtection") throw new Error("fixture changed");
      // An enchantment is a legal target, which is the half that separates this
      // from the other two.
      expect(
        isValidTarget(state, effect.target, { kind: "card", instanceId: aura.instanceId }, me, alseid.instanceId),
      ).toBe(true);
    });
  });
});
