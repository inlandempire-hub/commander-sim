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

    /*
     * What this test can honestly assert, arrived at by getting it wrong twice.
     *
     * It counted lands *standing* until 2026-08-17, which was the same thing for
     * as long as both demo decks were basics - the Blech list has fetchlands, and
     * a player who had played five lands could legitimately be showing two.
     * Counting lands *played* fixed that (`enteredOnTurn` is stamped on arrival
     * and survives the zone change, so a cracked fetchland still counts).
     *
     * Then it scaled the count to the turns each player had taken, on the
     * reasoning that a player cannot play more lands than they have had turns.
     * True, and still not enough: a bot that keeps a one-land hand and draws
     * spells misses land drops with nothing wrong. Any per-player floor is an
     * assumption about the shuffle.
     *
     * So the assertions are about the *game* rather than about either player.
     * Between them they say what the test is named for: the bots are playing
     * rather than passing.
     */
    const landsPlayed = state.players.flatMap((player) =>
      [...player.battlefield, ...player.graveyard, ...player.exile].filter(
        (c) => state.cardDefinitions[c.definitionId]?.types.includes("Land") && c.enteredOnTurn >= 0,
      ),
    );
    expect(landsPlayed.length).toBeGreaterThan(2);

    // Something that is not a land reached a battlefield: the bots cast spells.
    const nonlandPermanents = state.players.flatMap((player) =>
      [...player.battlefield, ...player.graveyard].filter(
        (c) => c.enteredOnTurn >= 0 && !state.cardDefinitions[c.definitionId]?.types.includes("Land"),
      ),
    );
    expect(nonlandPermanents.length).toBeGreaterThan(0);

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
