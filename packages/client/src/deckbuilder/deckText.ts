import type { CardDefinition } from "@mtg-commander-sim/engine";
import { cardCounts, groupByType } from "./deckOps.js";
import type { SavedDeck } from "./deckStorage.js";
import { createDeck } from "./deckStorage.js";

/**
 * Decklists as plain text, in the "1 Lightning Bolt" per line format every
 * other Magic tool reads and writes. This is how a deck leaves the browser -
 * localStorage is per-machine, and a text list pastes into a message.
 */

const COMMANDER_HEADER = "Commander";
const DECK_HEADER = "Deck";

export function exportDeckText(
  deck: SavedDeck,
  definitions: Record<string, CardDefinition>,
): string {
  const lines: string[] = [];
  const commander = deck.commanderId ? definitions[deck.commanderId] : undefined;
  if (commander) {
    lines.push(COMMANDER_HEADER, `1 ${commander.name}`, "");
  }
  lines.push(DECK_HEADER);
  for (const section of groupByType(deck, definitions)) {
    for (const entry of section.entries) {
      lines.push(`${entry.count} ${entry.def.name}`);
    }
  }
  return lines.join("\n");
}

export interface ImportResult {
  deck: SavedDeck;
  /** Names that matched no implemented card, in the order they appeared. */
  unknownNames: string[];
  /** Cards dropped because Commander is singleton, e.g. "4 Lightning Bolt". */
  overCopies: string[];
}

/**
 * Parses "N Card Name" lines back into a deck. Section headers, blank lines,
 * comments and set/collector suffixes ("1 Shock (M21) 149") are all ignored,
 * because that's what real exports from other tools look like.
 *
 * A name that isn't in the implemented pool is reported rather than dropped
 * silently - that's the "implemented vs. real card" distinction the deck
 * builder exists to make visible, and it's the most likely thing to go wrong
 * when pasting a list built somewhere else.
 */
export function importDeckText(
  text: string,
  definitions: Record<string, CardDefinition>,
  name = "Imported deck",
): ImportResult {
  const byName = new Map<string, CardDefinition>();
  for (const def of Object.values(definitions)) {
    if (!def.isToken) byName.set(def.name.toLowerCase(), def);
  }

  const deck = createDeck(name);
  const unknownNames: string[] = [];
  const overCopies: string[] = [];
  let inCommanderSection = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    const header = line.toLowerCase().replace(/[:\s]+$/, "");
    if (header === "commander") {
      inCommanderSection = true;
      continue;
    }
    if (header === "deck" || header === "mainboard" || header === "sideboard") {
      inCommanderSection = false;
      continue;
    }

    const match = /^(?:(\d+)\s*x?\s+)?(.+)$/i.exec(line);
    if (!match) continue;
    const count = match[1] ? Number(match[1]) : 1;
    // Strip a trailing set code / collector number, which most exports append.
    const cardName = match[2]!.replace(/\s*\([^)]*\)\s*[\d-]*\s*$/, "").trim();

    const def = byName.get(cardName.toLowerCase());
    if (!def) {
      unknownNames.push(cardName);
      continue;
    }

    if (inCommanderSection && !deck.commanderId) {
      deck.commanderId = def.id;
      continue;
    }

    const isBasic = def.supertypes?.includes("Basic") ?? false;
    const allowed = isBasic ? count : Math.min(count, 1);
    if (allowed < count) overCopies.push(def.name);
    for (let i = 0; i < allowed; i++) deck.libraryIds.push(def.id);
  }

  // A list with no Commander header but a legal commander in it is still a
  // deck someone meant to import - promote the first one rather than refusing.
  if (!deck.commanderId) {
    const promoted = deck.libraryIds.find((id) => definitions[id]?.canBeCommander);
    if (promoted) {
      deck.commanderId = promoted;
      deck.libraryIds.splice(deck.libraryIds.indexOf(promoted), 1);
    }
  }

  return { deck, unknownNames, overCopies };
}

/** A one-line summary for the deck list sidebar: "99 cards, mono-green". */
export function deckSummary(
  deck: SavedDeck,
  definitions: Record<string, CardDefinition>,
): string {
  const total = deck.libraryIds.length + (deck.commanderId ? 1 : 0);
  const commander = deck.commanderId ? definitions[deck.commanderId] : undefined;
  const identity = commander?.colorIdentity ?? [];
  const colors = identity.length === 0 ? "colourless" : identity.join("");
  const distinct = cardCounts(deck).size;
  return `${total}/100 cards, ${distinct} distinct, ${colors}`;
}
