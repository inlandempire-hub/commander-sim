import type { GameState, StackTarget } from "./types.js";
import { findInstance, log, requireDefinition, requirePlayer } from "./state.js";
import { canPayManaCost, identityAllows, payManaCost } from "./mana.js";
import { controllerMeets } from "./conditions.js";
import { damagePlayer } from "./damage.js";
import { applyEffect } from "./effects.js";
import { pushOntoStack } from "./permanents.js";
import { sacrificePermanent } from "./sba.js";
import { attemptWardPayments } from "./ward.js";

/**
 * Activates a permanent's activated ability by index. Mana abilities resolve
 * immediately without using the stack (per the real rules); everything else
 * is put on the stack like a spell.
 */
export function activateAbility(
  state: GameState,
  playerId: string,
  instanceId: string,
  abilityIndex: number,
  targets: StackTarget[] = [],
): void {
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;
  const player = requirePlayer(state, playerId);
  if (instance.controllerId !== playerId) throw new Error(`${playerId} does not control ${instanceId}`);
  if (instance.zone !== "battlefield") throw new Error(`${instanceId} is not on the battlefield`);

  const def = requireDefinition(state, instance.definitionId);
  const ability = def.activatedAbilities?.[abilityIndex];
  if (!ability) throw new Error(`${def.name} has no activated ability at index ${abilityIndex}`);

  // Validate every part of the cost before paying any of it - costs are paid
  // simultaneously, so an ability whose mana can't be covered must not leave
  // the permanent tapped as a side effect of the attempt.
  if (ability.cost.tap) {
    if (instance.tapped) throw new Error(`${def.name} is already tapped`);
    // Summoning sickness (302.6) only restricts creatures' tap abilities - lands and
    // other permanent types can always be tapped, even the turn they entered.
    if (def.types.includes("Creature") && instance.summoningSickness) {
      throw new Error(`${def.name} has summoning sickness`);
    }
  }
  if (ability.cost.mana && !canPayManaCost(player, ability.cost.mana)) {
    throw new Error(`${playerId} cannot pay the activation cost of ${def.name}`);
  }
  if (!identityAllows(state, playerId, ability)) {
    throw new Error(`${def.name} cannot make that colour in this deck`);
  }
  // "Activate only if you control a Swamp." Checked before anything is paid,
  // and re-checked on every activation rather than remembered - the board this
  // asks about changes constantly.
  if (!controllerMeets(state, playerId, ability.activateOnlyIf)) {
    throw new Error(`${def.name}'s ability cannot be activated right now`);
  }
  if (ability.cost.payLife !== undefined && player.life < ability.cost.payLife) {
    // You may not pay life you do not have. Paying down to exactly 0 is legal
    // and loses the game to the usual state-based action - that is the real
    // rule, and it is why this is `<` rather than `<=`.
    throw new Error(`${playerId} cannot pay ${ability.cost.payLife} life`);
  }

  if (ability.cost.tap) instance.tapped = true;
  if (ability.cost.mana) payManaCost(player, ability.cost.mana);
  if (ability.cost.payLife !== undefined) {
    player.life -= ability.cost.payLife;
    log(state, `${playerId} pays ${ability.cost.payLife} life`);
  }
  /*
   * The sacrifice happens here, as part of the cost, and that ordering is the
   * whole card: a fetchland is in the graveyard before its search ever
   * resolves. An ability is independent of its source once activated, so
   * losing the permanent does not stop it - which is exactly why this must not
   * be written as part of the effect.
   */
  if (ability.cost.sacrificeSelf) sacrificePermanent(state, instanceId);

  const isManaAbility =
    ability.effect.kind === "addMana" || ability.effect.kind === "addManaCombination";
  if (isManaAbility) {
    applyEffect(state, playerId, instanceId, ability.effect, targets);
    /*
     * "Add {B}. This land deals 1 damage to you."
     *
     * Applied here rather than inside the effect because it belongs to the
     * ability, not to adding mana - the same `addMana` effect on a Forest must
     * not hurt anybody. It lands after the mana, which is the printed order,
     * and it goes through the ordinary damage path so a prevention shield
     * covers it exactly as it would cover a burn spell.
     */
    if (ability.damageToController) {
      const dealt = damagePlayer(state, player, ability.damageToController).dealt;
      if (dealt > 0) log(state, `${def.name} deals ${dealt} damage to ${playerId}`);
    }
  } else {
    if (targets.length > 0 && !attemptWardPayments(state, playerId, targets)) {
      // Ward's cost went unpaid - the ability is countered (fizzles). The tap/mana cost already
      // paid to activate it is not refunded, matching the same rule as a countered spell.
      state.passesInSuccession = 0;
      return;
    }
    pushOntoStack(state, instanceId, playerId, ability.effect, targets, false);
    state.passesInSuccession = 0;
  }
}
