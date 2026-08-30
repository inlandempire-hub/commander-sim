import { castRestrictionProblem } from "./restrictions.js";
import type { CardDefinition, CardInstance, Effect, GameState, ManaCost, StackTarget } from "./types.js";
import { findInstance, log, moveCard, requireDefinition, requirePlayer } from "./state.js";
import {
  applyCommanderTax,
  canPayManaCostFromPool,
  manaValue,
  commanderCreatureTypes,
  payManaCostFor,
  spendablePool,
} from "./mana.js";
import { cardColors, controllerMeets } from "./conditions.js";
import { effectivePower, protectionFrom } from "./counters.js";
import { sacrificePermanent } from "./sba.js";
import { describeSubject, fireLandPlayed, fireWatchers, pushOntoStack, pushSpellCopyOntoStack, putOntoBattlefield } from "./permanents.js";
import { isValidTarget, legalTargetsFor, targetCountOf, targetSelectorOf, targetSelectorsOf } from "./targeting.js";
import { attemptWardPayments } from "./ward.js";
import { costWithX, requiresX, resolveAmounts } from "./x.js";

const PERMANENT_TYPES = new Set(["Creature", "Artifact", "Enchantment", "Planeswalker", "Battle", "Land"]);

/** Flash lets an otherwise sorcery-speed card (almost always a creature) be cast like an instant. */
function isSorcerySpeedOnly(def: CardDefinition): boolean {
  return !def.types.includes("Instant") && !(def.keywords?.includes("Flash") ?? false);
}

/**
 * "This spell costs {N} less to cast ..." - the one door for spell cost
 * reductions, used by the offer, the auto-tapper and the payment alike so they
 * cannot disagree. Reduces the generic part only, floored at zero (rule
 * 601.2f), so a coloured pip always survives.
 */
export function castCostReduction(
  state: GameState,
  playerId: string,
  def: CardDefinition,
  cost: ManaCost,
): ManaCost {
  let reduction = 0;
  const rule = def.costReduction;
  if (rule) {
    if (rule.per) {
      let count = 0;
      if (rule.per === "creatures-on-battlefield") {
        for (const p of state.players) {
          for (const c of p.battlefield) {
            if (requireDefinition(state, c.definitionId).types.includes("Creature")) count += 1;
          }
        }
      } else {
        const player = requirePlayer(state, playerId);
        count = player.graveyard.filter((c) => requireDefinition(state, c.definitionId).types.includes("Creature")).length;
      }
      reduction = rule.generic * count;
    } else if (!rule.onlyIf || controllerMeets(state, playerId, rule.onlyIf)) {
      reduction = rule.generic;
    }
  }
  // Static reducers on the caster's own battlefield - "White spells you cast cost
  // {1} less" (Pearl Medallion). One per matching permanent, by the spell's colour.
  for (const permanent of requirePlayer(state, playerId).battlefield) {
    const medallion = requireDefinition(state, permanent.definitionId).staticRules?.reduceControllerSpellsOfColor;
    if (medallion && cardColors(def).includes(medallion.color)) reduction += medallion.generic;
  }
  // "Noncreature spells cost {N} more" - Thalia. Symmetric: read off every
  // player's battlefield, and only for a noncreature spell.
  let tax = 0;
  if (!def.types.includes("Creature")) {
    for (const p of state.players) {
      for (const permanent of p.battlefield) {
        tax += requireDefinition(state, permanent.definitionId).staticRules?.taxNoncreatureSpells ?? 0;
      }
    }
  }
  // "Spells with the chosen name cost {N} more" - Disruptor Flute.
  for (const p of state.players) {
    for (const permanent of p.battlefield) {
      const flute = requireDefinition(state, permanent.definitionId).staticRules?.disruptorFluteTax;
      if (flute && permanent.chosenOnEntry?.cardName === def.name) tax += flute;
    }
  }
  if (reduction <= 0 && tax <= 0) return cost;
  return { ...cost, generic: Math.max(0, cost.generic - reduction + tax) };
}

/** Sorcery-speed casting requires: you're the active player, it's a main phase, and the stack is empty. */
export function canCastAtSorcerySpeed(state: GameState, playerId: string): boolean {
  const isMainPhase = state.phase === "precombat-main" || state.phase === "postcombat-main";
  return state.players[state.activePlayerIndex]?.id === playerId && isMainPhase && state.stack.length === 0;
}

export interface CastOptions {
  /** Cast the player's commander from the command zone (applies commander tax) instead of from hand. */
  fromCommandZone?: boolean;
  /**
   * Which mode of a "choose one" spell is being cast, as an index into its
   * `modal` effect's `modes`. Required for a modal spell and meaningless for
   * anything else. Modes are chosen as part of casting (rule 601.2b), which is
   * also why the targets passed alongside must be legal for *that* mode.
   */
  chosenMode?: number;
  /**
   * The value announced for {X}. Required for a card with {X} in its cost and
   * meaningless for anything else.
   *
   * Announced rather than inferred from the mana available: "cast it for as
   * much as I can afford" is a common play but it is not the only one, and a
   * player who wants to keep mana up for something else must be able to.
   */
  chosenX?: number;
  /**
   * Which half of a **Room** is being cast - "you may cast either half".
   *
   * Shares the face question with the modal double-faced cards and means
   * something different by the answer: an MDFC *becomes* the face you chose,
   * while a Room keeps both halves and merely starts with the one you paid for
   * unlocked.
   */
  face?: "front" | "back";
  /**
   * "X damage divided as you choose among up to two targets" - how much goes to
   * each, in the order the targets were named.
   *
   * Announced with the spell rather than settled on resolution, which is the
   * rule and is visible in play: kill one of the two in response and the damage
   * assigned to it is lost. Divided at resolution you would move it to the
   * survivor, which is a materially better card.
   *
   * Absent with one target, where there is nothing to divide.
   */
  damageSplit?: number[];
  /**
   * "You may cast this spell for its **dash** cost." - Ragavan.
   *
   * A decision made as the spell is cast and never afterwards, which is why it
   * rides here with the other announcements rather than being asked about on
   * resolution.
   */
  useDashCost?: boolean;
  /**
   * Which creature is being given up for an "as an additional cost, sacrifice a
   * creature" - Tend the Pests.
   *
   * Announced with the spell rather than asked for afterwards, because that is
   * when the cost is paid (rule 601.2h). It is also what makes the card's own
   * X knowable: the creature's power is read here, while it is still on the
   * battlefield.
   */
  sacrificeInstanceId?: string;
  /** Evoke: which card in hand is exiled to pay the alternative cost. */
  exileFromHandInstanceId?: string;
  /**
   * Take the card's alternative cost - "you may cast this spell without paying
   * its mana cost".
   *
   * Opt-in, because every printing of this shape is a "may" and paying the
   * mana is sometimes the better line: Deadly Rollick cast for {3}{B} leaves
   * the commander requirement alone.
   */
  useAlternativeCost?: boolean;
  /**
   * Cast this without paying its mana cost, for a reason that is not the
   * card's own alternative cost - Rishkar's Expertise granting it, or the far
   * side of suspend.
   *
   * Separate from `useAlternativeCost` because that one checks the card's own
   * condition and this one is granted from outside: a spell made free by
   * something else has no condition of its own to meet.
   */
  free?: boolean;
  /**
   * The player chose to cast this without paying, using an Omniscience-style
   * permanent they control. Validated against a permanent whose definition sets
   * `enablesFreeCastFromHand`; unlike `free`, which internal effects set, this
   * one is a player's choice and so is checked.
   */
  omniscienceFree?: boolean;
  /** How many cards to exile from the graveyard to pay for this spell's Delve. */
  delveCount?: number;
  /**
   * Cast this for its warp cost - Starwinder. Pays `def.warp.cost` in place of
   * the mana cost and marks the creature to be exiled at the next end step. Only
   * from hand; a warp-exiled card cast from exile later pays its ordinary cost
   * and takes none of this.
   */
  useWarp?: boolean;
  /** Cast for the prototype cost/size - Steel Seraph. */
  usePrototype?: boolean;
  /**
   * Pay the Offspring cost (Thundertrap Trainer) - an additional cost on top of
   * the mana cost that makes a 1/1 token copy of the creature as it enters.
   */
  payOffspring?: boolean;
  /** "You may pay an additional {1}{G} as you cast this spell." - the kicker on Urborg Repossession. */
  kicked?: boolean;
  /** The land discarded to retrace a permanent card from the graveyard - Six. */
  retraceDiscard?: string;
  /** Cast the card's Adventure half (Locthwain Scorn) rather than the card itself - Virtue of Persistence. */
  useAdventure?: boolean;
  /** Creatures tapped to help pay for a convoke spell - Pile On. Each pays {1} or one mana of its colour. */
  convokeCreatures?: string[];
  /**
   * Which creatures the +1/+1 counters come off to cast this from the graveyard
   * (Quilled Greatwurm) - one instance id per counter removed, so a creature
   * giving up two counters appears twice. Length must equal the card's
   * `castFromGraveyard.removeCounters`.
   */
  removeCounterFrom?: string[];
  /**
   * Cast this as a bestowed Aura for its bestow cost, attached to the creature
   * handed in as the target. It is still a creature card - it is simply not a
   * creature while it is attached to one.
   */
  bestowOnto?: string;
  /**
   * Skip the sorcery-speed check.
   *
   * Only suspend uses it: the card is cast as its last time counter is removed,
   * which happens in the upkeep - a step where a sorcery could never normally
   * be cast. The rules say to cast it then regardless, so the timing rule is
   * the thing that has to give.
   */
  ignoreTiming?: boolean;
}

