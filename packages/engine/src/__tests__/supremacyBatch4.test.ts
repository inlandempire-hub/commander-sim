import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 4", () => {
  it("Authority of the Consuls: opponents' creatures enter tapped and gain you life", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "authority-of-the-consuls", alice.id, "battlefield");
    const lifeBefore = alice.life;

    const bears = createCardInstance(state, "grizzly-bears", bob.id, "hand");
    putOntoBattlefield(state, bears.instanceId);
    settle(state);
    const inPlay = bob.battlefield.find((c) => c.definitionId === "grizzly-bears")!;
    expect(inPlay.tapped, "opponent creature entered tapped").toBe(true);
    expect(alice.life, "you gained 1 life").toBe(lifeBefore + 1);

    // Your own creature is unaffected.
    const yours = createCardInstance(state, "silvercoat-lion", alice.id, "hand");
    putOntoBattlefield(state, yours.instanceId);
    settle(state);
    expect(alice.battlefield.find((c) => c.definitionId === "silvercoat-lion")!.tapped).toBe(false);
  });

  it("Charming Prince: enters with a modal choice (engine takes scry 2)", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    for (let i = 0; i < 4; i++) createCardInstance(state, "plains", alice.id, "library");
    const prince = createCardInstance(state, "charming-prince", alice.id, "hand");
    putOntoBattlefield(state, prince.instanceId);
    // The ETB modal trigger goes on the stack and resolves without throwing.
    expect(() => settle(state)).not.toThrow();
    expect(alice.battlefield.some((c) => c.definitionId === "charming-prince")).toBe(true);
  });
});
