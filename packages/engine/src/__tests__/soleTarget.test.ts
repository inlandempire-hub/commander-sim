import { describe, expect, it } from "vitest";
import { createCardInstance, createGameState } from "../state.js";
import { soleLegalTarget } from "../targeting.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

/**
 * "Target opponent" in a two-player game is not a decision, and asking for it
 * is a click that teaches the player nothing.
 *
 * This is a *format* rule rather than a card one, which is the whole point: the
 * same card in a pod is a real choice and must still be asked for.
 */
describe("a target that is not a choice", () => {
  function game(players = ["Deadly Donny", "Salty Mike"]): GameState {
    return createGameState(players, TEST_CARD_DEFINITIONS);
  }

  it("names the only opponent in a two-player game", () => {
    const state = game();
    const me = state.players[0]!;
    const them = state.players[1]!;
    const forced = soleLegalTarget(state, { kind: "opponent-of-controller" }, me.id);
    expect(forced).toEqual({ kind: "player", playerId: them.id });
  });

  it("asks in a three-player game, where it is a real decision", () => {
    const state = game(["Deadly Donny", "Salty Mike", "Third Wheel"]);
    const me = state.players[0]!;
    expect(soleLegalTarget(state, { kind: "opponent-of-controller" }, me.id)).toBeUndefined();
  });

  it("asks for 'target player', which can be you", () => {
    // Two legal answers in a two-player game, so it is still a choice.
    const state = game();
    const me = state.players[0]!;
    expect(soleLegalTarget(state, { kind: "player" }, me.id)).toBeUndefined();
  });

  it("never auto-picks a creature, even when only one is legal", () => {
    /*
     * Deliberate. The board changes constantly and players routinely mean to
     * aim at their own permanent - silently pointing a removal spell at the one
     * legal creature is how a game gets lost to an interface.
     */
    const state = game();
    const me = state.players[0]!;
    createCardInstance(state, "grizzly-bears", state.players[1]!.id, "battlefield");
    expect(soleLegalTarget(state, { kind: "creature" }, me.id)).toBeUndefined();
  });

  it("does not auto-pick when an opponent has already lost", () => {
    // Three players, one out: the remaining opponent is then the only answer.
    const state = game(["Deadly Donny", "Salty Mike", "Third Wheel"]);
    const me = state.players[0]!;
    state.players[2]!.hasLost = true;
    expect(soleLegalTarget(state, { kind: "opponent-of-controller" }, me.id)).toEqual({
      kind: "player",
      playerId: state.players[1]!.id,
    });
  });
});
