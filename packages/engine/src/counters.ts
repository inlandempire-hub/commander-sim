import type { CardDefinition, CardInstance, GameState, Keyword, TriggeredAbility } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";

/**
 * Whether a `staticBuff` printed on `source` reaches `candidate`.
 *
 * Split out from the sum below because the keyword half asks exactly the same
 * question and a second copy of these four checks would be a second place for
 * "attacking Pests you control" to quietly stop meaning attacking.
 */
function buffApplies(
  state: GameState,
  source: CardInstance,
  buff: NonNullable<CardDefinition["staticBuff"]>,
  candidate: CardInstance,
  candidateDef: CardDefinition,
): boolean {
  /*
   * An Equipment's buff is not an anthem: "equipped creature gets +1/-1"
   * reaches exactly one permanent, the one it is attached to, and nothing at
   * all while it sits unattached. Checked first, because every other rule below
   * is about classes of creatures and none of them apply.
   */
  const sourceDef = state.cardDefinitions[source.definitionId];
  if (sourceDef?.equipCost) return source.attachedTo === candidate.instanceId;

  // "*other* creatures you control", unless the card omits the word - see
  // `includesSelf`.
  if (source.instanceId === candidate.instanceId && !buff.includesSelf) return false;
  // Every card of this shape says "creatures". Without this, Duskshell
  // Crawler's trample would land on any land carrying a counter, which is
  // invisible right up until something starts counting keywords.
  if (!candidateDef.types.includes("Creature")) return false;
  if (buff.subtype && !candidateDef.subtypes?.includes(buff.subtype)) return false;
  // "Attacking Pests you control" - a creature that is not in combat is not
  // one of them, so the bonus and the menace both come and go with the attack.
  if (buff.restriction === "attacking" && state.attackers[candidate.instanceId] === undefined) return false;
  // "each creature you control with a +1/+1 counter on it" - likewise reread
  // every time, so a creature that loses its last counter loses the trample.
  if (buff.restriction === "with-counter" && candidate.plusOneCounters <= 0) return false;
  return true;
}

/**
 * Every `staticBuff` currently reaching this permanent, from its controller's
 * own battlefield.
 *
 * Recomputed on every read rather than cached, which is the whole reason this
 * can stay simple: nothing has to be invalidated when a permanent enters or
 * leaves, because there is no stored value to go stale. Fine at this board
 * size; revisit if profiling ever says otherwise.
 */
function buffsReaching(state: GameState, instance: CardInstance): Array<NonNullable<CardDefinition["staticBuff"]>> {
  if (instance.zone !== "battlefield") return [];
  const controller = requirePlayer(state, instance.controllerId);
  const def = requireDefinition(state, instance.definitionId);
  const found: Array<NonNullable<CardDefinition["staticBuff"]>> = [];
  for (const other of controller.battlefield) {
    const buff = state.cardDefinitions[other.definitionId]?.staticBuff;
    if (!buff) continue;
    if (!buffApplies(state, other, buff, instance, def)) continue;
    found.push(buff);
  }
  return found;
}

/** The total power/toughness bonus from the "anthem"/"lord" pattern. */
function staticBuffFor(state: GameState, instance: CardInstance): { power: number; toughness: number } {
  const total = { power: 0, toughness: 0 };
  for (const buff of buffsReaching(state, instance)) {
    total.power += buff.power;
    total.toughness += buff.toughness;
  }
  return total;
}

/**
 * Every keyword this permanent has right now - printed, granted for the turn,
 * and granted by something else on the battlefield.
 *
 * **Nothing may read `CardDefinition.keywords` directly.** That was safe only
 * while keywords were a fixed property of the card; the moment Heroic
 * Intervention can hand out indestructible and Blight Mound can hand out
 * menace, a read of the printed list is a read of a stale answer. The failure
 * is silent and one-sided - the card looks right in the panel and simply does
 * not work in combat - so the rule is the blunt one, and every site in the
 * engine, the bot and the client goes through here.
 *
 * The same shape as `effectivePower`, and for the same reason: recomputed on
 * every read, so nothing has to be invalidated.
 */
export function effectiveKeywords(state: GameState, instance: CardInstance): Keyword[] {
  const printed = requireDefinition(state, instance.definitionId).keywords ?? [];
  // Off the battlefield a permanent has only what is printed on it: an
  // until-end-of-turn grant is cleared by the zone change, and an anthem
  // reaches nothing outside play.
  if (instance.zone !== "battlefield") return [...printed];

  const all = new Set<Keyword>(printed);
  for (const keyword of instance.grantedKeywords) all.add(keyword);
  for (const buff of buffsReaching(state, instance)) {
    for (const keyword of buff.grants ?? []) all.add(keyword);
  }
  return [...all];
}

/** Convenience for the common single-keyword question. */
export function hasKeyword(state: GameState, instance: CardInstance, keyword: Keyword): boolean {
  return effectiveKeywords(state, instance).includes(keyword);
}

/**
 * Every triggered ability this permanent has right now - printed, and handed to
 * it for the turn by something like Root Manipulation.
 *
 * **Nothing may read `CardDefinition.triggeredAbilities` directly**, for exactly
 * the reason nothing may read the printed keyword list: the moment an ability
 * can be granted, the printed list is a stale answer, and the failure is silent
 * - the card panel shows the granted ability and combat simply never fires it.
 *
 * Off the battlefield only the printed abilities apply. That is not a shortcut:
 * an until-end-of-turn grant is cleared by the zone change anyway, so this is
 * the same answer arrived at sooner, and it keeps every fire site that reads a
 * card in hand or graveyard behaving as it always did.
 */
export function effectiveTriggers(state: GameState, instance: CardInstance): TriggeredAbility[] {
  const printed = requireDefinition(state, instance.definitionId).triggeredAbilities ?? [];
  if (instance.zone !== "battlefield" || instance.grantedTriggers.length === 0) return printed;
  return [...printed, ...instance.grantedTriggers];
}

/** A creature's power including +1/+1 counters, any until-end-of-turn bonus, and any anthem effects - use this instead of reading `CardDefinition.power` directly wherever combat or state-based actions care about a creature's current stats. */
export function effectivePower(state: GameState, instance: CardInstance): number {
  const def = requireDefinition(state, instance.definitionId);
  return (
    (def.power ?? 0) + instance.plusOneCounters + instance.temporaryPowerBonus + staticBuffFor(state, instance).power
  );
}

/**
 * A creature's toughness including +1/+1 counters, any until-end-of-turn
 * bonus, and any anthem effects - see effectivePower.
 *
 * The bonus is signed, so this is what makes "-N/-N" removal work: the result
 * can legitimately reach 0 or below, and the existing state-based action in
 * sba.ts kills the creature without needing a destroy effect at all.
 */
export function effectiveToughness(state: GameState, instance: CardInstance): number {
  const def = requireDefinition(state, instance.definitionId);
  return (
    (def.toughness ?? 0) +
    instance.plusOneCounters +
    instance.temporaryToughnessBonus +
    staticBuffFor(state, instance).toughness
  );
}
