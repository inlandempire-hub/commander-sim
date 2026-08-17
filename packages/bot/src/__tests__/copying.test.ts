import { describe, expect, it } from "vitest";
import {
  advanceStep,
  applyEffect,
  createCardInstance,
  createGameState,
  enteredBattlefield,
  resolveTopOfStack,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { decideAction } from "../decide.js";
import { applyBotAction } from "../localHarness.js";

/**
 * Batch 5 in front of the bot.
 *
 * Rionya is the first *mandatory* targeted trigger in the pool that fires every
 * single turn, which makes it the exact shape of the bug batch 4 found: a parked
 * target choice nobody answers stops the game dead, and no archetype deck
 * contains any of these cards, so the full-game tests would stay green while a
 * real game hung.
 */
describe("the bot with copies and stolen permanents", () => {
  function table(): { state: GameState; bot: string; them: string } {
    const state = createGameState(["Deadly Donny", "Salty Mike"], TEST_CARD_DEFINITIONS);
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    return { state, bot: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string) {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  it("answers Rionya's parked target choice instead of leaving the game stuck", () => {
    const { state, bot } = table();
    put(state, "rionya-fire-dancer", bot);
    // Two of its own creatures, so the engine genuinely has to ask.
    put(state, "grizzly-bears", bot);
    put(state, "savannah-lions", bot);

    while (state.step !== "begin-combat") advanceStep(state);
    expect(state.pendingTargetChoices).toHaveLength(1);

    const action = decideAction(state, bot);
    expect(action?.kind).toBe("chooseTriggerTargets");
    expect(() => applyBotAction(state, bot, action!)).not.toThrow();

    expect(state.pendingTargetChoices).toHaveLength(0);
    resolveTopOfStack(state);
    // It took the better creature, which is right: the copy is pure upside.
    const copies = state.players[0]!.battlefield.filter((i) => i.isTokenCopy);
    expect(copies).toHaveLength(1);
    expect(copies[0]!.definitionId).toBe("grizzly-bears");
  });

  it("points Zealous Conscripts at somebody else's board, not its own", () => {
    const { state, bot, them } = table();
    // One of each, so both are legal and the choice is a real one.
    const mine = put(state, "grizzly-bears", bot);
    const theirs = put(state, "craw-wurm", them);
    const conscripts = put(state, "zealous-conscripts", bot);

    applyEffect(
      state,
      bot,
      conscripts.instanceId,
      TEST_CARD_DEFINITIONS["zealous-conscripts"]!.triggeredAbilities![0]!.effect,
      [],
    );
    // Nothing happens with no target handed in - this is the parked-choice path.
    expect(theirs.controllerId).toBe(them);

    // Now the real path: the trigger, parked by the engine, answered by the bot.
    const state2 = state;
    state2.pendingTargetChoices.push({
      playerId: bot,
      sourceInstanceId: conscripts.instanceId,
      candidates: [
        { kind: "card", instanceId: mine.instanceId },
        { kind: "card", instanceId: theirs.instanceId },
      ],
      prompt: "Zealous Conscripts: choose a target",
      min: 1,
      max: 1,
      object: {
        id: "t-test",
        sourceInstanceId: conscripts.instanceId,
        controllerId: bot,
        effect: TEST_CARD_DEFINITIONS["zealous-conscripts"]!.triggeredAbilities![0]!.effect,
        targets: [],
        isPermanentSpell: false,
      },
    });

    const action = decideAction(state2, bot);
    expect(action?.kind).toBe("chooseTriggerTargets");
    applyBotAction(state2, bot, action!);
    resolveTopOfStack(state2);

    // The opponent's Craw Wurm, not its own Bears.
    expect(theirs.controllerId).toBe(bot);
    expect(mine.controllerId).toBe(bot);
  });
});
