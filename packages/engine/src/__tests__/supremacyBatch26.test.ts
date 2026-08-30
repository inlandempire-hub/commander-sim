import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { chooseTriggerTargets } from "../permanents.js";
import { castSpell } from "../casting.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let g = 40;
  while (g-- > 0) {
    if (state.pendingTargetChoices?.length) { const t = state.pendingTargetChoices[0]!; chooseTriggerTargets(state, t.playerId, t.candidates); continue; }
    if (state.stack.length > 0) { resolveTopOfStack(state); continue; }
    break;
  }
}

describe("Supremacy batch 26 (Appa / airbend)", () => {
  it("airbends your permanents into exile, castable for {2}", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main"; state.activePlayerIndex = 0;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    for (let i = 0; i < 5; i++) createCardInstance(state, "plains", alice.id, "battlefield");
    const appa = createCardInstance(state, "appa-steadfast-guardian", alice.id, "hand");
    putOntoBattlefield(state, appa.instanceId, { wasCast: true });
    settle(state);

    const exiled = alice.exile.find((c) => c.definitionId === "grizzly-bears");
    expect(exiled, "your creature airbent to exile").toBeDefined();
    expect(exiled!.playableFromExile?.fixedCost?.generic, "castable for {2}").toBe(2);
    // Cast it from exile for {2} (two Plains) - it returns to the battlefield.
    alice.manaPool = { W: 2 };
    castSpell(state, alice.id, exiled!.instanceId, []);
    let g = 10; while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);
    expect(alice.battlefield.some((c) => c.definitionId === "grizzly-bears"), "recast from exile for {2}").toBe(true);
  });
});
