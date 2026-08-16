import { describe, expect, it } from "vitest";
import { createCardInstance, createGameState } from "../state.js";
import { putOntoBattlefield, resolveEnterChoice } from "../permanents.js";
import { castSpell } from "../casting.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

/**
 * "As this permanent enters, choose ..." - the decision is made once and read
 * back for the rest of the game.
 *
 * The failure this guards against is the quiet one: a permanent whose choice
 * was never answered restricting *something* rather than nothing. Sanctum
 * Prelate defaulting to zero would switch off every zero-cost spell in the
 * format on the strength of a question nobody asked.
 */
describe("a choice made as a permanent enters", () => {
  function game(): GameState {
    return createGameState(["Deadly Donny", "Salty Mike"], TEST_CARD_DEFINITIONS);
  }

  function openMain(state: GameState) {
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
  }

  it("stops the game and asks as the permanent arrives", () => {
    const state = game();
    const me = state.players[0]!;
    const prelate = createCardInstance(state, "sanctum-prelate", me.id, "hand");
    putOntoBattlefield(state, prelate.instanceId);

    expect(state.pendingEnterChoice).not.toBeNull();
    expect(state.pendingEnterChoice!.playerId).toBe(me.id);
    expect(state.pendingEnterChoice!.choice.kind).toBe("number");
  });

  it("remembers the answer on the permanent", () => {
    const state = game();
    const me = state.players[0]!;
    const prelate = createCardInstance(state, "sanctum-prelate", me.id, "hand");
    putOntoBattlefield(state, prelate.instanceId);
    resolveEnterChoice(state, me.id, { number: 2 });

    expect(state.pendingEnterChoice).toBeNull();
    expect(prelate.chosenOnEntry?.number).toBe(2);
  });

  it("refuses an answer from the wrong player, or one that was not asked for", () => {
    const state = game();
    const me = state.players[0]!;
    const them = state.players[1]!;
    const prelate = createCardInstance(state, "sanctum-prelate", me.id, "hand");
    putOntoBattlefield(state, prelate.instanceId);

    expect(() => resolveEnterChoice(state, them.id, { number: 2 })).toThrow(/belongs to/i);
    expect(() => resolveEnterChoice(state, me.id, { creatureType: "Human" })).toThrow(/whole number/i);
    // Still waiting, rather than cleared by a bad answer.
    expect(state.pendingEnterChoice).not.toBeNull();
  });

  it("Sanctum Prelate stops a noncreature spell of the chosen mana value", () => {
    const state = game();
    const me = state.players[0]!;
    openMain(state);
    me.manaPool = { W: 10, U: 10, B: 10, R: 10, G: 10, generic: 10 };

    const prelate = createCardInstance(state, "sanctum-prelate", me.id, "hand");
    putOntoBattlefield(state, prelate.instanceId);
    // Lightning Bolt is {R} - mana value 1.
    resolveEnterChoice(state, me.id, { number: 1 });

    const bolt = createCardInstance(state, "lightning-bolt", me.id, "hand");
    expect(() =>
      castSpell(state, me.id, bolt.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]),
    ).toThrow(/mana value 1/i);
  });

  it("...and nothing of any other mana value, or any creature", () => {
    const state = game();
    const me = state.players[0]!;
    openMain(state);
    me.manaPool = { W: 10, U: 10, B: 10, R: 10, G: 10, generic: 10 };

    const prelate = createCardInstance(state, "sanctum-prelate", me.id, "hand");
    putOntoBattlefield(state, prelate.instanceId);
    resolveEnterChoice(state, me.id, { number: 5 });

    const bolt = createCardInstance(state, "lightning-bolt", me.id, "hand");
    expect(() =>
      castSpell(state, me.id, bolt.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]),
    ).not.toThrow();

    // "Noncreature spells" - a creature of the chosen value is untouched.
    const state2 = game();
    const me2 = state2.players[0]!;
    openMain(state2);
    me2.manaPool = { W: 10, U: 10, B: 10, R: 10, G: 10, generic: 10 };
    const prelate2 = createCardInstance(state2, "sanctum-prelate", me2.id, "hand");
    putOntoBattlefield(state2, prelate2.instanceId);
    // Grizzly Bears is {1}{G} - mana value 2.
    resolveEnterChoice(state2, me2.id, { number: 2 });
    const bears = createCardInstance(state2, "grizzly-bears", me2.id, "hand");
    expect(() => castSpell(state2, me2.id, bears.instanceId)).not.toThrow();
  });

  it("a Prelate whose number was never chosen restricts nothing", () => {
    // The important one. An unanswered choice must not read as zero.
    const state = game();
    const me = state.players[0]!;
    openMain(state);
    me.manaPool = { R: 10, generic: 10 };
    const prelate = createCardInstance(state, "sanctum-prelate", me.id, "hand");
    putOntoBattlefield(state, prelate.instanceId);
    state.pendingEnterChoice = null; // as if the question were skipped

    const bolt = createCardInstance(state, "lightning-bolt", me.id, "hand");
    expect(() =>
      castSpell(state, me.id, bolt.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]),
    ).not.toThrow();
  });
});
