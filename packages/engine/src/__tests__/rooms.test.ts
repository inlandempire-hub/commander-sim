import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { enteredBattlefield, putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { castSpell, unlockDoor } from "../casting.js";
import { declareAttackers } from "../combat.js";
import { effectivePower, effectiveToughness } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * Dollmaker's Shop // Porcelain Gallery - the first Room in the pool.
 *
 * Two halves of one permanent, each castable on its own and each unlockable
 * later. Not the modal double-faced pattern: an MDFC becomes the face you chose
 * and only that one is ever live, while a Room keeps both.
 */
function game(): { state: GameState; me: string; them: string } {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return { state, me: state.players[0]!.id, them: state.players[1]!.id };
}

function put(state: GameState, definitionId: string, playerId: string): CardInstance {
  const instance = createCardInstance(state, definitionId, playerId, "battlefield");
  enteredBattlefield(state, instance);
  instance.summoningSickness = false;
  return instance;
}

function settle(state: GameState): void {
  for (const choice of state.pendingTargetChoices) state.stack.push(choice.object);
  state.pendingTargetChoices = [];
  let guard = 0;
  while (state.stack.length > 0 && guard++ < 40) resolveTopOfStack(state);
}

/** A Room already in play with the named doors open. */
function room(state: GameState, playerId: string, doors: Array<"front" | "back">): CardInstance {
  const instance = createCardInstance(state, "dollmakers-shop", playerId, "hand");
  putOntoBattlefield(state, instance.instanceId);
  instance.unlockedDoors = doors;
  return instance;
}

describe("casting a Room", () => {
  it("costs the front half's price and opens that door", () => {
    const { state, me } = game();
    const card = createCardInstance(state, "dollmakers-shop", me, "hand");
    const player = requirePlayer(state, me);
    player.manaPool.generic = 1;
    player.manaPool.W = 1;

    castSpell(state, me, card.instanceId, []);
    settle(state);

    expect(card.zone).toBe("battlefield");
    expect(card.unlockedDoors).toEqual(["front"]);
    // The card's identity is the front definition either way - that is what it
    // is countered, named and recurred as.
    expect(card.definitionId).toBe("dollmakers-shop");
  });

  it("costs the back half's price when that is the half cast", () => {
    const { state, me } = game();
    const card = createCardInstance(state, "dollmakers-shop", me, "hand");
    const player = requirePlayer(state, me);
    player.manaPool.generic = 4;
    player.manaPool.W = 2;

    castSpell(state, me, card.instanceId, [], { face: "back" });
    settle(state);

    expect(card.unlockedDoors).toEqual(["back"]);
    // Still the front definition, unlike an MDFC, which would have become the
    // other card entirely.
    expect(card.definitionId).toBe("dollmakers-shop");
  });

  it("cannot be cast for the front price and given the back door", () => {
    const { state, me } = game();
    const card = createCardInstance(state, "dollmakers-shop", me, "hand");
    const player = requirePlayer(state, me);
    player.manaPool.generic = 1;
    player.manaPool.W = 1;

    expect(() => castSpell(state, me, card.instanceId, [], { face: "back" })).toThrow(/cannot afford/);
  });
});

describe("unlocking a Room's other door", () => {
  it("costs that door's price and leaves the first one open", () => {
    const { state, me } = game();
    const shop = room(state, me, ["front"]);
    const player = requirePlayer(state, me);
    player.manaPool.generic = 4;
    player.manaPool.W = 2;

    unlockDoor(state, me, shop.instanceId, "back");

    expect(shop.unlockedDoors).toEqual(["front", "back"]);
    // Both halves live at once, which is the whole difference from an MDFC.
    expect(player.manaPool.generic).toBe(0);
  });

  it("refuses a door that is already open", () => {
    const { state, me } = game();
    const shop = room(state, me, ["front"]);
    requirePlayer(state, me).manaPool.generic = 4;
    requirePlayer(state, me).manaPool.W = 2;

    expect(() => unlockDoor(state, me, shop.instanceId, "front")).toThrow(/already unlocked/);
  });

  it("refuses at instant speed", () => {
    const { state, me } = game();
    const shop = room(state, me, ["front"]);
    requirePlayer(state, me).manaPool.generic = 4;
    requirePlayer(state, me).manaPool.W = 2;
    // "**As a sorcery**" - the same timing its halves are cast at.
    state.phase = "combat";
    state.step = "declare-blockers";

    expect(() => unlockDoor(state, me, shop.instanceId, "back")).toThrow(/sorcery speed/);
  });

  it("refuses what cannot be paid for", () => {
    const { state, me } = game();
    const shop = room(state, me, ["front"]);
    expect(() => unlockDoor(state, me, shop.instanceId, "back")).toThrow(/cannot afford/);
  });
});

describe("Dollmaker's Shop", () => {
  it("makes one Toy for a whole attack, not one per attacker", () => {
    const { state, me, them } = game();
    room(state, me, ["front"]);
    const a = put(state, "grizzly-bears", me);
    const b = put(state, "savannah-lions", me);

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [
      { attackerInstanceId: a.instanceId, defendingPlayerId: them },
      { attackerInstanceId: b.instanceId, defendingPlayerId: them },
    ]);
    settle(state);

    expect(requirePlayer(state, me).battlefield.filter((c) => c.definitionId === "token-w-11-toy")).toHaveLength(1);
  });

  it("does nothing while its door is locked", () => {
    const { state, me, them } = game();
    // The Gallery half was the one cast; the Shop is still shut.
    room(state, me, ["back"]);
    const bear = put(state, "grizzly-bears", me);

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: bear.instanceId, defendingPlayerId: them }]);
    settle(state);

    expect(requirePlayer(state, me).battlefield.filter((c) => c.definitionId === "token-w-11-toy")).toHaveLength(0);
  });

  it("does not make a Toy for an attack of nothing but Toys", () => {
    const { state, me, them } = game();
    room(state, me, ["front"]);
    const toy = put(state, "token-w-11-toy", me);

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: toy.instanceId, defendingPlayerId: them }]);
    settle(state);

    // "**non-Toy** creatures" - or one Toy would beget the next forever.
    expect(requirePlayer(state, me).battlefield.filter((c) => c.definitionId === "token-w-11-toy")).toHaveLength(1);
  });
});

