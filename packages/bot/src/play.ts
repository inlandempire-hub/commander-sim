import { filterGameStateForViewer } from "@mtg-commander-sim/protocol";
import type { GameState } from "@mtg-commander-sim/engine";
import { decideAction } from "./decide.js";
import type { BotAction } from "./types.js";

/**
 * What a harness has to provide for the bot to actually play: a way to read
 * the current state and a way to perform one action. Both the in-browser
 * opponent and the standalone WebSocket runner implement this, so there is
 * exactly one copy of the "keep acting until there's nothing to do" loop.
 */
export interface BotHarness {
  getState(): GameState | null;
  perform(action: BotAction): void;
}

/**
 * Chooses the bot's next action from the state it is *allowed* to see.
 *
 * The filtering is applied here rather than being left to callers, so an
 * in-process bot sharing the same GameState object as the UI still can't read
 * the opponent's hand or the top of either library. A bot that cheats by
 * accident is worse than no bot.
 */
export function nextAction(state: GameState, botPlayerId: string): BotAction | null {
  const action = decideAction(filterGameStateForViewer(state, botPlayerId), botPlayerId);

  // "Pass priority" is how decideAction says "nothing to do here", but during a
  // declaration window the bot is being consulted without holding priority - it
  // was asked whether it wants to block, not asked to act. Declining to block
  // must therefore resolve to "idle", not to an illegal pass. Returning null
  // keeps that distinction at the boundary instead of pushing it into every
  // harness.
  const holdsPriority = state.players[state.priorityPlayerIndex]?.id === botPlayerId;
  if (action.kind === "passPriority" && !holdsPriority) return null;
  return action;
}

/**
 * Whether the bot has anything to do right now: it holds priority, or it owes
 * a combat declaration. Harnesses check this before waking the bot up so it
 * isn't recomputing decisions on every unrelated state change.
 */
export function botShouldAct(state: GameState, botPlayerId: string): boolean {
  if (state.players.some((p) => p.hasLost)) return false;
  // Opening hands come before anything else and nobody holds priority during
  // them, so the priority check below would never wake the bot up.
  if (state.mulligan?.playerId === botPlayerId) return true;
  const holdsPriority = state.players[state.priorityPlayerIndex]?.id === botPlayerId;
  if (holdsPriority) return true;

  const isMyTurn = state.players[state.activePlayerIndex]?.id === botPlayerId;
  if (state.phase !== "combat") return false;
  if (state.step === "declare-attackers" && isMyTurn) return Object.keys(state.attackers).length === 0;
  // Not "are there no blockers yet" - an empty map also means "declined to
  // block", which would have the bot re-declaring forever.
  if (state.step === "declare-blockers" && !isMyTurn) return !state.blockersDeclared;
  return false;
}

/**
 * Runs the bot until it has nothing left to do, or `maxActions` is hit.
 *
 * The cap is a deliberate safety net, not an expectation: a heuristic bug that
 * makes `decideAction` return the same action forever would otherwise lock the
 * game (or the browser tab). Hitting it means a bug, and the caller is told so
 * via the returned count rather than the loop failing silently.
 */
export function runBotUntilIdle(harness: BotHarness, botPlayerId: string, maxActions = 200): number {
  let performed = 0;
  while (performed < maxActions) {
    const state = harness.getState();
    if (!state) return performed;
    if (!botShouldAct(state, botPlayerId)) return performed;

    const action = nextAction(state, botPlayerId);
    if (!action) return performed; // consulted, but has nothing it wants to do
    harness.perform(action);
    performed += 1;

    // Passing priority is always terminal for this wake-up: either the game
    // moved on and we'll be called again, or it's someone else's turn to act.
    if (action.kind === "passPriority") return performed;
  }
  return performed;
}
