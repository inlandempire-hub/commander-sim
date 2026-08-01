import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { advanceStep } from "../turn.js";
import { combatHasFirstStrike, dealCombatDamage } from "../combat.js";
import type { GameState } from "../types.js";

function mainPhase(playerIndex = 0) {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = playerIndex;
  state.priorityPlayerIndex = playerIndex;
  return state;
}

/** Alice attacks Bob with `attackerId`, blocked by `blockerId`, ready for damage. */
function combat(attackerId: string, blockerId?: string) {
  const state = makeTestGame();
  state.phase = "combat";
  state.step = "declare-blockers";
  const alice = state.players[0]!;
  const bob = state.players[1]!;

  const attacker = createCardInstance(state, attackerId, alice.id, "battlefield");
  attacker.summoningSickness = false;
  state.attackers[attacker.instanceId] = bob.id;

  let blocker;
  if (blockerId) {
    blocker = createCardInstance(state, blockerId, bob.id, "battlefield");
    blocker.summoningSickness = false;
    state.blockers[blocker.instanceId] = attacker.instanceId;
  }
  return { state, alice, bob, attacker, blocker };
}

/** Runs the two damage sub-steps the way priority.ts does, SBAs in between. */
function runCombatDamage(state: GameState) {
  advanceStep(state); // into first-strike-damage (or straight past it)
  checkStateBasedActions(state);
  if (state.step === "first-strike-damage") {
    advanceStep(state); // into combat-damage
    checkStateBasedActions(state);
  }
}

describe("first strike", () => {
  it("kills the blocker before it can deal any damage back", () => {
    // Elvish Archers is a 2/1 first striker; Grizzly Bears is a 2/2.
    const { state, alice, bob, attacker, blocker } = combat("elvish-archers", "grizzly-bears");
    runCombatDamage(state);

    expect(bob.battlefield.some((c) => c.instanceId === blocker!.instanceId)).toBe(false);
    // 2 damage would have killed the 2/1 Archers - but the Bears never struck.
    expect(alice.battlefield.some((c) => c.instanceId === attacker.instanceId)).toBe(true);
    expect(attacker.damageMarked).toBe(0);
  });

  it("still trades when the blocker also has first strike", () => {
    const { state, alice, bob, attacker, blocker } = combat("elvish-archers", "sabretooth-tiger"); // both 2/1 FS
    runCombatDamage(state);

    expect(alice.battlefield.some((c) => c.instanceId === attacker.instanceId)).toBe(false);
    expect(bob.battlefield.some((c) => c.instanceId === blocker!.instanceId)).toBe(false);
  });

  it("does not save a first striker that fails to kill its blocker", () => {
    // 2/1 first striker into a 6/4: it strikes first, does not kill, and dies.
    const { state, alice, attacker } = combat("elvish-archers", "craw-wurm");
    runCombatDamage(state);

    expect(alice.battlefield.some((c) => c.instanceId === attacker.instanceId)).toBe(false);
  });

  it("the sub-step is skipped entirely when nothing in combat has it", () => {
    const { state } = combat("grizzly-bears", "grizzly-bears");
    expect(combatHasFirstStrike(state)).toBe(false);

    advanceStep(state);
    // Straight past first-strike-damage and into the regular damage step.
    expect(state.step).toBe("combat-damage");
  });

  it("the sub-step happens when a blocker has it, not just an attacker", () => {
    const { state } = combat("grizzly-bears", "elvish-archers");
    expect(combatHasFirstStrike(state)).toBe(true);

    advanceStep(state);
    expect(state.step).toBe("first-strike-damage");
  });
});

describe("double strike", () => {
  it("deals damage in both sub-steps", () => {
    // Fencing Ace is a 1/1 double striker: two separate points of damage.
    const { state, bob } = combat("fencing-ace");
    runCombatDamage(state);

    expect(bob.life).toBe(38);
  });

  it("a single-strike creature deals its damage only once", () => {
    const { state, bob } = combat("grizzly-bears"); // 2/2, no strike keywords
    runCombatDamage(state);

    expect(bob.life).toBe(38);
  });
});

describe("blocked attackers whose blockers die", () => {
  it("deal nothing to the player, because they are still blocked", () => {
    // Fencing Ace (1/1 double strike) kills a 0/1 blocker with its first hit.
    const { state, bob } = combat("fencing-ace", "darksteel-myr");
    // Darksteel Myr is Indestructible, so use something that actually dies.
    state.blockers = {};
    const realBlocker = createCardInstance(state, "kraken-hatchling", bob.id, "battlefield"); // 0/4
    const attackerId = Object.keys(state.attackers)[0]!;
    state.blockers[realBlocker.instanceId] = attackerId;

    runCombatDamage(state);

    // The 1/1 double striker deals 1 + 1 into a 0/4 and never reaches Bob.
    expect(bob.life).toBe(40);
  });

  it("unless they have trample, in which case the excess gets through", () => {
    const { state, bob } = combat("quaketusk-boar", "grizzly-bears"); // 5/5 Trample vs 2/2
    runCombatDamage(state);

    // 2 to kill the Bears, 3 tramples over.
    expect(bob.life).toBe(37);
  });
});

