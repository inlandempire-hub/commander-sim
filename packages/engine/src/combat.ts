import type { CardInstance, GameState } from "./types.js";
import { log, requireDefinition, requirePlayer } from "./state.js";
import { gainLife } from "./life.js";
import {
  effectivePower,
  effectiveToughness,
  effectiveToxic,
  effectiveTriggers,
  hasCreatureType,
  hasKeyword,
  typesOf,
} from "./counters.js";
import { damageCreature, damagePlayer } from "./damage.js";
import {
  describeSubject,
  fireBecomesBlocked,
  fireCombatDamageToPlayer,
  fireCreaturesAttack,
  fireWatchers,
  pushTrigger,
  tapPermanent,
} from "./permanents.js";
import { protectionStopsBlock, qualityWord } from "./protection.js";
import { blockRestrictionProblem } from "./blocking.js";

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
  // `typesOf`, not `def.types`: an animated Blinkmoth Nexus is a creature this
  // turn and may attack, and the printed type line says only "Land".
  if (!typesOf(state, instance).includes("Creature")) return `${def.name} is not a creature`;
  if (hasKeyword(state, instance, "Defender")) return `${def.name} has defender and cannot attack`;
  if (instance.tapped) return `${def.name} is tapped and cannot attack`;
  const hasHaste = hasKeyword(state, instance, "Haste");
  if (instance.summoningSickness && !hasHaste) {
    return `${def.name} came into play this turn and cannot attack yet`;
  }
  return null;
}

/**
 * Why this creature *has* to attack, or null if it is free not to.
 *
 * The mirror of `attackProblem` above, and it exists for the same reason: the
 * engine enforces it, the bot has to plan around it and the client has to draw
 * it, and three copies of one rule is three chances for them to disagree. A
 * creature that has to attack but *cannot* is not required to - that is the
 * whole of "if able" - so callers ask both questions and this one only settles
 * the requirement.
 *
 * Returns the reason in the words the player will be shown, because a
 * requirement they cannot see is indistinguishable from a bug.
 */
export function attackRequirement(
  state: GameState,
  playerId: string,
  attackerInstanceId: string,
): string | null {
  const player = requirePlayer(state, playerId);
  const instance = player.battlefield.find((c) => c.instanceId === attackerInstanceId);
  if (!instance) return null;
  const def = requireDefinition(state, instance.definitionId);

  /*
   * "That token gains haste until end of turn and **attacks this combat if
   * able**" - Legion Warboss. One creature, one combat, stamped on the instance
   * as the token was made.
   */
  if (instance.mustAttackThisCombat) return `${def.name} must attack this combat`;

  /*
   * "**Other** Goblin creatures you control attack each combat if able." -
   * Goblin Rabblemaster. A static on the board rather than a mark on the
   * creature, so it is read off whatever is in play right now: kill the
   * Rabblemaster and its Goblins are free again mid-combat.
   */
  for (const other of player.battlefield) {
    if (other.instanceId === instance.instanceId) continue; // "**Other** Goblins"
    const subtype = state.cardDefinitions[other.definitionId]?.staticRules?.othersOfSubtypeMustAttack;
    if (!subtype) continue;
    if (!hasCreatureType(state, instance, subtype)) continue;
    const otherDef = requireDefinition(state, other.definitionId);
    return `${def.name} must attack each combat - ${otherDef.name} says so`;
  }
  return null;
}

/**
 * Every creature this player must declare as an attacker right now.
 *
 * Both questions together: a creature that has to attack and legally cannot is
 * not on this list, which is what "if able" means and is why nothing else in
 * the engine may read `attackRequirement` on its own.
 */
export function compelledAttackers(state: GameState, playerId: string): CardInstance[] {
  const player = requirePlayer(state, playerId);
  return player.battlefield.filter(
    (instance) =>
      attackRequirement(state, playerId, instance.instanceId) !== null &&
      attackProblem(state, playerId, instance.instanceId) === null,
  );
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
  // The one check that is about this *declaration* rather than about the two
  // creatures - see `blockWouldBeIllegal`, which is the rest of it.
  if (!(attackerInstanceId in state.attackers)) return "That creature is not attacking";
  return blockWouldBeIllegal(state, playerId, blockerInstanceId, attackerInstanceId);
}

