import { useEffect, useRef, useState } from "react";
import type { CardDefinition } from "@mtg-commander-sim/engine";
import { cardArtUrl } from "../cardArt.js";

/**
 * A thin slice of a card's illustration across the top of its row in the deck
 * builder, plus the whole card on a deliberate hover.
 *
 * The strip is `art_crop` (the illustration with no frame or text box) clipped
 * to a band, which is enough to recognise a card at a glance without turning a
 * dense list into a gallery. The full card appears only after a pause, so
 * running the cursor down a list of 150 results doesn't strobe card images at
 * you - you get it when you stop and look at something, which is when you
 * wanted it.
 */

/** Long enough to be a decision, short enough not to feel broken. */
const HOVER_DELAY_MS = 1600;

export function CardArtStrip({ definition }: { definition: CardDefinition }) {
  const stripUrl = cardArtUrl(definition, "art_crop");
  const fullUrl = cardArtUrl(definition, "normal");
  const [failed, setFailed] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // A pending reveal must not survive the mouse leaving, or the card pops up
  // over whatever you moved on to.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!stripUrl || failed) return null;

  function open() {
    timer.current = window.setTimeout(() => setShowFull(true), HOVER_DELAY_MS);
  }
  function close() {
    window.clearTimeout(timer.current);
    setShowFull(false);
  }

  return (
    <div className="artstrip" onMouseEnter={open} onMouseLeave={close}>
      {/* The band clips; the wrapper does not, or the full card below would be
          cropped to a 46px strip along with it. */}
      <div className="artstrip__band">
        <img src={stripUrl} alt="" draggable={false} onError={() => setFailed(true)} />
      </div>
      {showFull && fullUrl && (
        <img className="artstrip__full" src={fullUrl} alt={definition.name} draggable={false} />
      )}
    </div>
  );
}
