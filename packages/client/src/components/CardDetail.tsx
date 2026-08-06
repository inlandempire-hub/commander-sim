import { useState } from "react";
import type { CardDefinition } from "@mtg-commander-sim/engine";
import { typeLine } from "../format.js";
import { ManaCostView } from "./ManaCostView.js";
import { describeCard } from "../cardText.js";
import { cardArtUrl } from "../cardArt.js";
import { useArtOverrides } from "../artContext.js";

/**
 * Whichever card you are currently looking at, printed face and all.
 *
 * The cards on the table only have room for a name, and a name is not enough:
 * knowing that "Mana Leak" is on the stack is useless if you don't already
 * know what Mana Leak does. This is the read-the-card panel that a physical
 * game gets for free by having the text printed on the card.
 *
 * And that is all it is. It used to print the name, type line, rules text and
 * power/toughness underneath the image, which is the same information twice -
 * the image already *is* the card, in the typesetting the reader knows, and
 * the panel restating it in a different wording only invited the question of
 * which one to believe.
 */

export interface CardDetailProps {
  definition?: CardDefinition;
  cardDefinitions: Record<string, CardDefinition>;
  /** Whose copy this is, so the panel shows the printing their deck chose. */
  ownerId?: string;
}

export function CardDetail({ definition, cardDefinitions, ownerId }: CardDetailProps) {
  const overrides = useArtOverrides(ownerId);
  // Keyed by card id so moving to a different card retries the image rather
  // than inheriting the previous one's failure.
  const [failedFor, setFailedFor] = useState<string | null>(null);

  if (!definition) {
    return (
      <aside className="detail detail--empty">
        <p className="detail__hint">Hover any card to read it.</p>
      </aside>
    );
  }

  // The whole card, frame and printed text included - this is the one place
  // worth spending the larger image on, because reading it is the point.
  const imageUrl = cardArtUrl(definition, "normal", overrides);

  if (imageUrl !== undefined && failedFor !== definition.id) {
    return (
      <aside className="detail">
        <img
          className="detail__image"
          src={imageUrl}
          alt={definition.name}
          draggable={false}
          onError={() => setFailedFor(definition.id)}
        />
      </aside>
    );
  }

  /*
   * No image to be had - offline, or a token that was never printed.
   *
   * The text is a fallback rather than a companion. Dropping it along with the
   * rest would make this panel silently useless in exactly the situation where
   * you cannot read the card any other way, so it stays for the one case that
   * needs it. Rendered from the engine's own effect data by `describeCard`, so
   * what it says is what the engine will actually do.
   */
  const rules = describeCard(definition, cardDefinitions);
  return (
    <aside className="detail detail--text">
      <div className="detail__head">
        <span className="detail__name">{definition.name}</span>
        <ManaCostView cost={definition.manaCost} size={14} className="detail__cost" />
      </div>
      <div className="detail__type">{typeLine(definition)}</div>
      {rules.length > 0 ? (
        <div className="detail__rules">
          {rules.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : (
        <p className="detail__vanilla">No rules text.</p>
      )}
      {definition.types.includes("Creature") && (
        <div className="detail__pt">
          {definition.power}/{definition.toughness}
        </div>
      )}
    </aside>
  );
}