/**
 * How many lands this player may play this turn.
 *
 * One, plus whatever their permanents grant. Read fresh every time rather than
 * being counted onto the player when a permanent arrives, so an Icetill
 * Explorer that dies mid-turn takes its extra drop with it - which is the rule,
 * and the alternative would need every removal spell to know about land drops.
 */
export function landDropsAllowed(state: GameState, playerId: string): number {
  const player = requirePlayer(state, playerId);
  let allowed = 1;
  for (const instance of player.battlefield) {
    allowed += state.cardDefinitions[instance.definitionId]?.staticRules?.extraLandDrops ?? 0;
  }
  // "Each player may play an additional land on each of their turns" - Rites of
  // Flourishing, a symmetric static read off whoever controls it.
  for (const p of state.players) {
    for (const instance of p.battlefield) {
      allowed += state.cardDefinitions[instance.definitionId]?.staticRules?.extraLandDropsAllPlayers ?? 0;
    }
  }
  return allowed;
}

/** "You may play lands from your graveyard" - Icetill Explorer's second line. */
export function canPlayLandsFromGraveyard(state: GameState, playerId: string): boolean {
  return requirePlayer(state, playerId).battlefield.some(
    (instance) => state.cardDefinitions[instance.definitionId]?.staticRules?.playLandsFromGraveyard === true,
  );
}

/**
 * Whether this player could pay the card's additional cost right now.
 *
 * Asked before a card is offered as playable, not only when it is cast. A spell
 * whose additional cost cannot be paid cannot be cast at all (rule 601.2f), so
 * a client that offered Tend the Pests with an empty board would be offering a
 * play the engine is about to refuse.
 */
export function canPayAdditionalCost(
  state: GameState,
  playerId: string,
  def: CardDefinition,
  chosenX = 0,
): boolean {
  const cost = def.additionalCost;
  if (!cost) return true;
  const player = requirePlayer(state, playerId);
  switch (cost.kind) {
    case "pay-life": {
      const amount = typeof cost.amount === "number" ? cost.amount : chosenX;
      // You may pay life only down to nothing, and paying to exactly 0 is legal
      // - it loses you the game to the usual state-based action, which is the
      // real rule and Toxic Deluge's real ceiling.
      return player.life >= amount;
    }
    case "sacrifice-creature":
      return player.battlefield.some((instance) =>
        state.cardDefinitions[instance.definitionId]?.types.includes("Creature"),
      );
  }
}

/** The modes of a "choose one" card, or undefined if it isn't modal. */
export function modesOf(def: CardDefinition): Array<{ label: string; effect: Effect }> | undefined {
  return def.castEffect?.kind === "modal" ? def.castEffect.modes : undefined;
}

/**
 * Casts a spell: validates timing and mana, pays the cost (including commander tax if applicable),
 * moves the card to the stack, and registers a stack object for its effect (or battlefield entry).
 */
