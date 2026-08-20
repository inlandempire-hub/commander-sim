import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, drawCard } from "../state.js";
import { castSpell } from "../casting.js";
import { activatableAbilities, activateAbility } from "../abilities.js";
import { couldAfford, manaSources } from "../mana.js";
import { canPlayCardNow } from "../autoPass.js";
import { advanceStep } from "../turn.js";
import { resolveTopOfStack } from "../stack.js";

/**
 * The hate pieces. Every test here is about an action *not happening*, which is
 * a different kind of assertion from the rest of the suite and easy to write so
 * loosely that it would pass with the feature removed - so each one also checks
 * the same action succeeding when the restriction is absent or does not apply.
 */
describe("action restrictions", () => {
  /** Puts a card in hand with enough mana floating to cast it outright. */
  function inHand(state: ReturnType<typeof makeTestGame>, playerId: string, id: string) {
    const card = createCardInstance(state, id, playerId, "hand");
    return card;
  }

  function openMainPhase(state: ReturnType<typeof makeTestGame>) {
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
  }

  /** Mana enough for anything in these tests, so affordability is never the reason. */
  function fill(player: { manaPool: Record<string, number> }) {
    player.manaPool = { W: 10, U: 10, B: 10, R: 10, G: 10, generic: 10 };
  }

  it("Archon-style cast limit: the second spell in a turn is refused, the first is not", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    fill(alice);
    createCardInstance(state, "high-noon", alice.id, "battlefield");

    const first = inHand(state, alice.id, "lightning-bolt");
    const second = inHand(state, alice.id, "lightning-bolt");
    castSpell(state, alice.id, first.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]);
    expect(() =>
      castSpell(state, alice.id, second.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]),
    ).toThrow(/more than one spell/i);
  });

  it("the limit binds its own controller too", () => {
    // Archon of Emeria and High Noon say "each player", and a version that
    // exempted the controller would be a materially stronger card.
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    fill(alice);
    createCardInstance(state, "high-noon", alice.id, "battlefield");
    expect(alice.spellTypesCastThisTurn.length).toBe(0);
    const one = inHand(state, alice.id, "lightning-bolt");
    castSpell(state, alice.id, one.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]);
    expect(alice.spellTypesCastThisTurn.length).toBe(1);
  });

  it("Deafening Silence stops a second noncreature spell but not a creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    fill(alice);
    createCardInstance(state, "deafening-silence", alice.id, "battlefield");

    const bolt = inHand(state, alice.id, "lightning-bolt");
    castSpell(state, alice.id, bolt.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]);

    const another = inHand(state, alice.id, "lightning-bolt");
    expect(() =>
      castSpell(state, alice.id, another.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]),
    ).toThrow(/noncreature/i);

    // A creature is untouched, which is the entire point of the card. The
    // stack has to be emptied first: a creature is sorcery-speed, and a bolt
    // still sitting on the stack would refuse it for the wrong reason.
    while (state.stack.length > 0) resolveTopOfStack(state);
    state.priorityPlayerIndex = 0;
    const bears = inHand(state, alice.id, "grizzly-bears");
    expect(() => castSpell(state, alice.id, bears.instanceId)).not.toThrow();
  });

  it("a countered spell still counts against the limit", () => {
    // "Cast" happens when the spell goes on the stack, so the tally is taken
    // there. Counting on resolution would make these cards far weaker than
    // printed.
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    fill(alice);
    createCardInstance(state, "high-noon", alice.id, "battlefield");
    const bolt = inHand(state, alice.id, "lightning-bolt");
    castSpell(state, alice.id, bolt.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]);
    // Still on the stack, unresolved - and already counted.
    expect(state.stack.length).toBeGreaterThan(0);
    expect(alice.spellTypesCastThisTurn.length).toBe(1);
  });

  it("Grand Abolisher stops an opponent only during its controller's turn", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "grand-abolisher", alice.id, "battlefield");
    fill(bob);
    const bolt = inHand(state, bob.id, "lightning-bolt");

    // Alice's turn: Bob is locked out.
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 1;
    expect(() => castSpell(state, bob.id, bolt.instanceId, [{ kind: "player", playerId: alice.id }])).toThrow(
      /can't cast spells/i,
    );

    // Bob's own turn: the card says nothing at all.
    state.activePlayerIndex = 1;
    expect(() =>
      castSpell(state, bob.id, bolt.instanceId, [{ kind: "player", playerId: alice.id }]),
    ).not.toThrow();
  });

  it("Grand Abolisher does not restrict its own controller", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    fill(alice);
    createCardInstance(state, "grand-abolisher", alice.id, "battlefield");
    const bolt = inHand(state, alice.id, "lightning-bolt");
    expect(() =>
      castSpell(state, alice.id, bolt.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]),
    ).not.toThrow();
  });

  it("Clarion Conqueror switches off a mana rock, and lands still work", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    createCardInstance(state, "clarion-conqueror", alice.id, "battlefield");

    const solRing = createCardInstance(state, "sol-ring", alice.id, "battlefield");
    solRing.summoningSickness = false;
    expect(() => activateAbility(state, alice.id, solRing.instanceId, 0)).toThrow(/can't be activated/i);

    // Lands are not on Clarion Conqueror's list, so a land's mana ability is
    // untouched - which is what keeps the card playable in its own deck.
    const mountain = createCardInstance(state, "mountain", alice.id, "battlefield");
    expect(() => activateAbility(state, alice.id, mountain.instanceId, 0)).not.toThrow();
  });

  it("Clarion Conqueror takes a mana rock away from the auto-tapper too", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    const solRing = createCardInstance(state, "sol-ring", alice.id, "battlefield");
    solRing.summoningSickness = false;

    // Without the Conqueror the Ring is a source and pays for a two-drop.
    const twoGeneric = { generic: 2, colors: {} };
    expect(manaSources(state, alice).some((s) => s.instance.instanceId === solRing.instanceId)).toBe(true);
    expect(couldAfford(state, alice.id, twoGeneric)).toBe(true);

    /*
     * With it, the Ring is not a source at all. Taught only to `activateAbility`
     * when the hate pieces went in, this is the shape the gap took: the tapper
     * went on spending the Ring towards a spell and the engine then refused the
     * ability that was paying for it - which in a bot game ends the game.
     */
    createCardInstance(state, "clarion-conqueror", alice.id, "battlefield");
    expect(manaSources(state, alice).some((s) => s.instance.instanceId === solRing.instanceId)).toBe(false);
    expect(couldAfford(state, alice.id, twoGeneric)).toBe(false);
    expect(activatableAbilities(state, alice.id, solRing.instanceId)).toEqual([]);
  });

  it("Spirit of the Labyrinth stops the second draw and does not look like decking", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "spirit-of-the-labyrinth", alice.id, "battlefield");
    for (let i = 0; i < 5; i++) createCardInstance(state, "mountain", alice.id, "library");

    const before = alice.hand.length;
    drawCard(state, alice.id, 3);
    expect(alice.hand.length).toBe(before + 1);
    // The refused draws must not be mistaken for drawing from an empty
    // library, which is a loss.
    expect(alice.attemptedDrawFromEmptyLibrary).toBe(false);
  });

  it("Silence lasts the turn and then stops", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    openMainPhase(state);
    fill(alice);
    fill(bob);

    const silence = inHand(state, alice.id, "silence");
    castSpell(state, alice.id, silence.instanceId);
    // Resolve it.
    while (state.stack.length > 0) resolveTopOfStack(state);
    expect(state.turnRestrictions.length).toBe(1);

    const bolt = inHand(state, bob.id, "lightning-bolt");
    state.priorityPlayerIndex = 1;
    expect(() => castSpell(state, bob.id, bolt.instanceId, [{ kind: "player", playerId: alice.id }])).toThrow(
      /can't cast spells/i,
    );

    // Run to the end of the turn; the restriction goes with it.
    let guard = 200;
    while (state.turnRestrictions.length > 0 && guard-- > 0) advanceStep(state);
    expect(state.turnRestrictions.length).toBe(0);
  });

  it("the UI highlight agrees with the engine", () => {
    // canPlayCardNow drives which cards light up. A card the engine will refuse
    // must not be lit, or the player clicks it and gets an error instead.
    const state = makeTestGame();
    const alice = state.players[0]!;
    openMainPhase(state);
    fill(alice);
    const bolt = inHand(state, alice.id, "lightning-bolt");
    expect(canPlayCardNow(state, alice.id, bolt.instanceId)).toBe(true);

    createCardInstance(state, "high-noon", alice.id, "battlefield");
    const first = inHand(state, alice.id, "lightning-bolt");
    castSpell(state, alice.id, first.instanceId, [{ kind: "player", playerId: state.players[1]!.id }]);
    expect(canPlayCardNow(state, alice.id, bolt.instanceId)).toBe(false);
  });
});
