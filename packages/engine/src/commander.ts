import type { CardDefinition, GameState } from "./types.js";
import { createCardInstance, requirePlayer } from "./state.js";

const COMMANDER_DECK_SIZE = 100;

export interface DeckList {
  /** CardDefinition id of the commander. */
  commanderId: string;
  /** CardDefinition ids of the other 99 cards (repeats allowed only for basic lands). */
  libraryIds: string[];
}

export interface DeckValidationResult {
  legal: boolean;
  errors: string[];
}

/** Validates the Commander-specific deckbuilding rules: 100 cards, singleton, color identity. */
export function validateCommanderDeck(
  deck: DeckList,
  cardDefinitions: Record<string, CardDefinition>,
): DeckValidationResult {
  const errors: string[] = [];

  const commanderDef = cardDefinitions[deck.commanderId];
  if (!commanderDef) {
    return { legal: false, errors: [`Unknown commander card: ${deck.commanderId}`] };
  }
  if (!commanderDef.canBeCommander) {
    errors.push(`${commanderDef.name} cannot be a commander`);
  }

  const totalSize = deck.libraryIds.length + 1;
  if (totalSize !== COMMANDER_DECK_SIZE) {
    errors.push(`Deck must be exactly ${COMMANDER_DECK_SIZE} cards (commander + library) - got ${totalSize}`);
  }

  const counts = new Map<string, number>();
  counts.set(deck.commanderId, 1);
  for (const id of deck.libraryIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  for (const [id, count] of counts) {
    const def = cardDefinitions[id];
    if (!def) {
      errors.push(`Unknown card in deck: ${id}`);
      continue;
    }
    const isBasicLand = def.supertypes?.includes("Basic") ?? false;
    if (!isBasicLand && count > 1) {
      errors.push(`${def.name} appears ${count} times - Commander decks are singleton (basic lands excepted)`);
    }
  }

  for (const id of deck.libraryIds) {
    const def = cardDefinitions[id];
    if (!def) continue;
    const outOfIdentity = def.colorIdentity.filter((c) => !commanderDef.colorIdentity.includes(c));
    if (outOfIdentity.length > 0) {
      errors.push(
        `${def.name} (${outOfIdentity.join("")}) is outside ${commanderDef.name}'s color identity (${
          commanderDef.colorIdentity.join("") || "colorless"
        })`,
      );
    }
  }

  return { legal: errors.length === 0, errors };
}

/**
 * Sets up an already-validated deck for a player: the commander goes to the
 * command zone, the rest becomes their library. Does not shuffle - callers
 * that want randomized draws should shuffle libraryIds before calling this.
 */
export function setUpCommanderDeck(state: GameState, playerId: string, deck: DeckList): void {
  requirePlayer(state, playerId);
  createCardInstance(state, deck.commanderId, playerId, "command", { isCommander: true });
  for (const id of deck.libraryIds) {
    createCardInstance(state, id, playerId, "library");
  }
}
