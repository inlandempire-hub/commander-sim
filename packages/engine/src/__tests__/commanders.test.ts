import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { activateAbility } from "../abilities.js";
import { playLand } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { pushOntoStack } from "../permanents.js";
import { effectivePower } from "../counters.js";
import { advanceStep } from "../turn.js";

/**
 * Both commanders are transcribed from their Scryfall entries - see the
 * fixture comments in cards/testCards.ts for the exact oracle text these
 * tests are asserting against.
 */

describe("Tifa Lockhart - Landfall, double power until end of turn", () => {
  it("doubles her power when a land she controls enters", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;

    const tifa = createCardInstance(state, "tifa-lockhart", alice.id, "battlefield"); // 1/2
    const land = createCardInstance(state, "forest", alice.id, "hand");

    expect(effectivePower(state, tifa)).toBe(1);

    playLand(state, alice.id, land.instanceId);
    expect(state.stack.length).toBe(1);
    resolveTopOfStack(state);

    expect(effectivePower(state, tifa)).toBe(2);
    expect(tifa.plusOneCounters).toBe(0); // she has no counter interaction of her own
  });

  it("compounds across two lands in the same turn", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;

    const tifa = createCardInstance(state, "tifa-lockhart", alice.id, "battlefield");
    for (let i = 0; i < 2; i++) {
      const land = createCardInstance(state, "forest", alice.id, "hand");
      alice.landsPlayedThisTurn = 0; // the one-land-per-turn rule isn't what's under test here
      playLand(state, alice.id, land.instanceId);
      resolveTopOfStack(state);
    }

    expect(effectivePower(state, tifa)).toBe(4); // 1 -> 2 -> 4
  });

  it("doubles whatever her power currently is, counters included", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;

    const tifa = createCardInstance(state, "tifa-lockhart", alice.id, "battlefield");
    tifa.plusOneCounters = 2; // some outside effect made her a 3/4
    const land = createCardInstance(state, "forest", alice.id, "hand");

    playLand(state, alice.id, land.instanceId);
    resolveTopOfStack(state);

    expect(effectivePower(state, tifa)).toBe(6); // 3 doubled, not 1 doubled plus 2
  });

  it("wears off at end of turn, leaving the counters behind", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;

    const tifa = createCardInstance(state, "tifa-lockhart", alice.id, "battlefield");
    tifa.plusOneCounters = 1;
    const land = createCardInstance(state, "forest", alice.id, "hand");
    playLand(state, alice.id, land.instanceId);
    resolveTopOfStack(state);
    expect(effectivePower(state, tifa)).toBe(4); // (1 printed + 1 counter) doubled

    // Run out the turn. advanceStep never *rests* on cleanup (it's a no-priority
    // step, so it's stepped straight through), so watch the turn number instead.
    const startingTurn = state.turnNumber;
    while (state.turnNumber === startingTurn) advanceStep(state);

    expect(tifa.temporaryPowerBonus).toBe(0);
    expect(tifa.plusOneCounters).toBe(1); // a real counter, not a temporary pump
    expect(effectivePower(state, tifa)).toBe(2);
  });

  it("does not trigger from the other player's land", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 1;
    state.priorityPlayerIndex = 1;
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const tifa = createCardInstance(state, "tifa-lockhart", alice.id, "battlefield");
    const land = createCardInstance(state, "forest", bob.id, "hand");

    playLand(state, bob.id, land.instanceId);
    expect(state.stack.length).toBe(0);
    expect(effectivePower(state, tifa)).toBe(1);
  });
});

describe("Agent Phil Coulson - {T}: +1/+1 counter on each other Hero you control", () => {
  it("puts a counter on every other Hero, and not on himself", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;

    const coulson = createCardInstance(state, "agent-phil-coulson", alice.id, "battlefield");
    coulson.summoningSickness = false;
    const hawkeye = createCardInstance(state, "hawkeye-clint-barton", alice.id, "battlefield"); // Hero
    const amateur = createCardInstance(state, "amateur-hero", alice.id, "battlefield"); // Hero

    activateAbility(state, alice.id, coulson.instanceId, 0);
    expect(coulson.tapped).toBe(true);
    expect(state.stack.length).toBe(1);
    resolveTopOfStack(state);

    expect(hawkeye.plusOneCounters).toBe(1);
    expect(amateur.plusOneCounters).toBe(1);
    expect(coulson.plusOneCounters).toBe(0); // "each OTHER Hero"
  });

  it("skips non-Heroes and creatures an opponent controls", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const coulson = createCardInstance(state, "agent-phil-coulson", alice.id, "battlefield");
    coulson.summoningSickness = false;
    const squire = createCardInstance(state, "squire", alice.id, "battlefield"); // Human Soldier, not a Hero
    const enemyHero = createCardInstance(state, "amateur-hero", bob.id, "battlefield");

    activateAbility(state, alice.id, coulson.instanceId, 0);
    resolveTopOfStack(state);

    expect(squire.plusOneCounters).toBe(0);
    expect(enemyHero.plusOneCounters).toBe(0);
  });

  it("has Vigilance, so attacking doesn't tap him", () => {
    const state = makeTestGame();
    const def = state.cardDefinitions["agent-phil-coulson"]!;
    expect(def.keywords).toContain("Vigilance");
  });
});

describe("The Falcon, Sam Wilson - the unfiltered form of the same mass-counter effect", () => {
  it("puts a counter on each other creature you control regardless of subtype", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;

    const falcon = createCardInstance(state, "the-falcon-sam-wilson", alice.id, "battlefield");
    const squire = createCardInstance(state, "squire", alice.id, "battlefield");
    const hawkeye = createCardInstance(state, "hawkeye-clint-barton", alice.id, "battlefield");
    const forest = createCardInstance(state, "plains", alice.id, "battlefield"); // not a creature

    // Fire the ETB trigger directly - casting it is covered by the casting tests.
    pushOntoStack(state, falcon.instanceId, alice.id, { kind: "addCounterToEachOther", amount: 1 }, [], false);
    resolveTopOfStack(state);

    expect(squire.plusOneCounters).toBe(1);
    expect(hawkeye.plusOneCounters).toBe(1);
    expect(falcon.plusOneCounters).toBe(0);
    expect(forest.plusOneCounters).toBe(0);
  });
});