export function castSpell(
  state: GameState,
  playerId: string,
  instanceId: string,
  targets: StackTarget[] = [],
  options: CastOptions = {},
): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }

  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;

  /*
   * "Until end of turn, you may cast that card" - Ragavan and Professional
   * Face-Breaker, the only way a card is cast from anywhere but a hand or the
   * command zone.
   *
   * The permission names the player as well as the card, which is what makes
   * Ragavan work at all: the card is exiled from the *defender's* library and
   * cast by Ragavan's controller, so ownership is deliberately not checked on
   * this path.
   */
  const fromExile = mayPlayFromExile(state, playerId, instance);
  /*
   * "...then you may cast it from exile on a later turn." - a warp-exiled card
   * is cast from exile for its ordinary cost, which is the one door into
   * `castSpell` that does not start in hand or the command zone. Only that card,
   * only cast normally: a warp cast itself and a command-zone cast go the usual
   * way.
   */
  const castingFromWarpExile =
    instance.zone === "exile" &&
    ((instance.warpedInExile === true && !options.useWarp) || instance.adventuredInExile === true) &&
    !options.fromCommandZone;
  const def0 = requireDefinition(state, instance.definitionId);
  const isYourTurn = state.players[state.activePlayerIndex]?.id === playerId;
  const def0IsPermanent = def0.types.some((t) => PERMANENT_TYPES.has(t));
  // "Retrace - cast permanent cards from your graveyard by discarding a land." -
  // Six grants it to every nonland permanent card in your graveyard on your turn.
  const castingViaRetrace =
    instance.zone === "graveyard" &&
    isYourTurn &&
    def0IsPermanent &&
    !def0.types.includes("Land") &&
    options.retraceDiscard !== undefined &&
    state.players.some((p) =>
      p.id === playerId &&
      p.battlefield.some((c) => state.cardDefinitions[c.definitionId]?.grantsRetrace),
    );
  // "You may cast a creature spell from your graveyard this turn." - Chainer,
  // whose activated ability set the flag.
  const castingViaChainer =
    instance.zone === "graveyard" &&
    def0.types.includes("Creature") &&
    requirePlayer(state, playerId).mayCastCreatureFromGraveyardThisTurn === true;
  // "You may cast this card from your graveyard by removing six counters..." -
  // Quilled Greatwurm's own door into the graveyard, distinct from Warp's exile
  // one and gated on the card carrying the permission.
  const castingFromGraveyard =
    instance.zone === "graveyard" &&
    (def0.castFromGraveyard !== undefined || castingViaRetrace || castingViaChainer) &&
    !options.fromCommandZone;
  const expectedZone = options.fromCommandZone ? "command" : "hand";
  if (!fromExile && !castingFromWarpExile && !castingFromGraveyard && instance.zone !== expectedZone) {
    throw new Error(`${instanceId} is not in ${playerId}'s ${expectedZone} zone`);
  }
  if (!fromExile && instance.ownerId !== playerId) {
    throw new Error(`${playerId} does not own ${instanceId}`);
  }

  const def = requireDefinition(state, instance.definitionId);
  // The adventure half is an instant or sorcery even though the card itself is a
  // permanent - Locthwain Scorn resolves and goes away, not onto the battlefield.
  const isPermanentSpell = !options.useAdventure && def.types.some((t) => PERMANENT_TYPES.has(t));
  if (options.useWarp) {
    if (!def.warp) throw new Error(`${def.name} has no warp cost`);
    if (instance.zone !== "hand") throw new Error(`${def.name} can only be warped from hand`);
  }

  if (isSorcerySpeedOnly(def) && !options.ignoreTiming && !canCastAtSorcerySpeed(state, playerId)) {
    throw new Error(`${def.name} can only be cast at sorcery speed`);
  }

  /*
   * The hate pieces. Checked before anything is announced or paid, because
   * "can't" in Magic means the action is never taken - not that it is taken and
   * undone.
   */
  const forbidden = castRestrictionProblem(state, playerId, def, expectedZone);
  if (forbidden) throw new Error(forbidden);

  /*
   * {X} is announced as the spell is cast (rule 601.2b), before anything is
   * paid, and it never changes afterwards. Recorded on the card instance
   * rather than only on the stack object because a permanent spell's own
   * abilities go on referring to it once it has resolved - see
   * `CardInstance.chosenX`.
   */
  /*
   * X is not always in the mana cost. Toxic Deluge prints {2}{B} and asks for X
   * *life*, so a card announces an X whenever either half of its cost needs
   * one - reading the mana cost alone would silently take X = 0 and wipe
   * nothing.
   */
  const needsX = requiresX(def.manaCost) || additionalCostNeedsX(def);
  const chosenX = needsX ? (options.chosenX ?? 0) : 0;
  if (needsX && options.chosenX === undefined) {
    throw new Error(`${def.name} has {X} in its cost - a value for X must be chosen`);
  }
  if (chosenX < 0 || !Number.isInteger(chosenX)) {
    throw new Error(`X must be a whole number, not ${chosenX}`);
  }

  /*
   * "You may cast this spell without paying its mana cost."
   *
   * The mana cost is replaced outright rather than reduced to nothing by
   * degrees, and the condition is checked here rather than trusted from the
   * client: an alternative cost taken while its condition is false is simply a
   * free spell.
   */
  const alternative = options.useAlternativeCost ? def.alternativeCost : undefined;
  if (options.useAlternativeCost) {
    if (!def.alternativeCost) throw new Error(`${def.name} has no alternative cost`);
    if (!controllerMeets(state, playerId, def.alternativeCost.condition)) {
      throw new Error(`${def.name}'s alternative cost is not available`);
    }
  }

  if (options.bestowOnto && !def.bestowCost) throw new Error(`${def.name} has no bestow cost`);
  // "You may cast this spell for its dash cost" - a price, not a discount, and
  // the two riders that come with it are applied as the permanent arrives.
  if (options.useDashCost && !def.dashCost) throw new Error(`${def.name} has no dash cost`);
  if (options.omniscienceFree) {
    // "You may cast spells from your hand without paying their mana costs."
    const enabled = player.battlefield.some(
      (c) => requireDefinition(state, c.definitionId).enablesFreeCastFromHand,
    );
    if (!enabled) throw new Error(`${playerId} controls nothing that lets them cast ${def.name} for free`);
  }
  /*
   * "You may cast either half." - a Room, whose two doors have two costs.
   *
   * The card that arrives is still the front definition either way - that is its
   * identity, and what it is countered or recurred as - so only the price
   * changes here. Which door ends up open is carried on the stack object.
   */
  const roomDoor = def.isRoom ? (options.face ?? "front") : undefined;
  const roomBack = roomDoor === "back" && def.backFaceId ? state.cardDefinitions[def.backFaceId] : undefined;
  const printedCost = roomBack?.manaCost ?? def.manaCost ?? { generic: 0, colors: {} };

  // `free` gates only commander tax below; the amount actually paid is `cost`,
  // so an alternative with a real price (Blasphemous Edict's {B}) still pays it.
  // Rebound: a card exiled with a free playable-from-exile permission (Ephemerate)
  // is recast without paying its mana cost.
  const freeFromExile = fromExile && instance.playableFromExile?.free === true;
  const free = alternative !== undefined || options.free === true || options.omniscienceFree === true || freeFromExile;
  let cost: ManaCost = alternative
    ? // Blasphemous Edict pays a reduced {B}; every other alternative is free of
      // mana (paid by a sacrifice, or by nothing).
      (alternative.manaCost ?? { generic: 0, colors: {} })
    : options.free === true || options.omniscienceFree === true || freeFromExile
      ? { generic: 0, colors: {} }
      : options.usePrototype
        ? // Prototype replaces the mana cost (and later the P/T) with its own.
          def.prototype!.cost
        : options.useWarp
        ? // Warp replaces the mana cost with its own, like an alternative cost -
          // but it is not "free", so it stays out of the free branch above.
          def.warp!.cost
        : options.useDashCost
          ? def.dashCost!
          : options.bestowOnto
            ? def.bestowCost!
            : options.useAdventure
              ? // Adventure (Virtue of Persistence's Locthwain Scorn) - cast the
                // adventure half for its own cost; the card then waits in exile.
                def.adventure!.cost
              : costWithX(printedCost, chosenX);
  // "This spell costs {N} less" - applied to an ordinary cast only. An
  // alternative/free/warp/dash/bestow cast has replaced the mana cost outright,
  // and none of those printings carry a generic reduction on top.
  if (!free && !options.useWarp && !options.useDashCost && !options.bestowOnto) {
    cost = castCostReduction(state, playerId, def, cost);
  }
  if (options.fromCommandZone && !free) {
    const timesCast = player.commanderCastCount[instance.instanceId] ?? 0;
    cost = applyCommanderTax(cost, timesCast);
  }

  // Offspring: an additional cost stacked on top of the mana cost. Refused if
  // the card has none, so a client cannot conjure a token copy for free.
  if (options.payOffspring) {
    if (!def.offspring) throw new Error(`${def.name} has no Offspring cost`);
    const merged = { ...cost.colors };
    for (const [color, count] of Object.entries(def.offspring.cost.colors ?? {})) {
      merged[color as keyof typeof merged] = (merged[color as keyof typeof merged] ?? 0) + (count ?? 0);
    }
    cost = { ...cost, generic: cost.generic + (def.offspring.cost.generic ?? 0), colors: merged };
  }

  // Kicker: an additional optional cost that unlocks an extra effect (Urborg
  // Repossession). Merged onto the mana cost when taken, exactly like Offspring.
  if (options.kicked) {
    if (!def.kicker) throw new Error(`${def.name} has no kicker`);
    const merged = { ...cost.colors };
    for (const [color, count] of Object.entries(def.kicker.cost.colors ?? {})) {
      merged[color as keyof typeof merged] = (merged[color as keyof typeof merged] ?? 0) + (count ?? 0);
    }
    cost = { ...cost, generic: cost.generic + (def.kicker.cost.generic ?? 0), colors: merged };
  }

  // Convoke: each creature tapped this way pays for {1} or one mana of its
  // colour (Pile On). Tapped here, and the cost is reduced before the mana is
  // paid; the engine spends each creature on a coloured pip it matches, else on
  // generic.
  if (options.convokeCreatures && options.convokeCreatures.length > 0) {
    if (!def.convoke) throw new Error(`${def.name} has no convoke`);
    for (const id of options.convokeCreatures) {
      const found = findInstance(state, id);
      if (!found || found.instance.controllerId !== playerId || found.instance.tapped) {
        throw new Error(`${cardNameOf(state, found?.instance.definitionId ?? "")} cannot convoke`);
      }
      found.instance.tapped = true;
      const colors = cardColors(requireDefinition(state, found.instance.definitionId));
      const payColor = colors.find((c) => (cost.colors[c] ?? 0) > 0);
      if (payColor) cost = { ...cost, colors: { ...cost.colors, [payColor]: (cost.colors[payColor] ?? 0) - 1 } };
      else if (cost.generic > 0) cost = { ...cost, generic: cost.generic - 1 };
    }
  }

  /*
   * Quilled Greatwurm's graveyard cost: remove N +1/+1 counters from among your
   * creatures, one per entry in `removeCounterFrom`. Validated whole here, paid
   * with the mana below - so an unaffordable cast takes no counters off first.
   */
  const removeCounterFrom = options.removeCounterFrom ?? [];
  if (castingFromGraveyard && def.castFromGraveyard) {
    const need = def.castFromGraveyard.removeCounters;
    if (removeCounterFrom.length !== need) {
      throw new Error(`${def.name} needs ${need} counters removed to cast from the graveyard`);
    }
    const perCreature = new Map<string, number>();
    for (const id of removeCounterFrom) perCreature.set(id, (perCreature.get(id) ?? 0) + 1);
    for (const [id, count] of perCreature) {
      const creature = player.battlefield.find((c) => c.instanceId === id);
      if (!creature) throw new Error(`${playerId} does not control ${id}`);
      if (!requireDefinition(state, creature.definitionId).types.includes("Creature")) {
        throw new Error(`${id} is not a creature`);
      }
      if (creature.plusOneCounters < count) throw new Error(`${id} does not have ${count} +1/+1 counters`);
    }
  }

  // Delve: each card exiled from the graveyard pays for {1} of the generic cost.
  let delved: string[] = [];
  if (def.delve && options.delveCount && options.delveCount > 0) {
    delved = player.graveyard.slice(0, options.delveCount).map((c) => c.instanceId);
    cost = { ...cost, generic: Math.max(0, cost.generic - delved.length) };
  }

  /*
   * The additional cost, validated before anything at all is paid or moved.
   *
   * The creature's power is read here, while it is still on the battlefield,
   * because that is the number Tend the Pests goes on to use and it cannot be
   * recovered a line later. The sacrifice itself happens below, with the mana,
   * because that is when a cost is paid.
   */
  if (!canPayAdditionalCost(state, playerId, def, chosenX)) {
    throw new Error(`${playerId} cannot pay ${def.name}'s additional cost`);
  }
  let sacrificedPower = 0;
  let sacrificeId: string | undefined;
  if (def.additionalCost?.kind === "sacrifice-creature") {
    sacrificeId = options.sacrificeInstanceId;
    if (!sacrificeId) throw new Error(`${def.name} requires a creature to sacrifice`);
    const victim = player.battlefield.find((c) => c.instanceId === sacrificeId);
    if (!victim) throw new Error(`${playerId} does not control ${sacrificeId}`);
    if (!requireDefinition(state, victim.definitionId).types.includes("Creature")) {
      throw new Error(`${cardNameOf(state, victim.definitionId)} is not a creature`);
    }
    sacrificedPower = effectivePower(state, victim);
  }
  if (alternative?.sacrifice) {
    // Flare of Denial's alternative cost: the sacrifice *is* the cost, in place
    // of mana. Validated here, performed below with everything else.
    const altSacId = options.sacrificeInstanceId;
    if (!altSacId) throw new Error(`${def.name}'s alternative cost requires a creature to sacrifice`);
    const victim = player.battlefield.find((c) => c.instanceId === altSacId);
    if (!victim) throw new Error(`${playerId} does not control ${altSacId}`);
    const vdef = requireDefinition(state, victim.definitionId);
    if (!vdef.types.includes("Creature")) throw new Error(`${vdef.name} is not a creature`);
    if (alternative.sacrifice.color && (vdef.manaCost?.colors?.[alternative.sacrifice.color] ?? 0) <= 0) {
      throw new Error(`${vdef.name} is not the required colour`);
    }
    if (alternative.sacrifice.nontoken && vdef.isToken) throw new Error(`${vdef.name} is a token`);
    sacrificeId = altSacId;
  }
  if (alternative?.exileCardFromHand) {
    // Evoke: exile a card of the named colour from hand, in place of mana.
    const exileId = options.exileFromHandInstanceId;
    if (!exileId) throw new Error(`${def.name}'s evoke cost requires a card to exile from hand`);
    const chosen = player.hand.find((c) => c.instanceId === exileId);
    if (!chosen) throw new Error(`${playerId} has no such card in hand`);
    const cdef = requireDefinition(state, chosen.definitionId);
    const col = alternative.exileCardFromHand.color;
    if (col && !cardColors(cdef).includes(col)) throw new Error(`${cdef.name} is not ${col}`);
    if (chosen.instanceId === instanceId) throw new Error(`${def.name} cannot pay for itself`);
    moveCard(state, exileId, "exile");
  }

  // A mode is chosen as the spell is cast, so the modal wrapper is unwrapped
  // here and never reaches the stack. Everything downstream - targeting,
  // resolution, the bot, the client - sees a plain single effect.
  // Cleave (Dig Up): casting for the alternative (cleave) cost swaps in the
  // bracket-removed effect.
  let effect: Effect =
    (options.useAdventure && def.adventure?.effect) ||
    (options.useAlternativeCost && def.cleaveEffect) ||
    def.castEffect ||
    { kind: "draw", amount: 0 };
  // "If the {1}{B} cost was paid, an opponent draws a card." - Baleful Mastery.
  // The rider runs first, then the spell's own effect.
  if (options.useAlternativeCost && def.alternativeCost?.riderEffect) {
    effect = { kind: "sequence", effects: [def.alternativeCost.riderEffect, effect] };
  }
  // "If this spell was kicked, ..." - Urborg Repossession. The kicker's extra
  // effect runs after the base one.
  if (options.kicked && def.kicker) {
    effect = { kind: "sequence", effects: [effect, def.kicker.effect] };
  }
  if (effect.kind === "modal") {
    const modes = effect.modes;
    const chosen = options.chosenMode;
    if (chosen === undefined) throw new Error(`${def.name} is modal - a mode must be chosen`);
    const mode = modes[chosen];
    if (!mode) throw new Error(`${def.name} has no mode ${chosen}`);
    effect = mode.effect;
  }
  // X is substituted here for the same reason the mode is: it is settled at
  // cast time, so nothing downstream ever has to know it was once a symbol.
  // The sacrificed creature's power rides along: it is settled at exactly the
  // same moment and for exactly the same reason.
  effect = resolveAmounts(effect, { x: chosenX, sacrificedPower });

  /*
   * "X damage divided as you choose among up to two targets", and its kicker:
   * "if X is 6 or more, twice X divided among them instead."
   *
   * Settled here, with X and the mode, because that is when it is announced -
   * and the difference from settling it at resolution is real: kill one of the
   * two in response and the damage assigned to it is lost rather than moved.
   *
   * Validated rather than trusted. A split that does not add up, or that gives a
   * named target nothing, is not a legal announcement, and letting one through
   * would be a burn spell that deals more damage than it says.
   */
  if (effect.kind === "damage" && effect.dividedAmongTargets) {
    // The amount is X on the only card of this shape, announced a moment ago.
    const base = effect.amountFrom === "x" ? chosenX : effect.amount;
    const threshold = effect.doubleWhenAmountAtLeast;
    const total = threshold !== undefined && base >= threshold ? base * 2 : base;
    const split = options.damageSplit ?? (targets.length === 1 ? [total] : undefined);
    if (!split) throw new Error(`${def.name} divides its damage - say how much each target takes`);
    if (split.length !== targets.length) {
      throw new Error(`${def.name} was given ${split.length} amounts for ${targets.length} targets`);
    }
    if (split.some((n) => !Number.isInteger(n) || n < 1)) {
      // "Divided as you choose" assigns at least 1 to each target named - a
      // target given nothing was never a legal target to name.
      throw new Error(`Each target of ${def.name} must be assigned at least 1 damage`);
    }
    if (split.reduce((sum, n) => sum + n, 0) !== total) {
      throw new Error(`${def.name} deals ${total} damage - the division must add up to it`);
    }
    effect = { ...effect, amount: total, splitAmounts: split };
  }

  // Validated before anything is paid or moved. Every throw below this point
  // would otherwise leave the game half-cast - mana spent and the card sitting
  // on the stack - and an illegal target is the easy way to hit that now that
  // targets can disappear in response to a spell.
  // An Aura targets what it enchants on cast (the same shape bestow uses); the
  // enchant selector leads, before any selector the aura's own effect carries.
  const selectors = def.enchant ? [def.enchant, ...targetSelectorsOf(effect)] : targetSelectorsOf(effect);
  if (selectors.length > 1) {
    /*
     * Two selectors of different kinds - Infectious Bite's "creature you
     * control" and "creature you don't control" - validated positionally: one
     * target apiece, each against its own selector, in order. Neither is "up to"
     * so the count is exact.
     */
    if (targets.length !== selectors.length) {
      throw new Error(`${def.name} requires ${selectors.length} targets`);
    }
    selectors.forEach((sel, i) => {
      if (!isValidTarget(state, sel, targets[i]!, playerId)) {
        throw new Error(`Illegal target for ${def.name}`);
      }
    });
  } else if (selectors.length === 1) {
    const selector = selectors[0]!;
    /*
     * How many, not merely whether. "Up to X target artifacts" with X = 2 is a
     * legal cast for nought, one or two of them and an illegal cast for three -
     * and "choose two target players" is not satisfied by one.
     */
    const { min, max } = targetCountOf(selector, chosenX);
    if (targets.length < min) {
      throw new Error(
        min === 1 ? `${def.name} requires a target` : `${def.name} requires ${min} targets`,
      );
    }
    if (targets.length > max) throw new Error(`${def.name} takes at most ${max} target(s)`);
    for (const target of targets) {
      if (!isValidTarget(state, selector, target, playerId, instanceId)) {
        throw new Error(`Illegal target for ${def.name}`);
      }
    }
  }

  /*
   * "protection from instants and from sorceries" - Sword of Wealth and Power.
   * A creature with protection from this spell's type is not a legal target for
   * it, whichever selector matched above. Checked here rather than in
   * `isValidTarget` because that is asked for abilities too, and this is a
   * property of being targeted by a *spell* of the named type.
   */
  for (const target of targets) {
    if (target.kind !== "card") continue;
    const found = findInstance(state, target.instanceId);
    if (found && protectionFrom(state, found.instance).some((t) => def.types.includes(t))) {
      throw new Error(`Illegal target for ${def.name} - protection`);
    }
  }

  // Restricted mana counts here and nowhere else: this is the only place that
  // knows *what* is being cast, which is the whole question its restriction
  // asks. See spendablePool in mana.ts.
  if (!canPayManaCostFromPool(spendablePool(player, def), cost)) {
    throw new Error(`${playerId} cannot afford to cast ${def.name}`);
  }
  const payment = payManaCostFor(player, cost, def);
  const restrictionsUsed = payment.restrictions;
  // Retrace: discard a land as the additional cost (Six). Chainer's permission
  // to cast a creature from the graveyard is spent as it is used.
  if (castingViaRetrace && options.retraceDiscard) {
    const land = player.hand.find((c) => c.instanceId === options.retraceDiscard);
    if (!land || !requireDefinition(state, land.definitionId).types.includes("Land")) {
      throw new Error("Retrace requires discarding a land card");
    }
    log(state, `${playerId} discards ${cardNameOf(state, land.definitionId)} (retrace)`);
    moveCard(state, land.instanceId, "graveyard");
  }
  if (castingViaChainer) player.mayCastCreatureFromGraveyardThisTurn = false;
  // Delve's exiles are paid in the same breath as the mana.
  for (const id of delved) moveCard(state, id, "exile");
  if (delved.length > 0) log(state, `${playerId} delves, exiling ${delved.length} card${delved.length === 1 ? "" : "s"}`);

  /*
   * The rest of the cost, paid in the same breath as the mana (rule 601.2h).
   *
   * After the mana rather than before, so a spell that turns out to be
   * unaffordable has not already eaten a creature - the mana check above throws
   * before this line is reached.
   */
  if (def.additionalCost?.kind === "pay-life") {
    const life = typeof def.additionalCost.amount === "number" ? def.additionalCost.amount : chosenX;
    player.life -= life;
    log(state, `${playerId} pays ${life} life`);
  }
  if (castingFromGraveyard && removeCounterFrom.length > 0) {
    for (const id of removeCounterFrom) {
      const creature = player.battlefield.find((c) => c.instanceId === id);
      if (creature) creature.plusOneCounters -= 1;
    }
    log(state, `${playerId} removes ${removeCounterFrom.length} +1/+1 counters to cast ${def.name} from their graveyard`);
  }
  if (sacrificeId) sacrificePermanent(state, sacrificeId);
  /*
   * "...and that spell can't be countered." A property of this casting rather
   * than of the card, so it is recorded on the spell on the stack: the same
   * Blech cast without Delighted Halfling's mana is counterable as normal.
   */
  const uncounterable =
    def.cantBeCountered === true || restrictionsUsed.some((used) => used.grantsUncounterable === true);

  // Recorded on the card, not just the spell: The Meathook Massacre's own
  // enters-the-battlefield trigger fires after the spell has left the stack.
  instance.chosenX = chosenX;
  /*
   * Recorded on the card rather than on the spell, because attaching happens
   * as the permanent arrives - long after the stack object has gone.
   */
  instance.bestowTarget = options.bestowOnto;
  // An Aura remembers its host - chosen now, attached as it arrives, long after
  // the stack object has gone. Its target leads the list validated above.
  if (def.enchant && targets[0]?.kind === "card") instance.enchantTarget = targets[0].instanceId;
  // Dash, for the same reason: the haste and the return home are applied as the
  // creature arrives, not while it is a spell.
  instance.dashed = options.useDashCost === true;
  /*
   * Warp: the creature this becomes leaves at the next end step. Marked on the
   * card now, read off the battlefield then. Cast from its warp-exile the flag
   * is cleared - a card cast for its ordinary cost is just a creature, and it is
   * no longer the warped copy waiting in exile either.
   */
  if (options.useWarp) instance.exileAtNextEndStep = true;
  instance.warpedInExile = false;
  // Adventure (Virtue of Persistence): the adventure half exiles the card as it
  // resolves, and it waits there to be cast later as the creature/enchantment.
  // Casting the main card from exile clears the mark.
  if (options.useAdventure) instance.adventuredInExile = true;
  else if (instance.zone === "exile" && instance.adventuredInExile) instance.adventuredInExile = false;
  // Offspring: remembered on the card so the token copy is made as it enters,
  // long after the stack object has gone.
  if (options.payOffspring) instance.offspringPaid = true;
  if (options.usePrototype) instance.prototypePaid = true;
  // "if you didn't cast it from your hand" - Chainer. Remembered before the card
  // leaves for the stack, so the permanent it becomes knows how it was cast.
  const castFromHand = instance.zone === "hand";
  // Share the Spoils: casting a card from the shared pile refills it with the
  // top of the caster's library.
  const refillSharePile = instance.shareTheSpoilsExiled === true;
  instance.shareTheSpoilsExiled = false;

  moveCard(state, instanceId, "stack");
  instance.wasCastFromHand = castFromHand;
  log(state, `${playerId} casts ${def.name}`);
  if (refillSharePile) {
    const top = player.library[0];
    if (top) {
      moveCard(state, top.instanceId, "exile");
      const t = findInstance(state, top.instanceId);
      if (t) t.instance.shareTheSpoilsExiled = true;
      log(state, `${playerId} exiles the top card of their library (Share the Spoils)`);
    }
  }

  if (options.fromCommandZone) {
    player.commanderCastCount[instance.instanceId] = (player.commanderCastCount[instance.instanceId] ?? 0) + 1;
  }

  if (targets.length > 0 && !attemptWardPayments(state, playerId, targets)) {
    // Ward's cost went unpaid - the spell is countered: it still leaves play (to the graveyard),
    // but never resolves. The mana already spent to cast it is not refunded.
    moveCard(state, instanceId, "graveyard");
    state.passesInSuccession = 0;
    return;
  }

  const spell = pushOntoStack(state, instanceId, playerId, effect, targets, isPermanentSpell, uncounterable);
  // Which door was paid for, carried until there is a permanent to hold it.
  if (roomDoor) spell.roomDoor = roomDoor;
  /*
   * "if **no mana was spent** to cast it" - Boromir, whose whole job is
   * punishing the free spells. Recorded here because this is where it is known,
   * and it never changes afterwards.
   *
   * A cost of {0} counts as no mana spent, which is the rule and is what makes
   * Boromir answer a Chrome Mox as well as a Force of Will.
   */
  spell.noManaSpent = manaValue(cost) === 0;

  /*
   * "Whenever an opponent casts an instant or sorcery spell" - Arasta of the
   * Endless Web.
   *
   * Fired after the spell is on the stack, so the trigger goes on top of it
   * and resolves first. That is the real ordering, and it is visible: Arasta
   * has its Spider before the removal spell that provoked it resolves.
   */
  /*
   * Recorded here rather than on resolution: "cast" happens when the spell goes
   * on the stack, so a countered spell still counts against Archon of Emeria.
   * That is the rule, and it is also what makes these cards worth playing.
   */
  player.spellTypesCastThisTurn.push([...def.types]);
  fireWatchers(state, "spell-cast", {
    ...describeSubject(state, instance, def),
    // "if no mana was spent to cast it" - carried on the event, because by the
    // time a watcher reads it the spell may already have resolved and gone.
    freeSpell: spell.noManaSpent,
  });

  /*
   * "When that mana is spent to cast a creature spell that shares a creature
   * type with your commander, scry 1." - Path of Ancestry.
   *
   * Fired here, after the spell is on the stack, for the same reason the
   * cast watchers are: the trigger goes on top of the spell it paid for and
   * resolves first, so the scry happens before the creature arrives. The
   * condition is checked against the card actually cast rather than remembered
   * on the mana, because "shares a creature type with your commander" is a
   * question about both cards at once.
   */
  for (const mark of payment.marks) {
    if (mark.rider.kind === "discover-on-permanent-spell") {
      // "Whenever you cast a permanent spell using mana produced by Tecutlan,
      // discover X, where X is that spell's mana value."
      if (!isPermanentSpell) continue;
      pushOntoStack(
        state,
        mark.sourceInstanceId,
        playerId,
        { kind: "discover", amount: manaValue(def.manaCost ?? { generic: 0, colors: {} }) },
        [],
        false,
      );
      continue;
    }
    if (mark.rider.kind !== "scry-on-creature-sharing-commander-type") continue;
    if (!def.types.includes("Creature")) continue;
    const shared = commanderCreatureTypes(state, playerId);
    if (!(def.subtypes ?? []).some((subtype) => shared.includes(subtype))) continue;
    pushOntoStack(
      state,
      mark.sourceInstanceId,
      playerId,
      { kind: "scry", amount: mark.rider.amount },
      [],
      false,
    );
  }

  /*
   * Storm: "copy it for each spell cast before it this turn." The count is read
   * before this cast bumps it, so "before it" is exactly the current tally. The
   * copies go on top of the spell, so they resolve first, carrying the same
   * effect and targets - Storm gives no choice of new targets (that is Sword).
   */
  const priorSpells = state.spellsCastThisTurn;
  state.spellsCastThisTurn += 1;
  if (def.storm && priorSpells > 0) {
    for (let i = 0; i < priorSpells; i++) {
      pushSpellCopyOntoStack(state, instanceId, playerId, effect, targets);
    }
    log(state, `Storm: ${def.name} is copied ${priorSpells} time${priorSpells === 1 ? "" : "s"}`);
  }
  // Demonstrate: "you may copy it. If you do, choose an opponent to also copy
  // it." - Healing Technique. The engine takes it: a copy for you and one for
  // the first opponent, same targets (the documented copy simplification).
  if (def.demonstrate) {
    pushSpellCopyOntoStack(state, instanceId, playerId, effect, targets);
    const opponent = state.players.find((p) => p.id !== playerId && !p.hasLost);
    if (opponent) pushSpellCopyOntoStack(state, instanceId, opponent.id, effect, targets);
    log(state, `Demonstrate: ${def.name} is copied`);
  }

  /*
   * "When you next cast an instant or sorcery spell this turn, copy that spell."
   * - Sword of Wealth and Power, armed by its combat trigger. Spent here on the
   * caster's next instant or sorcery: one copy on the stack, same targets (new
   * targets are the documented simplification), the pending count decremented.
   */
  if (
    player.copyNextInstantOrSorcery > 0 &&
    (def.types.includes("Instant") || def.types.includes("Sorcery"))
  ) {
    player.copyNextInstantOrSorcery -= 1;
    pushSpellCopyOntoStack(state, instanceId, playerId, effect, targets);
    log(state, `${playerId} copies ${def.name}`);
  }

  state.passesInSuccession = 0;
}

