import type { CardInstance, GameState } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";
import { effectivePower, effectiveToughness } from "./counters.js";
import { pushOntoStack } from "./permanents.js";

/**
 * Combat damage happens in two sub-steps once anything has First or Double
 * Strike (real rule 510.4). Which creatures deal damage in which:
 *
 *  - First Strike only:  the first sub-step, and nothing in the second.
 *  - Double Strike:      both.
 *  - Neither:            the second only.
 *
 * State-based actions run between the two, so a creature killed by first-strike
 * damage never deals its own - which is the entire point of the keyword.
 */
export type DamageStep = "first-strike" | "regular";

function dealsDamageIn(state: GameState, instance: CardInstance, step: DamageStep): boolean {
  const keywords = requireDefinition(state, instance.definitionId).keywords;
  const first = keywords?.includes("First Strike") ?? false;
  const double = keywords?.includes("Double Strike") ?? false;
  if (step === "first-strike") return first || double;
  return !first || double;
}

/** Whether a first-strike sub-step needs to happen at all this combat. */
export function combatHasFirstStrike(state: GameState): boolean {
  const involved = [...Object.keys(state.attackers), ...Object.keys(state.blockers)];
  return involved.some((id) => {
    const found = findOnAnyBattlefield(state, id);
    if (!found) return false;
    const keywords = requireDefinition(state, found.instance.definitionId).keywords;
    return (keywords?.includes("First Strike") ?? false) || (keywords?.includes("Double Strike") ?? false);
  });
}

export interface AttackerDeclaration {
  attackerInstanceId: string;
  defendingPlayerId: string;
}

export interface BlockerDeclaration {
  blockerInstanceId: string;
  attackerInstanceId: string;
}

export function declareAttackers(state: GameState, playerId: string, declarations: AttackerDeclaration[]): void {
  if (state.phase !== "combat" || state.step !== "declare-attackers") {
    throw new Error("Attackers can only be declared during the declare-attackers step");
  }
  if (state.players[state.activePlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} is not the active player`);
  }
  const player = requirePlayer(state, playerId);

  for (const { attackerInstanceId, defendingPlayerId } of declarations) {
    const instance = player.battlefield.find((c) => c.instanceId === attackerInstanceId);
    if (!instance) throw new Error(`${attackerInstanceId} is not on ${playerId}'s battlefield`);
    const def = requireDefinition(state, instance.definitionId);
    if (!def.types.includes("Creature")) throw new Error(`${def.name} is not a creature`);
    if (def.keywords?.includes("Defender")) throw new Error(`${def.name} has defender and cannot attack`);
    if (instance.tapped) throw new Error(`${def.name} is tapped and cannot attack`);
    const hasHaste = def.keywords?.includes("Haste") ?? false;
    if (instance.summoningSickness && !hasHaste) throw new Error(`${def.name} has summoning sickness`);
    const hasVigilance = def.keywords?.includes("Vigilance") ?? false;
    if (!hasVigilance) instance.tapped = true;
    state.attackers[attackerInstanceId] = defendingPlayerId;
  }

  // Attack triggers fire after every attacker is declared, not one at a time as
  // each is chosen - declaring attackers is a single simultaneous action.
  for (const { attackerInstanceId } of declarations) {
    const instance = player.battlefield.find((c) => c.instanceId === attackerInstanceId);
    if (!instance) continue;
    const def = requireDefinition(state, instance.definitionId);
    for (const trigger of def.triggeredAbilities ?? []) {
      if (trigger.event === "attacks") {
        pushOntoStack(state, instance.instanceId, playerId, trigger.effect, [], false);
      }
    }
  }

  state.passesInSuccession = 0;
}

