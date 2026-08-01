import type { CardDefinition, CardInstance, GameState } from "@mtg-commander-sim/engine";

export const HIDDEN_CARD_DEFINITION_ID = "hidden-card";

/** Stands in for any card in a zone hidden from this viewer (hand/library contents of another player). */
export const HIDDEN_CARD_DEFINITION: CardDefinition = {
  id: HIDDEN_CARD_DEFINITION_ID,
  name: "Hidden Card",
  types: [],
  colorIdentity: [],
  tier: "vanilla",
};

function hideInstance(instance: CardInstance): CardInstance {
  return { ...instance, definitionId: HIDDEN_CARD_DEFINITION_ID };
}

/**
 * Produces the GameState a specific player is allowed to see: their own
 * hand/library are untouched, everyone else's hand/library contents are
 * replaced with a hidden-card placeholder (card count and zone are still
 * visible, matching real Magic - you see how many cards are in an
 * opponent's hand, not what they are). Every other zone (battlefield,
 * graveyard, exile, command, the stack) is public information and passes
 * through unchanged.
 */
export function filterGameStateForViewer(state: GameState, viewerId: string): GameState {
  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id === viewerId) return player;
      return {
        ...player,
        hand: player.hand.map(hideInstance),
        library: player.library.map(hideInstance),
      };
    }),
    cardDefinitions: { ...state.cardDefinitions, [HIDDEN_CARD_DEFINITION_ID]: HIDDEN_CARD_DEFINITION },
  };
}
