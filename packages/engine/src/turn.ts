import type { GameState, Phase, Step } from "./types.js";
import { drawCard } from "./state.js";
import { emptyManaPool } from "./mana.js";
import { combatHasFirstStrike, dealCombatDamage } from "./combat.js";

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
  state.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
  state.phase = "beginning";
  state.step = "untap";
}

function runAutomaticStepActions(state: GameState): void {
  const activePlayer = state.players[state.activePlayerIndex]!;

  switch (state.step) {
    case "untap": {
      for (const instance of activePlayer.battlefield) {
        instance.tapped = false;
        instance.summoningSickness = false;
      }
      activePlayer.landsPlayedThisTurn = 0;
      break;
    }
    case "draw": {
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
        for (const instance of player.battlefield) {
          instance.damageMarked = 0;
          instance.deathtouchDamage = false;
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
        emptyManaPool(player);
      }
      break;
    }
    default:
      break;
  }
}
