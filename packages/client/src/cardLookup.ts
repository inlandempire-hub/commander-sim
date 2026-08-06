import type { CardInstance, GameState } from "@mtg-commander-sim/engine";

/**
 * Finding a card when all you have is its instance id.
 *
 * The animation layers all work this way round. They notice that *something*
 * moved - a flight is planned from two sets of measurements, a burst is
 * scheduled off that flight - and only afterwards need the card itself, to draw
 * it or to ask what colour it is. By then the game state has already moved it,
 * so "it was on the stack a moment ago" is no help in finding it: it is in a
 * graveyard now, or on the battlefield, or in exile.
 *
 * Hence a search across every zone rather than a lookup in the one that seems
 * likely. The list of zones lives here once so that a zone added later cannot
 * quietly go missing from one caller and not the other.
 */

/** Every card instance in the game, wherever it currently is. */
export function allInstances(state: GameState): CardInstance[] {
  const found: CardInstance[] = [];
  for (const player of state.players) {
    found.push(
      ...player.hand,
      ...player.battlefield,
      ...player.graveyard,
      ...player.exile,
      ...player.command,
      ...player.library,
    );
  }
  found.push(...state.stackCards);
  return found;
}

export function findInstance(state: GameState, instanceId: string): CardInstance | undefined {
  return allInstances(state).find((instance) => instance.instanceId === instanceId);
}