export function declareBlockers(state: GameState, playerId: string, declarations: BlockerDeclaration[]): void {
  if (state.phase !== "combat" || state.step !== "declare-blockers") {
    throw new Error("Blockers can only be declared during the declare-blockers step");
  }
  const player = requirePlayer(state, playerId);

  // Menace: a creature with it can't be blocked except by two or more creatures - checked across
  // this whole declaration up front so a lone blocker on a Menace attacker is rejected outright.
  const blockerCountByAttacker = new Map<string, number>();
  for (const { attackerInstanceId } of declarations) {
    blockerCountByAttacker.set(attackerInstanceId, (blockerCountByAttacker.get(attackerInstanceId) ?? 0) + 1);
  }
  for (const [attackerInstanceId, count] of blockerCountByAttacker) {
    if (count !== 1) continue;
    const attackerFound = findOnAnyBattlefield(state, attackerInstanceId);
    if (!attackerFound) continue;
    const attackerDef = requireDefinition(state, attackerFound.instance.definitionId);
    if (attackerDef.keywords?.includes("Menace")) {
      throw new Error(`${attackerDef.name} has menace and can't be blocked by only one creature`);
    }
  }

  for (const { blockerInstanceId, attackerInstanceId } of declarations) {
    const blocker = player.battlefield.find((c) => c.instanceId === blockerInstanceId);
    if (!blocker) throw new Error(`${blockerInstanceId} is not on ${playerId}'s battlefield`);
    if (blocker.tapped) throw new Error(`${blockerInstanceId} is tapped and cannot block`);
    if (!(attackerInstanceId in state.attackers)) throw new Error(`${attackerInstanceId} is not attacking`);

    const blockerDef = requireDefinition(state, blocker.definitionId);
    const attackerFound = findOnAnyBattlefield(state, attackerInstanceId);
    if (attackerFound) {
      const attackerDef = requireDefinition(state, attackerFound.instance.definitionId);
      const attackerHasFlying = attackerDef.keywords?.includes("Flying") ?? false;
      if (attackerHasFlying) {
        const blockerCanBlockFlying =
          (blockerDef.keywords?.includes("Flying") ?? false) || (blockerDef.keywords?.includes("Reach") ?? false);
        if (!blockerCanBlockFlying) {
          throw new Error(`${blockerDef.name} can't block ${attackerDef.name} (Flying) without Flying or Reach`);
        }
      }
    }

    state.blockers[blockerInstanceId] = attackerInstanceId;
  }
  // Declaring is finished even when nothing was declared: "I block with
  // nothing" is a real decision, and the attacker's priority window opens
  // only once it has been made.
  state.blockersDeclared = true;
  state.passesInSuccession = 0;
}

/**
 * Deals combat damage for every declared attacker. Supports any number of
 * blockers per attacker (needed for Menace, and legal in general even
 * without it). Deathtouch, Lifelink, and Trample are all generic: any card
 * that declares the keyword gets the behavior, no per-card scripting.
 * Commander combat damage to a player is tracked cumulatively for the
 * 21-damage state-based loss condition, including damage that tramples
 * through.
 *
 * Multi-blocker damage assignment order follows blocker-declaration order
 * (a simplification - the real rules let the attacking player choose the
 * order/split; we don't have a UI for that yet). Per rule 510.1c: at least
 * lethal damage must be assigned to each blocker before the next one gets
 * any; without Trample, any leftover power still has to go to a blocker
 * (dumped on the last one) rather than being wasted, since only Trample
 * lets excess spill to the defending player.
 *
 * `step` selects which creatures deal damage now - see DamageStep. Attacker and
 * blocker are gated independently, because that is exactly what First Strike
 * does: a first-striking attacker hits in the first sub-step while its ordinary
 * blocker waits for the second, by which point it may be dead.
 */
