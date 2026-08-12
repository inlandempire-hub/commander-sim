import type {
  CardDefinition,
  CardInstance,
  Effect,
  GameState,
  StackObject,
  StackTarget,
  TriggerCondition,
  TriggeredAbility,
} from "./types.js";
import { cardName, findInstance, moveCard, requireDefinition } from "./state.js";
import { meetsBoardCondition } from "./conditions.js";
import { resolveAmounts } from "./x.js";

/**
 * The two ways an object arrives somewhere and may set triggers off: onto the
 * stack, and onto the battlefield.
 *
 * They live together in their own module purely to keep the import graph
 * acyclic. `stack.ts` has to call `applyEffect`, and `effects.ts` now has to put
 * cards onto the battlefield (reanimation, tutoring a land into play) - so if
 * either primitive stayed in `stack.ts` the two files would import each other.
 */

/**
 * Whether a permanent that would enter tapped gets to enter untapped instead.
 *
 * Only ever consulted for a card that carries `entersTappedUnless`; everything
 * else enters tapped exactly as `entersTapped` says. Returning false is the
 * safe direction - a tapland that enters tapped when it should not is a minor
 * annoyance, where one entering untapped is a free card.
 *
 * The permanent itself is excluded from the count, because this is asked with
 * it already on the battlefield - see the note at the call site.
 */
function entersUntapped(state: GameState, instance: CardInstance, def: CardDefinition): boolean {
  if (!def.entersTappedUnless) return false;
  return meetsBoardCondition(
    state,
    instance.controllerId,
    def.entersTappedUnless,
    instance.instanceId,
  );
}

export function pushOntoStack(
  state: GameState,
  sourceInstanceId: string,
  controllerId: string,
  effect: Effect,
  targets: StackTarget[],
  isPermanentSpell: boolean,
  cantBeCountered = false,
): StackObject {
  const obj: StackObject = {
    id: `s${state.nextStackObjectId++}`,
    sourceInstanceId,
    controllerId,
    effect,
    targets,
    isPermanentSpell,
    cantBeCountered,
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
  // Either the card says so on its face, or whatever put it here said so (a
  // ramp spell fetching a land onto the battlefield tapped). Not exclusive:
  // a land that enters tapped anyway still enters tapped when fetched.
  //
  // The condition is checked with the permanent already on the battlefield,
  // which is why "two or more *other* lands" says other - counting itself would
  // make Deathcap Glade untapped off a single land, one turn too early.
  if (options.tapped || (def.entersTapped && !entersUntapped(state, instance, def))) {
    instance.tapped = true;
  }

  // Triggers printed on the permanent that just arrived.
  for (const trigger of def.triggeredAbilities ?? []) {
    if (trigger.event === "enters-battlefield") {
      pushTrigger(state, instance.instanceId, instance.controllerId, trigger);
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
  fireWatchers(state, "permanent-enters", describeSubject(state, instance, def));

  // A land arriving is also a landfall event. Landfall is a watcher event in
  // its own right rather than a `permanent-enters` with `watchFor: {type:
  // "Land"}`, because it is also fired by `playLand` - which puts a land onto
  // the battlefield without going through here.
  if (def.types.includes("Land")) fireLandfall(state, instance.controllerId);
}

/**
 * What a watcher gets to look at.
 *
 * Captured as a plain record rather than read off the `CardInstance` at scan
 * time, because a death is scanned *after* the card has left the battlefield -
 * and `moveCard` clears its counters on the way out, so "did it have a +1/+1
 * counter on it" is a question that can only be answered before the move.
 */
export interface TriggerSubject {
  instanceId: string;
  controllerId: string;
  def: CardDefinition;
  hadCounters: boolean;
  isToken: boolean;
}

export function describeSubject(
  state: GameState,
  instance: CardInstance,
  def?: CardDefinition,
): TriggerSubject {
  const definition = def ?? requireDefinition(state, instance.definitionId);
  return {
    instanceId: instance.instanceId,
    controllerId: instance.controllerId,
    def: definition,
    hadCounters: instance.plusOneCounters > 0,
    isToken: definition.isToken === true,
  };
}

/**
 * Every permanent on the table gets to see one event happen to one other
 * permanent, and fires if it was watching for that.
 *
 * Both watcher events share this so they cannot drift apart: "whenever a
 * creature you control enters" and "whenever a creature you control dies" mean
 * the same thing by "you control" and by "creature", and a second copy of the
 * loop would be a second place for that to be got wrong.
 *
 * `alsoSelf` exists because a dying permanent is no longer on the battlefield
 * to be scanned. Blood Artist ("this creature or another creature dies") and
 * Meltstrider Eulogist ("a creature you control ... dies", which does not say
 * another) both watch their own deaths, so the dying card is offered its own
 * triggers explicitly.
 */
export function fireWatchers(
  state: GameState,
  event: "permanent-enters" | "permanent-dies",
  subject: TriggerSubject,
  alsoSelf?: CardInstance,
): void {
  const watchers: CardInstance[] = [];
  for (const player of state.players) watchers.push(...player.battlefield);
  if (alsoSelf) watchers.push(alsoSelf);

  for (const watcher of watchers) {
    const watcherDef = requireDefinition(state, watcher.definitionId);
    for (const trigger of watcherDef.triggeredAbilities ?? []) {
      if (trigger.event !== event) continue;
      if (!matchesWatchFor(trigger.watchFor, subject, watcher.controllerId)) continue;
      if (watcher.instanceId === subject.instanceId && !trigger.includesSelf) continue;
      if ((trigger.watches ?? "controller") === "controller" && watcher.controllerId !== subject.controllerId) {
        continue;
      }
      pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger);
    }
  }
}

/**
 * "Whenever a land enters" - fired both by a land played for the turn and by
 * one put onto the battlefield some other way (a fetchland, a ramp spell).
 *
 * `watches` decides whose lands count. It used to be hardcoded to the
 * controller's, which is right for every card that says "a land *you control*
 * enters" and silently wrong for Lifegift, which says "a land enters" and
 * should see an opponent's fetchland too.
 */
export function fireLandfall(state: GameState, landControllerId: string): void {
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      const watcherDef = requireDefinition(state, watcher.definitionId);
      for (const trigger of watcherDef.triggeredAbilities ?? []) {
        if (trigger.event !== "landfall") continue;
        if ((trigger.watches ?? "controller") === "controller" && watcher.controllerId !== landControllerId) {
          continue;
        }
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger);
      }
    }
  }
}

