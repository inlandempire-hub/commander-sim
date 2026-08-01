import { describe, expect, it } from "vitest";
import {
  castSpell,
  createCardInstance,
  createGameState,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { decideAction } from "../decide.js";

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

/** Enough lands for the bot that mana is never the reason it declines something. */
function giveMana(state: GameState, playerId: string, landId: string, count: number) {
  const player = state.players.find((p) => p.id === playerId)!;
  for (let i = 0; i < count; i++) {
    const land = createCardInstance(state, landId, playerId, "battlefield");
    land.summoningSickness = false;
  }
  player.landsPlayedThisTurn = 1; // stop playALand pre-empting everything else
}

describe("land destruction", () => {
  it("blows up an opponent's land while they are still short of mana", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    giveMana(state, BOT, "mountain", 3);
    const theirLand = createCardInstance(state, "forest", HUMAN, "battlefield");
    const rain = createCardInstance(state, "stone-rain", BOT, "hand");
    bot.manaPool = { R: 1, generic: 2 };

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: rain.instanceId,
      targets: [{ kind: "card", instanceId: theirLand.instanceId }],
      fromCommandZone: false,
    });
  });

  it("prefers an untapped land, because that is mana they still have", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    giveMana(state, BOT, "mountain", 3);
    const tapped = createCardInstance(state, "forest", HUMAN, "battlefield");
    tapped.tapped = true;
    const untapped = createCardInstance(state, "forest", HUMAN, "battlefield");
    const rain = createCardInstance(state, "stone-rain", BOT, "hand");
    bot.manaPool = { R: 1, generic: 2 };

    const action = decideAction(state, BOT);
    expect(action).toEqual({
      kind: "castSpell",
      instanceId: rain.instanceId,
      targets: [{ kind: "card", instanceId: untapped.instanceId }],
      fromCommandZone: false,
    });
  });

  it("stops bothering once they have plenty of lands", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    giveMana(state, BOT, "mountain", 3);
    for (let i = 0; i < 8; i++) createCardInstance(state, "forest", HUMAN, "battlefield");
    createCardInstance(state, "stone-rain", BOT, "hand");
    bot.manaPool = { R: 1, generic: 2 };

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("never points it at its own lands", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    giveMana(state, BOT, "mountain", 3);
    createCardInstance(state, "stone-rain", BOT, "hand");
    bot.manaPool = { R: 1, generic: 2 };
    // The opponent has no lands at all, so the only lands in the game are ours.

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("never points it at a creature - which the engine would reject outright", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    giveMana(state, BOT, "mountain", 3);
    createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // a juicy removal target
    createCardInstance(state, "stone-rain", BOT, "hand");
    bot.manaPool = { R: 1, generic: 2 };

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("passPriority");
  });

  it("destroys an anthem that is actually pumping a board", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    giveMana(state, BOT, "plains", 3);
    const anthem = createCardInstance(state, "glorious-anthem", HUMAN, "battlefield");
    for (let i = 0; i < 4; i++) createCardInstance(state, "grizzly-bears", HUMAN, "battlefield");
    const demystify = createCardInstance(state, "demystify", BOT, "hand");
    bot.manaPool = { W: 1 };

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: demystify.instanceId,
      targets: [{ kind: "card", instanceId: anthem.instanceId }],
      fromCommandZone: false,
    });
  });

  it("holds the same card when the anthem is pumping nothing", () => {
    const state = mainPhase();
    const bot = state.players[0]!;
    giveMana(state, BOT, "plains", 3);
    createCardInstance(state, "glorious-anthem", HUMAN, "battlefield");
    createCardInstance(state, "demystify", BOT, "hand");
    bot.manaPool = { W: 1 };

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });
});

describe("spells that can't be countered", () => {
  /** Donny casts `cardId` on his own turn; the bot then holds priority in response. */
  function spellOnTheStack(cardId: string, mana: Record<string, number>) {
    const state = mainPhase();
    state.activePlayerIndex = 1; // Donny's turn - the bot is the one responding
    state.priorityPlayerIndex = 1;

    const donny = state.players[1]!;
    const spell = createCardInstance(state, cardId, HUMAN, "hand");
    donny.manaPool = mana;
    castSpell(state, HUMAN, spell.instanceId);
    state.priorityPlayerIndex = 0;
    return { state, bot: state.players[0]! };
  }

  it("does not waste a counterspell on Terra Stomper", () => {
    const { state, bot } = spellOnTheStack("terra-stomper", { G: 3, generic: 3 });

    giveMana(state, BOT, "island", 3);
    createCardInstance(state, "counterspell", BOT, "hand");
    bot.manaPool = { U: 2 };

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("still counters an ordinary spell of the same size", () => {
    const { state, bot } = spellOnTheStack("craw-wurm", { G: 2, generic: 4 }); // {4}{G}{G}, no protection

    giveMana(state, BOT, "island", 3);
    const counter = createCardInstance(state, "counterspell", BOT, "hand");
    bot.manaPool = { U: 2 };

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: counter.instanceId,
      targets: [{ kind: "spell", stackObjectId: state.stack[0]!.id }],
      fromCommandZone: false,
    });
  });
});
