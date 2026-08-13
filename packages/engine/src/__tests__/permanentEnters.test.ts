import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, createGameState } from "../state.js";
import { matchesWatchFor, putOntoBattlefield } from "../permanents.js";
import type { TriggerSubject } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect } from "../effects.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { CardDefinition, GameState } from "../types.js";

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

/**
 * Not every card of this shape watches creatures. Tanglespan Lookout is
 * "whenever an Aura you control enters, draw a card", and was written as an
 * enters-the-battlefield draw - so it drew on its own arrival, which the real
 * card does not do, and never once drew for an Aura.
 */
describe("watchers that look for something other than a creature", () => {
  it("draws nothing when Tanglespan Lookout itself arrives", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const before = alice.hand.length;

    enters(state, "tanglespan-lookout", alice.id);

    expect(alice.hand.length).toBe(before);
  });

  it("ignores a creature arriving, because it watches Auras", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "tanglespan-lookout", alice.id);
    const before = alice.hand.length;

    enters(state, "eager-cadet", alice.id);

    expect(alice.hand.length).toBe(before);
  });

  it("draws when an Aura enters", () => {
    // There is no Aura in the pool yet, so one is defined here - which is the
    // point of the filter: the card is dormant today and works the day an Aura
    // is added, rather than needing to be found and fixed again then.
    const state = createGameState(["alice", "bob"], {
      ...TEST_CARD_DEFINITIONS,
      "test-aura": {
        id: "test-aura",
        name: "Test Aura",
        types: ["Enchantment"],
        subtypes: ["Aura"],
        manaCost: { generic: 1, colors: {} },
        colorIdentity: ["W"],
        tier: "vanilla",
      },
    });
    const alice = state.players[0]!;
    // A test game starts with an empty library, and drawing from an empty
    // library is a no-op - so without this the assertion passes or fails for
    // reasons that have nothing to do with the trigger.
    createCardInstance(state, "eager-cadet", alice.id, "library");
    enters(state, "tanglespan-lookout", alice.id);
    const before = alice.hand.length;

    enters(state, "test-aura", alice.id);

    expect(alice.hand.length).toBe(before + 1);
  });
});

describe("matchesWatchFor", () => {
  const definition: CardDefinition = {
    id: "c",
    name: "C",
    types: ["Creature"],
    subtypes: ["Soldier"],
    colorIdentity: [],
    tier: "vanilla",
  };
  // What the watcher gets to look at. Built by hand here rather than from a
  // real instance, because these cases are about the filter and nothing else.
  const subject = (over: Partial<TriggerSubject> = {}): TriggerSubject => ({
    instanceId: "i1",
    controllerId: "mike",
    def: definition,
    hadCounters: false,
    counters: 0,
    isToken: false,
    ...over,
  });

  it("matches everything when no filter is given", () => {
    expect(matchesWatchFor(undefined, subject())).toBe(true);
  });

  it("matches on card type", () => {
    expect(matchesWatchFor({ type: "Creature" }, subject())).toBe(true);
    expect(matchesWatchFor({ type: "Enchantment" }, subject())).toBe(false);
  });

  it("matches on subtype", () => {
    expect(matchesWatchFor({ subtype: "Soldier" }, subject())).toBe(true);
    expect(matchesWatchFor({ subtype: "Aura" }, subject())).toBe(false);
  });

  it("requires both when both are given", () => {
    expect(matchesWatchFor({ type: "Creature", subtype: "Soldier" }, subject())).toBe(true);
    expect(matchesWatchFor({ type: "Enchantment", subtype: "Soldier" }, subject())).toBe(false);
  });

  it("narrows to permanents that had a +1/+1 counter", () => {
    expect(matchesWatchFor({ withCounter: true }, subject({ hadCounters: true }))).toBe(true);
    expect(matchesWatchFor({ withCounter: true }, subject({ hadCounters: false }))).toBe(false);
  });

  it("narrows to nontoken permanents", () => {
    expect(matchesWatchFor({ nontoken: true }, subject({ isToken: false }))).toBe(true);
    expect(matchesWatchFor({ nontoken: true }, subject({ isToken: true }))).toBe(false);
  });
});
