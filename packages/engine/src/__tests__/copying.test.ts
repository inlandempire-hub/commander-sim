import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { advanceStep } from "../turn.js";
import { resolveTopOfStack } from "../stack.js";
import { activateAbility } from "../abilities.js";
import { applyEffect } from "../effects.js";
import { enteredBattlefield } from "../permanents.js";
import { checkStateBasedActions } from "../sba.js";
import { hasKeyword } from "../counters.js";
import { isValidTarget } from "../targeting.js";
import { gainLife } from "../life.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * Batch 5: copying and borrowing.
 *
 * Two families, and the pair of cards that reads the seam between them. Copying
 * something you point at, with an ending scheduled for it; and control coming
 * apart from ownership, which nothing in this engine had ever done.
 */
describe("copying and borrowing", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  /** Puts a permanent onto the battlefield the way the game does, arrival and all. */
  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  /**
   * Whether this permanent is still on the battlefield.
   *
   * `findInstance` is the wrong question for a token: one that leaves the
   * battlefield ceases to exist (rule 111.7) rather than moving to a graveyard,
   * so it is not in any zone to be found.
   */
  function stillInPlay(state: GameState, instanceId: string): boolean {
    return state.players.some((player) =>
      player.battlefield.some((instance) => instance.instanceId === instanceId),
    );
  }

  function battlefieldNames(state: GameState, playerId: string): string[] {
    return requirePlayer(state, playerId)
      .battlefield.map((instance) => state.cardDefinitions[instance.definitionId]!.name)
      .sort();
  }

  // -------------------------------------------------------------------------
  describe("Kiki-Jiki, Mirror Breaker", () => {
    it("copies a creature you control and the copy has haste", () => {
      const { state, me } = game();
      const kiki = put(state, "kiki-jiki-mirror-breaker", me);
      const bears = put(state, "grizzly-bears", me);

      activateAbility(state, me, kiki.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
      resolveTopOfStack(state);

      const copies = requirePlayer(state, me).battlefield.filter(
        (instance) => instance.definitionId === "grizzly-bears" && instance.isTokenCopy,
      );
      expect(copies).toHaveLength(1);
      expect(hasKeyword(state, copies[0]!, "Haste")).toBe(true);
      // A hasty copy is meant to attack the turn it arrives.
      expect(copies[0]!.summoningSickness).toBe(false);
    });

    it("refuses a legendary creature, and refuses one an opponent controls", () => {
      const { state, me, them } = game();
      const kiki = put(state, "kiki-jiki-mirror-breaker", me);
      const mine = put(state, "grizzly-bears", me);
      const theirs = put(state, "grizzly-bears", them);
      const selector = state.cardDefinitions["kiki-jiki-mirror-breaker"]!.activatedAbilities![0]!.effect;
      if (selector.kind !== "createCopyToken" || !selector.target) throw new Error("fixture changed");

      // Itself: legendary, so the legend rule would bin the copy at once.
      expect(
        isValidTarget(state, selector.target, { kind: "card", instanceId: kiki.instanceId }, me, kiki.instanceId),
      ).toBe(false);
      expect(
        isValidTarget(state, selector.target, { kind: "card", instanceId: theirs.instanceId }, me, kiki.instanceId),
      ).toBe(false);
      expect(
        isValidTarget(state, selector.target, { kind: "card", instanceId: mine.instanceId }, me, kiki.instanceId),
      ).toBe(true);
    });

    it("sacrifices the copy at the beginning of the next end step, and only then", () => {
      const { state, me } = game();
      const kiki = put(state, "kiki-jiki-mirror-breaker", me);
      const bears = put(state, "grizzly-bears", me);

      activateAbility(state, me, kiki.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
      resolveTopOfStack(state);
      const copy = requirePlayer(state, me).battlefield.find((i) => i.isTokenCopy)!;

      // Still there through combat - the whole point of making it.
      while (state.step !== "end") advanceStep(state);
      expect(stillInPlay(state, copy.instanceId)).toBe(true);

      // The delayed trigger is on the stack now, not resolved.
      expect(state.stack).toHaveLength(1);
      const deathsBefore = state.creatureDeathsThisTurn;
      resolveTopOfStack(state);
      checkStateBasedActions(state);
      expect(stillInPlay(state, copy.instanceId)).toBe(false);
      // Sacrificing is a death, and that is the whole difference from Rionya.
      expect(state.creatureDeathsThisTurn).toBe(deathsBefore + 1);
      expect(state.delayedTriggers).toHaveLength(0);
    });

    it("waits a whole turn when it is activated during the end step", () => {
      const { state, me } = game();
      const kiki = put(state, "kiki-jiki-mirror-breaker", me);
      const bears = put(state, "grizzly-bears", me);
      while (state.step !== "end") advanceStep(state);
      // Whatever the end step itself fired, out of the way first.
      while (state.stack.length > 0) resolveTopOfStack(state);

      activateAbility(state, me, kiki.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
      resolveTopOfStack(state);
      const copy = requirePlayer(state, me).battlefield.find((i) => i.isTokenCopy)!;
      // "The **next** end step" is the following turn's, not this one over again.
      expect(state.delayedTriggers[0]!.readyOnTurn).toBe(state.turnNumber + 1);

      advanceStep(state); // cleanup
      advanceStep(state); // the next turn begins
      expect(stillInPlay(state, copy.instanceId)).toBe(true);

      while (!(state.phase === "ending" && state.step === "end")) advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);
      checkStateBasedActions(state);
      expect(stillInPlay(state, copy.instanceId)).toBe(false);
    });

    it("does nothing if the creature it was pointed at has already gone", () => {
      const { state, me } = game();
      const kiki = put(state, "kiki-jiki-mirror-breaker", me);
      const bears = put(state, "grizzly-bears", me);

      activateAbility(state, me, kiki.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
      applyEffect(state, me, kiki.instanceId, { kind: "exile", target: { kind: "creature" } }, [
        { kind: "card", instanceId: bears.instanceId },
      ]);
      resolveTopOfStack(state);

      expect(requirePlayer(state, me).battlefield.filter((i) => i.isTokenCopy)).toHaveLength(0);
      // Nothing scheduled either - there is no token to sacrifice later.
      expect(state.delayedTriggers).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  describe("Rionya, Fire Dancer", () => {
    it("makes one copy with no spells cast, and one more for each instant or sorcery", () => {
      const { state, me } = game();
      const rionya = put(state, "rionya-fire-dancer", me);
      put(state, "grizzly-bears", me);
      const trigger = state.cardDefinitions["rionya-fire-dancer"]!.triggeredAbilities![0]!.effect;

      const bears = requirePlayer(state, me).battlefield.find((i) => i.definitionId === "grizzly-bears")!;
      applyEffect(state, me, rionya.instanceId, trigger, [{ kind: "card", instanceId: bears.instanceId }]);
      expect(requirePlayer(state, me).battlefield.filter((i) => i.isTokenCopy)).toHaveLength(1);

      // Two instants and a sorcery this turn: one plus three.
      requirePlayer(state, me).spellTypesCastThisTurn.push(["Instant"], ["Instant"], ["Sorcery"], ["Creature"]);
      applyEffect(state, me, rionya.instanceId, trigger, [{ kind: "card", instanceId: bears.instanceId }]);
      expect(requirePlayer(state, me).battlefield.filter((i) => i.isTokenCopy)).toHaveLength(1 + 4);
    });

    it("cannot be pointed at itself", () => {
      const { state, me } = game();
      const rionya = put(state, "rionya-fire-dancer", me);
      const effect = state.cardDefinitions["rionya-fire-dancer"]!.triggeredAbilities![0]!.effect;
      if (effect.kind !== "createCopyToken" || !effect.target) throw new Error("fixture changed");

      expect(
        isValidTarget(state, effect.target, { kind: "card", instanceId: rionya.instanceId }, me, rionya.instanceId),
      ).toBe(false);
    });

    it("throws rather than quietly allowing itself when nobody hands over the source", () => {
      const { state, me } = game();
      const rionya = put(state, "rionya-fire-dancer", me);
      const effect = state.cardDefinitions["rionya-fire-dancer"]!.triggeredAbilities![0]!.effect;
      if (effect.kind !== "createCopyToken" || !effect.target) throw new Error("fixture changed");

      expect(() =>
        isValidTarget(state, effect.target!, { kind: "card", instanceId: rionya.instanceId }, me),
      ).toThrow(/another target/);
    });

    it("exiles its copies rather than sacrificing them", () => {
      const { state, me } = game();
      const rionya = put(state, "rionya-fire-dancer", me);
      const bears = put(state, "grizzly-bears", me);
      const trigger = state.cardDefinitions["rionya-fire-dancer"]!.triggeredAbilities![0]!.effect;

      applyEffect(state, me, rionya.instanceId, trigger, [{ kind: "card", instanceId: bears.instanceId }]);
      const copy = requirePlayer(state, me).battlefield.find((i) => i.isTokenCopy)!;

      while (state.step !== "end") advanceStep(state);
      const deathsBefore = state.creatureDeathsThisTurn;
      while (state.stack.length > 0) resolveTopOfStack(state);
      checkStateBasedActions(state);
      expect(stillInPlay(state, copy.instanceId)).toBe(false);
      // Exiled rather than sacrificed, so nothing watching for a death sees it.
      expect(state.creatureDeathsThisTurn).toBe(deathsBefore);
    });

    it("fires on its own begin-combat step and points at the only other creature", () => {
      const { state, me } = game();
      put(state, "rionya-fire-dancer", me);
      put(state, "grizzly-bears", me);

      while (state.step !== "begin-combat") advanceStep(state);
      // Exactly one legal target, so the engine takes it without asking.
      expect(state.pendingTargetChoices).toHaveLength(0);
      expect(state.stack).toHaveLength(1);
      resolveTopOfStack(state);
      expect(requirePlayer(state, me).battlefield.filter((i) => i.isTokenCopy)).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  describe("Zealous Conscripts", () => {
    it("takes an opponent's creature, untaps it, and gives it haste", () => {
      const { state, me, them } = game();
      const theirs = put(state, "grizzly-bears", them);
      theirs.tapped = true;
      const conscripts = put(state, "zealous-conscripts", me);

      applyEffect(
        state,
        me,
        conscripts.instanceId,
        state.cardDefinitions["zealous-conscripts"]!.triggeredAbilities![0]!.effect,
        [{ kind: "card", instanceId: theirs.instanceId }],
      );

      expect(theirs.controllerId).toBe(me);
      expect(battlefieldNames(state, me)).toContain("Grizzly Bears");
      expect(battlefieldNames(state, them)).not.toContain("Grizzly Bears");
      expect(theirs.tapped).toBe(false);
      expect(hasKeyword(state, theirs, "Haste")).toBe(true);
      // Haste is the point: a creature that changed hands is otherwise sick.
      expect(theirs.summoningSickness).toBe(false);
    });

    it("hands it back in the cleanup step", () => {
      const { state, me, them } = game();
      const theirs = put(state, "grizzly-bears", them);
      const conscripts = put(state, "zealous-conscripts", me);

      applyEffect(
        state,
        me,
        conscripts.instanceId,
        state.cardDefinitions["zealous-conscripts"]!.triggeredAbilities![0]!.effect,
        [{ kind: "card", instanceId: theirs.instanceId }],
      );
      expect(theirs.controllerId).toBe(me);

      while (state.step !== "end") advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);
      advanceStep(state); // cleanup

      expect(theirs.controllerId).toBe(them);
      expect(battlefieldNames(state, them)).toContain("Grizzly Bears");
      expect(battlefieldNames(state, me)).not.toContain("Grizzly Bears");
      expect(theirs.controlGainedFrom).toBeUndefined();
    });

    it("still untaps and hastens a permanent it already controls", () => {
      const { state, me } = game();
      const mine = put(state, "grizzly-bears", me);
      mine.tapped = true;
      const conscripts = put(state, "zealous-conscripts", me);

      applyEffect(
        state,
        me,
        conscripts.instanceId,
        state.cardDefinitions["zealous-conscripts"]!.triggeredAbilities![0]!.effect,
        [{ kind: "card", instanceId: mine.instanceId }],
      );

      expect(mine.tapped).toBe(false);
      expect(hasKeyword(state, mine, "Haste")).toBe(true);
      // Nothing to give back, so nothing is remembered.
      expect(mine.controlGainedFrom).toBeUndefined();
    });

    it("gives a stolen permanent back to its real controller, not to the first thief", () => {
      const { state, me, them } = game();
      const third = "carol";
      state.players.push({ ...requirePlayer(state, them), id: third, battlefield: [] });
      const theirs = put(state, "grizzly-bears", them);
      const effect = state.cardDefinitions["zealous-conscripts"]!.triggeredAbilities![0]!.effect;
      const first = put(state, "zealous-conscripts", me);
      const second = put(state, "zealous-conscripts", third);

      applyEffect(state, me, first.instanceId, effect, [{ kind: "card", instanceId: theirs.instanceId }]);
      applyEffect(state, third, second.instanceId, effect, [{ kind: "card", instanceId: theirs.instanceId }]);
      expect(theirs.controllerId).toBe(third);

      while (state.step !== "end") advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);
      advanceStep(state);
      expect(theirs.controllerId).toBe(them);
    });
  });

  // -------------------------------------------------------------------------
  describe("Homeward Path", () => {
    it("gives every creature back to whoever owns it", () => {
      const { state, me, them } = game();
      const theirs = put(state, "grizzly-bears", them);
      const conscripts = put(state, "zealous-conscripts", me);
      applyEffect(
        state,
        me,
        conscripts.instanceId,
        state.cardDefinitions["zealous-conscripts"]!.triggeredAbilities![0]!.effect,
        [{ kind: "card", instanceId: theirs.instanceId }],
      );
      expect(theirs.controllerId).toBe(me);

      // The opponent's own Path, hitting the whole table at once.
      const path = put(state, "homeward-path", them);
      activateAbility(state, them, path.instanceId, 1, []);
      resolveTopOfStack(state);

      expect(theirs.controllerId).toBe(them);
      expect(battlefieldNames(state, them)).toContain("Grizzly Bears");
      // And the cleanup step has nothing left to do with it.
      expect(theirs.controlGainedFrom).toBeUndefined();
    });

    it("leaves the thief's own creatures alone, and still taps for colourless", () => {
      const { state, me, them } = game();
      const mine = put(state, "grizzly-bears", me);
      const path = put(state, "homeward-path", me);

      activateAbility(state, me, path.instanceId, 1, []);
      resolveTopOfStack(state);
      expect(mine.controllerId).toBe(me);
      expect(battlefieldNames(state, them)).not.toContain("Grizzly Bears");

      path.tapped = false;
      activateAbility(state, me, path.instanceId, 0, []);
      // A mana ability resolves without using the stack.
      expect(requirePlayer(state, me).manaPool.generic).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  describe("Ocelot Pride", () => {
    /** Ten permanents, which is what Ascend asks for. */
    function fillToTen(state: GameState, playerId: string): void {
      while (requirePlayer(state, playerId).battlefield.length < 10) {
        put(state, "plains", playerId);
      }
    }

    it("grants the city's blessing at ten permanents and never takes it away", () => {
      const { state, me } = game();
      put(state, "ocelot-pride", me);
      checkStateBasedActions(state);
      expect(requirePlayer(state, me).hasCitysBlessing).toBe(false);

      fillToTen(state, me);
      checkStateBasedActions(state);
      expect(requirePlayer(state, me).hasCitysBlessing).toBe(true);

      // "For the rest of the game" - a board wipe does not undo it.
      requirePlayer(state, me).battlefield.length = 0;
      checkStateBasedActions(state);
      expect(requirePlayer(state, me).hasCitysBlessing).toBe(true);
    });

    it("does nothing at all if you gained no life this turn", () => {
      const { state, me } = game();
      put(state, "ocelot-pride", me);
      fillToTen(state, me);
      checkStateBasedActions(state);

      while (state.step !== "end") advanceStep(state);
      // The intervening-if is false, so the ability never reaches the stack.
      expect(state.stack).toHaveLength(0);
      expect(requirePlayer(state, me).battlefield.some((i) => i.definitionId === "token-w-11-cat")).toBe(false);
    });

    it("makes one Cat without the blessing", () => {
      const { state, me } = game();
      put(state, "ocelot-pride", me);
      gainLife(state, me, 1);

      while (state.step !== "end") advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);

      const cats = requirePlayer(state, me).battlefield.filter((i) => i.definitionId === "token-w-11-cat");
      expect(cats).toHaveLength(1);
    });

    it("copies the Cat it just made once you have the blessing", () => {
      const { state, me } = game();
      put(state, "ocelot-pride", me);
      fillToTen(state, me);
      checkStateBasedActions(state);
      gainLife(state, me, 1);

      while (state.step !== "end") advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);

      // The Cat, plus a copy of it - the token the first sentence made is one of
      // the tokens the second sentence copies.
      const cats = requirePlayer(state, me).battlefield.filter((i) => i.definitionId === "token-w-11-cat");
      expect(cats).toHaveLength(2);
    });

    it("copies every token that entered this turn, and no token that did not", () => {
      const { state, me } = game();
      put(state, "ocelot-pride", me);
      fillToTen(state, me);
      checkStateBasedActions(state);

      // One from an earlier turn, one from this one.
      const old = put(state, "token-r-11-goblin", me);
      old.enteredOnTurn = state.turnNumber - 1;
      put(state, "soldier-token", me);
      // A real card that arrived this turn is not a token and is not copied.
      put(state, "grizzly-bears", me);
      gainLife(state, me, 1);

      while (state.step !== "end") advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);

      const count = (definitionId: string) =>
        requirePlayer(state, me).battlefield.filter((i) => i.definitionId === definitionId).length;
      expect(count("token-r-11-goblin")).toBe(1); // last turn's, untouched
      expect(count("soldier-token")).toBe(2); // this turn's, copied
      expect(count("token-w-11-cat")).toBe(2); // made and then copied
      expect(count("grizzly-bears")).toBe(1); // not a token
    });
  });
});
