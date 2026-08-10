import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect, resolveSearch } from "../effects.js";
import { activateAbility } from "../abilities.js";
import { isValidTarget, legalTargetsFor, targetSelectorOf } from "../targeting.js";
import type { GameState, TargetSelector } from "../types.js";

/**
 * Sacrifice, and the two halves of it.
 *
 * Paying a sacrifice as an activation cost has worked since the fetchlands.
 * What arrived on 2026-08-10 is sacrifice as an *effect* (Riveteers Overlook
 * eats itself for nothing), a sequence of effects resolving as one object, and
 * a target selector that can name two card types and exclude creatures from
 * both.
 */

function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  return instance;
}

function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && !state.pendingSearch && guard-- > 0) resolveTopOfStack(state);
}

describe("a target selector naming two card types", () => {
  const selector: TargetSelector = {
    kind: "permanent",
    cardTypes: ["Artifact", "Enchantment"],
    noncreature: true,
  };

  it("accepts a noncreature artifact", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const ring = enters(state, "sol-ring", alice.id);

    expect(isValidTarget(state, selector, { kind: "card", instanceId: ring.instanceId }, alice.id)).toBe(true);
  });

  it("accepts an enchantment, because the card names two types", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const gift = enters(state, "lifegift", alice.id);

    expect(isValidTarget(state, selector, { kind: "card", instanceId: gift.instanceId }, alice.id)).toBe(true);
  });

  it("refuses an artifact creature", () => {
    /*
     * The whole point of the word "noncreature". Haywire Mite is itself an
     * Artifact Creature, so a selector that only checked the type would let it
     * exile itself - and would let it answer any artifact creature on the
     * table, which the printed card does not do.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    const mite = enters(state, "haywire-mite", alice.id);

    expect(isValidTarget(state, selector, { kind: "card", instanceId: mite.instanceId }, alice.id)).toBe(false);
  });

  it("refuses a land", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const forest = enters(state, "forest", alice.id);

    expect(isValidTarget(state, selector, { kind: "card", instanceId: forest.instanceId }, alice.id)).toBe(false);
  });

  it("offers exactly the permanents it should", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const ring = enters(state, "sol-ring", alice.id);
    const gift = enters(state, "lifegift", bob.id);
    enters(state, "haywire-mite", alice.id);
    enters(state, "forest", alice.id);

    const ids = legalTargetsFor(state, selector, alice.id)
      .filter((t): t is { kind: "card"; instanceId: string } => t.kind === "card")
      .map((t) => t.instanceId);

    expect(ids.sort()).toEqual([ring.instanceId, gift.instanceId].sort());
  });
});

describe("Haywire Mite", () => {
  it("exiles a noncreature artifact and sacrifices itself to do it", () => {
    // "{G}, Sacrifice this creature: Exile target noncreature artifact or
    // noncreature enchantment."
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const mite = enters(state, "haywire-mite", alice.id);
    mite.summoningSickness = false;
    const ring = enters(state, "sol-ring", bob.id);
    alice.manaPool.G = 1;

    activateAbility(state, alice.id, mite.instanceId, 0, [{ kind: "card", instanceId: ring.instanceId }]);
    drain(state);

    expect(bob.exile.map((c) => c.instanceId)).toContain(ring.instanceId);
    // The sacrifice is a cost, so it is paid on activation - the Mite is
    // already in the graveyard while its ability is still on the stack.
    expect(alice.graveyard.map((c) => c.instanceId)).toContain(mite.instanceId);
  });

  it("gains 2 life when it dies, including from paying its own cost", () => {
    // "When this creature dies, you gain 2 life." Sacrificing is a death, so
    // the Mite's own ability triggers it - which is the card's whole appeal.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const mite = enters(state, "haywire-mite", alice.id);
    mite.summoningSickness = false;
    const ring = enters(state, "sol-ring", bob.id);
    alice.manaPool.G = 1;
    const before = alice.life;

    activateAbility(state, alice.id, mite.instanceId, 0, [{ kind: "card", instanceId: ring.instanceId }]);
    drain(state);

    expect(alice.life).toBe(before + 2);
  });
});

describe("sacrifice as an effect", () => {
  it("puts the permanent in the graveyard with nothing paid", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const forest = enters(state, "forest", alice.id);

    applyEffect(state, alice.id, forest.instanceId, { kind: "sacrifice", what: "self" }, []);

    expect(alice.battlefield.map((c) => c.instanceId)).not.toContain(forest.instanceId);
    expect(alice.graveyard.map((c) => c.instanceId)).toContain(forest.instanceId);
  });

  it("does nothing when the permanent has already left", () => {
    // Somebody destroyed it in response. Sacrificing nothing is not an error.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const forest = createCardInstance(state, "forest", alice.id, "graveyard");

    expect(() =>
      applyEffect(state, alice.id, forest.instanceId, { kind: "sacrifice", what: "self" }, []),
    ).not.toThrow();
  });
});

describe("Riveteers Overlook", () => {
  /**
   * "When this land enters, sacrifice it. When you do, search your library for
   * a basic Swamp, Mountain, or Forest card, put it onto the battlefield
   * tapped, then shuffle and you gain 1 life."
   */
  function setUp() {
    const state = makeTestGame();
    const alice = state.players[0]!;
    for (let i = 0; i < 3; i++) createCardInstance(state, "forest", alice.id, "library");
    for (let i = 0; i < 2; i++) createCardInstance(state, "plains", alice.id, "library");
    const land = enters(state, "riveteers-overlook", alice.id);
    return { state, alice, land };
  }

  it("sacrifices itself and stops to ask which basic to take", () => {
    const { state, alice, land } = setUp();
    resolveTopOfStack(state);

    expect(alice.battlefield.map((c) => c.instanceId)).not.toContain(land.instanceId);
    expect(state.pendingSearch?.playerId).toBe(alice.id);
  });

  it("offers only the basics it names", () => {
    // Plains is a basic land, but not a Swamp, Mountain or Forest.
    const { state, alice } = setUp();
    resolveTopOfStack(state);

    const offered = state.pendingSearch!.candidateInstanceIds;
    const names = offered.map(
      (id) => state.cardDefinitions[alice.library.find((c) => c.instanceId === id)!.definitionId]!.name,
    );
    expect(new Set(names)).toEqual(new Set(["Forest"]));
  });

  it("puts the land in tapped and gains the life after the shuffle", () => {
    const { state, alice } = setUp();
    const before = alice.life;
    resolveTopOfStack(state);

    // Life is deliberately still unchanged: it is printed after the shuffle.
    expect(alice.life).toBe(before);

    const chosen = state.pendingSearch!.candidateInstanceIds[0]!;
    resolveSearch(state, alice.id, chosen);

    const fetched = alice.battlefield.find((c) => c.instanceId === chosen);
    expect(fetched?.tapped).toBe(true);
    expect(alice.life).toBe(before + 1);
  });

  it("still gains the life when the search finds nothing", () => {
    // Declining a search is always legal, and "and you gain 1 life" is not
    // conditional on having found a land.
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "plains", alice.id, "library");
    enters(state, "riveteers-overlook", alice.id);
    const before = alice.life;

    resolveTopOfStack(state);
    resolveSearch(state, alice.id, null);

    expect(alice.life).toBe(before + 1);
    expect(state.pendingSearch).toBeNull();
  });
});

