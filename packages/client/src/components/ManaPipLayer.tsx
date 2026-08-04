import type { CSSProperties } from "react";
import type { ManaPip } from "../useManaTaps.js";

/**
 * The mana itself, in flight.
 *
 * One dot per land tapped, leaving the land and arriving at that player's mana
 * readout. It is the smallest possible version of the idea that a cost is
 * something you *pay* rather than a state the board changes into.
 *
 * Fixed to the viewport and ignoring pointer events, so it never affects the
 * layout underneath or intercepts a click. Deliberately not part of the card
 * flight layer despite the family resemblance: these are not cards, nothing
 * measures them, and they have no zone to arrive in.
 */
export function ManaPipLayer({ pips }: { pips: ManaPip[] }) {
  if (pips.length === 0) return null;

  return (
    <div className="pip-layer" aria-hidden="true">
      {pips.map((pip) => (
        <span
          key={pip.key}
          className={`pip pip--${pip.color}`}
          style={
            {
              "--from-x": `${pip.fromX}px`,
              "--from-y": `${pip.fromY}px`,
              "--to-x": `${pip.toX}px`,
              "--to-y": `${pip.toY}px`,
              "--pip-delay": `${pip.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
