import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { activateAbility } from "../abilities.js";
import { resolveTopOfStack } from "../stack.js";
import { hasKeyword } from "../counters.js";

describe("Supremacy batch 11 (The Duke)", () => {
  it("enters with a +1/+1 counter; moves it onto another creature and grants hexproof", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main";
    state.step = "main";
    const duke = createCardInstance(state, "the-duke-rebel-sentry", alice.id, "hand");
    putOntoBattlefield(state, duke.instanceId, { wasCast: true });
    let g = 10;
    while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);
    expect(duke.plusOneCounters, "enters with a +1/+1 counter").toBe(1);

    duke.summoningSickness = false; // been out since last turn, for its tap ability
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    bears.summoningSickness = false;
    activateAbility(state, alice.id, duke.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
    let g2 = 10;
    while (state.stack.length > 0 && g2-- > 0) resolveTopOfStack(state);

    expect(duke.plusOneCounters, "counter removed as a cost").toBe(0);
    expect(bears.plusOneCounters, "counter moved onto the Bears").toBe(1);
    expect(hasKeyword(state, bears, "Hexproof"), "and it gained hexproof").toBe(true);
  });
});
