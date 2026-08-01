import { createGameState } from "./state.js";
import { TEST_CARD_DEFINITIONS } from "./cards/testCards.js";
import type { GameState } from "./types.js";

export function makeTestGame(playerIds: string[] = ["alice", "bob"]): GameState {
  return createGameState(playerIds, TEST_CARD_DEFINITIONS);
}
