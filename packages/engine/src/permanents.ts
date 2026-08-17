import type {
  CardDefinition,
  CardInstance,
  ChosenOnEntry,
  EnterChoice,
  Keyword,
  Effect,
  GameState,
  StackObject,
  StackTarget,
  TriggerCondition,
  TriggeredAbility,
} from "./types.js";
import { cardName, findInstance, log, moveCard, requireDefinition, requirePlayer } from "./state.js";
import { meetsBoardCondition } from "./conditions.js";
import { effectiveTriggers, hasKeyword } from "./counters.js";
import { resolveAmounts } from "./x.js";
import { legalTargetsFor, targetCountOf, targetSelectorOf } from "./targeting.js";

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
  options: { tapped?: boolean; attackingPlayerId?: string } = {},
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
/**
 * "Nonbasic lands your opponents control enter tapped." - Archon of Emeria.
 *
 * Asked of everybody else's battlefield rather than of the land's own card,
 * which is what makes it the first rule here that reaches across the table. The
 * Archon's own controller is unaffected - the card says "your opponents", and a
 * symmetrical version would be a materially worse card than the one printed.
 */
function entersTappedByOpponentsRule(
  state: GameState,
  instance: CardInstance,
  def: CardDefinition,
): boolean {
  if (!def.types.includes("Land")) return false;
  if (def.supertypes?.includes("Basic")) return false;
  return state.players.some(
    (player) =>
      player.id !== instance.controllerId &&
      player.battlefield.some(
        (permanent) =>
          state.cardDefinitions[permanent.definitionId]?.staticRules?.opponentsNonbasicLandsEnterTapped,
      ),
  );
}

/**
 * Moves a permanent from one player's battlefield to another's.
 *
 * The single door for every control change, and it has to move the instance
 * between the two arrays rather than only rewriting `controllerId`: nearly
 * everything in this engine reads a player's board by walking
 * `player.battlefield`, so a creature whose id said one thing and whose array
 * said another would attack for one player and block for the other.
 *
 * Summoning sickness comes back on, because the new controller has not
 * controlled it continuously since their turn began (rule 302.6). That is not
 * an inconvenience to be worked around - it is the reason Zealous Conscripts
 * grants haste in the same sentence, and the reason the card is a combo piece
 * rather than a Threaten.
 */
export function moveControl(state: GameState, instance: CardInstance, toPlayerId: string): void {
  const from = state.players.find((player) =>
    player.battlefield.some((candidate) => candidate.instanceId === instance.instanceId),
  );
  if (!from) return;
  if (from.id === toPlayerId) return;
  from.battlefield = from.battlefield.filter((candidate) => candidate.instanceId !== instance.instanceId);
  instance.controllerId = toPlayerId;
  instance.summoningSickness = true;
  if (hasKeyword(state, instance, "Haste")) instance.summoningSickness = false;
  requirePlayer(state, toPlayerId).battlefield.push(instance);
}

