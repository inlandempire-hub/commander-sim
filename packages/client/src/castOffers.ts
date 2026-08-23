import type { CardDefinition, GameState } from "@mtg-commander-sim/engine";

/**
 * The optional cost a card offers as it is cast, if any - the question the hand
 * has to ask before the spell goes out.
 *
 * Pulled out of `App`'s click handler so the decision can be tested without a
 * browser: the component renders whichever prompt this names and folds the
 * answer back in. "warp" is Starwinder's warp cost, "offspring" is Thundertrap
 * Trainer's. Nothing here for a card with neither.
 */
export function castOffer(def: CardDefinition): "warp" | "offspring" | null {
  if (def.warp) return "warp";
  if (def.offspring) return "offspring";
  return null;
}

/**
 * "You may cast spells from your hand without paying their mana costs." -
 * whether this player controls a permanent that grants it (Omniscience). Read
 * off the board so it turns on and off with the permanent.
 */
export function controlsFreeCastEnabler(state: GameState, ownerId: string): boolean {
  const player = state.players.find((p) => p.id === ownerId);
  return (player?.battlefield ?? []).some(
    (c) => state.cardDefinitions[c.definitionId]?.enablesFreeCastFromHand === true,
  );
}

/**
 * Whether a card's back face is a second face you *play* (Bala Ged Recovery's
 * land, Waterlogged Teachings) rather than a transform target reached by
 * transforming (Emet-Selch's Hades). A playable back is a land or a spell with
 * its own mana cost; a transform back has neither, so clicking the front must
 * not offer to "cast" it.
 */
export function hasPlayableBackFace(state: GameState, def: CardDefinition): boolean {
  if (!def.backFaceId) return false;
  const back = state.cardDefinitions[def.backFaceId];
  return back !== undefined && (back.types.includes("Land") || back.manaCost !== undefined);
}
