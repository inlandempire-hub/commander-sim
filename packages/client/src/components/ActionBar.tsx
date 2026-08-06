import { passWouldEndTurn, type GameState } from "@mtg-commander-sim/engine";

/**
 * The buttons that act on the game, in the column under the command zone.
 *
 * They have moved twice. First from a full-width strip between the two boards,
 * which cost 58px of table height for one row of buttons; then into the left
 * rail; and now into the gap beside the hand, which the command zone left
 * behind when it stopped spanning the whole height of the board. That gap is
 * the best of the three: it is level with your hand, which is where your eyes
 * already are when it is your turn to act.
 *
 * Only the bottom seat gets one, which is the only seat you ever drive - see
 * main.tsx, where hotseat was removed for exactly that reason.
 *
 * Concede is deliberately not here - see ConcedeButton. Anything wordy - a
 * prompt explaining a two-click choice, an error - is not here either; see
 * TablePrompt, because those need room to be read.
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
}

export function ActionBar({
  state,
  onPassPriority,
  showConfirmAttackers,
  onConfirmAttackers,
  showConfirmBlockers,
  onConfirmBlockers,
  canActForPriorityPlayer,
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

  /*
   * "Pass" almost always, "End Turn" when this click is the one that hands the
   * turn over. Passing priority is the most-clicked button in the game and it
   * is also the one whose consequences vary most: usually it moves you on a
   * step, and once a turn it gives up everything you had left to do. Saying so
   * on the button is the cheapest possible warning.
   */
  const endsTurn = passWouldEndTurn(state, priorityPlayerId);

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
        <button
          className={`action-bar__go ${endsTurn ? "action-bar__go--end-turn" : ""}`.trim()}
          title={
            endsTurn
              ? "Pass here and your turn is over"
              : "Pass priority - the game moves on to the next step"
          }
          onClick={onPassPriority}
        >
          {/* No name on it. This button is only ever yours to press - there
              is no mode left in which this client acts for anybody else - so
              "Pass / Deadly Donny" was telling you who you are on every turn
              of every game. */}
          {endsTurn ? "End Turn" : "Pass"}
        </button>
      ) : (
        // Passing here would pass on someone else's behalf - which in bot mode
        // silently stole the bot's turn before it could act.
        <span className="action-bar__waiting">Waiting for {priorityPlayerId}...</span>
      )}
    </div>
  );
}

/**
 * Give up.
 *
 * Its own component in its own fixed place - directly above the library and
 * graveyard, in the same spot from the first turn to the last. It used to sit
 * at the end of the action bar, which meant it moved every time a confirm
 * button appeared or disappeared beside it: a button that ends the game
 * outright should never be somewhere your cursor might arrive by accident.
 *
 * Red and filled rather than quiet, for the same reason. It confirms first.
 */
export function ConcedeButton({ onConcede }: { onConcede: () => void }) {
  return (
    <button
      type="button"
      className="concede"
      title="Give up and end the game"
      onClick={() => {
        if (window.confirm("Concede the game? This cannot be undone.")) onConcede();
      }}
    >
      Concede
    </button>
  );
}
