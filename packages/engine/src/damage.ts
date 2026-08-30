import type { CardInstance, GameState, Player } from "./types.js";
import { findInstance, log, requireDefinition } from "./state.js";
import { pushTrigger } from "./permanents.js";
import { effectiveTriggers, hasKeyword } from "./counters.js";
import { protectionStopsDamage } from "./protection.js";
import { damageDealt } from "./replacements.js";

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
/**
 * Whether this source deals its damage as counters rather than as damage.
 *
 * Infect is the one keyword that changes what damage *is*: to a creature it is
 * -1/-1 counters, to a player it is poison. Asked of the source by the caller
 * rather than read here, for exactly the reason `deathtouch` is - the flag
 * belongs to whatever is dealing the damage, and only the caller knows what
 * that is.
 */
export function dealsInfect(state: GameState, sourceInstanceId: string | undefined): boolean {
  if (!sourceInstanceId) return false;
  const found = findInstance(state, sourceInstanceId);
  return found ? hasKeyword(state, found.instance, "Infect") : false;
}

/**
 * Damage to a player, prevention applied.
 */
/**
 * "Prevent all damage that would be dealt this turn by creatures your opponents
 * control." - Obscuring Haze. Prevents damage whose source is a creature
 * controlled by an opponent of the player who set the fog.
 */
function fogFromOpponentCreatures(state: GameState, sourceInstanceId: string | undefined): boolean {
  const protectedId = state.preventCreatureDamageFromOpponentsOf;
  if (!protectedId || !sourceInstanceId) return false;
  const source = findInstance(state, sourceInstanceId);
  if (!source) return false;
  if (!requireDefinition(state, source.instance.definitionId).types.includes("Creature")) return false;
  return source.instance.controllerId !== protectedId;
}

export function damagePlayer(
  state: GameState,
  player: Player,
  amount: number,
  options: { infect?: boolean; sourceInstanceId?: string } = {},
): DamageResult {
  if (fogFromOpponentCreatures(state, options.sourceInstanceId)) return { dealt: 0, prevented: amount };
  /*
   * "It deals double that damage instead" - Angrath's Marauders, applied before
   * the shield.
   *
   * The order is a simplification: two replacement effects waiting on one event
   * are ordered by the player they affect, so a defender with a shield could in
   * principle prevent first and be doubled after. Doubling first is the reading
   * that matches how both cards are played, and it is the only order in which
   * "prevent the next 3 damage" means the 3 that actually arrive.
   */
  // "protection from everything until your next turn" - The One Ring prevents all damage to you.
  if (player.protectionFromEverything) return { dealt: 0, prevented: amount };
  const doubled = damageDealt(state, amount, options.sourceInstanceId);
  const result = applyShield(player, doubled);
  /*
   * Infect damage to a player is poison counters, not life loss. Prevention
   * still applies first - a shield stops the damage before it becomes
   * anything - which is why this reads `result.dealt` rather than `amount`.
   */
  if (options.infect) {
    player.poisonCounters += result.dealt;
    if (result.dealt > 0) log(state, `${player.id} gets ${result.dealt} poison counter${result.dealt === 1 ? "" : "s"}`);
  } else {
    player.life -= result.dealt;
  }
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
  options: { deathtouch?: boolean; infect?: boolean; sourceInstanceId?: string } = {},
): DamageResult {
  /*
   * "...can't be dealt damage by sources with that quality." - protection, rule
   * 702.16b. Checked before the shield and before anything is marked, because
   * the damage does not happen at all: no lifelink for the attacker, no
   * deathtouch mark, and no "whenever this creature is dealt damage" trigger.
   *
   * Here rather than at each caller because this is the one door every point of
   * damage goes through - combat, a burn spell, a fight - so a damage source
   * added later is covered without knowing protection exists.
   */
  if (protectionStopsDamage(state, instance, options.sourceInstanceId)) {
    return { dealt: 0, prevented: amount };
  }
  if (fogFromOpponentCreatures(state, options.sourceInstanceId)) return { dealt: 0, prevented: amount };
  // Doubled before the shield, for the reason set out in damagePlayer.
  const result = applyShield(instance, damageDealt(state, amount, options.sourceInstanceId));
  /*
   * Infect damage to a creature is -1/-1 counters, which is a different thing
   * from damage in three ways that matter: it does not wear off at end of
   * turn, it shrinks the creature rather than filling it up, and a creature
   * killed by it dies to toughness rather than to lethal damage - so
   * regeneration cannot save it.
   */
  if (options.infect) {
    instance.minusOneCounters += result.dealt;
  } else {
    instance.damageMarked += result.dealt;
    if (result.dealt > 0) instance.damagedThisTurn = true;
  }
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
    for (const trigger of effectiveTriggers(state, instance)) {
      if (trigger.event !== "damaged") continue;
      pushTrigger(state, instance.instanceId, instance.controllerId, trigger, result.dealt);
    }
  }
  return result;
}

function cardLabel(state: GameState, instance: CardInstance): string {
  return state.cardDefinitions[instance.definitionId]?.name ?? instance.instanceId;
}
