import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { effectivePower } from "../counters.js";
import { isValidTarget, legalTargetsFor } from "../targeting.js";
import { potentialAvailableMana } from "../mana.js";

/** Puts the game in a main phase with the given player holding priority. */
function mainPhase(playerIndex = 0) {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = playerIndex;
  state.priorityPlayerIndex = playerIndex;
  return state;
}

describe("land destruction", () => {
  it("Stone Rain puts a land in its owner's graveyard", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const target = createCardInstance(state, "forest", bob.id, "battlefield");
    const rain = createCardInstance(state, "stone-rain", alice.id, "hand"); // {2}{R}
    alice.manaPool = { R: 1, generic: 2 };

    castSpell(state, alice.id, rain.instanceId, [{ kind: "card", instanceId: target.instanceId }]);
    resolveTopOfStack(state);

    expect(bob.battlefield.some((c) => c.instanceId === target.instanceId)).toBe(false);
    expect(bob.graveyard.some((c) => c.instanceId === target.instanceId)).toBe(true);
  });

  it("actually costs the victim the mana - not just the card", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "forest", bob.id, "battlefield");
    const doomed = createCardInstance(state, "forest", bob.id, "battlefield");
    const rain = createCardInstance(state, "stone-rain", alice.id, "hand");
    alice.manaPool = { R: 1, generic: 2 };

    expect(potentialAvailableMana(state, bob.id).G).toBe(2);
    castSpell(state, alice.id, rain.instanceId, [{ kind: "card", instanceId: doomed.instanceId }]);
    resolveTopOfStack(state);

    expect(potentialAvailableMana(state, bob.id).G).toBe(1);
  });

  it("cannot be pointed at a creature", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const rain = createCardInstance(state, "stone-rain", alice.id, "hand");
    alice.manaPool = { R: 1, generic: 2 };

    expect(() =>
      castSpell(state, alice.id, rain.instanceId, [{ kind: "card", instanceId: bears.instanceId }]),
    ).toThrow();
    // The engine validates targets before paying anything, so a rejected cast
    // leaves the game exactly as it was.
    expect(alice.hand.some((c) => c.instanceId === rain.instanceId)).toBe(true);
    expect(alice.manaPool).toEqual({ R: 1, generic: 2 });
  });

  it("cannot be pointed at a land still in hand", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const inHand = createCardInstance(state, "forest", bob.id, "hand");

    expect(
      isValidTarget(state, { kind: "permanent", cardType: "Land" }, { kind: "card", instanceId: inHand.instanceId }, alice.id),
    ).toBe(false);
  });

  it("lists every land on the battlefield as a legal target, both sides included", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const mine = createCardInstance(state, "mountain", alice.id, "battlefield");
    const theirs = createCardInstance(state, "forest", bob.id, "battlefield");
    createCardInstance(state, "grizzly-bears", bob.id, "battlefield");

    const targets = legalTargetsFor(state, { kind: "permanent", cardType: "Land" }, alice.id);
    const ids = targets.map((t) => (t.kind === "card" ? t.instanceId : t.kind));
    expect(ids).toContain(mine.instanceId);
    expect(ids).toContain(theirs.instanceId);
    expect(ids).toHaveLength(2);
  });

  it("Demystify destroys an anthem, and the creatures under it shrink", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const anthem = createCardInstance(state, "glorious-anthem", bob.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const demystify = createCardInstance(state, "demystify", alice.id, "hand"); // {W}
    alice.manaPool = { W: 1 };

    expect(effectivePower(state, bears)).toBe(3); // 2/2 plus the anthem

    castSpell(state, alice.id, demystify.instanceId, [{ kind: "card", instanceId: anthem.instanceId }]);
    resolveTopOfStack(state);
    checkStateBasedActions(state);

    expect(bob.graveyard.some((c) => c.instanceId === anthem.instanceId)).toBe(true);
    expect(effectivePower(state, bears)).toBe(2);
  });

  it("an Indestructible artifact shrugs it off", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const myr = createCardInstance(state, "darksteel-myr", bob.id, "battlefield"); // Indestructible artifact creature
    const shatter = createCardInstance(state, "shatter", alice.id, "hand"); // {1}{R}
    alice.manaPool = { R: 1, generic: 1 };

    castSpell(state, alice.id, shatter.instanceId, [{ kind: "card", instanceId: myr.instanceId }]);
    resolveTopOfStack(state);

    expect(bob.battlefield.some((c) => c.instanceId === myr.instanceId)).toBe(true);
  });
});

