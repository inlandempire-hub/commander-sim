import type { GameState, StackObject, StackTarget, TargetSelector, Effect } from "./types.js";
import { findInstance, requireDefinition } from "./state.js";
import { hasKeyword } from "./counters.js";
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

/** Hexproof: can't be the target of a spell/ability controlled by anyone other than its own controller. */
function isProtectedByHexproof(state: GameState, instanceId: string, controllerId: string): boolean {
  const found = findInstance(state, instanceId);
  if (!found) return false;
  if (found.instance.controllerId === controllerId) return false;
  return hasKeyword(state, found.instance, "Hexproof");
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
      return !isProtectedByHexproof(state, target.instanceId, controllerId);
    }
    case "creature": {
      if (target.kind !== "card") return false;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "battlefield") return false;
      const def = requireDefinition(state, found.instance.definitionId);
      if (!def.types.includes("Creature")) return false;
      // "target Insect, Rat, Spider, or Squirrel" - any one of them qualifies.
      if (selector.subtypes?.length && !selector.subtypes.some((s) => def.subtypes?.includes(s))) {
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
      return !isProtectedByHexproof(state, target.instanceId, controllerId);
    }
    case "permanent": {
      if (target.kind !== "card") return false;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "battlefield") return false;
      const def = requireDefinition(state, found.instance.definitionId);
      // "artifact or enchantment" - any one of the named types qualifies. No
      // list at all means "target permanent", which every battlefield card is.
      if (selector.cardTypes && !selector.cardTypes.some((t) => def.types.includes(t))) return false;
      // "an opponent controls" - your own board is not a legal target, which is
      // the difference between Assassin's Trophy and a spell that can misfire.
      if (selector.controlledBy === "opponent" && found.instance.controllerId === controllerId) {
        return false;
      }
      // "noncreature artifact" excludes an Artifact Creature, which is a legal
      // target for plain "target artifact" and not for this.
      if (selector.noncreature && def.types.includes("Creature")) return false;
      // "target **attacking** creature" - asked of the live combat rather than
      // of a remembered list, so a creature taken out of combat stops being one.
      if (selector.attacking && state.attackers[found.instance.instanceId] === undefined) return false;
      return !isProtectedByHexproof(state, target.instanceId, controllerId);
    }
    case "player":
      return target.kind === "player";
    case "opponent-of-controller":
      return target.kind === "player" && target.playerId !== controllerId;
    case "spell": {
      if (target.kind !== "spell") return false;
      const obj = findStackObject(state, target.stackObjectId);
      return obj !== undefined && isSpellOnStack(state, obj);
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

export function targetSelectorOf(effect: Effect): TargetSelector | undefined {
  switch (effect.kind) {
    case "damage":
    case "destroy":
    case "exile":
    case "counter":
    case "returnFromGraveyard":
    case "returnFromExile":
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
    case "searchLibrary":
    case "pump":
    case "addCounter":
    case "loseLife":
    case "exileGraveyard":
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
