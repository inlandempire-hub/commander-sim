import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpellWithAutoTap } from "../autoTap.js";
import { putOntoBattlefield } from "../permanents.js";
import { destroyPermanent, checkStateBasedActions } from "../sba.js";
import { resolveTopOfStack } from "../stack.js";
import { attackProblem } from "../combat.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 3 (auras)", () => {
  it("Pacifism: attaches on cast, stops the creature attacking, dies with its host", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    // Give Alice a Plains to pay {1}{W}.
    createCardInstance(state, "plains", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "battlefield");
    const pacifism = createCardInstance(state, "pacifism", alice.id, "hand");

    state.phase = "precombat-main";
    state.step = "main";
    castSpellWithAutoTap(state, alice.id, pacifism.instanceId, [{ kind: "card", instanceId: bears.instanceId }]);
    settle(state);

    const aura = alice.battlefield.find((c) => c.definitionId === "pacifism");
    expect(aura?.attachedTo, "attached to the Bears").toBe(bears.instanceId);
    expect(attackProblem(state, bob.id, bears.instanceId), "the Bears can't attack").not.toBeNull();

    // Destroy the Bears -> the Aura has nothing to enchant and goes to the graveyard.
    destroyPermanent(state, bears.instanceId);
    checkStateBasedActions(state);
    expect(alice.battlefield.some((c) => c.definitionId === "pacifism")).toBe(false);
    expect(alice.graveyard.some((c) => c.definitionId === "pacifism")).toBe(true);
  });

  it("Ossification: enchants your land, exiles an opponent's creature, returns it when destroyed", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const land = createCardInstance(state, "plains", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const oss = createCardInstance(state, "ossification", alice.id, "hand");

    state.phase = "precombat-main";
    state.step = "main";
    castSpellWithAutoTap(state, alice.id, oss.instanceId, [{ kind: "card", instanceId: land.instanceId }]);
    settle(state);
    expect(alice.battlefield.find((c) => c.definitionId === "ossification")?.attachedTo).toBe(land.instanceId);
    expect(bob.exile.some((c) => c.definitionId === "grizzly-bears"), "creature exiled").toBe(true);

    destroyPermanent(state, alice.battlefield.find((c) => c.definitionId === "ossification")!.instanceId);
    settle(state);
    expect(bob.battlefield.some((c) => c.definitionId === "grizzly-bears"), "returned when the aura left").toBe(true);
  });

  it("Pacifism can only be cast when there is a creature to enchant", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "plains", alice.id, "battlefield");
    createCardInstance(state, "plains", alice.id, "battlefield");
    createCardInstance(state, "pacifism", alice.id, "hand");
    // No creatures anywhere -> putOntoBattlefield of a hostless aura is binned by SBA.
    const stray = createCardInstance(state, "pacifism", alice.id, "battlefield");
    checkStateBasedActions(state);
    expect(alice.battlefield.some((c) => c.instanceId === stray.instanceId), "hostless aura is binned").toBe(false);
  });
});
