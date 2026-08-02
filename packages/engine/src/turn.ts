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
 * Simplifications noted for future phases: no "skip first draw step" rule,
 * no discard-to-hand-size in cleanup, mana pools empty once per turn
 * (cleanup) rather than after every step/phase as the full rules require.
 */
export function advanceStep(state: GameState): void {
  do {
    advanceStepOnce(state);
  } while (shouldSkipCurrentStep(state));
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
      drawCard(state, activePlayer.id, 1);
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
      break;
    }
    case "cleanup": {
      for (const player of state.players) {
        for (const instance of player.battlefield) {
          instance.damageMarked = 0;
          instance.deathtouchDamage = false;
          instance.temporaryPowerBonus = 0; // "until end of turn" effects wear off here
          instance.temporaryToughnessBonus = 0;
        }
        emptyManaPool(player);
      }
      break;
    }
    default:
      break;
  }
}
