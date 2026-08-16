import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import {
  hasAnyLegalAction,
  hasEligibleAttacker,
  hasEligibleBlocker,
  mustNotAutoPass,
  shouldAutoPass,
} from "../autoPass.js";
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

  it("hasEligibleBlocker asks whether a creature could block what is attacking", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const bear = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    // Nothing is attacking yet, so there is nothing to block.
    expect(hasEligibleBlocker(state, bob.id)).toBe(false);

    const attacker = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    state.attackers[attacker.instanceId] = bob.id;
    expect(hasEligibleBlocker(state, bob.id)).toBe(true); // summoning sickness doesn't stop blocking

    bear.tapped = true;
    expect(hasEligibleBlocker(state, bob.id)).toBe(false);
  });

  it("a lone flyer against a ground board leaves nobody eligible", () => {
    /*
     * The reported case. A defender with only ground creatures has no decision
     * to make against a flyer, so the game must not stop and ask them for one.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // no flying, no reach

    // Serra Angel flies.
    const flyer = createCardInstance(state, "serra-angel", alice.id, "battlefield");
    state.attackers[flyer.instanceId] = bob.id;
    expect(hasEligibleBlocker(state, bob.id)).toBe(false);

    // Give the defender something with reach and the decision comes back.
    createCardInstance(state, "giant-spider", bob.id, "battlefield");
    expect(hasEligibleBlocker(state, bob.id)).toBe(true);
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
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const attacker = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    state.attackers[attacker.instanceId] = bob.id;
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

/**
 * The stops a preference cannot switch off.
 *
 * The client lets you choose which steps to stop at. These are the ones where
 * passing would take a decision away from you rather than save you a click, so
 * they are reported separately and the client's own logic checks them first.
 */
describe("mustNotAutoPass", () => {
  it("holds the active player at declare-attackers while they have an attacker", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.summoningSickness = false;
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;

    expect(mustNotAutoPass(state, alice.id)).toBe(true);
  });

  it("lets them through when nothing of theirs could attack", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.summoningSickness = true; // just arrived, so it cannot attack
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;

    expect(mustNotAutoPass(state, alice.id)).toBe(false);
  });

  it("holds the defender at declare-blockers while they have a blocker", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    const vanguard = createCardInstance(state, "elite-vanguard", bob.id, "battlefield");
    vanguard.summoningSickness = false;
    // Something has to be attacking for a blocker to be eligible to block it.
    const attacker = createCardInstance(state, "grizzly-bears", state.players[0]!.id, "battlefield");
    state.attackers[attacker.instanceId] = bob.id;
    state.phase = "combat";
    state.step = "declare-blockers";
    state.activePlayerIndex = 0;

    expect(mustNotAutoPass(state, bob.id)).toBe(true);
  });

  it("holds everyone while an opening hand is still being decided", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.mulligan = {
      playerId: alice.id,
      order: state.players.map((p) => p.id),
      mulligansTaken: 0,
      bottoming: false,
    };

    expect(mustNotAutoPass(state, alice.id)).toBe(true);
    expect(mustNotAutoPass(state, state.players[1]!.id)).toBe(true);
  });

  it("is false in an ordinary main phase with nothing to do", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main";
    state.step = "main";

    expect(mustNotAutoPass(state, alice.id)).toBe(false);
    // Which is the whole point of the split: nothing forces a stop here, so a
    // preference is free to ask for one.
    expect(shouldAutoPass(state, alice.id)).toBe(true);
  });

  it("is the floor under shouldAutoPass - a forced stop is never auto-passed", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.summoningSickness = false;
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;

    expect(mustNotAutoPass(state, alice.id)).toBe(true);
    expect(shouldAutoPass(state, alice.id)).toBe(false);
  });
});
