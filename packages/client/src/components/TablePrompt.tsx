/**
 * The one thing the game currently needs to say to you, floated over the table.
 *
 * Prompts and errors are sentences - "click one of your creatures, then the
 * attacker it blocks" - and a sentence needs a line to live on. Giving it a
 * permanent one meant a strip across the whole table that stood empty most of
 * the game, and once the buttons moved to the rail that was all the strip had
 * left to justify itself.
 *
 * So it floats instead: no space reserved when there is nothing to say, and
 * the full width of the table to say it in when there is. It sits on the line
 * between the two boards, which is both where the eye already is during
 * combat and the one horizontal band that holds no cards.
 *
 * An error outranks a prompt. If a click was just refused, why it was refused
 * is more urgent than the instruction you were already following.
 */

export interface TablePromptProps {
  prompt: string | null;
  error: string | null;
  onClearError: () => void;
  /** Only a real pending choice can be cancelled; guidance has nothing to undo. */
  showCancel?: boolean;
  onCancel: () => void;
}

export function TablePrompt({
  prompt,
  error,
  onClearError,
  showCancel,
  onCancel,
}: TablePromptProps) {
  if (error) {
    return (
      <div className="table-prompt table-prompt--error" onClick={onClearError} role="alert">
        {error} <span className="table-prompt__dismiss">(click to dismiss)</span>
      </div>
    );
  }

  if (!prompt) return null;

  return (
    <div className="table-prompt">
      <span>{prompt}</span>
      {showCancel && (
        <button type="button" className="table-prompt__cancel" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
