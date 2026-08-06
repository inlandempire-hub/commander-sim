import { useLayoutEffect, useRef, type ReactNode } from "react";
import { arcFor, openAround, overlapFor } from "../fan.js";

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
  /**
   * Bend this row into a held fan - see `arcFor`. Opt-in, and only the hand
   * asks for it: a battlefield is a table with cards laid on it, and tilting
   * those would say "held" about something nobody is holding.
   */
  arc?: boolean;
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

export function CardRow({ className, arc, children }: CardRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const applied = useRef(-1);
  const arcApplied = useRef("");
  const measure = useRef(() => {});

  /*
   * The one place in this client where something other than React writes to a
   * card element, and it is deliberate rather than a shortcut.
   *
   * The overlap is one number for the whole row, so it goes out as a custom
   * property on the row and every card inherits it. The fan is not: each card
   * has its own angle, and the value depends on how many cards there are and
   * how tall they resolved to - neither of which the component rendering the
   * hand knows. Threading a per-card style prop down from there would mean
   * measuring in one component and passing the answer through another.
   *
   * These are custom properties, not styles React manages, and CardView sets no
   * `style` prop at all, so there is nothing here for React to fight over. The
   * stylesheet reads them through `--fan-tilt` rather than using them directly,
   * which is what lets `:hover` straighten a card that has an inline angle -
   * an inline custom property would otherwise beat every rule in the sheet.
   */
  const applyArc = (cards: HTMLElement[]) => {
    const height = cards[0]?.offsetHeight ?? 0;
    const signature = arc ? `${cards.length}:${height}` : "";
    if (signature === arcApplied.current) return;
    arcApplied.current = signature;

    if (!arc) {
      for (const card of cards) {
        card.style.removeProperty("--fan-angle");
        card.style.removeProperty("--fan-drop");
      }
      return;
    }

    const poses = arcFor({ count: cards.length, cardHeight: height });
    cards.forEach((card, index) => {
      const pose = poses[index];
      if (!pose) return;
      card.style.setProperty("--fan-angle", `${pose.tiltDeg.toFixed(2)}deg`);
      card.style.setProperty("--fan-drop", `${pose.liftPx.toFixed(2)}px`);
    });
  };

  /*
   * Which card the cursor is over, and how far the rest should slide aside for
   * it - see `openAround`.
   *
   * The index is found by delegation rather than by a listener per card,
   * because React replaces the children whenever the hand changes and
   * per-child listeners would have to be rebound every time. One listener on
   * the row survives all of it.
   */
  const hovered = useRef(-1);
  const applyOpening = (cards: HTMLElement[], overlap: number) => {
    const shifts = openAround({ count: cards.length, hovered: hovered.current, overlap });
    cards.forEach((card, index) => {
      const shift = shifts[index] ?? 0;
      if (shift === 0) card.style.removeProperty("--fan-shift");
      else card.style.setProperty("--fan-shift", `${shift.toFixed(2)}px`);
    });
  };

  measure.current = () => {
    const row = ref.current;
    if (!row) return;
    const cards = Array.from(row.children) as HTMLElement[];
    const style = getComputedStyle(row);
    const gap = Number.parseFloat(style.columnGap) || 0;

    /*
     * The width the cards can actually use, which is not `clientWidth`:
     * clientWidth includes horizontal padding, and a fanned row has some (see
     * `.row__cards--arc`). Measuring against padding the cards cannot occupy
     * would under-overlap the row and push the last card into the clip.
     */
    const padding =
      (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const overlap = overlapFor({
      available: row.clientWidth - padding,
      count: cards.length,
      cardWidth: cards[0] ? assumedCardWidth(cards[0]) : 0,
      gap,
    });

    applyArc(cards);
    if (arc) applyOpening(cards, overlap);

    // Only write when it has actually moved. The row's own width comes from its
    // parent rather than from its contents, so this cannot feed back into the
    // observer - but a no-op write every render would still be churn.
    //
    // That first claim is only true because `.row__cards` sets `min-width: 0`.
    // Without it a flex item's minimum size is its content size, the row grows
    // to whatever the cards currently need, and `available` below is measured
    // from the very thing it is supposed to be constraining. The row then sits
    // at a happy fixed point that is wider than the zone holding it, and the
    // overflow clip quietly eats the last card. Don't remove it.
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

  /*
   * Tracking the cursor, for the parting above. Deliberately kept out of React
   * state: this changes on every mouse move across a hand and re-rendering the
   * whole board to slide two cards sideways would be an absurd price. The
   * indices are read back out of the DOM at the moment they are needed.
   */
  useLayoutEffect(() => {
    const row = ref.current;
    if (!row || !arc) return;

    const indexOf = (target: EventTarget | null): number => {
      if (!(target instanceof Node)) return -1;
      return Array.from(row.children).findIndex((child) => child.contains(target));
    };
    const set = (index: number) => {
      if (index === hovered.current) return;
      hovered.current = index;
      measure.current();
    };
    const onOver = (event: PointerEvent) => set(indexOf(event.target));
    // pointerleave rather than pointerout: out fires while moving *between*
    // cards inside the row, which would slam the hand shut and reopen it on
    // every crossing.
    const onLeave = () => set(-1);

    row.addEventListener("pointerover", onOver);
    row.addEventListener("pointerleave", onLeave);
    return () => {
      row.removeEventListener("pointerover", onOver);
      row.removeEventListener("pointerleave", onLeave);
    };
  }, [arc]);

  return (
    <div ref={ref} className={arc ? `${className ?? ""} row__cards--arc`.trim() : className}>
      {children}
    </div>
  );
}
