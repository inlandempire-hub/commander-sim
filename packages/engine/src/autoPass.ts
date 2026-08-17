import { blockProblem } from "./combat.js";
import { castRestrictionProblem } from "./restrictions.js";
import type { Effect, GameState, ManaCost } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";
import { applyCommanderTax, canPayManaCostFromPool, couldAfford } from "./mana.js";
import { canCastAtSorcerySpeed, canPayAdditionalCost, landDropsAllowed } from "./casting.js";
import { controllerMeets } from "./conditions.js";
import { legalTargetsFor, targetSelectorOf } from "./targeting.js";
import { costWithX, requiresX } from "./x.js";
import { hasKeyword } from "./counters.js";

const EMPTY_COST: ManaCost = { generic: 0, colors: {} };

/**
 * A targeted effect with nothing legal to point at isn't a legal action, and
 * treating it as one would leave a player stuck being asked for priority they
 * can't use. Untargeted effects are always fine.
 */
function hasSomethingToTarget(
  state: GameState,
  playerId: string,
  effect: Effect | undefined,
  /** The permanent whose ability this is, for a selector that says "another". */
  sourceInstanceId?: string,
): boolean {
  if (!effect) return true;
  const selector = targetSelectorOf(effect);
  if (!selector) return true;
  return legalTargetsFor(state, selector, playerId, sourceInstanceId).length > 0;
}

/**
 * Whether this specific card in `playerId`'s hand or command zone can be
 * played right now: correct timing window, affordable from mana they could
 * still produce (not just what's floating), and - if it needs a target -
 * something legal to point it at.
 *
 * Exported because the UI needs to answer exactly this question to highlight
 * the cards you can actually play. It reads the same rules `hasAnyLegalAction`
 * does, rather than the client keeping its own approximation that drifts.
 */
export function canPlayCardNow(state: GameState, playerId: string, instanceId: string): boolean {
  const player = requirePlayer(state, playerId);
  const inHand = player.hand.find((c) => c.instanceId === instanceId);
  const inCommand = player.command.find((c) => c.instanceId === instanceId);
  const instance = inHand ?? inCommand;
  if (!instance) return false;

  const isMainPhaseWindow = canCastAtSorcerySpeed(state, playerId);
  const def = requireDefinition(state, instance.definitionId);

  /*
   * A hate piece makes a card unplayable as surely as an empty mana pool does,
   * so the highlight has to know: without this the client lit a card up, the
   * player clicked it, and the engine threw. See restrictions.ts.
   */
  if (castRestrictionProblem(state, playerId, def, inCommand ? "command" : "hand")) return false;

  if (inCommand) {
    if (!isMainPhaseWindow) return false;
    const timesCast = player.commanderCastCount[instance.instanceId] ?? 0;
    return couldAfford(state, playerId, applyCommanderTax(def.manaCost ?? EMPTY_COST, timesCast));
  }

  /*
   * A modal double-faced card is playable if *either* face is - the land on the
   * back of Bala Ged Recovery is a land drop even when the sorcery on the front
   * is unaffordable, and a card that lit up only for its front face would be
   * telling you the land was not there.
   */
  const back = def.backFaceId ? requireDefinition(state, def.backFaceId) : undefined;
  if (back?.types.includes("Land") && isMainPhaseWindow && hasLandDropLeft(state, playerId)) return true;

  const castableAnytime = def.types.includes("Instant") || (def.keywords?.includes("Flash") ?? false);
  if (!castableAnytime && !isMainPhaseWindow) return false;

  if (def.types.includes("Land")) {
    return isMainPhaseWindow && hasLandDropLeft(state, playerId);
  }

  /*
   * An additional cost that cannot be paid makes the spell uncastable, not
   * merely a bad idea (rule 601.2f) - so a card lit up on mana alone would be
   * offering Tend the Pests with an empty board and then refusing it.
   *
   * X is passed as 0 because that is the cheapest legal announcement: the
   * question here is whether the card can be cast *at all*, and Toxic Deluge
   * for X = 0 always can be.
   */
  if (!canPayAdditionalCost(state, playerId, def, 0)) return false;

  /*
   * "You may cast this spell without paying its mana cost" - affordable
   * whatever the pool holds, as long as its condition is met. Without this the
   * card sits greyed out in a hand that could cast it for free.
   */
  if (def.alternativeCost && controllerMeets(state, playerId, def.alternativeCost.condition)) {
    return hasSomethingToTarget(state, playerId, def.castEffect);
  }

  // Planned rather than summed: a pool counts a dual land once per colour it
  // makes, so this used to light up cards the engine would then refuse.
  if (!couldAfford(state, playerId, def.manaCost ?? EMPTY_COST)) return false;
  return hasSomethingToTarget(state, playerId, def.castEffect);
}

