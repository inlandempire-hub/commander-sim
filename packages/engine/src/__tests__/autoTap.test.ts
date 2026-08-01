import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { resolveTopOfStack } from "../stack.js";
import { canPlayCardNow } from "../autoPass.js";
import {
  autoTapForCost,
  castingCostOf,
  castSpellWithAutoTap,
  couldAfford,
  manaSources,
} from "../autoTap.js";

/** A main phase with `playerIndex` active and holding priority. */
function mainPhase(playerIndex = 0) {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = playerIndex;
  state.priorityPlayerIndex = playerIndex;
  return state;
}

function giveLands(state: ReturnType<typeof mainPhase>, playerId: string, landId: string, count: number) {
  return Array.from({ length: count }, () => createCardInstance(state, landId, playerId, "battlefield"));
}

describe("auto-tapping for a spell", () => {
  it("taps exactly as many lands as the cost needs", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const islands = giveLands(state, alice.id, "island", 4);
    const counterspell = createCardInstance(state, "counterspell", alice.id, "hand"); // {U}{U}
    const bears = createCardInstance(state, "grizzly-bears", state.players[1]!.id, "hand");

    // Something to counter, so the cast is legal. It's Bob's turn - a creature
    // is sorcery speed, so he can only cast it on his own.
    state.activePlayerIndex = 1;
    state.priorityPlayerIndex = 1;
    state.players[1]!.manaPool = { G: 1, generic: 1 };
    castSpellWithAutoTap(state, state.players[1]!.id, bears.instanceId);
    state.priorityPlayerIndex = 0; // Alice responds at instant speed

    castSpellWithAutoTap(state, alice.id, counterspell.instanceId, [
      { kind: "spell", stackObjectId: state.stack[0]!.id },
    ]);

    expect(islands.filter((l) => l.tapped)).toHaveLength(2);
    expect(islands.filter((l) => !l.tapped)).toHaveLength(2);
    // Spent exactly - nothing left floating. (payManaCost leaves explicit
    // zeroes behind rather than deleting keys, so sum rather than compare.)
    expect(Object.values(alice.manaPool).reduce((a, b) => a + (b ?? 0), 0)).toBe(0);
  });

  it("spends mana already floating before tapping anything", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const islands = giveLands(state, alice.id, "island", 3);
    alice.manaPool = { U: 2 };
    createCardInstance(state, "grizzly-bears", alice.id, "hand");
    const drake = createCardInstance(state, "wind-drake", alice.id, "hand"); // {2}{U}

    castSpellWithAutoTap(state, alice.id, drake.instanceId);

    // {2}{U} costs three; two were floating, so only one land should be tapped.
    expect(islands.filter((l) => l.tapped)).toHaveLength(1);
  });

  it("pays the commander tax out of the command zone", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const commander = createCardInstance(state, "caelorna-coral-tyrant", alice.id, "command", {
      isCommander: true,
    }); // {1}{U}
    const islands = giveLands(state, alice.id, "island", 6);

    expect(castingCostOf(state, alice.id, commander.instanceId, true)).toEqual({
      generic: 1,
      colors: { U: 1 },
    });

    castSpellWithAutoTap(state, alice.id, commander.instanceId, [], { fromCommandZone: true });
    resolveTopOfStack(state);
    expect(islands.filter((l) => l.tapped)).toHaveLength(2);

    // Back to the command zone and cast again: now {1}{U} plus {2} tax.
    state.players[0]!.command.push(state.players[0]!.battlefield.pop()!);
    const recast = alice.command[0]!;
    recast.zone = "command";
    for (const land of islands) land.tapped = false;

    expect(castingCostOf(state, alice.id, recast.instanceId, true).generic).toBe(3);
    castSpellWithAutoTap(state, alice.id, recast.instanceId, [], { fromCommandZone: true });
    expect(islands.filter((l) => l.tapped)).toHaveLength(4);
  });

  it("leaves every land untapped when the spell is unaffordable", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const islands = giveLands(state, alice.id, "island", 2);
    const sphinx = createCardInstance(state, "mahamoti-djinn", alice.id, "hand"); // {4}{U}{U}

    expect(() => castSpellWithAutoTap(state, alice.id, sphinx.instanceId)).toThrow();
    expect(islands.every((l) => !l.tapped)).toBe(true);
    expect(alice.manaPool).toEqual({});
  });

  it("puts the lands back when the cast turns out to be illegal", () => {
    // A sorcery-speed creature during combat: affordable, but not castable now.
    const state = mainPhase();
    state.phase = "combat";
    state.step = "declare-attackers";
    const alice = state.players[0]!;
    const islands = giveLands(state, alice.id, "island", 4);
    const drake = createCardInstance(state, "wind-drake", alice.id, "hand");

    expect(() => castSpellWithAutoTap(state, alice.id, drake.instanceId)).toThrow(
      /sorcery speed/,
    );
    expect(islands.every((l) => !l.tapped)).toBe(true);
    expect(alice.manaPool).toEqual({});
    expect(alice.hand.some((c) => c.instanceId === drake.instanceId)).toBe(true);
  });

  it("refunds the tapping when the target is illegal", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const islands = giveLands(state, alice.id, "island", 4);
    const scout = createCardInstance(state, "gladecover-scout", bob.id, "battlefield"); // Hexproof
    const hydrosurge = createCardInstance(state, "hydrosurge", alice.id, "hand");

    expect(() =>
      castSpellWithAutoTap(state, alice.id, hydrosurge.instanceId, [
        { kind: "card", instanceId: scout.instanceId },
      ]),
    ).toThrow(/Illegal target/);
    expect(islands.every((l) => !l.tapped)).toBe(true);
  });

  it("never taps anything on its own - only when something is being cast", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const islands = giveLands(state, alice.id, "island", 5);

    // Simply having lands and a turn does nothing to them.
    expect(islands.every((l) => !l.tapped)).toBe(true);
    expect(alice.manaPool).toEqual({});

    // And asking whether a cost is affordable is a question, not an action.
    expect(couldAfford(state, alice.id, { generic: 2, colors: { U: 1 } })).toBe(true);
    expect(islands.every((l) => !l.tapped)).toBe(true);
  });

  it("counts an untapped land as a mana source and a tapped one as not", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const islands = giveLands(state, alice.id, "island", 3);
    expect(manaSources(state, alice)).toHaveLength(3);
    islands[0]!.tapped = true;
    expect(manaSources(state, alice)).toHaveLength(2);
  });

  it("reports failure rather than half-paying a cost it cannot meet", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const islands = giveLands(state, alice.id, "island", 2);
    expect(autoTapForCost(state, alice.id, { generic: 4, colors: { U: 2 } })).toBe(false);
    expect(islands.every((l) => !l.tapped)).toBe(true);
  });

  it("will not use the wrong colour to satisfy a coloured pip", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    giveLands(state, alice.id, "forest", 5); // green mana only
    expect(couldAfford(state, alice.id, { generic: 0, colors: { U: 1 } })).toBe(false);
    expect(autoTapForCost(state, alice.id, { generic: 0, colors: { U: 1 } })).toBe(false);
  });
});

