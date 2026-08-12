import type { CardInstance, GameState, Player } from "./types.js";
import { log, requireDefinition } from "./state.js";
import { pushTrigger } from "./permanents.js";

/**
 * The one place damage is actually dealt.
 *
 * Before this existed, damage was applied by whoever happened to be dealing it:
 * `applyEffect` subtracted from a life total for a burn spell, `dealCombatDamage`
 * did it again in four more places for unblocked attackers, blockers, trample
 * and first strike. That was survivable while nothing could interfere with
 * damage. Prevention is exactly a thing that interferes with damage, and
 * "prevent the next 3 damage" that only worked against burn spells and not
 * against a creature attacking you would be worse than not having it.
 *
 * So every path now comes through here, and prevention is applied once, in one
 * place, to all of them.
 *
 * These functions deliberately do *not* handle lifelink or commander damage.
 * Both depend on how much damage was actually dealt, which is only known after
 * prevention has taken its share, and both belong to the caller: only combat
 * knows an attacker was a commander, and only the effect knows whose lifelink
 * it was. Each returns what landed, and the caller does its own arithmetic on
 * that - which is also the rules-correct reading, since lifelink gains life
 * equal to the damage *dealt*, not the damage attempted.
 */

export interface DamageResult {
  /** How much damage actually landed. */
  dealt: number;
  /** How much a shield swallowed. */
  prevented: number;
}

const NOTHING: DamageResult = { dealt: 0, prevented: 0 };

/**
 * Takes what it can from the shield and returns what is left over.
 *
 * The shield is spent whether or not it covered everything - "prevent the next
 * 3 damage" against a 5-power attacker prevents 3 and is gone, it does not
 * prevent all of it and it does not prevent none of it.
 */
function applyShield(holder: { damagePrevention: number }, amount: number): DamageResult {
  if (amount <= 0) return NOTHING;
  const prevented = Math.min(holder.damagePrevention, amount);
  holder.damagePrevention -= prevented;
  return { dealt: amount - prevented, prevented };
}

/** Damage to a player's life total, prevention applied. */
export function damagePlayer(state: GameState, player: Player, amount: number): DamageResult {
  const result = applyShield(player, amount);
  player.life -= result.dealt;
  if (result.prevented > 0) {
    log(state, `${result.prevented} damage to ${player.id} prevented`);
  }
  return result;
}

/**
 * Damage marked on a creature, prevention applied.
 *
 * `deathtouch` is passed in rather than read off the source here because the
 * flag belongs to whatever is dealing the damage, and only the caller knows
 * what that is. It is deliberately only set when damage actually lands: a
 * creature whose damage was entirely prevented was not touched at all, so a
 * fully shielded blocker survives a deathtouch attacker rather than dying to
 * the zero points that got through.
 */
export function damageCreature(
  state: GameState,
  instance: CardInstance,
  amount: number,
  options: { deathtouch?: boolean } = {},
): DamageResult {
  const result = applyShield(instance, amount);
  instance.damageMarked += result.dealt;
  if (options.deathtouch && result.dealt > 0) instance.deathtouchDamage = true;
  if (result.prevented > 0) {
    log(state, `${result.prevented} damage to ${cardLabel(state, instance)} prevented`);
  }

  /*
   * "Whenever this creature is dealt damage" - Hornet Nest.
   *
   * Fired on what actually landed, not on what was attempted: a fully
   * shielded creature was not dealt damage at all, and a Hornet Nest behind a
   * Healing Salve makes no Insects. That is the same reading `deathtouch`
   * above takes, and for the same reason.
   *
   * Here rather than in combat because this is the one door all damage goes
   * through, so a burn spell and a blocker set it off alike.
   */
  if (result.dealt > 0) {
    for (const trigger of requireDefinition(state, instance.definitionId).triggeredAbilities ?? []) {
      if (trigger.event !== "damaged") continue;
      pushTrigger(state, instance.instanceId, instance.controllerId, trigger, result.dealt);
    }
  }
  return result;
}

function cardLabel(state: GameState, instance: CardInstance): string {
  return state.cardDefinitions[instance.definitionId]?.name ?? instance.instanceId;
}
