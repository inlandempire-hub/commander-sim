import type { GameState, Phase, StackTarget, Step, TriggerEvent } from "./types.js";
import { drawCard, findInstance, log, moveCard, requireDefinition } from "./state.js";
import { emptyManaPool } from "./mana.js";
import { combatHasFirstStrike, dealCombatDamage } from "./combat.js";
import { castSuspended } from "./casting.js";
import { moveControl, pushOntoStack, pushTrigger } from "./permanents.js";
import { effectiveTriggers } from "./counters.js";

const TURN_SEQUENCE: Array<{ phase: Phase; step: Step }> = [
  { phase: "beginning", step: "untap" },
  { phase: "beginning", step: "upkeep" },
  { phase: "beginning", step: "draw" },
  { phase: "precombat-main", step: "main" },
  { phase: "combat", step: "begin-combat" },
  { phase: "combat", step: "declare-attackers" },
  { phase: "combat", step: "declare-blockers" },
  { phase: "combat", step: "first-strike-damage" },
  { phase: "combat", step: "combat-damage" },
  { phase: "combat", step: "end-combat" },
  { phase: "postcombat-main", step: "main" },
  { phase: "ending", step: "end" },
  { phase: "ending", step: "cleanup" },
];

function currentIndex(state: GameState): number {
  return TURN_SEQUENCE.findIndex((s) => s.phase === state.phase && s.step === state.step);
}

/**
 * True for a step that should never actually stop and wait for priority:
 * - untap and cleanup never give a player priority under the real rules
 *   (cleanup's rare exception - a state-based action or a trigger during
 *   cleanup granting a priority round - isn't modeled yet, since nothing in
 *   the current card pool triggers off cleanup).
 * - declare-blockers and the damage steps don't happen at all if no attackers
 *   were declared - there's nothing to block or deal damage with.
 * - the first-strike damage step only exists when something in combat actually
 *   has First Strike or Double Strike (rule 510.4), which is why adding it
 *   changes nothing about a combat without either.
 */
function shouldSkipCurrentStep(state: GameState): boolean {
  if (state.step === "untap" || state.step === "cleanup") return true;
  const noAttackersDeclared = Object.keys(state.attackers).length === 0;
  const damageStep =
    state.step === "declare-blockers" || state.step === "first-strike-damage" || state.step === "combat-damage";
  if (noAttackersDeclared && damageStep) return true;
  if (state.step === "first-strike-damage" && !combatHasFirstStrike(state)) return true;
  return false;
}

/**
 * Advances the game to the next step (or the next turn, after cleanup),
 * running each step's automatic actions, then keeps advancing transparently
 * through any step that shouldn't actually stop for priority (see
 * shouldSkipCurrentStep) until landing on one that should. Explicit player
 * actions within a step (declaring attackers/blockers, casting spells) are
 * handled by their own functions, not here.
 *
 * Simplifications noted for future phases: no discard-to-hand-size in
 * cleanup, mana pools empty once per turn (cleanup) rather than after every
 * step/phase as the full rules require.
 */
export function advanceStep(state: GameState): void {
  do {
    advanceStepOnce(state);
  } while (shouldSkipCurrentStep(state));
}

/**
 * Whether this player passing priority right now gives up the rest of their
 * turn - which is what the pass button says when it reads "End Turn".
 *
 * Deliberately *not* "this pass advances the step". Priority starts with the
 * active player, so on your own end step your pass is never the one that moves
 * the game on; your opponent's is. Labelling by that rule would mean the button
 * never said "End Turn" on your own turn at all, which is the only turn you
 * would ever want to be warned about.
 *
 * What it does say is the thing a player actually cares about: the end step is
 * the last step of your turn that stops for priority (cleanup is always
 * skipped), so once you pass here you will take no further action this turn.
 * An opponent may still respond - and if they put something on the stack the
 * label goes back to "Pass", because then the click resolves that instead.
 */
export function passWouldEndTurn(state: GameState, playerId: string): boolean {
  if (state.players[state.activePlayerIndex]?.id !== playerId) return false;
  if (state.stack.length > 0) return false;
  return state.phase === "ending" && state.step === "end";
}

