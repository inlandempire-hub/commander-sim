import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { advanceStep } from "../turn.js";
import { playLand } from "../casting.js";
import { declareAttackers } from "../combat.js";
import { applyEffect } from "../effects.js";
import type { GameState, Phase, Step } from "../types.js";

/**
 * The three trigger families that arrived on 2026-08-10: watching other
 * permanents *die*, the turn machine's "at the beginning of" steps, and "you
 * may".
 *
 * Every card asserted here is quoted from Scryfall in the fixture beside its
 * ability, so the two can be read against each other.
 */

/** Puts a card onto the battlefield through the real arrival path. */
function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  drain(state);
  return instance;
}

/** Resolves everything currently on the stack, answering nothing. */
function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && !state.pendingConfirmation && guard-- > 0) {
    resolveTopOfStack(state);
  }
}

/** Walks the turn machine to a given phase/step, resolving nothing on the way. */
function advanceTo(state: GameState, phase: Phase, step: Step): void {
  let guard = 60;
  while ((state.phase !== phase || state.step !== step) && guard-- > 0) {
    state.stack.length = 0;
    state.pendingConfirmation = null;
    advanceStep(state);
  }
  if (guard <= 0) throw new Error(`never reached ${phase}/${step}`);
}

/**
 * Hands the turn to the next player.
 *
 * Written as "advance until the turn number changes" rather than "advance to
 * cleanup": cleanup never stops for priority, so `advanceStep` walks straight
 * through it and a test waiting to land there waits forever.
 */
function endTurn(state: GameState): void {
  const was = state.turnNumber;
  let guard = 30;
  while (state.turnNumber === was && guard-- > 0) {
    state.stack.length = 0;
    state.pendingConfirmation = null;
    advanceStep(state);
  }
  if (guard <= 0) throw new Error("the turn never ended");
}

/**
 * Puts cards in a library so drawing one actually draws.
 *
 * `makeTestGame` deals nothing, so every player starts with an empty library -
 * which means a draw effect does not draw a card, it loses you the game on the
 * next state-based check. Three tests here quietly asserted "the trigger did
 * not fire" when what had really happened was that it fired and the draw had
 * nothing to take.
 */
function stockLibrary(state: GameState, playerId: string, count = 5): void {
  for (let i = 0; i < count; i++) createCardInstance(state, "forest", playerId, "library");
}

/** Kills a creature outright by setting its toughness below zero. */
function kill(state: GameState, instanceId: string, owner: { battlefield: { instanceId: string; temporaryToughnessBonus: number }[] }): void {
  const instance = owner.battlefield.find((c) => c.instanceId === instanceId)!;
  instance.temporaryToughnessBonus = -99;
  checkStateBasedActions(state);
}

