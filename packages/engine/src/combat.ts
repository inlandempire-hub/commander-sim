import type { CardInstance, GameState } from "./types.js";
import { log, requireDefinition, requirePlayer } from "./state.js";
import { gainLife } from "./life.js";
import { effectivePower, effectiveToughness, effectiveTriggers, hasKeyword } from "./counters.js";
import { damageCreature, damagePlayer } from "./damage.js";
import { canPayManaCost, payManaCost } from "./mana.js";
import { describeSubject, fireCombatDamageToPlayer, fireWatchers, pushTrigger } from "./permanents.js";

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
  const first = hasKeyword(state, instance, "First Strike");
  const double = hasKeyword(state, instance, "Double Strike");
  if (step === "first-strike") return first || double;
  return !first || double;
}

/** Whether a first-strike sub-step needs to happen at all this combat. */
export function combatHasFirstStrike(state: GameState): boolean {
  const involved = [...Object.keys(state.attackers), ...Object.keys(state.blockers)];
  return involved.some((id) => {
    const found = findOnAnyBattlefield(state, id);
    if (!found) return false;
    return hasKeyword(state, found.instance, "First Strike") || hasKeyword(state, found.instance, "Double Strike");
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

/**
 * Why this creature cannot attack, or null if it can.
 *
 * Split out of declareAttackers so the interface can ask the same question
 * *before* committing, and answer it in the same words. Previously the check
 * only existed inside the declaration, which meant a player could select a
 * tapped or summoning-sick creature, press confirm, and watch it simply not
 * attack with nothing said. A rule the player cannot see is indistinguishable
 * from a bug.
 */
export function attackProblem(state: GameState, playerId: string, attackerInstanceId: string): string | null {
  const player = requirePlayer(state, playerId);
  const instance = player.battlefield.find((c) => c.instanceId === attackerInstanceId);
  if (!instance) return "That creature is not on your battlefield";
  const def = requireDefinition(state, instance.definitionId);
  if (!def.types.includes("Creature")) return `${def.name} is not a creature`;
  if (hasKeyword(state, instance, "Defender")) return `${def.name} has defender and cannot attack`;
  if (instance.tapped) return `${def.name} is tapped and cannot attack`;
  const hasHaste = hasKeyword(state, instance, "Haste");
  if (instance.summoningSickness && !hasHaste) {
    return `${def.name} came into play this turn and cannot attack yet`;
  }
  return null;
}

/**
 * Why this creature cannot block that attacker, or null if it can.
 *
 * Menace is deliberately not checked here: it is a restriction on the whole
 * declaration ("cannot be blocked by *only one* creature"), not on any single
 * pairing, so a first blocker being assigned to a Menace attacker is perfectly
 * legal right up until the declaration ends with only that one. declareBlockers
 * still enforces it across the batch.
 */
export function blockProblem(
  state: GameState,
  playerId: string,
  blockerInstanceId: string,
  attackerInstanceId: string,
): string | null {
  const player = requirePlayer(state, playerId);
  const blocker = player.battlefield.find((c) => c.instanceId === blockerInstanceId);
  if (!blocker) return "That creature is not on your battlefield";
  const blockerDef = requireDefinition(state, blocker.definitionId);
  if (!blockerDef.types.includes("Creature")) return `${blockerDef.name} is not a creature`;
  if (blocker.tapped) return `${blockerDef.name} is tapped and cannot block`;
  if (!(attackerInstanceId in state.attackers)) return "That creature is not attacking";

  const attackerFound = findOnAnyBattlefield(state, attackerInstanceId);
  if (attackerFound) {
    const attackerDef = requireDefinition(state, attackerFound.instance.definitionId);
    if (hasKeyword(state, attackerFound.instance, "Flying")) {
      const canReachIt = hasKeyword(state, blocker, "Flying") || hasKeyword(state, blocker, "Reach");
      if (!canReachIt) {
        return `${blockerDef.name} cannot block ${attackerDef.name} - it has flying, and this has neither flying nor reach`;
      }
    }
    // Fear: "can't be blocked except by artifact creatures and/or black creatures."
    if (hasKeyword(state, attackerFound.instance, "Fear")) {
      const isArtifact = blockerDef.types.includes("Artifact");
      const isBlack = (blockerDef.manaCost?.colors?.B ?? 0) > 0;
      if (!isArtifact && !isBlack) {
        return `${blockerDef.name} cannot block ${attackerDef.name} - it has fear, and this is neither an artifact nor black`;
      }
    }
    // Nonbasic landwalk: unblockable while the defending player (the blocker's
    // controller, since you may only block attackers aimed at you) controls a
    // land that is not Basic.
    if (hasKeyword(state, attackerFound.instance, "Nonbasic Landwalk")) {
      const defender = requirePlayer(state, blocker.controllerId);
      const controlsNonbasic = defender.battlefield.some((c) => {
        const d = requireDefinition(state, c.definitionId);
        return d.types.includes("Land") && !(d.supertypes ?? []).includes("Basic");
      });
      if (controlsNonbasic) {
        return `${blockerDef.name} cannot block ${attackerDef.name} - it has nonbasic landwalk and you control a nonbasic land`;
      }
    }
  }
  return null;
}

export function declareAttackers(state: GameState, playerId: string, declarations: AttackerDeclaration[]): void {
  if (state.phase !== "combat" || state.step !== "declare-attackers") {
    throw new Error("Attackers can only be declared during the declare-attackers step");
  }
  if (state.players[state.activePlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} is not the active player`);
  }
  const player = requirePlayer(state, playerId);

  // Propaganda tax: {2} for each attacker aimed at a defender who controls it,
  // paid up front. An attacking player who cannot pay simply cannot make that
  // declaration.
  let attackTax = 0;
  for (const { defendingPlayerId } of declarations) {
    const defender = requirePlayer(state, defendingPlayerId);
    for (const permanent of defender.battlefield) {
      attackTax += requireDefinition(state, permanent.definitionId).attackTax ?? 0;
    }
  }
  if (attackTax > 0) {
    const cost = { generic: attackTax, colors: {} };
    if (!canPayManaCost(player, cost)) {
      throw new Error(`${playerId} cannot pay the attack tax of ${attackTax}`);
    }
    payManaCost(player, cost);
  }

  for (const { attackerInstanceId, defendingPlayerId } of declarations) {
    const problem = attackProblem(state, playerId, attackerInstanceId);
    if (problem) throw new Error(problem);
    const instance = player.battlefield.find((c) => c.instanceId === attackerInstanceId)!;
    const def = requireDefinition(state, instance.definitionId);
    const hasVigilance = hasKeyword(state, instance, "Vigilance");
    if (!hasVigilance) instance.tapped = true;
    state.attackers[attackerInstanceId] = defendingPlayerId;
  }

  // Attack triggers fire after every attacker is declared, not one at a time as
  // each is chosen - declaring attackers is a single simultaneous action.
  for (const { attackerInstanceId } of declarations) {
    const instance = player.battlefield.find((c) => c.instanceId === attackerInstanceId);
    if (!instance) continue;
    for (const trigger of effectiveTriggers(state, instance)) {
      if (trigger.event === "attacks") {
        pushTrigger(state, instance.instanceId, playerId, trigger);
      }
    }
    /*
     * Everything else on the table watching for somebody *else* to attack -
     * Fumulus, the Infestation's "whenever an Insect, Leech, Slug, or Worm you
     * control attacks".
     *
     * A watcher event rather than a second meaning for `attacks`, and the
     * distinction is the same one `permanent-enters` draws against
     * `enters-battlefield`: one watches the card it is printed on and the other
     * watches the table. A card written with the wrong one of the pair fires
     * either far too often or never at all.
     */
    fireWatchers(state, "permanent-attacks", describeSubject(state, instance));
  }

  if (declarations.length > 0) {
    log(
      state,
      `${playerId} attacks with ${declarations
        .map((d) => requireDefinition(state, player.battlefield.find((c) => c.instanceId === d.attackerInstanceId)?.definitionId ?? "").name)
        .join(", ")}`,
    );
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
    if (hasKeyword(state, attackerFound.instance, "Menace")) {
      throw new Error(`${attackerDef.name} has menace and can't be blocked by only one creature`);
    }
  }

  for (const { blockerInstanceId, attackerInstanceId } of declarations) {
    const problem = blockProblem(state, playerId, blockerInstanceId, attackerInstanceId);
    if (problem) throw new Error(problem);
    state.blockers[blockerInstanceId] = attackerInstanceId;
  }
  const blockCount = declarations.length;
  log(
    state,
    blockCount === 0
      ? `${playerId} declares no blockers`
      : `${playerId} blocks with ${blockCount} creature${blockCount === 1 ? "" : "s"}`,
  );
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
/**
 * Whether this creature's combat damage is prevented outright this turn.
 *
 * Read per creature rather than once per combat, because Arachnogenesis
 * excludes a subtype: the Spiders it just made still hit, and everything else
 * does not. Checked here rather than in `damageCreature` because it is combat
 * damage specifically - a Spider-less burn spell is unaffected.
 */
function combatDamageIsPrevented(state: GameState, instance: CardInstance): boolean {
  const fog = state.combatDamagePrevention;
  if (!fog) return false;
  if (!fog.exceptSubtype) return true;
  return !requireDefinition(state, instance.definitionId).subtypes?.includes(fog.exceptSubtype);
}

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
    // A creature taken out of combat deals no combat damage and is dealt none -
    // today only regeneration does this, and only ever between two damage
    // steps. It stays in `state.attackers` so that whatever blocked it is still
    // recorded as having blocked it.
    if (attackerFound.instance.removedFromCombat) continue;
    const attackerDef = requireDefinition(state, attackerFound.instance.definitionId);
    const power = effectivePower(state, attackerFound.instance);
    const attackerHasDeathtouch = hasKeyword(state, attackerFound.instance, "Deathtouch");
    const attackerHasLifelink = hasKeyword(state, attackerFound.instance, "Lifelink");
    const attackerHasTrample = hasKeyword(state, attackerFound.instance, "Trample");
    const attackerStrikesNow =
      dealsDamageIn(state, attackerFound.instance, step) &&
      !combatDamageIsPrevented(state, attackerFound.instance);

    const declaredBlockerIds = blockersByAttacker.get(attackerInstanceId) ?? [];
    // Blocked is a property of the declaration, not of who is still alive: an
    // attacker whose blockers all died to first strike stays blocked and
    // assigns nothing to the player (rule 509.1h), unless it has Trample.
    const wasBlocked = declaredBlockerIds.length > 0;
    const blockers = declaredBlockerIds
      .map((id) => findOnAnyBattlefield(state, id))
      .filter((found): found is NonNullable<typeof found> => found !== undefined)
      // A regenerated blocker has left combat, but `wasBlocked` above still
      // counts it - the attacker remains blocked and hits nobody.
      .filter((found) => !found.instance.removedFromCombat);

    if (!wasBlocked) {
      if (!attackerStrikesNow || power <= 0) continue;
      const defender = requirePlayer(state, defendingPlayerId);
      // Everything downstream keys off what actually landed rather than off
      // the attacker's power: a player who prevented the damage gained no
      // lifelink for the attacker and took no commander damage either.
      const { dealt } = damagePlayer(state, defender, power, {
        infect: hasKeyword(state, attackerFound.instance, "Infect"),
      });
      if (attackerHasLifelink && dealt > 0) {
        gainLife(state, attackerFound.instance.controllerId, dealt);
      }
      if (attackerFound.instance.isCommander && dealt > 0) {
        defender.commanderDamageTaken[attackerInstanceId] =
          (defender.commanderDamageTaken[attackerInstanceId] ?? 0) + dealt;
      }
      if (dealt > 0) {
        fireCombatDamageToPlayer(state, attackerInstanceId, attackerFound.instance.controllerId, dealt);
      }
      continue;
    }

    let remainingPower = attackerStrikesNow ? power : 0;
    let anyBlockerDeathtouchDamage = false;
    /** How much of this attacker's power a blocker's shield swallowed. */
    let preventedByBlockers = 0;
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

        // Assigned power is spent whether or not it lands: a blocker with a
        // shield up soaks its share of the attacker's power all the same, and
        // trample does not get to carry the prevented damage through to the
        // player (rule 702.19b assigns against toughness, not against what
        // survives prevention).
        preventedByBlockers += damageCreature(state, blockerFound.instance, assign, {
          infect: hasKeyword(state, attackerFound.instance, "Infect"),
          deathtouch: attackerHasDeathtouch,
        }).prevented;
        remainingPower -= assign;
      }

      if (!dealsDamageIn(state, blockerFound.instance, step)) continue;
      if (combatDamageIsPrevented(state, blockerFound.instance)) continue;

      const blockerPower = effectivePower(state, blockerFound.instance);
      const blockerHasDeathtouch = hasKeyword(state, blockerFound.instance, "Deathtouch");
      const blockerHasLifelink = hasKeyword(state, blockerFound.instance, "Lifelink");

      const { dealt: dealtToAttacker } = damageCreature(state, attackerFound.instance, blockerPower, {
        infect: hasKeyword(state, blockerFound.instance, "Infect"),
      });
      if (blockerHasDeathtouch && dealtToAttacker > 0) anyBlockerDeathtouchDamage = true;
      if (blockerHasLifelink && dealtToAttacker > 0) {
        gainLife(state, blockerFound.instance.controllerId, dealtToAttacker);
      }
    }
    if (anyBlockerDeathtouchDamage) attackerFound.instance.deathtouchDamage = true;

    let trampledThrough = 0;
    if (attackerStrikesNow && attackerHasTrample && remainingPower > 0) {
      const defender = requirePlayer(state, defendingPlayerId);
      trampledThrough = damagePlayer(state, defender, remainingPower, {
        infect: hasKeyword(state, attackerFound.instance, "Infect"),
      }).dealt;
      if (attackerFound.instance.isCommander && trampledThrough > 0) {
        defender.commanderDamageTaken[attackerInstanceId] =
          (defender.commanderDamageTaken[attackerInstanceId] ?? 0) + trampledThrough;
      }
      if (trampledThrough > 0) {
        fireCombatDamageToPlayer(state, attackerInstanceId, attackerFound.instance.controllerId, trampledThrough);
      }
    }

    if (attackerStrikesNow && attackerHasLifelink && power > 0) {
      // The whole of this attacker's power, which is dealt somewhere: to its
      // blockers, and over them to the player if it tramples. Only what
      // prevention swallowed is missing from it.
      const dealt = power - preventedByBlockers - (remainingPower - trampledThrough);
      if (dealt > 0) gainLife(state, attackerFound.instance.controllerId, dealt);
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
