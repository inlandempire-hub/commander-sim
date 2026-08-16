import { describe, expect, it } from "vitest";
import {
  castSpell,
  createCardInstance,
  createGameState,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { castableFromHand, castableCommander } from "../handOptions.js";
import { decideAction } from "../decide.js";
import { applyBotAction } from "../localHarness.js";

/**
 * The bot is just another client, so anything the engine refuses it must not
 * propose. Batch 2 added a whole class of refusals - the hate pieces - and the
 * bot knew nothing about them: the existing full-game tests passed only because
 * neither archetype deck happens to contain one.
 *
 * These stand a hate piece in front of the bot deliberately.
 */
describe("the bot respects action restrictions", () => {
  function makeTestGame(): GameState {
    return createGameState(["Deadly Donny", "Salty Mike"], TEST_CARD_DEFINITIONS);
  }

  function openMain(state: GameState) {
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
  }

  it("does not offer a second spell under a cast limit", () => {
    const state = makeTestGame();
    const me = state.players[0]!;
    openMain(state);
    me.manaPool = { R: 10, W: 10, generic: 10 };
    createCardInstance(state, "high-noon", me.id, "battlefield");
    createCardInstance(state, "lightning-bolt", me.id, "hand");

    // Before casting anything the bolt is on offer.
    expect(castableFromHand(state, me, () => true).length).toBe(1);

    const first = createCardInstance(state, "lightning-bolt", me.id, "hand");
    castSpell(state, me.id, first.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]);

    // The limit is spent, so nothing in hand is castable any more.
    expect(castableFromHand(state, me, () => true).length).toBe(0);
  });

  it("does not offer the commander while Drannith Magistrate is out", () => {
    const state = makeTestGame();
    const me = state.players[0]!;
    const them = state.players[1]!;
    openMain(state);
    me.manaPool = { R: 10, W: 10, U: 10, B: 10, G: 10, generic: 20 };
    createCardInstance(state, "winota-joiner-of-forces", me.id, "command");

    expect(castableCommander(state, me)).not.toBeNull();
    createCardInstance(state, "drannith-magistrate", them.id, "battlefield");
    expect(castableCommander(state, me)).toBeNull();
  });

  it("never proposes an action the engine then throws on", () => {
    // The real guarantee. Whatever the bot decides, applying it must work -
    // that is what "the bot is just another client" has to mean.
    const state = makeTestGame();
    const me = state.players[0]!;
    const them = state.players[1]!;
    openMain(state);
    me.manaPool = { R: 10, W: 10, generic: 10 };
    createCardInstance(state, "clarion-conqueror", them.id, "battlefield");
    createCardInstance(state, "high-noon", them.id, "battlefield");
    const solRing = createCardInstance(state, "sol-ring", me.id, "battlefield");
    solRing.summoningSickness = false;
    createCardInstance(state, "lightning-bolt", me.id, "hand");
    createCardInstance(state, "grizzly-bears", me.id, "hand");

    for (let i = 0; i < 12; i++) {
      const action = decideAction(state, me.id);
      if (!action || action.kind === "passPriority") break;
      expect(() => applyBotAction(state, me.id, action)).not.toThrow();
    }
  });
});
