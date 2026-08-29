import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpellWithAutoTap } from "../autoTap.js";
import { resolveTopOfStack } from "../stack.js";

describe("Supremacy batch 12 (Ephemerate rebound)", () => {
  it("blinks a creature, then exiles itself with a free recast for next turn", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main";
    state.step = "main";
    createCardInstance(state, "plains", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "library");
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "battlefield");
    const eph = createCardInstance(state, "ephemerate", alice.id, "hand");

    castSpellWithAutoTap(state, alice.id, eph.instanceId, [{ kind: "card", instanceId: hunter.instanceId }]);
    let g = 20;
    while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);

    // Hunter blinked back (its draw fired), and Ephemerate is in exile with a
    // free recast permission for Alice's next turn.
    expect(alice.battlefield.some((c) => c.definitionId === "helpful-hunter")).toBe(true);
    const exiled = alice.exile.find((c) => c.definitionId === "ephemerate");
    expect(exiled, "Ephemerate exiled by rebound").toBeDefined();
    expect(exiled!.playableFromExile?.free, "recastable free").toBe(true);
    expect(exiled!.playableFromExile?.untilTurn).toBe(state.turnNumber + state.players.length);
    expect(alice.graveyard.some((c) => c.definitionId === "ephemerate"), "not in graveyard").toBe(false);
  });
});
