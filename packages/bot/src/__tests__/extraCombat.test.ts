import { describe, expect, it } from "vitest";
import {
  advanceStep,
  createCardInstance,
  createGameState,
  declareAttackers,
  resolveTopOfStack,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { decideAction } from "../decide.js";
import { applyBotAction } from "../localHarness.js";

/**
 * Batch 2 shipped a whole class of engine refusals the bot knew nothing about,
 * and the full-game tests stayed green throughout because no archetype deck
 * contains a hate piece. Batch 4 has the same shape of hole: nothing in either
 * deck exerts, untaps an attacker, or hands out a second combat phase.
 *
 * So these stand the new cards in front of the bot deliberately, and ask only
 * about the questions it is being asked - the stack is resolved directly rather
 * than through the priority loop, which is a different test and already has one.
 */
describe("the bot in a turn with two combat phases", () => {
  function inCombat(): { state: GameState; bot: string; them: string } {
    const state = createGameState(["Deadly Donny", "Salty Mike"], TEST_CARD_DEFINITIONS);
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    state.combatPhasesThisTurn = 1;
    return { state, bot: state.players[0]!.id, them: state.players[1]!.id };
  }

  it("takes Combat Celebrant's exert rather than throwing on a question it has never seen", () => {
    const { state, bot, them } = inCombat();
    const celebrant = createCardInstance(state, "combat-celebrant", bot, "battlefield");
    celebrant.summoningSickness = false;
    const other = createCardInstance(state, "grizzly-bears", bot, "battlefield");
    other.summoningSickness = false;
    other.tapped = true;

    declareAttackers(state, bot, [{ attackerInstanceId: celebrant.instanceId, defendingPlayerId: them }]);
    resolveTopOfStack(state);

    const action = decideAction(state, bot);
    expect(action?.kind).toBe("resolveConfirmation");
    expect(() => applyBotAction(state, bot, action!)).not.toThrow();

    // Taken, which is the right call - the untap and the extra phase are both
    // upside and the exert costs an untap step it was going to spend anyway.
    expect(other.tapped).toBe(false);
    expect(celebrant.exerted).toBe(true);
    expect(state.extraCombatPhases).toBe(1);
  });

  it("takes both targets Raph & Leo offers, rather than one", () => {
    const { state, bot, them } = inCombat();
    const raph = createCardInstance(state, "raph-and-leo-sibling-rivals", bot, "battlefield");
    raph.summoningSickness = false;
    const bear = createCardInstance(state, "grizzly-bears", bot, "battlefield");
    bear.summoningSickness = false;

    declareAttackers(state, bot, [
      { attackerInstanceId: raph.instanceId, defendingPlayerId: them },
      { attackerInstanceId: bear.instanceId, defendingPlayerId: them },
    ]);

    const action = decideAction(state, bot);
    expect(action?.kind).toBe("chooseTriggerTargets");
    // "One or two" - two attackers untapped is strictly better than one, and
    // before this batch the bot could only ever have named one.
    expect(action && "targets" in action ? action.targets.length : 0).toBe(2);
    expect(() => applyBotAction(state, bot, action!)).not.toThrow();

    resolveTopOfStack(state);
    expect(raph.tapped).toBe(false);
    expect(bear.tapped).toBe(false);
  });

  it("has something to say in the second combat phase", () => {
    const { state, bot, them } = inCombat();
    const celebrant = createCardInstance(state, "combat-celebrant", bot, "battlefield");
    celebrant.summoningSickness = false;
    const bear = createCardInstance(state, "grizzly-bears", bot, "battlefield");
    bear.summoningSickness = false;
    bear.tapped = true;

    declareAttackers(state, bot, [{ attackerInstanceId: celebrant.instanceId, defendingPlayerId: them }]);
    resolveTopOfStack(state);
    applyBotAction(state, bot, decideAction(state, bot)!);

    // Out of the first combat phase and straight into the one it just bought.
    state.step = "end-combat";
    advanceStep(state);
    expect(state.phase).toBe("combat");
    expect(state.step).toBe("begin-combat");

    // The bear was untapped by the Celebrant, so there is a real attack to make.
    expect(bear.tapped).toBe(false);
    state.step = "declare-attackers";
    state.priorityPlayerIndex = 0;
    const action = decideAction(state, bot);
    expect(action).not.toBeNull();
    expect(() => applyBotAction(state, bot, action!)).not.toThrow();
  });
});
