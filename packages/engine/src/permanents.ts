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
import { effectiveTriggers, hasKeyword, hasCreatureType } from "./counters.js";
import { evaluateAmount } from "./amounts.js";
import { resolveAmounts } from "./x.js";
import { legalTargetsFor, targetCountOf, targetSelectorOf } from "./targeting.js";
import { advanceSaga } from "./effects.js";

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
 * Puts a copy of a spell on the stack - Storm, Sword of Wealth and Power.
 *
 * A copy is not a card, so nothing moves zones and no cast triggers fire: it
 * carries the same effect and (possibly new) targets, resolves like the spell it
 * copies, and ceases to exist afterwards. `isCopy` is what keeps
 * `finishResolution` from moving the card `sourceInstanceId` names, which for a
 * Storm copy is the original spell still on the stack beneath it.
 */
export function pushSpellCopyOntoStack(
  state: GameState,
  sourceInstanceId: string,
  controllerId: string,
  effect: Effect,
  targets: StackTarget[],
): StackObject {
  const obj: StackObject = {
    id: `s${state.nextStackObjectId++}`,
    sourceInstanceId,
    controllerId,
    effect,
    targets,
    isPermanentSpell: false,
    isCopy: true,
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
  options: {
    tapped?: boolean;
    attackingPlayerId?: string;
    /**
     * Set on the second pass, once Mox Diamond's question has been answered.
     *
     * Without it the replacement would apply again to the very arrival it just
     * permitted, and the card would ask for a land forever.
     */
    replacementSettled?: boolean;
    /** Which half of a Room was paid for - the door it arrives with unlocked. */
    roomDoor?: "front" | "back";
    /** This permanent is entering because a spell resolved (it was cast), which Containment Priest checks. */
    wasCast?: boolean;
  } = {},
): CardInstance {
  const found = findInstance(state, instanceId);
  const def = found ? state.cardDefinitions[found.instance.definitionId] : undefined;
  /*
   * "If a nontoken creature would enter and it wasn't cast, exile it instead." -
   * Containment Priest. Reanimation, blinks and Warp World all reach here without
   * `wasCast`, which is exactly what the hatebear is meant to catch (its own
   * controller's included).
   */
  if (
    found &&
    def &&
    !options.wasCast &&
    !def.isToken &&
    !found.instance.isTokenCopy &&
    def.types.includes("Creature") &&
    state.players.some((p) => p.battlefield.some((c) => state.cardDefinitions[c.definitionId]?.staticRules?.exileNoncastCreatures))
  ) {
    log(state, `${def.name} was not cast and is exiled (Containment Priest)`);
    return moveCard(state, instanceId, "exile");
  }
  const discard = def?.entersOnlyIfYouDiscard;
  if (found && discard && !options.replacementSettled) {
    /*
     * "If this artifact **would enter**, you may discard a land card instead."
     *
     * Asked before it moves anywhere. The card stays where it is - on the stack,
     * mid-resolution - and `resolveCardChoice` finishes the job either way. The
     * game cannot proceed past an open card choice, so it is never left there.
     */
    const owner = requirePlayer(state, found.instance.ownerId);
    const candidates = owner.hand.filter((card) =>
      state.cardDefinitions[card.definitionId]?.types.includes(discard.cardType),
    );
    if (candidates.length === 0) {
      // Nothing to discard is the same as declining, and the card says where it
      // goes: its owner's graveyard, never the battlefield.
      log(state, `${def?.name} has no ${discard.cardType.toLowerCase()} to discard and is put into the graveyard`);
      return moveCard(state, instanceId, "graveyard");
    }
    state.pendingCardChoices.push({
      playerId: found.instance.ownerId,
      sourceInstanceId: instanceId,
      prompt: `${def?.name}: discard a ${discard.cardType.toLowerCase()} card to put it onto the battlefield?`,
      candidateInstanceIds: candidates.map((c) => c.instanceId),
      min: 0,
      max: 1,
      mode: "discard-to-enter",
      effectControllerId: found.instance.ownerId,
    });
    return found.instance;
  }

  const instance = moveCard(state, instanceId, "battlefield");
  /*
   * A Room arrives with the door you paid for open and the other shut. Set
   * before `enteredBattlefield`, because that is what fires its triggers - and
   * a trigger on a locked door must not be one of them.
   */
  if (options.roomDoor) instance.unlockedDoors = [options.roomDoor];
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
  const isNonbasicLand = def.types.includes("Land") && !def.supertypes?.includes("Basic");
  const isCreature = def.types.includes("Creature");
  if (!isNonbasicLand && !isCreature) return false;
  return state.players.some(
    (player) =>
      player.id !== instance.controllerId &&
      player.battlefield.some((permanent) => {
        const rules = state.cardDefinitions[permanent.definitionId]?.staticRules;
        return (isNonbasicLand && rules?.opponentsNonbasicLandsEnterTapped) || (isCreature && rules?.opponentsCreaturesEnterTapped);
      }),
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

/**
 * Taps a permanent, and lets it notice.
 *
 * The one door for "this becomes tapped", which is why it exists at all: three
 * places set `instance.tapped` - paying a tap cost, attacking without vigilance,
 * and regenerating - and City of Brass has to hurt its controller for all three.
 * A trigger taught to one of them would be a land that pays for mana honestly and
 * lets an attack through for free.
 *
 * Already-tapped permanents are left alone rather than triggering again: "becomes
 * tapped" is a change of state, not a state.
 *
 * Note what does *not* come through here: a permanent entering the battlefield
 * tapped. It was never untapped, so it never became tapped (and City of Brass
 * would otherwise deal a point of damage on arrival, which the card does not do).
 */
export function tapPermanent(state: GameState, instance: CardInstance): void {
  if (instance.tapped) return;
  instance.tapped = true;
  for (const trigger of effectiveTriggers(state, instance)) {
    if (trigger.event !== "becomes-tapped") continue;
    pushTrigger(state, instance.instanceId, instance.controllerId, trigger);
  }
}

export function enteredBattlefield(
  state: GameState,
  instance: CardInstance,
  options: { tapped?: boolean; attackingPlayerId?: string } = {},
): void {
  const def = requireDefinition(state, instance.definitionId);
  // "This artifact enters under the control of an opponent of your choice." -
  // Pendant of Prosperity. Handed to the owner's first opponent as it arrives.
  if (def.entersUnderOpponentControl) {
    const opponent = state.players.find((p) => p.id !== instance.ownerId && !p.hasLost);
    if (opponent) moveControl(state, instance, opponent.id);
  }
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
  /*
   * Dash: "it gains haste, and it's returned from the battlefield to its owner's
   * hand at the beginning of the next end step."
   *
   * Both halves are set up here, as it arrives, because that is when the
   * permanent exists to have them - and the return is scheduled the same way
   * every other "at the beginning of the next end step" is, so a creature dashed
   * during an end step goes home on the *next* one rather than instantly.
   */
  if (instance.dashed) {
    if (!instance.grantedKeywords.includes("Haste")) instance.grantedKeywords.push("Haste");
    state.delayedTriggers.push({
      instanceIds: [instance.instanceId],
      controllerId: instance.controllerId,
      sourceInstanceId: instance.instanceId,
      action: "return-to-hand",
      readyOnTurn: state.turnNumber + (state.phase === "ending" ? 1 : 0),
    });
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
  /*
   * "Enters with a +1/+1 counter on it for each other Human you control."
   *
   * Applied here, before any trigger fires, because that is what "enters with"
   * means: the creature is never on the battlefield at its printed size, so a
   * removal spell in response to its arrival is answering the big one.
   */
  if (def.entersWithCounters !== undefined) {
    const extra = evaluateAmount(
      state,
      instance.controllerId,
      def.entersWithCounters,
      "entersWithCounters",
      instance.instanceId,
    );
    if (extra > 0) instance.plusOneCounters += extra;
  }
  // "Fading N" - enters with N fade counters, held as other-counters.
  if (def.fading !== undefined) instance.otherCounters += def.fading;
  // A Saga's first chapter fires as it enters, with its first lore counter.
  if (def.saga) advanceSaga(state, instance.instanceId, instance.controllerId);
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
   * An Aura arrives attached to the permanent it was cast onto. If that host has
   * gone in the meantime, it still enters unattached and a state-based action
   * puts it into the graveyard - which is the real rule, not a shortcut.
   */
  if (def.enchant && instance.enchantTarget) {
    const host = findInstance(state, instance.enchantTarget);
    if (host && host.instance.zone === "battlefield") instance.attachedTo = instance.enchantTarget;
    instance.enchantTarget = undefined;
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

  // Triggers printed on the permanent that just arrived. Elesh Norn doubles the
  // controller's own enter triggers and suppresses opponents' entirely.
  const selfMult = enterTriggerMultiplier(state, instance.controllerId);
  for (const trigger of effectiveTriggers(state, instance)) {
    if (trigger.event === "enters-battlefield") {
      for (let i = 0; i < selfMult; i++) pushTrigger(state, instance.instanceId, instance.controllerId, trigger);
    }
  }

  /*
   * Offspring: "when this creature enters, create a 1/1 token copy of it." Only
   * when the Offspring cost was paid; the token itself never sets this, so it
   * makes no copy of its own. Put on the stack like the printed ETB triggers
   * above so it resolves in step with them.
   */
  // Prototype: the creature arrives with the prototype P/T (Steel Seraph).
  if (instance.prototypePaid && def.prototype) {
    instance.prototypePaid = false;
    instance.basePowerOverride = def.prototype.power;
    instance.baseToughnessOverride = def.prototype.toughness;
  }
  if (instance.offspringPaid) {
    instance.offspringPaid = false;
    pushOntoStack(
      state,
      instance.instanceId,
      instance.controllerId,
      { kind: "createCopyToken", of: "self", ptOverride: { power: 1, toughness: 1 } },
      [],
      false,
    );
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
  /**
   * Whether it was tapped at the moment of the event - "an artifact or creature
   * an opponent controls enters **untapped**", Charismatic Conqueror.
   *
   * Captured for the same reason `counters` is: read afterwards it would be the
   * wrong answer, because the very trigger this feeds goes on to tap it.
   */
  tapped: boolean;
  /**
   * `spell-cast` only: whether the spell was cast without spending mana.
   *
   * Captured from the stack object as the event fires, for the same reason
   * `tapped` is captured: by the time anything reads it the spell may have
   * resolved and gone.
   */
  freeSpell?: boolean;
  /** Whether the permanent was cast from its owner's hand - Chainer's "if you didn't cast it from your hand". */
  wasCastFromHand?: boolean;
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
    tapped: instance.tapped,
    wasCastFromHand: instance.wasCastFromHand === true,
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
/**
 * How many times an enter-caused trigger fires for `controllerId`, under Elesh
 * Norn. An opponent's Elesh Norn suppresses it to 0 (a "can't trigger" beats a
 * doubling); your own doubles it to 2; otherwise it fires once.
 */
export function enterTriggerMultiplier(state: GameState, controllerId: string): number {
  let opponentHas = false;
  let youHave = false;
  for (const player of state.players) {
    const has = player.battlefield.some((c) => state.cardDefinitions[c.definitionId]?.staticRules?.eleshNornEntersDoubler);
    if (!has) continue;
    if (player.id === controllerId) youHave = true;
    else opponentHas = true;
  }
  return opponentHas ? 0 : youHave ? 2 : 1;
}

export function fireWatchers(
  state: GameState,
  event:
    | "permanent-enters"
    | "permanent-dies"
    | "spell-cast"
    | "permanent-sacrificed"
    | "permanent-attacks"
    | "land-played"
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
      /*
       * "their **first** noncreature spell each turn" - Esper Sentinel. Counted
       * off the caster's own list of what they have cast this turn, which
       * `castSpell` appends to before firing this, so the spell in hand is the
       * one being counted: first means the count is exactly one.
       */
      if (trigger.onlyFirstNoncreatureEachTurn) {
        const caster = state.players.find((p) => p.id === subject.controllerId);
        const noncreature = (caster?.spellTypesCastThisTurn ?? []).filter(
          (types) => !types.includes("Creature"),
        ).length;
        if (noncreature !== 1) continue;
      }
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
      /*
       * The subject's controller rides along for `spell-cast`, because Esper
       * Sentinel taxes *the player who cast the spell* and nothing else on the
       * stack object could name them. Harmless for every other watcher event:
       * an ability that reads no player target ignores it.
       */
      // Elesh Norn: a permanent entering doubles the watcher-controller's own
      // enter-caused triggers and suppresses opponents'. Only for the enter
      // event - a death or an attack is not "a permanent entering".
      const times = event === "permanent-enters" ? enterTriggerMultiplier(state, watcher.controllerId) : 1;
      for (let i = 0; i < times; i++) {
        pushTrigger(
          state,
          watcher.instanceId,
          watcher.controllerId,
          trigger,
          subject.counters,
          event === "spell-cast" ? subject.controllerId : undefined,
          /*
           * "**That permanent**" - the thing the event happened to, which
           * Charismatic Conqueror needs to point at. Only for arrivals: a
           * permanent that died or left has no instance worth acting on, and a
           * spell is not a permanent at all.
           */
          event === "permanent-enters" ? subject.instanceId : undefined,
        );
      }
    }
  }
}

/**
 * "Whenever a player draws a card" (Spiteful Visions) and "whenever an opponent
 * draws a card" (Scrawling Crawler).
 *
 * Fired from `drawCard`, the one door every draw goes through, once per card
 * actually drawn - so Howling Mine's extra draw and a hard-cast draw spell both
 * set it off. The drawing player rides along as the trigger's player target, so
 * "**that player** loses 1 life" and "deals 1 damage to **that player**" land on
 * whoever drew, exactly as Ragavan's combat-damage trigger reads its victim.
 *
 * `watchFor.controlledBy` reads relative to the watcher's controller: "you" is
 * the watcher's own draws, "opponent" is Scrawling Crawler's, and omitted is
 * every player's.
 */
export function fireCardDrawn(state: GameState, drawingPlayerId: string): void {
  for (const player of state.players) {
    for (const watcher of [...player.battlefield]) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "card-drawn") continue;
        const scope = trigger.watchFor?.controlledBy;
        if (scope === "you" && drawingPlayerId !== watcher.controllerId) continue;
        if (scope === "opponent" && drawingPlayerId === watcher.controllerId) continue;
        // "Whenever you draw your **second** card each turn" - Gixian Puppeteer.
        // drawCard has already counted this draw, so the count is inclusive.
        if (trigger.nthDrawThisTurn !== undefined) {
          const drawer = state.players.find((p) => p.id === drawingPlayerId);
          if ((drawer?.cardsDrawnThisTurn ?? 0) !== trigger.nthDrawThisTurn) continue;
        }
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger, undefined, drawingPlayerId);
      }
    }
  }
}

/**
 * "Whenever an opponent discards a card" - Sangromancer. Fired from the one
 * discard door (`discardCard`) so every route into a discard - the discard
 * effect, a random discard, an activation cost, the hand-size cleanup - sets it
 * off. The discarding player rides along as the trigger's player target.
 */
/**
 * "Whenever an opponent loses the game" - Share the Spoils. Fired once as a
 * player loses, for every watcher whose controller is not the loser.
 */
export function fireOpponentLost(state: GameState, loserId: string): void {
  for (const player of state.players) {
    for (const watcher of [...player.battlefield]) {
      if (watcher.controllerId === loserId) continue;
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "opponent-lost") continue;
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger);
      }
    }
  }
}

