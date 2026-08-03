import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { passPriority } from "../priority.js";
import { advanceStep } from "../turn.js";
import { createDemoGame } from "../demoGame.js";

describe("turn structure", () => {
  it("advances through a full attacker-less turn to the next turn's upkeep in 8 pass-pairs", () => {
    // Real rules: untap and cleanup never give priority, and with zero attackers
    // declared, declare-blockers/combat-damage don't happen at all - so a turn with
    // no attacks needs priority passed only at upkeep, draw, both mains, begin-combat,
    // end-combat, and end (8 steps), not all 12 steps in the sequence.
    const state = makeTestGame();
    for (const player of state.players) {
      createCardInstance(state, "mountain", player.id, "library");
    }
    for (let i = 0; i < 9; i++) {
      passPriority(state, state.players[state.priorityPlayerIndex]!.id);
      passPriority(state, state.players[state.priorityPlayerIndex]!.id);
    }
    expect(state.turnNumber).toBe(2);
    expect(state.phase).toBe("beginning");
    expect(state.step).toBe("upkeep");
  });

  it("never stops at untap or cleanup - they're always passed through automatically", () => {
    const state = makeTestGame();
    for (const player of state.players) {
      createCardInstance(state, "mountain", player.id, "library");
    }
    for (let i = 0; i < 9; i++) {
      passPriority(state, state.players[state.priorityPlayerIndex]!.id);
      passPriority(state, state.players[state.priorityPlayerIndex]!.id);
      const step = state.step;
      expect(step).not.toBe("untap");
      expect(step).not.toBe("cleanup");
    }
  });

  it("skips declare-blockers and combat-damage when no attackers are declared", () => {
    const state = makeTestGame();
    state.phase = "combat";
    state.step = "declare-attackers";
    state.priorityPlayerIndex = 0;

    // Both players pass without ever declaring an attacker.
    passPriority(state, state.players[0]!.id);
    passPriority(state, state.players[1]!.id);

    expect(state.step).toBe("end-combat");
  });

  it("draws a card for the active player entering the draw step", () => {
    const state = makeTestGame();
    const active = state.players[0]!;
    createCardInstance(state, "mountain", active.id, "library");
    // Any turn but the first: rule 103.7a has the player going first skip
    // their opening draw, which is covered by its own test below.
    state.turnNumber = 2;

    // untap -> upkeep (1 pair), upkeep -> draw (1 pair)
    passPriority(state, state.players[state.priorityPlayerIndex]!.id);
    passPriority(state, state.players[state.priorityPlayerIndex]!.id);
    passPriority(state, state.players[state.priorityPlayerIndex]!.id);
    passPriority(state, state.players[state.priorityPlayerIndex]!.id);

    expect(state.step).toBe("draw");
    expect(active.hand.some((c) => c.definitionId === "mountain")).toBe(true);
    expect(active.library.length).toBe(0);
  });

  it("rejects passing priority from a player who doesn't have it", () => {
    const state = makeTestGame();
    const nonPriorityPlayer = state.players[1]!.id;
    expect(() => passPriority(state, nonPriorityPlayer)).toThrow();
  });
});

describe("the opening turn", () => {
  it("the player going first does not draw on turn one", () => {
    // Rule 103.7a. Without this, a player who mulligans to six finds seven
    // cards in hand and reasonably concludes the mulligan is broken.
    const state = createDemoGame();
    const donny = state.players[0]!;
    const startingHand = donny.hand.length;
    const startingLibrary = donny.library.length;

    while (!(state.phase === "precombat-main" && state.step === "main")) advanceStep(state);

    expect(donny.hand).toHaveLength(startingHand);
    expect(donny.library).toHaveLength(startingLibrary);
  });

  it("but everyone draws on every turn after that", () => {
    const state = createDemoGame();
    const mike = state.players[1]!;
    const before = mike.hand.length;

    // Round the turn over to Mike's first turn.
    while (state.turnNumber === 1) advanceStep(state);
    while (!(state.phase === "precombat-main" && state.step === "main")) advanceStep(state);

    expect(state.players[state.activePlayerIndex]!.id).toBe(mike.id);
    expect(mike.hand).toHaveLength(before + 1);
  });
});
