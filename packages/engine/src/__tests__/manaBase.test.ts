import { describe, expect, it } from "vitest";
import { createCardInstance, createGameState, requireDefinition } from "../state.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { activateAbility } from "../abilities.js";
import { canPayManaCostFromPool, manaValue, payManaCost, potentialAvailableMana } from "../mana.js";
import { manaSources, planManaPayment } from "../autoTap.js";
import { hasAnyLegalAction } from "../autoPass.js";
import type { GameState, ManaCost } from "../types.js";

/**
 * The six mana-base cards from the Blech decklist, and the four engine features
 * they needed: a mana ability that hurts you, a mana ability you may only use
 * on the right board, hybrid mana in a cost, and one activation producing two
 * different colours.
 *
 * The thing worth testing hardest is not that the cards work when activated by
 * hand - it is that everything which counts mana *without spending it* agrees
 * with them. A restriction the counter does not know about is worse than one
 * nothing enforces at all: the game offers you a spell, taps lands towards it,
 * and then refuses the land that was going to pay for it.
 */

function mainPhase(players = ["donny", "mike"]): GameState {
  const state = createGameState(players, TEST_CARD_DEFINITIONS);
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

function cost(generic: number, colors: ManaCost["colors"]): ManaCost {
  return { generic, colors };
}

describe("Llanowar Wastes and the painland rider", () => {
  it("makes the mana and deals the damage", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const wastes = createCardInstance(state, "llanowar-wastes", donny.id, "battlefield");

    activateAbility(state, donny.id, wastes.instanceId, 1); // the black half

    expect(donny.manaPool.B).toBe(1);
    expect(donny.life).toBe(39);
  });

  it("leaves the colourless half free", () => {
    // The whole point of the card: {T}: Add {C} costs nothing, and it is the
    // first ability precisely so the painless option is the default one.
    const state = mainPhase();
    const donny = state.players[0]!;
    const wastes = createCardInstance(state, "llanowar-wastes", donny.id, "battlefield");

    activateAbility(state, donny.id, wastes.instanceId, 0);

    expect(donny.manaPool.generic).toBe(1);
    expect(donny.life).toBe(40);
  });

  it("is prevented by a shield like any other damage", () => {
    // It goes through the ordinary damage path rather than subtracting from
    // life directly, so everything that interferes with damage still applies.
    const state = mainPhase();
    const donny = state.players[0]!;
    donny.damagePrevention = 1;
    const wastes = createCardInstance(state, "llanowar-wastes", donny.id, "battlefield");

    activateAbility(state, donny.id, wastes.instanceId, 1);

    expect(donny.life).toBe(40);
    expect(donny.manaPool.B).toBe(1);
  });

  it("still counts as a mana source", () => {
    // A painland that auto-tap could not see would only ever make colourless,
    // which is not the card.
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "llanowar-wastes", donny.id, "battlefield");

    const pool = potentialAvailableMana(state, donny.id);
    expect(pool.B).toBe(1);
    expect(pool.G).toBe(1);
  });

  it("is not tapped for a colour a Forest could have made", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "llanowar-wastes", donny.id, "battlefield");
    const forest = createCardInstance(state, "forest", donny.id, "battlefield");

    const plan = planManaPayment(state, donny.id, cost(0, { G: 1 }));

    expect(plan.paid).toBe(true);
    expect(plan.taps).toHaveLength(1);
    expect(plan.taps[0]!.instanceId).toBe(forest.instanceId);
  });

  it("is tapped when it is the only source of the colour", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const wastes = createCardInstance(state, "llanowar-wastes", donny.id, "battlefield");
    createCardInstance(state, "forest", donny.id, "battlefield");

    const plan = planManaPayment(state, donny.id, cost(0, { B: 1 }));

    expect(plan.paid).toBe(true);
    expect(plan.taps[0]!.instanceId).toBe(wastes.instanceId);
  });
});

describe("Elves of Deep Shadow", () => {
  it("carries the same rider a land does", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const elves = createCardInstance(state, "elves-of-deep-shadow", donny.id, "battlefield");
    elves.summoningSickness = false;

    activateAbility(state, donny.id, elves.instanceId, 0);

    expect(donny.manaPool.B).toBe(1);
    expect(donny.life).toBe(39);
  });

  it("cannot be tapped the turn it arrives", () => {
    // Unchanged by the rider - it is still a creature's tap ability.
    const state = mainPhase();
    const donny = state.players[0]!;
    const elves = createCardInstance(state, "elves-of-deep-shadow", donny.id, "battlefield");

    expect(() => activateAbility(state, donny.id, elves.instanceId, 0)).toThrow(/summoning sickness/);
    expect(donny.life).toBe(40);
  });
});

