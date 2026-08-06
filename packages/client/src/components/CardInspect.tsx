import { useEffect, useState } from "react";
import type { CardDefinition } from "@mtg-commander-sim/engine";
import { typeLine } from "../format.js";
import { ManaCostView } from "./ManaCostView.js";
import { describeCard } from "../cardText.js";
import { cardArtUrl } from "../cardArt.js";
import { useArtOverrides } from "../artContext.js";

/**
 * One card, as large as the window allows.
 *
 * Right-click any card anywhere - hand, battlefield, graveyard, the stack, the
 * mulligan - and it opens here. The sidebar panel already shows whatever is
 * under the cursor, but it is card-sized and it follows the mouse, so it can
 * neither be read at leisure nor held still while you think about something
 * else. This is the "stop and actually look at it" view.
 *
 * Right-click because left-click already means "play this", and a card game
 * cannot afford to make reading a card and casting it the same gesture.
 */

export interface CardInspectProps {
  definition: CardDefinition;
  cardDefinitions: Record<string, CardDefinition>;
  /** Whose copy this is, so it shows the printing their deck chose. */
  ownerId?: string;
  onClose: () => void;
}

export function CardInspect({ definition, cardDefinitions, ownerId, onClose }: CardInspectProps) {
  const overrides = useArtOverrides(ownerId);
  const [failed, setFailed] = useState(false);
  const imageUrl = cardArtUrl(definition, "normal", overrides);

  // Escape closes it, as it does every other overlay here. Bound to the window
  // rather than to the panel because opening this does not move focus, so a
  // key pressed straight afterwards never reaches the panel itself.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rules = describeCard(definition, cardDefinitions);
  const showImage = imageUrl !== undefined && !failed;

  return (
    // Anywhere outside the card closes it, including the card itself - there is
    // nothing to do in here but look, so every click may as well mean "done".
    <div className="overlay overlay--inspect" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inspect">
        {showImage ? (
          <img
            className="inspect__image"
            src={imageUrl}
            alt={definition.name}
            draggable={false}
            onError={() => setFailed(true)}
          />
        ) : (
          /* No printing to fetch - offline, or a token. The engine's own
             rendering of the card is then the only way to read it. */
          <div className="inspect__text">
            <div className="inspect__head">
              <span className="inspect__name">{definition.name}</span>
              <ManaCostView cost={definition.manaCost} size={20} className="inspect__cost" />
            </div>
            <div className="inspect__type">{typeLine(definition)}</div>
            {rules.length > 0 ? (
              rules.map((line, i) => (
                <p key={i} className="inspect__rule">
                  {line}
                </p>
              ))
            ) : (
              <p className="inspect__rule inspect__rule--none">No rules text.</p>
            )}
            {definition.types.includes("Creature") && (
              <div className="inspect__pt">
                {definition.power}/{definition.toughness}
              </div>
            )}
          </div>
        )}
        <p className="inspect__hint">Click anywhere or press Escape to close</p>
      </div>
    </div>
  );
}
