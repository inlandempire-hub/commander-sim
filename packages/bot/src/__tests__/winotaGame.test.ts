import { describe, expect, it } from "vitest";
import {
  createGameFromDecks,
  DEADLY_DONNY,
  SALTY_MIKE,
  WINOTA_DECK,
  type GameState,
} from "@mtg-commander-sim/engine";
import { applyBotAction } from "../localHarness.js";
import { botShouldAct, nextAction } from "../play.js";

/**
 * The Winota list, played out by the bot on both sides.
 *
 * The deck tests next door say the hundred cards are legal and that every id
 * resolves. This is the one that says the deck *works*: a card can be a
 * perfectly good fixture and still lock the game up - by asking a question
 * nothing answers, by proposing an action the engine refuses, or by looping on
 * a decision that never changes the state.
 *
 * It is the only test that exercises all hundred at once, and the only one that
 * would catch the eleventh card breaking the third.
 */
function playOut(seed: number, maxActions = 40000): {
  state: GameState;
  actions: number;
  errors: string[];
  stalled: boolean;
} {
  /*
   * A different shuffle each run, deterministically - the point of playing it
   * more than once is to see a different hundred-card ordering, not the same
   * game three times.
   */
  const shuffled = (ids: string[], salt: number): string[] => {
    const copy = [...ids];
    let x = seed * 7919 + salt;
    for (let i = copy.length - 1; i > 0; i--) {
      x = (x * 1103515245 + 12345) % 2147483648;
      const j = x % (i + 1);
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  };

  // The Winota list on both sides, through the same door archetype matchups use.
  const state = createGameFromDecks([
    { id: DEADLY_DONNY, deck: { ...WINOTA_DECK, libraryIds: shuffled(WINOTA_DECK.libraryIds, 1) } },
    { id: SALTY_MIKE, deck: { ...WINOTA_DECK, libraryIds: shuffled(WINOTA_DECK.libraryIds, 2) } },
  ]);

  const errors: string[] = [];
  let actions = 0;
  while (actions < maxActions) {
    if (state.players.some((p) => p.hasLost)) break;
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
    if (!acted) break;
    actions += 1;
  }
  return { state, actions, errors, stalled: actions >= maxActions };
}

describe("the Winota deck in a real game", () => {
  it("plays out with the bot on both sides, proposing nothing the engine refuses", () => {
    const { errors, stalled } = playOut(1);
    expect(errors).toEqual([]);
    expect(stalled).toBe(false);
  });

  it("does the same on five different shuffles", () => {
    // Five, because every one of them found a different bug the first time:
    // an ability cost the bot did not check, a timing rule it did not ask
    // about, an animated land read by its printed type, and a block restriction
    // it had never heard of.
    for (const seed of [2, 3, 4, 5, 6]) {
      const { errors, stalled } = playOut(seed);
      expect(errors, `seed ${seed}`).toEqual([]);
      expect(stalled, `seed ${seed}`).toBe(false);
    }
  });

  it("actually gets somewhere rather than passing the whole game", () => {
    const { state, actions } = playOut(5);
    expect(actions).toBeGreaterThan(50);
    // Assertions about the *game* rather than about either player - which is
    // the lesson batch 6's flaky test taught three times over.
    const landsPlayed = state.players.reduce(
      (total, p) => total + p.battlefield.filter((c) => state.cardDefinitions[c.definitionId]?.types.includes("Land")).length,
      0,
    );
    expect(landsPlayed).toBeGreaterThan(2);
  });
});