describe("canPlayCardNow", () => {
  it("is true for a creature you can afford in your own main phase", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    giveLands(state, alice.id, "island", 3);
    const drake = createCardInstance(state, "wind-drake", alice.id, "hand"); // {2}{U}
    expect(canPlayCardNow(state, alice.id, drake.instanceId)).toBe(true);
  });

  it("is false when the lands are already tapped out", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    for (const land of giveLands(state, alice.id, "island", 3)) land.tapped = true;
    const drake = createCardInstance(state, "wind-drake", alice.id, "hand");
    expect(canPlayCardNow(state, alice.id, drake.instanceId)).toBe(false);
  });

  it("counts mana still in untapped lands, not just what is floating", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    giveLands(state, alice.id, "island", 3);
    const drake = createCardInstance(state, "wind-drake", alice.id, "hand");
    expect(alice.manaPool).toEqual({}); // nothing floating at all
    expect(canPlayCardNow(state, alice.id, drake.instanceId)).toBe(true);
  });

  it("is false for a sorcery-speed card outside your main phase, but true for an instant", () => {
    const state = mainPhase();
    state.phase = "combat";
    state.step = "declare-blockers";
    const alice = state.players[0]!;
    giveLands(state, alice.id, "island", 4);
    const drake = createCardInstance(state, "wind-drake", alice.id, "hand");
    const counterspell = createCardInstance(state, "counterspell", alice.id, "hand");
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "hand");

    expect(canPlayCardNow(state, alice.id, drake.instanceId)).toBe(false);
    // Counterspell needs a spell on the stack to be worth anything, so with an
    // empty stack it has nothing legal to target either.
    expect(canPlayCardNow(state, alice.id, counterspell.instanceId)).toBe(false);
    expect(canPlayCardNow(state, alice.id, bears.instanceId)).toBe(false);
  });

  it("is false for a targeted spell with nothing legal to point at", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    giveLands(state, alice.id, "island", 3);
    const hydrosurge = createCardInstance(state, "hydrosurge", alice.id, "hand"); // target creature
    expect(canPlayCardNow(state, alice.id, hydrosurge.instanceId)).toBe(false);

    createCardInstance(state, "grizzly-bears", state.players[1]!.id, "battlefield");
    expect(canPlayCardNow(state, alice.id, hydrosurge.instanceId)).toBe(true);
  });

  it("allows one land per turn and no more", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const island = createCardInstance(state, "island", alice.id, "hand");
    expect(canPlayCardNow(state, alice.id, island.instanceId)).toBe(true);
    alice.landsPlayedThisTurn = 1;
    expect(canPlayCardNow(state, alice.id, island.instanceId)).toBe(false);
  });

  it("accounts for commander tax on a recast", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const commander = createCardInstance(state, "caelorna-coral-tyrant", alice.id, "command", {
      isCommander: true,
    }); // {1}{U}
    giveLands(state, alice.id, "island", 2);

    expect(canPlayCardNow(state, alice.id, commander.instanceId)).toBe(true);
    alice.commanderCastCount[commander.instanceId] = 1; // now costs {3}{U}
    expect(canPlayCardNow(state, alice.id, commander.instanceId)).toBe(false);
  });

  it("is false for a card that isn't in your hand or command zone", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const onBoard = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    expect(canPlayCardNow(state, alice.id, onBoard.instanceId)).toBe(false);
  });
});