export function fireCardDiscarded(state: GameState, discardingPlayerId: string): void {
  for (const player of state.players) {
    for (const watcher of [...player.battlefield]) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "card-discarded") continue;
        const scope = trigger.watchFor?.controlledBy;
        if (scope === "you" && discardingPlayerId !== watcher.controllerId) continue;
        if (scope === "opponent" && discardingPlayerId === watcher.controllerId) continue;
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger, undefined, discardingPlayerId);
      }
    }
  }
}

/**
 * "Whenever a creature you control deals combat damage to a player."
 *
 * The trigger is pushed with the *damaging creature* as its source, not the
 * watcher, so "put that many +1/+1 counters on it" and any other self-referring
 * effect lands on the attacker that dealt the damage. `amount` is the damage
 * dealt, handed on as the event's number. `watches: "controller"` (the default)
 * means "a creature you control"; "any" watches every player's creatures.
 */
export function fireCombatDamageToPlayer(
  state: GameState,
  damagerInstanceId: string,
  damagerControllerId: string,
  amount: number,
  /** Which player was hit, passed on to the trigger for the cards that read it. */
  defendingPlayerId?: string,
): void {
  if (amount <= 0) return;
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "combat-damage-to-player") continue;
        if (trigger.watchFor?.attachedToThis) {
          // "Whenever equipped creature deals combat damage" - Zephyr Boots. The
          // watcher is the Equipment; it fires when the creature it is on is the
          // one that connected.
          if (watcher.attachedTo !== damagerInstanceId) continue;
        } else {
          // No `watches` means "this creature" (self, like the `attacks` event);
          // "controller" means "a creature you control"; "any" watches everyone's.
          const scope = trigger.watches;
          if (scope === undefined && watcher.instanceId !== damagerInstanceId) continue;
          if (scope === "controller" && watcher.controllerId !== damagerControllerId) continue;
        }
        // Felix Five-Boots: when the creature dealing the damage and the
        // triggering permanent share a controller ("a creature you control ...
        // a permanent you control"), each Felix that player controls makes the
        // ability trigger one additional time.
        let times = 1;
        if (watcher.controllerId === damagerControllerId) {
          const owner = state.players.find((p) => p.id === watcher.controllerId);
          if (owner) {
            times += owner.battlefield.filter(
              (c) => requireDefinition(state, c.definitionId).staticRules?.extraCombatDamageToPlayerTrigger,
            ).length;
          }
        }
        for (let i = 0; i < times; i++) {
          pushTrigger(state, damagerInstanceId, watcher.controllerId, trigger, amount, defendingPlayerId);
        }
      }
    }
  }
}

