import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { couldAfford, planManaPayment, potentialAvailableMana } from "../mana.js";
import { activateAbilityWithAutoTap } from "../autoTap.js";
import { canPlayCardNow } from "../autoPass.js";
import { activatableAbilities } from "../abilities.js";
import type { GameState } from "../types.js";

/**
 * "Can I pay for this" against "paying for it".
 *
 * These two answers used to be given by different code, and they disagreed the
 * moment a deck had a dual land in it: the pool that answered the first counted
 * a permanent once per mana ability, so a land reading "{T}: Add {B}" and "{T}:
 * Add {G}" was two mana rather than one.
 *
 * Nothing caught it because both demo decks were a commander and forty basics,
 * and a basic has exactly one mana ability. It surfaced the hour a real decklist
 * went in, as the bot proposing a spell the engine then refused - which in a bot
 * game is a dead game rather than a misplay.
 */
describe("what a player can actually pay for", () => {
  function game(): { state: GameState; me: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    return { state, me: state.players[0]!.id };
  }

  /** Llanowar Wastes: colourless, or B or G for a point of damage. */
  function dual(state: GameState, playerId: string): void {
    const land = createCardInstance(state, "llanowar-wastes", playerId, "battlefield");
    land.tapped = false;
  }

  it("counts a dual land once, not once per colour it makes", () => {
    const { state, me } = game();
    dual(state, me);
    dual(state, me);

    // The upper bound still reads high, and says so in its own comment.
    const potential = potentialAvailableMana(state, me);
    expect((potential.B ?? 0) + (potential.G ?? 0)).toBeGreaterThan(2);

    // Two lands are two mana, whichever colours are asked for.
    expect(couldAfford(state, me, { generic: 0, colors: { B: 1, G: 1 } })).toBe(true);
    expect(couldAfford(state, me, { generic: 0, colors: { B: 2 } })).toBe(true);
    expect(couldAfford(state, me, { generic: 0, colors: { B: 2, G: 1 } })).toBe(false);
    expect(couldAfford(state, me, { generic: 3, colors: {} })).toBe(false);
  });

  it("does not light up a card in hand that the engine would then refuse", () => {
    const { state, me } = game();
    dual(state, me);
    dual(state, me);
    // Craw Wurm is {4}{G}{G} - nowhere near payable off two lands, but a summed
    // pool made two duals look like four mana.
    const card = createCardInstance(state, "craw-wurm", me, "hand");
    expect(canPlayCardNow(state, me, card.instanceId)).toBe(false);
  });

  it("agrees with the payment it is predicting", () => {
    const { state, me } = game();
    dual(state, me);
    dual(state, me);
    for (const cost of [
      { generic: 0, colors: { B: 1 } },
      { generic: 1, colors: { G: 1 } },
      { generic: 0, colors: { B: 1, G: 1 } },
      { generic: 0, colors: { B: 2, G: 1 } },
      { generic: 2, colors: { B: 1 } },
    ]) {
      // One is the other. A disagreement here is the bug this file exists for.
      expect(couldAfford(state, me, cost)).toBe(planManaPayment(state, me, cost).paid);
    }
  });

  /*
   * The second half of the same problem. Sapseep Forest's second ability costs
   * "{G}, {T}", and the Forest is itself a green source - so the auto-tapper
   * spent it paying the mana and then found it already tapped.
   */
  describe("a permanent cannot pay for its own tap ability", () => {
    /**
     * Sapseep Forest, plus the two green permanents its "activate only if"
     * demands. Lands are colourless whatever they tap for, so the Forest is not
     * one of them - the Elves are, and they are also the only other green mana
     * on the board, which is exactly the situation this is about.
     */
    function board(state: GameState, playerId: string, elves: number) {
      const forest = createCardInstance(state, "sapseep-forest", playerId, "battlefield");
      forest.tapped = false;
      for (let i = 0; i < elves; i++) {
        const elf = createCardInstance(state, "llanowar-elves", playerId, "battlefield");
        elf.tapped = false;
        elf.summoningSickness = false;
      }
      return forest;
    }

    it("is not offered when the permanent itself is the only source left", () => {
      const { state, me } = game();
      const forest = board(state, me, 2);
      // Both Elves already spent, so the only green mana left is the Forest -
      // which this ability needs untapped for its own cost.
      for (const elf of requirePlayer(state, me).battlefield) {
        if (elf.definitionId === "llanowar-elves") elf.tapped = true;
      }
      // Index 1 is the lifegain; index 0 is the plain mana ability.
      expect(activatableAbilities(state, me, forest.instanceId)).not.toContain(1);
    });

    it("is offered, and works, once something else can pay the mana", () => {
      const { state, me } = game();
      const forest = board(state, me, 2);

      expect(activatableAbilities(state, me, forest.instanceId)).toContain(1);

      const lifeBefore = requirePlayer(state, me).life;
      activateAbilityWithAutoTap(state, me, forest.instanceId, 1);
      // An Elf paid the {G}, and the Forest is tapped for the ability itself
      // rather than having been spent on its own cost.
      const tappedElves = requirePlayer(state, me).battlefield.filter(
        (c) => c.definitionId === "llanowar-elves" && c.tapped,
      );
      expect(tappedElves).toHaveLength(1);
      expect(forest.tapped).toBe(true);
      // The ability is on the stack rather than resolved, so the life comes later.
      expect(state.stack).toHaveLength(1);
      expect(requirePlayer(state, me).life).toBe(lifeBefore);
    });
  });
});
