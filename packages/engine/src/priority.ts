import type { GameState } from "./types.js";
import { resolveTopOfStack } from "./stack.js";
import { advanceStep } from "./turn.js";
import { checkStateBasedActions } from "./sba.js";

function activePlayerCount(state: GameState): number {
  return state.players.filter((p) => !p.hasLost).length;
}

function advancePriorityPlayer(state: GameState): void {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (state.priorityPlayerIndex + i) % n;
    if (!state.players[idx]!.hasLost) {
      state.priorityPlayerIndex = idx;
      return;
    }
  }
}

/**
 * A player passes priority. If every player still in the game passes in
 * succession, the top of the stack resolves (if non-empty) or the game
 * advances to the next step (if empty) - then priority resets to the active
 * player and state-based actions are checked, per the real rules.
 */
export function passPriority(state: GameState, playerId: string): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }

  state.passesInSuccession += 1;
  advancePriorityPlayer(state);

  if (state.passesInSuccession >= activePlayerCount(state)) {
    if (state.stack.length > 0) {
      resolveTopOfStack(state);
    } else {
      advanceStep(state);
    }
    state.passesInSuccession = 0;
    state.priorityPlayerIndex = state.activePlayerIndex;
  }

  checkStateBasedActions(state);
}
