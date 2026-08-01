import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { passPriority } from "../priority.js";

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
