import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect, resolveSearch } from "../effects.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 40;
  while ((state.stack.length > 0 || state.pendingSearch) && guard-- > 0) {
    if (state.pendingSearch) {
      const s = state.pendingSearch;
      resolveSearch(state, s.playerId, s.candidateInstanceIds[0] ?? null);
    } else {
      resolveTopOfStack(state);
    }
  }
}

describe("Supremacy batch 6", () => {
  it("Oust: tucks a creature second from the top and its controller gains 3", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "plains", bob.id, "library"); // ends up on top
    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const lifeBefore = bob.life;
    const oust = createCardInstance(state, "oust", alice.id, "hand");

    applyEffect(state, alice.id, oust.instanceId, {
      kind: "sequence",
      effects: [
        { kind: "tuckToLibrary", fromTop: 2, target: { kind: "creature" } },
        { kind: "gainLife", amount: 3, who: "target-controller" },
      ],
    }, [{ kind: "card", instanceId: bears.instanceId }]);

    expect(bob.battlefield.some((c) => c.definitionId === "grizzly-bears")).toBe(false);
    expect(bob.library[1]?.definitionId, "second from the top").toBe("grizzly-bears");
    expect(bob.life, "controller gains 3").toBe(lifeBefore + 3);
  });

  it("Scouting Hawk: fetches a Plains only when an opponent has more lands", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "plains", alice.id, "library");
    // Bob has two lands, Alice none -> condition met.
    createCardInstance(state, "island", bob.id, "battlefield");
    createCardInstance(state, "island", bob.id, "battlefield");
    const hawk = createCardInstance(state, "scouting-hawk", alice.id, "hand");
    putOntoBattlefield(state, hawk.instanceId);
    settle(state);
    expect(alice.battlefield.some((c) => c.definitionId === "plains"), "Plains fetched, tapped").toBe(true);
  });

  it("Scouting Hawk: no fetch when you are not behind on lands", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "plains", alice.id, "library");
    createCardInstance(state, "plains", alice.id, "battlefield");
    const hawk = createCardInstance(state, "scouting-hawk", alice.id, "hand");
    putOntoBattlefield(state, hawk.instanceId);
    settle(state);
    // The one Plains in the library was never fetched.
    expect(alice.battlefield.filter((c) => c.definitionId === "plains").length).toBe(1);
  });
});