describe("sequenced effects", () => {
  it("runs each step in order", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    for (let i = 0; i < 3; i++) createCardInstance(state, "forest", alice.id, "library");
    const source = enters(state, "sol-ring", alice.id);
    const before = { life: alice.life, hand: alice.hand.length };

    applyEffect(
      state,
      alice.id,
      source.instanceId,
      { kind: "sequence", effects: [{ kind: "gainLife", amount: 3 }, { kind: "draw", amount: 1 }] },
      [],
    );

    expect(alice.life).toBe(before.life + 3);
    expect(alice.hand.length).toBe(before.hand + 1);
  });

  it("suspends the rest while a search is pending", () => {
    /*
     * The reason `followUp` exists. A search does not finish, it stops and
     * asks - so anything written after it has to wait, or Riveteers Overlook
     * gains you life before you have even chosen a land.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "forest", alice.id, "library");
    const source = enters(state, "sol-ring", alice.id);
    const before = alice.life;

    applyEffect(
      state,
      alice.id,
      source.instanceId,
      {
        kind: "sequence",
        effects: [
          { kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "battlefield" },
          { kind: "gainLife", amount: 5 },
        ],
      },
      [],
    );

    expect(state.pendingSearch).not.toBeNull();
    expect(alice.life).toBe(before);

    resolveSearch(state, alice.id, null);
    expect(alice.life).toBe(before + 5);
  });

  it("refuses a sequence with two targeted steps rather than sharing one choice", () => {
    // Handing one target list to two targeted steps would look like it worked
    // and quietly point both at the same permanent.
    expect(() =>
      targetSelectorOf({
        kind: "sequence",
        effects: [
          { kind: "destroy", target: { kind: "creature" } },
          { kind: "exile", target: { kind: "creature" } },
        ],
      }),
    ).toThrow(/more than one targeted step/);
  });

  it("reports the single targeted step's selector", () => {
    const selector = targetSelectorOf({
      kind: "sequence",
      effects: [{ kind: "gainLife", amount: 1 }, { kind: "destroy", target: { kind: "creature" } }],
    });
    expect(selector).toEqual({ kind: "creature" });
  });
});

describe("the search picker's heading", () => {
  it("names the basic restriction and lists the types as printed", () => {
    // Riveteers Overlook asks for "a basic Swamp, Mountain, or Forest card".
    // This read "a Swamp or Mountain or Forest card" - which is both clumsy
    // and, by dropping "basic", describes a fetchland instead.
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "forest", alice.id, "library");
    enters(state, "riveteers-overlook", alice.id);

    resolveTopOfStack(state);

    expect(state.pendingSearch?.prompt).toBe(
      "Search your library for a basic Swamp, Mountain, or Forest card and put it onto the battlefield tapped",
    );
  });

  it("leaves a fetchland's heading unrestricted, because it is", () => {
    // Bloodstained Mire finds "a Swamp or Mountain card" - any card with the
    // type, dual lands included. No "basic".
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "swamp", alice.id, "library");
    const mire = enters(state, "bloodstained-mire", alice.id);
    mire.summoningSickness = false;

    activateAbility(state, alice.id, mire.instanceId, 0, []);
    // A tutor is not a mana ability, so it uses the stack and has to resolve.
    resolveTopOfStack(state);

    expect(state.pendingSearch?.prompt).toBe(
      "Search your library for a Swamp or Mountain card and put it onto the battlefield",
    );
  });
});