describe("Tainted Wood and the activation restriction", () => {
  it("refuses the coloured halves with no Swamp out", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const wood = createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    expect(() => activateAbility(state, donny.id, wood.instanceId, 1)).toThrow(/cannot be activated/);
    expect(wood.tapped).toBe(false);
  });

  it("allows them once a Swamp is out", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "swamp", donny.id, "battlefield");
    const wood = createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    activateAbility(state, donny.id, wood.instanceId, 1);

    expect(donny.manaPool.B).toBe(1);
  });

  it("counts a dual with the type, not just a basic", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "bayou", donny.id, "battlefield");
    const wood = createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    activateAbility(state, donny.id, wood.instanceId, 2);

    expect(donny.manaPool.G).toBe(1);
  });

  it("does not look at the opponent's Swamps", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    createCardInstance(state, "swamp", mike.id, "battlefield");
    const wood = createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    expect(() => activateAbility(state, donny.id, wood.instanceId, 1)).toThrow(/cannot be activated/);
  });

  it("leaves the colourless half alone", () => {
    // Only the coloured halves carry the restriction; "{T}: Add {C}" has none.
    const state = mainPhase();
    const donny = state.players[0]!;
    const wood = createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    activateAbility(state, donny.id, wood.instanceId, 0);

    expect(donny.manaPool.generic).toBe(1);
  });

  it("is not counted as available mana while it is restricted", () => {
    /*
     * The important half of the feature. `potentialAvailableMana` decides
     * whether a player is asked to act at all and what auto-tap believes it can
     * pay for - so a restriction only the activation knew about would have the
     * game offer a black spell it then could not pay for.
     */
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    expect(potentialAvailableMana(state, donny.id).B).toBeUndefined();

    createCardInstance(state, "swamp", donny.id, "battlefield");
    expect(potentialAvailableMana(state, donny.id).B).toBe(2); // the Swamp and the Wood
  });

  it("is not offered to the payment planner while it is restricted", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "tainted-wood", donny.id, "battlefield");

    expect(planManaPayment(state, donny.id, cost(0, { G: 1 })).paid).toBe(false);
  });
});

describe("Wastewood Verge", () => {
  it("makes green with nothing else out", () => {
    // Its green half is unrestricted; only the black one asks about the board.
    const state = mainPhase();
    const donny = state.players[0]!;
    const verge = createCardInstance(state, "wastewood-verge", donny.id, "battlefield");

    activateAbility(state, donny.id, verge.instanceId, 0);

    expect(donny.manaPool.G).toBe(1);
  });

  it("makes black off either a Swamp or a Forest", () => {
    for (const landId of ["swamp", "forest"]) {
      const state = mainPhase();
      const donny = state.players[0]!;
      createCardInstance(state, landId, donny.id, "battlefield");
      const verge = createCardInstance(state, "wastewood-verge", donny.id, "battlefield");

      activateAbility(state, donny.id, verge.instanceId, 1);

      expect(donny.manaPool.B, landId).toBe(1);
    }
  });

  it("refuses black off an Island", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "island", donny.id, "battlefield");
    const verge = createCardInstance(state, "wastewood-verge", donny.id, "battlefield");

    expect(() => activateAbility(state, donny.id, verge.instanceId, 1)).toThrow(/cannot be activated/);
  });
});

describe("Sapseep Forest", () => {
  it("counts green permanents, not green sources", () => {
    /*
     * "Two or more green permanents" is about colour, and a Forest is a
     * *colourless* permanent - its colour identity is green but its colour
     * comes from a mana cost it does not have. Reading identity here would
     * switch the card on a turn or two early in a deck that plays nothing else.
     */
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "forest", donny.id, "battlefield");
    createCardInstance(state, "forest", donny.id, "battlefield");
    const sapseep = createCardInstance(state, "sapseep-forest", donny.id, "battlefield");
    donny.manaPool = { G: 1 };

    expect(() => activateAbility(state, donny.id, sapseep.instanceId, 1)).toThrow(/cannot be activated/);
  });

  it("works once two green creatures are out", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "grizzly-bears", donny.id, "battlefield");
    createCardInstance(state, "giant-spider", donny.id, "battlefield");
    const sapseep = createCardInstance(state, "sapseep-forest", donny.id, "battlefield");
    donny.manaPool = { G: 1 };

    activateAbility(state, donny.id, sapseep.instanceId, 1);
    // The ability is not a mana ability, so it waits on the stack.
    expect(state.stack).toHaveLength(1);
    expect(donny.manaPool.G).toBeFalsy();
  });

  it("is not offered as an action while it is restricted", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "sapseep-forest", donny.id, "battlefield");
    createCardInstance(state, "forest", donny.id, "battlefield");

    expect(hasAnyLegalAction(state, donny.id)).toBe(false);
  });

  it("enters tapped", () => {
    expect(requireDefinition(mainPhase(), "sapseep-forest").entersTapped).toBe(true);
  });
});

