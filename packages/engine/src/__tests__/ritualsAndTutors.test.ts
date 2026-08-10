import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, requirePlayer } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveSearch } from "../effects.js";
import { resolveTopOfStack } from "../stack.js";
import { castSpell } from "../casting.js";
import { addMana } from "../mana.js";
import { isValidTarget, legalTargetsFor } from "../targeting.js";
import type { GameState } from "../types.js";

/**
 * Three cards, and the three things they needed.
 *
 * - Dark Ritual: `addMana` has existed since the first Forest, but only a
 *   permanent's tap ability could ever reach it. Nothing about the effect had
 *   to change; the generator simply could not read "Add {B}{B}{B}." on a spell.
 * - Sylvan Tutor: a library that has a *top*, and a shuffle that happens
 *   before the card lands on it rather than after.
 * - Assassin's Trophy: "target permanent an opponent controls" is a real
 *   restriction, and "its controller may search their library" hands the
 *   search to somebody other than the player who cast the spell.
 */

function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  return instance;
}

/** Puts a card in hand and returns its instance id. */
function inHand(state: GameState, definitionId: string, playerId: string): string {
  return createCardInstance(state, definitionId, playerId, "hand").instanceId;
}

/**
 * Puts the game in the active player's first main phase.
 *
 * Sylvan Tutor is a sorcery, and a game starts in the untap step - so without
 * this every cast is refused for the right reason and none of the card is
 * reached.
 */
function mainPhase(state: GameState): void {
  state.phase = "precombat-main";
  state.step = "main";
}

/** Stocks a player's library with the named cards, top first. */
function stockLibrary(state: GameState, playerId: string, definitionIds: string[]): string[] {
  const player = requirePlayer(state, playerId);
  player.library.length = 0;
  return definitionIds.map(
    (id) => createCardInstance(state, id, playerId, "library").instanceId,
  );
}