/**
 * Whether the permanent the event happened to is the kind a watcher is looking
 * for.
 *
 * This used to be a single hard-coded "is it a creature?" gate above the loop,
 * which quietly meant no card could ever watch anything else.
 */
export function matchesWatchFor(
  watchFor: TriggeredAbility["watchFor"],
  subject: TriggerSubject,
  /**
   * Who controls the permanent doing the watching, needed only by
   * `controlledBy`. Optional so the card-text renderer can ask "would this
   * trigger see that card?" without inventing a controller; a filter that
   * needs one and is not given one simply does not match.
   */
  watcherControllerId?: string,
): boolean {
  if (!watchFor) return true;
  if (watchFor.type && !subject.def.types.includes(watchFor.type)) return false;
  if (watchFor.subtype && !(subject.def.subtypes ?? []).includes(watchFor.subtype)) return false;
  if (watchFor.withCounter && !subject.hadCounters) return false;
  if (watchFor.nontoken && subject.isToken) return false;
  if (watchFor.controlledBy) {
    if (!watcherControllerId) return false;
    const mine = subject.controllerId === watcherControllerId;
    if (watchFor.controlledBy === "you" && !mine) return false;
    if (watchFor.controlledBy === "opponent" && mine) return false;
  }
  return true;
}

/**
 * Puts a triggered ability on the stack, carrying the two things that make a
 * trigger more than an effect: its "you may", and its intervening-if.
 *
 * Every site that fires a trigger goes through here rather than calling
 * `pushOntoStack` directly, so no event can quietly forget to check the
 * condition - which is the shape of bug that would show up as a card working
 * everywhere except the one place its trigger was fired from.
 */
export function pushTrigger(
  state: GameState,
  sourceInstanceId: string,
  controllerId: string,
  trigger: TriggeredAbility,
): StackObject | null {
  // Rule 603.4, first check: an intervening-if that is false right now means
  // the ability never goes on the stack at all.
  if (trigger.onlyIf && !triggerConditionMet(state, controllerId, trigger.onlyIf)) return null;

  /*
   * A trigger printed on a card with {X} in its cost refers to the value
   * announced when that card was cast - The Meathook Massacre's "each creature
   * gets -X/-X". The card is on the battlefield by now and the spell is long
   * gone, so the value is read off the permanent itself.
   *
   * Done here rather than at resolution because this is the single door every
   * fire site goes through, and because it keeps the substitution in exactly
   * one shape: by the time anything downstream sees the effect, X is a number.
   */
  const chosenX = findInstance(state, sourceInstanceId)?.instance.chosenX ?? 0;
  const effect = resolveAmounts(trigger.effect, chosenX);

  const obj = pushOntoStack(state, sourceInstanceId, controllerId, effect, [], false);
  if (trigger.optional) {
    obj.optional = true;
    obj.prompt = `${cardName(state, sourceInstanceId)}: ${describeOptionalEffect(trigger.effect)}`;
  }
  if (trigger.onlyIf) obj.onlyIf = trigger.onlyIf;
  return obj;
}

/** Rule 603.4's condition, checked when the trigger fires and again when it resolves. */
export function triggerConditionMet(
  state: GameState,
  controllerId: string,
  condition: TriggerCondition,
): boolean {
  switch (condition.kind) {
    case "creature-died-this-turn":
      return state.creatureDeathsThisTurn > 0;
    case "not":
      return !meetsBoardCondition(state, controllerId, condition.condition);
  }
}

/**
 * The question a "you may" asks, in the card's own words.
 *
 * Written here rather than in the client's `cardText` renderer for the same
 * reason `describeSearch` is: the engine is what knows a choice is pending, and
 * a prompt built at the point of asking cannot fall out of step with what
 * saying yes will actually do.
 */
function describeOptionalEffect(effect: Effect): string {
  switch (effect.kind) {
    case "draw":
      return effect.amount === 1 ? "draw a card?" : `draw ${effect.amount} cards?`;
    case "gainLife":
      return `gain ${effect.amount} life?`;
    case "addCounter":
      return effect.amount === 1 ? "put a +1/+1 counter on it?" : `put ${effect.amount} +1/+1 counters on it?`;
    default:
      return "use this ability?";
  }
}
