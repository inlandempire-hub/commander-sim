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
      // "target creature that was dealt damage this turn" - You Are Already Dead.
      if (selector.damagedThisTurn && !found.instance.damagedThisTurn) return false;
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
      // "target Forest" - a subtype restriction, same shape as the creature
      // selector's. Any one of the named subtypes qualifies.
      if (selector.subtypes?.length && !selector.subtypes.some((s) => def.subtypes?.includes(s))) return false;
      // "an opponent controls" - your own board is not a legal target, which is
      // the difference between Assassin's Trophy and a spell that can misfire.
      if (selector.controlledBy === "opponent" && found.instance.controllerId === controllerId) {
        return false;
      }
      // "noncreature artifact" excludes an Artifact Creature, which is a legal
      // target for plain "target artifact" and not for this.
      if (selector.noncreature && def.types.includes("Creature")) return false;
      return !isProtectedByHexproof(state, target.instanceId, controllerId);
    }
    case "player":
      return target.kind === "player";
    case "opponent-of-controller":
      return target.kind === "player" && target.playerId !== controllerId;
    case "spell": {
      if (target.kind !== "spell") return false;
      const obj = findStackObject(state, target.stackObjectId);
      if (obj === undefined || !isSpellOnStack(state, obj)) return false;
      if (selector.spellType) {
        // "Target instant spell" - read the spell's own card type off the
        // object that put it on the stack.
        const cast = findInstance(state, obj.sourceInstanceId);
        const def = cast ? requireDefinition(state, cast.instance.definitionId) : undefined;
        if (!def || !def.types.includes(selector.spellType)) return false;
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
export function legalTargetsFor(state: GameState, selector: TargetSelector, controllerId: string): StackTarget[] {
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
  return candidates.filter((target) => isValidTarget(state, selector, target, controllerId));
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
