import type { CardDefinition } from "@mtg-commander-sim/engine";

/**
 * Card images, fetched from Scryfall's CDN at runtime.
 *
 * Nothing is stored in this repo but the card's Scryfall id, which is a
 * database key rather than artwork - CLAUDE.md forbids bundling or
 * redistributing Wizards of the Coast images, and Scryfall explicitly permits
 * hotlinking for personal, non-commercial use like this. The browser's normal
 * HTTP cache does the caching, so a card you have already seen costs nothing
 * to show again, and a deck you never play costs nothing at all.
 *
 * Every Scryfall image URL is derivable from the id:
 *
 *     https://cards.scryfall.io/<size>/front/<id[0]>/<id[1]>/<id>.jpg
 *
 * The `?<timestamp>` Scryfall appends is cache-busting only, so it is safe to
 * omit. Sizes we use, and roughly what they cost:
 *
 *   art_crop  ~60KB   just the illustration, no frame or text box
 *   normal   ~130KB   the whole card, readable at a glance
 *
 * We draw our own frame - it has to show live power/toughness, counters,
 * damage and combat state, none of which a printed card image knows about -
 * so the board uses art_crop and only the detail panel shows a whole card.
 */

export type ArtSize = "small" | "normal" | "large" | "art_crop";

const IMAGE_HOST = "https://cards.scryfall.io";
/** Scryfall ids are UUIDs; anything else would build a URL that 404s. */
const SCRYFALL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function scryfallImageUrl(scryfallId: string, size: ArtSize): string | undefined {
  if (!SCRYFALL_ID.test(scryfallId)) return undefined;
  return `${IMAGE_HOST}/${size}/front/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg`;
}

/**
 * Per-deck art choices: our card id (`"lightning-bolt"`) to the Scryfall id of
 * the printing this deck wants. Absent means "whichever printing Scryfall
 * treats as representative", which is what the fixture carries.
 */
export type ArtOverrides = Record<string, string>;

/** Which printing to show for this card, honouring a deck's override. */
export function artIdFor(definition: CardDefinition, overrides?: ArtOverrides): string | undefined {
  return overrides?.[definition.id] ?? definition.scryfallId;
}

/**
 * Undefined for anything with no Scryfall row - tokens, which are created by
 * the game rather than printed. Callers fall back to the text-only card, which
 * is also what happens when the image simply fails to load.
 */
export function cardArtUrl(
  definition: CardDefinition,
  size: ArtSize,
  overrides?: ArtOverrides,
): string | undefined {
  const id = artIdFor(definition, overrides);
  return id ? scryfallImageUrl(id, size) : undefined;
}
