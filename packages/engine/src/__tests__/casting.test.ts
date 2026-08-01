import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell, playLand } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { activateAbility } from "../abilities.js";

describe("casting spells", () => {
  it("Lightning Bolt kills a 2-toughness creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const bear = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    bear.summoningSickness = false;
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    alice.manaPool = { R: 1 };

    castSpell(state, alice.id, bolt.instanceId, [{ kind: "card", instanceId: bear.instanceId }]);
    expect(state.stack.length).toBe(1);

    resolveTopOfStack(state);
    checkStateBasedActions(state);

    expect(bob.battlefield.some((c) => c.instanceId === bear.instanceId)).toBe(false);
    expect(bob.graveyard.some((c) => c.instanceId === bear.instanceId)).toBe(true);
  });

  it("refuses to cast without enough mana", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");

    expect(() =>
      castSpell(state, alice.id, bolt.instanceId, [{ kind: "player", playerId: bob.id }]),
    ).toThrow();
  });

  it("requires a target for a damage spell", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    alice.manaPool = { R: 1 };

    expect(() => castSpell(state, alice.id, bolt.instanceId, [])).toThrow();
  });

  it("Elvish Visionary draws a card when it enters the battlefield", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    createCardInstance(state, "mountain", alice.id, "library"); // something to draw
    const visionary = createCardInstance(state, "elvish-visionary", alice.id, "hand");
    alice.manaPool = { G: 1, generic: 1 };

    castSpell(state, alice.id, visionary.instanceId);
    resolveTopOfStack(state); // creature enters the battlefield, ETB trigger goes on the stack
    expect(state.stack.length).toBe(1);
    resolveTopOfStack(state); // ETB trigger resolves

    expect(alice.hand.some((c) => c.definitionId === "mountain")).toBe(true);
    expect(alice.battlefield.some((c) => c.instanceId === visionary.instanceId)).toBe(true);
  });

  it("a tapped mana dork can be tapped for mana to cast a spell", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const elves = createCardInstance(state, "llanowar-elves", alice.id, "battlefield");
    elves.summoningSickness = false;
    const bear = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    alice.manaPool = { generic: 1 };

    activateAbility(state, alice.id, elves.instanceId, 0);
    expect(elves.tapped).toBe(true);
    expect(alice.manaPool.G).toBe(1);

    castSpell(state, alice.id, bear.instanceId);
    expect(state.stack.length).toBe(1);
  });
});

describe("playing lands", () => {
  it("allows only one land per turn", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const m1 = createCardInstance(state, "mountain", alice.id, "hand");
    const m2 = createCardInstance(state, "mountain", alice.id, "hand");

    playLand(state, alice.id, m1.instanceId);
    expect(alice.battlefield.some((c) => c.instanceId === m1.instanceId)).toBe(true);
    expect(() => playLand(state, alice.id, m2.instanceId)).toThrow();
  });

  it("can be tapped for mana the same turn it's played (summoning sickness doesn't apply to lands)", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const mountain = createCardInstance(state, "mountain", alice.id, "hand");

    playLand(state, alice.id, mountain.instanceId);
    expect(mountain.summoningSickness).toBe(true); // set generically on battlefield entry...

    activateAbility(state, alice.id, mountain.instanceId, 0); // ...but must not block tapping a land
    expect(mountain.tapped).toBe(true);
    expect(alice.manaPool.R).toBe(1);
  });
});
