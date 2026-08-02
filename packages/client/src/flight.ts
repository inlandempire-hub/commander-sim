/**
 * Working out which cards should physically travel, and from where to where.
 *
 * The technique is the standard one for animating something between two places
 * the layout engine put it: measure every card on screen after each render,
 * and when a card turns up in a different zone from the one it was in last
 * time, we already know both its old and new positions on screen. A copy of
 * the card is then flown from the first to the second in a fixed overlay
 * above the table, while the real one stays hidden until it lands.
 *
 * Doing it by measurement rather than by hooking each game action means the
 * engine never has to tell the UI that a card moved. Anything that changes a
 * card's zone - a spell resolving, a creature dying, a land being played, an
 * effect nobody has written yet - animates without further work.
 *
 * This module deliberately contains no React and no DOM: it takes two sets of
 * measurements and returns a list of journeys, which is the part worth testing.
 */

export interface Placement {
  /** hand, battlefield, graveyard, stack - whatever the card instance reports. */
  zone: string;
  ownerId: string;
  /** Viewport coordinates, as getBoundingClientRect gives them. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Flight {
  /** Unique per journey, so React keeps two moves of the same card apart. */
  key: string;
  instanceId: string;
  from: Placement;
  to: Placement;
  /** Milliseconds to wait before setting off, so a batch fans out. */
  delay: number;
}

/** Milliseconds between the departures of cards moving in the same batch. */
export const STAGGER_MS = 55;

/** Beyond this a "deal seven cards" stagger starts feeling like a wait. */
const MAX_STAGGER_MS = 330;

/** The anchor key a player's library pile publishes, so draws have a source. */
export function libraryAnchorKey(playerId: string): string {
  return `library:${playerId}`;
}

/**
 * Compares two rounds of measurements and returns the journeys to animate.
 *
 * `sequence` only has to differ between calls; it exists so a card that moves
 * hand -> stack -> graveyard produces two flights with distinct keys rather
 * than one that React thinks is the same element being re-rendered.
 */
export function planFlights(
  before: ReadonlyMap<string, Placement>,
  after: ReadonlyMap<string, Placement>,
  anchors: ReadonlyMap<string, Placement>,
  sequence: number,
): Flight[] {
  const flights: Flight[] = [];

  for (const [instanceId, to] of after) {
    // A card measured at zero size is mid-layout or in a collapsed container;
    // flying it would divide by zero working out the scale.
    if (to.width <= 0 || to.height <= 0) continue;

    const from = before.get(instanceId);
    if (from) {
      // Same zone means it only shifted along a row because its neighbours
      // changed - cards sliding sideways every time a hand grows is noise.
      if (from.zone === to.zone) continue;
      if (from.width <= 0 || from.height <= 0) continue;
      flights.push({ key: `${instanceId}:${sequence}`, instanceId, from, to, delay: 0 });
      continue;
    }

    // Not on screen at all a moment ago. The only zone that happens for and
    // that is worth animating is the hand: the card came off the top of the
    // library, which is drawn as a pile, so there is a real place to fly it
    // from. Cards appearing anywhere else came from somewhere unrendered
    // (a shuffle, a token being created) and have no honest starting point.
    if (to.zone !== "hand") continue;
    const library = anchors.get(libraryAnchorKey(to.ownerId));
    if (!library || library.width <= 0) continue;
    flights.push({ key: `${instanceId}:${sequence}`, instanceId, from: library, to, delay: 0 });
  }

  // Everything in one batch left at once looked like a glitch rather than a
  // deal, so they set off one after another. Sorted by destination so an
  // opening hand fans out left to right instead of in map order.
  flights.sort((a, b) => a.to.left - b.to.left);
  return flights.map((flight, index) => ({
    ...flight,
    delay: Math.min(index * STAGGER_MS, MAX_STAGGER_MS),
  }));
}
