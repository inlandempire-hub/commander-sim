import { describe, expect, it } from "vitest";
import { createDemoGame, DEADLY_DONNY, SALTY_MIKE, type GameState } from "@mtg-commander-sim/engine";
import { applyBotAction } from "../localHarness.js";
import { botShouldAct, nextAction } from "../play.js";

/**
 * Plays a complete bot-vs-bot game and returns what happened.
 *
 * This is the test that matters most. Every heuristic can be individually
 * correct and the bot can still lock the game up - by passing forever, by
 * proposing an action the engine rejects, or by looping on a decision that
 * never changes the state. Only a full game catches that, and it exercises
 * the real 99-card demo decks rather than a hand-built board.
 */
function playOut(maxActions = 40000): {
  state: GameState;
  actions: number;
  errors: string[];
  stalled: boolean;
} {
  const state = createDemoGame();
  const errors: string[] = [];
  let actions = 0;

  while (actions < maxActions) {
    if (state.players.some((p) => p.hasLost)) break;

    // A seat can be "eligible" (it owes a blocking decision) and still choose to
    // do nothing, so fall through to the other seat rather than stalling.
    let acted = false;
    for (const seat of [DEADLY_DONNY, SALTY_MIKE]) {
      if (!botShouldAct(state, seat)) continue;
      const action = nextAction(state, seat);
      if (!action) continue;
      try {
        applyBotAction(state, seat, action);
      } catch (error) {
        errors.push(`${seat} ${action.kind}: ${(error as Error).message}`);
        return { state, actions, errors, stalled: false };
      }
      acted = true;
      break;
    }
    if (!acted) break; // genuinely nobody can move the game forward
    actions += 1;
  }

  return { state, actions, errors, stalled: actions >= maxActions };
}

describe("bot vs bot", () => {
  it("plays a complete game to a winner without proposing an illegal action", () => {
    const { state, errors, stalled, actions } = playOut();

    expect(errors).toEqual([]);
    expect(stalled).toBe(false);
    expect(actions).toBeGreaterThan(50);

    const losers = state.players.filter((p) => p.hasLost);
    expect(losers).toHaveLength(1);
    expect(losers[0]!.lossReason).toBeTruthy();
  });

  it("actually develops a board rather than passing the whole game", () => {
    const { state } = playOut();

    for (const player of state.players) {
      /*
       * Lands *played*, not lands still standing.
       *
       * This counted the battlefield until 2026-08-17, which was the same thing
       * for as long as both demo decks were basics. The Blech list has fetchlands
       * in it - they sacrifice themselves to find something - so a player who had
       * played five lands could legitimately be showing two, and the test failed
       * about one game in ten with nothing wrong.
       *
       * `enteredOnTurn` is stamped on arrival and deliberately survives a zone
       * change, so a cracked fetchland in the graveyard still counts as the land
       * drop it was.
       */
      const landsPlayed = [...player.battlefield, ...player.graveyard, ...player.exile].filter(
        (c) => state.cardDefinitions[c.definitionId]?.types.includes("Land") && c.enteredOnTurn >= 0,
      );
      /*
       * Scaled to the turns this player actually had, which is the second thing
       * wrong with this assertion.
       *
       * A flat "more than two lands" assumes every game lasts long enough for
       * three land drops. Real decks kill faster than that: a game decided on
       * turn three leaves the loser with two lands and nothing wrong, and the
       * test failed about one run in twenty on exactly that. A player cannot have
       * played more lands than they have had turns, so that is the ceiling the
       * assertion has to respect.
       */
      const expected = Math.min(3, player.turnsTaken);
      expect(landsPlayed.length).toBeGreaterThanOrEqual(expected);
    }
    // Somebody's life total moved, so combat happened.
    expect(state.players.some((p) => p.life < 40)).toBe(true);
  });

  it("is deterministic enough to be debuggable - repeated runs all terminate cleanly", () => {
    for (let i = 0; i < 5; i++) {
      const { errors, stalled } = playOut();
      expect(errors).toEqual([]);
      expect(stalled).toBe(false);
    }
  });
});