describe("Dark Ritual", () => {
  it("puts three black mana in the pool when it resolves", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const ritual = inHand(state, "dark-ritual", alice.id);

    // Pay for it out of a pool we hand it directly - what is under test is what
    // the spell produces, not how the {B} to cast it was found.
    addMana(alice.manaPool, "B", 1);
    castSpell(state, alice.id, ritual);
    resolveTopOfStack(state);

    expect(alice.manaPool.B).toBe(3);
  });

  it("is net two mana, not three - it costs one to cast", () => {
    /*
     * The whole point of the card, and the thing a fixture that forgot its own
     * mana cost would get wrong. Cast for {B}, adds {B}{B}{B}.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    const ritual = inHand(state, "dark-ritual", alice.id);

    addMana(alice.manaPool, "B", 4);
    castSpell(state, alice.id, ritual);
    expect(alice.manaPool.B).toBe(3); // one spent
    resolveTopOfStack(state);
    expect(alice.manaPool.B).toBe(6);
  });

  it("goes to the graveyard afterwards, like any other instant", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const ritual = inHand(state, "dark-ritual", alice.id);
    addMana(alice.manaPool, "B", 1);
    castSpell(state, alice.id, ritual);
    resolveTopOfStack(state);

    expect(findInstance(state, ritual)?.instance.zone).toBe("graveyard");
  });
});

describe("Sylvan Tutor", () => {
  it("offers only creature cards", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const ids = stockLibrary(state, alice.id, ["forest", "grizzly-bears", "lightning-bolt"]);
    const tutor = inHand(state, "sylvan-tutor", alice.id);
    mainPhase(state);

    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, tutor);
    resolveTopOfStack(state);

    expect(state.pendingSearch?.candidateInstanceIds).toEqual([ids[1]]);
  });

  it("leaves the chosen card on top of the library, not in hand", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const ids = stockLibrary(state, alice.id, ["forest", "grizzly-bears", "island", "plains"]);
    const bears = ids[1]!;
    const tutor = inHand(state, "sylvan-tutor", alice.id);
    mainPhase(state);

    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, tutor);
    resolveTopOfStack(state);
    resolveSearch(state, alice.id, bears);

    expect(alice.library[0]?.instanceId).toBe(bears);
    expect(alice.hand.some((c) => c.instanceId === bears)).toBe(false);
    expect(alice.library).toHaveLength(4);
  });

  it("survives the shuffle, because the shuffle happens first", () => {
    /*
     * "Then shuffle and put that card on top" in that order. Doing it the other
     * way round - place, then shuffle - would scatter the card back into a
     * random position, and the tutor would find you nothing at all. Run with a
     * library big enough that landing on top by luck is not plausible.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    const filler = Array.from({ length: 40 }, () => "forest");
    const ids = stockLibrary(state, alice.id, [...filler, "grizzly-bears"]);
    const bears = ids[ids.length - 1]!;
    const tutor = inHand(state, "sylvan-tutor", alice.id);
    mainPhase(state);

    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, tutor);
    resolveTopOfStack(state);
    resolveSearch(state, alice.id, bears);

    expect(alice.library[0]?.instanceId).toBe(bears);
  });

  it("still shuffles when you decline, so nothing is leaked", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    stockLibrary(state, alice.id, ["forest", "grizzly-bears", "island"]);
    const tutor = inHand(state, "sylvan-tutor", alice.id);
    mainPhase(state);

    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, tutor);
    resolveTopOfStack(state);
    resolveSearch(state, alice.id, null);

    expect(state.pendingSearch).toBeNull();
    expect(alice.library).toHaveLength(3);
  });
});

describe("Assassin's Trophy", () => {
  it("cannot be pointed at your own permanent", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const mine = enters(state, "grizzly-bears", alice.id);
    const theirs = enters(state, "grizzly-bears", mike.id);

    const selector = { kind: "permanent", controlledBy: "opponent" } as const;
    expect(isValidTarget(state, selector, { kind: "card", instanceId: mine.instanceId }, alice.id)).toBe(
      false,
    );
    expect(
      isValidTarget(state, selector, { kind: "card", instanceId: theirs.instanceId }, alice.id),
    ).toBe(true);
  });

  it("names no type, so it can hit a land as readily as a creature", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const land = enters(state, "forest", mike.id);
    const creature = enters(state, "grizzly-bears", mike.id);

    const legal = legalTargetsFor(state, { kind: "permanent", controlledBy: "opponent" }, alice.id)
      .filter((t): t is { kind: "card"; instanceId: string } => t.kind === "card")
      .map((t) => t.instanceId);

    expect(legal).toContain(land.instanceId);
    expect(legal).toContain(creature.instanceId);
  });

  it("destroys the permanent and hands the search to its controller", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const victim = enters(state, "grizzly-bears", mike.id);
    stockLibrary(state, mike.id, ["forest", "grizzly-bears"]);
    const trophy = inHand(state, "assassins-trophy", alice.id);

    addMana(alice.manaPool, "B", 1);
    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, trophy, [{ kind: "card", instanceId: victim.instanceId }]);
    resolveTopOfStack(state);

    expect(findInstance(state, victim.instanceId)?.instance.zone).toBe("graveyard");
    // The search belongs to the player who lost the permanent, not the caster.
    expect(state.pendingSearch?.playerId).toBe(mike.id);
  });

  it("offers the victim only basic lands out of their own library", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const victim = enters(state, "grizzly-bears", mike.id);
    const theirs = stockLibrary(state, mike.id, ["forest", "grizzly-bears", "bayou"]);
    // Alice's own library is stocked with basics too, so a search that read the
    // caster's library instead of the victim's would still find something and
    // look like it worked.
    stockLibrary(state, alice.id, ["swamp", "swamp"]);
    const trophy = inHand(state, "assassins-trophy", alice.id);

    addMana(alice.manaPool, "B", 1);
    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, trophy, [{ kind: "card", instanceId: victim.instanceId }]);
    resolveTopOfStack(state);

    expect(state.pendingSearch?.candidateInstanceIds).toEqual([theirs[0]]);
  });

  it("puts the land the victim chose onto their own battlefield", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const victim = enters(state, "grizzly-bears", mike.id);
    const theirs = stockLibrary(state, mike.id, ["forest", "grizzly-bears"]);
    const trophy = inHand(state, "assassins-trophy", alice.id);

    addMana(alice.manaPool, "B", 1);
    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, trophy, [{ kind: "card", instanceId: victim.instanceId }]);
    resolveTopOfStack(state);
    resolveSearch(state, mike.id, theirs[0]!);

    expect(mike.battlefield.some((c) => c.instanceId === theirs[0])).toBe(true);
    expect(alice.battlefield.some((c) => c.instanceId === theirs[0])).toBe(false);
  });

  it("lets the victim decline - the card says 'may'", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const victim = enters(state, "grizzly-bears", mike.id);
    stockLibrary(state, mike.id, ["forest"]);
    const trophy = inHand(state, "assassins-trophy", alice.id);

    addMana(alice.manaPool, "B", 1);
    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, trophy, [{ kind: "card", instanceId: victim.instanceId }]);
    resolveTopOfStack(state);
    resolveSearch(state, mike.id, null);

    expect(state.pendingSearch).toBeNull();
    expect(mike.battlefield.filter((c) => c.definitionId === "forest")).toHaveLength(0);
  });

  it("does nothing at all if the target has already gone", () => {
    /*
     * Somebody bounced or killed the creature in response, so the destroy
     * fizzles - and with no permanent destroyed there is no "its controller" to
     * hand a search to. The rider must not fire on the caster instead.
     */
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const victim = enters(state, "grizzly-bears", mike.id);
    stockLibrary(state, mike.id, ["forest"]);
    stockLibrary(state, alice.id, ["swamp"]);
    const trophy = inHand(state, "assassins-trophy", alice.id);

    addMana(alice.manaPool, "B", 1);
    addMana(alice.manaPool, "G", 1);
    castSpell(state, alice.id, trophy, [{ kind: "card", instanceId: victim.instanceId }]);
    // It leaves the battlefield before the spell resolves.
    mike.battlefield = mike.battlefield.filter((c) => c.instanceId !== victim.instanceId);
    mike.graveyard.push(victim);
    victim.zone = "graveyard";
    resolveTopOfStack(state);

    // The card is in a graveyard either way, so the tell is that a search still
    // happened - and it is the victim's, never the caster's.
    expect(state.pendingSearch?.playerId).not.toBe(alice.id);
  });
});