describe("Porcelain Gallery", () => {
  it("sets base power and toughness to the number of creatures you control", () => {
    const { state, me } = game();
    room(state, me, ["back"]);
    const bear = put(state, "grizzly-bears", me); // printed 2/2
    put(state, "savannah-lions", me);
    put(state, "ornithopter", me);

    // Three creatures, so every one of them is a 3/3.
    expect(effectivePower(state, bear)).toBe(3);
    expect(effectiveToughness(state, bear)).toBe(3);
  });

  it("is a base, so counters go on top of it", () => {
    const { state, me } = game();
    room(state, me, ["back"]);
    const bear = put(state, "grizzly-bears", me);
    put(state, "savannah-lions", me);
    bear.plusOneCounters = 1;

    // Layer 7b before 7c: two creatures makes a base of 2, and the counter
    // takes it to 3 - not a 2/2 that the counter never reached.
    expect(effectivePower(state, bear)).toBe(3);
  });

  it("does nothing while its door is locked", () => {
    const { state, me } = game();
    room(state, me, ["front"]);
    const bear = put(state, "grizzly-bears", me);
    put(state, "savannah-lions", me);

    expect(effectivePower(state, bear)).toBe(2);
  });

  it("does not reach an opponent's creatures", () => {
    const { state, me, them } = game();
    room(state, me, ["back"]);
    put(state, "grizzly-bears", me);
    put(state, "savannah-lions", me);
    const theirs = put(state, "grizzly-bears", them);

    // "Creatures **you** control".
    expect(effectivePower(state, theirs)).toBe(2);
  });

  it("stops applying when the Room leaves", () => {
    const { state, me } = game();
    const shop = room(state, me, ["back"]);
    const bear = put(state, "grizzly-bears", me); // printed 2/2
    put(state, "savannah-lions", me);
    put(state, "ornithopter", me);
    // Three creatures, so the Gallery is visibly doing something.
    expect(effectivePower(state, bear)).toBe(3);

    requirePlayer(state, me).battlefield = requirePlayer(state, me).battlefield.filter(
      (c) => c.instanceId !== shop.instanceId,
    );
    // Back to its printed figure, and read fresh rather than latched.
    expect(effectivePower(state, bear)).toBe(2);
  });
});
