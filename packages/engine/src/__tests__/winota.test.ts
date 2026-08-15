import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { declareAttackers } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";
import { resolveSearch } from "../effects.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";

/**
 * Winota is the first card in this engine that puts a permanent onto the
 * battlefield *into a combat already under way*, so these tests are as much
 * about that primitive as about the card.
 *
 * The one that matters most is the last: a creature deployed this way was never
 * declared as an attacker (rule 508.3b), so nothing that watches for a creature
 * attacking may see it. Get that wrong and Winota loops on her own output.
 */
describe("Winota, Joiner of Forces", () => {
  /** Winota on the battlefield, a library stacked with the given card ids, and combat open. */
  function setUp(libraryIds: string[]) {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const winota = createCardInstance(state, "winota-joiner-of-forces", alice.id, "battlefield");
    winota.summoningSickness = false;

    // Built top-down: the first id given is the top of the library.
    // `createCardInstance` appends to the zone itself, so pushing the return
    // value as well puts every card in twice - which is how the first draft of
    // this file reported a library that both lost a card and kept it.
    alice.library.length = 0;
    for (const id of libraryIds) createCardInstance(state, id, alice.id, "library");

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    return { state, alice, bob, winota };
  }

  /** A creature id in the pool whose printed subtypes do (or do not) include Human. */
  const HUMAN = "youthful-knight"; // Human Knight
  const NON_HUMAN = "craw-wurm"; // Wurm

  it("the pool actually contains the creatures these tests assume", () => {
    // Guards the fixtures rather than the engine: a later rename of either card
    // would otherwise make every test below pass for the wrong reason.
    expect(TEST_CARD_DEFINITIONS[HUMAN]?.subtypes).toContain("Human");
    expect(TEST_CARD_DEFINITIONS[NON_HUMAN]?.subtypes ?? []).not.toContain("Human");
  });

  it("a non-Human creature attacking sets the trigger off", () => {
    const { state, alice, bob } = setUp([HUMAN]);
    const wurm = createCardInstance(state, NON_HUMAN, alice.id, "battlefield");
    wurm.summoningSickness = false;

    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    expect(state.stack.length).toBe(1);
  });

  it("a Human creature attacking does not", () => {
    const { state, alice, bob } = setUp([HUMAN]);
    const knight = createCardInstance(state, HUMAN, alice.id, "battlefield");
    knight.summoningSickness = false;

    declareAttackers(state, alice.id, [{ attackerInstanceId: knight.instanceId, defendingPlayerId: bob.id }]);
    expect(state.stack.length).toBe(0);
  });

  it("offers only the Human creature cards among the top six", () => {
    // Six on top, of which two are Human; a seventh Human sits below the six and
    // must not be reachable.
    const { state, alice, bob } = setUp([
      NON_HUMAN,
      HUMAN,
      NON_HUMAN,
      NON_HUMAN,
      HUMAN,
      NON_HUMAN,
      HUMAN,
    ]);
    const wurm = createCardInstance(state, NON_HUMAN, alice.id, "battlefield");
    wurm.summoningSickness = false;

    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    resolveTopOfStack(state);

    expect(state.pendingSearch).not.toBeNull();
    expect(state.pendingSearch!.candidateInstanceIds.length).toBe(2);
    expect(state.pendingSearch!.bottomInstanceIds!.length).toBe(6);
  });

  it("the chosen Human arrives tapped, attacking and indestructible", () => {
    const { state, alice, bob } = setUp([HUMAN, NON_HUMAN, NON_HUMAN]);
    const wurm = createCardInstance(state, NON_HUMAN, alice.id, "battlefield");
    wurm.summoningSickness = false;

    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    resolveTopOfStack(state);

    const chosen = state.pendingSearch!.candidateInstanceIds[0]!;
    resolveSearch(state, alice.id, chosen);

    const deployed = alice.battlefield.find((c) => c.instanceId === chosen);
    expect(deployed).toBeDefined();
    expect(deployed!.tapped).toBe(true);
    expect(deployed!.grantedKeywords).toContain("Indestructible");
    // Attacking the same player the combat was already aimed at.
    expect(state.attackers[chosen]).toBe(bob.id);
  });

  it("the deployed Human does not set Winota off again", () => {
    // The loop this rule exists to stop. It was never *declared* as an
    // attacker, so no attack trigger sees it - and in any case it is a Human,
    // which Winota's own filter excludes.
    const { state, alice, bob } = setUp([HUMAN, NON_HUMAN, NON_HUMAN]);
    const wurm = createCardInstance(state, NON_HUMAN, alice.id, "battlefield");
    wurm.summoningSickness = false;

    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    resolveTopOfStack(state);
    resolveSearch(state, alice.id, state.pendingSearch!.candidateInstanceIds[0]!);

    expect(state.stack.length).toBe(0);
    expect(state.pendingSearch).toBeNull();
  });

  it("the cards not taken go to the bottom, and the library keeps its size", () => {
    const { state, alice, bob } = setUp([HUMAN, NON_HUMAN, NON_HUMAN, NON_HUMAN]);
    const before = alice.library.length;
    const wurm = createCardInstance(state, NON_HUMAN, alice.id, "battlefield");
    wurm.summoningSickness = false;

    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    resolveTopOfStack(state);
    const chosen = state.pendingSearch!.candidateInstanceIds[0]!;
    resolveSearch(state, alice.id, chosen);

    // One card left the library for the battlefield; the other three are still
    // there, and none of them is on top any more.
    expect(alice.library.length).toBe(before - 1);
    expect(alice.library.some((c) => c.instanceId === chosen)).toBe(false);
  });

  it("declining takes nothing and still buries the six", () => {
    const { state, alice, bob } = setUp([HUMAN, NON_HUMAN, NON_HUMAN]);
    const before = alice.library.length;
    const wurm = createCardInstance(state, NON_HUMAN, alice.id, "battlefield");
    wurm.summoningSickness = false;

    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    resolveTopOfStack(state);
    resolveSearch(state, alice.id, null);

    expect(alice.library.length).toBe(before);
    expect(alice.battlefield.some((c) => c.definitionId === HUMAN)).toBe(false);
  });
});
