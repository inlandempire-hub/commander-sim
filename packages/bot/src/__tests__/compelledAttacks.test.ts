import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  createGameState,
  enteredBattlefield,
  TEST_CARD_DEFINITIONS,
  type CardInstance,
  type GameState,
} from "@mtg-commander-sim/engine";
import { decideAction } from "../decide.js";
import { applyBotAction } from "../localHarness.js";

/**
 * Attacking is the only declaration a player can be compelled into, and the bot
 * is the half of this that hangs quietly: `declareAttackers` throws on a
 * declaration that leaves a compelled creature out, so a bot with its own idea
 * of the rule loses its own turn on its own board and the full-game tests stay
 * green - because neither archetype deck contains a Rabblemaster.
 *
 * That is the same hole batch 4's tests were written for. These stand the cards
 * in front of the bot on purpose.
 */
describe("the bot and creatures that have to attack", () => {
  function inCombat(): { state: GameState; bot: string; them: string } {
    const state = createGameState(["Deadly Donny", "Salty Mike"], TEST_CARD_DEFINITIONS);
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    return { state, bot: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  it("sends a Goblin the Rabblemaster compels, even behind a wall it would rather not", () => {
    const { state, bot, them } = inCombat();
    put(state, "goblin-rabblemaster", bot);
    const goblin = put(state, "token-r-11-goblin", bot);
    // Something big enough on the other side that the bot's own weighing would
    // keep a 1/1 at home.
    put(state, "capital-guard", them);

    const action = decideAction(state, bot);
    expect(action?.kind).toBe("declareAttackers");
    expect(() => applyBotAction(state, bot, action!)).not.toThrow();
    expect(state.attackers[goblin.instanceId]).toBe(them);
  });

  it("sends Legion Warboss's token, which was told to attack", () => {
    const { state, bot, them } = inCombat();
    put(state, "legion-warboss", bot);
    const token = put(state, "token-r-11-goblin", bot);
    token.mustAttackThisCombat = true;
    put(state, "capital-guard", them);

    const action = decideAction(state, bot);
    expect(action?.kind).toBe("declareAttackers");
    expect(() => applyBotAction(state, bot, action!)).not.toThrow();
    expect(state.attackers[token.instanceId]).toBe(them);
  });

  it("still declares when the compelled creature is the only thing it has", () => {
    const { state, bot, them } = inCombat();
    put(state, "goblin-rabblemaster", bot);
    const goblin = put(state, "token-r-11-goblin", bot);
    // A board it would otherwise never attack into: the bot's own judgement
    // says stay home, and the rule says otherwise.
    for (let i = 0; i < 3; i++) put(state, "capital-guard", them);

    const action = decideAction(state, bot);
    expect(action?.kind).toBe("declareAttackers");
    expect(() => applyBotAction(state, bot, action!)).not.toThrow();
    expect(state.attackers[goblin.instanceId]).toBe(them);
  });

  it("leaves an unable Goblin alone rather than proposing an illegal attack", () => {
    const { state, bot, them } = inCombat();
    put(state, "goblin-rabblemaster", bot);
    const sick = put(state, "token-r-11-goblin", bot);
    sick.summoningSickness = true;

    const action = decideAction(state, bot);
    // Either it finds nothing worth doing or it declares without the sick
    // Goblin; what it must never do is name a creature that cannot attack.
    if (action?.kind === "declareAttackers") {
      expect(action.declarations.map((d) => d.attackerInstanceId)).not.toContain(sick.instanceId);
      expect(() => applyBotAction(state, bot, action)).not.toThrow();
    }
    expect(state.attackers[sick.instanceId]).toBeUndefined();
    expect(them).toBeTruthy();
  });
});