describe("graveyard recursion", () => {
  it("Raise Dead returns a creature card to hand", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const dead = createCardInstance(state, "craw-wurm", alice.id, "graveyard");
    const raise = createCardInstance(state, "raise-dead", alice.id, "hand");
    alice.manaPool = { B: 1 };

    castSpell(state, alice.id, raise.instanceId, [{ kind: "card", instanceId: dead.instanceId }]);
    resolveTopOfStack(state);

    expect(alice.hand.some((c) => c.instanceId === dead.instanceId)).toBe(true);
    expect(alice.graveyard.some((c) => c.instanceId === dead.instanceId)).toBe(false);
  });

  it("Zombify puts it straight onto the battlefield", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const dead = createCardInstance(state, "craw-wurm", alice.id, "graveyard");
    const zombify = createCardInstance(state, "zombify", alice.id, "hand");
    alice.manaPool = { B: 1, generic: 3 };

    castSpell(state, alice.id, zombify.instanceId, [{ kind: "card", instanceId: dead.instanceId }]);
    resolveTopOfStack(state);

    expect(alice.battlefield.some((c) => c.instanceId === dead.instanceId)).toBe(true);
    expect(dead.summoningSickness).toBe(true);
  });

  it("reanimation fires enters-the-battlefield triggers", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    // Elvish Visionary draws a card when it enters.
    const dead = createCardInstance(state, "elvish-visionary", alice.id, "graveyard");
    createCardInstance(state, "forest", alice.id, "library");
    const zombify = createCardInstance(state, "zombify", alice.id, "hand");
    alice.manaPool = { B: 1, generic: 3 };

    castSpell(state, alice.id, zombify.instanceId, [{ kind: "card", instanceId: dead.instanceId }]);
    resolveTopOfStack(state);

    expect(state.stack).toHaveLength(1); // the ETB draw trigger
    resolveTopOfStack(state);
    expect(alice.hand).toHaveLength(1);
  });

  it("cannot reach into an opponent's graveyard", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const theirs = createCardInstance(state, "craw-wurm", bob.id, "graveyard");
    const raise = createCardInstance(state, "raise-dead", alice.id, "hand");
    alice.manaPool = { B: 1 };

    expect(() =>
      castSpell(state, alice.id, raise.instanceId, [{ kind: "card", instanceId: theirs.instanceId }]),
    ).toThrow(/illegal target/i);
  });

  it("cannot return a non-creature with a creature-only spell", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const spell = createCardInstance(state, "lightning-bolt", alice.id, "graveyard");
    const raise = createCardInstance(state, "raise-dead", alice.id, "hand");
    alice.manaPool = { B: 1 };

    expect(() =>
      castSpell(state, alice.id, raise.instanceId, [{ kind: "card", instanceId: spell.instanceId }]),
    ).toThrow(/illegal target/i);
  });
});

describe("tutors", () => {
  it("Lay of the Land finds a basic land and puts it in hand", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "grizzly-bears", alice.id, "library");
    const forest = createCardInstance(state, "forest", alice.id, "library");
    const tutor = createCardInstance(state, "lay-of-the-land", alice.id, "hand");
    alice.manaPool = { G: 1 };

    castSpell(state, alice.id, tutor.instanceId);
    resolveTopOfStack(state);

    expect(alice.hand.some((c) => c.instanceId === forest.instanceId)).toBe(true);
    expect(alice.library).toHaveLength(1); // the Bears is still in there
  });

  it("Natural Connection puts the land onto the battlefield tapped", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const forest = createCardInstance(state, "forest", alice.id, "library");
    const tutor = createCardInstance(state, "natural-connection", alice.id, "hand");
    alice.manaPool = { G: 1, generic: 2 };

    castSpell(state, alice.id, tutor.instanceId);
    resolveTopOfStack(state);

    expect(alice.battlefield.some((c) => c.instanceId === forest.instanceId)).toBe(true);
    expect(forest.tapped).toBe(true);
  });

  it("an unrestricted tutor takes the most expensive card available", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "grizzly-bears", alice.id, "library"); // {1}{G}
    const wurm = createCardInstance(state, "craw-wurm", alice.id, "library"); // {4}{G}{G}
    const tutor = createCardInstance(state, "demonic-tutor", alice.id, "hand");
    alice.manaPool = { B: 1, generic: 1 };

    castSpell(state, alice.id, tutor.instanceId);
    resolveTopOfStack(state);

    expect(alice.hand.some((c) => c.instanceId === wurm.instanceId)).toBe(true);
  });

  it("resolves harmlessly when the library holds no match", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "grizzly-bears", alice.id, "library"); // no lands at all
    const tutor = createCardInstance(state, "lay-of-the-land", alice.id, "hand");
    alice.manaPool = { G: 1 };

    castSpell(state, alice.id, tutor.instanceId);
    expect(() => resolveTopOfStack(state)).not.toThrow();
    expect(alice.library).toHaveLength(1);
    expect(alice.graveyard.some((c) => c.instanceId === tutor.instanceId)).toBe(true);
  });
});

describe("damage sub-step gating", () => {
  it("only first strikers deal damage in the first sub-step", () => {
    const { state, bob } = combat("elvish-archers"); // 2/1 first strike, unblocked
    dealCombatDamage(state, "first-strike");
    expect(bob.life).toBe(38);

    // And nothing more in the regular step - it has First Strike, not Double.
    dealCombatDamage(state, "regular");
    expect(bob.life).toBe(38);
  });

  it("ordinary creatures deal nothing in the first sub-step", () => {
    const { state, bob } = combat("grizzly-bears");
    dealCombatDamage(state, "first-strike");
    expect(bob.life).toBe(40);
  });
});