/**
 * Why this creature could never block that one, or null if it could.
 *
 * The same question `blockProblem` answers, minus the one part of it that is
 * about the current combat: whether the attacker has actually been declared.
 *
 * That distinction is the whole reason this exists. The bot asks "could this be
 * blocked?" while deciding what to *attack with* - before anything is declared -
 * and asking `blockProblem` there says "that creature is not attacking" about
 * every creature on the table, which reads as "nothing can block" and turns the
 * bot into one that attacks into anything.
 */
export function blockWouldBeIllegal(
  state: GameState,
  playerId: string,
  blockerInstanceId: string,
  attackerInstanceId: string,
): string | null {
  const player = requirePlayer(state, playerId);
  const blocker = player.battlefield.find((c) => c.instanceId === blockerInstanceId);
  if (!blocker) return "That creature is not on your battlefield";
  const blockerDef = requireDefinition(state, blocker.definitionId);
  if (!typesOf(state, blocker).includes("Creature")) return `${blockerDef.name} is not a creature`;
  // "Skrelv can't block." Printed text with no keyword of its own - the mirror
  // of Defender, which is the same restriction pointed the other way.
  if (blockerDef.cantBlock) return `${blockerDef.name} can't block`;
  if (blocker.tapped) return `${blockerDef.name} is tapped and cannot block`;

  /*
   * "...can't be blocked by creatures with that quality." Protection on the
   * *attacker*, checked against the blocker's colours - a Mother of Runes naming
   * white walls off every white creature on the other side for the turn.
   *
   * Note the direction: protection on a blocker does not stop it blocking, and
   * reading it the other way round would make every one of these cards better
   * than printed.
   */
  const blockedByProtection = protectionStopsBlock(state, attackerInstanceId, blockerInstanceId);
  if (blockedByProtection) {
    const attackerName = requireDefinition(
      state,
      findOnAnyBattlefield(state, attackerInstanceId)!.instance.definitionId,
    ).name;
    return `${blockerDef.name} cannot block ${attackerName} - it has protection from ${qualityWord(blockedByProtection)}`;
  }

  /*
   * "Can't be blocked except by ..." - flying, Signal Pest's printed
   * restriction, and anything granted for the turn, all through one door. See
   * blocking.ts for why flying is not checked separately here any more.
   */
  const attackerFound = findOnAnyBattlefield(state, attackerInstanceId);
  if (attackerFound) {
    const attackerDef = requireDefinition(state, attackerFound.instance.definitionId);
    const evasion = blockRestrictionProblem(state, attackerFound.instance, blocker);
    if (evasion) return `${blockerDef.name} cannot block ${attackerDef.name} - ${evasion}`;
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

  /*
   * "...attack each combat if able." Checked across the whole declaration
   * rather than per creature, because that is what it is: a requirement is only
   * broken by the declaration *ending* without the creature in it.
   *
   * Checked before anything is tapped, so a rejected declaration leaves the
   * board exactly as it found it.
   */
  const declared = new Set(declarations.map((d) => d.attackerInstanceId));
  for (const compelled of compelledAttackers(state, playerId)) {
    if (declared.has(compelled.instanceId)) continue;
    throw new Error(attackRequirement(state, playerId, compelled.instanceId)!);
  }

  for (const { attackerInstanceId, defendingPlayerId } of declarations) {
    const problem = attackProblem(state, playerId, attackerInstanceId);
    if (problem) throw new Error(problem);
    const instance = player.battlefield.find((c) => c.instanceId === attackerInstanceId)!;
    const def = requireDefinition(state, instance.definitionId);
    const hasVigilance = hasKeyword(state, instance, "Vigilance");
    // Attacking taps it, and that counts as becoming tapped - City of Brass is a
    // land, but the day a creature carries the trigger this is the same rule.
    if (!hasVigilance) tapPermanent(state, instance);
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

  /*
   * "Whenever you attack with one or more ..." - once for the whole swing, and
   * so outside the loop above rather than inside it. See `fireCreaturesAttack`.
   */
  fireCreaturesAttack(state, playerId, declarations.map((d) => d.attackerInstanceId));

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
  /*
   * "Becomes blocked" - after every blocker is recorded, not as each is
   * assigned, because declaring blockers is one simultaneous action. Once per
   * blocker, which is what "by a creature" says.
   */
  for (const { blockerInstanceId, attackerInstanceId } of declarations) {
    fireBecomesBlocked(state, attackerInstanceId, blockerInstanceId);
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

/**
 * "**Toxic 1** - Players dealt combat damage by this creature also get a poison
 * counter."
 *
 * Applied beside the damage rather than instead of it, which is the whole
 * difference from infect: a player takes the damage *and* the poison. Called
 * from both paths that reach a player - unblocked, and trampled through -
 * because both are combat damage dealt by that creature.
 */
function applyToxic(state: GameState, attacker: CardInstance, defenderId: string, dealt: number): void {
  if (dealt <= 0) return;
  const toxic = effectiveToxic(state, attacker);
  if (toxic <= 0) return;
  const defender = requirePlayer(state, defenderId);
  defender.poisonCounters += toxic;
  log(state, `${defenderId} gets ${toxic} poison counter${toxic === 1 ? "" : "s"}`);
}

export function dealCombatDamage(state: GameState, step: DamageStep = "regular"): void {
  /*
   * Every creature that got through to a player this sub-step, collected as the
   * damage is dealt and handed to the triggers afterwards.
   *
   * Afterwards rather than inline, because "one or more creatures you control
   * deal combat damage" is a single event however many connected - firing as we
   * went would make Professional Face-Breaker pay out per creature.
   */
  const hits: Array<{ attackerInstanceId: string; defendingPlayerId: string }> = [];
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
        sourceInstanceId: attackerInstanceId,
      });
      if (attackerHasLifelink && dealt > 0) {
        gainLife(state, attackerFound.instance.controllerId, dealt);
      }
      if (attackerFound.instance.isCommander && dealt > 0) {
        defender.commanderDamageTaken[attackerInstanceId] =
          (defender.commanderDamageTaken[attackerInstanceId] ?? 0) + dealt;
      }
      applyToxic(state, attackerFound.instance, defendingPlayerId, dealt);
      if (dealt > 0) hits.push({ attackerInstanceId, defendingPlayerId });
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
          sourceInstanceId: attackerInstanceId,
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
        sourceInstanceId: blockerFound.instance.instanceId,
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
        sourceInstanceId: attackerInstanceId,
      }).dealt;
      if (attackerFound.instance.isCommander && trampledThrough > 0) {
        defender.commanderDamageTaken[attackerInstanceId] =
          (defender.commanderDamageTaken[attackerInstanceId] ?? 0) + trampledThrough;
      }
      // Damage that trampled through is combat damage to a player like any
      // other, which is why this is here and not only on the unblocked path.
      applyToxic(state, attackerFound.instance, defendingPlayerId, trampledThrough);
      if (trampledThrough > 0) hits.push({ attackerInstanceId, defendingPlayerId });
    }

    if (attackerStrikesNow && attackerHasLifelink && power > 0) {
      // The whole of this attacker's power, which is dealt somewhere: to its
      // blockers, and over them to the player if it tramples. Only what
      // prevention swallowed is missing from it.
      const dealt = power - preventedByBlockers - (remainingPower - trampledThrough);
      if (dealt > 0) gainLife(state, attackerFound.instance.controllerId, dealt);
    }
  }
  /*
   * "Whenever a creature deals combat damage to the monarch, that creature's
   * controller becomes the monarch."
   *
   * A rule of the game rather than an ability, so it is applied here from the
   * same list of hits the triggers read - one record of what connected, so the
   * crown and the Treasures can never disagree about it.
   *
   * Before the triggers, because the crown is a turn-based consequence of the
   * damage rather than something waiting on the stack: an ability that made the
   * monarch draw would see the new monarch, which is the real behaviour.
   */
  for (const { attackerInstanceId, defendingPlayerId } of hits) {
    if (state.monarchPlayerId !== defendingPlayerId) continue;
    const found = findOnAnyBattlefield(state, attackerInstanceId);
    if (!found) continue;
    if (found.instance.controllerId === state.monarchPlayerId) continue;
    state.monarchPlayerId = found.instance.controllerId;
    log(state, `${found.instance.controllerId} takes the crown`);
  }

  // Everything that connected, in one event - see `fireCombatDamageToPlayer`.
  if (hits.length > 0) fireCombatDamageToPlayer(state, hits);
}

function findOnAnyBattlefield(state: GameState, instanceId: string) {
  for (const player of state.players) {
    const instance = player.battlefield.find((c) => c.instanceId === instanceId);
    if (instance) return { instance, player };
  }
  return undefined;
}
