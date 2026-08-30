import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { destroyPermanent } from "../sba.js";
import { attackProblem } from "../combat.js";
import { moveControl } from "../permanents.js";

describe("Supremacy batch 24 (Dog Umbra)", () => {
  it("under your control: totem armor saves the creature and the aura dies instead", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    const umbra = createCardInstance(state, "dog-umbra", alice.id, "battlefield");
    umbra.attachedTo = bears.instanceId;

    destroyPermanent(state, bears.instanceId);
    expect(alice.battlefield.some((c) => c.definitionId === "grizzly-bears"), "creature saved").toBe(true);
    expect(alice.battlefield.some((c) => c.definitionId === "dog-umbra"), "aura destroyed instead").toBe(false);
  });

  it("under an opponent's control: the enchanted creature can't attack", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    bears.summoningSickness = false;
    const umbra = createCardInstance(state, "dog-umbra", alice.id, "battlefield"); // Alice controls the aura, Bob the creature
    umbra.attachedTo = bears.instanceId;
    void moveControl;
    expect(attackProblem(state, bob.id, bears.instanceId), "locked while an opponent controls it").toBeTruthy();
  });
});
