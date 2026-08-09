import { describe, expect, it } from "vitest";
import { createCardInstance, createGameState, requireDefinition } from "../state.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { activatableAbilities, activateAbility } from "../abilities.js";
import { castSpell } from "../casting.js";
import { opponentLandColors, potentialAvailableMana, spendablePool } from "../mana.js";
import { manaSources } from "../autoTap.js";
import { resolveTopOfStack } from "../stack.js";
import { pushOntoStack } from "../permanents.js";
import { applyEffect } from "../effects.js";
import type { GameState } from "../types.js";

/**
 * Exotic Orchard and Delighted Halfling - the two cards the report filed under
 * "any colour mana", which the engine has had since Birds of Paradise. Neither
 * was blocked by that at all: one asks the *opponent's* board which colours it
 * may make, and the other makes mana that is not interchangeable with the rest
 * of the pool.
 *
 * The restricted-mana half is tested hardest at the boundary, because the
 * failure that matters is not "the card does nothing" but "the card quietly
 * does more than it should" - mana that leaks into the general pool would make
 * Delighted Halfling a strictly better Birds of Paradise.
 */

function mainPhase(): GameState {
  const state = createGameState(["donny", "mike"], TEST_CARD_DEFINITIONS);
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

describe("Exotic Orchard", () => {
  it("makes nothing against an empty board", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const orchard = createCardInstance(state, "exotic-orchard", donny.id, "battlefield");

    expect(activatableAbilities(state, donny.id, orchard.instanceId)).toEqual([]);
    expect(() => activateAbility(state, donny.id, orchard.instanceId, 0)).toThrow(/cannot make that colour/);
  });

  it("makes what the opponent's lands make", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    createCardInstance(state, "swamp", mike.id, "battlefield");
    const orchard = createCardInstance(state, "exotic-orchard", donny.id, "battlefield");

    expect(opponentLandColors(state, donny.id)).toEqual(["B"]);
    activateAbility(state, donny.id, orchard.instanceId, 2); // the black half
    expect(donny.manaPool.B).toBe(1);
  });

  it("does not read your own lands", () => {
    // It says "a land an opponent controls". A Forest of your own offers it
    // nothing, which is the difference between this and Command Tower.
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "forest", donny.id, "battlefield");

    expect(opponentLandColors(state, donny.id)).toEqual([]);
  });

  it("reads a dual for both its colours", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    createCardInstance(state, "bayou", mike.id, "battlefield");

    expect(opponentLandColors(state, donny.id)).toEqual(["B", "G"]);
  });

  it("ignores an opponent's colourless land", () => {
    // Colourless is not a colour, so a Wastes across the table offers nothing.
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    createCardInstance(state, "wastes", mike.id, "battlefield");

    expect(opponentLandColors(state, donny.id)).toEqual([]);
  });

  it("does not ask another Exotic Orchard what it makes", () => {
    /*
     * Two of them facing each other is the classic corner: each would ask the
     * other forever. Skipping colour-sourced abilities gives the right answer
     * for that board - neither makes anything - without modelling the loop.
     */
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    createCardInstance(state, "exotic-orchard", mike.id, "battlefield");

    expect(opponentLandColors(state, donny.id)).toEqual([]);
  });

  it("is counted as available mana only for the colours it can make", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    createCardInstance(state, "swamp", mike.id, "battlefield");
    createCardInstance(state, "exotic-orchard", donny.id, "battlefield");

    const pool = potentialAvailableMana(state, donny.id);
    expect(pool.B).toBe(1);
    expect(pool.G).toBeUndefined();
  });
});