/**
 * Whether this player has a land drop left - one a turn, plus whatever their
 * permanents grant.
 *
 * A helper rather than the bare `< 1` this used to be, because Icetill Explorer
 * makes the cap a board reading. Every place that asked the old question has to
 * ask this one, or a second land sits greyed out in hand while `playLand`
 * would happily take it.
 */
function hasLandDropLeft(state: GameState, playerId: string): boolean {
  return requirePlayer(state, playerId).landsPlayedThisTurn < landDropsAllowed(state, playerId);
}

/**
 * Every value of {X} this player could actually pay for right now, lowest
 * first, counting mana they could still produce rather than only what is
 * floating.
 *
 * Exported because the UI has to offer the choice, and the list has to be the
 * one the engine will accept - a chooser that offered X = 5 and then had the
 * cast refused would be worse than no chooser.
 *
 * Always includes 0: casting The Meathook Massacre for nothing is legal, and
 * occasionally right when you only want the two death triggers on the board.
 * Capped so a board with a hundred lands does not produce a hundred buttons;
 * nothing in the pool wants an X anywhere near it.
 */
export function affordableXValues(
  state: GameState,
  playerId: string,
  instanceId: string,
  cap = 20,
): number[] {
  const player = requirePlayer(state, playerId);
  const instance = player.hand.find((c) => c.instanceId === instanceId);
  if (!instance) return [];
  const def = requireDefinition(state, instance.definitionId);
  /*
   * Toxic Deluge prints no {X} in its mana cost at all - its X is the life in
   * the additional cost - so a check on the mana cost alone would offer no
   * chooser and cast it for nothing.
   */
  const lifeX =
    def.additionalCost?.kind === "pay-life" &&
    typeof def.additionalCost.amount !== "number" &&
    def.additionalCost.amount.kind === "x";
  if (!requiresX(def.manaCost) && !lifeX) return [];

  const affordable: number[] = [];
  for (let x = 0; x <= cap; x++) {
    // Planned per value of X rather than compared against one summed pool: the
    // pool counts a dual land twice, so it offered X values that could not be
    // paid for - and this list is what the X picker shows.
    if (!couldAfford(state, playerId, costWithX(def.manaCost ?? EMPTY_COST, x))) break;
    // And the life, which is the whole limit on Toxic Deluge: you may pay down
    // to nothing and no further.
    if (!canPayAdditionalCost(state, playerId, def, x)) break;
    affordable.push(x);
  }
  return affordable;
}

/**
 * Whether `playerId` has any legal action available right now, given
 * whatever priority window they're currently in. Always checks instants and
 * non-mana activated abilities (legal at any time you have priority); only
 * checks sorcery-speed cards, playing a land, and casting the commander
 * from the command zone when it's actually this player's own main phase
 * with an empty stack. "Affordable" accounts for mana they could still
 * generate from untapped sources, not just what's already floating, and a
 * targeted card only counts when something legal exists to target.
 */
export function hasAnyLegalAction(state: GameState, playerId: string): boolean {
  const player = requirePlayer(state, playerId);
  const isMainPhaseWindow = canCastAtSorcerySpeed(state, playerId);

  for (const instance of [...player.hand, ...player.command]) {
    if (canPlayCardNow(state, playerId, instance.instanceId)) return true;
  }

  for (const instance of player.battlefield) {
    if (instance.tapped) continue;
    const def = requireDefinition(state, instance.definitionId);
    if (def.types.includes("Creature") && instance.summoningSickness) continue;
    for (const ability of def.activatedAbilities ?? []) {
      // A mana ability alone isn't a meaningful action, whichever shape it is.
      if (ability.effect.kind === "addMana" || ability.effect.kind === "addManaCombination") continue;
      if (
        !couldAfford(
          state,
          playerId,
          ability.cost.mana ?? EMPTY_COST,
          ability.cost.tap ? instance.instanceId : undefined,
        )
      ) {
        continue;
      }
      // "Activate only if you control a Swamp" - an ability you may not
      // activate is not an action, and offering it stops the turn for nothing.
      if (!controllerMeets(state, playerId, ability.activateOnlyIf)) continue;
      // Life is a cost like any other: an ability you cannot pay for is not an
      // action, and offering it stops the turn for something you can't do.
      if (ability.cost.payLife !== undefined && player.life < ability.cost.payLife) continue;
      if (hasSomethingToTarget(state, playerId, ability.effect, instance.instanceId)) return true;
    }
  }

  return false;
}

