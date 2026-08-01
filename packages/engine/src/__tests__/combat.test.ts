import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { checkStateBasedActions } from "../sba.js";
import { castSpell } from "../casting.js";

describe("combat rules", () => {
  it("a creature with defender cannot be declared as an attacker", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const wall = createCardInstance(state, "wall-of-wood", alice.id, "battlefield");
    wall.summoningSickness = false;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;

    expect(() =>
      declareAttackers(state, alice.id, [{ attackerInstanceId: wall.instanceId, defendingPlayerId: bob.id }]),
    ).toThrow(/defender/i);
  });

  it("Deathtouch: 1 damage from a deathtouch source is lethal to a much bigger creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const rats = createCardInstance(state, "typhoid-rats", alice.id, "battlefield"); // 1/1 Deathtouch
    rats.summoningSickness = false;
    const wurm = createCardInstance(state, "craw-wurm", bob.id, "battlefield"); // 6/4

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: rats.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";
    declareBlockers(state, bob.id, [{ blockerInstanceId: wurm.instanceId, attackerInstanceId: rats.instanceId }]);
    state.step = "combat-damage";
    dealCombatDamage(state);
    checkStateBasedActions(state);

    expect(bob.graveyard.some((c) => c.instanceId === wurm.instanceId)).toBe(true);
    expect(alice.graveyard.some((c) => c.instanceId === rats.instanceId)).toBe(true);
  });

  it("Lifelink: combat damage from a lifelink source gains its controller that much life", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const vampire = createCardInstance(state, "child-of-night", alice.id, "battlefield"); // 2/2 Lifelink
    vampire.summoningSickness = false;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: vampire.instanceId, defendingPlayerId: bob.id }]);
    state.step = "combat-damage";
    dealCombatDamage(state);

    expect(bob.life).toBe(38);
    expect(alice.life).toBe(42);
  });

  it("Trample: excess damage beyond lethal spills over to the defending player (and still counts as commander damage)", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const trampler = createCardInstance(state, "hulk-bruce-banner", alice.id, "battlefield", {
      isCommander: true,
    }); // 7/4 Trample
    trampler.summoningSickness = false;
    const chump = createCardInstance(state, "llanowar-elves", bob.id, "battlefield"); // 1/1

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: trampler.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";
    declareBlockers(state, bob.id, [{ blockerInstanceId: chump.instanceId, attackerInstanceId: trampler.instanceId }]);
    state.step = "combat-damage";
    dealCombatDamage(state);
    checkStateBasedActions(state);

    expect(bob.life).toBe(34); // 40 - (7 power - 1 lethal to the 1/1 blocker)
    expect(bob.graveyard.some((c) => c.instanceId === chump.instanceId)).toBe(true);
    expect(bob.commanderDamageTaken[trampler.instanceId]).toBe(6);
  });
});

describe("evasion (Flying/Reach)", () => {
  it("a creature without Flying or Reach cannot block a Flying attacker", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const drake = createCardInstance(state, "wind-drake", alice.id, "battlefield");
    drake.summoningSickness = false;
    const bear = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: drake.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";

    expect(() =>
      declareBlockers(state, bob.id, [{ blockerInstanceId: bear.instanceId, attackerInstanceId: drake.instanceId }]),
    ).toThrow(/flying|reach/i);
  });

  it("a creature with Reach can block a Flying attacker", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const drake = createCardInstance(state, "wind-drake", alice.id, "battlefield");
    drake.summoningSickness = false;
    const spider = createCardInstance(state, "giant-spider", bob.id, "battlefield");

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: drake.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";

    expect(() =>
      declareBlockers(state, bob.id, [
        { blockerInstanceId: spider.instanceId, attackerInstanceId: drake.instanceId },
      ]),
    ).not.toThrow();
  });
});

describe("targeting restrictions (Hexproof)", () => {
  it("prevents an opponent's spell from targeting it", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bogle = createCardInstance(state, "gladecover-scout", bob.id, "battlefield");
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    alice.manaPool = { R: 1 };

    expect(() =>
      castSpell(state, alice.id, bolt.instanceId, [{ kind: "card", instanceId: bogle.instanceId }]),
    ).toThrow();
  });

  it("does not stop its own controller's spells from targeting it", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    state.priorityPlayerIndex = 1;
    const bogle = createCardInstance(state, "gladecover-scout", bob.id, "battlefield");
    const bolt = createCardInstance(state, "lightning-bolt", bob.id, "hand");
    bob.manaPool = { R: 1 };

    expect(() =>
      castSpell(state, bob.id, bolt.instanceId, [{ kind: "card", instanceId: bogle.instanceId }]),
    ).not.toThrow();
  });
});
