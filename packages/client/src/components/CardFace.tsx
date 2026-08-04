import { useState } from "react";
import type { CardDefinition, CardInstance } from "@mtg-commander-sim/engine";
import { cardArtUrl } from "../cardArt.js";
import { useArtOverrides } from "../artContext.js";
import { useInspect } from "../inspectContext.js";
import { CardView } from "./CardView.js";

/**
 * The whole printed card - frame, rules text and all - rather than the board's
 * cropped illustration.
 *
 * On the table a card has to show live information the printed face cannot:
 * current power and toughness after anthems, damage marked, counters, whether
 * it is tapped. That is why the board draws its own frame around an art crop.
 *
 * Away from the table none of that applies and the opposite is true: what you
 * need is to *read* the card. Deciding an opening hand is exactly that, so it
 * shows the real face and needs no hover-somewhere-else to explain itself.
 */

export interface CardFaceProps {
  instance: CardInstance;
  definition: CardDefinition;
  onClick?: () => void;
  /** Marks this card as chosen - for the mulligan, "this one goes back". */
  marked?: boolean;
}

export function CardFace({ instance, definition, onClick, marked }: CardFaceProps) {
  const overrides = useArtOverrides(instance.ownerId);
  const imageUrl = cardArtUrl(definition, "normal", overrides);
  const [failed, setFailed] = useState(false);
  // Right-click enlarges, the same as on the board. It matters most during the
  // mulligan, where seven cards share one row and each is at its smallest.
  const inspect = useInspect();

  // Offline, or a token with no printing at all. The board's own frame is a
  // worse way to read a card but an entirely working one, so falling back to
  // it beats showing a gap.
  if (!imageUrl || failed) {
    return (
      <CardView
        instance={instance}
        definition={definition}
        onClick={onClick}
        selected={marked}
      />
    );
  }

  return (
    <img
      className={`face ${marked ? "face--marked" : ""}`}
      src={imageUrl}
      alt={definition.name}
      title={`${definition.name} (right-click to enlarge)`}
      draggable={false}
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault();
        inspect(definition, instance.ownerId);
      }}
      onError={() => setFailed(true)}
    />
  );
}