/** Does this player have any creature that could legally be declared as an attacker right now? */
export function hasEligibleAttacker(state: GameState, playerId: string): boolean {
  const player = requirePlayer(state, playerId);
  return player.battlefield.some((instance) => {
    if (instance.tapped) return false;
    const def = requireDefinition(state, instance.definitionId);
    if (!def.types.includes("Creature")) return false;
    if (hasKeyword(state, instance, "Defender")) return false;
    if (instance.summoningSickness && !hasKeyword(state, instance, "Haste")) return false;
    return true;
  });
}

/** Does this player have any creature that could legally block something right now? */
export function hasEligibleBlocker(state: GameState, playerId: string): boolean {
  const player = requirePlayer(state, playerId);
  const attackerIds = Object.keys(state.attackers);
  if (attackerIds.length === 0) return false;
  /*
   * "Untapped creature" is not the question - "could this creature block
   * something that is actually attacking" is.
   *
   * Until 2026-08-16 this only asked the first, so a lone flyer coming at a
   * board of ground creatures still stopped the game at declare-blockers and
   * made the defender confirm a decision the rules never offered them. Asking
   * `blockProblem` means the evasion rules are consulted once, in the place
   * that owns them, rather than approximated here - and any evasion added
   * later is picked up for free.
   */
  return player.battlefield.some((instance) => {
    if (instance.tapped) return false;
    if (!requireDefinition(state, instance.definitionId).types.includes("Creature")) return false;
    return attackerIds.some(
      (attackerId) => blockProblem(state, playerId, instance.instanceId, attackerId) === null,
    );
  });
}

/**
 * Stops that are not a matter of taste.
 *
 * These are the points where passing would take a decision away from the
 * player rather than save them a click - a declaration the rules require of
 * them, or a window that cannot be reopened. They are separated out because
 * the client lets you configure which steps to stop at, and no preference
 * should be able to switch off the step where you declare your blockers. A
 * setting that quietly stops you blocking is not a setting, it is a bug you
 * chose.
 */
export function mustNotAutoPass(state: GameState, playerId: string): boolean {
  // The game is mid-spell: a search is waiting on someone to name a card, and
  // nothing else happens until they do.
  // Nobody has priority at all until every opening hand is settled.
  if (state.mulligan) return true;
  if (state.pendingSearch) return true;
  // And for a permanent that entered and is waiting to be told what it chose.
  if (state.pendingEnterChoice) return true;
  // Same for a "you may" trigger waiting on a yes or no.
  if (state.pendingConfirmation) return true;
  // And for a trigger that has not been pointed at anything yet.
  if (state.pendingTargetChoices.length > 0) return true;
  // And for an opponent who owes a discard.
  if (state.pendingDiscards.length > 0) return true;
  if (state.pendingSacrifice) return true;
  if (state.pendingCardChoices.length > 0) return true;
  if (state.pendingAmount) return true;
  // And for a protection ability waiting on a colour to be named.
  if (state.pendingColorChoice) return true;

  const activePlayerId = state.players[state.activePlayerIndex]?.id;

  if (state.step === "declare-attackers" && playerId === activePlayerId) {
    if (hasEligibleAttacker(state, playerId)) return true;
  }
  if (state.step === "declare-blockers" && playerId !== activePlayerId) {
    if (hasEligibleBlocker(state, playerId)) return true;
  }

  /*
   * Nobody may be auto-passed out of the declare-blockers step before blocks
   * are actually on the table.
   *
   * Declaring blockers is a turn-based action at the *start* of the step
   * (rule 509.1) and priority happens after it - but this engine advances
   * into the step and hands the attacker priority straight away. Auto-passing
   * there spends the attacker's only chance to respond to blocks they have
   * not seen yet, which is precisely when a combat trick gets played.
   *
   * It only bit in bot mode: a human declares blocks by hand before anyone
   * passes, so hotseat happened to order it correctly by accident.
   */
  if (state.step === "declare-blockers" && !state.blockersDeclared) {
    const defenderStillToDecide = state.players.some(
      (p) => p.id !== activePlayerId && hasEligibleBlocker(state, p.id),
    );
    if (defenderStillToDecide) return true;
  }

  return false;
}

/**
 * Should `playerId`'s priority be auto-passed instead of asked for? True
 * whenever they have nothing productive to do in the current step - this is
 * what lets an empty main phase fast-forward into combat, an attacker-less
 * turn skip straight through, and so on, as one general rule rather than a
 * pile of special cases.
 *
 * This is the engine's own answer, and the floor the client builds on: see
 * the client's stops.ts, which may ask for *more* stops than this but never
 * fewer than `mustNotAutoPass` allows.
 */
export function shouldAutoPass(state: GameState, playerId: string): boolean {
  if (mustNotAutoPass(state, playerId)) return false;
  return !hasAnyLegalAction(state, playerId);
}
