import type { GameState, StackTarget } from "./types.js";
import { findInstance, requireDefinition, requirePlayer } from "./state.js";
import { canPayManaCost, payManaCost } from "./mana.js";
import { applyEffect } from "./effects.js";
import { pushOntoStack } from "./permanents.js";
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

  if (ability.cost.tap) instance.tapped = true;
  if (ability.cost.mana) payManaCost(player, ability.cost.mana);

  const isManaAbility = ability.effect.kind === "addMana";
  if (isManaAbility) {
    applyEffect(state, playerId, instanceId, ability.effect, targets);
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
