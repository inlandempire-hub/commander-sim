import type { GameState, StackObject, StackTarget, TargetSelector, Effect } from "./types.js";
import { findInstance, requireDefinition, requirePlayer } from "./state.js";
import { effectivePower, hasCreatureType, hasKeyword, typesOf } from "./counters.js";
import { cardColors } from "./conditions.js";
import { protectionStopsTargeting } from "./protection.js";
import { evaluateAmount } from "./amounts.js";
import { manaValue } from "./mana.js";

/**
 * True if this stack object is a *spell* rather than a triggered or activated
 * ability. "Counter target spell" must not be able to hit an ability, and the
 * distinction is already recorded in the state: a spell has its own card sitting
 * in the stack zone, whereas an ability's source is still on the battlefield.
 */
export function isSpellOnStack(state: GameState, obj: StackObject): boolean {
  return findInstance(state, obj.sourceInstanceId)?.instance.zone === "stack";
}

export function findStackObject(state: GameState, stackObjectId: string): StackObject | undefined {
  return state.stack.find((o) => o.id === stackObjectId);
}

/**
 * Every reason a permanent on the battlefield cannot be targeted by *this*
 * source: hexproof, and protection from one of the source's qualities.
 *
 * One function so that every selector asks both. A selector that checked hexproof
 * and forgot protection would be a hole shaped exactly like one card type -
 * which is how this sort of thing is usually found.
 */
function isProtectedFromThisSource(
  state: GameState,
  instanceId: string,
  controllerId: string,
  sourceInstanceId: string | undefined,
): boolean {
  if (isProtectedByHexproof(state, instanceId, controllerId, sourceInstanceId)) return true;
  return protectionStopsTargeting(state, instanceId, sourceInstanceId);
}

/** Hexproof: can't be the target of a spell/ability controlled by anyone other than its own controller. */
function isProtectedByHexproof(
  state: GameState,
  instanceId: string,
  controllerId: string,
  sourceInstanceId: string | undefined,
): boolean {
  const found = findInstance(state, instanceId);
  if (!found) return false;
  if (found.instance.controllerId === controllerId) return false;
  if (hasKeyword(state, found.instance, "Hexproof")) return true;
  /*
   * "**Hexproof from that color**" - Skrelv.
   *
   * Narrower than plain hexproof by exactly one thing, and narrower than
   * protection by rather more: it stops an opponent *targeting* it with a
   * source of that colour, and nothing else. A creature with hexproof from
   * white can still be blocked by a white creature and still takes damage from
   * one.
   *
   * With no source at all - a spell being cast from a hand rather than an
   * ability on the battlefield - there is nothing to compare a colour against,
   * so the shield does not apply. That matters: writing it the other way would
   * make the creature untargetable by anything.
   */
  const shields = found.instance.hexproofFrom;
  if (shields.length === 0) return false;
  const source = sourceInstanceId ? findInstance(state, sourceInstanceId) : undefined;
  if (!source) return false;
  const colors = cardColors(requireDefinition(state, source.instance.definitionId));
  if (colors.length === 0) return shields.includes("colorless");
  return colors.some((color) => shields.includes(color));
}