/**
 * Whether the card's additional cost is the kind that needs an X announced -
 * Toxic Deluge's "pay X life", where the mana cost prints no {X} at all.
 */
function additionalCostNeedsX(def: CardDefinition): boolean {
  const cost = def.additionalCost;
  if (!cost) return false;
  return cost.kind === "pay-life" && typeof cost.amount !== "number" && cost.amount.kind === "x";
}

/** A definition's name, for an error raised before anything has an instance to look up. */
function cardNameOf(state: GameState, definitionId: string): string {
  return state.cardDefinitions[definitionId]?.name ?? "That permanent";
}


/**
 * "Rather than cast this card from your hand, pay {1}{B} and exile it with two
 * time counters on it." - Profane Tutor.
 *
 * A way of *playing* the card rather than a way of casting it, which is why it
 * is its own function: nothing goes on the stack, no cast triggers fire, and it
 * is sorcery-speed because the real rule ties it to when you could cast the
 * card.
 */
export function suspendCard(state: GameState, playerId: string, instanceId: string): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;
  if (instance.zone !== "hand" || instance.ownerId !== playerId) {
    throw new Error(`${instanceId} is not in ${playerId}'s hand`);
  }
  const def = requireDefinition(state, instance.definitionId);
  if (!def.suspend) throw new Error(`${def.name} has no suspend cost`);
  if (!canCastAtSorcerySpeed(state, playerId)) {
    throw new Error(`${def.name} can only be suspended at sorcery speed`);
  }
  if (!canPayManaCostFromPool(spendablePool(player, def), def.suspend.cost)) {
    throw new Error(`${playerId} cannot afford to suspend ${def.name}`);
  }
  payManaCostFor(player, def.suspend.cost, def);
  moveCard(state, instanceId, "exile");
  instance.timeCounters = def.suspend.timeCounters;
  log(state, `${playerId} suspends ${def.name} with ${def.suspend.timeCounters} time counters`);
  state.passesInSuccession = 0;
}