/**
 * "Whenever a creature you control deals combat damage during your turn, put
 * that many +1/+1 counters on it." - Quilled Greatwurm.
 *
 * Fired once per damaging creature with the total it dealt this step, after the
 * whole combat has been worked out. "During your turn" is the guard at the top:
 * blockers deal their damage on the attacker's turn, so a defending player's
 * Greatwurm never sees it. Felix's doubling is deliberately left off this one -
 * it doubles triggers from combat damage *to a player*, and this event is wider.
 */
export function fireCombatDamageDealt(
  state: GameState,
  damagerInstanceId: string,
  damagerControllerId: string,
  amount: number,
): void {
  if (amount <= 0) return;
  if (state.players[state.activePlayerIndex]?.id !== damagerControllerId) return;
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "combat-damage-dealt") continue;
        const scope = trigger.watches;
        if (scope === undefined && watcher.instanceId !== damagerInstanceId) continue;
        if (scope === "controller" && watcher.controllerId !== damagerControllerId) continue;
        pushTrigger(state, damagerInstanceId, watcher.controllerId, trigger, amount);
      }
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
/**
 * "When you play another land" - City of Traitors.
 *
 * Fired only by `playLand`, which is the whole point of it being its own event
 * rather than a landfall trigger: a land that merely arrives - fetched, ramped,
 * returned - is not a land that was played. `fireWatchers` handles the "another"
 * for it, the same way it does for every other watcher.
 */
