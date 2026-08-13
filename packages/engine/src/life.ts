import type { GameState } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";
import { pushTrigger } from "./permanents.js";
import { effectiveTriggers } from "./counters.js";

/**
 * Gaining life, and the one door it all goes through.
 *
 * Before this, six places did `player.life += n` directly: the gainLife effect,
 * lifelink on a damage effect, and four separate paths through combat damage.
 * That was fine while nothing cared *that* life had been gained - and stopped
 * being fine the moment a card did.
 *
 * "Whenever you gain life" is the engine Blech, Loafing Pest is built on, and a
 * trigger that only fired for some of those six routes would be worse than no
 * trigger at all: it would work when you cast a lifegain spell and silently do
 * nothing when a lifelinker connected, which is the harder case to notice and
 * the more common one in play.
 */
export function gainLife(state: GameState, playerId: string, amount: number): void {
  if (amount <= 0) return;
  const player = requirePlayer(state, playerId);
  player.life += amount;

  /*
   * One trigger per permanent, not per point of life. "Whenever you gain life"
   * cares that a life-gain event happened, not how big it was - gaining 3 life
   * once puts one counter on Pest Mascot, not three.
   *
   * The battlefield is copied first because resolving one of these can create
   * or kill permanents, and iterating the live array while it changes underneath
   * is the sort of thing that works until the day a token maker is added.
   */
  for (const instance of [...player.battlefield]) {
    for (const trigger of effectiveTriggers(state, instance)) {
      if (trigger.event !== "gain-life") continue;
      pushTrigger(state, instance.instanceId, playerId, trigger);
    }
  }
}
