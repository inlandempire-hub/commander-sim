/**
 * "You may draw a card" - yes or no.
 *
 * The engine stops mid-resolution and asks rather than taking the upside for
 * you, so this is the only thing that can start the game moving again: no
 * priority is passed and no step advances while it is open. That is also why
 * it has no dismiss-by-clicking-away - there is no state to return to.
 */

export interface ConfirmTriggerProps {
  /** The question in the card's own words, written by the engine. */
  prompt: string;
  onAnswer: (accept: boolean) => void;
}

export function ConfirmTrigger({ prompt, onAnswer }: ConfirmTriggerProps) {
  return (
    <div className="overlay" role="dialog" aria-label="Optional trigger">
      <div className="overlay__panel overlay__panel--narrow">
        <p className="picker__prompt">{prompt}</p>
        <div className="confirm-trigger__buttons">
          <button type="button" className="confirm-trigger__yes" onClick={() => onAnswer(true)}>
            Yes
          </button>
          <button type="button" className="confirm-trigger__no" onClick={() => onAnswer(false)}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}
