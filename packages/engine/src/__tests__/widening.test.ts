import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, moveCard } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { declareAttackers } from "../combat.js";
import { effectivePower, effectiveToughness } from "../counters.js";

/** Puts the game in a main phase with the given player holding priority. */
function mainPhase(playerIndex = 0) {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = playerIndex;
  state.priorityPlayerIndex = playerIndex;
  return state;
}

describe("destroy and exile", () => {
  it("Murder destroys a creature outright, regardless of its toughness", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const murder = createCardInstance(state, "murder", alice.id, "hand");
    const wurm = createCardInstance(state, "craw-wurm", bob.id, "battlefield"); // 6/4
    alice.manaPool = { B: 2, generic: 1 };

    castSpell(state, alice.id, murder.instanceId, [{ kind: "card", instanceId: wurm.instanceId }]);
    resolveTopOfStack(state);

    expect(bob.battlefield.some((c) => c.instanceId === wurm.instanceId)).toBe(false);
    expect(bob.graveyard.some((c) => c.instanceId === wurm.instanceId)).toBe(true);
  });

  it("cannot be cast with no target at all", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const murder = createCardInstance(state, "murder", alice.id, "hand");
    alice.manaPool = { B: 2, generic: 1 };

    expect(() => castSpell(state, alice.id, murder.instanceId)).toThrow(/requires a target/i);
  });

  it("Indestructible survives a destroy effect", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const murder = createCardInstance(state, "murder", alice.id, "hand");
    const myr = createCardInstance(state, "darksteel-myr", bob.id, "battlefield");
    alice.manaPool = { B: 2, generic: 1 };

    castSpell(state, alice.id, murder.instanceId, [{ kind: "card", instanceId: myr.instanceId }]);
    resolveTopOfStack(state);

    expect(bob.battlefield.some((c) => c.instanceId === myr.instanceId)).toBe(true);
  });

  it("exile gets through Indestructible, since exile isn't destruction", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const reward = createCardInstance(state, "final-reward", alice.id, "hand");
    const myr = createCardInstance(state, "darksteel-myr", bob.id, "battlefield");
    alice.manaPool = { B: 1, generic: 4 };

    castSpell(state, alice.id, reward.instanceId, [{ kind: "card", instanceId: myr.instanceId }]);
    resolveTopOfStack(state);

    expect(bob.exile.some((c) => c.instanceId === myr.instanceId)).toBe(true);
  });

  it("a destroyed commander goes to the command zone, not the graveyard", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const murder = createCardInstance(state, "murder", alice.id, "hand");
    const tifa = createCardInstance(state, "tifa-lockhart", bob.id, "battlefield", { isCommander: true });
    alice.manaPool = { B: 2, generic: 1 };

    castSpell(state, alice.id, murder.instanceId, [{ kind: "card", instanceId: tifa.instanceId }]);
    resolveTopOfStack(state);

    expect(bob.command.some((c) => c.instanceId === tifa.instanceId)).toBe(true);
    expect(bob.graveyard.some((c) => c.instanceId === tifa.instanceId)).toBe(false);
  });
});

describe("anthems", () => {
  it("Glorious Anthem pumps every creature you control", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield"); // 2/2
    expect(effectivePower(state, bears)).toBe(2);

    createCardInstance(state, "glorious-anthem", alice.id, "battlefield");

    expect(effectivePower(state, bears)).toBe(3);
    expect(effectiveToughness(state, bears)).toBe(3);
  });

  it("does not pump the opponent's creatures", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "glorious-anthem", alice.id, "battlefield");
    const theirBears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");

    expect(effectivePower(state, theirBears)).toBe(2);
  });

  it("stacks with a second anthem and with +1/+1 counters", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.plusOneCounters = 1;
    createCardInstance(state, "glorious-anthem", alice.id, "battlefield");
    createCardInstance(state, "gaeas-anthem", alice.id, "battlefield");

    expect(effectivePower(state, bears)).toBe(5); // 2 printed + 1 counter + 1 + 1
  });

  it("wears off the moment the anthem leaves the battlefield", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const anthem = createCardInstance(state, "glorious-anthem", alice.id, "battlefield");
    expect(effectivePower(state, bears)).toBe(3);

    moveCard(state, anthem.instanceId, "graveyard");
    expect(effectivePower(state, bears)).toBe(2);
  });

  it("an anthem can save a creature from otherwise-lethal damage", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield"); // 2/2
    bears.damageMarked = 2; // exactly lethal
    createCardInstance(state, "glorious-anthem", alice.id, "battlefield"); // now a 3/3

    checkStateBasedActions(state);
    expect(alice.battlefield.some((c) => c.instanceId === bears.instanceId)).toBe(true);
  });
});

