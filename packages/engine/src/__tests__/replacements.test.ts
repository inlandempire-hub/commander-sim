import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect } from "../effects.js";
import { countersPlaced, tokensCreated } from "../replacements.js";
import type { GameState } from "../types.js";

/**
 * Replacement effects.
 *
 * Two events, chosen because they are the only two any card in the pool
 * replaces: counters going onto a permanent, and tokens being created. The
 * interesting part is not that Doubling Season doubles - it is what happens
 * when two replacements apply to the same event, which the real rules settle
 * by asking the player.
 */

function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  return instance;
}

function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Doubling Season", () => {
  it("doubles tokens created under your control", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "doubling-season", alice.id);
    drain(state);

    // Hornet Queen: four Insects, so eight.
    enters(state, "hornet-queen", alice.id);
    drain(state);

    const tokens = alice.battlefield.filter(
      (c) => c.definitionId === "token-g-11-insect-flying-deathtouch",
    );
    expect(tokens).toHaveLength(8);
  });

  it("leaves an opponent's tokens alone - it says 'under your control'", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    enters(state, "doubling-season", alice.id);
    drain(state);

    enters(state, "hornet-queen", mike.id);
    drain(state);

    expect(
      mike.battlefield.filter((c) => c.definitionId === "token-g-11-insect-flying-deathtouch"),
    ).toHaveLength(4);
  });

  it("doubles counters put on a permanent you control", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "doubling-season", alice.id);
    const bears = enters(state, "grizzly-bears", alice.id);
    drain(state);

    applyEffect(state, alice.id, bears.instanceId, { kind: "addCounter", amount: 2 }, []);
    expect(bears.plusOneCounters).toBe(4);
  });

  it("applies once per copy, so two of them quadruple", () => {
    /*
     * Rule 614.5 - one replacement effect cannot apply to the same event twice,
     * but two separate objects are two separate replacements. The tell that
     * this is being asked once for the whole event rather than once per token
     * is that the answer is 4x and not something stranger.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "doubling-season", alice.id);
    // A second copy is illegal in a real Commander deck; the engine has no
    // singleton rule at this level and the arithmetic is what is under test.
    enters(state, "doubling-season", alice.id);
    const bears = enters(state, "grizzly-bears", alice.id);
    drain(state);

    applyEffect(state, alice.id, bears.instanceId, { kind: "addCounter", amount: 1 }, []);
    expect(bears.plusOneCounters).toBe(4);
  });
});

describe("Winding Constrictor", () => {
  it("adds one to counters put on a creature you control", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "winding-constrictor", alice.id);
    const bears = enters(state, "grizzly-bears", alice.id);
    drain(state);

    applyEffect(state, alice.id, bears.instanceId, { kind: "addCounter", amount: 1 }, []);
    expect(bears.plusOneCounters).toBe(2);
  });

  it("adds one no matter how many counters were coming", () => {
    // "That many plus one" - not "one more for each".
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "winding-constrictor", alice.id);
    const bears = enters(state, "grizzly-bears", alice.id);
    drain(state);

    applyEffect(state, alice.id, bears.instanceId, { kind: "addCounter", amount: 3 }, []);
    expect(bears.plusOneCounters).toBe(4);
  });

  it("does not touch an enchantment, which is the type list doing its job", () => {
    /*
     * The card says "an artifact or creature you control". Doubling Season says
     * "a permanent", and conflating the two would quietly make the Snake a
     * better card than it is.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "winding-constrictor", alice.id);
    const season = enters(state, "doubling-season", alice.id); // an enchantment to aim at
    drain(state);

    expect(countersPlaced(state, season, 1)).toBe(2); // doubled, not doubled-and-incremented
  });

  it("does not affect an opponent's creature", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    enters(state, "winding-constrictor", alice.id);
    const theirs = enters(state, "grizzly-bears", mike.id);
    drain(state);

    expect(countersPlaced(state, theirs, 1)).toBe(1);
  });

  it("does not double tokens - it is not that card", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "winding-constrictor", alice.id);
    drain(state);

    expect(tokensCreated(state, alice.id, 4)).toBe(4);
  });
});

describe("two replacements on one event", () => {
  it("adds before it multiplies, which is the order a player would choose", () => {
    /*
     * Rule 616.1 gives the choice to the affected permanent's controller, and
     * the two orders differ: one counter becomes three (double, then add one)
     * or four (add one, then double). There is no way to ask, so the engine
     * takes the larger - and because +1/+1 counters are the only kind it
     * models, larger is always what the player would have picked.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "doubling-season", alice.id);
    enters(state, "winding-constrictor", alice.id);
    const bears = enters(state, "grizzly-bears", alice.id);
    drain(state);

    applyEffect(state, alice.id, bears.instanceId, { kind: "addCounter", amount: 1 }, []);
    expect(bears.plusOneCounters).toBe(4);
  });

  it("is not an event at all when no counters were coming", () => {
    // "Would put one or more counters" - zero is nothing to replace, and
    // doubling it must not conjure one out of nowhere.
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "doubling-season", alice.id);
    const bears = enters(state, "grizzly-bears", alice.id);
    drain(state);

    expect(countersPlaced(state, bears, 0)).toBe(0);
    expect(tokensCreated(state, alice.id, 0)).toBe(0);
  });

  it("stops mattering once the permanent providing it has gone", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const season = enters(state, "doubling-season", alice.id);
    const bears = enters(state, "grizzly-bears", alice.id);
    drain(state);
    expect(countersPlaced(state, bears, 1)).toBe(2);

    alice.battlefield = alice.battlefield.filter((c) => c.instanceId !== season.instanceId);
    expect(countersPlaced(state, bears, 1)).toBe(1);
  });
});