/**
 * "Whenever one or more creatures you control deal combat damage to a player" -
 * the once-per-step aggregate twin of `fireCombatDamageToPlayer` (which fires the
 * per-creature "combat-damage-to-player" event inline as each creature connects).
 *
 * Called from the combat damage step with everything that connected this
 * sub-step, so the "one or more" half fires exactly once however many creatures
 * got through - the difference between one Treasure and three.
 */
export function fireCreaturesDealtCombatDamage(
  state: GameState,
  hits: Array<{ attackerInstanceId: string; defendingPlayerId: string }>,
): void {
  /*
   * "One or more creatures **you control**" - once per controller who connected,
   * not once per creature. A set of controllers rather than a loop over the hits
   * is the whole implementation of "one or more".
   */
  const controllers = new Set<string>();
  for (const { attackerInstanceId } of hits) {
    const found = findInstance(state, attackerInstanceId);
    if (found) controllers.add(found.instance.controllerId);
  }
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "creatures-dealt-combat-damage") continue;
        if (!controllers.has(watcher.controllerId)) continue;
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger);
      }
    }
  }
}

/**
 * "Whenever you attack with **one or more** ... creatures" - fired once for the
 * whole declaration, however many were declared.
 *
 * The twin of `fireCombatDamageToPlayer`'s second half, and the same distinction
 * it draws: `permanent-attacks` beside this fires per attacker, which is what
 * Winota says, and would give Anim Pakal a fresh batch of Gnomes for every extra
 * creature in the swing.
 *
 * Membership is decided over the whole list rather than one subject at a time,
 * which is exactly why this cannot go through `fireWatchers`: "did any of these
 * qualify" is a different question from "does this one qualify", and only the
 * first can fire once.
 */
