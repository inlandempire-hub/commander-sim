import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requireDefinition } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { activateAbility } from "../abilities.js";
import { potentialAvailableMana, canPayManaCost } from "../mana.js";
import { manaSources, planManaPayment } from "../autoTap.js";
import type { GameState } from "../types.js";

/**
 * Lands and mana rocks, added 2026-08-07 along with the two engine features
 * they need: colourless mana, and permanents that arrive tapped.
 *
 * Before this the pool had five lands - the basics, hand-written - so a real
 * decklist could never be more than three-quarters representable however many
 * creatures were added.
 */

/**
 * An enters-the-battlefield trigger goes on the stack rather than applying on
 * the spot, so a test that only puts the permanent down and checks the life
 * total is testing nothing. Same shape as permanentEnters.test.ts.
 */
function settle(state: GameState): void {
  let guard = 20;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

function mainPhase(): GameState {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

describe("colourless mana", () => {
  it("Sol Ring taps once for two", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const ring = createCardInstance(state, "sol-ring", alice.id, "battlefield");

    activateAbility(state, alice.id, ring.instanceId, 0);

    // Colourless lives in the `generic` bucket - see ManaColor in types.ts.
    expect(alice.manaPool.generic).toBe(2);
    expect(ring.tapped).toBe(true);
  });

  it("pays the generic part of a cost", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    alice.manaPool = { generic: 2, G: 1 };
    // Grizzly Bears is {1}{G}.
    expect(canPayManaCost(alice, { generic: 1, colors: { G: 1 } })).toBe(true);
  });

  it("cannot pay a coloured pip", () => {
    // The whole reason colourless is not simply another Color: a Sol Ring must
    // not cast a Counterspell.
    const state = mainPhase();
    const alice = state.players[0]!;
    alice.manaPool = { generic: 5 };
    expect(canPayManaCost(alice, { generic: 0, colors: { U: 1 } })).toBe(false);
  });

  it("is counted by potentialAvailableMana", () => {
    // This is what decides whether a player is asked to act at all, so a rock
    // it cannot see is a rock that makes the game skip your turn.
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "sol-ring", alice.id, "battlefield");
    createCardInstance(state, "thran-dynamo", alice.id, "battlefield");

    expect(potentialAvailableMana(state, alice.id).generic).toBe(5);
  });

  it("is offered to the payment planner for a generic cost", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "sol-ring", alice.id, "battlefield");
    const plan = planManaPayment(state, alice.id, { generic: 2, colors: {} });

    expect(plan.paid).toBe(true);
    expect(plan.taps).toHaveLength(1);
    expect(plan.taps[0]!.color).toBe("C");
  });

  it("is never chosen to cover a coloured shortfall", () => {
    // A colourless source can only help with the generic part, so a cost with a
    // pip nothing can produce must come back unpayable rather than tapping the
    // rock and failing anyway.
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "sol-ring", alice.id, "battlefield");
    const plan = planManaPayment(state, alice.id, { generic: 0, colors: { U: 2 } });

    expect(plan.paid).toBe(false);
    expect(plan.taps).toEqual([]);
  });
});

describe("lands that enter tapped", () => {
  it("arrives tapped when the card says so", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const gate = createCardInstance(state, "golgari-guildgate", alice.id, "hand");

    putOntoBattlefield(state, gate.instanceId);

    expect(gate.tapped).toBe(true);
  });

  it("leaves an ordinary land untapped", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bayou = createCardInstance(state, "bayou", alice.id, "hand");

    putOntoBattlefield(state, bayou.instanceId);

    expect(bayou.tapped).toBe(false);
  });

  it("still enters tapped when something else also says tapped", () => {
    // A ramp spell fetching a tapland onto the battlefield tapped is not a
    // double negative.
    const state = mainPhase();
    const alice = state.players[0]!;
    const gate = createCardInstance(state, "golgari-guildgate", alice.id, "hand");

    putOntoBattlefield(state, gate.instanceId, { tapped: true });

    expect(gate.tapped).toBe(true);
  });

  it("produces no mana until it untaps", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const gate = createCardInstance(state, "golgari-guildgate", alice.id, "hand");
    putOntoBattlefield(state, gate.instanceId);

    expect(manaSources(state, alice)).toHaveLength(0);
    gate.tapped = false;
    // Two abilities, because "Add {B} or {G}" is written as two - see the note
    // on the fixtures in testCards.ts.
    expect(manaSources(state, alice)).toHaveLength(2);
  });
});