function advanceStepOnce(state: GameState): void {
  const idx = currentIndex(state);
  const isLastStep = idx === TURN_SEQUENCE.length - 1;

  /*
   * "After this phase, there is an additional combat phase." - Combat
   * Celebrant, Raph & Leo.
   *
   * The turn sequence stays a fixed list and this loops back into it, rather
   * than the list being rewritten mid-turn: everything that asks where the
   * game is asks `phase`/`step`, and a sequence that changed shape underneath
   * `currentIndex` would make that question unanswerable.
   *
   * Taken here, on the way out of end-combat, because that is where the phase
   * genuinely ends - after damage, after the last priority window, and after
   * `attackers` has been cleared, so the new phase starts with nothing
   * declared.
   */
  if (state.step === "end-combat" && state.extraCombatPhases > 0) {
    state.extraCombatPhases -= 1;
    state.phase = "combat";
    state.step = "begin-combat";
    runAutomaticStepActions(state);
    return;
  }

  if (isLastStep) {
    startNextTurn(state);
  } else {
    const next = TURN_SEQUENCE[idx + 1]!;
    state.phase = next.phase;
    state.step = next.step;
  }

  runAutomaticStepActions(state);
}

function startNextTurn(state: GameState): void {
  state.turnNumber += 1;
  // Both belong to the turn. An extra combat phase promised but never reached -
  // the game ended in it, or the permanent left - is not owed to anybody else.
  state.extraCombatPhases = 0;
  state.combatPhasesThisTurn = 0;
  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  state.phase = "beginning";
  state.step = "untap";
}

/**
 * The four steps a card can say "at the beginning of" and mean it.
 *
 * Keyed on phase *and* step, not step alone: a turn has two main phases and
 * both of them are `step: "main"`, so "at the beginning of your first main
 * phase" written against the step would fire twice a turn. Ripples of Undeath
 * milling six cards instead of three is the sort of thing that reads as the
 * card being wrong rather than the turn machine.
 */
const TURN_TRIGGER_EVENTS: Array<{ phase: Phase; step: Step; event: TriggerEvent }> = [
  { phase: "beginning", step: "upkeep", event: "upkeep" },
  { phase: "precombat-main", step: "main", event: "first-main" },
  { phase: "combat", step: "begin-combat", event: "begin-combat" },
  { phase: "ending", step: "end", event: "end-step" },
];

/**
 * Fires everything that triggers "at the beginning of" the step just reached.
 *
 * Whose step it is decides which abilities care: `watches: "controller"` is "at
 * the beginning of *your* upkeep" and only fires on its controller's turn,
 * `watches: "any"` is "at the beginning of *each* upkeep" and fires on
 * everyone's. Ophiomancer makes a Snake on every player's upkeep and Braids
 * only on her controller's, so the distinction is not decoration.
 *
 * The active player's abilities go on the stack first (rule 603.3b, APNAP),
 * which is what `state.players` ordered from `activePlayerIndex` gives.
 */
function fireTurnTriggers(state: GameState): void {
  const match = TURN_TRIGGER_EVENTS.find((t) => t.phase === state.phase && t.step === state.step);
  if (!match) return;
  const activePlayerId = state.players[state.activePlayerIndex]!.id;

  for (let offset = 0; offset < state.players.length; offset++) {
    const player = state.players[(state.activePlayerIndex + offset) % state.players.length]!;
    for (const instance of [...player.battlefield]) {
      for (const trigger of effectiveTriggers(state, instance)) {
        if (trigger.event !== match.event) continue;
        if ((trigger.watches ?? "controller") === "controller" && player.id !== activePlayerId) continue;
        pushTrigger(state, instance.instanceId, player.id, trigger);
      }
    }
  }
}