export function fireCreaturesAttack(
  state: GameState,
  attackingPlayerId: string,
  attackerInstanceIds: string[],
): void {
  if (attackerInstanceIds.length === 0) return;
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "creatures-attack") continue;
        // "Whenever **you** attack" - every card of this shape watches its own
        // controller's swing, which is what the default `watches` means.
        if ((trigger.watches ?? "controller") === "controller" && watcher.controllerId !== attackingPlayerId) {
          continue;
        }
        const qualifies = attackerInstanceIds.some((instanceId) => {
          const found = findInstance(state, instanceId);
          if (!found) return false;
          /*
           * "this creature and/or your commander" - Ainok Strike Leader, which
           * names two particular permanents rather than a class of them. Not a
           * `watchFor`, because that reads printed characteristics and neither
           * "this one" nor "mine" is one.
           */
          if (trigger.attackersIncludeSelfOrCommander) {
            if (instanceId === watcher.instanceId) return true;
            return found.instance.isCommander && found.instance.controllerId === watcher.controllerId;
          }
          return matchesWatchFor(trigger.watchFor, describeSubject(state, found.instance), watcher.controllerId);
        });
        if (!qualifies) continue;
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger);
      }
    }
  }
}

/**
 * "Whenever an opponent searches their library" - Archivist of Oghma.
 *
 * Fired from the one place a search is set up, so a tutor added later sets it
 * off without knowing this card exists - the same posture `tapPermanent` and
 * `gainLife` take for their events.
 *
 * Deliberately not fired by Winota's "look at the top six": looking is not
 * searching, which is why one of them can be answered without a shuffle.
 */