describe("watching other permanents die", () => {
  it("draws when a creature with a counter on it dies", () => {
    // Meltstrider Eulogist: "Whenever a creature you control with a +1/+1
    // counter on it dies, draw a card."
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "meltstrider-eulogist", alice.id);
    const victim = enters(state, "eager-cadet", alice.id);
    victim.plusOneCounters = 1;
    const before = alice.hand.length;

    kill(state, victim.instanceId, alice);
    drain(state);

    expect(alice.hand.length).toBe(before + 1);
  });

  it("draws nothing when the creature that died had no counter", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "meltstrider-eulogist", alice.id);
    const victim = enters(state, "eager-cadet", alice.id);
    const before = alice.hand.length;

    kill(state, victim.instanceId, alice);
    drain(state);

    expect(alice.hand.length).toBe(before);
  });

  it("reads the counter from before the death, not after", () => {
    /*
     * The trap this whole feature turns on. `moveCard` clears a permanent's
     * counters on the way to the graveyard, so a watcher that asked "did it
     * have a counter" after the move would be told no every single time - and
     * Meltstrider Eulogist would never once draw a card while looking
     * perfectly correct in the fixture.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "meltstrider-eulogist", alice.id);
    const victim = enters(state, "eager-cadet", alice.id);
    victim.plusOneCounters = 2;

    kill(state, victim.instanceId, alice);

    expect(alice.graveyard.find((c) => c.instanceId === victim.instanceId)?.plusOneCounters).toBe(0);
    expect(state.stack.length).toBe(1); // fired anyway
  });

  it("counts its own death, because the card does not say 'another'", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    const eulogist = enters(state, "meltstrider-eulogist", alice.id);
    eulogist.plusOneCounters = 1;
    const before = alice.hand.length;

    kill(state, eulogist.instanceId, alice);
    drain(state);

    expect(alice.hand.length).toBe(before + 1);
  });

  it("ignores an opponent's creature dying, because the card says 'you control'", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    enters(state, "meltstrider-eulogist", alice.id);
    const victim = enters(state, "eager-cadet", bob.id);
    victim.plusOneCounters = 1;
    const before = alice.hand.length;

    kill(state, victim.instanceId, bob);
    drain(state);

    expect(alice.hand.length).toBe(before);
  });

  it("does not fire for a land going to the graveyard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "meltstrider-eulogist", alice.id);
    const land = enters(state, "forest", alice.id);
    land.plusOneCounters = 1;

    // Lands are not creatures, so state-based actions never touch it - move it
    // by hand the way a destroy effect would.
    applyEffect(state, alice.id, land.instanceId, { kind: "destroy", target: { kind: "creature" } }, [
      { kind: "card", instanceId: land.instanceId },
    ]);
    drain(state);

    expect(state.stack.length).toBe(0);
  });
});

describe("landfall, and whose lands count", () => {
  it("fires for a land played from hand", () => {
    // Eumidian Terrabotanist: "Landfall - Whenever a land you control enters,
    // you gain 1 life."
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "eumidian-terrabotanist", alice.id);
    advanceTo(state, "precombat-main", "main");
    const land = createCardInstance(state, "forest", alice.id, "hand");
    const before = alice.life;

    playLand(state, alice.id, land.instanceId);
    drain(state);

    expect(alice.life).toBe(before + 1);
  });

  it("also fires for a land put onto the battlefield some other way", () => {
    /*
     * Landfall used to be a loop inside `playLand`, so a land arriving any
     * other way - a fetchland cracking, a ramp spell - arrived in total
     * silence. The rules make no such distinction.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "eumidian-terrabotanist", alice.id);
    const before = alice.life;

    enters(state, "forest", alice.id);

    expect(alice.life).toBe(before + 1);
  });

  it("ignores an opponent's land when the card says 'you control'", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    enters(state, "eumidian-terrabotanist", alice.id);
    const before = alice.life;

    enters(state, "forest", bob.id);

    expect(alice.life).toBe(before);
  });

  it("sees an opponent's land when the card says only 'a land enters'", () => {
    // Lifegift: "Whenever a land enters, you may gain 1 life."
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    enters(state, "lifegift", alice.id);

    enters(state, "forest", bob.id);

    expect(state.pendingConfirmation?.playerId).toBe(alice.id);
  });
});

describe('"you may"', () => {
  it("stops and asks rather than taking the life", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "lifegift", alice.id);
    const before = alice.life;

    enters(state, "forest", alice.id);

    expect(alice.life).toBe(before);
    expect(state.pendingConfirmation?.prompt).toBe("Lifegift: gain 1 life?");
  });

  it("gains the life on yes", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "lifegift", alice.id);
    const before = alice.life;
    enters(state, "forest", alice.id);

    resolveConfirmation(state, alice.id, true);

    expect(alice.life).toBe(before + 1);
    expect(state.pendingConfirmation).toBeNull();
  });

  it("gains nothing on no, and still clears", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "lifegift", alice.id);
    const before = alice.life;
    enters(state, "forest", alice.id);

    resolveConfirmation(state, alice.id, false);

    expect(alice.life).toBe(before);
    expect(state.pendingConfirmation).toBeNull();
  });

  it("cannot be answered by the other player", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    enters(state, "lifegift", alice.id);
    enters(state, "forest", alice.id);

    expect(() => resolveConfirmation(state, bob.id, true)).toThrow(/belongs to alice/);
  });

  it("refuses to answer when nothing is pending", () => {
    const state = makeTestGame();
    expect(() => resolveConfirmation(state, state.players[0]!.id, true)).toThrow(/No choice/);
  });
});

describe("turn-based triggers", () => {
  it("fires at the beginning of each end step", () => {
    // Deathreap Ritual: "Morbid - At the beginning of each end step, if a
    // creature died this turn, you may draw a card."
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "deathreap-ritual", alice.id);
    const victim = enters(state, "eager-cadet", alice.id);
    kill(state, victim.instanceId, alice);
    state.stack.length = 0;

    advanceTo(state, "combat", "begin-combat");
    // Deliberately not cleared: the trigger has to survive to the end step.
    while (!(state.phase === "ending" && state.step === "end")) advanceStep(state);

    expect(state.stack.length).toBe(1);
  });

  it("does not fire when no creature died this turn", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "deathreap-ritual", alice.id);

    advanceTo(state, "ending", "end");

    expect(state.stack.length).toBe(0);
  });

  it("fires on the opponent's end step too, because the card says 'each'", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "deathreap-ritual", alice.id);
    // Hand the turn to bob, then kill something on his turn.
    endTurn(state);
    expect(state.players[state.activePlayerIndex]!.id).toBe(state.players[1]!.id);

    const victim = enters(state, "eager-cadet", alice.id);
    kill(state, victim.instanceId, alice);
    state.stack.length = 0;
    while (!(state.phase === "ending" && state.step === "end")) advanceStep(state);

    // The trigger belongs to Alice even though it is Bob's end step.
    expect(state.stack[0]?.controllerId).toBe(alice.id);
  });

  it("forgets the deaths when the turn ends", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const victim = enters(state, "eager-cadet", alice.id);
    kill(state, victim.instanceId, alice);
    expect(state.creatureDeathsThisTurn).toBe(1);

    endTurn(state);

    expect(state.creatureDeathsThisTurn).toBe(0);
  });
});

describe("the intervening-if is checked twice", () => {
  it("never goes on the stack when false at trigger time", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "deathreap-ritual", alice.id);

    advanceTo(state, "ending", "end");

    expect(state.stack.length).toBe(0);
    expect(state.pendingConfirmation).toBeNull();
  });

  it("does nothing on resolution when it has stopped being true", () => {
    /*
     * Rule 603.4's second check, and the half that is visible in play. The
     * condition is re-read as the ability resolves, so a trigger whose reason
     * has evaporated resolves into nothing rather than paying out anyway.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id);
    enters(state, "deathreap-ritual", alice.id);
    const victim = enters(state, "eager-cadet", alice.id);
    kill(state, victim.instanceId, alice);
    state.stack.length = 0;
    while (!(state.phase === "ending" && state.step === "end")) advanceStep(state);
    expect(state.stack.length).toBe(1);

    // The reason the trigger existed is undone before it resolves.
    state.creatureDeathsThisTurn = 0;
    const before = alice.hand.length;
    resolveTopOfStack(state);

    expect(state.pendingConfirmation).toBeNull(); // never even asked
    expect(alice.hand.length).toBe(before);
  });
});

describe("attacks triggers with an effect other than a counter", () => {
  it("gains life when Shopkeeper's Bane attacks", () => {
    // "Whenever this creature attacks, you gain 2 life." The engine could
    // always do this; only the generator could not write it down.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bane = enters(state, "shopkeepers-bane", alice.id);
    bane.summoningSickness = false;
    advanceTo(state, "combat", "declare-attackers");
    const before = alice.life;

    declareAttackers(state, alice.id, [
      { attackerInstanceId: bane.instanceId, defendingPlayerId: state.players[1]!.id },
    ]);
    drain(state);

    expect(alice.life).toBe(before + 2);
  });
});
