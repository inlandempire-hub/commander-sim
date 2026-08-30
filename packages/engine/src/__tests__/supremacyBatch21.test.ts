import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { activateAbility } from "../abilities.js";
import { destroyPermanent } from "../sba.js";
import { resolveTopOfStack } from "../stack.js";
import { chooseTriggerTargets } from "../permanents.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let g = 40;
  while (g-- > 0) {
    if (state.pendingTargetChoices?.length) { const t = state.pendingTargetChoices[0]!; chooseTriggerTargets(state, t.playerId, t.candidates.slice(0, Math.max(t.min, 1))); continue; }
    if (state.stack.length > 0) { resolveTopOfStack(state); continue; }
    break;
  }
}

describe("Supremacy batch 21 (Parallax Wave / fading)", () => {
  it("enters with five fade counters; a counter exiles a creature; destroying it returns them", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const wave = createCardInstance(state, "parallax-wave", alice.id, "hand");
    putOntoBattlefield(state, wave.instanceId, { wasCast: true });
    expect(wave.otherCounters, "five fade counters").toBe(5);

    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    activateAbility(state, alice.id, wave.instanceId, 0, [{ kind: "card", instanceId: bears.instanceId }]);
    settle(state);
    expect(wave.otherCounters, "one fade counter spent").toBe(4);
    expect(bob.exile.some((c) => c.definitionId === "grizzly-bears"), "creature exiled").toBe(true);

    destroyPermanent(state, wave.instanceId);
    settle(state);
    expect(bob.battlefield.some((c) => c.definitionId === "grizzly-bears"), "returned when the wave left").toBe(true);
  });
});