/**
 * "Whenever **one or more** other Cats you control die" - fired once for a batch
 * of simultaneous deaths, however many there were.
 *
 * The third event of this shape, after `creatures-attack` and
 * `creatures-dealt-combat-damage`, and it decides membership over the whole list
 * for the same reason they do: "did any of these qualify" is a different
 * question from "does this one qualify", and only the first can fire once.
 *
 * `includesSelf` reads naturally here: Ajani says "**other** Cats", and a
 * watcher that died in the same batch is excluded unless the card says it counts
 * itself.
 */
export function fireCreaturesDie(state: GameState, dead: TriggerSubject[]): void {
  if (dead.length === 0) return;
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "creatures-die") continue;
        const qualifies = dead.some((subject) => {
          if (subject.instanceId === watcher.instanceId && !trigger.includesSelf) return false;
          if ((trigger.watches ?? "controller") === "controller" && watcher.controllerId !== subject.controllerId) {
            return false;
          }
          return matchesWatchFor(trigger.watchFor, subject, watcher.controllerId);
        });
        if (!qualifies) continue;
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger);
      }
    }
  }
}

/**
 * "Whenever your Ring-bearer **becomes blocked by a creature**" - fired once per
 * blocker, which is what "by a creature" says: two blockers on one attacker is
 * two triggers.
 *
 * A *self* event on the attacker, like `becomes-tapped` and
 * `combat-damage-to-player` - so it needs no `watchFor` at all - and the blocker
 * rides along as a card target, the way every event's subject does.
 */
export function fireBecomesBlocked(state: GameState, attackerInstanceId: string, blockerInstanceId: string): void {
  const found = findInstance(state, attackerInstanceId);
  if (!found) return;
  for (const trigger of effectiveTriggers(state, found.instance)) {
    if (trigger.event !== "becomes-blocked") continue;
    pushTrigger(
      state,
      attackerInstanceId,
      found.instance.controllerId,
      trigger,
      undefined,
      undefined,
      blockerInstanceId,
    );
  }
}

