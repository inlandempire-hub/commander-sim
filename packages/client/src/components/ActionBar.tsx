import type { GameState } from "@mtg-commander-sim/engine";

/**
 * The buttons, in the left rail under the life total.
 *
 * They used to sit in a strip between the two boards, which cost 58px of
 * height across the full width of the table for one row of buttons - and once
 * the stack moved to the sidebar that strip had nothing else in it. The rail
 * already exists on both halves and already holds the things that are true of
 * a player rather than of a card, so the controls moved into it and the strip
 * went away.
 *
 * Only the bottom seat gets one. In bot mode that is the only seat you drive;
 * in hotseat you drive both from one screen, and a button that jumped between
 * the top and bottom rail depending on whose decision it was would be worse
 * than one that is always in the same place.
 *
 * Anything wordy - a prompt explaining a two-click choice, an error - is not
 * here. See TablePrompt: those need room to be read, and reserving that room
 * permanently in a 132px column is exactly the trade this change undid.
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
  onConcede,
}: ActionBarProps) {
  const priorityPlayerId = state.players[state.priorityPlayerIndex]?.id ?? "?";
  const gameOver = state.players.find((p) => p.hasLost);

  if (gameOver) {
    return (
      <div className="action-bar">
        <div className="action-bar__game-over">
          {gameOver.id} has lost — {gameOver.lossReason}
        </div>
      </div>
    );
  }

  return (
    <div className="action-bar">
      {/* Declaring attackers/blockers isn't a priority action - the defending
          player declares blocks while the attacker still holds priority - so
          these are gated on controlling the relevant seat, not on priority. */}
      {showConfirmAttackers && (
        <button className="action-bar__go" onClick={onConfirmAttackers}>
          Confirm attackers
        </button>
      )}
      {showConfirmBlockers && (
        <button
          className="action-bar__go"
          title="Confirm with none selected to declare no blocks"
          onClick={onConfirmBlockers}
        >
          Confirm blocks
        </button>
      )}
      {canActForPriorityPlayer ? (
        <button className="action-bar__go" onClick={onPassPriority}>
          Pass priority
          <span className="action-bar__who">{priorityPlayerId}</span>
        </button>
      ) : (
        // Passing here would pass on someone else's behalf - which in bot mode
        // silently stole the bot's turn before it could act.
        <span className="action-bar__waiting">Waiting for {priorityPlayerId}...</span>
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