function runAutomaticStepActions(state: GameState): void {
  const activePlayer = state.players[state.activePlayerIndex]!;

  switch (state.step) {
    case "upkeep": {
      /*
       * Suspend: "At the beginning of your upkeep, remove a time counter. When
       * the last is removed, cast it without paying its mana cost."
       *
       * The exile zone is scanned rather than a list being kept, for the same
       * reason land drops are counted fresh: no second place for the answer to
       * go stale. The card is cast immediately when the last counter goes,
       * which is a shortcut - the real rule puts a trigger on the stack first -
       * and it is the same one every other "then do it" here takes.
       */
      for (const card of [...activePlayer.exile]) {
        if (card.timeCounters <= 0) continue;
        card.timeCounters -= 1;
        log(state, `${requireDefinition(state, card.definitionId).name} loses a time counter`);
        if (card.timeCounters === 0) castSuspended(state, activePlayer.id, card.instanceId);
      }
      break;
    }
    case "untap": {
      for (const instance of activePlayer.battlefield) {
        /*
         * "An exerted creature won't untap during your next untap step."
         *
         * Cleared as it is skipped, so the permanent untaps normally the turn
         * after - the flag is spent here, which is the whole of what exert is.
         * Summoning sickness still wears off: an exerted creature is not a new
         * arrival, it is simply still tapped.
         */
        if (instance.exerted) {
          instance.exerted = false;
          log(state, `${requireDefinition(state, instance.definitionId).name} was exerted and does not untap`);
        } else {
          instance.tapped = false;
        }
        instance.summoningSickness = false;
      }
      activePlayer.landsPlayedThisTurn = 0;
      break;
    }
    case "draw": {
      /*
       * "Skip your draw step." - Necrodominance. Checked on the board rather
       * than remembered on the player, so an enchantment that leaves gives the
       * draw back on the next turn without anything having to undo it.
       */
      {
        const active = state.players[state.activePlayerIndex];
        const skipped = active?.battlefield.some(
          (c) => state.cardDefinitions[c.definitionId]?.staticRules?.skipDrawStep,
        );
        if (active && skipped) {
          log(state, `${active.id} skips their draw step`);
          break;
        }
      }
      // Rule 103.7a: in a two-player game the player going first skips the
      // draw step of their first turn, since they already have the advantage
      // of acting first.
      //
      // This went unimplemented for a long time because it was invisible - a
      // hand of eight looks much like a hand of seven when you have never
      // counted them. The mulligan made it obvious: keeping six and then
      // finding seven cards in hand reads as the mulligan being broken.
      const isOpeningTurn = state.turnNumber === 1 && state.players.length === 2;
      if (!isOpeningTurn) drawCard(state, activePlayer.id, 1);
      break;
    }
    case "begin-combat": {
      // Counted on the way in, so "if it's the first combat phase of the turn"
      // reads 1 throughout the ordinary combat and 2 in the first extra one.
      state.combatPhasesThisTurn += 1;
      break;
    }
    case "first-strike-damage": {
      dealCombatDamage(state, "first-strike");
      break;
    }
    case "combat-damage": {
      dealCombatDamage(state, "regular");
      break;
    }
    case "end-combat": {
      state.attackers = {};
      state.blockers = {};
      state.blockersDeclared = false;
      for (const player of state.players) {
        for (const instance of player.battlefield) instance.removedFromCombat = false;
      }
      break;
    }
    case "cleanup": {
      for (const player of state.players) {
        // "The amount of life you gained **this turn**" - the tally belongs to
        // the turn, so it ends with it.
        player.lifeGainedThisTurn = 0;
        // Both tallies the hate pieces read. Archon of Emeria's limit and
        // Spirit of the Labyrinth's are per turn, so they reset with it.
        player.spellTypesCastThisTurn = [];
        player.cardsDrawnThisTurn = 0;
      }
      /*
       * "Your maximum hand size is five." - Necrodominance, and the ordinary
       * seven everyone else has.
       *
       * Discarded from the back of the hand rather than chosen, which is a real
       * simplification: the rules make it the player's choice. It is here at
       * all because a Necrodominance deck draws itself into this every turn,
       * and a hand size nobody enforces would make the card strictly better
       * than printed.
       */
      for (const player of state.players) {
        let limit = 7;
        for (const instance of player.battlefield) {
          const rule = state.cardDefinitions[instance.definitionId]?.staticRules?.maxHandSize;
          if (rule !== undefined) limit = Math.min(limit, rule);
        }
        while (player.hand.length > limit) {
          const last = player.hand[player.hand.length - 1]!;
          log(state, `${player.id} discards ${requireDefinition(state, last.definitionId).name} to hand size`);
          moveCard(state, last.instanceId, "graveyard");
        }
      }
      for (const player of state.players) {
        for (const instance of player.battlefield) instance.loyaltyUsedThisTurn = false;
      }
      for (const player of state.players) {
        for (const instance of player.battlefield) {
          instance.damageMarked = 0;
          instance.deathtouchDamage = false;
          instance.grantedKeywords = []; // Heroic Intervention's hexproof wears off with everything else
          instance.grantedTriggers = []; // as does Root Manipulation's granted ability
          instance.temporaryPowerBonus = 0; // "until end of turn" effects wear off here
          instance.temporaryToughnessBonus = 0;
          instance.damagePrevention = 0;
          // "The next time it would be destroyed *this turn*" - an unused
          // regeneration shield does not carry into the next turn.
          instance.regenerationShields = 0;
        }
        // Unspent prevention expires with the turn too - "prevent the next 3
        // damage this turn" is not a shield you get to keep.
        player.damagePrevention = 0;
        // "Counters you've put on creatures this turn" - the turn ends here, so
        // the tally does. Cleanup rather than untap, because Iridescent
        // Hornbeetle reads it during the end step, which is still this turn.
        player.plusOneCountersPlacedThisTurn = 0;
        emptyManaPool(player);
      }
      // "If a creature died *this turn*" - the turn ends here, so the count
      // does too. Cleanup rather than untap because a card could ask about it
      // during an opponent's end step, which is still this turn.
      state.creatureDeathsThisTurn = 0;
      // "Prevent all combat damage ... this turn" ends with the turn.
      state.combatDamagePrevention = null;
      returnTemporaryControl(state);
      // "Your opponents can't cast spells **this turn**" - Silence. Ends here
      // rather than when its spell left the stack, which is the whole point of
      // holding it on the turn instead of on a permanent.
      state.turnRestrictions = [];
      break;
    }
    default:
      break;
  }

  // After the step's automatic actions, so an upkeep trigger goes on the stack
  // above nothing and a draw-step trigger sees the card already drawn.
  fireTurnTriggers(state);
  fireDelayedTriggers(state);
}

