import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requireDefinition } from "../state.js";
import { activateAbility } from "../abilities.js";
import { commanderColorIdentity, potentialAvailableMana } from "../mana.js";
import { manaSources, planManaPayment } from "../autoTap.js";
import type { GameState } from "../types.js";

/**
 * A choice of five colours, written as five abilities.
 *
 * `activatedAbilities` was already a list, so a card that taps for any colour
 * needs no new engine concept - the same trick "{T}: Add {B} or {G}" uses. What
 * did need one is Command Tower, which is the same shape restricted to the
 * commander's colours: the identical land makes different mana in different
 * decks, and it is the only place in the engine where one card's legality
 * depends on another.
 */

function mainPhase(): GameState {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

/** Puts a Golgari commander in the command zone, so identity is B/G. */
function golgariCommander(state: GameState, playerId: string): void {
  const instance = createCardInstance(state, "tifa-lockhart", playerId, "command");
  instance.isCommander = true;
}

describe("Birds of Paradise", () => {
  it("has one ability per colour", () => {
    const state = mainPhase();
    const abilities = requireDefinition(state, "birds-of-paradise").activatedAbilities ?? [];
    const colors = abilities.map((a) => (a.effect.kind === "addMana" ? a.effect.color : "?"));
    expect(colors).toEqual(["W", "U", "B", "R", "G"]);
  });

  it("taps for whichever one is asked for", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const birds = createCardInstance(state, "birds-of-paradise", alice.id, "battlefield");
    birds.summoningSickness = false;

    activateAbility(state, alice.id, birds.instanceId, 3); // red

    expect(alice.manaPool.R).toBe(1);
    expect(birds.tapped).toBe(true);
  });

  it("only makes one mana, not five", () => {
    // Five abilities on one permanent, and tapping is the cost of all of them.
    const state = mainPhase();
    const alice = state.players[0]!;
    const birds = createCardInstance(state, "birds-of-paradise", alice.id, "battlefield");
    birds.summoningSickness = false;

    expect(potentialAvailableMana(state, alice.id)).toEqual({ W: 1, U: 1, B: 1, R: 1, G: 1 });
    activateAbility(state, alice.id, birds.instanceId, 0);
    expect(() => activateAbility(state, alice.id, birds.instanceId, 1)).toThrow(/already tapped/);
  });

  it("is still summoning sick the turn it lands", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const birds = createCardInstance(state, "birds-of-paradise", alice.id, "battlefield");
    birds.summoningSickness = true;

    expect(() => activateAbility(state, alice.id, birds.instanceId, 0)).toThrow(/summoning sickness/);
  });

  it("lets auto-tap pick the colour a spell needs", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const birds = createCardInstance(state, "birds-of-paradise", alice.id, "battlefield");
    birds.summoningSickness = false;

    const plan = planManaPayment(state, alice.id, { generic: 0, colors: { U: 1 } });
    expect(plan.paid).toBe(true);
    expect(plan.taps).toHaveLength(1);
    expect(plan.taps[0]!.color).toBe("U");
  });
});

describe("Command Tower", () => {
  it("marks every half as identity-restricted", () => {
    const state = mainPhase();
    const abilities = requireDefinition(state, "command-tower").activatedAbilities ?? [];
    expect(abilities).toHaveLength(5);
    for (const ability of abilities) expect(ability.requiresCommanderIdentity).toBe(true);
  });

  it("taps for a colour the commander has", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    golgariCommander(state, alice.id); // Tifa Lockhart is mono-green
    const tower = createCardInstance(state, "command-tower", alice.id, "battlefield");

    activateAbility(state, alice.id, tower.instanceId, 4); // green

    expect(alice.manaPool.G).toBe(1);
  });

  it("refuses a colour the commander does not have", () => {
    // The whole reason `requiresCommanderIdentity` exists. Five bare abilities
    // would let a green deck's Command Tower tap for white, which is not the
    // card - and nothing else in the engine would ever have complained.
    const state = mainPhase();
    const alice = state.players[0]!;
    golgariCommander(state, alice.id);
    const tower = createCardInstance(state, "command-tower", alice.id, "battlefield");

    expect(() => activateAbility(state, alice.id, tower.instanceId, 0)).toThrow(/that colour/);
    expect(tower.tapped).toBe(false);
  });

  it("offers only the allowed colours as mana", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    golgariCommander(state, alice.id);
    createCardInstance(state, "command-tower", alice.id, "battlefield");

    expect(potentialAvailableMana(state, alice.id)).toEqual({ G: 1 });
    expect(manaSources(state, alice)).toHaveLength(1);
  });

  it("makes no mana at all with no commander", () => {
    // An empty identity allows nothing, which is right: a Command Tower with no
    // commander taps for nothing in the real game too.
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "command-tower", alice.id, "battlefield");

    expect(potentialAvailableMana(state, alice.id)).toEqual({});
  });

  it("counts a commander wherever it currently is", () => {
    // Identity is a property of the card, not of where it happens to be
    // sitting. A commander on the battlefield or in the graveyard still sets
    // the deck's colours.
    const state = mainPhase();
    const alice = state.players[0]!;
    const commander = createCardInstance(state, "tifa-lockhart", alice.id, "graveyard");
    commander.isCommander = true;

    expect(commanderColorIdentity(state, alice.id)).toEqual(["G"]);
  });

  it("does not read the opponent's commander", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    golgariCommander(state, bob.id);

    expect(commanderColorIdentity(state, alice.id)).toEqual([]);
  });
});
