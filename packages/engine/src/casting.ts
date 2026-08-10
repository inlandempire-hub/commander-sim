import type { CardDefinition, Effect, GameState, ManaCost, StackTarget } from "./types.js";
import { findInstance, log, moveCard, requireDefinition, requirePlayer } from "./state.js";
import { applyCommanderTax, canPayManaCostFromPool, payManaCostFor, spendablePool } from "./mana.js";
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
  /**
   * Which mode of a "choose one" spell is being cast, as an index into its
   * `modal` effect's `modes`. Required for a modal spell and meaningless for
   * anything else. Modes are chosen as part of casting (rule 601.2b), which is
   * also why the targets passed alongside must be legal for *that* mode.
   */
  chosenMode?: number;
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

  // A mode is chosen as the spell is cast, so the modal wrapper is unwrapped
  // here and never reaches the stack. Everything downstream - targeting,
  // resolution, the bot, the client - sees a plain single effect.
  let effect: Effect = def.castEffect ?? { kind: "draw", amount: 0 };
  if (effect.kind === "modal") {
    const modes = effect.modes;
    const chosen = options.chosenMode;
    if (chosen === undefined) throw new Error(`${def.name} is modal - a mode must be chosen`);
    const mode = modes[chosen];
    if (!mode) throw new Error(`${def.name} has no mode ${chosen}`);
    effect = mode.effect;
  }

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

  // Restricted mana counts here and nowhere else: this is the only place that
  // knows *what* is being cast, which is the whole question its restriction
  // asks. See spendablePool in mana.ts.
  if (!canPayManaCostFromPool(spendablePool(player, def), cost)) {
    throw new Error(`${playerId} cannot afford to cast ${def.name}`);
  }
  const restrictionsUsed = payManaCostFor(player, cost, def);
  /*
   * "...and that spell can't be countered." A property of this casting rather
   * than of the card, so it is recorded on the spell on the stack: the same
   * Blech cast without Delighted Halfling's mana is counterable as normal.
   */
  const uncounterable =
    def.cantBeCountered === true || restrictionsUsed.some((used) => used.grantsUncounterable === true);

  moveCard(state, instanceId, "stack");
  log(state, `${playerId} casts ${def.name}`);

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

  pushOntoStack(state, instanceId, playerId, effect, targets, isPermanentSpell, uncounterable);

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

  state.passesInSuccession = 0;
}
