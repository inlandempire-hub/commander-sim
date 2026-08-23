import {
  activateAbilityWithAutoTap,
  castSpellWithAutoTap,
  chooseTriggerTarget,
  declareAttackers,
  declareBlockers,
  resolveCardChoice,
  resolveDiscard,
  resolveSearch,
  resolveArrange,
  resolveModal,
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
        // These were dropped, so a bot casting for {X}, sacrificing to an
        // additional cost, or taking an alternative cost (Flare of Denial's
        // sacrifice-instead-of-mana) had its choice thrown away and the spell
        // attempted at full price - which then "could not be afforded".
        chosenX: action.chosenX,
        sacrificeInstanceId: action.sacrificeInstanceId,
        useAlternativeCost: action.useAlternativeCost,
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
    case "resolveModal":
      resolveModal(state, playerId, action.modeIndex);
      return;
    case "resolveArrange":
      resolveArrange(state, playerId, action.order, action.shuffle ?? false);
      return;
    case "resolveConfirmation":
      resolveConfirmation(state, playerId, action.accept);
      return;
    /*
     * These three were missing, so a bot answering a card choice, a discard or
     * a triggered ability's target did nothing at all - the pending decision
     * stayed put and the same action was proposed forever. The demo decks never
     * raise them; the Felix deck (Windfall, Emergent Ultimatum, Bojuka Bog) does.
     */
    case "resolveCardChoice":
      resolveCardChoice(state, playerId, action.instanceIds);
      return;
    case "resolveDiscard":
      resolveDiscard(state, playerId, action.instanceId);
      return;
    case "chooseTriggerTarget":
      chooseTriggerTarget(state, playerId, action.target);
      return;
    case "passPriority":
      passPriority(state, playerId);
      return;
  }
}
