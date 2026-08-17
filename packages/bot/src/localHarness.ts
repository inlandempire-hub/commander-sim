import {
  activateAbilityWithAutoTap,
  castSpellWithAutoTap,
  resolveEnterChoice,
  declareAttackers,
  declareBlockers,
  resolveSearch,
  resolveConfirmation,
  chooseTriggerTargets,
  resolveDiscard,
  resolveSacrificeChoice,
  resolveCardChoice,
  resolveAmountChoice,
  takeMulligan,
  keepHand,
  putOnBottom,
  passPriority,
  playLand,
  type GameState,
} from "@mtg-commander-sim/engine";
import { castOptionsFor, type BotAction } from "./types.js";

/**
 * Applies a BotAction straight to an in-memory GameState.
 *
 * Used by the headless tests and by bot-vs-bot simulation. The browser
 * opponent goes through the client's GameController instead (so hotseat and
 * networked play share one code path), and the standalone runner serializes
 * to ClientMessages - but all three ultimately land on these same engine
 * functions, which is the point of CLAUDE.md's "the bot is just another
 * client" rule.
 */
export function applyBotAction(state: GameState, playerId: string, action: BotAction): void {
  switch (action.kind) {
    case "playLand":
      playLand(state, playerId, action.instanceId);
      return;
    // The auto-tap variants, matching the client's controller and the server.
    // This harness used the raw ones, which made it the only path where the
    // bot had to tap its own lands - so the tests could have gone on passing
    // after a change that left the bot unable to cast anything in a browser.
    case "castSpell":
      // Every field the action carries - see `castOptionsFor`, which exists
      // because this line used to carry one of the four.
      castSpellWithAutoTap(state, playerId, action.instanceId, action.targets, castOptionsFor(action));
      return;
    case "activateAbility":
      activateAbilityWithAutoTap(state, playerId, action.instanceId, action.abilityIndex, action.targets);
      return;
    case "declareAttackers":
      declareAttackers(state, playerId, action.declarations);
      return;
    case "declareBlockers":
      declareBlockers(state, playerId, action.declarations);
      return;
    case "takeMulligan":
      takeMulligan(state, playerId);
      return;
    case "keepHand":
      keepHand(state, playerId);
      return;
    case "putOnBottom":
      putOnBottom(state, playerId, action.instanceIds);
      return;
    case "resolveSearch":
      resolveSearch(state, playerId, action.instanceId);
      return;
    case "chooseOnEntry":
      resolveEnterChoice(state, playerId, action.answer);
      return;
    case "resolveConfirmation":
      resolveConfirmation(state, playerId, action.accept);
      return;
    case "chooseTriggerTargets":
      chooseTriggerTargets(state, playerId, action.targets);
      return;
    case "resolveDiscard":
      resolveDiscard(state, playerId, action.instanceId);
      return;
    case "resolveSacrificeChoice":
      resolveSacrificeChoice(state, playerId, action.instanceId);
      return;
    case "resolveCardChoice":
      resolveCardChoice(state, playerId, action.instanceIds);
      return;
    case "resolveAmountChoice":
      resolveAmountChoice(state, playerId, action.amount);
      return;
    case "passPriority":
      passPriority(state, playerId);
      return;
    default: {
      /*
       * Exhaustiveness, and the reason it is here: this switch was missing the
       * trigger-target case entirely, and had been since triggers learned to
       * target. The bot decided the action, this function fell out of the
       * switch and returned, and the game sat on a parked choice nobody
       * answered until the turn cap ended it - silently, in every bot-vs-bot
       * run that met one.
       *
       * A missing case is a compile error now, and an action that somehow
       * arrives unhandled at runtime says so out loud rather than doing
       * nothing.
       */
      const unhandled: never = action;
      throw new Error(`Bot action not handled by the local harness: ${JSON.stringify(unhandled)}`);
    }
  }
}
