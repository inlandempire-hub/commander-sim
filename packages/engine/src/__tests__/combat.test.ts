import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { attackProblem, blockProblem, declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { checkStateBasedActions } from "../sba.js";
import { castSpell } from "../casting.js";
import { concede } from "../concede.js";
import { createDemoGame } from "../demoGame.js";

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

describe("asking before committing", () => {
  /**
   * The interface needs to know whether a choice is legal at the moment it is
   * clicked, not when the whole declaration is submitted. Before these existed
   * a player could select a tapped creature, press confirm, and watch nothing
   * happen with no explanation - and a ground creature could be pointed at a
   * flier and simply never block it.
   */
  function combatGame() {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    return state;
  }

  it("says why a creature cannot attack, in the same words the declaration would", () => {
    const state = combatGame();
    const alice = state.players[0]!;

    const wall = createCardInstance(state, "wall-of-wood", alice.id, "battlefield");
    wall.summoningSickness = false;
    expect(attackProblem(state, alice.id, wall.instanceId)).toMatch(/defender/i);

    const tapped = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    tapped.summoningSickness = false;
    tapped.tapped = true;
    expect(attackProblem(state, alice.id, tapped.instanceId)).toMatch(/tapped/i);

    const fresh = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    expect(attackProblem(state, alice.id, fresh.instanceId)).toMatch(/came into play this turn/i);
  });

  it("says nothing at all about a creature that can attack", () => {
    const state = combatGame();
    const alice = state.players[0]!;
    const bear = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bear.summoningSickness = false;

    expect(attackProblem(state, alice.id, bear.instanceId)).toBeNull();
  });

  it("agrees with declareAttackers - a problem here is a throw there", () => {
    const state = combatGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const wall = createCardInstance(state, "wall-of-wood", alice.id, "battlefield");
    wall.summoningSickness = false;

    const problem = attackProblem(state, alice.id, wall.instanceId);
    expect(problem).not.toBeNull();
    expect(() =>
      declareAttackers(state, alice.id, [
        { attackerInstanceId: wall.instanceId, defendingPlayerId: bob.id },
      ]),
    ).toThrow(problem!);
  });

  it("explains that a ground creature cannot block a flier", () => {
    const state = combatGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const flier = createCardInstance(state, "suntail-hawk", alice.id, "battlefield");
    flier.summoningSickness = false;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: flier.instanceId, defendingPlayerId: bob.id },
    ]);
    state.step = "declare-blockers";

    const ground = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const problem = blockProblem(state, bob.id, ground.instanceId, flier.instanceId);

    expect(problem).toMatch(/flying/i);
    expect(() =>
      declareBlockers(state, bob.id, [
        { blockerInstanceId: ground.instanceId, attackerInstanceId: flier.instanceId },
      ]),
    ).toThrow();
  });

  it("lets reach block a flier", () => {
    const state = combatGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const flier = createCardInstance(state, "suntail-hawk", alice.id, "battlefield");
    flier.summoningSickness = false;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: flier.instanceId, defendingPlayerId: bob.id },
    ]);
    state.step = "declare-blockers";

    const spider = createCardInstance(state, "giant-spider", bob.id, "battlefield");

    expect(blockProblem(state, bob.id, spider.instanceId, flier.instanceId)).toBeNull();
  });

  it("rejects a tapped blocker and one pointed at a creature that is not attacking", () => {
    const state = combatGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const attacker = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    attacker.summoningSickness = false;
    const bystander = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    declareAttackers(state, alice.id, [
      { attackerInstanceId: attacker.instanceId, defendingPlayerId: bob.id },
    ]);
    state.step = "declare-blockers";

    const tapped = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    tapped.tapped = true;
    expect(blockProblem(state, bob.id, tapped.instanceId, attacker.instanceId)).toMatch(/tapped/i);

    const willing = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    expect(blockProblem(state, bob.id, willing.instanceId, bystander.instanceId)).toMatch(/not attacking/i);
  });

  it("does not object to a lone blocker on a menace attacker - that is the declaration's business", () => {
    // Menace restricts the whole declaration ("not by only one creature"), so
    // a first blocker is legal right up until the declaration ends with only
    // that one. Rejecting the click would make a legal double-block unbuildable.
    const state = combatGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    // Boggart Brute genuinely has Menace; Ogre Warrior, used here first, is
    // vanilla - which would have made this test pass while proving nothing.
    const menacing = createCardInstance(state, "boggart-brute", alice.id, "battlefield");
    menacing.summoningSickness = false;
    declareAttackers(state, alice.id, [
      { attackerInstanceId: menacing.instanceId, defendingPlayerId: bob.id },
    ]);
    state.step = "declare-blockers";

    const blocker = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");

    expect(blockProblem(state, bob.id, blocker.instanceId, menacing.instanceId)).toBeNull();
  });
});

describe("conceding", () => {
  it("ends the game for that player immediately, with a reason", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;

    concede(state, alice.id);

    expect(alice.hasLost).toBe(true);
    expect(alice.lossReason).toBe("conceded");
    expect(state.log.some((entry) => entry.text.includes("concedes"))).toBe(true);
  });

  it("needs no priority and no particular step - it is legal at any time", () => {
    const state = makeTestGame();
    const bob = state.players[1]!;
    state.phase = "combat";
    state.step = "declare-blockers";
    state.priorityPlayerIndex = 0;

    expect(() => concede(state, bob.id)).not.toThrow();
    expect(bob.hasLost).toBe(true);
  });

  it("clears anything the game was waiting on that player for", () => {
    // A conceding player still owing a mulligan decision or a library search
    // would otherwise leave the finished game unable to move.
    const state = createDemoGame({ mulligan: true });
    const first = state.mulligan!.playerId;

    concede(state, first);

    expect(state.mulligan).toBeNull();
  });

  it("does nothing the second time", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    concede(state, alice.id);
    const linesAfterFirst = state.log.length;

    concede(state, alice.id);

    expect(state.log).toHaveLength(linesAfterFirst);
  });
});
