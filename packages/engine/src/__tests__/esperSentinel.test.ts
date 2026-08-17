import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { enteredBattlefield } from "../permanents.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * The whole pool, not one colour of it.
 *
 * The generic part of a cost is paid with whatever is floating, so counting only
 * `generic` measures the wrong thing - which is the same mistake the Sokenzan
 * test made first time round.
 */
const totalMana = (state: GameState, playerId: string) =>
  Object.values(requirePlayer(state, playerId).manaPool).reduce((sum, n) => sum + (n ?? 0), 0);

/**
 * Esper Sentinel - a tax on the first noncreature spell an opponent casts each
 * turn.
 *
 * Two halves are easy to get wrong in opposite directions: "first each turn"
 * stops it being a hard lock, and "noncreature" is what makes it a white card
 * rather than a blue one.
 */
describe("Esper Sentinel", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    // Their turn, so they are the ones casting.
    state.activePlayerIndex = 1;
    state.priorityPlayerIndex = 1;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string): CardInstance {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  /** Cast a card from their hand with mana floating for it. */
  function theyCast(state: GameState, them: string, definitionId: string): CardInstance {
    const card = createCardInstance(state, definitionId, them, "hand");
    const player = requirePlayer(state, them);
    player.manaPool.generic = (player.manaPool.generic ?? 0) + 6;
    player.manaPool.R = (player.manaPool.R ?? 0) + 2;
    player.manaPool.G = (player.manaPool.G ?? 0) + 2;
    player.manaPool.W = (player.manaPool.W ?? 0) + 2;
    castSpell(state, them, card.instanceId, [{ kind: "player", playerId: them }]);
    return card;
  }

  it("taxes the first noncreature spell, and the opponent pays it", () => {
    const { state, me, them } = game();
    put(state, "esper-sentinel", me);
    const before = requirePlayer(state, me).hand.length;

    theyCast(state, them, "lightning-bolt");
    const poolBefore = totalMana(state, them);
    resolveTopOfStack(state); // the Sentinel's trigger

    // They paid {1} rather than let the card through.
    expect(totalMana(state, them)).toBe(poolBefore - 1);
    expect(requirePlayer(state, me).hand.length).toBe(before);
  });

  it("draws when they cannot pay", () => {
    const { state, me, them } = game();
    put(state, "esper-sentinel", me);
    createCardInstance(state, "forest", me, "library");
    const before = requirePlayer(state, me).hand.length;

    theyCast(state, them, "lightning-bolt");
    // Strip their pool after casting: the tax is paid on resolution, not on cast.
    requirePlayer(state, them).manaPool = {};
    resolveTopOfStack(state);

    expect(requirePlayer(state, me).hand.length).toBe(before + 1);
  });

  it("does not fire on their second noncreature spell that turn", () => {
    const { state, me, them } = game();
    put(state, "esper-sentinel", me);

    theyCast(state, them, "lightning-bolt");
    expect(state.stack.length).toBeGreaterThan(1); // spell plus trigger
    while (state.stack.length > 0) resolveTopOfStack(state);

    theyCast(state, them, "lightning-bolt");
    // Only the spell itself: "first ... each turn" is what stops it locking the
    // game down.
    expect(state.stack).toHaveLength(1);
  });

  it("does not fire on a creature spell", () => {
    const { state, me, them } = game();
    put(state, "esper-sentinel", me);

    theyCast(state, them, "grizzly-bears");
    expect(state.stack).toHaveLength(1);
  });

  it("does not tax its own controller", () => {
    const { state, me } = game();
    put(state, "esper-sentinel", me);
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;

    const card = createCardInstance(state, "lightning-bolt", me, "hand");
    requirePlayer(state, me).manaPool.R = 1;
    castSpell(state, me, card.instanceId, [{ kind: "player", playerId: me }]);

    expect(state.stack).toHaveLength(1);
  });

  it("charges what the Sentinel's power is now", () => {
    const { state, me, them } = game();
    const sentinel = put(state, "esper-sentinel", me);
    sentinel.plusOneCounters = 2; // a 3/3 Sentinel taxes three

    theyCast(state, them, "lightning-bolt");
    const poolBefore = totalMana(state, them);
    resolveTopOfStack(state);

    expect(poolBefore - totalMana(state, them)).toBe(3);
  });
});
