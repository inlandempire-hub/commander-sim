import type { GameState } from "@mtg-commander-sim/engine";

export interface ActionBarProps {
  state: GameState;
  onPassPriority: () => void;
  showConfirmAttackers: boolean;
  onConfirmAttackers: () => void;
  showConfirmBlockers: boolean;
  onConfirmBlockers: () => void;
  /** False when priority belongs to a seat this client doesn't drive (the bot, or the opponent over the network). */
  canActForPriorityPlayer: boolean;
  pendingTargetPrompt: string | null;
  onCancelTargeting: () => void;
  lastError: string | null;
  onClearError: () => void;
}

export function ActionBar({
  state,
  onPassPriority,
  showConfirmAttackers,
  onConfirmAttackers,
  showConfirmBlockers,
  onConfirmBlockers,
  canActForPriorityPlayer,
  pendingTargetPrompt,
  onCancelTargeting,
  lastError,
  onClearError,
}: ActionBarProps) {
  const priorityPlayerId = state.players[state.priorityPlayerIndex]?.id ?? "?";
  const activePlayerId = state.players[state.activePlayerIndex]?.id ?? "?";
  const gameOver = state.players.find((p) => p.hasLost);

  return (
    <div className="action-bar">
      <div className="action-bar__status">
        <span>
          Turn {state.turnNumber} — {activePlayerId}'s turn
        </span>
        <span className="action-bar__step">
          {state.phase} / {state.step}
        </span>
        <span>Priority: {priorityPlayerId}</span>
      </div>

      {gameOver ? (
        <div className="action-bar__game-over">
          {gameOver.id} has lost — {gameOver.lossReason}
        </div>
      ) : (
        <div className="action-bar__actions">
          {pendingTargetPrompt && (
            <div className="action-bar__prompt">
              <span>{pendingTargetPrompt}</span>
              <button onClick={onCancelTargeting}>Cancel</button>
            </div>
          )}
          {/* Declaring attackers/blockers isn't a priority action - the defending
              player declares blocks while the attacker still holds priority - so
              these are gated on controlling the relevant seat, not on priority. */}
          {showConfirmAttackers && <button onClick={onConfirmAttackers}>Confirm Attackers</button>}
          {showConfirmBlockers && <button onClick={onConfirmBlockers}>Confirm Blockers (none = no blocks)</button>}
          {canActForPriorityPlayer ? (
            <button onClick={onPassPriority}>Pass Priority ({priorityPlayerId})</button>
          ) : (
            // Passing here would pass on someone else's behalf - which in bot mode
            // silently stole the bot's turn before it could act.
            <span className="action-bar__waiting">Waiting for {priorityPlayerId}...</span>
          )}
        </div>
      )}

      {lastError && (
        <div className="action-bar__error" onClick={onClearError}>
          {lastError} (click to dismiss)
        </div>
      )}
    </div>
  );
}
