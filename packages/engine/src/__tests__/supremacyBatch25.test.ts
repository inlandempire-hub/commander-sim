import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { typesOf } from "../counters.js";
import { advanceStep } from "../turn.js";

function resolveStack(state: ReturnType<typeof makeTestGame>): void {
  let g = 20; while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 25 (Overlord / impending)", () => {
  it("impending: enters with time counters, not a creature, makes two insects; becomes a creature at end steps", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main";
    state.activePlayerIndex = 0;
    alice.manaPool = { W: 4 };
    const overlord = createCardInstance(state, "overlord-of-the-mistmoors", alice.id, "hand");
    castSpell(state, alice.id, overlord.instanceId, [], { useImpending: true });
    resolveStack(state);

    const inPlay = alice.battlefield.find((c) => c.definitionId === "overlord-of-the-mistmoors")!;
    expect(inPlay.timeCounters, "four time counters").toBe(4);
    expect(typesOf(state, inPlay).includes("Creature"), "not a creature yet").toBe(false);
    expect(alice.battlefield.filter((c) => c.definitionId === "token-w-21-insect-flying").length, "two insects on enter").toBe(2);

    // Advance through four of Alice's end steps: a time counter comes off each.
    for (let turn = 0; turn < 8 && inPlay.timeCounters > 0; turn++) {
      // move to end step of the current active turn
      let guard = 30;
      while (!((state.phase as string) === "ending" && (state.step as string) === "end") && guard-- > 0) advanceStep(state);
      advanceStep(state); // process past end
    }
    expect(inPlay.timeCounters, "counters removed").toBe(0);
    expect(typesOf(state, inPlay).includes("Creature"), "now a creature").toBe(true);
  });
});
