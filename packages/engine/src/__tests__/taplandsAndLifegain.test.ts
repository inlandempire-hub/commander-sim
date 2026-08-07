import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, createGameState } from "../state.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { gainLife } from "../life.js";
import { applyEffect } from "../effects.js";
import type { GameState } from "../types.js";

/**
 * Conditional taplands, and "whenever you gain life".
 *
 * The taplands are the drawback the card is priced around: a dual that enters
 * untapped once you have two other lands is a real card, and the same dual
 * written as always-tapped is a worse one. They were refused outright until the
 * condition existed rather than shipped weakened.
 *
 * The lifegain trigger is the engine Blech, Loafing Pest is built on, and the
 * thing worth testing hardest is that it fires however the life arrived - not
 * only from the one route somebody remembered to wire it into.
 */

function mainPhase(players = ["alice", "bob"]): GameState {
  const state = createGameState(players, TEST_CARD_DEFINITIONS);
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

function settle(state: GameState): void {
  let guard = 30;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("enters tapped unless you control other lands", () => {
  it("enters tapped with nothing else out", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const glade = createCardInstance(state, "deathcap-glade", alice.id, "hand");

    putOntoBattlefield(state, glade.instanceId);

    expect(glade.tapped).toBe(true);
  });

  it("enters untapped once two other lands are out", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "forest", alice.id, "battlefield");
    createCardInstance(state, "swamp", alice.id, "battlefield");
    const glade = createCardInstance(state, "deathcap-glade", alice.id, "hand");

    putOntoBattlefield(state, glade.instanceId);

    expect(glade.tapped).toBe(false);
  });

  it("does not count itself toward the two", () => {
    // The card says "two or more *other* lands". Counting itself would have it
    // enter untapped off a single other land, a full turn early.
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "forest", alice.id, "battlefield");
    const glade = createCardInstance(state, "deathcap-glade", alice.id, "hand");

    putOntoBattlefield(state, glade.instanceId);

    expect(glade.tapped).toBe(true);
  });

  it("does not count the opponent's lands", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "forest", bob.id, "battlefield");
    createCardInstance(state, "swamp", bob.id, "battlefield");
    const glade = createCardInstance(state, "deathcap-glade", alice.id, "hand");

    putOntoBattlefield(state, glade.instanceId);

    expect(glade.tapped).toBe(true);
  });
});

describe("enters tapped unless you control a Swamp or a Forest", () => {
  it("enters tapped with neither", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "island", alice.id, "battlefield");
    const cemetery = createCardInstance(state, "woodland-cemetery", alice.id, "hand");

    putOntoBattlefield(state, cemetery.instanceId);

    expect(cemetery.tapped).toBe(true);
  });

  it("enters untapped off either one", () => {
    for (const landId of ["swamp", "forest"]) {
      const state = mainPhase();
      const alice = state.players[0]!;
      createCardInstance(state, landId, alice.id, "battlefield");
      const cemetery = createCardInstance(state, "woodland-cemetery", alice.id, "hand");

      putOntoBattlefield(state, cemetery.instanceId);

      expect(cemetery.tapped, landId).toBe(false);
    }
  });

  it("counts a dual that has the type", () => {
    // Bayou is a Swamp Forest, so it satisfies "a Swamp or a Forest" twice
    // over. Reading the type line rather than the card name is what makes that
    // work without naming every dual.
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "bayou", alice.id, "battlefield");
    const cemetery = createCardInstance(state, "woodland-cemetery", alice.id, "hand");

    putOntoBattlefield(state, cemetery.instanceId);

    expect(cemetery.tapped).toBe(false);
  });
});

