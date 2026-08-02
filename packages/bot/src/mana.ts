/**
 * The bot's mana helpers now live in the engine.
 *
 * They were written here first, because the bot was the only thing that had to
 * tap its own lands. Once the human's client gained the same "just pay for it"
 * behaviour (2026-08-01), keeping a second copy in step stopped being viable -
 * so `manaSources`, `couldAfford` and `nextSourceToTap` moved to
 * `packages/engine/src/autoTap.ts` and are re-exported here so the bot's own
 * imports keep reading naturally.
 */
import { findInstance, manaValue, type GameState } from "@mtg-commander-sim/engine";

export {
  couldAfford,
  manaSources,
  nextSourceToTap,
  type ManaSource,
} from "@mtg-commander-sim/engine";

/**
 * Which card the bot takes from a tutor that's waiting on it.
 *
 * The engine used to make this choice for everyone; now that it's the
 * player's, the bot needs its own policy. Most expensive legal match, as
 * before - a crude stand-in for "the best card", but a tutor that fetches the
 * cheapest thing available would be actively worse than not casting it.
 */
export function chooseSearchResult(state: GameState, playerId: string): string | null {
  const pending = state.pendingSearch;
  if (!pending || pending.playerId !== playerId) return null;

  let best: { instanceId: string; value: number } | undefined;
  for (const instanceId of pending.candidateInstanceIds) {
    const found = findInstance(state, instanceId);
    if (!found) continue;
    const definition = state.cardDefinitions[found.instance.definitionId];
    if (!definition) continue;
    const value = manaValue(definition.manaCost ?? { generic: 0, colors: {} });
    if (!best || value > best.value) best = { instanceId, value };
  }
  return best?.instanceId ?? null;
}
