import type { DeckList } from "@mtg-commander-sim/engine";
import type { ArtOverrides } from "../cardArt.js";

/**
 * Saved decks live in the browser's localStorage, one blob for all of them.
 *
 * There is deliberately no server involved: the deck builder has to work from
 * the launcher with nothing running but the web app, and a deck is a list of
 * card ids - a few hundred bytes. If decks ever need to follow you between
 * machines, that's a sync feature to add on top, not a reason to stand up a
 * database now.
 */

export interface SavedDeck {
  /** Stable id, used in ?mydeck= URLs. Never reused after a delete. */
  id: string;
  name: string;
  /** Free-form labels - "aggro", "testing", "mike's". */
  tags: string[];
  /** Null while the deck is still being built and no commander is chosen. */
  commanderId: string | null;
  /** One entry per physical card, so basic lands repeat. Excludes the commander. */
  libraryIds: string[];
  /**
   * Chosen printing per card, for decks that picked their own art. Only cards
   * you actually changed appear here - everything else uses the card's default
   * printing - so a deck that never touched the art picker stores nothing.
   */
  artOverrides?: ArtOverrides;
  updatedAt: number;
}

/** The slice of the Storage API this needs, so tests can pass a plain object. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = "mtg-commander-sim.decks.v1";

export function browserStore(): KeyValueStore {
  return window.localStorage;
}

/** An in-memory stand-in, used by tests and as a fallback if localStorage is unavailable. */
export function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

function isSavedDeck(value: unknown): value is SavedDeck {
  if (typeof value !== "object" || value === null) return false;
  const deck = value as Partial<SavedDeck>;
  return (
    typeof deck.id === "string" &&
    typeof deck.name === "string" &&
    Array.isArray(deck.tags) &&
    Array.isArray(deck.libraryIds) &&
    (deck.commanderId === null || typeof deck.commanderId === "string")
  );
}

/**
 * Anything unparseable or unrecognised is dropped rather than thrown, because
 * the alternative is a deck builder that refuses to open because of one bad
 * record. Losing a malformed deck is recoverable; losing access to all of them
 * is not.
 */
export function loadDecks(store: KeyValueStore): SavedDeck[] {
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedDeck);
  } catch {
    return [];
  }
}

export function saveDecks(store: KeyValueStore, decks: SavedDeck[]): void {
  store.setItem(STORAGE_KEY, JSON.stringify(decks));
}

let idCounter = 0;

/** Unique per deck. Timestamp plus a counter, so two decks made in the same millisecond still differ. */
export function newDeckId(): string {
  idCounter += 1;
  return `deck-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

export function createDeck(name: string): SavedDeck {
  return {
    id: newDeckId(),
    name,
    tags: [],
    commanderId: null,
    libraryIds: [],
    updatedAt: Date.now(),
  };
}

/** "Radiant Ranks" -> "Radiant Ranks (copy)", and again for a copy of a copy. */
export function duplicateDeck(deck: SavedDeck): SavedDeck {
  return {
    ...deck,
    id: newDeckId(),
    name: `${deck.name} (copy)`,
    tags: [...deck.tags],
    libraryIds: [...deck.libraryIds],
    updatedAt: Date.now(),
  };
}

export function upsertDeck(decks: SavedDeck[], deck: SavedDeck): SavedDeck[] {
  const stamped = { ...deck, updatedAt: Date.now() };
  const index = decks.findIndex((d) => d.id === deck.id);
  if (index === -1) return [...decks, stamped];
  const next = [...decks];
  next[index] = stamped;
  return next;
}

export function deleteDeck(decks: SavedDeck[], deckId: string): SavedDeck[] {
  return decks.filter((d) => d.id !== deckId);
}

export function findDeck(decks: SavedDeck[], deckId: string): SavedDeck | undefined {
  return decks.find((d) => d.id === deckId);
}

/**
 * Converts to the engine's DeckList. Returns undefined for a deck with no
 * commander, which is not a playable Commander deck at all - callers should
 * check `validateCommanderDeck` for everything else.
 */
export function toDeckList(deck: SavedDeck): DeckList | undefined {
  if (!deck.commanderId) return undefined;
  return { commanderId: deck.commanderId, libraryIds: [...deck.libraryIds] };
}

/** Every tag in use across all decks, sorted, for the tag filter row. */
export function allTags(decks: SavedDeck[]): string[] {
  const seen = new Set<string>();
  for (const deck of decks) for (const tag of deck.tags) seen.add(tag);
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/** Splits a comma-separated tag field, trimming blanks and duplicates. */
export function parseTags(input: string): string[] {
  const seen: string[] = [];
  for (const raw of input.split(",")) {
    const tag = raw.trim();
    if (tag && !seen.includes(tag)) seen.push(tag);
  }
  return seen;
}
