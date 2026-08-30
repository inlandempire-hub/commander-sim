import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requireDefinition } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { castCostReduction } from "../casting.js";
import { activateAbility } from "../abilities.js";
import { resolveSearch } from "../effects.js";
import { chooseTriggerTargets } from "../permanents.js";
import { resolveConfirmation } from "../stack.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 60;
  while (guard-- > 0) {
    if (state.pendingTargetChoices?.length) { const t = state.pendingTargetChoices[0]!; chooseTriggerTargets(state, t.playerId, t.candidates.slice(0, Math.max(t.min, 0))); continue; }
    if (state.pendingConfirmation) { resolveConfirmation(state, state.pendingConfirmation.playerId, true); continue; }
    if (state.pendingSearch) { const s = state.pendingSearch; resolveSearch(state, s.playerId, s.candidateInstanceIds[0] ?? null); continue; }
    if (state.stack.length > 0) { resolveTopOfStack(state); continue; }
    break;
  }
}

describe("Supremacy batch 13", () => {
  it("Seam Rip: O-Ring on a mana-value-2-or-less permanent", () => {
    const state = makeTestGame();
    const alice = state.players[0]!, bob = state.players[1]!;
    createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // mv 2
    const rip = createCardInstance(state, "seam-rip", alice.id, "hand");
    putOntoBattlefield(state, rip.instanceId, { wasCast: true });
    settle(state);
    expect(bob.exile.some((c) => c.definitionId === "grizzly-bears")).toBe(true);
  });

  it("Thalia: noncreature spells cost {1} more, creatures unaffected", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "thalia-guardian-of-thraben", alice.id, "battlefield");
    const bolt = requireDefinition(state, "swords-to-plowshares"); // {W} instant
    const bears = requireDefinition(state, "grizzly-bears"); // {1}{G} creature
    expect(castCostReduction(state, alice.id, bolt, bolt.manaCost!).generic, "noncreature +1").toBe(1);
    expect(castCostReduction(state, alice.id, bears, bears.manaCost!).generic, "creature unchanged").toBe(bears.manaCost!.generic);
  });

  it("Starfield Shepherd: fetches a Plains OR a small creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "grizzly-bears", alice.id, "library"); // creature mv2 - NOT eligible
    createCardInstance(state, "helpful-hunter", alice.id, "library"); // creature mv2 - not eligible
    createCardInstance(state, "arbor-elf", alice.id, "library"); // creature mv1 - eligible
    const shep = createCardInstance(state, "starfield-shepherd", alice.id, "hand");
    putOntoBattlefield(state, shep.instanceId, { wasCast: true });
    // resolve the ETB trigger to raise the search, then inspect candidates
    let g = 10; while (state.stack.length > 0 && !state.pendingSearch && g-- > 0) resolveTopOfStack(state);
    expect(state.pendingSearch, "search opened").not.toBeNull();
    const cands = state.pendingSearch!.candidateInstanceIds.map((id) => alice.library.find((c) => c.instanceId === id)?.definitionId);
    expect(cands, "arbor-elf (mv1) eligible").toContain("arbor-elf");
    expect(cands, "grizzly-bears (mv2) not eligible").not.toContain("grizzly-bears");
  });

  it("Jeong Jeong's Deserters: ETB +1/+1 counter on a creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const target = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const jj = createCardInstance(state, "jeong-jeongs-deserters", alice.id, "hand");
    putOntoBattlefield(state, jj.instanceId, { wasCast: true });
    settle(state);
    // one +1/+1 counter landed somewhere on a creature you control
    const total = alice.battlefield.reduce((n, c) => n + c.plusOneCounters, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it("Touch the Spirit Realm: channel blinks an artifact/creature at end step", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main";
    const touch = createCardInstance(state, "touch-the-spirit-realm", alice.id, "hand");
    alice.manaPool = { W: 2 }; // {1}{W} for the channel cost (white pays the generic too)
    const hunter = createCardInstance(state, "helpful-hunter", alice.id, "battlefield");
    // Channel is the first activated ability (index 0); discard-from-hand + {1}{W}.
    activateAbility(state, alice.id, touch.instanceId, 0, [{ kind: "card", instanceId: hunter.instanceId }]);
    settle(state);
    expect(alice.exile.some((c) => c.definitionId === "helpful-hunter"), "held in exile till end step").toBe(true);
    expect(alice.graveyard.some((c) => c.definitionId === "touch-the-spirit-realm"), "channel discarded the card").toBe(true);
  });
});