export function isValidTarget(
  state: GameState,
  selector: TargetSelector,
  target: StackTarget,
  controllerId: string,
  /**
   * The permanent whose ability is doing the targeting.
   *
   * Only `excludeSource` needs it - "another target creature you control" - and
   * that one throws rather than going without, because a selector that quietly
   * stopped excluding the source would let Rionya copy Rionya.
   */
  sourceInstanceId?: string,
): boolean {
  switch (selector.kind) {
    case "any-target": {
      if (target.kind === "player") return true;
      if (target.kind !== "card") return false; // "any target" means creature or player, never a spell
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "battlefield") return false;
      return !isProtectedFromThisSource(state, target.instanceId, controllerId, sourceInstanceId);
    }
    case "creature": {
      if (target.kind !== "card") return false;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "battlefield") return false;
      const def = requireDefinition(state, found.instance.definitionId);
      if (!typesOf(state, found.instance).includes("Creature")) return false;
      /*
       * "target Insect, Rat, Spider, or Squirrel" - any one of them qualifies.
       *
       * Through `hasCreatureType`, which is the rule Changeling already forced and
       * that an animated land needs for the same reason: "target **Blinkmoth**
       * creature" has to see the type the land gained this turn, and the printed
       * subtype list on a land is empty.
       */
      if (selector.subtypes?.length && !selector.subtypes.some((s) => hasCreatureType(state, found.instance, s))) {
        return false;
      }
      // "target **non-Elf** creature" - Eyeblight's Ending. The mirror of
      // `subtypes`: any listed subtype disqualifies rather than qualifies.
      if (selector.excludeSubtypes?.length && selector.excludeSubtypes.some((s) => hasCreatureType(state, found.instance, s))) {
        return false;
      }
      if (selector.controlledBy) {
        const mine = found.instance.controllerId === controllerId;
        if (selector.controlledBy === "you" && !mine) return false;
        if (selector.controlledBy === "opponent" && mine) return false;
      }
      // "target **nonlegendary** creature you control" - Kiki-Jiki. A copy of a
      // legend would be put into the graveyard by the legend rule at once, so
      // the card excludes them rather than offering a play that does nothing.
      if (selector.nonlegendary && def.supertypes?.includes("Legendary")) return false;
      if (selector.excludeSource) {
        /*
         * Loud rather than permissive. A fire site that forgets to hand over
         * its source would otherwise turn "another target creature you
         * control" into "any", which is a different card and a silent one.
         */
        if (sourceInstanceId === undefined) {
          throw new Error('A selector with excludeSource was asked without a source - "another target" cannot be checked');
        }
        if (target.instanceId === sourceInstanceId) return false;
      }
      // "target creature that was dealt damage this turn" - You Are Already Dead.
      if (selector.damagedThisTurn && !found.instance.damagedThisTurn) return false;
      // "with mana value less than or equal to the number of cards in its
      // controller's graveyard" - Drown in the Loch.
      if (selector.maxMvFromControllerGraveyard) {
        const gy = requirePlayer(state, found.instance.controllerId).graveyard.length;
        if (manaValue(def.manaCost ?? { generic: 0, colors: {} }) > gy) return false;
      }
      return !isProtectedFromThisSource(state, target.instanceId, controllerId, sourceInstanceId);
    }
    case "permanent": {
      if (target.kind !== "card") return false;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "battlefield") return false;
      const def = requireDefinition(state, found.instance.definitionId);
      // "artifact or enchantment" - any one of the named types qualifies. No
      // list at all means "target permanent", which every battlefield card is.
      if (selector.cardTypes && !selector.cardTypes.some((t) => def.types.includes(t))) return false;
      // "target Forest" - a subtype restriction, same shape as the creature
      // selector's. Any one of the named subtypes qualifies.
      if (selector.subtypes?.length && !selector.subtypes.some((s) => def.subtypes?.includes(s))) return false;
      // "an opponent controls" - your own board is not a legal target, which is
      // the difference between Assassin's Trophy and a spell that can misfire.
      if (selector.controlledBy) {
        const mine = found.instance.controllerId === controllerId;
        if (selector.controlledBy === "you" && !mine) return false;
        if (selector.controlledBy === "opponent" && mine) return false;
      }
      // "noncreature artifact" excludes an Artifact Creature, which is a legal
      // target for plain "target artifact" and not for this.
      if (selector.noncreature && def.types.includes("Creature")) return false;
      // "target **attacking** creature" - asked of the live combat rather than
      // of a remembered list, so a creature taken out of combat stops being one.
      // "Destroy target **blue** permanent" - Red Elemental Blast.
      if (selector.color && !cardColors(def).includes(selector.color)) return false;
      /*
       * "target **colorless nonland** permanent" - Goblin Cratermaker.
       *
       * Colour off the mana cost, like everything else here: a Sol Ring is
       * colourless because it costs {1}, and a Forest is colourless for the same
       * reason - which is exactly why the card says nonland too. Two conditions
       * rather than one, because neither implies the other.
       */
      if (selector.colorless && cardColors(def).length > 0) return false;
      if (selector.nonland && def.types.includes("Land")) return false;
      // "**another** target permanent" / "up to one **other** target nonland
      // permanent" - Flickerwisp, Phelia. The source is never a legal target.
      if (selector.excludeSource && found.instance.instanceId === sourceInstanceId) return false;
      // "with mana value 2 or less" - Portable Hole.
      if (selector.maxManaValue !== undefined && manaValue(def.manaCost ?? { generic: 0, colors: {} }) > selector.maxManaValue) {
        return false;
      }
      // "Destroy target multicolored permanent" - Null Elemental Blast.
      if (selector.multicolored && cardColors(def).length < 2) return false;
      // "with mana value 3 or greater" - Elspeth, Storm Slayer.
      if (selector.minManaValue !== undefined && manaValue(def.manaCost ?? { generic: 0, colors: {} }) < selector.minManaValue) {
        return false;
      }
      if (selector.attacking && state.attackers[found.instance.instanceId] === undefined) return false;
      // "attacking **or blocking**" - Eiganjo. Either map will do.
      if (
        selector.attackingOrBlocking &&
        state.attackers[found.instance.instanceId] === undefined &&
        state.blockers[found.instance.instanceId] === undefined
      ) {
        return false;
      }
      /*
       * "target attacking creature **with lesser power**" - mentor.
       *
       * Compared against the source's power *now*, so a Warboss that has grown
       * can point at things it could not a moment ago - which is what makes
       * mentor snowball. Throws without a source rather than silently accepting
       * everything, exactly as `excludeSource` does: a mentor that quietly
       * stopped comparing would be a free counter on any attacker.
       */
      if (selector.lesserPowerThanSource) {
        if (sourceInstanceId === undefined) {
          throw new Error('A selector with lesserPowerThanSource was asked without a source - "lesser power" has nothing to compare against');
        }
        const source = findInstance(state, sourceInstanceId);
        if (!source) return false;
        if (effectivePower(state, found.instance) >= effectivePower(state, source.instance)) return false;
      }
      return !isProtectedFromThisSource(state, target.instanceId, controllerId, sourceInstanceId);
    }
    case "player":
      return target.kind === "player";
    case "opponent-of-controller":
      return target.kind === "player" && target.playerId !== controllerId;
    case "spell": {
      if (target.kind !== "spell") return false;
      const obj = findStackObject(state, target.stackObjectId);
      // "target spell **or ability**" - Deflecting Swat is the only card in the
      // pool that may point at something that is not a spell.
      if (obj === undefined) return false;
      if (!selector.includeAbilities && !isSpellOnStack(state, obj)) return false;
      // "target **blue** spell" - the colour of the card on the stack.
      if (selector.color) {
        const card = state.stackCards.find((c) => c.instanceId === obj.sourceInstanceId);
        if (!card) return false;
        if (!cardColors(requireDefinition(state, card.definitionId)).includes(selector.color)) return false;
      }
      if (selector.spellType) {
        // "Target instant spell" - read the spell's own card type off the
        // object that put it on the stack.
        const cast = findInstance(state, obj.sourceInstanceId);
        const def = cast ? requireDefinition(state, cast.instance.definitionId) : undefined;
        if (!def || !def.types.includes(selector.spellType)) return false;
      }
      if (selector.notSpellType) {
        // "Target noncreature spell" - the spell must not be of this type.
        const cast = findInstance(state, obj.sourceInstanceId);
        const def = cast ? requireDefinition(state, cast.instance.definitionId) : undefined;
        if (def && def.types.includes(selector.notSpellType)) return false;
      }
      if (selector.maxMvFromControllerGraveyard) {
        const cast = findInstance(state, obj.sourceInstanceId);
        const def = cast ? requireDefinition(state, cast.instance.definitionId) : undefined;
        const gy = requirePlayer(state, obj.controllerId).graveyard.length;
        if (def && manaValue(def.manaCost ?? { generic: 0, colors: {} }) > gy) return false;
      }
      if (selector.multicolored) {
        // "Counter target multicolored spell" - two or more colours.
        const cast = findInstance(state, obj.sourceInstanceId);
        const def = cast ? requireDefinition(state, cast.instance.definitionId) : undefined;
        if (!def || cardColors(def).length < 2) return false;
      }
      return true;
    }
    case "card-in-your-graveyard": {
      if (target.kind !== "card") return false;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "graveyard") return false;
      // "your graveyard" - control of a card outside the battlefield always
      // sits with its owner. Feral Appetite says "a graveyard", anybody's.
      if (!selector.anyGraveyard && found.instance.ownerId !== controllerId) return false;
      const graveDef = requireDefinition(state, found.instance.definitionId);
      if (selector.cardType && !graveDef.types.includes(selector.cardType)) return false;
      // "a creature or land card" - any one of the listed types qualifies.
      if (selector.cardTypes?.length && !selector.cardTypes.some((t) => graveDef.types.includes(t))) return false;
      /*
       * "with mana value X or less", where X is the life gained this turn -
       * Moseo. Evaluated here rather than baked into the selector, because the
       * cap moves during the turn and the legal targets have to move with it.
       */
      if (selector.maxManaValue !== undefined) {
        const cap = evaluateAmount(state, controllerId, selector.maxManaValue, "target mana value cap");
        if (manaValue(graveDef.manaCost ?? { generic: 0, colors: {} }) > cap) return false;
      }
      return true;
    }
    case "card-in-your-exile": {
      if (target.kind !== "card") return false;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "exile") return false;
      // Exile is a shared zone, so "yours" means the cards you own in it.
      if (found.instance.ownerId !== controllerId) return false;
      if (!selector.cardType) return true;
      return requireDefinition(state, found.instance.definitionId).types.includes(selector.cardType);
    }
  }
}

