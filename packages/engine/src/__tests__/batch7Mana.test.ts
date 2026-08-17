import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { activateAbility, activatableAbilities } from "../abilities.js";
import { enteredBattlefield } from "../permanents.js";
import { advanceStep } from "../turn.js";
import { yourLegendaryPermanentColors } from "../mana.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * The mana base - the plan's batch 7.
 *
 * Every card here is a land or a rock, and what makes them interesting is the
 * condition attached to the mana rather than the mana itself: a turn number, a
 * board of legends, a land that has to be *played* rather than merely arrive.
 */
describe("batch 7 mana base", () => {
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

  describe("Starting Town", () => {
    it("enters untapped on your first turn", () => {
      const { state, me } = game();
      expect(requirePlayer(state, me).turnsTaken).toBe(1);
      const town = put(state, "starting-town", me);
      expect(town.tapped).toBe(false);
    });

    it("enters untapped on your third turn and tapped on your fourth", () => {
      const { state, me } = game();
      const player = requirePlayer(state, me);

      player.turnsTaken = 3;
      expect(put(state, "starting-town", me).tapped).toBe(false);

      player.turnsTaken = 4;
      expect(put(state, "starting-town", me).tapped).toBe(true);
    });

    it("counts your own turns, not the game's", () => {
      const { state, me, them } = game();
      // The game is on turn 4; the player who went second has had two turns, so
      // their Starting Town still enters untapped. A condition written against
      // state.turnNumber would tap it.
      state.turnNumber = 4;
      requirePlayer(state, them).turnsTaken = 2;
      expect(put(state, "starting-town", them).tapped).toBe(false);
    });

    it("taps for colourless free, or any colour for a life", () => {
      const { state, me } = game();
      const town = put(state, "starting-town", me);
      const player = requirePlayer(state, me);

      activateAbility(state, me, town.instanceId, 0);
      expect(player.manaPool.generic ?? 0).toBe(1);
      expect(player.life).toBe(40);

      const second = put(state, "starting-town", me);
      activateAbility(state, me, second.instanceId, 3); // the black half
      expect(player.manaPool.B).toBe(1);
      expect(player.life).toBe(39);
    });
  });

  describe("Mox Amber", () => {
    it("makes nothing at all with no legend on the board", () => {
      const { state, me } = game();
      const mox = put(state, "mox-amber", me);
      expect(yourLegendaryPermanentColors(state, me)).toEqual([]);
      expect(activatableAbilities(state, me, mox.instanceId)).toEqual([]);
    });

    it("makes the colours of the legends you control", () => {
      const { state, me } = game();
      const mox = put(state, "mox-amber", me);
      // Winota is Boros - {2}{R}{W} - so the Mox may make either half of her, and
      // neither of the other three. The colours come from the permanent itself
      // rather than from a deck identity, which is why this is two and not five.
      put(state, "winota-joiner-of-forces", me);

      expect(yourLegendaryPermanentColors(state, me)).toEqual(["W", "R"]);
      // Indices into the five halves, in WUBRG order: white and red.
      expect(activatableAbilities(state, me, mox.instanceId)).toEqual([0, 3]);

      activateAbility(state, me, mox.instanceId, 3);
      expect(requirePlayer(state, me).manaPool.R).toBe(1);
    });

    it("does not read an opponent's legends", () => {
      const { state, me, them } = game();
      put(state, "mox-amber", me);
      put(state, "winota-joiner-of-forces", them);
      expect(yourLegendaryPermanentColors(state, me)).toEqual([]);
    });

    it("stops working when the legend leaves", () => {
      const { state, me } = game();
      const mox = put(state, "mox-amber", me);
      const winota = put(state, "winota-joiner-of-forces", me);

      expect(activatableAbilities(state, me, mox.instanceId)).toEqual([0, 3]);
      // Read off the board on every activation, so a legend that dies takes the
      // colour with it rather than leaving a latched answer behind.
      const player = requirePlayer(state, me);
      player.battlefield = player.battlefield.filter((c) => c.instanceId !== winota.instanceId);
      expect(activatableAbilities(state, me, mox.instanceId)).toEqual([]);
    });

    it("offers no colourless half, because the card prints none", () => {
      const def = TEST_CARD_DEFINITIONS["mox-amber"]!;
      const colors = (def.activatedAbilities ?? []).map((a) =>
        a.effect.kind === "addMana" ? a.effect.color : "?",
      );
      expect(colors).toEqual(["W", "U", "B", "R", "G"]);
      for (const ability of def.activatedAbilities ?? []) {
        expect(ability.colorFrom).toBe("your-legendary-permanents");
      }
    });
  });

  it("counts a turn for each player as it begins", () => {
    const { state } = game();
    const [first, second] = state.players;
    expect(first!.turnsTaken).toBe(1);
    expect(second!.turnsTaken).toBe(0);

    // Round the turn: the ending step rolls into the next player's untap.
    state.phase = "ending";
    state.step = "end";
    advanceStep(state);
    expect(second!.turnsTaken).toBe(1);
    expect(first!.turnsTaken).toBe(1);
  });
});
