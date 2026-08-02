import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { hasAnyLegalAction, hasEligibleAttacker, hasEligibleBlocker, shouldAutoPass } from "../autoPass.js";
import { declareBlockers } from "../combat.js";

describe("hasAnyLegalAction", () => {
  it("is false with an empty hand and no battlefield presence", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    expect(hasAnyLegalAction(state, alice.id)).toBe(false);
  });

  it("is true when an instant in hand is affordable from untapped lands, even with an empty pool", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "lightning-bolt", alice.id, "hand");
    const mountain = createCardInstance(state, "mountain", alice.id, "battlefield");
    mountain.summoningSickness = false;

    expect(hasAnyLegalAction(state, alice.id)).toBe(true);
  });

  it("is false when the only affordable-looking land is already tapped", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "lightning-bolt", alice.id, "hand");
    const mountain = createCardInstance(state, "mountain", alice.id, "battlefield");
    mountain.tapped = true;

    expect(hasAnyLegalAction(state, alice.id)).toBe(false);
  });

  it("counts a sorcery-speed card (e.g. a creature) only during the player's own main phase", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "grizzly-bears", alice.id, "hand"); // costs {1}{G} - needs 2 mana
    for (let i = 0; i < 2; i++) {
      const forest = createCardInstance(state, "forest", alice.id, "battlefield");
      forest.summoningSickness = false;
    }

    // Not alice's main phase (default state: beginning/untap, active player is alice, but wrong step).
    state.phase = "combat";
    state.step = "begin-combat";
    expect(hasAnyLegalAction(state, alice.id)).toBe(false);

    state.phase = "precombat-main";
    state.step = "main";
    expect(hasAnyLegalAction(state, alice.id)).toBe(true);
  });

  it("counts an unplayed land only during the player's own main phase, and not once one's played", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "mountain", alice.id, "hand");
    state.phase = "precombat-main";
    state.step = "main";

    expect(hasAnyLegalAction(state, alice.id)).toBe(true);

    alice.landsPlayedThisTurn = 1;
    expect(hasAnyLegalAction(state, alice.id)).toBe(false);
  });

  it("ignores a mana ability alone as not a meaningful action", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const forest = createCardInstance(state, "forest", alice.id, "battlefield");
    forest.summoningSickness = false;

    expect(hasAnyLegalAction(state, alice.id)).toBe(false);
  });
});

describe("hasEligibleAttacker / hasEligibleBlocker", () => {
  it("hasEligibleAttacker is false for a tapped, summoning-sick, or defending-only creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    expect(hasEligibleAttacker(state, alice.id)).toBe(false);

    const wall = createCardInstance(state, "wall-of-wood", alice.id, "battlefield");
    wall.summoningSickness = false;
    expect(hasEligibleAttacker(state, alice.id)).toBe(false); // Defender

    const bear = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    expect(hasEligibleAttacker(state, alice.id)).toBe(false); // summoning sick
    bear.summoningSickness = false;
    expect(hasEligibleAttacker(state, alice.id)).toBe(true);
  });

  it("hasEligibleBlocker is true for any untapped creature", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    expect(hasEligibleBlocker(state, bob.id)).toBe(false);

    const bear = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    expect(hasEligibleBlocker(state, bob.id)).toBe(true); // summoning sickness doesn't stop blocking

    bear.tapped = true;
    expect(hasEligibleBlocker(state, bob.id)).toBe(false);
  });
});

describe("shouldAutoPass", () => {
  it("auto-passes an empty main phase", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main";
    state.step = "main";
    expect(shouldAutoPass(state, alice.id)).toBe(true);
  });

  it("does not auto-pass when the active player has an eligible attacker in declare-attackers", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bear = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bear.summoningSickness = false;
    state.phase = "combat";
    state.step = "declare-attackers";

    expect(shouldAutoPass(state, alice.id)).toBe(false);
  });

  it("does not auto-pass when the defending player has an eligible blocker in declare-blockers", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    state.phase = "combat";
    state.step = "declare-blockers";

    expect(shouldAutoPass(state, bob.id)).toBe(false);
  });

  it("auto-passes declare-blockers for a defender with no eligible blocker and no instant", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    state.phase = "combat";
    state.step = "declare-blockers";

    expect(shouldAutoPass(state, bob.id)).toBe(true);
  });
});

/**
 * Regression: the attacker's combat-trick window.
 *
 * Declaring blockers is a turn-based action at the start of the step (rule
 * 509.1), but this engine advances into the step and gives the attacker
 * priority immediately. Auto-passing there spent their only chance to respond
 * to blocks they hadn't seen yet - so a combat trick was impossible against
 * the bot, which is the only mode where auto-pass gets there first.
 */
describe("declare-blockers is not auto-passed before blocks exist", () => {
  function combatWithAnUndecidedBlocker() {
    const state = makeTestGame();
    const alice = state.players[0]!; // attacker, active player
    const bob = state.players[1]!; // defender

    const attacker = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    attacker.summoningSickness = false;
    const blocker = createCardInstance(state, "elite-vanguard", bob.id, "battlefield");
    blocker.summoningSickness = false;

    state.phase = "combat";
    state.step = "declare-blockers";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    state.attackers[attacker.instanceId] = bob.id;
    return { state, alice, bob, attacker, blocker };
  }

  it("holds the attacker's priority until the defender has declared", () => {
    const { state, alice } = combatWithAnUndecidedBlocker();
    expect(state.blockersDeclared).toBe(false);
    expect(shouldAutoPass(state, alice.id)).toBe(false);
  });

  it("releases it once blocks are declared", () => {
    const { state, alice, bob, attacker, blocker } = combatWithAnUndecidedBlocker();
    declareBlockers(state, bob.id, [
      { blockerInstanceId: blocker.instanceId, attackerInstanceId: attacker.instanceId },
    ]);
    expect(state.blockersDeclared).toBe(true);
    // Alice has an empty hand and no mana, so now there is genuinely nothing to do.
    expect(shouldAutoPass(state, alice.id)).toBe(true);
  });

  it("counts declaring nothing as having declared", () => {
    const { state, alice, bob } = combatWithAnUndecidedBlocker();
    declareBlockers(state, bob.id, []);
    expect(state.blockersDeclared).toBe(true);
    expect(shouldAutoPass(state, alice.id)).toBe(true);
  });

  it("does not hold when the defender has nothing that could block", () => {
    const { state, alice, blocker } = combatWithAnUndecidedBlocker();
    blocker.tapped = true; // a tapped creature can't block, so there's no decision to wait for
    expect(shouldAutoPass(state, alice.id)).toBe(true);
  });
});
