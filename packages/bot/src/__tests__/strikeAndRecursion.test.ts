import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  createGameState,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { decideAction } from "../decide.js";
import { chooseAttackers, chooseBlockers } from "../combat.js";

const BOT = "Salty Mike";
const HUMAN = "Deadly Donny";

function mainPhase(): GameState {
  const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

function attackStep(): GameState {
  const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
  state.phase = "combat";
  state.step = "declare-attackers";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

describe("first strike in the bot's combat maths", () => {
  it("refuses an attack into a first striker that kills it for free", () => {
    const state = attackStep();
    // Grizzly Bears 2/2 into an untapped Elvish Archers 2/1 first strike: the
    // Archers kill it before it deals any damage at all.
    const attacker = createCardInstance(state, "grizzly-bears", BOT, "battlefield");
    attacker.summoningSickness = false;
    createCardInstance(state, "elvish-archers", HUMAN, "battlefield");

    expect(chooseAttackers(state, BOT)).toEqual([]);
  });

  it("happily attacks with a first striker into a bigger-bodied blocker", () => {
    const state = attackStep();
    const attacker = createCardInstance(state, "elvish-archers", BOT, "battlefield"); // 2/1 FS
    attacker.summoningSickness = false;
    createCardInstance(state, "grizzly-bears", HUMAN, "battlefield"); // 2/2

    const declarations = chooseAttackers(state, BOT);
    expect(declarations.map((d) => d.attackerInstanceId)).toEqual([attacker.instanceId]);
  });

  it("blocks with a first striker that wins the fight outright", () => {
    const state = createGameState([HUMAN, BOT], TEST_CARD_DEFINITIONS);
    state.phase = "combat";
    state.step = "declare-blockers";
    state.activePlayerIndex = 0;

    const attacker = createCardInstance(state, "grizzly-bears", HUMAN, "battlefield"); // 2/2
    const blocker = createCardInstance(state, "elvish-archers", BOT, "battlefield"); // 2/1 FS
    state.attackers[attacker.instanceId] = BOT;

    const declarations = chooseBlockers(state, BOT);
    expect(declarations).toEqual([
      { blockerInstanceId: blocker.instanceId, attackerInstanceId: attacker.instanceId },
    ]);
  });
});

describe("graveyard recursion", () => {
  it("returns the best creature in its graveyard", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    createCardInstance(state, "grizzly-bears", BOT, "graveyard");
    const wurm = createCardInstance(state, "craw-wurm", BOT, "graveyard"); // much better
    const raise = createCardInstance(state, "raise-dead", BOT, "hand");
    bot.manaPool = { B: 1 };

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: raise.instanceId,
      targets: [{ kind: "card", instanceId: wurm.instanceId }],
      fromCommandZone: false,
    });
  });

  it("does not spend the card on something worthless", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    createCardInstance(state, "kobolds-of-kher-keep", BOT, "graveyard"); // 0/1
    createCardInstance(state, "raise-dead", BOT, "hand");
    bot.manaPool = { B: 1 };

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("ignores a creature sitting in the opponent's graveyard", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    createCardInstance(state, "craw-wurm", HUMAN, "graveyard");
    createCardInstance(state, "raise-dead", BOT, "hand");
    bot.manaPool = { B: 1 };

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });
});

describe("tutors", () => {
  it("casts a land tutor while still short of mana", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    createCardInstance(state, "forest", BOT, "battlefield");
    createCardInstance(state, "forest", BOT, "library");
    const tutor = createCardInstance(state, "lay-of-the-land", BOT, "hand");
    bot.manaPool = { G: 1 };
    bot.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: tutor.instanceId,
      targets: [],
      fromCommandZone: false,
    });
  });

  it("stops casting land tutors once the mana is already there", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    for (let i = 0; i < 7; i++) createCardInstance(state, "forest", BOT, "battlefield");
    createCardInstance(state, "forest", BOT, "library");
    createCardInstance(state, "lay-of-the-land", BOT, "hand");
    bot.manaPool = { G: 1 };
    bot.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("does not cast a tutor with nothing in the library to find", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    createCardInstance(state, "forest", BOT, "battlefield");
    createCardInstance(state, "grizzly-bears", BOT, "library"); // no lands at all
    createCardInstance(state, "lay-of-the-land", BOT, "hand");
    bot.manaPool = { G: 1 };
    bot.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });
});