describe("dual lands", () => {
  it("Bayou taps for either colour from its land types alone", () => {
    // Its printed text is nothing but reminder text in brackets; the mana comes
    // from "Land - Swamp Forest". A generator that only read rules text would
    // have emitted a land that taps for nothing.
    const state = mainPhase();
    const def = requireDefinition(state, "bayou");
    const colors = (def.activatedAbilities ?? []).map((a) =>
      a.effect.kind === "addMana" ? a.effect.color : undefined,
    );

    expect(colors).toEqual(["B", "G"]);
    expect(def.entersTapped).toBeUndefined();
  });

  it("Golgari Guildgate says it out loud and enters tapped for it", () => {
    const state = mainPhase();
    const def = requireDefinition(state, "golgari-guildgate");
    const colors = (def.activatedAbilities ?? []).map((a) =>
      a.effect.kind === "addMana" ? a.effect.color : undefined,
    );

    expect(colors).toEqual(["B", "G"]);
    expect(def.entersTapped).toBe(true);
  });

  it("either half can be tapped for, one at a time", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bayou = createCardInstance(state, "bayou", alice.id, "battlefield");

    activateAbility(state, alice.id, bayou.instanceId, 1); // the green half

    expect(alice.manaPool.G).toBe(1);
    expect(alice.manaPool.B).toBeUndefined();
    expect(bayou.tapped).toBe(true);
  });
});

describe("lands with an enters-the-battlefield trigger", () => {
  it("Radiant Fountain gains two life on arrival", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const before = alice.life;
    const fountain = createCardInstance(state, "radiant-fountain", alice.id, "hand");

    putOntoBattlefield(state, fountain.instanceId);
    settle(state);

    expect(alice.life).toBe(before + 2);
  });

  it("Jungle Hollow both gains life and enters tapped", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const before = alice.life;
    const hollow = createCardInstance(state, "jungle-hollow", alice.id, "hand");

    putOntoBattlefield(state, hollow.instanceId);
    settle(state);

    expect(alice.life).toBe(before + 1);
    expect(hollow.tapped).toBe(true);
  });
});

describe("what the generator refused", () => {
  /*
   * These are the guard rails on the whole exercise. Each of these cards was
   * either wrongly accepted at some point while this was built, or is the
   * obvious next thing somebody would be tempted to add by hand.
   */
  it("never writes a conditional tapland as a flat one", () => {
    // These three were refused outright until the condition existed, because
    // "enters tapped unless you control two or more other lands" written as
    // flatly tapped is a strictly worse card than the one printed. They are in
    // now - and the thing that must never happen is one of them carrying
    // `entersTapped` with no condition attached.
    const state = mainPhase();
    for (const id of ["woodland-cemetery", "deathcap-glade", "undergrowth-stadium"]) {
      const def = state.cardDefinitions[id];
      expect(def, id).toBeDefined();
      expect(def!.entersTapped, id).toBe(true);
      expect(def!.entersTappedUnless, id).toBeDefined();
    }
  });

  it("has the shockland it used to refuse, with its cost intact", () => {
    /*
     * This used to assert Overgrown Tomb was absent: "as this land enters, you
     * *may pay 2 life*" is an optional cost on arrival rather than a condition
     * on the board, and `entersTappedUnless` could not express it.
     *
     * `entersTappedUnlessPayLife` can, so the assertion is now the opposite
     * one - and it checks the price rather than merely that the card exists,
     * because a shockland written as a plain tapland would still be "present"
     * and would be a strictly worse card than the one being played.
     */
    const state = mainPhase();
    const tomb = state.cardDefinitions["overgrown-tomb"];
    expect(tomb).toBeDefined();
    expect(tomb!.entersTappedUnlessPayLife).toBe(2);
    // Not a flat tapland, which is what writing it the old way would have made it.
    expect(tomb!.entersTapped).toBeUndefined();
  });

  it("has no land whose lifegain trigger is really somebody else's arrival", () => {
    // Seraph Sanctuary is "whenever an Angel you control enters", which a loose
    // pattern read as the land's own arrival - it would have paid out once, at
    // the one moment the real card does nothing.
    const state = mainPhase();
    expect(state.cardDefinitions["seraph-sanctuary"]).toBeUndefined();
    expect(state.cardDefinitions["staff-of-the-death-magus"]).toBeUndefined();
  });

  it("gives every land it did add something to do", () => {
    const state = mainPhase();
    for (const def of Object.values(state.cardDefinitions)) {
      if (!def.types.includes("Land")) continue;
      const hasAbility = (def.activatedAbilities?.length ?? 0) > 0;
      const hasTrigger = (def.triggeredAbilities?.length ?? 0) > 0;
      expect(hasAbility || hasTrigger, def.name).toBe(true);
    }
  });

  it("never gives a land a mana cost", () => {
    // A land with `manaCost: { generic: 0 }` is castable from the hand as a {0}
    // spell, which is not a thing lands do.
    const state = mainPhase();
    for (const def of Object.values(state.cardDefinitions)) {
      if (def.types.includes("Land")) expect(def.manaCost, def.name).toBeUndefined();
    }
  });
});
