import type { CardDefinition } from "@mtg-commander-sim/engine";

/**
 * Every printing of one card, for the art picker.
 *
 * The card pool ships with a single Scryfall id per card - the one from the
 * `oracle_cards` bulk file, which holds exactly one row per unique card and
 * so picks Scryfall's own representative printing. That is an arbitrary
 * choice as far as a player is concerned: Lightning Bolt has been printed
 * dozens of times, and the representative row is whichever Scryfall settled
 * on, not the one you remember.
 *
 * So when you actually want to choose, we ask Scryfall for the full list.
 * `unique=prints` is the flag that turns "one row per card" into "one row per
 * printing". It is a live request, deliberately: caching a list of every
 * printing of 815 cards would be bundling a chunk of their database, which
 * CLAUDE.md rules out.
 */

const SEARCH_URL = "https://api.scryfall.com/cards/search";

export interface Printing {
  scryfallId: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  /** Empty for the rare card with no credited artist, e.g. some older tokens. */
  artist: string;
  releasedAt: string;
}

export type PrintingsResult =
  | { status: "ok"; printings: Printing[] }
  | { status: "empty" }
  | { status: "offline" }
  | { status: "error"; message: string };

interface PrintingApiCard {
  id: string;
  set: string;
  set_name?: string;
  collector_number?: string;
  artist?: string;
  released_at?: string;
  /** "missing" and "placeholder" mean Scryfall has no real scan yet. */
  image_status?: string;
}

/**
 * Looks up by exact name (`!"..."`) rather than by our card id, because our
 * ids are our own invention and mean nothing to Scryfall. Names are what the
 * two datasets share - the same join the deck builder's Scryfall panel
 * already relies on.
 */
export async function fetchPrintings(
  definition: CardDefinition,
  signal?: AbortSignal,
): Promise<PrintingsResult> {
  const query = `!"${definition.name}"`;
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { status: "offline" };
  }

  // Scryfall answers "nothing matched" with a 404, which is not an error here.
  if (response.status === 404) return { status: "empty" };
  if (!response.ok) return { status: "error", message: `Scryfall returned ${response.status}` };

  let payload: { data?: PrintingApiCard[] };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { status: "error", message: "Scryfall sent something unreadable" };
  }

  const printings = toPrintings(payload.data ?? []);
  if (printings.length === 0) return { status: "empty" };
  return { status: "ok", printings };
}

/**
 * Split out from the fetch so it can be tested without a network. Drops
 * printings with no artwork - offering an art choice that renders as a blank
 * card is worse than not offering it.
 */
export function toPrintings(cards: PrintingApiCard[]): Printing[] {
  return cards
    .filter((card) => card.image_status !== "missing" && card.image_status !== "placeholder")
    .map((card) => ({
      scryfallId: card.id,
      setCode: card.set.toUpperCase(),
      setName: card.set_name ?? card.set.toUpperCase(),
      collectorNumber: card.collector_number ?? "",
      artist: card.artist ?? "",
      releasedAt: card.released_at ?? "",
    }));
}