describe("Delighted Halfling's restricted mana", () => {
  /** Taps the Halfling for one restricted mana of the given colour. */
  function tapForRestricted(state: GameState, playerId: string, color: "W" | "U" | "B" | "R" | "G") {
    const halfling = createCardInstance(state, "delighted-halfling", playerId, "battlefield");
    halfling.summoningSickness = false;
    const index = ["W", "U", "B", "R", "G"].indexOf(color) + 1; // ability 0 is {C}
    activateAbility(state, playerId, halfling.instanceId, index);
    return halfling;
  }

  it("does not go into the ordinary pool", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    tapForRestricted(state, donny.id, "G");

    expect(donny.manaPool.G).toBeUndefined();
    expect(donny.restrictedMana).toHaveLength(1);
    expect(donny.restrictedMana[0]!.color).toBe("G");
  });

  it("is not counted as mana a player could spend on anything", () => {
    /*
     * The one place where counting it would over-count rather than under-count.
     * If potentialAvailableMana saw it, the game would offer a spell on the
     * strength of mana that spell cannot use, tap lands towards it, and then
     * refuse the cast.
     */
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "delighted-halfling", donny.id, "battlefield").summoningSickness = false;

    const pool = potentialAvailableMana(state, donny.id);
    expect(pool.generic).toBe(1); // its {C} half only
    expect(pool.G).toBeUndefined();
    // And auto-tap must not reach for it either.
    expect(manaSources(state, donny)).toHaveLength(1);
  });

  it("can be spent on a legendary spell", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    tapForRestricted(state, donny.id, "G");
    tapForRestricted(state, donny.id, "B");
    tapForRestricted(state, donny.id, "G"); // Blech is {1}{B}{G}
    const blech = createCardInstance(state, "blech-loafing-pest", donny.id, "hand");

    castSpell(state, donny.id, blech.instanceId);

    expect(state.stackCards).toContain(blech);
    expect(donny.restrictedMana).toHaveLength(0);
  });

  it("cannot be spent on a spell that is not legendary", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    tapForRestricted(state, donny.id, "G");
    const bears = createCardInstance(state, "grizzly-bears", donny.id, "hand");

    expect(() => castSpell(state, donny.id, bears.instanceId)).toThrow(/cannot afford/);
    // Nothing was spent on the attempt.
    expect(donny.restrictedMana).toHaveLength(1);
  });

  it("cannot pay for an activated ability", () => {
    // "Spend this mana only to cast a legendary spell" - an ability is not a
    // spell, so nothing outside casting may reach for it.
    const state = mainPhase();
    const donny = state.players[0]!;
    tapForRestricted(state, donny.id, "G");
    const mire = createCardInstance(state, "twilight-mire", donny.id, "battlefield");

    expect(() => activateAbility(state, donny.id, mire.instanceId, 1)).toThrow(/cannot pay/);
  });

  it("covers only part of a cost, with the pool paying the rest", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    tapForRestricted(state, donny.id, "G");
    donny.manaPool = { B: 1, generic: 2 };
    const blech = createCardInstance(state, "blech-loafing-pest", donny.id, "hand");
    const cost = requireDefinition(state, "blech-loafing-pest").manaCost!;

    expect(spendablePool(donny, requireDefinition(state, "blech-loafing-pest")).G).toBe(1);
    castSpell(state, donny.id, blech.instanceId);

    expect(donny.restrictedMana).toHaveLength(0);
    // The green pip came from the restricted mana, so the pool kept its black.
    expect(cost.colors.G).toBeGreaterThan(0);
  });

  it("empties with the pool at end of turn", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    tapForRestricted(state, donny.id, "G");

    // Same door the ordinary pool goes through in the cleanup step.
    donny.manaPool = {};
    donny.restrictedMana = [];
    expect(donny.restrictedMana).toHaveLength(0);
  });

  it("makes what it paid for uncounterable, for that casting only", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    tapForRestricted(state, donny.id, "G");
    tapForRestricted(state, donny.id, "B");
    tapForRestricted(state, donny.id, "G");
    const blech = createCardInstance(state, "blech-loafing-pest", donny.id, "hand");

    castSpell(state, donny.id, blech.instanceId);
    const spell = state.stack[0]!;
    expect(spell.cantBeCountered).toBe(true);

    // A counterspell resolves and does nothing. Its source is a permanent Mike
    // controls rather than the card being countered - `resolveTopOfStack` bins
    // whatever the resolving object came from, so pointing it at Blech would
    // have thrown Blech away and looked like a successful counter.
    const source = createCardInstance(state, "swamp", mike.id, "battlefield");
    pushOntoStack(state, source.instanceId, mike.id, { kind: "counter", target: { kind: "spell" } }, [
      { kind: "spell", stackObjectId: spell.id },
    ], false);
    resolveTopOfStack(state);
    expect(state.stack).toHaveLength(1);
    expect(state.stackCards).toContain(blech);
    expect(donny.graveyard).not.toContain(blech);
  });

  it("leaves the same card counterable when ordinary mana paid for it", () => {
    // The rider belongs to the mana, not to the card.
    const state = mainPhase();
    const donny = state.players[0]!;
    donny.manaPool = { G: 1, B: 1, generic: 5 };
    const blech = createCardInstance(state, "blech-loafing-pest", donny.id, "hand");

    castSpell(state, donny.id, blech.instanceId);

    expect(state.stack[0]!.cantBeCountered).toBe(false);
  });

  it("still leaves a card that prints the line uncounterable", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    // One that does not also need a target, so the cast is about the flag.
    const uncounterable = Object.values(TEST_CARD_DEFINITIONS).find(
      (def) => def.cantBeCountered && !def.castEffect,
    );
    expect(uncounterable, "no uncounterable card in the pool to check against").toBeDefined();
    const instance = createCardInstance(state, uncounterable!.id, donny.id, "hand");
    donny.manaPool = { W: 9, U: 9, B: 9, R: 9, G: 9, generic: 9 };

    castSpell(state, donny.id, instance.instanceId);
    expect(state.stack[0]!.cantBeCountered).toBe(true);
  });
});

