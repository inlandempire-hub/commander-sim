import type { CardDefinition } from "@mtg-commander-sim/engine";

/**
 * The "is this a real card, and does the engine know it?" lookup.
 *
 * CLAUDE.md requires the deck builder to distinguish cards the engine
 * implements from all real Commander-legal cards, and forbids bundling a copy
 * of Scryfall's data into the repo. So the implemented pool ships with the
 * app (it's our own transcription) and the full pool is queried live from
 * Scryfall's public API, which explicitly permits this kind of personal,
 * non-commercial use.
 *
 * Practical consequence: this half of the deck builder needs an internet
 * connection, and returns `offline` rather than an error when there isn't one.
 * Everything you can actually put in a deck works with no network at all.
 */

const SEARCH_URL = "https://api.scryfall.com/cards/search";

export interface ScryfallCard {
  scryfallId: string;
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  /** Set when this exact card is already implemented in the engine, so it can be added directly. */
  implementedAs?: CardDefinition;
}

export type ScryfallResult =
  | { status: "ok"; cards: ScryfallCard[]; totalCards: number }
  | { status: "empty" }
  | { status: "offline" }
  | { status: "error"; message: string };

interface ScryfallApiCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  card_faces?: Array<{ mana_cost?: string; type_line?: string; oracle_text?: string }>;
}

function faceText(card: ScryfallApiCard): { manaCost: string; typeLine: string; oracleText: string } {
  // Double-faced cards put their text on faces rather than the card itself.
  const front = card.card_faces?.[0];
  return {
    manaCost: card.mana_cost ?? front?.mana_cost ?? "",
    typeLine: card.type_line ?? front?.type_line ?? "",
    oracleText: card.oracle_text ?? front?.oracle_text ?? "",
  };
}

/**
 * Searches every Commander-legal card. The caller is responsible for
 * debouncing - Scryfall asks for no more than ~10 requests a second, and the
 * UI waits for a pause in typing before calling this at all.
 *
 * `signal` lets a superseded search be abandoned, so results can't arrive out
 * of order and overwrite a newer query's answer.
 */
export async function searchScryfall(
  query: string,
  implementedByName: Map<string, CardDefinition>,
  signal?: AbortSignal,
): Promise<ScryfallResult> {
  const trimmed = query.trim();
  if (!trimmed) return { status: "empty" };

  const url = `${SEARCH_URL}?q=${encodeURIComponent(`${trimmed} legal:commander`)}&order=name&unique=cards`;

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

  let payload: { data?: ScryfallApiCard[]; total_cards?: number };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { status: "error", message: "Scryfall sent something unreadable" };
  }

  const cards = (payload.data ?? []).map((card): ScryfallCard => {
    const { manaCost, typeLine, oracleText } = faceText(card);
    return {
      scryfallId: card.id,
      name: card.name,
      manaCost,
      typeLine,
      oracleText,
      implementedAs: implementedByName.get(card.name.toLowerCase()),
    };
  });

  if (cards.length === 0) return { status: "empty" };
  return { status: "ok", cards, totalCards: payload.total_cards ?? cards.length };
}

/** Name -> definition, for matching Scryfall results against the implemented pool. */
export function indexByName(
  definitions: Record<string, CardDefinition>,
): Map<string, CardDefinition> {
  const index = new Map<string, CardDefinition>();
  for (const def of Object.values(definitions)) {
    if (!def.isToken) index.set(def.name.toLowerCase(), def);
  }
  return index;
}
