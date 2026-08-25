import type { GameState, StackObject } from "./types.js";
import { cardName, findInstance, log, moveCard, requirePlayer } from "./state.js";
import { canPayManaCost, payManaCost } from "./mana.js";
import { applyEffect } from "./effects.js";
import { putOntoBattlefield, triggerConditionMet } from "./permanents.js";

// pushOntoStack and putOntoBattlefield live in permanents.ts so that effects.ts
// can use them without importing this module (which imports effects.ts).
// Import them from there, not from here - re-exporting would give the package
// index two paths to the same symbol.

/**
 * Resolves the top object of the stack.
 * Permanent spells (creatures/artifacts/etc) move to the battlefield and fire
 * their enters-the-battlefield triggers instead of applying `effect` directly.
 * Triggered/activated abilities have no card of their own on the stack - only
 * spells (instants, sorceries, permanents) do - so only those get moved afterward.
 */
export function resolveTopOfStack(state: GameState): void {
  const obj = state.stack.pop();
  if (!obj) return;

  if (obj.isPermanentSpell) {
    log(state, `${obj.controllerId} resolves ${cardName(state, obj.sourceInstanceId)}`);
    putOntoBattlefield(state, obj.sourceInstanceId, { roomDoor: obj.roomDoor });
    return;
  }

  log(
    state,
    `${obj.controllerId} resolves ${obj.isCopy ? "a copy of " : ""}${cardName(state, obj.sourceInstanceId)}`,
  );

  /*
   * Rule 603.4's second check. An intervening-if is tested again on resolution,
   * and a trigger whose condition has stopped being true does nothing at all.
   *
   * This is the half that is visible in play: Deathreap Ritual triggers because
   * a creature died, and an opponent responding by exiling that creature from
   * the graveyard does not take the draw away - but a condition about the board
   * rather than the turn's history genuinely can be undone in response, and
   * checking only once would let the ability resolve anyway.
   */
  if (obj.onlyIf && !triggerConditionMet(state, obj.controllerId, obj.onlyIf, obj.sourceInstanceId)) {
    log(state, `${cardName(state, obj.sourceInstanceId)} does nothing - its condition is no longer met`);
    finishResolution(state, obj);
    return;
  }

  /*
   * "You may". The ability stops here and asks; `resolveConfirmation` finishes
   * it either way.
   *
   * Deliberately not taken automatically even when the answer looks obvious.
   * "You may draw a card" is a real decision with an empty library, and an
   * engine that drew for you would hand you a loss you never agreed to.
   */
  if (obj.optional) {
    state.pendingConfirmation = {
      playerId: obj.controllerId,
      sourceInstanceId: obj.sourceInstanceId,
      prompt: obj.prompt ?? `${cardName(state, obj.sourceInstanceId)}: use this ability?`,
      object: obj,
    };
    return;
  }

  applyEffect(state, obj.controllerId, obj.sourceInstanceId, obj.effect, obj.targets);
  finishResolution(state, obj);
}

/**
 * Answers a "you may" - `accept` false simply declines, which is always legal.
 *
 * Re-checked against the pending object rather than trusting the caller, the
 * same way `resolveSearch` re-checks the card it is handed: a client cannot
 * answer a question that was asked of somebody else.
 */
export function resolveConfirmation(state: GameState, playerId: string, accept: boolean): void {
  const pending = state.pendingConfirmation;
  if (!pending) throw new Error("No choice is waiting to be resolved");
  if (pending.playerId !== playerId) throw new Error(`The choice belongs to ${pending.playerId}`);

  const obj = pending.object;
  const cost = pending.cost;
  const otherwise = pending.otherwise;
  state.pendingConfirmation = null;

  /*
   * A yes with a price is only a yes if the price is paid - Springheart
   * Nantuko's {1}{G}. A player who says yes and cannot afford it lands on the
   * "if you didn't" branch, which is the same place declining leads, because
   * the card draws no distinction between the two.
   */
  let paid = accept;
  if (accept && cost) {
    const player = requirePlayer(state, playerId);
    const affordable = (!cost.mana || canPayManaCost(player, cost.mana)) && player.life > (cost.life ?? 0);
    if (affordable) {
      if (cost.mana) payManaCost(player, cost.mana);
      if (cost.life) {
        player.life -= cost.life;
        log(state, `${playerId} pays ${cost.life} life`);
      }
    } else {
      paid = false;
    }
  }

  if (paid) {
    applyEffect(state, obj.controllerId, obj.sourceInstanceId, obj.effect, obj.targets);
  } else {
    log(state, `${playerId} declines ${cardName(state, obj.sourceInstanceId)}`);
    // "If you didn't create a token this way, create a 1/1 Insect" - the half
    // of the card that only happens on a no.
    if (otherwise) applyEffect(state, obj.controllerId, obj.sourceInstanceId, otherwise, obj.targets);
  }
  finishResolution(state, obj);
}

/**
 * The last step of resolving anything that is not a permanent spell: a spell
 * card goes to its graveyard, an ability has no card to move.
 *
 * Split out because there are now three ways to reach it - ordinary
 * resolution, a failed intervening-if, and an answered "you may" - and a spell
 * left sitting in the stack zone is invisible everywhere except the bug it
 * causes later.
 */
function finishResolution(state: GameState, obj: StackObject): void {
  // A copy is not a card - it simply ceases to exist. Moving the card its
  // source names would send the *original* spell (still on the stack beneath a
  // Storm copy) to the graveyard early.
  if (obj.isCopy) return;
  const source = findInstance(state, obj.sourceInstanceId);
  if (source && source.instance.zone === "stack") {
    moveCard(state, obj.sourceInstanceId, "graveyard");
  }
}