export function dealCombatDamage(state: GameState, step: DamageStep = "regular"): void {
  const blockersByAttacker = new Map<string, string[]>();
  for (const [blockerInstanceId, attackerInstanceId] of Object.entries(state.blockers)) {
    const list = blockersByAttacker.get(attackerInstanceId) ?? [];
    list.push(blockerInstanceId);
    blockersByAttacker.set(attackerInstanceId, list);
  }

  for (const [attackerInstanceId, defendingPlayerId] of Object.entries(state.attackers)) {
    const attackerFound = findOnAnyBattlefield(state, attackerInstanceId);
    if (!attackerFound) continue;
    const attackerDef = requireDefinition(state, attackerFound.instance.definitionId);
    const power = effectivePower(state, attackerFound.instance);
    const attackerHasDeathtouch = attackerDef.keywords?.includes("Deathtouch") ?? false;
    const attackerHasLifelink = attackerDef.keywords?.includes("Lifelink") ?? false;
    const attackerHasTrample = attackerDef.keywords?.includes("Trample") ?? false;
    const attackerStrikesNow = dealsDamageIn(state, attackerFound.instance, step);

    const declaredBlockerIds = blockersByAttacker.get(attackerInstanceId) ?? [];
    // Blocked is a property of the declaration, not of who is still alive: an
    // attacker whose blockers all died to first strike stays blocked and
    // assigns nothing to the player (rule 509.1h), unless it has Trample.
    const wasBlocked = declaredBlockerIds.length > 0;
    const blockers = declaredBlockerIds
      .map((id) => findOnAnyBattlefield(state, id))
      .filter((found): found is NonNullable<typeof found> => found !== undefined);

    if (!wasBlocked) {
      if (!attackerStrikesNow || power <= 0) continue;
      const defender = requirePlayer(state, defendingPlayerId);
      defender.life -= power;
      if (attackerHasLifelink) {
        requirePlayer(state, attackerFound.instance.controllerId).life += power;
      }
      if (attackerFound.instance.isCommander) {
        defender.commanderDamageTaken[attackerInstanceId] =
          (defender.commanderDamageTaken[attackerInstanceId] ?? 0) + power;
      }
      continue;
    }

    let remainingPower = attackerStrikesNow ? power : 0;
    let anyBlockerDeathtouchDamage = false;
    for (let i = 0; i < blockers.length; i++) {
      const blockerFound = blockers[i]!;
      const isLastBlocker = i === blockers.length - 1;

      if (attackerStrikesNow) {
        const remainingToughness = Math.max(
          effectiveToughness(state, blockerFound.instance) - blockerFound.instance.damageMarked,
          0,
        );
        const neededForLethal = attackerHasDeathtouch ? (remainingToughness > 0 ? 1 : 0) : remainingToughness;

        // Without Trample, the last blocker soaks up whatever power is left, even past lethal -
        // an attacker's full power always gets assigned to its blockers when there's no Trample.
        const assign =
          !attackerHasTrample && isLastBlocker ? remainingPower : Math.min(remainingPower, neededForLethal);

        blockerFound.instance.damageMarked += assign;
        if (attackerHasDeathtouch && assign > 0) blockerFound.instance.deathtouchDamage = true;
        remainingPower -= assign;
      }

      if (!dealsDamageIn(state, blockerFound.instance, step)) continue;

      const blockerDef = requireDefinition(state, blockerFound.instance.definitionId);
      const blockerPower = effectivePower(state, blockerFound.instance);
      const blockerHasDeathtouch = blockerDef.keywords?.includes("Deathtouch") ?? false;
      const blockerHasLifelink = blockerDef.keywords?.includes("Lifelink") ?? false;

      attackerFound.instance.damageMarked += blockerPower;
      if (blockerHasDeathtouch && blockerPower > 0) anyBlockerDeathtouchDamage = true;
      if (blockerHasLifelink && blockerPower > 0) {
        requirePlayer(state, blockerFound.instance.controllerId).life += blockerPower;
      }
    }
    if (anyBlockerDeathtouchDamage) attackerFound.instance.deathtouchDamage = true;

    if (attackerStrikesNow && attackerHasTrample && remainingPower > 0) {
      const defender = requirePlayer(state, defendingPlayerId);
      defender.life -= remainingPower;
      if (attackerFound.instance.isCommander) {
        defender.commanderDamageTaken[attackerInstanceId] =
          (defender.commanderDamageTaken[attackerInstanceId] ?? 0) + remainingPower;
      }
    }

    if (attackerStrikesNow && attackerHasLifelink && power > 0) {
      requirePlayer(state, attackerFound.instance.controllerId).life += power;
    }
  }
}

function findOnAnyBattlefield(state: GameState, instanceId: string) {
  for (const player of state.players) {
    const instance = player.battlefield.find((c) => c.instanceId === instanceId);
    if (instance) return { instance, player };
  }
  return undefined;
}
