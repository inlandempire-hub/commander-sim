import type { GameState, StackObject, StackTarget, TargetSelector, Effect } from "./types.js";
import { findInstance, requireDefinition } from "./state.js";

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
  return requireDefinition(state, found.instance.definitionId).keywords?.includes("Hexproof") ?? false;
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
      return !isProtectedByHexproof(state, target.instanceId, controllerId);
    }
    case "permanent": {
      if (target.kind !== "card") return false;
      const found = findInstance(state, target.instanceId);
      if (!found || found.instance.zone !== "battlefield") return false;
      if (!requireDefinition(state, found.instance.definitionId).types.includes(selector.cardType)) return false;
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
      // "your graveyard" - a card in a graveyard is owned by whoever owns it,
      // and control of a card in a graveyard always sits with its owner.
      if (found.instance.ownerId !== controllerId) return false;
      if (!selector.cardType) return true;
      return requireDefinition(state, found.instance.definitionId).types.includes(selector.cardType);
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
      return effect.target;
    // `pump` is the one optional case: "target creature gets +2/+2" targets,
    // but "{G}: this creature gets +2/+2" is the same effect with no target,
    // applying to its own source.
    case "pump":
      return effect.target;
    default:
      return undefined;
  }
}
