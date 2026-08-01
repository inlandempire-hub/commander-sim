import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, moveCard } from "../state.js";
import { castSpell } from "../casting.js";
import { activateAbility } from "../abilities.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { advanceStep } from "../turn.js";
import { effectivePower, effectiveToughness } from "../counters.js";
import { hasAnyLegalAction } from "../autoPass.js";
import { pushOntoStack } from "../permanents.js";

/** Puts the game in a main phase with the given player holding priority. */
function mainPhase(playerIndex = 0) {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = playerIndex;
  state.priorityPlayerIndex = playerIndex;
  return state;
}

describe("until-end-of-turn pumps", () => {
  it("Giant Growth turns a 2/2 into a 5/5", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const growth = createCardInstance(state, "giant-growth", alice.id, "hand");
    alice.manaPool = { G: 1 };

    castSpell(state, alice.id, growth.instanceId, [{ kind: "card", instanceId: bears.instanceId }]);
    resolveTopOfStack(state);

    expect(effectivePower(state, bears)).toBe(5);
    expect(effectiveToughness(state, bears)).toBe(5);
  });

  it("the bonus wears off in the cleanup step", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.temporaryPowerBonus = 3;
    bears.temporaryToughnessBonus = 3;

    // Walk the turn round to the next one; cleanup runs on the way past.
    const startingTurn = state.turnNumber;
    for (let i = 0; i < 40 && state.turnNumber === startingTurn; i++) advanceStep(state);

    expect(bears.temporaryPowerBonus).toBe(0);
    expect(bears.temporaryToughnessBonus).toBe(0);
    expect(effectivePower(state, bears)).toBe(2);
  });

  it("Last Gasp kills a creature by reducing its toughness to zero", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // 2/2
    const gasp = createCardInstance(state, "last-gasp", alice.id, "hand"); // -3/-3
    alice.manaPool = { B: 1, generic: 1 };

    castSpell(state, alice.id, gasp.instanceId, [{ kind: "card", instanceId: bears.instanceId }]);
    resolveTopOfStack(state);
    checkStateBasedActions(state);

    expect(bob.battlefield.some((c) => c.instanceId === bears.instanceId)).toBe(false);
    expect(bob.graveyard.some((c) => c.instanceId === bears.instanceId)).toBe(true);
  });

  it("kills an Indestructible creature, because zero toughness is not destruction", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const myr = createCardInstance(state, "darksteel-myr", bob.id, "battlefield"); // 0/1 Indestructible
    const gasp = createCardInstance(state, "last-gasp", alice.id, "hand");
    alice.manaPool = { B: 1, generic: 1 };

    castSpell(state, alice.id, gasp.instanceId, [{ kind: "card", instanceId: myr.instanceId }]);
    resolveTopOfStack(state);
    checkStateBasedActions(state);

    expect(bob.battlefield.some((c) => c.instanceId === myr.instanceId)).toBe(false);
  });

  it("an activated pump with no target applies to its own source", () => {
    const state = mainPhase();
    const alice = state.players[0]!;

    // A definition carrying the generator's activated-pump shape.
    const base = state.cardDefinitions["grizzly-bears"]!;
    state.cardDefinitions["test-self-pump"] = {
      ...base,
      id: "test-self-pump",
      activatedAbilities: [{ cost: { mana: { generic: 1, colors: {} } }, effect: { kind: "pump", power: 2, toughness: 2 } }],
    };
    const creature = createCardInstance(state, "test-self-pump", alice.id, "battlefield");
    creature.summoningSickness = false;
    alice.manaPool = { generic: 1 };

    activateAbility(state, alice.id, creature.instanceId, 0);
    resolveTopOfStack(state);

    expect(effectivePower(state, creature)).toBe(4);
  });

  it("does not follow a creature between zones", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.temporaryToughnessBonus = -1;

    moveCard(state, bears.instanceId, "hand");
    expect(bears.temporaryToughnessBonus).toBe(0);
  });
});

describe("mass pumps", () => {
  it("Inspired Charge pumps only the caster's creatures", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const mine = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const theirs = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const charge = createCardInstance(state, "inspired-charge", alice.id, "hand"); // {2}{W}{W}, +2/+1
    alice.manaPool = { W: 2, generic: 2 };

    castSpell(state, alice.id, charge.instanceId);
    resolveTopOfStack(state);

    expect(effectivePower(state, mine)).toBe(4);
    expect(effectivePower(state, theirs)).toBe(2);
  });

  it("Infest is a sweeper that hits both sides", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const smallOfMine = createCardInstance(state, "grizzly-bears", alice.id, "battlefield"); // 2/2
    const bigOfTheirs = createCardInstance(state, "craw-wurm", bob.id, "battlefield"); // 6/4
    const smallOfTheirs = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const infest = createCardInstance(state, "infest", alice.id, "hand"); // {1}{B}{B}, all creatures -2/-2
    alice.manaPool = { B: 2, generic: 1 };

    castSpell(state, alice.id, infest.instanceId);
    resolveTopOfStack(state);
    checkStateBasedActions(state);

    expect(alice.battlefield.some((c) => c.instanceId === smallOfMine.instanceId)).toBe(false);
    expect(bob.battlefield.some((c) => c.instanceId === smallOfTheirs.instanceId)).toBe(false);
    // The 6/4 survives as a 4/2.
    expect(bob.battlefield.some((c) => c.instanceId === bigOfTheirs.instanceId)).toBe(true);
    expect(effectiveToughness(state, bigOfTheirs)).toBe(2);
  });
});

