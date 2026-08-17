import type { CardInstance, GameState } from "./types.js";
import { cardName, log } from "./state.js";
import { tapPermanent } from "./permanents.js";

/**
 * Spending a regeneration shield.
 *
 * "The next time this creature would be destroyed this turn, instead tap it,
 * remove it from combat, and heal all damage on it." All three of those matter
 * and the last two are the ones easily forgotten: a regenerated blocker that
 * stayed in combat would keep dealing its damage, and one that kept its marked
 * damage would simply be destroyed again by the next state-based check - the
 * shield would appear to do nothing at all.
 *
 * Lives in its own module because both places destruction can happen have to
 * call it and neither may own it: the `destroy` effect, and the lethal-damage
 * state-based action.
 */

/**
 * Consumes one shield if the creature has any, and returns whether it did.
 *
 * A caller that gets `true` must not go on to destroy the creature - the
 * destruction was replaced, so as far as the rest of the game is concerned
 * nothing happened to it at all and no dies trigger fires.
 */
export function useRegenerationShield(state: GameState, instance: CardInstance): boolean {
  if (instance.regenerationShields <= 0) return false;
  instance.regenerationShields -= 1;
  // "Tap it" is part of what regenerating does, and it is a real tapping.
  tapPermanent(state, instance);
  instance.damageMarked = 0;
  // Cleared with the damage it belongs to: leaving it set would make the very
  // next point of ordinary damage lethal to a creature that just regenerated.
  instance.deathtouchDamage = false;
  removeFromCombat(state, instance.instanceId);
  log(state, `${cardName(state, instance.instanceId)} regenerates`);
  return true;
}

/**
 * Takes a creature out of combat without undoing anything it has already done.
 *
 * Deliberately a flag rather than deleting the entry from `state.attackers` or
 * `state.blockers`. Those maps record what was *declared*, and combat depends
 * on the declaration surviving: an attacker stays blocked once blocked, even
 * after every blocker has left, and assigns nothing to the defending player
 * (rule 509.1h). Deleting the entry would hand the attacking player a free hit
 * for regenerating their own blocker - the opposite of what the card does.
 *
 * Only observable when combat has a second damage step to reach, which means
 * first or double strike; without one, damage has already been dealt by the
 * time any of this is consulted.
 */
function removeFromCombat(state: GameState, instanceId: string): void {
  for (const player of state.players) {
    const instance = player.battlefield.find((card) => card.instanceId === instanceId);
    if (instance) instance.removedFromCombat = true;
  }
}
