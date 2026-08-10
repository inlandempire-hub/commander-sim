import type { GameState } from "./types.js";
import { log, requirePlayer } from "./state.js";

/**
 * Giving up.
 *
 * Rule 104.3a: a player can concede at any time, and it is the one action in
 * Magic that needs no priority, no timing window and no opponent's agreement.
 * They leave the game immediately.
 *
 * That matters more here than in a paper game. A simulator has no way to say
 * "this is over, let's shuffle up" - without this, a lost position has to be
 * played out to the last point of damage, or the tab closed, which loses the
 * log along with it.
 */
export function concede(state: GameState, playerId: string): void {
  const player = requirePlayer(state, playerId);
  if (player.hasLost) return;

  player.hasLost = true;
  player.lossReason = "conceded";
  log(state, `${playerId} concedes`);

  // Anything that was waiting on this player is now waiting forever, so it is
  // cleared rather than left to block the game that is already over.
  if (state.mulligan?.playerId === playerId) state.mulligan = null;
  if (state.pendingSearch?.playerId === playerId) state.pendingSearch = null;
  if (state.pendingConfirmation?.playerId === playerId) state.pendingConfirmation = null;
}