describe("enters tapped unless you have two or more opponents", () => {
  it("enters tapped in a two-player game", () => {
    const state = mainPhase(["alice", "bob"]);
    const alice = state.players[0]!;
    const stadium = createCardInstance(state, "undergrowth-stadium", alice.id, "hand");

    putOntoBattlefield(state, stadium.instanceId);

    expect(stadium.tapped).toBe(true);
  });

  it("enters untapped in a pod", () => {
    // Nothing plays three-player games yet, but the engine's state is
    // player-count-agnostic by design and the card's own condition is about
    // exactly that - so it is worth knowing this half works before a pod exists.
    const state = mainPhase(["alice", "bob", "carol"]);
    const alice = state.players[0]!;
    const stadium = createCardInstance(state, "undergrowth-stadium", alice.id, "hand");

    putOntoBattlefield(state, stadium.instanceId);

    expect(stadium.tapped).toBe(false);
  });
});

describe("whenever you gain life", () => {
  it("puts a counter on Pest Mascot", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const mascot = createCardInstance(state, "pest-mascot", alice.id, "battlefield");

    gainLife(state, alice.id, 1);
    settle(state);

    expect(mascot.plusOneCounters).toBe(1);
  });

  it("fires once per life-gain event, not once per point", () => {
    // "Whenever you gain life" cares that it happened, not how much.
    const state = mainPhase();
    const alice = state.players[0]!;
    const mascot = createCardInstance(state, "pest-mascot", alice.id, "battlefield");

    gainLife(state, alice.id, 7);
    settle(state);

    expect(mascot.plusOneCounters).toBe(1);
    expect(alice.life).toBe(47);
  });

  it("does not fire on the opponent's lifegain", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const mascot = createCardInstance(state, "pest-mascot", alice.id, "battlefield");

    gainLife(state, bob.id, 5);
    settle(state);

    expect(mascot.plusOneCounters).toBe(0);
  });

  it("does not fire on gaining zero", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const mascot = createCardInstance(state, "pest-mascot", alice.id, "battlefield");

    gainLife(state, alice.id, 0);
    settle(state);

    expect(mascot.plusOneCounters).toBe(0);
  });

  it("fires from a lifegain spell, not only from the helper", () => {
    // The reason gainLife exists as one door: six places used to add life
    // directly, and a trigger wired into only some of them would work for a
    // spell and silently do nothing for lifelink - the harder case to notice.
    const state = mainPhase();
    const alice = state.players[0]!;
    const mascot = createCardInstance(state, "pest-mascot", alice.id, "battlefield");

    applyEffect(state, alice.id, mascot.instanceId, { kind: "gainLife", amount: 3 }, []);
    settle(state);

    expect(mascot.plusOneCounters).toBe(1);
  });
});

describe("Blech, Loafing Pest", () => {
  it("counters every named subtype it controls", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const blech = createCardInstance(state, "blech-loafing-pest", alice.id, "battlefield");
    const spider = createCardInstance(state, "giant-spider", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");

    gainLife(state, alice.id, 1);
    settle(state);

    expect(spider.plusOneCounters).toBe(1);
    // A Bear is none of Pest, Bat, Insect, Snake or Spider.
    expect(bears.plusOneCounters).toBe(0);
    // Blech is itself a Pest, and its own text says "each", not "each other".
    expect(blech.plusOneCounters).toBe(1);
  });

  it("leaves the opponent's creatures alone", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "blech-loafing-pest", alice.id, "battlefield");
    const theirSpider = createCardInstance(state, "giant-spider", bob.id, "battlefield");

    gainLife(state, alice.id, 1);
    settle(state);

    expect(theirSpider.plusOneCounters).toBe(0);
  });

  it("is legal as a commander", () => {
    expect(TEST_CARD_DEFINITIONS["blech-loafing-pest"]?.canBeCommander).toBe(true);
  });

  it("watches every subtype the card names", () => {
    const trigger = TEST_CARD_DEFINITIONS["blech-loafing-pest"]?.triggeredAbilities?.[0];
    expect(trigger?.event).toBe("gain-life");
    if (trigger?.effect.kind !== "addCounterToEachOther") throw new Error("wrong effect");
    // The Oxford comma is the trap here: splitting "Pest, Bat, Insect, Snake,
    // and Spider" on commas alone leaves "and Spider", which matches nothing.
    expect(trigger.effect.subtypes).toEqual(["Pest", "Bat", "Insect", "Snake", "Spider"]);
    expect(trigger.effect.includesSelf).toBe(true);
  });
});
