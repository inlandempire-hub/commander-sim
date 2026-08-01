import {
  activateAbility,
  castSpell,
  declareAttackers,
  declareBlockers,
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
    case "castSpell":
      castSpell(state, playerId, action.instanceId, action.targets, {
        fromCommandZone: action.fromCommandZone,
      });
      return;
    case "activateAbility":
      activateAbility(state, playerId, action.instanceId, action.abilityIndex, action.targets);
      return;
    case "declareAttackers":
      declareAttackers(state, playerId, action.declarations);
      return;
    case "declareBlockers":
      declareBlockers(state, playerId, action.declarations);
      return;
    case "passPriority":
      passPriority(state, playerId);
      return;
  }
}
