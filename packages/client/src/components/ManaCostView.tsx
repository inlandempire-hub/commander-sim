import { useState } from "react";
import type { ManaCost } from "@mtg-commander-sim/engine";
import { manaSymbols } from "../manaSymbols.js";
import { formatManaCost } from "../format.js";

/**
 * A mana cost as printed symbols rather than as {3}{B}{B}.
 *
 * The braces notation is how Magic writes a cost down in text; it is not how a
 * card shows it, and on a card face it is both longer and slower to read than
 * the pips it stands for. Three black pips read as "three black" at a glance;
 * "{3}{B}{B}" has to be parsed.
 *
 * The icons are Wizards' symbols, so - like the card backs and the Scryfall art
 * - they live on disk rather than in the repo (see .gitignore and
 * docs/SETUP.md). That makes "no icon on disk" a state this has to handle, not
 * a defensive nicety: when an icon fails to load, the whole cost falls back to
 * the braces text in one go rather than half in pips and half in text, which is
 * unreadable. One flag for the lot, because they either all shipped or none
 * did.
 *
 * `size` is in pixels and is the pip diameter, defaulting to the size that fits
 * a card in hand.
 */
export function ManaCostView({
  cost,
  size = 11,
  className,
}: {
  cost: ManaCost | undefined;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const symbols = manaSymbols(cost);
  if (symbols.length === 0) return null;

  const text = formatManaCost(cost);
  if (failed || symbols.some((s) => s.src === undefined)) {
    return <span className={["mana-cost", "mana-cost--text", className].filter(Boolean).join(" ")}>{text}</span>;
  }

  return (
    <span
      className={["mana-cost", className].filter(Boolean).join(" ")}
      style={{ "--pip": `${size}px` } as React.CSSProperties}
      // The whole cost in one label. Per-pip alt text would have a screen
      // reader say "3 B B", and the title tooltip repeat it on every pip.
      title={text}
      aria-label={text}
      role="img"
    >
      {symbols.map((symbol) => (
        <img
          key={symbol.key}
          className="mana-cost__pip"
          src={symbol.src}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
        />
      ))}
    </span>
  );
}
