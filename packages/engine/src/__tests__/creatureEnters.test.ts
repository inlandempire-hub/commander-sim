import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect } from "../effects.js";
import type { GameState } from "../types.js";

/**
 * "Whenever another creature enters, you gain 1 life" and its relatives.
 *
 * These were written as `enters-battlefield`, which watches only the card the
 * ability is printed on - so every one of them gained life exactly once, at
 * the single moment their own text excludes ("*another* creature"), and never
 * again. They now watch the battlefield, the way landfall always has.
 *
 * The card text each test is asserting is quoted from Scryfall in the fixture
 * beside the ability, so the two can be checked against each other.
 */

/**
 * Puts a card onto the battlefield through the real arrival path, rather than
 * dropping it straight into the battlefield array - which is the whole point,
 * since the path is what fires the triggers.
 */
function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  drain(state);
  return instance;
}

/** Resolves everything the arrival put on the stack. */
function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("creatures watching other creatures enter", () => {
  it("does not trigger on its own arrival when the card says 'another'", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const before = alice.life;

    enters(state, "soul-warden", alice.id);

    expect(alice.life).toBe(before);
  });

  it("triggers for every later creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "soul-warden", alice.id);
    const before = alice.life;

    enters(state, "eager-cadet", alice.id);
    enters(state, "savannah-lions", alice.id);
    enters(state, "elite-vanguard", alice.id);

    expect(alice.life).toBe(before + 3);
  });

  it("gains the printed amount, not always one", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "healer-of-the-pride", alice.id); // "you gain 2 life"
    const before = alice.life;

    enters(state, "eager-cadet", alice.id);

    expect(alice.life).toBe(before + 2);
  });

  it("counts its own arrival when the card says 'this creature or another'", () => {
    // Kor Celebrant is the one card of this shape that includes itself.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const before = alice.life;

    enters(state, "kor-celebrant", alice.id);

    expect(alice.life).toBe(before + 1);
  });

  it("watches only your own creatures when the card says 'you control'", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    enters(state, "impassioned-orator", alice.id);
    const aliceBefore = alice.life;
    const bobBefore = bob.life;

    enters(state, "eager-cadet", bob.id);

    expect(alice.life).toBe(aliceBefore);
    expect(bob.life).toBe(bobBefore);
  });

  it("watches both sides when the card does not say 'you control'", () => {
    // Soul Warden and Essence Warden say only "another creature", so an
    // opponent's creature entering gains *you* the life.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    enters(state, "soul-warden", alice.id);
    const aliceBefore = alice.life;
    const bobBefore = bob.life;

    enters(state, "eager-cadet", bob.id);

    expect(alice.life).toBe(aliceBefore + 1);
    expect(bob.life).toBe(bobBefore);
  });

  it("stacks when several watchers are out", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "soul-warden", alice.id);
    enters(state, "impassioned-orator", alice.id); // +1 from the Warden
    const before = alice.life;

    enters(state, "eager-cadet", alice.id);

    // One from each watcher.
    expect(alice.life).toBe(before + 2);
  });

  it("triggers on tokens, which enter the battlefield like anything else", () => {
    // Tokens used to be created straight into the battlefield array, skipping
    // the arrival path entirely - so three Soldiers beside a Soul Warden
    // gained nothing at all.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const warden = enters(state, "soul-warden", alice.id);
    const before = alice.life;

    applyEffect(
      state,
      alice.id,
      warden.instanceId,
      { kind: "createToken", count: 3, tokenDefinitionId: "soldier-token" },
      [],
    );
    drain(state);

    expect(alice.life).toBe(before + 3);
    expect(alice.battlefield.filter((c) => c.definitionId === "soldier-token")).toHaveLength(3);
  });

  it("does not trigger on a land entering", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "soul-warden", alice.id);
    const before = alice.life;

    enters(state, "plains", alice.id);

    expect(alice.life).toBe(before);
  });

  it("stops once the watcher has left the battlefield", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const warden = enters(state, "soul-warden", alice.id);
    alice.battlefield = alice.battlefield.filter((c) => c.instanceId !== warden.instanceId);
    const before = alice.life;

    enters(state, "eager-cadet", alice.id);

    expect(alice.life).toBe(before);
  });

  it("still fires the entering card's own enters-battlefield trigger", () => {
    // The two kinds of trigger have to coexist: this card has a self trigger,
    // and the watcher is looking at the same arrival.
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "soul-warden", alice.id);
    const before = alice.life;

    // Kor Celebrant counts its own arrival (+1) and the Warden sees it (+1).
    enters(state, "kor-celebrant", alice.id);

    expect(alice.life).toBe(before + 2);
  });
});
