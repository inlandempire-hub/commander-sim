import type { ProtectionQuality } from "@mtg-commander-sim/engine";
import { qualityWord } from "@mtg-commander-sim/engine";

/**
 * "Protection from the color of your choice."
 *
 * The game is genuinely stopped while this is up - the ability has resolved and
 * is waiting on the answer - so there is no way to dismiss it, the same posture
 * as the enter-choice prompt and for the same reason.
 *
 * This is the whole reason Mother of Runes is a good card, so it wants to be
 * quick: five buttons, in WUBRG order, each showing the colour it names. Holding
 * the ability until something is cast at you and then naming that colour is the
 * play, and a prompt that took a moment to read would lose the point of it.
 */
const COLOURS: ProtectionQuality[] = ["W", "U", "B", "R", "G"];

export function ColorChoicePrompt({
  prompt,
  cardName,
  allowColorless,
  onAnswer,
}: {
  prompt: string;
  cardName: string;
  /** Giver of Runes prints it; the other two do not, and the engine refuses it for them. */
  allowColorless: boolean;
  onAnswer: (quality: ProtectionQuality) => void;
}) {
  const options: ProtectionQuality[] = allowColorless ? [...COLOURS, "colorless"] : COLOURS;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`${cardName}: ${prompt}`}>
      <div className="overlay__panel enter-choice">
        <h2 className="enter-choice__title">{cardName}</h2>
        <p className="enter-choice__prompt">Choose a colour to gain protection from.</p>
        <div className="enter-choice__options">
          {options.map((quality) => (
            <button
              key={quality}
              type="button"
              className={`enter-choice__option colour-choice colour-choice--${quality.toLowerCase()}`}
              onClick={() => onAnswer(quality)}
            >
              {qualityWord(quality)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