/**
 * Puts every delayed trigger whose end step has arrived onto the stack.
 *
 * After `fireTurnTriggers`, so a permanent's own end-step ability goes on the
 * stack below this and therefore resolves after it. That ordering is a
 * simplification - the real rules let the player order simultaneous triggers
 * they control - and it is invisible for the two cards here, whose delayed
 * abilities only sacrifice or exile tokens nothing else in the pool watches.
 *
 * Each trigger is removed from the list as it is pushed, whether or not its
 * permanents are still there: a token that already died takes its scheduled
 * sacrifice with it, and the ability does not wait around for another turn.
 */
function fireDelayedTriggers(state: GameState): void {
  if (!(state.phase === "ending" && state.step === "end")) return;

  const due = state.delayedTriggers.filter((trigger) => state.turnNumber >= trigger.readyOnTurn);
  if (due.length === 0) return;
  state.delayedTriggers = state.delayedTriggers.filter((trigger) => !due.includes(trigger));

  for (const trigger of due) {
    /*
     * Only the permanents still on the battlefield. A token that was destroyed,
     * bounced or exiled in the meantime is simply not there, and the ability
     * resolving over an empty list does nothing - which is the rule rather than
     * a shortcut.
     */
    const targets: StackTarget[] = trigger.instanceIds
      .filter((instanceId) => findInstance(state, instanceId)?.instance.zone === "battlefield")
      .map((instanceId) => ({ kind: "card", instanceId }));
    if (targets.length === 0) continue;
    pushOntoStack(
      state,
      trigger.sourceInstanceId,
      trigger.controllerId,
      { kind: "delayedRemoval", action: trigger.action },
      targets,
      false,
    );
  }
}

/**
 * Hands back everything somebody took until end of turn.
 *
 * In the cleanup step with the rest of the turn's state, and as its own pass
 * over a copied list because handing a permanent back moves it between two
 * players' battlefield arrays - mutating the array being iterated is how a
 * second stolen creature would get skipped.
 *
 * A creature going home is summoning-sick for the player it returns to, which
 * is rule 302.6 read the other way round: they have not controlled it
 * continuously since their turn began either. It costs nothing in practice,
 * because their untap step clears it before they could use it.
 */
function returnTemporaryControl(state: GameState): void {
  const stolen = state.players.flatMap((player) =>
    player.battlefield.filter((instance) => instance.controlGainedFrom !== undefined),
  );
  for (const instance of stolen) {
    const returnTo = instance.controlGainedFrom!;
    delete instance.controlGainedFrom;
    if (returnTo === instance.controllerId) continue;
    moveControl(state, instance, returnTo);
    log(state, `${requireDefinition(state, instance.definitionId).name} returns to ${returnTo}`);
  }
}