/**
 * Casts a suspended card as its last time counter is removed, free.
 *
 * Exported for turn.ts, which is the only caller: the upkeep is the one moment
 * this can happen. A card whose spell has no legal target is simply left in
 * exile with no counters rather than being cast into nothing.
 */
export function castSuspended(state: GameState, playerId: string, instanceId: string): void {
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "exile") return;
  const def = requireDefinition(state, found.instance.definitionId);
  const selector = targetSelectorOf(def.castEffect ?? { kind: "draw", amount: 0 });
  const targets = selector ? legalTargetsFor(state, selector, playerId, instanceId).slice(0, 1) : [];
  if (selector && targets.length === 0) return;

  /*
   * Cast from exile, which no other card in the pool does - so the zone check
   * in `castSpell` is bypassed by moving the card to hand first. That is not a
   * cheat: the card is genuinely being cast, and every other consequence of
   * casting (cast triggers, ward, a permanent arriving properly) has to follow.
   */
  moveCard(state, instanceId, "hand");
  const priorityBefore = state.priorityPlayerIndex;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  try {
    castSpell(state, playerId, instanceId, targets, { free: true, ignoreTiming: true });
  } finally {
    state.priorityPlayerIndex = priorityBefore;
  }
}

/**
 * "While it's prepared, you may cast a copy of its spell." - Eccentric
 * Pestfinder.
 *
 * A copy of a spell is not a card, so nothing moves zones: the back face's
 * effect goes on the stack on its own, paid for at the back face's cost, and
 * the permanent stays where it is with its flag cleared.
 */
