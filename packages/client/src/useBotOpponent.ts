import { useEffect, useRef } from "react";
import { botShouldAct, nextAction, type BotAction } from "@mtg-commander-sim/bot";
import type { GameController } from "./gameController.js";

/**
 * Drives one seat with the bot, through the exact same GameController the
 * human UI uses. Nothing here reaches into the engine directly, so the bot is
 * subject to every rule and validation a human click goes through - per
 * CLAUDE.md, "the bot is just another client".
 *
 * `nextAction` filters the state for the bot's own view before deciding, so
 * sharing one in-memory GameState with the UI still doesn't let it read the
 * human's hand.
 *
 * Implemented as a polling interval rather than an effect keyed on the game
 * state, deliberately. The engine mutates `GameState` in place (see
 * useLocalGameController), so the state object's identity never changes and
 * React can't be relied on to re-run an effect at the right moments - an
 * earlier effect-based version of this hook stalled with the bot holding
 * priority and never waking up again. A timer that re-reads the live state
 * each tick sidesteps the whole question.
 */
export interface BotOpponentOptions {
  /** Milliseconds between bot actions. Slow enough to follow, fast enough not to be annoying. */
  delayMs?: number;
  /** Safety valve: stop after this many actions without the game changing hands. */
  maxConsecutiveActions?: number;
}

export function useBotOpponent(
  controller: GameController,
  botPlayerId: string,
  { delayMs = 450, maxConsecutiveActions = 400 }: BotOpponentOptions = {},
): void {
  // The controller is rebuilt on every render, so the interval reads it from a
  // ref instead of capturing a stale copy in its closure.
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  useEffect(() => {
    let consecutive = 0;

    const timer = setInterval(() => {
      const live = controllerRef.current;
      const state = live.state;
      if (!state) return;
      if (state.players.some((p) => p.hasLost)) return;

      if (!botShouldAct(state, botPlayerId)) {
        consecutive = 0; // it's the human's move - reset the runaway guard
        return;
      }

      if (consecutive >= maxConsecutiveActions) {
        // A heuristic bug that returns the same action forever would otherwise
        // freeze the tab. Stopping leaves the game inspectable instead.
        console.error(`[bot] ${botPlayerId} exceeded ${maxConsecutiveActions} actions in a row - halting.`);
        return;
      }

      const action = nextAction(state, botPlayerId);
      if (!action) return; // consulted, but declining to act (e.g. chose not to block)
      consecutive += 1;
      perform(live, botPlayerId, action);
    }, Math.max(delayMs, 16));

    return () => clearInterval(timer);
  }, [botPlayerId, delayMs, maxConsecutiveActions]);
}

/**
 * Hands one bot decision to the controller.
 *
 * The `never` at the end is load-bearing. This switch previously just ended,
 * so an action kind with no case here was silently dropped - and the bot would
 * sit doing nothing forever while the game waited on it. That is exactly what
 * happened when opening hands were added: the bot decided to keep, nothing
 * performed the keep, and the game stopped at the first untap step. It had
 * already been true of `resolveSearch` for some time, meaning a bot that drew
 * a tutor would have hung the same way.
 *
 * Assigning to `never` makes TypeScript fail the build the next time a bot
 * action is added without being wired up, instead of producing a game that
 * quietly stops.
 */
function perform(controller: GameController, playerId: string, action: BotAction): void {
  switch (action.kind) {
    case "playLand":
      controller.playLand(playerId, action.instanceId);
      return;
    case "castSpell":
      controller.castSpell(playerId, action.instanceId, action.targets, {
        chosenX: action.chosenX,
        sacrificeInstanceId: action.sacrificeInstanceId,
        useAlternativeCost: action.useAlternativeCost,
        fromCommandZone: action.fromCommandZone,
      });
      return;
    case "activateAbility":
      controller.activateAbility(playerId, action.instanceId, action.abilityIndex, action.targets);
      return;
    case "declareAttackers":
      controller.declareAttackers(playerId, action.declarations);
      return;
    case "declareBlockers":
      controller.declareBlockers(playerId, action.declarations);
      return;
    case "resolveSearch":
      controller.resolveSearch(playerId, action.instanceId);
      return;
    case "resolveConfirmation":
      controller.resolveConfirmation(playerId, action.accept);
      return;
    case "chooseTriggerTarget":
      controller.chooseTriggerTarget(playerId, action.target);
      return;
    case "resolveDiscard":
      controller.resolveDiscard(playerId, action.instanceId);
      break;
    case "resolveSacrificeChoice":
      controller.resolveSacrificeChoice(playerId, action.instanceId);
      return;
    case "takeMulligan":
      controller.takeMulligan(playerId);
      return;
    case "keepHand":
      controller.keepHand(playerId);
      return;
    case "putOnBottom":
      controller.putOnBottom(playerId, action.instanceIds);
      return;
    case "passPriority":
      controller.passPriority(playerId);
      return;
    default: {
      const unhandled: never = action;
      throw new Error(`The bot produced an action nothing knows how to perform: ${JSON.stringify(unhandled)}`);
    }
  }
}
