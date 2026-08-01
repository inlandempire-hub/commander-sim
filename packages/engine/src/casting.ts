import type { CardDefinition, GameState, ManaCost, StackTarget } from "./types.js";
import { findInstance, moveCard, requireDefinition, requirePlayer } from "./state.js";
import { applyCommanderTax, payManaCost, canPayManaCost } from "./mana.js";
import { pushOntoStack, putOntoBattlefield } from "./permanents.js";
import { isValidTarget, targetSelectorOf } from "./targeting.js";
import { attemptWardPayments } from "./ward.js";

const PERMANENT_TYPES = new Set(["Creature", "Artifact", "Enchantment", "Planeswalker", "Battle", "Land"]);

/** Flash lets an otherwise sorcery-speed card (almost always a creature) be cast like an instant. */
function isSorcerySpeedOnly(def: CardDefinition): boolean {
  return !def.types.includes("Instant") && !(def.keywords?.includes("Flash") ?? false);
}

/** Sorcery-speed casting requires: you're the active player, it's a main phase, and the stack is empty. */
export function canCastAtSorcerySpeed(state: GameState, playerId: string): boolean {
  const isMainPhase = state.phase === "precombat-main" || state.phase === "postcombat-main";
  return state.players[state.activePlayerIndex]?.id === playerId && isMainPhase && state.stack.length === 0;
}

export interface CastOptions {
  /** Cast the player's commander from the command zone (applies commander tax) instead of from hand. */
  fromCommandZone?: boolean;
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

  const expectedZone = options.fromCommandZone ? "command" : "hand";
  if (instance.zone !== expectedZone) {
    throw new Error(`${instanceId} is not in ${playerId}'s ${expectedZone} zone`);
  }
  if (instance.ownerId !== playerId) {
    throw new Error(`${playerId} does not own ${instanceId}`);
  }

  const def = requireDefinition(state, instance.definitionId);
  const isPermanentSpell = def.types.some((t) => PERMANENT_TYPES.has(t));

  if (isSorcerySpeedOnly(def) && !canCastAtSorcerySpeed(state, playerId)) {
    throw new Error(`${def.name} can only be cast at sorcery speed`);
  }

  let cost: ManaCost = def.manaCost ?? { generic: 0, colors: {} };
  if (options.fromCommandZone) {
    const timesCast = player.commanderCastCount[instance.instanceId] ?? 0;
    cost = applyCommanderTax(cost, timesCast);
  }

  const effect = def.castEffect ?? { kind: "draw", amount: 0 };

  // Validated before anything is paid or moved. Every throw below this point
  // would otherwise leave the game half-cast - mana spent and the card sitting
  // on the stack - and an illegal target is the easy way to hit that now that
  // targets can disappear in response to a spell.
  const selector = targetSelectorOf(effect);
  if (selector) {
    if (targets.length === 0) throw new Error(`${def.name} requires a target`);
    for (const target of targets) {
      if (!isValidTarget(state, selector, target, playerId)) {
        throw new Error(`Illegal target for ${def.name}`);
      }
    }
  }

  if (!canPayManaCost(player, cost)) {
    throw new Error(`${playerId} cannot afford to cast ${def.name}`);
  }
  payManaCost(player, cost);

  moveCard(state, instanceId, "stack");

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

  pushOntoStack(state, instanceId, playerId, effect, targets, isPermanentSpell);

  state.passesInSuccession = 0;
}

/** Playing a land is not "casting a spell" - it doesn't use the stack and is capped at one per turn. */
export function playLand(state: GameState, playerId: string, instanceId: string): void {
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
  if (!def.types.includes("Land")) throw new Error(`${def.name} is not a land`);
  if (!canCastAtSorcerySpeed(state, playerId)) throw new Error("Lands can only be played at sorcery speed");
  if (player.landsPlayedThisTurn >= 1) throw new Error(`${playerId} has already played a land this turn`);

  // Via putOntoBattlefield rather than moveCard, so a land carrying an
  // enters-the-battlefield trigger fires it like any other permanent would.
  putOntoBattlefield(state, instanceId);
  player.landsPlayedThisTurn += 1;

  // Landfall: any permanent this player controls declaring it triggers whenever a land
  // enters the battlefield under their control - not just the land itself.
  for (const permanent of player.battlefield) {
    const permanentDef = requireDefinition(state, permanent.definitionId);
    for (const trigger of permanentDef.triggeredAbilities ?? []) {
      if (trigger.event === "landfall") {
        pushOntoStack(state, permanent.instanceId, playerId, trigger.effect, [], false);
      }
    }
  }

  state.passesInSuccession = 0;
}
