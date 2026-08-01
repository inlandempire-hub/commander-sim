import {
  validateCommanderDeck,
  type CardDefinition,
  type CardType,
} from "@mtg-commander-sim/engine";
import { manaValue } from "./cardText.js";
import { isBasicLand, MAX_CURVE, withinIdentity } from "./cardPool.js";
import type { SavedDeck } from "./deckStorage.js";

/**
 * Every edit the deck builder can make to a deck, as pure functions returning
 * a new deck. Nothing here touches storage or React - which is what makes the
 * singleton rule, the 100-card count and the swap workflow testable headlessly.
 */

export const COMMANDER_DECK_SIZE = 100;

export function countOf(deck: SavedDeck, cardId: string): number {
  return deck.libraryIds.filter((id) => id === cardId).length;
}

export function cardCounts(deck: SavedDeck): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of deck.libraryIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

/** Commander included - the format counts the commander toward the 100. */
export function totalCards(deck: SavedDeck): number {
  return deck.libraryIds.length + (deck.commanderId ? 1 : 0);
}

/** Only basic lands may repeat. Everything else is capped at one copy. */
export function maxCopies(def: CardDefinition): number {
  return isBasicLand(def) ? Number.POSITIVE_INFINITY : 1;
}

export function canAdd(deck: SavedDeck, def: CardDefinition): boolean {
  if (deck.commanderId === def.id) return false; // already in the deck, in the command zone
  return countOf(deck, def.id) < maxCopies(def);
}

export function addCard(deck: SavedDeck, def: CardDefinition): SavedDeck {
  if (!canAdd(deck, def)) return deck;
  return { ...deck, libraryIds: [...deck.libraryIds, def.id] };
}

/** Removes a single copy, leaving any others in place. */
export function removeCard(deck: SavedDeck, cardId: string): SavedDeck {
  const index = deck.libraryIds.indexOf(cardId);
  if (index === -1) return deck;
  const libraryIds = [...deck.libraryIds];
  libraryIds.splice(index, 1);
  return { ...deck, libraryIds };
}

export function setCount(deck: SavedDeck, def: CardDefinition, count: number): SavedDeck {
  const target = Math.max(0, Math.min(count, maxCopies(def)));
  const others = deck.libraryIds.filter((id) => id !== def.id);
  return { ...deck, libraryIds: [...others, ...Array.from({ length: target }, () => def.id)] };
}

/**
 * The swap workflow: one card out, one card in, in a single step. If the
 * outgoing card isn't in the deck this is just an add, which is the forgiving
 * behaviour when a click lands slightly wrong.
 */
export function swapCard(deck: SavedDeck, outCardId: string, inDef: CardDefinition): SavedDeck {
  return addCard(removeCard(deck, outCardId), inDef);
}

/**
 * Promotes a card to commander. If it was in the library it moves out of it,
 * since the commander starts in the command zone and is not one of the 99.
 * The previous commander drops back into the library rather than vanishing.
 */
export function setCommander(
  deck: SavedDeck,
  def: CardDefinition,
  definitions: Record<string, CardDefinition>,
): SavedDeck {
  let next = removeCard(deck, def.id);
  const previous = deck.commanderId ? definitions[deck.commanderId] : undefined;
  if (previous && previous.id !== def.id && canAdd({ ...next, commanderId: null }, previous)) {
    next = { ...next, libraryIds: [...next.libraryIds, previous.id] };
  }
  return { ...next, commanderId: def.id };
}

export function clearCommander(deck: SavedDeck): SavedDeck {
  return { ...deck, commanderId: null };
}

/** Tops the deck up to exactly 100 with a basic land. Removes basics if it's over. */
export function fillWithBasics(deck: SavedDeck, basicLandId: string): SavedDeck {
  const shortfall = COMMANDER_DECK_SIZE - totalCards(deck);
  if (shortfall > 0) {
    return { ...deck, libraryIds: [...deck.libraryIds, ...Array.from({ length: shortfall }, () => basicLandId)] };
  }
  let next = deck;
  for (let i = 0; i < -shortfall; i++) {
    if (countOf(next, basicLandId) === 0) break;
    next = removeCard(next, basicLandId);
  }
  return next;
}

