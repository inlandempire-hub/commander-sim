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
 * Whether the bot has anything to do right now: it holds priority, it owes a
 * combat declaration, or the game has stopped mid-resolution to ask it
 * something. Harnesses check this before waking the bot up so it isn't
 * recomputing decisions on every unrelated state change.
 */
export function botShouldAct(state: GameState, botPlayerId: string): boolean {
  if (state.players.some((p) => p.hasLost)) return false;
  // Opening hands come before anything else and nobody holds priority during
  // them, so the priority check below would never wake the bot up.
  if (state.mulligan?.playerId === botPlayerId) return true;
  /*
   * A question the bot owes an answer to, for the same reason: the game is
   * part-way through resolving something, so *nobody* holds priority and the
   * check below cannot wake it.
   *
   * This used to be covered by accident. Every search and every "you may" the
   * bot owned came from its own spell or its own trigger, and it happened to
   * still be holding priority from before the resolution - so the branch below
   * fired and `decideAction` answered. Assassin's Trophy broke that: the human
   * casts it, the *bot* searches, and the human is the priority holder. Nobody
   * would ever wake the bot, and the game stopped dead with a picker nobody
   * could see. The same hole was already reachable with an optional trigger of
   * the bot's firing on the human's turn.
   */
  if (state.pendingSearch?.playerId === botPlayerId) return true;
  if (state.pendingConfirmation?.playerId === botPlayerId) return true;
  if (state.pendingTargetChoices[0]?.playerId === botPlayerId) return true;
  if (state.pendingDiscards[0]?.playerId === botPlayerId) return true;
  /*
   * Somebody *else* owes a mid-resolution answer.
   *
   * Holding priority is not enough in that window - the engine refuses a pass
   * while a search is outstanding, so a bot woken here proposes one and the game
   * stops dead. The checks above have already returned true for every question
   * that is this bot's to answer, so anything still set belongs to another
   * player and the only correct move is to wait.
   *
   * Reachable before the Blech deck, but only from a card that makes an opponent
   * search or discard, and neither demo deck had one. Scheming Symmetry makes
   * both players search and found it on the first game.
   */
  if (someoneElseOwesAnAnswer(state)) return false;

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

/**
 * Whether the game is part-way through resolving something that is waiting on a
 * player's answer.
 *
 * The same list `mustNotAutoPass` checks in the engine, and for the same reason:
 * while any of these is set, nobody may pass priority. Kept as a list rather
 * than as one "pending anything" flag because that is how the state is shaped -
 * and a new pending kind added to the engine without a line here would show up
 * as a bot that stops the game, which is why the engine's own list carries the
 * same warning.
 */
function someoneElseOwesAnAnswer(state: GameState): boolean {
  return (
    state.pendingSearch !== null ||
    state.pendingEnterChoice !== null ||
    state.pendingConfirmation !== null ||
    state.pendingSacrifice !== null ||
    state.pendingAmount !== null ||
    state.pendingTargetChoices.length > 0 ||
    state.pendingDiscards.length > 0 ||
    state.pendingCardChoices.length > 0
  );
}
