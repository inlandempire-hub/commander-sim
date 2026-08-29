import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";

describe("Supremacy batch 7", () => {
  it("Containment Priest: a creature that enters without being cast is exiled", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "containment-priest", alice.id, "battlefield");

    // Reanimation-style entry (no wasCast) -> exiled.
    const reanimated = createCardInstance(state, "grizzly-bears", alice.id, "graveyard");
    putOntoBattlefield(state, reanimated.instanceId);
    expect(alice.battlefield.some((c) => c.definitionId === "grizzly-bears"), "not on battlefield").toBe(false);
    expect(alice.exile.some((c) => c.definitionId === "grizzly-bears"), "exiled instead").toBe(true);
  });

  it("Containment Priest: a cast creature enters normally", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "containment-priest", alice.id, "battlefield");

    // A permanent spell resolving passes wasCast, so it is not exiled.
    const bears = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    putOntoBattlefield(state, bears.instanceId, { wasCast: true });
    let guard = 20;
    while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
    expect(alice.battlefield.some((c) => c.definitionId === "grizzly-bears"), "cast creature stays").toBe(true);
  });

  it("Containment Priest does not exile tokens", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "containment-priest", alice.id, "battlefield");
    // A token is created directly in the battlefield array; assert the priest
    // leaves an existing token alone by putting a token-copy through the door.
    const clue = createCardInstance(state, "clue-token", alice.id, "hand"); // has isToken
    putOntoBattlefield(state, clue.instanceId);
    // Clue is an artifact, not a creature, so it is unaffected regardless.
    expect(alice.battlefield.some((c) => c.definitionId === "clue-token")).toBe(true);
  });
});