export function castPreparedSpell(state: GameState, playerId: string, instanceId: string): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "battlefield") {
    throw new Error(`${instanceId} is not on the battlefield`);
  }
  if (found.instance.controllerId !== playerId) throw new Error(`${playerId} does not control ${instanceId}`);
  if (!found.instance.prepared) throw new Error("That permanent is not prepared");

  const front = requireDefinition(state, found.instance.definitionId);
  const back = front.backFaceId ? requireDefinition(state, front.backFaceId) : undefined;
  if (!back?.castEffect) throw new Error(`${front.name} has no spell to copy`);
  const cost = back.manaCost ?? { generic: 0, colors: {} };
  if (!canCastAtSorcerySpeed(state, playerId) && !back.types.includes("Instant")) {
    throw new Error(`${back.name} can only be cast at sorcery speed`);
  }
  if (!canPayManaCostFromPool(spendablePool(player, back), cost)) {
    throw new Error(`${playerId} cannot afford ${back.name}`);
  }
  payManaCostFor(player, cost, back);
  // Unprepared by the casting, whether or not the copy resolves - "doing so
  // unprepares it" is about the cast, not the outcome.
  found.instance.prepared = false;
  log(state, `${playerId} casts a copy of ${back.name}`);
  pushOntoStack(state, instanceId, playerId, back.castEffect, [], false);
  state.passesInSuccession = 0;
}

