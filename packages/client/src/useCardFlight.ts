import { useLayoutEffect, useRef, useState } from "react";
import { planFlights, type Flight, type Placement } from "./flight.js";

/** How long a card spends in the air. */
export const FLIGHT_MS = 380;

/**
 * The DOM half of the card-movement animation - see flight.ts for what it is
 * and why it works by measurement.
 *
 * Every card publishes `data-card-instance`, `data-card-zone` and
 * `data-card-owner`; anything that wants to be a source or destination for a
 * card that isn't itself a card - the library pile - publishes
 * `data-flight-anchor`.
 */

interface Measurements {
  cards: Map<string, Placement>;
  anchors: Map<string, Placement>;
}

function rectOf(element: Element): { left: number; top: number; width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function measure(): Measurements {
  const cards = new Map<string, Placement>();
  const anchors = new Map<string, Placement>();
  if (typeof document === "undefined") return { cards, anchors };

  for (const element of document.querySelectorAll<HTMLElement>("[data-card-instance]")) {
    /*
     * The flying copies are cards too, and measuring them would have each card
     * chasing its own ghost.
     *
     * `data-flight-ignore` is the same escape hatch for anywhere else a card
     * appears that is not where the card actually is: the stack panel holding
     * a spell on screen for a moment after it resolved, an overlay showing a
     * hand. Without it two elements would claim the same instance and the
     * flight would measure whichever the browser returned last.
     */
    if (element.closest(".flight-layer, [data-flight-ignore]")) continue;
    const instanceId = element.dataset.cardInstance;
    if (!instanceId) continue;
    cards.set(instanceId, {
      zone: element.dataset.cardZone ?? "",
      ownerId: element.dataset.cardOwner ?? "",
      ...rectOf(element),
    });
  }

  for (const element of document.querySelectorAll<HTMLElement>("[data-flight-anchor]")) {
    const key = element.dataset.flightAnchor;
    if (!key) continue;
    anchors.set(key, { zone: "", ownerId: "", ...rectOf(element) });
  }

  return { cards, anchors };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface CardFlight {
  flights: Flight[];
  /** Cards whose real copy should stay hidden until the flying one lands. */
  flying: ReadonlySet<string>;
}

/**
 * Call once, from the component that renders the whole table. React runs
 * layout effects from the inside out, so by the time this runs every card has
 * been committed to the DOM and can be measured.
 *
 * `paused` holds everything still while opening hands are being decided, which
 * is what makes the deal happen at the right moment. Cards are dealt into a
 * hand that a full-screen overlay is sitting on top of, so animating them there
 * meant the one flight worth watching - seven cards coming off the library at
 * the start of a game - played out behind the dialog that was covering it, and
 * again for every mulligan. Nothing is measured while paused, so when the last
 * player keeps, every card in hand is somewhere the flight system has never
 * seen one before, and the existing "came off the top of the library" path
 * deals them all out onto an empty table.
 */
export function useCardFlight(paused = false): CardFlight {
  const previous = useRef<Map<string, Placement>>(new Map());
  const sequence = useRef(0);
  const [flights, setFlights] = useState<Flight[]>([]);

  useLayoutEffect(() => {
    if (paused) {
      // Forgetting rather than merely skipping. A card measured before the
      // pause would still be "where it was" afterwards, and the hand would
      // slide from behind the overlay instead of being dealt.
      previous.current = new Map();
      return;
    }
    const { cards, anchors } = measure();
    const planned = prefersReducedMotion()
      ? []
      : planFlights(previous.current, cards, anchors, sequence.current++);
    previous.current = cards;
    if (planned.length === 0) return;

    setFlights((current) => [...current, ...planned]);

    /*
     * Cleared on a timer rather than when the animation reports itself
     * finished, and that is the important part: a browser tab that isn't
     * compositing never issues animation frames, so an animation there never
     * completes and never fires its callback. Hanging the "put the real card
     * back" step off that would leave cards permanently invisible in exactly
     * the situation where the animation was invisible anyway.
     *
     * A timer fires regardless, so the worst case degrades to "the card
     * appears without travelling" instead of "the card is gone".
     */
    for (const flight of planned) {
      window.setTimeout(
        () => setFlights((current) => current.filter((f) => f.key !== flight.key)),
        flight.delay + FLIGHT_MS + 80,
      );
    }
    // No dependency list on purpose: any render at all can be the one that
    // moved a card, and comparing measurements is how we find out.
  });

  const flying = new Set(flights.map((flight) => flight.instanceId));
  return { flights, flying };
}