export function enteredBattlefield(
  state: GameState,
  instance: CardInstance,
  options: { tapped?: boolean; attackingPlayerId?: string } = {},
): void {
  const def = requireDefinition(state, instance.definitionId);
  /*
   * "...onto the battlefield tapped and attacking."
   *
   * Joining a combat already in progress, which nothing else in the engine
   * does. Deliberately *not* routed through declareAttackers: a creature put
   * onto the battlefield attacking was never declared as an attacker (rule
   * 508.3b), so no attack trigger fires for it - not its own, and not another
   * permanent watching. Winota making a Human that makes more Winota triggers
   * is the shape that rule exists to stop, and this engine gets it for free by
   * writing straight into the map.
   *
   * Summoning sickness is irrelevant to a creature that is already attacking,
   * but it is cleared anyway so the board does not draw a creature as unable
   * to act while it is in the middle of combat.
   */
  /*
   * "As this permanent enters, choose ..." - the game stops and asks.
   *
   * Asked *after* the permanent is on the battlefield rather than as it enters,
   * which is a real simplification: the rules make this a replacement applied
   * on the way in. It is indistinguishable in play for every card in this pool,
   * because nothing here reads the choice during the arrival itself - and the
   * same shortcut is already taken by `payLifeToEnterUntapped`, which enters
   * tapped and then untaps.
   */
  if (def.enterChoice) {
    state.pendingEnterChoice = {
      instanceId: instance.instanceId,
      playerId: instance.controllerId,
      choice: def.enterChoice,
      prompt: describeEnterChoice(def.enterChoice),
    };
  }
  /*
   * "for each token you control that **entered this turn**" - Ocelot Pride.
   *
   * Stamped here because this is the single door every arrival goes through, so
   * a permanent that reaches the battlefield by a route nobody thought about
   * still answers the question correctly.
   */
  instance.enteredOnTurn = state.turnNumber;
  if (options.attackingPlayerId) {
    state.attackers[instance.instanceId] = options.attackingPlayerId;
    instance.summoningSickness = false;
  }
  if (hasKeyword(state, instance, "Haste")) instance.summoningSickness = false;
  // Either the card says so on its face, or whatever put it here said so (a
  // ramp spell fetching a land onto the battlefield tapped). Not exclusive:
  // a land that enters tapped anyway still enters tapped when fetched.
  //
  // The condition is checked with the permanent already on the battlefield,
  // which is why "two or more *other* lands" says other - counting itself would
  // make Deathcap Glade untapped off a single land, one turn too early.
  if (
    options.tapped ||
    (def.entersTapped && !entersUntapped(state, instance, def)) ||
    entersTappedByOpponentsRule(state, instance, def)
  ) {
    instance.tapped = true;
  }

  /*
   * The shockland question: "as this land enters, you may pay N life; if you
   * don't, it enters tapped."
   *
   * Asked here, with the land already tapped, and answering yes untaps it -
   * see `payLifeToEnterUntapped` for why that shortcut is sound and where it
   * would stop being so. The question is skipped outright when the life is not
   * there to pay: paying down to exactly 0 is legal and loses you the game, so
   * an engine that offered it would be offering a way to concede by accident.
   */
  if (def.entersTappedUnlessPayLife !== undefined && !options.tapped) {
    instance.tapped = true;
    const controller = requirePlayer(state, instance.controllerId);
    if (controller.life > def.entersTappedUnlessPayLife) {
      state.pendingConfirmation = {
        playerId: instance.controllerId,
        sourceInstanceId: instance.instanceId,
        prompt: `${def.name}: pay ${def.entersTappedUnlessPayLife} life so it enters untapped?`,
        object: {
          id: `enters-${instance.instanceId}`,
          sourceInstanceId: instance.instanceId,
          controllerId: instance.controllerId,
          effect: { kind: "payLifeToEnterUntapped", life: def.entersTappedUnlessPayLife },
          targets: [],
          isPermanentSpell: false,
        },
      };
    }
  }

  /*
   * A planeswalker arrives with its printed loyalty. Before the triggers,
   * because an ability that reads its own loyalty must not see zero.
   */
  if (def.loyalty !== undefined && instance.loyalty === 0) {
    instance.loyalty = def.loyalty;
  }

  /*
   * A bestowed creature card arrives attached to the creature it was cast onto,
   * and is an Aura rather than a creature while it stays there - see `typesOf`.
   * If the intended host has gone in the meantime, it simply arrives as the
   * creature it also is, which is what the real rule says.
   */
  if (instance.bestowTarget) {
    const host = findInstance(state, instance.bestowTarget);
    if (host && host.instance.zone === "battlefield") {
      instance.attachedTo = instance.bestowTarget;
      instance.bestowed = true;
    }
    instance.bestowTarget = undefined;
  }

  /*
   * Devour: "as this enters, you may sacrifice any number of creatures. It
   * enters with that many +1/+1 counters on it."
   *
   * Asked *as* it arrives, so the counters are on it before anything else looks
   * - which is why this is here and not a trigger. The multiplier is carried on
   * the choice because the creatures are in a graveyard by the time it is
   * answered.
   */
  if (def.devour !== undefined) {
    const controller = requirePlayer(state, instance.controllerId);
    const fodder = controller.battlefield.filter(
      (c) =>
        c.instanceId !== instance.instanceId &&
        requireDefinition(state, c.definitionId).types.includes("Creature"),
    );
    if (fodder.length > 0) {
      state.pendingCardChoices.push({
        playerId: instance.controllerId,
        effectControllerId: instance.controllerId,
        sourceInstanceId: instance.instanceId,
        candidateInstanceIds: fodder.map((c) => c.instanceId),
        min: 0,
        max: fodder.length,
        mode: "sacrifice",
        prompt: `${def.name}: devour ${def.devour} - you may sacrifice any number of creatures`,
        multiplier: def.devour,
      });
    }
  }

  // Triggers printed on the permanent that just arrived.
  for (const trigger of effectiveTriggers(state, instance)) {
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
  /**
   * How many +1/+1 counters it was carrying, for The Ozolith - which does not
   * merely want to know *that* there were some, it wants to move them.
   *
   * Captured for the same reason `hadCounters` is, and the reason is sharper
   * here: a boolean read after the fact would be wrong, where a count read
   * after the fact is always zero.
   */
  counters: number;
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
    counters: instance.plusOneCounters,
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
  event:
    | "permanent-enters"
    | "permanent-dies"
    | "spell-cast"
    | "permanent-sacrificed"
    | "permanent-attacks"
    | "leaves-battlefield",
  subject: TriggerSubject,
  alsoSelf?: CardInstance,
): void {
  const watchers: CardInstance[] = [];
  for (const player of state.players) watchers.push(...player.battlefield);
  if (alsoSelf) watchers.push(alsoSelf);

  for (const watcher of watchers) {
    for (const trigger of effectiveTriggers(state, watcher)) {
      if (trigger.event !== event) continue;
      if (!matchesWatchFor(trigger.watchFor, subject, watcher.controllerId)) continue;
      // "Whenever equipped creature dies" - only the one this Equipment is on.
      if (trigger.watchFor?.attachedToThis && watcher.attachedTo !== subject.instanceId) continue;
      if (watcher.instanceId === subject.instanceId && !trigger.includesSelf) continue;
      if ((trigger.watches ?? "controller") === "controller" && watcher.controllerId !== subject.controllerId) {
        continue;
      }
      /*
       * The counters the subject was carrying, handed on as the event's
       * number - The Ozolith's "put **those** counters on it". Zero for every
       * other event and every other card, which is exactly what
       * `event-amount` means when the event carries nothing.
       */
      pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger, subject.counters);
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
      for (const trigger of effectiveTriggers(state, watcher)) {
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
  if (watchFor.type) {
    // One type or a list of them - "an instant or sorcery spell" is one
    // question with two acceptable answers, not two separate filters.
    const wanted = Array.isArray(watchFor.type) ? watchFor.type : [watchFor.type];
    if (!wanted.some((type) => subject.def.types.includes(type))) return false;
  }
  if (watchFor.subtype) {
    const wanted = Array.isArray(watchFor.subtype) ? watchFor.subtype : [watchFor.subtype];
    if (!wanted.some((subtype) => (subject.def.subtypes ?? []).includes(subtype))) return false;
  }
  if (watchFor.excludeSubtype) {
    // Winota's "a non-Human creature you control". Any one of the listed
    // subtypes disqualifies the subject.
    const barred = Array.isArray(watchFor.excludeSubtype) ? watchFor.excludeSubtype : [watchFor.excludeSubtype];
    if (barred.some((subtype) => (subject.def.subtypes ?? []).includes(subtype))) return false;
  }
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
  /**
   * The number this event carried, for a trigger whose effect says "that
   * many" - how much damage Hornet Nest was just dealt. Substituted here
   * alongside X, so nothing downstream ever sees an unresolved marker.
   */
  eventAmount?: number,
): StackObject | null {
  /*
   * "If a creature attacking causes a triggered ability of a permanent you
   * control to trigger, that ability triggers an additional time." - Windcrag
   * Siege's Mardu half.
   *
   * Applied here because this is the single door every fire site goes through,
   * so anything added later that fires an attack trigger is covered without
   * knowing the card exists. Each copy goes through the whole of `pushTriggerOnce`
   * - including its own targeting - because two instances of an ability really
   * are two abilities, each pointed separately.
   */
  const first = pushTriggerOnce(state, sourceInstanceId, controllerId, trigger, eventAmount);
  for (let i = 0; i < extraAttackTriggers(state, controllerId, trigger); i++) {
    pushTriggerOnce(state, sourceInstanceId, controllerId, trigger, eventAmount);
  }
  return first;
}

/** How many *additional* times an attack-caused trigger goes on the stack. */
function extraAttackTriggers(state: GameState, controllerId: string, trigger: TriggeredAbility): number {
  if (trigger.event !== "attacks" && trigger.event !== "permanent-attacks") return 0;
  // "a triggered ability of a permanent **you control**" - the doubler and the
  // ability have to share a controller.
  return requirePlayer(state, controllerId).battlefield.filter((permanent) => {
    const mode = state.cardDefinitions[permanent.definitionId]?.staticRules?.doublesAttackTriggersWhenMode;
    return mode !== undefined && permanent.chosenOnEntry?.mode === mode;
  }).length;
}

function pushTriggerOnce(
  state: GameState,
  sourceInstanceId: string,
  controllerId: string,
  trigger: TriggeredAbility,
  eventAmount?: number,
): StackObject | null {
  // Rule 603.4, first check: an intervening-if that is false right now means
  // the ability never goes on the stack at all.
  if (trigger.onlyIf && !triggerConditionMet(state, controllerId, trigger.onlyIf, sourceInstanceId)) return null;

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
  const effect = resolveAmounts(trigger.effect, { x: chosenX, eventAmount });

  /*
   * A trigger that targets is pointed at something before it goes on the
   * stack, not as it resolves (rule 603.3d) - so it is parked here and pushed
   * by `chooseTriggerTarget` once answered.
   *
   * With no legal target the ability is simply removed from the stack and
   * never happens, which is the real rule and not a shortcut. With exactly one
   * it is taken without asking: the player has no decision to make, and a
   * picker offering a single button is noise rather than a choice.
   */
  const selector = targetSelectorOf(effect);
  if (selector) {
    const candidates = legalTargetsFor(state, selector, controllerId, sourceInstanceId);
    const { min } = targetCountOf(selector, chosenX);

    /*
     * "Return **up to one** target creature card" - Moseo. A trigger that may
     * legally point at nothing still resolves, so it is only removed from the
     * stack when the card genuinely demanded a target and there is none.
     */
    if (candidates.length === 0 && min > 0) {
      log(state, `${cardName(state, sourceInstanceId)} has no legal target and does nothing`);
      return null;
    }
    const object: StackObject = {
      id: `t${state.nextStackObjectId++}`,
      sourceInstanceId,
      controllerId,
      effect,
      targets: [],
      isPermanentSpell: false,
    };
    if (trigger.optional) {
      object.optional = true;
      object.prompt = `${cardName(state, sourceInstanceId)}: ${describeOptionalEffect(trigger.effect)}`;
    }
    if (trigger.onlyIf) object.onlyIf = trigger.onlyIf;

    if (candidates.length === 1) {
      object.targets = [candidates[0]!];
      state.stack.push(object);
      return object;
    }
    const { max } = targetCountOf(selector, chosenX);
    state.pendingTargetChoices.push({
      playerId: controllerId,
      sourceInstanceId,
      candidates,
      prompt:
        max > 1
          ? `${cardName(state, sourceInstanceId)}: choose up to ${max} targets`
          : `${cardName(state, sourceInstanceId)}: choose a target`,
      min,
      max,
      object,
    });
    return null;
  }

  const obj = pushOntoStack(state, sourceInstanceId, controllerId, effect, [], false);
  if (trigger.optional) {
    obj.optional = true;
    obj.prompt = `${cardName(state, sourceInstanceId)}: ${describeOptionalEffect(trigger.effect)}`;
  }
  if (trigger.onlyIf) obj.onlyIf = trigger.onlyIf;
  return obj;
}

/**
 * Points a parked trigger at something and puts it on the stack.
 *
 * Re-checked against the pending entry rather than trusted, the same way
 * `resolveSearch` and `resolveConfirmation` are: a client cannot answer a
 * question that was asked of somebody else, and cannot name a target the
 * engine did not offer.
 */
export function chooseTriggerTarget(state: GameState, playerId: string, target: StackTarget): void {
  chooseTriggerTargets(state, playerId, [target]);
}

/**
 * Points a parked trigger at one *or more* things and puts it on the stack.
 *
 * The plural is the real entry point and the singular above is a wrapper, so
 * every caller that only ever names one target - which is every card in the
 * pool but Raph & Leo - is unchanged.
 *
 * Everything is re-checked here rather than trusted: how many were named, that
 * each is a target the engine actually offered, and that no target was named
 * twice. A client cannot answer a question asked of somebody else, cannot
 * invent a target, and cannot untap the same creature twice by sending it
 * along with itself.
 */
export function chooseTriggerTargets(state: GameState, playerId: string, targets: StackTarget[]): void {
  const pending = state.pendingTargetChoices[0];
  if (!pending) throw new Error("No trigger is waiting for a target");
  if (pending.playerId !== playerId) throw new Error(`The choice belongs to ${pending.playerId}`);
  if (targets.length < pending.min || targets.length > pending.max) {
    throw new Error(
      pending.min === pending.max
        ? `This ability needs exactly ${pending.min} target${pending.min === 1 ? "" : "s"}`
        : `This ability needs between ${pending.min} and ${pending.max} targets`,
    );
  }

  const chosen: StackTarget[] = [];
  for (const target of targets) {
    const candidate = pending.candidates.find((c) => sameTarget(c, target));
    if (!candidate) throw new Error("That is not a legal target for this ability");
    if (chosen.some((already) => sameTarget(already, candidate))) {
      throw new Error("The same target cannot be chosen twice");
    }
    chosen.push(candidate);
  }

  state.pendingTargetChoices.shift();
  pending.object.targets = chosen;
  state.stack.push(pending.object);
}

function sameTarget(a: StackTarget, b: StackTarget): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "player" && b.kind === "player") return a.playerId === b.playerId;
  if (a.kind === "card" && b.kind === "card") return a.instanceId === b.instanceId;
  if (a.kind === "spell" && b.kind === "spell") return a.stackObjectId === b.stackObjectId;
  return false;
}

/** Rule 603.4's condition, checked when the trigger fires and again when it resolves. */
export function triggerConditionMet(
  state: GameState,
  controllerId: string,
  condition: TriggerCondition,
  /**
   * The permanent the trigger is printed on. Only `source-has-counters` needs
   * it - every other condition asks about the board rather than about the card
   * - so it is optional, and a condition that needs it and is not given one
   * answers false rather than guessing.
   */
  sourceInstanceId?: string,
): boolean {
  switch (condition.kind) {
    case "creature-died-this-turn":
      return state.creatureDeathsThisTurn > 0;
    case "gained-life-this-turn":
      // A tally rather than a comparison against a remembered total: gaining 4
      // and losing 4 still counts as having gained life this turn.
      return requirePlayer(state, controllerId).lifeGainedThisTurn > 0;
    case "source-has-counters": {
      if (!sourceInstanceId) return false;
      const found = findInstance(state, sourceInstanceId);
      // Off the battlefield it has no counters, which is also the honest
      // answer: The Ozolith in a graveyard is holding nothing.
      if (!found || found.instance.zone !== "battlefield") return false;
      return found.instance.plusOneCounters > 0;
    }
    case "source-not-exerted": {
      if (!sourceInstanceId) return false;
      const found = findInstance(state, sourceInstanceId);
      if (!found) return false;
      return !found.instance.exerted;
    }
    case "chosen-mode": {
      if (!sourceInstanceId) return false;
      const found = findInstance(state, sourceInstanceId);
      // A permanent that was never asked has no mode, so neither half is live.
      return found?.instance.chosenOnEntry?.mode === condition.mode;
    }
    case "first-combat-phase":
      return state.combatPhasesThisTurn <= 1;
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
    /*
     * "You may **exert** it as it attacks." Combat Celebrant's whole ability is
     * a sequence whose first step is the exert, and the exert is what the
     * player is being asked about - the untap and the extra phase are what
     * saying yes buys, not part of the question.
     */
    case "sequence":
      return effect.effects[0]?.kind === "exertSelf" ? "exert it?" : "use this ability?";
    case "exertSelf":
      return "exert it?";
    default:
      return "use this ability?";
  }
}

/** "first strike, vigilance, and lifelink" - a printed list, with its conjunction. */
function listAndWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** The printed wording of what is being chosen, for the client's prompt. */
export function describeEnterChoice(choice: EnterChoice): string {
  switch (choice.kind) {
    case "creature-type":
      return "choose a creature type";
    case "number":
      return "choose a number";
    case "basic-land-type":
      return "choose a basic land type";
    case "keywords":
      /*
       * "first strike, vigilance, **and** lifelink" - the card prints a list
       * with a conjunction, and a bare comma-join read as an incomplete
       * sentence that had lost its last word.
       */
      return `choose ${choice.count === 2 ? "two" : String(choice.count)} abilities from among ${listAndWords(
        choice.from.map((k: Keyword) => k.toLowerCase()),
      )}`;
    case "mode":
      return `choose ${choice.options.join(" or ")}`;
  }
}

/**
 * Answers the choice a permanent asked as it entered.
 *
 * The answer is checked against what was actually asked rather than trusted -
 * a client cannot name a keyword Greymond does not offer, or a mode Windcrag
 * Siege never printed.
 */
export function resolveEnterChoice(
  state: GameState,
  playerId: string,
  answer: ChosenOnEntry,
): void {
  const pending = state.pendingEnterChoice;
  if (!pending) throw new Error("No permanent is waiting on a choice");
  if (pending.playerId !== playerId) throw new Error(`That choice belongs to ${pending.playerId}`);

  const found = findInstance(state, pending.instanceId);
  const choice = pending.choice;

  if (choice.kind === "number") {
    if (answer.number === undefined || !Number.isInteger(answer.number) || answer.number < 0) {
      throw new Error("A whole number must be chosen");
    }
  } else if (choice.kind === "creature-type") {
    if (!answer.creatureType) throw new Error("A creature type must be chosen");
  } else if (choice.kind === "basic-land-type") {
    if (!answer.basicLandType || !BASIC_LAND_TYPES.includes(answer.basicLandType)) {
      throw new Error("A basic land type must be chosen");
    }
  } else if (choice.kind === "keywords") {
    const picked = answer.keywords ?? [];
    if (picked.length !== choice.count) throw new Error(`Exactly ${choice.count} abilities must be chosen`);
    if (picked.some((k: Keyword) => !choice.from.includes(k))) throw new Error("That ability was not on offer");
  } else if (choice.kind === "mode") {
    if (!answer.mode || !choice.options.includes(answer.mode)) throw new Error("That mode was not on offer");
  }

  // The permanent may already have left - killed in response is not possible
  // here (nothing has priority yet), but it costs nothing to be safe, and the
  // pending state must be cleared either way or the game stalls.
  if (found) found.instance.chosenOnEntry = answer;
  state.pendingEnterChoice = null;
  log(state, `${playerId} chose ${describeChosen(answer)}`);
}

/** The five basic land types, for validating Multiversal Passage's answer. */
const BASIC_LAND_TYPES = ["Plains", "Island", "Swamp", "Mountain", "Forest"];

function describeChosen(answer: ChosenOnEntry): string {
  if (answer.creatureType) return answer.creatureType;
  if (answer.basicLandType) return answer.basicLandType;
  if (answer.number !== undefined) return String(answer.number);
  if (answer.keywords?.length) return answer.keywords.join(" and ").toLowerCase();
  return answer.mode ?? "nothing";
}