describe("hybrid mana in a cost", () => {
  it("is payable with either half", () => {
    for (const color of ["B", "G"] as const) {
      expect(canPayManaCostFromPool({ [color]: 1 }, { generic: 0, colors: {}, hybrid: [["B", "G"]] })).toBe(
        true,
      );
    }
  });

  it("cannot be paid with colourless", () => {
    // The whole difference between a hybrid symbol and a generic one.
    expect(canPayManaCostFromPool({ generic: 5 }, { generic: 0, colors: {}, hybrid: [["B", "G"]] })).toBe(
      false,
    );
  });

  it("cannot be paid with a colour it does not name", () => {
    expect(canPayManaCostFromPool({ W: 3 }, { generic: 0, colors: {}, hybrid: [["B", "G"]] })).toBe(false);
  });

  it("counts 1 towards mana value", () => {
    expect(manaValue({ generic: 1, colors: { B: 1 }, hybrid: [["B", "G"]] })).toBe(3);
  });

  it("does not eat the mana a fixed pip needed", () => {
    // One black and one green, paying {B}{B/G}: the hybrid has to take the
    // green. Spending the black on it would fail a cost that is affordable.
    const pool = { B: 1, G: 1 };
    expect(canPayManaCostFromPool(pool, { generic: 0, colors: { B: 1 }, hybrid: [["B", "G"]] })).toBe(true);
  });

  it("takes what it said it would take", () => {
    const player = { id: "donny", manaPool: { B: 1, G: 1 } } as never as Parameters<typeof payManaCost>[0];
    payManaCost(player, { generic: 0, colors: { B: 1 }, hybrid: [["B", "G"]] });
    expect(player.manaPool.B ?? 0).toBe(0);
    expect(player.manaPool.G ?? 0).toBe(0);
  });
});

describe("Twilight Mire", () => {
  it("turns one mana into two", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mire = createCardInstance(state, "twilight-mire", donny.id, "battlefield");
    donny.manaPool = { G: 1 };

    activateAbility(state, donny.id, mire.instanceId, 2); // the {B}{G} option

    // The green paid the hybrid and came straight back with a black beside it -
    // one mana in, two out, which is the entire point of a filter land.
    expect(donny.manaPool.B).toBe(1);
    expect(donny.manaPool.G).toBe(1);
  });

  it("offers all three outputs", () => {
    const state = mainPhase();
    const def = requireDefinition(state, "twilight-mire");
    const outputs = (def.activatedAbilities ?? [])
      .filter((a) => a.effect.kind === "addManaCombination")
      .map((a) =>
        a.effect.kind === "addManaCombination"
          ? a.effect.mana.map((m) => `${m.color}${m.amount}`).join("")
          : "",
      );
    expect(outputs).toEqual(["B2", "B1G1", "G2"]);
  });

  it("cannot be activated with an empty pool", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const mire = createCardInstance(state, "twilight-mire", donny.id, "battlefield");

    expect(() => activateAbility(state, donny.id, mire.instanceId, 1)).toThrow(/cannot pay/);
    expect(mire.tapped).toBe(false);
  });

  it("resolves immediately rather than using the stack", () => {
    // It is a mana ability whichever shape its effect is, so it never waits.
    const state = mainPhase();
    const donny = state.players[0]!;
    const mire = createCardInstance(state, "twilight-mire", donny.id, "battlefield");
    donny.manaPool = { B: 1 };

    activateAbility(state, donny.id, mire.instanceId, 3); // {G}{G}

    expect(state.stack).toHaveLength(0);
    expect(donny.manaPool.G).toBe(2);
  });

  it("is not counted as free mana", () => {
    /*
     * It costs mana to use, so counting it would tell the game a player has
     * more than they do. Undercounting is the safe direction and this is the
     * first card in the pool that needs real cost-solving to do better.
     */
    const state = mainPhase();
    const donny = state.players[0]!;
    createCardInstance(state, "twilight-mire", donny.id, "battlefield");

    expect(potentialAvailableMana(state, donny.id).generic).toBe(1); // only its {C} half
    expect(manaSources(state, donny)).toHaveLength(1);
  });
});
