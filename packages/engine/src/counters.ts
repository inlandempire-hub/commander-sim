import type { CardInstance, GameState } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";

/**
 * The total bonus this creature is getting from other permanents its
 * controller has in play - the "anthem"/"lord" pattern (see
 * CardDefinition.staticBuff).
 *
 * Recomputed on every read rather than cached, which is the whole reason this
 * can stay simple: nothing has to be invalidated when a permanent enters or
 * leaves, because there is no stored value to go stale. Fine at this board
 * size; revisit if profiling ever says otherwise.
 */
function staticBuffFor(state: GameState, instance: CardInstance): { power: number; toughness: number } {
  const total = { power: 0, toughness: 0 };
  if (instance.zone !== "battlefield") return total;

  const controller = requirePlayer(state, instance.controllerId);
  const def = requireDefinition(state, instance.definitionId);

  for (const other of controller.battlefield) {
    if (other.instanceId === instance.instanceId) continue; // "other creatures you control"
    const buff = state.cardDefinitions[other.definitionId]?.staticBuff;
    if (!buff) continue;
    if (buff.subtype && !def.subtypes?.includes(buff.subtype)) continue;
    total.power += buff.power;
    total.toughness += buff.toughness;
  }
  return total;
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