export function fireLibrarySearched(state: GameState, searcherId: string): void {
  for (const player of state.players) {
    for (const watcher of player.battlefield) {
      for (const trigger of effectiveTriggers(state, watcher)) {
        if (trigger.event !== "library-searched") continue;
        /*
         * "an **opponent** searches their library" - whose search it has to be,
         * read off `watchFor.controlledBy`, the same field `spell-cast` uses for
         * whose spell it has to be. The subject of both events is a player
         * rather than a permanent, which is why neither goes through
         * `matchesWatchFor`: that one is handed a permanent to look at.
         *
         * Omitted means anybody's, which is what `controlledBy` means everywhere.
         */
        const mine = searcherId === watcher.controllerId;
        // "**each** player" vs "you", the same first gate every watcher event
        // has, so a card written here reads like a card written anywhere else.
        if ((trigger.watches ?? "controller") === "controller" && !mine) continue;
        const wants = trigger.watchFor?.controlledBy;
        if (wants === "you" && !mine) continue;
        if (wants === "opponent" && mine) continue;
        pushTrigger(state, watcher.instanceId, watcher.controllerId, trigger);
      }
    }
  }
}

export function fireLandPlayed(state: GameState, played: CardInstance): void {
  fireWatchers(state, "land-played", describeSubject(state, played));
}

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
  // "another creature you control **with power 2 or less** enters" - Mentor of
  // the Meek. Read off printed power, like every other enter-time check here.
  if (watchFor.maxPower !== undefined && (subject.def.power ?? 0) > watchFor.maxPower) return false;
  /*
   * "an artifact or creature an opponent controls enters **untapped**" -
   * Charismatic Conqueror. Read off the permanent as the event happens, which
   * for an arrival is after every enters-tapped rule has had its say.
   */
  if (watchFor.untapped && subject.tapped) return false;
  /*
   * "if no mana was spent to cast it" - Boromir. Read off the spell rather than
   * checked twice as an intervening-if, because a spell's cost cannot change
   * once it has been cast: the answer is the same either way.
   */
  if (watchFor.freeSpell && !subject.freeSpell) return false;
  if (watchFor.nontoken && subject.isToken) return false;
  // "if you didn't cast it from your hand" - Chainer, on a creature that arrived
  // by any route other than a hand cast (reanimation, a token, a graveyard cast).
  if (watchFor.notCastFromHand && subject.wasCastFromHand) return false;
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
  /**
   * The player this event happened to - "Ragavan deals combat damage to **a
   * player**", whose library the ability then exiles from.
   *
   * Handed on as a target rather than as a second kind of payload, because a
   * player the ability acts on is exactly what a target is, and every effect
   * downstream already knows how to read one.
   */
  eventPlayerId?: string,
  /**
   * The permanent this event happened to - "**that permanent**", the one
   * Charismatic Conqueror asks its controller to tap.
   *
   * Carried exactly as `eventPlayerId` is, and for the same reason: it is the
   * event's own payload wearing the shape every effect downstream already
   * reads. Nothing was chosen, so hexproof never enters into it.
   */
  eventInstanceId?: string,
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
  const first = pushTriggerOnce(
    state,
    sourceInstanceId,
    controllerId,
    trigger,
    eventAmount,
    eventPlayerId,
    eventInstanceId,
  );
  for (let i = 0; i < extraAttackTriggers(state, controllerId, trigger); i++) {
    pushTriggerOnce(state, sourceInstanceId, controllerId, trigger, eventAmount, eventPlayerId, eventInstanceId);
  }
  for (let i = 0; i < extraRoamingThroneTriggers(state, controllerId, sourceInstanceId); i++) {
    pushTriggerOnce(state, sourceInstanceId, controllerId, trigger, eventAmount, eventPlayerId, eventInstanceId);
  }
  return first;
}

/**
 * How many *additional* times a trigger of a creature you control fires because
 * of a Roaming Throne naming that creature's type - "another creature you
 * control of the chosen type."
 */
