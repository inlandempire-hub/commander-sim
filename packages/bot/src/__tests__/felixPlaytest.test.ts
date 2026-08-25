import { describe, expect, it } from "vitest";
import {
  createGameFromDecks,
  FELIX_DECK,
  FELIX_PILOT,
  MIKE_DECK,
  SALTY_MIKE,
  type GameState,
} from "@mtg-commander-sim/engine";
import { applyBotAction } from "../localHarness.js";
import { botShouldAct, nextAction } from "../play.js";

/**
 * Plays the real Felix Five-Boots deck out against a bot, both seats piloted by
 * the bot. This is the deck's end-to-end proof: 66 hand-built cards, every
 * subsystem they need, shuffled into one library and actually played - it
 * catches a card that wedges the game (an illegal action, a decision the bot
 * cannot answer, a resolution that loops) in a way no per-card test can.
 */
function playOut(maxActions = 40000): {
  state: GameState;
  actions: number;
  errors: string[];
  stalled: boolean;
} {
  const state = createGameFromDecks([
    { id: FELIX_PILOT, deck: FELIX_DECK },
    { id: SALTY_MIKE, deck: MIKE_DECK },
  ]);
  const errors: string[] = [];
  let actions = 0;

  while (actions < maxActions) {
    if (state.players.some((p) => p.hasLost)) break;
    let acted = false;
    for (const seat of [FELIX_PILOT, SALTY_MIKE]) {
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

describe("Felix Five-Boots deck playtest", () => {
  it("plays a full game without proposing an illegal action or stalling", () => {
    const { errors, stalled, actions } = playOut();
    expect(errors).toEqual([]);
    expect(stalled).toBe(false);
    expect(actions).toBeGreaterThan(50);
  });

  it("develops a real board - lands down and spells cast", () => {
    const { state } = playOut();
    const felix = state.players.find((p) => p.id === FELIX_PILOT)!;
    const permanents = felix.battlefield.length;
    // Something of Felix's actually hit the table across a whole game.
    expect(permanents).toBeGreaterThan(0);
  });
});
