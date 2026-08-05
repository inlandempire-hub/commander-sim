import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { passWouldEndTurn } from "../turn.js";
import { createCardInstance } from "../state.js";

/**
 * The pass button says "End Turn" instead of "Pass" when this click is the one
 * that hands the turn over. Tested here rather than only in the browser because
 * auto-pass usually carries the end step past too fast to read.
 */
describe("passWouldEndTurn", () => {
  function atEndStep() {
    const state = makeTestGame();
    state.phase = "ending";
    state.step = "end";
    return state;
  }

  it("is true for the active player at their end step", () => {
    const state = atEndStep();
    expect(passWouldEndTurn(state, "alice")).toBe(true);
  });

  it("is false anywhere else in the turn", () => {
    const state = makeTestGame();
    for (const [phase, step] of [
      ["beginning", "upkeep"],
      ["precombat-main", "main"],
      ["combat", "declare-attackers"],
      ["postcombat-main", "main"],
    ] as const) {
      state.phase = phase;
      state.step = step;
      expect(passWouldEndTurn(state, "alice"), `${phase}/${step}`).toBe(false);
    }
  });

  it("is false for a player whose turn it is not", () => {
    // Passing at someone else's end step ends *their* turn, not yours.
    const state = atEndStep();
    expect(passWouldEndTurn(state, "bob")).toBe(false);
  });

  it("is false while anything is still on the stack", () => {
    // The pass resolves the top of the stack instead of ending anything, so
    // an opponent responding at your end step puts the label back to "Pass".
    const state = atEndStep();
    const card = createCardInstance(state, "healing-salve", "bob", "hand");
    state.stack.push({
      id: "s1",
      sourceInstanceId: card.instanceId,
      controllerId: "bob",
      effect: { kind: "gainLife", amount: 3 },
      targets: [],
      isPermanentSpell: false,
    });
    expect(passWouldEndTurn(state, "alice")).toBe(false);

    state.stack.length = 0;
    expect(passWouldEndTurn(state, "alice")).toBe(true);
  });

  it("does not depend on how many opponents have already passed", () => {
    // The point of the label is "you are done for this turn", which is true of
    // the first pass at your end step as much as the last. Keying it off
    // passesInSuccession meant it never appeared on your own turn at all,
    // because priority starts with you and your pass is never the last one.
    const state = atEndStep();
    for (const passes of [0, 1, 2]) {
      state.passesInSuccession = passes;
      expect(passWouldEndTurn(state, "alice"), `after ${passes} passes`).toBe(true);
    }
  });
});