describe("tokens", () => {
  it("Raise the Alarm creates two 1/1 Soldiers", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const spell = createCardInstance(state, "raise-the-alarm", alice.id, "hand");
    alice.manaPool = { W: 1, generic: 1 };

    castSpell(state, alice.id, spell.instanceId);
    resolveTopOfStack(state);

    const soldiers = alice.battlefield.filter((c) => c.definitionId === "soldier-token");
    expect(soldiers).toHaveLength(2);
    expect(effectivePower(state, soldiers[0]!)).toBe(1);
  });

  it("tokens cease to exist when they leave the battlefield", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const spell = createCardInstance(state, "captains-call", alice.id, "hand");
    alice.manaPool = { W: 1, generic: 3 };
    castSpell(state, alice.id, spell.instanceId);
    resolveTopOfStack(state);

    const token = alice.battlefield.find((c) => c.definitionId === "soldier-token")!;
    token.damageMarked = 5;
    checkStateBasedActions(state);

    expect(alice.battlefield.some((c) => c.instanceId === token.instanceId)).toBe(false);
    // The real rule: it doesn't go to the graveyard, it stops existing.
    expect(alice.graveyard.some((c) => c.instanceId === token.instanceId)).toBe(false);
  });

  it("tokens are summoning sick like any other creature", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const spell = createCardInstance(state, "raise-the-alarm", alice.id, "hand");
    alice.manaPool = { W: 1, generic: 1 };
    castSpell(state, alice.id, spell.instanceId);
    resolveTopOfStack(state);

    const soldier = alice.battlefield.find((c) => c.definitionId === "soldier-token")!;
    expect(soldier.summoningSickness).toBe(true);
  });

  it("tokens get anthem bonuses like real creatures", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "glorious-anthem", alice.id, "battlefield");
    const spell = createCardInstance(state, "raise-the-alarm", alice.id, "hand");
    alice.manaPool = { W: 1, generic: 1 };
    castSpell(state, alice.id, spell.instanceId);
    resolveTopOfStack(state);

    const soldier = alice.battlefield.find((c) => c.definitionId === "soldier-token")!;
    expect(effectivePower(state, soldier)).toBe(2);
  });
});

describe("attacks and dies triggers", () => {
  it("an attack trigger goes on the stack when attackers are declared", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    // Give a plain creature an attack trigger for the duration of this test -
    // the pool has no printed attack-trigger card yet, and inventing one as a
    // fixture is exactly what we don't do (see ROADMAP.md).
    const definition = { ...state.cardDefinitions["grizzly-bears"]! };
    definition.triggeredAbilities = [{ event: "attacks", effect: { kind: "gainLife", amount: 3 } }];
    state.cardDefinitions["test-attack-trigger"] = { ...definition, id: "test-attack-trigger" };

    const attacker = createCardInstance(state, "test-attack-trigger", alice.id, "battlefield");
    attacker.summoningSickness = false;

    declareAttackers(state, alice.id, [
      { attackerInstanceId: attacker.instanceId, defendingPlayerId: bob.id },
    ]);

    expect(state.stack).toHaveLength(1);
    resolveTopOfStack(state);
    expect(alice.life).toBe(43);
  });

  it("a dies trigger fires when the creature is destroyed", () => {
    const state = mainPhase();
    const alice = state.players[0]!;

    const definition = { ...state.cardDefinitions["grizzly-bears"]! };
    definition.triggeredAbilities = [{ event: "dies", effect: { kind: "gainLife", amount: 2 } }];
    state.cardDefinitions["test-dies-trigger"] = { ...definition, id: "test-dies-trigger" };

    const creature = createCardInstance(state, "test-dies-trigger", alice.id, "battlefield");
    creature.damageMarked = 5;

    checkStateBasedActions(state);
    expect(state.stack).toHaveLength(1);

    resolveTopOfStack(state);
    expect(alice.life).toBe(42);
  });

  it("a dies trigger does not fire for a creature that never hit the battlefield", () => {
    const state = mainPhase();
    const alice = state.players[0]!;

    const definition = { ...state.cardDefinitions["grizzly-bears"]! };
    definition.triggeredAbilities = [{ event: "dies", effect: { kind: "gainLife", amount: 2 } }];
    state.cardDefinitions["test-dies-trigger"] = { ...definition, id: "test-dies-trigger" };

    const inHand = createCardInstance(state, "test-dies-trigger", alice.id, "hand");
    moveCard(state, inHand.instanceId, "graveyard"); // discarded, not died

    expect(state.stack).toHaveLength(0);
  });
});