describe("this spell can't be countered", () => {
  it("Terra Stomper resolves anyway when Counterspell is aimed at it", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const stomper = createCardInstance(state, "terra-stomper", alice.id, "hand"); // {3}{G}{G}{G}
    const counter = createCardInstance(state, "counterspell", bob.id, "hand"); // {U}{U}
    alice.manaPool = { G: 3, generic: 3 };
    bob.manaPool = { U: 2 };

    castSpell(state, alice.id, stomper.instanceId);
    state.priorityPlayerIndex = 1; // Bob responds
    const stomperOnStack = state.stack[0]!;
    castSpell(state, bob.id, counter.instanceId, [{ kind: "spell", stackObjectId: stomperOnStack.id }]);

    resolveTopOfStack(state); // the Counterspell, which does nothing
    expect(state.stack).toHaveLength(1);
    resolveTopOfStack(state); // Terra Stomper

    expect(alice.battlefield.some((c) => c.instanceId === stomper.instanceId)).toBe(true);
    expect(state.log.some((entry) => entry.text.includes("can't be countered"))).toBe(true);
  });

  it("is still a legal target - the restriction is on the effect, not the targeting", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const stomper = createCardInstance(state, "terra-stomper", alice.id, "hand");
    alice.manaPool = { G: 3, generic: 3 };

    castSpell(state, alice.id, stomper.instanceId);
    const onStack = state.stack[0]!;

    expect(isValidTarget(state, { kind: "spell" }, { kind: "spell", stackObjectId: onStack.id }, bob.id)).toBe(true);
  });

  it("does not let 'unless its controller pays' charge them either", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const stomper = createCardInstance(state, "terra-stomper", alice.id, "hand");
    const leak = createCardInstance(state, "mana-leak", bob.id, "hand"); // counter unless they pay {3}
    alice.manaPool = { G: 3, generic: 6 };
    bob.manaPool = { U: 1, generic: 1 };

    castSpell(state, alice.id, stomper.instanceId);
    const manaLeft = { ...alice.manaPool };
    state.priorityPlayerIndex = 1; // Bob responds
    castSpell(state, bob.id, leak.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]);
    resolveTopOfStack(state);
    resolveTopOfStack(state);

    expect(alice.battlefield.some((c) => c.instanceId === stomper.instanceId)).toBe(true);
    expect(alice.manaPool).toEqual(manaLeft); // no tax was extracted on the way through
  });

  it("Last Word still counters a normal spell - the flag protects it, not its targets", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    const lastWord = createCardInstance(state, "last-word", bob.id, "hand"); // {2}{U}{U}
    alice.manaPool = { G: 1, generic: 1 };
    bob.manaPool = { U: 2, generic: 2 };

    castSpell(state, alice.id, bears.instanceId);
    state.priorityPlayerIndex = 1; // Bob responds
    castSpell(state, bob.id, lastWord.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]);
    resolveTopOfStack(state);

    expect(state.stack).toHaveLength(0);
    expect(alice.graveyard.some((c) => c.instanceId === bears.instanceId)).toBe(true);
  });

  it("Last Word cannot itself be countered", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    const lastWord = createCardInstance(state, "last-word", bob.id, "hand");
    const counter = createCardInstance(state, "counterspell", alice.id, "hand");
    alice.manaPool = { G: 1, generic: 1 };
    bob.manaPool = { U: 2, generic: 2 };

    castSpell(state, alice.id, bears.instanceId);
    state.priorityPlayerIndex = 1; // Bob responds
    castSpell(state, bob.id, lastWord.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]);
    state.priorityPlayerIndex = 0; // and Alice responds to that
    alice.manaPool = { U: 2 };
    castSpell(state, alice.id, counter.instanceId, [{ kind: "spell", stackObjectId: state.stack[1]!.id }]);

    resolveTopOfStack(state); // Alice's Counterspell - does nothing
    resolveTopOfStack(state); // Last Word - counters the bears
    expect(alice.graveyard.some((c) => c.instanceId === bears.instanceId)).toBe(true);
  });
});
