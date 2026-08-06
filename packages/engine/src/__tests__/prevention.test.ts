import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { applyEffect } from "../effects.js";
import { damageCreature, damagePlayer } from "../damage.js";
import { declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { checkStateBasedActions } from "../sba.js";
import { advanceStep } from "../turn.js";
import { HEALING_SALVE } from "../cards/testCards.js";

/**
 * Damage prevention: the shield, and every path damage can arrive by.
 *
 * The reason these tests are worth having is that prevention is only useful if
 * it is universal. A shield that stopped burn spells but not an attacking
 * creature would be worse than no shield at all - it would look like it worked
 * and then fail in the one situation anybody casts it in.
 */
describe("damage prevention", () => {
  function shieldedCreature(amount: number) {
    const state = makeTestGame();
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    bears.damagePrevention = amount;
    return { state, bob, bears };
  }

  it("swallows damage up to the shield and marks the rest", () => {
    const { state, bears } = shieldedCreature(3);
    const result = damageCreature(state, bears, 5);
    expect(result).toEqual({ dealt: 2, prevented: 3 });
    expect(bears.damageMarked).toBe(2);
    expect(bears.damagePrevention).toBe(0);
  });

  it("spends the whole shield even on a smaller hit", () => {
    // "Prevent the next 3 damage" is not "prevent 3 damage from each source".
    const { state, bears } = shieldedCreature(3);
    damageCreature(state, bears, 1);
    expect(bears.damagePrevention).toBe(2);
    damageCreature(state, bears, 5);
    expect(bears.damageMarked).toBe(3);
    expect(bears.damagePrevention).toBe(0);
  });

  it("keeps a creature off a deathtouch source's hook entirely", () => {
    // The difference between a shield and extra toughness in one test: any
    // damage at all from a deathtouch source is lethal, so surviving means
    // being dealt none of it rather than surviving the amount.
    const { state, bears } = shieldedCreature(1);
    damageCreature(state, bears, 1, { deathtouch: true });
    expect(bears.deathtouchDamage).toBe(false);
    expect(bears.damageMarked).toBe(0);
  });

  it("still marks deathtouch when part of the damage gets through", () => {
    const { state, bears } = shieldedCreature(1);
    damageCreature(state, bears, 2, { deathtouch: true });
    expect(bears.deathtouchDamage).toBe(true);
  });

  it("protects a player's life total", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    bob.damagePrevention = 4;
    expect(damagePlayer(state, bob, 6)).toEqual({ dealt: 2, prevented: 4 });
    expect(bob.life).toBe(38);
  });

  it("stops a burn spell", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    bob.damagePrevention = 3;

    applyEffect(state, alice.id, bolt.instanceId, { kind: "damage", amount: 3, target: { kind: "any-target" } }, [
      { kind: "player", playerId: bob.id },
    ]);
    expect(bob.life).toBe(40);
  });

  it("denies lifelink the life a prevented hit would have gained", () => {
    // Lifelink gains life equal to the damage *dealt*. This is the case that
    // made a single damage chokepoint worth the refactor - it was previously
    // computed from the source's power, before anything could interfere.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const vampire = createCardInstance(state, "child-of-night", alice.id, "battlefield"); // 2/1 Lifelink
    vampire.summoningSickness = false;
    bob.damagePrevention = 2;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: vampire.instanceId, defendingPlayerId: bob.id },
    ]);
    state.step = "combat-damage";
    dealCombatDamage(state);

    expect(bob.life).toBe(40);
    expect(alice.life).toBe(40);
  });

  it("stops commander damage from being counted", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const commander = createCardInstance(state, "craw-wurm", alice.id, "battlefield", { isCommander: true }); // 6/4
    commander.summoningSickness = false;
    bob.damagePrevention = 6;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: commander.instanceId, defendingPlayerId: bob.id },
    ]);
    state.step = "combat-damage";
    dealCombatDamage(state);

    expect(bob.life).toBe(40);
    expect(bob.commanderDamageTaken[commander.instanceId]).toBeUndefined();
  });

  it("saves a blocker from an attacker it would otherwise have died to", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const wurm = createCardInstance(state, "craw-wurm", alice.id, "battlefield"); // 6/4
    wurm.summoningSickness = false;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // 2/2
    bears.damagePrevention = 6;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: bob.id }]);
    state.step = "declare-blockers";
    declareBlockers(state, bob.id, [
      { blockerInstanceId: bears.instanceId, attackerInstanceId: wurm.instanceId },
    ]);
    state.step = "combat-damage";
    dealCombatDamage(state);
    checkStateBasedActions(state);

    expect(bob.battlefield.some((c) => c.instanceId === bears.instanceId)).toBe(true);
    expect(bears.damageMarked).toBe(0);
    // The attacker took its two all the same - the shield is the blocker's.
    expect(wurm.damageMarked).toBe(2);
  });

  it("does not let trample carry prevented damage through to the player", () => {
    // The attacker's power is assigned against the blocker's toughness, and a
    // shield does not reduce what is assigned - it only stops what lands. A
    // trampler should not get to route its damage around a blocker just
    // because the blocker was protected.
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const trampler = createCardInstance(state, "craw-wurm", alice.id, "battlefield");
    state.cardDefinitions["craw-wurm"] = {
      ...state.cardDefinitions["craw-wurm"]!,
      keywords: ["Trample"],
    };
    trampler.summoningSickness = false;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // 2/2
    bears.damagePrevention = 2;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: trampler.instanceId, defendingPlayerId: bob.id },
    ]);
    state.step = "declare-blockers";
    declareBlockers(state, bob.id, [
      { blockerInstanceId: bears.instanceId, attackerInstanceId: trampler.instanceId },
    ]);
    state.step = "combat-damage";
    dealCombatDamage(state);

    // 6 power: 2 assigned to the blocker (all prevented), 4 trampling over.
    expect(bears.damageMarked).toBe(0);
    expect(bob.life).toBe(36);
  });

  it("wears off in the cleanup step, spent or not", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    bob.damagePrevention = 3;
    bears.damagePrevention = 3;

    state.phase = "ending";
    state.step = "end";
    // One call, because cleanup gives nobody priority and the turn rolls
    // straight on past it into the next player's upkeep.
    advanceStep(state);

    expect(bob.damagePrevention).toBe(0);
    expect(bears.damagePrevention).toBe(0);
  });

  it("stacks rather than replacing when applied twice", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const salve = createCardInstance(state, "healing-salve", alice.id, "hand");
    const prevent = { kind: "preventDamage", amount: 3, target: { kind: "any-target" } } as const;

    applyEffect(state, alice.id, salve.instanceId, prevent, [{ kind: "player", playerId: bob.id }]);
    applyEffect(state, alice.id, salve.instanceId, prevent, [{ kind: "player", playerId: bob.id }]);
    expect(bob.damagePrevention).toBe(6);
  });

  it("is what Healing Salve's second mode actually does", () => {
    // Guards the fixture itself. It used to be +0/+3 on a creature, which is a
    // different card - see the note on the fixture and ADDING-CARDS.md.
    const modes = HEALING_SALVE.castEffect?.kind === "modal" ? HEALING_SALVE.castEffect.modes : [];
    expect(modes[1]?.effect).toEqual({
      kind: "preventDamage",
      amount: 3,
      target: { kind: "any-target" },
    });
  });
});