/**
 * Every target this selector could legally be pointed at right now.
 *
 * Exists because "does this card have any legal target?" stopped being a
 * safe assumption the moment counterspells arrived: a counterspell in hand
 * has no legal target at all unless a spell is actually on the stack, so
 * treating it as always-castable would wedge auto-pass into offering a
 * priority window forever.
 */
export function legalTargetsFor(
  state: GameState,
  selector: TargetSelector,
  controllerId: string,
  /** Passed straight through to `isValidTarget` - see the note there. */
  sourceInstanceId?: string,
): StackTarget[] {
  const candidates: StackTarget[] = [];
  for (const player of state.players) {
    if (player.hasLost) continue;
    candidates.push({ kind: "player", playerId: player.id });
    for (const instance of [...player.battlefield, ...player.graveyard]) {
      candidates.push({ kind: "card", instanceId: instance.instanceId });
    }
  }
  for (const obj of state.stack) {
    candidates.push({ kind: "spell", stackObjectId: obj.id });
  }
  return candidates.filter((target) => isValidTarget(state, selector, target, controllerId, sourceInstanceId));
}

/**
 * The target selector an effect uses, or undefined if it doesn't target.
 * Having this in one place means adding a new targeted effect kind can't
 * silently skip target validation - which is how "destroy target creature"
 * would otherwise have been castable with no target at all.
 */
