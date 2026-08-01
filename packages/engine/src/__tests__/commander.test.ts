import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { dealCombatDamage, declareAttackers } from "../combat.js";

describe("commander zone mechanics", () => {
  it("applies commander tax on each successive cast from the command zone", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const commander = createCardInstance(state, "jerrard-of-the-closed-fist", alice.id, "command", {
      isCommander: true,
    });

    // First cast: base cost {3}{R}{G}{G} = 6 mana, no tax yet.
    alice.manaPool = { generic: 3, R: 1, G: 2 };
    castSpell(state, alice.id, commander.instanceId, [], { fromCommandZone: true });
    expect(alice.commanderCastCount[commander.instanceId]).toBe(1);
    resolveTopOfStack(state);
    expect(alice.battlefield.some((c) => c.instanceId === commander.instanceId)).toBe(true);

    // Kill it - the commander replacement effect should send it to the command zone, not the graveyard.
    commander.damageMarked = 5; // lethal: toughness 5
    checkStateBasedActions(state);
    expect(alice.command.some((c) => c.instanceId === commander.instanceId)).toBe(true);
    expect(alice.graveyard.some((c) => c.instanceId === commander.instanceId)).toBe(false);

    // Second cast from the command zone costs {3}{R}{G}{G} + {2} tax = 8 mana. The old cost should fail now.
    alice.manaPool = { generic: 3, R: 1, G: 2 };
    expect(() => castSpell(state, alice.id, commander.instanceId, [], { fromCommandZone: true })).toThrow();

    alice.manaPool = { generic: 5, R: 1, G: 2 };
    castSpell(state, alice.id, commander.instanceId, [], { fromCommandZone: true });
    expect(alice.commanderCastCount[commander.instanceId]).toBe(2);
  });

  it("causes a loss at 21+ combat damage from a single commander, independent of life total", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    // Yargle and Multani is an 18/6 - the biggest power in the pool, so two
    // connections clear the 21-damage threshold while alice's life is still positive.
    const attacker = createCardInstance(state, "yargle-and-multani", bob.id, "battlefield", {
      isCommander: true,
    });
    attacker.summoningSickness = false;

    state.activePlayerIndex = 1; // bob
    state.phase = "combat";

    for (let swing = 0; swing < 2; swing++) {
      state.step = "declare-attackers";
      declareAttackers(state, bob.id, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: alice.id }]);
      state.step = "combat-damage";
      dealCombatDamage(state);
      checkStateBasedActions(state);
      attacker.tapped = false;
      state.attackers = {};
    }

    expect(alice.commanderDamageTaken[attacker.instanceId]).toBe(36);
    expect(alice.life).toBe(4); // 40 - 36, still positive
    expect(alice.hasLost).toBe(true);
    expect(alice.lossReason).toContain("commander");
  });
});
