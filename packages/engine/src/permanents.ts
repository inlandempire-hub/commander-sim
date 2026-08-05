import type {
  CardDefinition,
  CardInstance,
  Effect,
  GameState,
  StackObject,
  StackTarget,
  TriggeredAbility,
} from "./types.js";
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
  enteredBattlefield(state, instance, options);
  return instance;
}

/**
 * Everything that happens because a permanent is now on the battlefield, split
 * out from `putOntoBattlefield` so a token can share it.
 *
 * A token is created directly in the battlefield array rather than moved into
 * it, so it never went through `putOntoBattlefield` and quietly skipped all of
 * this: its own enters-the-battlefield trigger, and - once watchers existed -
 * every other permanent's. A token entering the battlefield is an ordinary
 * creature entering the battlefield as far as the rules are concerned, and
 * three Soldier tokens should gain three life beside a Soul Warden.
 */
export function enteredBattlefield(
  state: GameState,
  instance: CardInstance,
  options: { tapped?: boolean } = {},
): void {
  const def = requireDefinition(state, instance.definitionId);
  if (def.keywords?.includes("Haste")) instance.summoningSickness = false;
  if (options.tapped) instance.tapped = true;

  // Triggers printed on the permanent that just arrived.
  for (const trigger of def.triggeredAbilities ?? []) {
    if (trigger.event === "enters-battlefield") {
      pushOntoStack(state, instance.instanceId, instance.controllerId, trigger.effect, [], false);
    }
  }

  /*
   * Triggers printed on permanents that were already here, watching for
   * something to arrive - the "Whenever another creature you control enters"
   * family. The same shape as landfall, which scans the battlefield rather
   * than the card that moved.
   *
   * The new permanent is already in its controller's battlefield array by this
   * point, so it is in this scan too: `includesSelf` is what decides whether
   * its own arrival sets its own ability off. Every card of this shape says
   * "another" except Kor Celebrant, which says "this creature or another".
   */
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      const watcherDef = requireDefinition(state, watcher.definitionId);
      for (const trigger of watcherDef.triggeredAbilities ?? []) {
        if (trigger.event !== "permanent-enters") continue;
        if (!matchesWatchFor(trigger.watchFor, def)) continue;
        if (watcher.instanceId === instance.instanceId && !trigger.includesSelf) continue;
        if ((trigger.watches ?? "controller") === "controller" && watcher.controllerId !== instance.controllerId) {
          continue;
        }
        pushOntoStack(state, watcher.instanceId, watcher.controllerId, trigger.effect, [], false);
      }
    }
  }
}

/**
 * Whether an arriving permanent is the kind a watcher is looking for.
 *
 * This used to be a single hard-coded "is it a creature?" gate above the loop,
 * which quietly meant no card could ever watch anything else.
 */
export function matchesWatchFor(
  watchFor: TriggeredAbility["watchFor"],
  def: CardDefinition,
): boolean {
  if (!watchFor) return true;
  if (watchFor.type && !def.types.includes(watchFor.type)) return false;
  if (watchFor.subtype && !(def.subtypes ?? []).includes(watchFor.subtype)) return false;
  return true;
}
