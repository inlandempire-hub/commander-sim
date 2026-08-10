import {
  activateAbilityWithAutoTap,
  castSpellWithAutoTap,
  declareAttackers,
  declareBlockers,
  resolveSearch,
  resolveConfirmation,
  takeMulligan,
  keepHand,
  putOnBottom,
  passPriority,
  playLand,
  type GameState,
} from "@mtg-commander-sim/engine";
import type { BotAction } from "./types.js";

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
      castSpellWithAutoTap(state, playerId, action.instanceId, action.targets, {
        fromCommandZone: action.fromCommandZone,
      });
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
    case "resolveConfirmation":
      resolveConfirmation(state, playerId, action.accept);
      return;
    case "passPriority":
      passPriority(state, playerId);
      return;
  }
}
