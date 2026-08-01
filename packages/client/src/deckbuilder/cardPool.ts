import type { CardDefinition, CardType, Color } from "@mtg-commander-sim/engine";
import { typeLine } from "../format.js";
import { describeCard, manaValue } from "../cardText.js";

/**
 * The searchable index over the cards the engine actually implements.
 *
 * "The card database" in CLAUDE.md's deck-builder description is Scryfall's,
 * and it is not bundled here - see scryfallLookup.ts for how the builder
 * checks a real card that this engine hasn't scripted yet. What you can
 * actually put in a deck is this pool, because these are the cards the rules
 * engine knows how to run.
 */

export interface PoolCard {
  def: CardDefinition;
  typeLine: string;
  rules: string[];
  manaValue: number;
  /** Everything searchable about the card, lowercased once at build time. */
  haystack: string;
}

/** Colourless is not a Color, but it is something you filter on. */
export type ColorFilter = Color | "C";

export interface PoolFilters {
  text: string;
  /** Empty means "any colour". A card matches if its identity includes any of these. */
  colors: ColorFilter[];
  /** Empty means "any type". A card matches if it has any of these types. */
  types: CardType[];
  /** Upper bound on mana value; MAX_CURVE means "this much or more". */
  manaValueMax?: number;
  /** Only cards that can legally be a commander. */
  commandersOnly: boolean;
  /**
   * Restricts to cards playable under a commander's colour identity, which is
   * the Commander deckbuilding rule most likely to bite you late. Undefined
   * means no restriction (you haven't picked a commander yet).
   */
  identity?: Color[];
  /** Basics are added with the stepper, not the browser - they'd swamp the results. */
  hideBasicLands: boolean;
  sort: "name" | "mana-value";
}

/** Mana values at or above this are bucketed together, on the curve and in the filter. */
export const MAX_CURVE = 7;

export const EMPTY_FILTERS: PoolFilters = {
  text: "",
  colors: [],
  types: [],
  commandersOnly: false,
  hideBasicLands: true,
  sort: "name",
};

export function buildPool(definitions: Record<string, CardDefinition>): PoolCard[] {
  return Object.values(definitions)
    .filter((def) => !def.isToken) // tokens are created by spells, never drafted into a deck
    .map((def) => {
      const line = typeLine(def);
      const rules = describeCard(def, definitions);
      return {
        def,
        typeLine: line,
        rules,
        manaValue: manaValue(def),
        haystack: [def.name, line, ...rules, ...(def.keywords ?? [])].join(" ").toLowerCase(),
      };
    })
    .sort((a, b) => a.def.name.localeCompare(b.def.name));
}

export function isBasicLand(def: CardDefinition): boolean {
  return def.supertypes?.includes("Basic") ?? false;
}

/** Commander's colour-identity rule: every symbol on the card must be one the commander has. */
export function withinIdentity(def: CardDefinition, identity: Color[]): boolean {
  return def.colorIdentity.every((c) => identity.includes(c));
}

function matchesColors(def: CardDefinition, colors: ColorFilter[]): boolean {
  if (colors.length === 0) return true;
  if (def.colorIdentity.length === 0) return colors.includes("C");
  return def.colorIdentity.some((c) => colors.includes(c));
}

/**
 * Multi-word search matches on all words in any order, so "flying drake" and
 * "drake flying" both find Wind Drake. Quoting is not supported and does not
 * need to be - the pool is under a thousand cards.
 */
function matchesText(card: PoolCard, text: string): boolean {
  const terms = text.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => card.haystack.includes(term));
}

export function filterPool(pool: PoolCard[], filters: PoolFilters): PoolCard[] {
  const result = pool.filter((card) => {
    const { def } = card;
    if (filters.hideBasicLands && isBasicLand(def)) return false;
    if (filters.commandersOnly && !def.canBeCommander) return false;
    if (filters.identity && !withinIdentity(def, filters.identity)) return false;
    if (!matchesColors(def, filters.colors)) return false;
    if (filters.types.length > 0 && !filters.types.some((t) => def.types.includes(t))) return false;
    if (
      filters.manaValueMax !== undefined &&
      filters.manaValueMax < MAX_CURVE &&
      card.manaValue > filters.manaValueMax
    ) {
      return false;
    }
    if (filters.text && !matchesText(card, filters.text)) return false;
    return true;
  });

  if (filters.sort === "mana-value") {
    // Name as the tiebreak, so the list order is stable rather than dependent
    // on whatever order the definitions happened to be declared in.
    return [...result].sort(
      (a, b) => a.manaValue - b.manaValue || a.def.name.localeCompare(b.def.name),
    );
  }
  return result;
}

/** Every card type present in the pool, for building the type filter buttons. */
export function typesInPool(pool: PoolCard[]): CardType[] {
  const seen = new Set<CardType>();
  for (const card of pool) for (const type of card.def.types) seen.add(type);
  const order: CardType[] = [
    "Creature",
    "Instant",
    "Sorcery",
    "Artifact",
    "Enchantment",
    "Planeswalker",
    "Battle",
    "Land",
  ];
  return order.filter((t) => seen.has(t));
}

/** The basic land matching a colour, for the "fill with basics" stepper. */
export const BASIC_LAND_BY_COLOR: Record<Color, string> = {
  W: "plains",
  U: "island",
  B: "swamp",
  R: "mountain",
  G: "forest",
};