/** Playing a land is not "casting a spell" - it doesn't use the stack and is capped at one per turn. */
/**
 * Plays a land for the turn. See `fireLandPlayed` for why the event it fires is
 * not the same as landfall.
 */
/**
 * Whether this player has been given permission to play this specific card out of
 * exile, and it has not expired.
 *
 * Read rather than cleared: the permission is stamped with the turn it was
 * granted, so a card exiled on turn 7 stops being playable the moment turn 8
 * begins without anything having to remember to sweep it.
 */
export function mayPlayFromExile(state: GameState, playerId: string, instance: CardInstance): boolean {
  // Share the Spoils: the active player may play any card in the shared pile.
  if (
    instance.shareTheSpoilsExiled &&
    instance.zone === "exile" &&
    state.players[state.activePlayerIndex]?.id === playerId
  ) {
    return true;
  }
  const permission = instance.playableFromExile;
  if (!permission || instance.zone !== "exile") return false;
  if (permission.playerId !== playerId) return false;
  if (state.turnNumber !== permission.untilTurn) return false;
  const def = state.cardDefinitions[instance.definitionId];
  // "You may **cast** that card" does not include a land drop.
  if (!permission.lands && def?.types.includes("Land")) return false;
  return true;
}

export function playLand(
  state: GameState,
  playerId: string,
  instanceId: string,
  /**
   * Which face of a modal double-faced card is being played.
   *
   * Only ever consulted when *both* faces are lands - Needleverge Pathway - and
   * ignored otherwise, because there is nothing to choose: a card with a spell
   * on the front and a land on the back can only be reaching `playLand` for its
   * land. Defaults to the front, which is what a client that has never heard of
   * two-land cards would mean.
   */
  face: "front" | "back" = "front",
): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const { instance } = found;

  /*
   * From hand, or - with Icetill Explorer out - from the graveyard.
   *
   * A permission rather than a different action: everything below is identical
   * either way, which is what the card means by "you may play lands from your
   * graveyard". Checked here rather than widened unconditionally, because a
   * land in a graveyard is otherwise as unplayable as any other card there.
   */
  const fromGraveyard = instance.zone === "graveyard" && canPlayLandsFromGraveyard(state, playerId);
  // "You may **play** that card this turn" - Face-Breaker's permission covers a
  // land drop, which is the whole reason its wording differs from Ragavan's.
  const fromExile = mayPlayFromExile(state, playerId, instance);
  if ((instance.zone !== "hand" && !fromGraveyard && !fromExile) || (!fromExile && instance.ownerId !== playerId)) {
    throw new Error(`${instanceId} is not in ${playerId}'s hand`);
  }
  /*
   * A modal double-faced card played for its land half *becomes* that half.
   *
   * Done before anything else reads the definition, so every check below and
   * every trigger afterwards sees a plain land - which is exactly what it is
   * once it is on the battlefield. `moveCard` turns it back over on the way
   * out. Only when the back face is a land: nothing in the pool has a spell on
   * the back, and `playLand` is not the door a spell comes through.
   */
  const front = requireDefinition(state, instance.definitionId);
  const back = front.backFaceId ? requireDefinition(state, front.backFaceId) : undefined;
  if (back?.types.includes("Land")) {
    /*
     * One land face means there is nothing to decide: a spell on the front and a
     * land on the back can only be here for the land. Two land faces - the
     * Pathway cycle - is a genuine choice, and it is the entire card.
     */
    const wanted = front.types.includes("Land") ? face : "back";
    if (wanted === "back") instance.definitionId = front.backFaceId!;
  }

  const def = requireDefinition(state, instance.definitionId);
  if (!def.types.includes("Land")) throw new Error(`${def.name} is not a land`);
  if (!canCastAtSorcerySpeed(state, playerId)) throw new Error("Lands can only be played at sorcery speed");
  // One a turn, plus whatever the board grants - see `landDropsAllowed`.
  if (player.landsPlayedThisTurn >= landDropsAllowed(state, playerId)) {
    throw new Error(`${playerId} has already played a land this turn`);
  }

  /*
   * Logged like every other action, which it was not until now.
   *
   * Playing a land was the one thing a player could do that left no trace: the
   * log jumped from one spell to the next with the land drop invisible, and
   * "did I already play a land this turn?" is a question the log is the natural
   * place to answer. The client also drives its sound cues off log lines, so a
   * land going down was silent purely because there was no line to read.
   *
   * Before the land actually arrives, so the log reads in the order things
   * happened rather than reporting a landfall trigger ahead of its cause.
   */
  log(state, `${playerId} plays ${def.name}`);

  /*
   * Via putOntoBattlefield rather than moveCard, so a land carrying an
   * enters-the-battlefield trigger fires it like any other permanent would.
   *
   * Landfall used to be a second loop written out here, which meant it only
   * ever fired for a land *played* from hand. A land put onto the battlefield
   * any other way - a fetchland cracking, Sakura-Tribe Elder, a ramp spell -
   * arrived in total silence, even though the rules make no distinction. It now
   * lives in `enteredBattlefield`, the one door every land goes through.
   */
  putOntoBattlefield(state, instanceId);
  player.landsPlayedThisTurn += 1;
  /*
   * "When you play another land" - City of Traitors, and only here.
   *
   * After the land has arrived, so a City of Traitors sacrificing itself does so
   * with the new land already on the battlefield - which is the order the card
   * describes and the order that leaves the player with the land they paid for.
   */
  fireLandPlayed(state, instance);

  state.passesInSuccession = 0;
}