function extraRoamingThroneTriggers(state: GameState, controllerId: string, sourceInstanceId: string): number {
  const source = findInstance(state, sourceInstanceId);
  if (!source || !requireDefinition(state, source.instance.definitionId).types.includes("Creature")) return 0;
  return requirePlayer(state, controllerId).battlefield.filter((permanent) => {
    if (permanent.instanceId === sourceInstanceId) return false; // "another creature"
    const def = requireDefinition(state, permanent.definitionId);
    if (!def.staticRules?.roamingThroneChosenTypeDoubler) return false;
    const type = permanent.chosenOnEntry?.creatureType;
    return type !== undefined && hasCreatureType(state, source.instance, type);
  }).length;
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
  eventPlayerId?: string,
  eventInstanceId?: string,
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
  let effect = resolveAmounts(trigger.effect, { x: chosenX, eventAmount });

  /*
   * A modal trigger's mode is chosen as it goes on the stack (rule 603.3c). No
   * UI to ask, so the engine takes the first mode - or, for Gala Greeters'
   * Alliance, the first mode not already taken on this source this turn, which
   * is what "hasn't been chosen this turn" means. Same documented posture the
   * search and edict effects take.
   */
  if (effect.kind === "modal") {
    const src = findInstance(state, sourceInstanceId)?.instance;
    const taken = src?.modesChosenThisTurn ?? [];
    const mode =
      (trigger.modalOncePerTurn ? effect.modes.find((m) => !taken.includes(m.label)) : undefined) ??
      effect.modes[0]!;
    if (src && trigger.modalOncePerTurn) src.modesChosenThisTurn.push(mode.label);
    effect = mode.effect;
  }

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

  /*
   * The player this happened to, carried as a target - "exile the top card of
   * **that player's** library". An untargeted trigger with a player attached is
   * not a targeted ability: nothing was chosen, and hexproof or shroud never
   * enter into it. It is the event's own payload wearing the shape every effect
   * downstream already reads.
   */
  const eventTargets: StackTarget[] = [
    ...(eventPlayerId ? [{ kind: "player" as const, playerId: eventPlayerId }] : []),
    ...(eventInstanceId ? [{ kind: "card" as const, instanceId: eventInstanceId }] : []),
  ];
  const obj = pushOntoStack(state, sourceInstanceId, controllerId, effect, eventTargets, false);
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
  /*
   * Deflecting Swat's object is already on the stack and is being edited in
   * place; every other pending choice holds an ability that has not been put
   * there yet. Pushing the first kind would put one spell on the stack twice.
   */
  if (!pending.retarget) state.stack.push(pending.object);
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
   * The permanent the trigger is printed on. Only the conditions that ask about
   * the card itself need it - `source-has-counters`, `source-not-exerted`,
   * `source-is-tapped` - so it is optional, and one that needs it and is not
   * given one answers false rather than guessing.
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
    /*
     * "if you control your commander" - Loyal Apprentice's lieutenant, and any
     * other board question an intervening-if wants to ask. One wrapper for both
     * directions, so a condition added for a tapland is available here the same
     * day.
     */
    case "board":
      return meetsBoardCondition(state, controllerId, condition.condition);
    /*
     * "if this artifact is tapped" - Mana Vault. A question about the permanent
     * printing the trigger, so it answers false without one, exactly as
     * `source-has-counters` does.
     */
    case "source-is-tapped": {
      if (!sourceInstanceId) return false;
      const found = findInstance(state, sourceInstanceId);
      return found?.instance.zone === "battlefield" && found.instance.tapped;
    }
    case "source-untapped": {
      // "if this artifact is **untapped**" - Howling Mine. The mirror of the
      // above, and an intervening-if for the same reason: tap the Mine in
      // response and the extra draw never happens.
      if (!sourceInstanceId) return false;
      const found = findInstance(state, sourceInstanceId);
      return found?.instance.zone === "battlefield" && !found.instance.tapped;
    }
    case "first-combat-phase":
      return state.combatPhasesThisTurn <= 1;
    case "not":
      return !meetsBoardCondition(state, controllerId, condition.condition);
    case "counters-or-hand-at-least": {
      // Either threshold on its own wins the game for the toad. Hand size is
      // asked first because it needs no source; the counters are read off the
      // trigger's own permanent, and every kind of counter counts.
      if (requirePlayer(state, controllerId).hand.length >= condition.count) return true;
      if (!sourceInstanceId) return false;
      const found = findInstance(state, sourceInstanceId);
      if (!found || found.instance.zone !== "battlefield") return false;
      return found.instance.plusOneCounters + found.instance.otherCounters >= condition.count;
    }
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
    case "card-name":
      return "choose a card name";
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
  } else if (choice.kind === "card-name") {
    if (!answer.cardName) throw new Error("A card name must be chosen");
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
