import { describe, expect, it } from "vitest";
import {
  castSpell,
  createCardInstance,
  createGameState,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { decideAction } from "../decide.js";
import { chooseAttackers } from "../combat.js";
import { combatTrick, counterSomething, reserveForCounterspell } from "../instants.js";

const BOT = "Salty Mike";
const HUMAN = "Deadly Donny";

/** The human is the active player; the bot holds priority to respond. */
function respondingGame(): GameState {
  const state = createGameState([HUMAN, BOT], TEST_CARD_DEFINITIONS);
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

/** Puts an opponent's spell on the stack and hands priority to the bot. */
function withThreatOnStack(state: GameState, definitionId = "craw-wurm"): string {
  const human = state.players[0]!;
  const card = createCardInstance(state, definitionId, HUMAN, "hand");
  human.manaPool = { W: 3, U: 3, B: 3, R: 3, G: 3, generic: 8 };
  castSpell(state, HUMAN, card.instanceId);
  state.priorityPlayerIndex = 1;
  return state.stack[0]!.id;
}

function giveIslands(state: GameState, count: number) {
  for (let i = 0; i < count; i++) createCardInstance(state, "island", BOT, "battlefield");
}

describe("counterspells", () => {
  it("counters an opponent's expensive creature", () => {
    const state = respondingGame();
    const stackObjectId = withThreatOnStack(state); // Craw Wurm, {4}{G}{G}
    giveIslands(state, 2);
    const counter = createCardInstance(state, "counterspell", BOT, "hand");
    state.players[1]!.manaPool = { U: 2 };

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: counter.instanceId,
      targets: [{ kind: "spell", stackObjectId }],
      fromCommandZone: false,
    });
  });

  it("does not waste a counter on a cheap creature", () => {
    const state = respondingGame();
    withThreatOnStack(state, "grizzly-bears"); // {1}{G} - not worth a card
    giveIslands(state, 2);
    createCardInstance(state, "counterspell", BOT, "hand");
    state.players[1]!.manaPool = { U: 2 };

    expect(counterSomething(state, state.players[1]!)).toBeNull();
  });

  it("never counters its own spell", () => {
    const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
    state.phase = "precombat-main";
    state.step = "main";
    const bot = state.players[0]!;
    const wurm = createCardInstance(state, "craw-wurm", BOT, "hand");
    bot.manaPool = { G: 2, generic: 4 };
    castSpell(state, BOT, wurm.instanceId);
    giveIslands(state, 2);
    createCardInstance(state, "counterspell", BOT, "hand");
    bot.manaPool = { U: 2 };

    expect(counterSomething(state, bot)).toBeNull();
  });

  it("holds a Mana Leak back when the caster could simply pay for it", () => {
    const state = respondingGame();
    withThreatOnStack(state);
    // The human still has plenty floating after casting, so Mana Leak does nothing.
    state.players[0]!.manaPool = { generic: 5 };
    giveIslands(state, 2);
    createCardInstance(state, "mana-leak", BOT, "hand");
    state.players[1]!.manaPool = { U: 1, generic: 1 };

    expect(counterSomething(state, state.players[1]!)).toBeNull();
  });

  it("keeps mana untapped for a counterspell once it has lands to spare", () => {
    const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
    const bot = state.players[0]!;
    giveIslands(state, 6);
    createCardInstance(state, "counterspell", BOT, "hand");

    expect(reserveForCounterspell(state, bot)).toEqual({ generic: 0, colors: { U: 2 } });
  });

  it("does not reserve mana while it is still developing", () => {
    const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
    const bot = state.players[0]!;
    giveIslands(state, 3);
    createCardInstance(state, "counterspell", BOT, "hand");

    expect(reserveForCounterspell(state, bot)).toEqual({ generic: 0, colors: {} });
  });
});

describe("combat tricks", () => {
  function blockedCombat(): GameState {
    const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
    state.phase = "combat";
    state.step = "declare-blockers";
    state.activePlayerIndex = 0; // the bot is attacking
    state.priorityPlayerIndex = 0;
    return state;
  }

  it("pumps an attacker that would otherwise die in the fight", () => {
    const state = blockedCombat();
    const attacker = createCardInstance(state, "grizzly-bears", BOT, "battlefield"); // 2/2
    const blocker = createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6/4
    state.attackers = { [attacker.instanceId]: HUMAN };
    state.blockers = { [blocker.instanceId]: attacker.instanceId };

    createCardInstance(state, "forest", BOT, "battlefield");
    const growth = createCardInstance(state, "giant-growth", BOT, "hand"); // +3/+3
    state.players[0]!.manaPool = { G: 1 };

    // 2/2 into a 6/4 dies; as a 5/5 it survives and kills the Wurm.
    expect(combatTrick(state, state.players[0]!)).toEqual({
      kind: "castSpell",
      instanceId: growth.instanceId,
      targets: [{ kind: "card", instanceId: attacker.instanceId }],
      fromCommandZone: false,
    });
  });

  it("does not pump a fight it was already winning", () => {
    const state = blockedCombat();
    const attacker = createCardInstance(state, "craw-wurm", BOT, "battlefield"); // 6/4
    const blocker = createCardInstance(state, "grizzly-bears", HUMAN, "battlefield"); // 2/2
    state.attackers = { [attacker.instanceId]: HUMAN };
    state.blockers = { [blocker.instanceId]: attacker.instanceId };

    createCardInstance(state, "forest", BOT, "battlefield");
    createCardInstance(state, "giant-growth", BOT, "hand");
    state.players[0]!.manaPool = { G: 1 };

    expect(combatTrick(state, state.players[0]!)).toBeNull();
  });
});

describe("attacking with no power", () => {
  it("never attacks with a 0-power creature", () => {
    const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
    state.phase = "combat";
    state.step = "declare-attackers";
    // Caelorna is a vanilla 0/8: unkillable in a fight, and worth nothing in one.
    const wall = createCardInstance(state, "caelorna-coral-tyrant", BOT, "battlefield");
    wall.summoningSickness = false;
    createCardInstance(state, "grizzly-bears", HUMAN, "battlefield");

    expect(chooseAttackers(state, BOT)).toEqual([]);
  });

  it("still attacks with a real threat alongside it", () => {
    const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
    state.phase = "combat";
    state.step = "declare-attackers";
    const wall = createCardInstance(state, "caelorna-coral-tyrant", BOT, "battlefield");
    const flier = createCardInstance(state, "air-elemental", BOT, "battlefield"); // 4/4 flying
    wall.summoningSickness = false;
    flier.summoningSickness = false;
    createCardInstance(state, "grizzly-bears", HUMAN, "battlefield"); // can't block flying

    const declarations = chooseAttackers(state, BOT);
    expect(declarations.map((d) => d.attackerInstanceId)).toEqual([flier.instanceId]);
  });
});
