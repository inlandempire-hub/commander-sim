import { useState } from "react";
import type { CardDefinition } from "@mtg-commander-sim/engine";
import { formatManaCost, typeLine } from "../format.js";
import { describeCard } from "../cardText.js";
import { cardArtUrl } from "../cardArt.js";
import { useArtOverrides } from "../artContext.js";

/**
 * The full text of whichever card you're currently looking at, pinned to the
 * side of the board.
 *
 * The cards on the table only have room for a name, and a name is not enough:
 * knowing that "Mana Leak" is on the stack is useless if you don't already
 * know what Mana Leak does. This is the read-the-card panel that a physical
 * game gets for free by having the text printed on the card.
 *
 * Rules text is rendered from the engine's own effect data by `describeCard`,
 * the same renderer the deck builder uses - so what it says is what the engine
 * will actually do, not a separate description that could drift from it.
 */

export interface CardDetailProps {
  definition?: CardDefinition;
  cardDefinitions: Record<string, CardDefinition>;
  /** Why this card is being shown, so the panel can say whether it's resolving or just hovered. */
  reason?: "stack" | "hover";
  /** Whose copy this is, so the panel shows the printing their deck chose. */
  ownerId?: string;
}

export function CardDetail({ definition, cardDefinitions, reason, ownerId }: CardDetailProps) {
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

  const rules = describeCard(definition, cardDefinitions);
  const isCreature = definition.types.includes("Creature");
  // The whole card, frame and printed text included - this is the one place
  // worth spending the larger image on, because reading it is the point.
  const imageUrl = cardArtUrl(definition, "normal", overrides);
  const showImage = imageUrl !== undefined && failedFor !== definition.id;

  return (
    <aside className="detail">
      {reason === "stack" && <div className="detail__badge">On the stack</div>}
      {showImage && (
        <img
          className="detail__image"
          src={imageUrl}
          alt={definition.name}
          draggable={false}
          onError={() => setFailedFor(definition.id)}
        />
      )}
      <div className="detail__head">
        <span className="detail__name">{definition.name}</span>
        <span className="detail__cost">{formatManaCost(definition.manaCost)}</span>
      </div>
      <div className="detail__type">{typeLine(definition)}</div>
      {rules.length > 0 ? (
        <div className="detail__rules">
          {rules.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : (
        // Genuinely blank cards exist - a vanilla creature has no rules text at
        // all - and saying so beats an empty gap that looks like a bug.
        <p className="detail__vanilla">No rules text.</p>
      )}
      {isCreature && (
        <div className="detail__pt">
          {definition.power}/{definition.toughness}
          <span className="detail__pt-label"> printed power/toughness</span>
        </div>
      )}
    </aside>
  );
}