describe("which ability, when a permanent has more than one", () => {
  it("offers both halves of a dual land", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const bayou = createCardInstance(state, "bayou", donny.id, "battlefield");

    expect(activatableAbilities(state, donny.id, bayou.instanceId)).toEqual([0, 1]);
  });

  it("hides the halves a restriction forbids", () => {
    // Tainted Wood with no Swamp out: only its colourless half is real.
    const state = mainPhase();
    const donny = state.players[0]!;
    const wood = createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    expect(activatableAbilities(state, donny.id, wood.instanceId)).toEqual([0]);
    createCardInstance(state, "swamp", donny.id, "battlefield");
    expect(activatableAbilities(state, donny.id, wood.instanceId)).toEqual([0, 1, 2]);
  });

  it("hides a filter land's modes when the mana is not there", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mire = createCardInstance(state, "twilight-mire", donny.id, "battlefield");

    expect(activatableAbilities(state, donny.id, mire.instanceId)).toEqual([0]);
    createCardInstance(state, "swamp", donny.id, "battlefield");
    expect(activatableAbilities(state, donny.id, mire.instanceId)).toEqual([0, 1, 2, 3]);
  });

  it("hides a targeted ability with nothing to point at", () => {
    // Swarmyard with no Insect, Rat, Spider or Squirrel on the table.
    const state = mainPhase();
    const donny = state.players[0]!;
    const yard = createCardInstance(state, "swarmyard", donny.id, "battlefield");

    expect(activatableAbilities(state, donny.id, yard.instanceId)).toEqual([0]);
    createCardInstance(state, "giant-spider", donny.id, "battlefield");
    expect(activatableAbilities(state, donny.id, yard.instanceId)).toEqual([0, 1]);
  });

  it("offers nothing on a tapped permanent", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const bayou = createCardInstance(state, "bayou", donny.id, "battlefield");
    bayou.tapped = true;

    expect(activatableAbilities(state, donny.id, bayou.instanceId)).toEqual([]);
  });

  it("offers nothing on a summoning-sick creature", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const birds = createCardInstance(state, "birds-of-paradise", donny.id, "battlefield");

    expect(activatableAbilities(state, donny.id, birds.instanceId)).toEqual([]);
    birds.summoningSickness = false;
    expect(activatableAbilities(state, donny.id, birds.instanceId)).toHaveLength(5);
  });

  it("offers nothing on a permanent somebody else controls", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    const bayou = createCardInstance(state, "bayou", mike.id, "battlefield");

    expect(activatableAbilities(state, donny.id, bayou.instanceId)).toEqual([]);
  });

  it("agrees with what activateAbility will actually allow", () => {
    /*
     * The whole point of sharing one answer. Every ability the picker offers
     * must go through, and this is the check that would catch the two drifting
     * apart - a menu you cannot trust is worse than no menu.
     */
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "swamp", donny.id, "battlefield");
    createCardInstance(state, "forest", donny.id, "battlefield");
    createCardInstance(state, "giant-spider", donny.id, "battlefield");

    for (const id of ["tainted-wood", "twilight-mire", "swarmyard", "wastewood-verge", "bayou"]) {
      const instance = createCardInstance(state, id, donny.id, "battlefield");
      for (const index of activatableAbilities(state, donny.id, instance.instanceId)) {
        const probe = createCardInstance(state, id, donny.id, "battlefield");
        const def = requireDefinition(state, id);
        const targets = def.activatedAbilities![index]!.effect.kind === "regenerate"
          ? [{ kind: "card" as const, instanceId: donny.battlefield.find((c) => c.definitionId === "giant-spider")!.instanceId }]
          : [];
        expect(() => activateAbility(state, donny.id, probe.instanceId, index, targets), `${id}#${index}`)
          .not.toThrow();
      }
    }
  });
});

describe("what the generator refused", () => {
  it("has no Path of Ancestry", () => {
    /*
     * Its mana half is Command Tower, which works. The rest of the line -
     * "when that mana is spent to cast a creature spell that shares a creature
     * type with your commander, scry 1" - needs mana to remember where it came
     * from, a scry, and a creature-type match against the commander. Written
     * without them it would be a Command Tower that also enters tapped, which
     * is a strictly worse card than the one printed.
     */
    expect(TEST_CARD_DEFINITIONS["path-of-ancestry"]).toBeUndefined();
  });
});