/**
 * "As a sorcery, you may **pay the mana cost of a locked door to unlock it**."
 *
 * A Room's other half, bought later. Not a spell and not an activated ability -
 * nothing goes on the stack, which is why this is its own action rather than
 * either of those: there is no window to respond in, and a door that could be
 * countered would be a different card.
 *
 * The permanent is already there; all this changes is which of its halves are
 * live. See `unlockedDefinitions`, which is the one place that answers that.
 */
export function unlockDoor(
  state: GameState,
  playerId: string,
  instanceId: string,
  door: "front" | "back",
): void {
  if (state.players[state.priorityPlayerIndex]?.id !== playerId) {
    throw new Error(`${playerId} does not have priority`);
  }
  const player = requirePlayer(state, playerId);
  const instance = player.battlefield.find((c) => c.instanceId === instanceId);
  if (!instance) throw new Error(`${instanceId} is not on ${playerId}'s battlefield`);
  const front = requireDefinition(state, instance.definitionId);
  if (!front.isRoom) throw new Error(`${front.name} is not a Room`);
  if (instance.unlockedDoors.includes(door)) throw new Error(`That door is already unlocked`);
  // "**As a sorcery**" - the same timing a Room's own halves are cast at.
  if (!canCastAtSorcerySpeed(state, playerId)) {
    throw new Error("A door can only be unlocked at sorcery speed");
  }
  const side = door === "back" && front.backFaceId ? requireDefinition(state, front.backFaceId) : front;
  const cost = side.manaCost ?? { generic: 0, colors: {} };
  if (!canPayManaCostFromPool(spendablePool(player, side), cost)) {
    throw new Error(`${playerId} cannot afford to unlock ${side.name}`);
  }
  payManaCostFor(player, cost, side);
  instance.unlockedDoors.push(door);
  log(state, `${playerId} unlocks ${side.name}`);
  state.passesInSuccession = 0;
}

/**
 * Ninjutsu: return an unblocked attacker you control to hand and pay the cost to
 * put a Ninja from your hand onto the battlefield tapped and attacking the same
 * player. Used during the declare-blockers step, once blocks are in.
 */
export function ninjutsu(
  state: GameState,
  playerId: string,
  ninjaInstanceId: string,
  returnedAttackerInstanceId: string,
): void {
  const player = requirePlayer(state, playerId);
  const ninja = player.hand.find((c) => c.instanceId === ninjaInstanceId);
  if (!ninja) throw new Error("That card is not in hand");
  const def = requireDefinition(state, ninja.definitionId);
  if (!def.ninjutsu) throw new Error(`${def.name} has no ninjutsu ability`);
  const defendingPlayerId = state.attackers[returnedAttackerInstanceId];
  if (defendingPlayerId === undefined) throw new Error("That creature is not attacking");
  if (!player.battlefield.some((c) => c.instanceId === returnedAttackerInstanceId)) {
    throw new Error(`${playerId} does not control that attacker`);
  }
  if (Object.values(state.blockers).includes(returnedAttackerInstanceId)) {
    throw new Error("That attacker is blocked");
  }
  if (!canPayManaCostFromPool(player.manaPool, def.ninjutsu.cost)) {
    throw new Error(`${playerId} cannot pay the ninjutsu cost of ${def.name}`);
  }
  payManaCostFor(player, def.ninjutsu.cost);
  delete state.attackers[returnedAttackerInstanceId];
  moveCard(state, returnedAttackerInstanceId, "hand");
  putOntoBattlefield(state, ninjaInstanceId, { tapped: true });
  state.attackers[ninjaInstanceId] = defendingPlayerId;
  log(state, `${playerId} ninjutsus ${def.name} in`);
}