/**
 * How many targets an effect takes, with X already announced.
 *
 * One unless the card says otherwise, which is every card in the pool but two.
 * Read from the selector rather than from however many targets a client sent,
 * so "up to X" is checked against the X that was actually paid for.
 */
export function targetCountOf(
  selector: TargetSelector | undefined,
  chosenX = 0,
): { min: number; max: number } {
  const count =
    selector && "count" in selector && selector.count ? selector.count : undefined;
  if (!count) return { min: 1, max: 1 };
  return { min: count.min, max: count.max === "x" ? chosenX : count.max };
}

/**
 * Every target selector an effect takes, in the order the targets are given -
 * one for almost everything, two for Infectious Bite's dealer-and-recipient.
 *
 * Separate from `targetSelectorOf` (which stays single-valued so its many
 * callers are untouched) and read only where the count genuinely matters:
 * casting, which validates each target against its own selector positionally. A
 * single-selector effect is a one-element list, and a targetless one is empty.
 */
export function targetSelectorsOf(effect: Effect): TargetSelector[] {
  if (effect.kind === "infectiousBite") return [effect.dealer, effect.recipient];
  const single = targetSelectorOf(effect);
  return single ? [single] : [];
}

export function targetSelectorOf(effect: Effect): TargetSelector | undefined {
  switch (effect.kind) {
    case "damage":
      // "deals 1 damage to **that player**" - Spiteful Visions. The player is
      // the event's own payload, attached by pushTrigger, so the trigger chooses
      // nothing and has no selector to offer.
      if (effect.toEventPlayer) return undefined;
      return effect.target;
    case "keenDuel":
      // "you and **target opponent** each reveal" - Keen Duelist.
      return { kind: "opponent-of-controller" };
    case "destroy":
    case "exile":
    case "counter":
    case "returnFromGraveyard":
    case "returnFromExile":
    case "exileGraveyardCard":
    case "preventDamage":
    case "regenerate":
    /*
     * "Move all counters from The Ozolith onto **target creature**" - always
     * targeted, never optional, which is why it sits with this group.
     *
     * Missing from this list is not a compile error and is silent in play: the
     * ability goes on the stack with no target at all, resolves, finds nothing
     * to move the counters onto, and does nothing. It looked exactly like a
     * broken effect handler.
     */
    case "moveAllCounters":
      return effect.target;
    /*
     * The optional cases: the same effect kind is printed both with and
     * without a target, and which it is has to be read off the card rather
     * than assumed.
     *
     * "Target creature gets +2/+2" targets; "{G}: this creature gets +2/+2"
     * does not, and applies to its own source. Likewise Duskshell Crawler's
     * "put a +1/+1 counter on target creature" against "{cost}: put a +1/+1
     * counter on this creature". `loseLife` is the same question asked by
     * `who`: "each opponent loses 1 life" names nobody, "target player loses 1
     * life" names one.
     */
    /*
     * "Choose two target players. Each of them searches their library" -
     * Scheming Symmetry, the one tutor whose searchers are targeted rather
     * than implied. Every other printing names them and carries no selector.
     */
    /*
     * "You may choose new targets for **target spell or ability**." - Deflecting
     * Swat, whose own target is the thing it re-points.
     */
    case "changeTargets":
    case "searchLibrary":
    case "pump":
    case "addCounter":
    case "loseLife":
    case "exileGraveyard":
    /*
     * Flicker's target is the permanent it exiles-and-returns. "Up to one" is
     * the selector's own optionality (Phelia, Flickerwisp), the same way every
     * other "up to one target" is; a compulsory flicker (Cloudshift) reads the
     * same here.
     */
    case "flicker":
    /* Oblivion Ring's ETB: the permanent it exiles until it leaves. */
    case "exileUntilLeaves":
    /* Oust: the creature tucked into its owner's library. */
    case "tuckToLibrary":
      return effect.target;
    /* Guide of Souls' attack payoff points at a target attacking creature. */
    case "addKeywordCounter":
    /* Appa's airbend targets your own nonland permanents. */
    case "airbend":
      return effect.target;
    /*
     * "Untap one or two target attacking creatures" targets; "untap this
     * artifact" does not, and applies to its own source. The same question
     * `pump` and `addCounter` are asked, and it has to be read off the card.
     */
    case "untap":
      return effect.target;
    /*
     * "Gain control of target permanent" - always targeted, so it sits with the
     * unconditional group rather than the optional ones.
     */
    case "gainControl":
      return effect.target;
    /*
     * A copy effect targets only when it copies something other than itself:
     * Scute Swarm copies its own source and names nothing, Kiki-Jiki points at
     * a creature. Missing from here would be silent - the ability would resolve
     * with no target, find nothing to copy, and make no token.
     */
    case "createCopyToken":
      return effect.of === "target" ? effect.target : undefined;
    /*
     * The two-target effect's *first* selector, so every single-selector caller
     * - autoPass's "has any legal target?", the client's target prompt - still
     * gets a sensible answer. The full pair is read by `targetSelectorsOf`,
     * which is what casting validates against.
     */
    case "infectiousBite":
      return effect.dealer;
    /*
     * A sequence targets if one of its steps does, and the targets chosen for
     * the whole are handed to every step - which is right while exactly one
     * step targets, and wrong the moment two do, because they would silently
     * share one choice.
     *
     * Two is refused out loud rather than allowed to look like it works. No
     * card in the pool needs it; the day one does, a sequence needs per-step
     * targets rather than a shared list.
     */
    case "sequence": {
      const targeted = effect.effects.map(targetSelectorOf).filter((s) => s !== undefined);
      if (targeted.length > 1) {
        throw new Error("A sequence with more than one targeted step is not supported");
      }
      return targeted[0];
    }
    /*
     * "you may pay {E}{E}{E}. When you do, ... target attacking creature." -
     * Guide of Souls. The reflexive ability's target is read through the mayPay
     * wrapper so the trigger asks for it (chosen up front, a documented
     * simplification of "when you do").
     */
    case "mayPay":
      return targetSelectorOf(effect.then);
    /* "Target player can't cast spells this turn." - Orim's Chant. */
    case "restrictThisTurn":
      return effect.restriction.kind === "player-cannot-cast" ? { kind: "player" } : undefined;
    /*
     * "...if you control a red permanent other than Ajani, he deals damage ...
     * to **any target**." - Ajani's 0, whose target is inside the condition.
     *
     * Looked through for the same reason a sequence is: the ability targets, and
     * an ability whose selector cannot be found is one the game never asks a
     * target for and which then does nothing at all. The target is chosen when
     * the ability goes on the stack even if the condition later turns out to be
     * false - which is the rule for a spell, and the documented simplification
     * this engine takes for the reflexive triggers it writes as sequences.
     */
    case "conditional": {
      const branches = [effect.then, effect.otherwise]
        .filter((branch): branch is Effect => branch !== undefined)
        .map(targetSelectorOf)
        .filter((s) => s !== undefined);
      if (branches.length > 1) {
        throw new Error("A conditional with more than one targeted branch is not supported");
      }
      return branches[0];
    }
    default:
      return undefined;
  }
}

/**
 * The one target a selector could possibly have, when naming a player leaves no
 * decision to make.
 *
 * "Target opponent discards a card" in a two-player game has exactly one legal
 * answer, and asking for it is a click that teaches the player nothing. This is
 * a *format* rule rather than a card one: the same card in a four-player pod is
 * a real choice and is still asked for, because there is then more than one
 * legal target and this returns undefined.
 *
 * Deliberately limited to selectors that name a player. A creature selector
 * with one legal creature on the table looks like the same situation and is
 * not: the board changes constantly, players routinely mean to target their
 * own thing, and silently aiming a removal spell for somebody is how a game
 * gets lost to an interface. Naming an opponent has no such ambiguity.
 */
export function soleLegalTarget(
  state: GameState,
  selector: TargetSelector,
  controllerId: string,
): StackTarget | undefined {
  if (selector.kind !== "player" && selector.kind !== "opponent-of-controller") return undefined;
  // "Up to one", or a spell that takes two players, is a genuine decision even
  // when the candidates are forced.
  const { min, max } = targetCountOf(selector);
  if (min !== 1 || max !== 1) return undefined;
  const legal = legalTargetsFor(state, selector, controllerId);
  return legal.length === 1 ? legal[0] : undefined;
}
