import { useLayoutEffect, useRef, type ReactNode } from "react";
import { overlapFor } from "../fan.js";

/**
 * A row of cards that closes up rather than scrolling when it gets crowded.
 *
 * The measuring has to happen in the browser - it depends on the real width
 * the row ended up with and the size the cards resolved to, neither of which
 * is knowable from the game state. The arithmetic itself lives in fan.ts,
 * where it can be tested; this only reads the DOM and writes one number back.
 *
 * That number goes out as a CSS custom property rather than as inline styles
 * on each card, so React stays the only thing that touches the cards, and the
 * rule that consumes it (a negative margin on every card after the first)
 * lives in the stylesheet with the rest of the layout.
 */

export interface CardRowProps {
  className?: string;
  children: ReactNode;
}

/**
 * How wide to assume a card is - deliberately rounded *up*.
 *
 * Neither obvious measurement is both exact and usable.
 * `getBoundingClientRect()` measures the card after its transform, so a tapped
 * card - rotated nine degrees - reports a box wider than the card is, and the
 * row would close up more than it needs to. `offsetWidth` ignores transforms
 * correctly but rounds to a whole pixel, and that error is *per card*: eight
 * cards each under-measured by a quarter of a pixel had the row overshooting
 * its own width by two, which `overflow: clip` then shaved off the last card.
 * (The resolved `width` from getComputedStyle is a float, but whether it means
 * the content box or the border box varies by browser, and guessing wrong
 * there is a four-pixel error rather than a quarter-pixel one.)
 *
 * So assume each card is up to a pixel wider than measured. The row then always
 * closes up slightly more than strictly necessary - at most one pixel per card,
 * which is invisible - and can never be left overflowing and clipped.
 */
function assumedCardWidth(card: HTMLElement): number {
  return card.offsetWidth + 1;
}

export function CardRow({ className, children }: CardRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const applied = useRef(-1);
  const measure = useRef(() => {});

  measure.current = () => {
    const row = ref.current;
    if (!row) return;
    const cards = Array.from(row.children) as HTMLElement[];
    const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
    const overlap = overlapFor({
      available: row.clientWidth,
      count: cards.length,
      cardWidth: cards[0] ? assumedCardWidth(cards[0]) : 0,
      gap,
    });

    // Only write when it has actually moved. The row's own width comes from
    // its parent rather than from its contents, so this cannot feed back into
    // the observer - but a no-op write every render would still be churn.
    if (Math.abs(overlap - applied.current) < 0.5) return;
    applied.current = overlap;
    row.style.setProperty("--overlap", `${overlap}px`);
  };

  // Every render: cards arriving and leaving is the common case, and it does
  // not change the row's own size, so nothing else would notice it.
  useLayoutEffect(() => {
    measure.current();
  });

  // Once: the window changing size does change the row, and the number has to
  // be recomputed without React re-rendering anything.
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row) return;
    const observer = new ResizeObserver(() => measure.current());
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
