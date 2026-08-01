import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { activateAbility } from "../abilities.js";
import { declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";

describe("Flash", () => {
  it("lets Ambush Viper be cast outside a main phase", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-blockers";
    const alice = state.players[0]!;
    const viper = createCardInstance(state, "ambush-viper", alice.id, "hand");
    alice.manaPool = { generic: 1, G: 1 };

    castSpell(state, alice.id, viper.instanceId);
    expect(state.stack.length).toBe(1);
  });

  it("still refuses a non-Flash creature outside a main phase", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-blockers";
    const alice = state.players[0]!;
    const bear = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    alice.manaPool = { generic: 1, G: 1 };

    expect(() => castSpell(state, alice.id, bear.instanceId)).toThrow();
  });
});

describe("Menace", () => {
  it("rejects being blocked by exactly one creature", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const strangler = createCardInstance(state, "alley-strangler", alice.id, "battlefield");
    strangler.summoningSickness = false;
    const bear = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");

    declareAttackers(state, alice.id, [{ attackerInstanceId: strangler.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";

    expect(() =>
      declareBlockers(state, bob.id, [{ blockerInstanceId: bear.instanceId, attackerInstanceId: strangler.instanceId }]),
    ).toThrow(/menace/i);
  });

  it("can be blocked by two or more creatures", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const strangler = createCardInstance(state, "alley-strangler", alice.id, "battlefield"); // 2/3 Menace
    strangler.summoningSickness = false;
    const bear1 = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // 2/2
    const bear2 = createCardInstance(state, "runeclaw-bear", bob.id, "battlefield"); // 2/2

    declareAttackers(state, alice.id, [{ attackerInstanceId: strangler.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";
    declareBlockers(state, bob.id, [
      { blockerInstanceId: bear1.instanceId, attackerInstanceId: strangler.instanceId },
      { blockerInstanceId: bear2.instanceId, attackerInstanceId: strangler.instanceId },
    ]);

    dealCombatDamage(state);

    // 2 power split: lethal (2) to bear1, 0 left for bear2 (no trample, so bear2 - the last
    // blocker - would soak remaining power, but there's none left to assign).
    expect(bear1.damageMarked).toBe(2);
    expect(bear2.damageMarked).toBe(0);
    // The attacker takes combined damage from both blockers (2 + 2 = 4).
    expect(strangler.damageMarked).toBe(4);
  });

  it("combines with Trample to spill leftover damage past multiple blockers", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    // Hulk has Trample (not Menace) - a non-Menace attacker can still be voluntarily
    // double-blocked, so this exercises the general multi-blocker + Trample math on its own.
    const hulk = createCardInstance(state, "hulk-bruce-banner", alice.id, "battlefield"); // 7/4 Trample
    hulk.summoningSickness = false;
    const bear1 = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // 2/2
    const bear2 = createCardInstance(state, "runeclaw-bear", bob.id, "battlefield"); // 2/2

    declareAttackers(state, alice.id, [{ attackerInstanceId: hulk.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";
    declareBlockers(state, bob.id, [
      { blockerInstanceId: bear1.instanceId, attackerInstanceId: hulk.instanceId },
      { blockerInstanceId: bear2.instanceId, attackerInstanceId: hulk.instanceId },
    ]);

    dealCombatDamage(state);

    expect(bear1.damageMarked).toBe(2); // lethal
    expect(bear2.damageMarked).toBe(2); // lethal
    expect(bob.life).toBe(37); // 7 power - 2 - 2 = 3 tramples through
  });
});

describe("Ward", () => {
  it("counters a spell that can't pay the ward cost", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const guard = createCardInstance(state, "tomakul-honor-guard", bob.id, "battlefield"); // Ward {2}
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    alice.manaPool = { R: 1 }; // enough for Lightning Bolt itself, nothing left for Ward

    castSpell(state, alice.id, bolt.instanceId, [{ kind: "card", instanceId: guard.instanceId }]);

    expect(state.stack.length).toBe(0); // countered, never resolved
    expect(guard.damageMarked).toBe(0);
    expect(alice.graveyard.some((c) => c.instanceId === bolt.instanceId)).toBe(true);
  });

  it("resolves normally when the ward cost is paid", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const guard = createCardInstance(state, "tomakul-honor-guard", bob.id, "battlefield");
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    alice.manaPool = { R: 1, generic: 2 }; // Lightning Bolt's {R} plus Ward's {2}

    castSpell(state, alice.id, bolt.instanceId, [{ kind: "card", instanceId: guard.instanceId }]);
    expect(state.stack.length).toBe(1);
    expect(alice.manaPool.generic ?? 0).toBe(0); // ward cost was paid

    resolveTopOfStack(state);
    expect(guard.damageMarked).toBe(3);
  });

  it("counters a targeted activated ability the same way", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const pyromancer = createCardInstance(state, "prodigal-pyromancer", alice.id, "battlefield");
    pyromancer.summoningSickness = false;
    const guard = createCardInstance(state, "tomakul-honor-guard", bob.id, "battlefield");
    alice.manaPool = {}; // nothing to pay the Ward cost with

    activateAbility(state, alice.id, pyromancer.instanceId, 0, [{ kind: "card", instanceId: guard.instanceId }]);

    expect(state.stack.length).toBe(0);
    expect(guard.damageMarked).toBe(0);
    expect(pyromancer.tapped).toBe(true); // activation cost was still paid even though it fizzled
  });

  it("doesn't trigger when the controller targets their own Ward creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;

    const guard = createCardInstance(state, "tomakul-honor-guard", alice.id, "battlefield");
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    alice.manaPool = { R: 1 }; // no extra mana for a ward cost - shouldn't be needed

    castSpell(state, alice.id, bolt.instanceId, [{ kind: "card", instanceId: guard.instanceId }]);
    expect(state.stack.length).toBe(1);
  });
});

describe("activated ability costs", () => {
  it("charges the mana cost of an activated ability, not just the tap", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const antMan = createCardInstance(state, "ant-man-scott-lang", alice.id, "battlefield"); // {4}: +1/+1 counter
    antMan.summoningSickness = false;
    alice.manaPool = { generic: 4 };

    activateAbility(state, alice.id, antMan.instanceId, 0);
    expect(alice.manaPool.generic ?? 0).toBe(0);

    // Without the mana having actually been spent this ability was free, and a
    // mana-sink like this one could be activated an unbounded number of times -
    // which is exactly how the bot-vs-bot game found it (see ROADMAP.md).
    expect(() => activateAbility(state, alice.id, antMan.instanceId, 0)).toThrow(/cannot pay/i);
  });

  it("leaves the permanent untapped when the mana cost can't be paid", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const pyromancer = createCardInstance(state, "prodigal-pyromancer", alice.id, "battlefield");
    pyromancer.summoningSickness = false;
    const bear = createCardInstance(state, "grizzly-bears", state.players[1]!.id, "battlefield");

    // Prodigal Pyromancer's ability is tap-only, so this stays legal - the guard
    // being checked is that a *failed* activation never half-pays a cost.
    activateAbility(state, alice.id, pyromancer.instanceId, 0, [{ kind: "card", instanceId: bear.instanceId }]);
    expect(pyromancer.tapped).toBe(true);
  });
});