describe("counterspells", () => {
  /** Alice casts a creature and passes; the game is left with Bob holding priority. */
  function withSpellOnStack() {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const wurm = createCardInstance(state, "craw-wurm", alice.id, "hand"); // {4}{G}{G}
    alice.manaPool = { G: 2, generic: 4 };
    castSpell(state, alice.id, wurm.instanceId);
    state.priorityPlayerIndex = 1;
    return { state, alice, bob, wurm };
  }

  it("Counterspell removes the spell and puts its card in the graveyard", () => {
    const { state, alice, bob, wurm } = withSpellOnStack();
    const counter = createCardInstance(state, "counterspell", bob.id, "hand");
    bob.manaPool = { U: 2 };

    castSpell(state, bob.id, counter.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]);
    resolveTopOfStack(state); // the Counterspell itself

    expect(state.stack).toHaveLength(0);
    expect(alice.graveyard.some((c) => c.instanceId === wurm.instanceId)).toBe(true);
    expect(alice.battlefield.some((c) => c.instanceId === wurm.instanceId)).toBe(false);
  });

  it("Mana Leak is paid for and the spell survives", () => {
    const { state, alice, bob, wurm } = withSpellOnStack();
    const leak = createCardInstance(state, "mana-leak", bob.id, "hand");
    bob.manaPool = { U: 1, generic: 1 };
    alice.manaPool = { generic: 3 }; // enough floating to pay the {3}

    castSpell(state, bob.id, leak.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]);
    resolveTopOfStack(state);

    expect(state.stack).toHaveLength(1);
    resolveTopOfStack(state);
    expect(alice.battlefield.some((c) => c.instanceId === wurm.instanceId)).toBe(true);
  });

  it("Mana Leak counters the spell when its controller cannot pay", () => {
    const { state, alice, bob, wurm } = withSpellOnStack();
    const leak = createCardInstance(state, "mana-leak", bob.id, "hand");
    bob.manaPool = { U: 1, generic: 1 };
    alice.manaPool = {}; // tapped out

    castSpell(state, bob.id, leak.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]);
    resolveTopOfStack(state);

    expect(state.stack).toHaveLength(0);
    expect(alice.graveyard.some((c) => c.instanceId === wurm.instanceId)).toBe(true);
  });

  it("a countered commander goes to the command zone, not the graveyard", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const tifa = createCardInstance(state, "tifa-lockhart", alice.id, "hand", { isCommander: true });
    alice.manaPool = { G: 1, generic: 1 };
    castSpell(state, alice.id, tifa.instanceId);
    state.priorityPlayerIndex = 1;

    const counter = createCardInstance(state, "counterspell", bob.id, "hand");
    bob.manaPool = { U: 2 };
    castSpell(state, bob.id, counter.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]);
    resolveTopOfStack(state);

    expect(alice.command.some((c) => c.instanceId === tifa.instanceId)).toBe(true);
    expect(alice.graveyard.some((c) => c.instanceId === tifa.instanceId)).toBe(false);
  });

  it("cannot target a triggered ability - only spells can be countered", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    // An ability on the stack has its source on the battlefield, not the stack.
    const source = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    pushOntoStack(state, source.instanceId, alice.id, { kind: "gainLife", amount: 3 }, [], false);
    state.priorityPlayerIndex = 1;

    const counter = createCardInstance(state, "counterspell", bob.id, "hand");
    bob.manaPool = { U: 2 };

    expect(() =>
      castSpell(state, bob.id, counter.instanceId, [{ kind: "spell", stackObjectId: state.stack[0]!.id }]),
    ).toThrow(/illegal target/i);
  });

  it("an illegal target leaves the mana unspent and the card in hand", () => {
    const state = mainPhase();
    const bob = state.players[1]!;
    state.priorityPlayerIndex = 1;
    const counter = createCardInstance(state, "counterspell", bob.id, "hand");
    bob.manaPool = { U: 2 };

    expect(() =>
      castSpell(state, bob.id, counter.instanceId, [{ kind: "spell", stackObjectId: "does-not-exist" }]),
    ).toThrow();

    // The whole point of validating before paying: a rejected cast changes nothing.
    expect(counter.zone).toBe("hand");
    expect(bob.manaPool.U).toBe(2);
  });
});

describe("auto-pass with targeted cards", () => {
  it("a counterspell in hand is not a legal action while the stack is empty", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "island", alice.id, "battlefield");
    createCardInstance(state, "island", alice.id, "battlefield");
    createCardInstance(state, "counterspell", alice.id, "hand");

    expect(hasAnyLegalAction(state, alice.id)).toBe(false);
  });

  it("but it is once there is a spell to counter", () => {
    const state = mainPhase(1); // Bob's turn, so his creature is castable
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "island", alice.id, "battlefield");
    createCardInstance(state, "island", alice.id, "battlefield");
    createCardInstance(state, "counterspell", alice.id, "hand");

    const wurm = createCardInstance(state, "craw-wurm", bob.id, "hand");
    bob.manaPool = { G: 2, generic: 4 };
    castSpell(state, bob.id, wurm.instanceId);

    expect(hasAnyLegalAction(state, alice.id)).toBe(true);
  });
});
