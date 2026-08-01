import type { CardInstance, Effect, GameState, StackObject, StackTarget } from "./types.js";
import { moveCard, requireDefinition } from "./state.js";

/**
 * The two ways an object arrives somewhere and may set triggers off: onto the
 * stack, and onto the battlefield.
 *
 * They live together in their own module purely to keep the import graph
 * acyclic. `stack.ts` has to call `applyEffect`, and `effects.ts` now has to put
 * cards onto the battlefield (reanimation, tutoring a land into play) - so if
 * either primitive stayed in `stack.ts` the two files would import each other.
 */

export function pushOntoStack(
  state: GameState,
  sourceInstanceId: string,
  controllerId: string,
  effect: Effect,
  targets: StackTarget[],
  isPermanentSpell: boolean,
): StackObject {
  const obj: StackObject = {
    id: `s${state.nextStackObjectId++}`,
    sourceInstanceId,
    controllerId,
    effect,
    targets,
    isPermanentSpell,
  };
  state.stack.push(obj);
  return obj;
}

/**
 * Puts a card onto the battlefield and fires its enters-the-battlefield
 * triggers. Used by a resolving permanent spell, by reanimation out of a
 * graveyard, and by a tutor that finds a land - all of which are genuinely the
 * same event, so none of them can accidentally skip the triggers.
 */
export function putOntoBattlefield(
  state: GameState,
  instanceId: string,
  options: { tapped?: boolean } = {},
): CardInstance {
  const instance = moveCard(state, instanceId, "battlefield");
  const def = requireDefinition(state, instance.definitionId);
  if (def.keywords?.includes("Haste")) instance.summoningSickness = false;
  if (options.tapped) instance.tapped = true;

  for (const trigger of def.triggeredAbilities ?? []) {
    if (trigger.event === "enters-battlefield") {
      pushOntoStack(state, instance.instanceId, instance.controllerId, trigger.effect, [], false);
    }
  }
  return instance;
}
