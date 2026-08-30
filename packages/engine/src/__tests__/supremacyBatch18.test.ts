import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { castRestrictionProblem } from "../restrictions.js";
import { attackProblem } from "../combat.js";
import { requireDefinition } from "../state.js";

function resolveStack(state: ReturnType<typeof makeTestGame>): void {
  let g = 10; while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 18 (Orim's Chant)", () => {
  it("target player can't cast this turn; kicked, creatures can't attack", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    state.phase = "precombat-main"; state.step = "main";
    alice.manaPool = { W: 2 };
    const chant = createCardInstance(state, "orims-chant", alice.id, "hand");
    // Kicked, targeting Bob.
    castSpell(state, alice.id, chant.instanceId, [{ kind: "player", playerId: bob.id }], { kicked: true });
    resolveStack(state);

    // Bob can't cast a spell.
    expect(castRestrictionProblem(state, bob.id, requireDefinition(state, "grizzly-bears"), "hand"), "Bob locked out").toBeTruthy();
    // Alice (not targeted) can still cast.
    expect(castRestrictionProblem(state, alice.id, requireDefinition(state, "grizzly-bears"), "hand")).toBeFalsy();

    // No creature can attack this turn (kicked).
    const attacker = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    attacker.summoningSickness = false;
    expect(attackProblem(state, alice.id, attacker.instanceId), "no attacks after kicked chant").toBeTruthy();
  });
});
