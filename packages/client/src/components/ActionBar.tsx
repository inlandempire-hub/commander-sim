import type { GameState } from "@mtg-commander-sim/engine";

/**
 * The centre strip's controls. Turn, phase and step live in the top bar now,
 * so this is only the things you can press and the things you need told:
 * whose priority it is, what a pending spell is waiting for, and any error.
 */

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
  /** The blocking prompt is guidance, not a pending choice, so it has nothing to cancel. */
  showCancel?: boolean;
  onCancelTargeting: () => void;
  lastError: string | null;
  onClearError: () => void;
  /** Give up. Asks first - it ends the game and cannot be taken back. */
  onConcede: () => void;
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
  showCancel,
  onCancelTargeting,
  lastError,
  onClearError,
  onConcede,
}: ActionBarProps) {
  const priorityPlayerId = state.players[state.priorityPlayerIndex]?.id ?? "?";
  const gameOver = state.players.find((p) => p.hasLost);

  return (
    <div className="action-bar">
      {gameOver ? (
        <div className="action-bar__game-over">
          {gameOver.id} has lost — {gameOver.lossReason}
        </div>
      ) : (
        <div className="action-bar__actions">
          {pendingTargetPrompt && (
            <div className="action-bar__prompt">
              <span>{pendingTargetPrompt}</span>
              {showCancel && <button onClick={onCancelTargeting}>Cancel</button>}
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

      {/* Last, and visually quiet, because it ends the game. It confirms first
          for the same reason. Without it a lost position has to be played out
          to the last point of damage, or the tab closed. */}
      <button
        type="button"
        className="action-bar__concede"
        title="Give up and end the game"
        onClick={() => {
          if (window.confirm("Concede the game? This cannot be undone.")) onConcede();
        }}
      >
        Concede
      </button>
    </div>
  );
}