/** Ordered sections for displaying a decklist - a card lands in the first bucket it matches. */
const SECTION_ORDER: CardType[] = [
  "Creature",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Planeswalker",
  "Battle",
  "Land",
];

export interface DeckSection {
  type: CardType;
  /** Total physical cards in this section, so 37 Forests count as 37. */
  count: number;
  entries: Array<{ def: CardDefinition; count: number }>;
}

export function groupByType(
  deck: SavedDeck,
  definitions: Record<string, CardDefinition>,
): DeckSection[] {
  const buckets = new Map<CardType, Array<{ def: CardDefinition; count: number }>>();
  for (const [cardId, count] of cardCounts(deck)) {
    const def = definitions[cardId];
    if (!def) continue;
    const type = SECTION_ORDER.find((t) => def.types.includes(t)) ?? "Creature";
    const entries = buckets.get(type) ?? [];
    entries.push({ def, count });
    buckets.set(type, entries);
  }
  return SECTION_ORDER.filter((type) => buckets.has(type)).map((type) => {
    const entries = buckets.get(type)!.sort((a, b) => a.def.name.localeCompare(b.def.name));
    return { type, count: entries.reduce((sum, e) => sum + e.count, 0), entries };
  });
}

/** Nonland cards bucketed by mana value, everything at MAX_CURVE or above pooled together. */
export function manaCurve(
  deck: SavedDeck,
  definitions: Record<string, CardDefinition>,
): number[] {
  const curve = Array.from({ length: MAX_CURVE + 1 }, () => 0);
  for (const [cardId, count] of cardCounts(deck)) {
    const def = definitions[cardId];
    if (!def || def.types.includes("Land")) continue;
    curve[Math.min(manaValue(def), MAX_CURVE)]! += count;
  }
  return curve;
}

export function landCount(deck: SavedDeck, definitions: Record<string, CardDefinition>): number {
  let lands = 0;
  for (const [cardId, count] of cardCounts(deck)) {
    if (definitions[cardId]?.types.includes("Land")) lands += count;
  }
  return lands;
}

export function averageManaValue(
  deck: SavedDeck,
  definitions: Record<string, CardDefinition>,
): number {
  let total = 0;
  let cards = 0;
  for (const [cardId, count] of cardCounts(deck)) {
    const def = definitions[cardId];
    if (!def || def.types.includes("Land")) continue;
    total += manaValue(def) * count;
    cards += count;
  }
  return cards === 0 ? 0 : total / cards;
}

export interface DeckStatus {
  total: number;
  /** How many more cards are needed to hit 100. Negative means over. */
  remaining: number;
  /** True only when the engine would accept this deck for a real game. */
  playable: boolean;
  /** Rule violations, in the engine's own words. */
  errors: string[];
  lands: number;
  averageManaValue: number;
  /** Cards outside the commander's colour identity, so the UI can flag them in place. */
  offIdentityIds: string[];
}

/**
 * Runs the engine's own Commander validation, so the deck builder can never
 * disagree with what the game will accept. A deck with no commander chosen
 * yet is reported as not playable without pretending it's broken in other
 * ways - it just hasn't been finished.
 */
export function deckStatus(
  deck: SavedDeck,
  definitions: Record<string, CardDefinition>,
): DeckStatus {
  const total = totalCards(deck);
  const base = {
    total,
    remaining: COMMANDER_DECK_SIZE - total,
    lands: landCount(deck, definitions),
    averageManaValue: averageManaValue(deck, definitions),
  };

  const commanderDef = deck.commanderId ? definitions[deck.commanderId] : undefined;
  if (!commanderDef) {
    return { ...base, playable: false, errors: ["Choose a commander."], offIdentityIds: [] };
  }

  const identity = commanderDef.colorIdentity;
  const offIdentityIds = [...new Set(deck.libraryIds)].filter((id) => {
    const def = definitions[id];
    return def !== undefined && !withinIdentity(def, identity);
  });

  const result = validateCommanderDeck(
    { commanderId: deck.commanderId!, libraryIds: deck.libraryIds },
    definitions,
  );
  return { ...base, playable: result.legal, errors: result.errors, offIdentityIds };
}
