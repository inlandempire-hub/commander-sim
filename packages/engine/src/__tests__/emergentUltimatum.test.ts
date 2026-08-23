import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";
import { resolveCardChoice } from "../effects.js";
import type { GameState } from "../types.js";

function drain(state: GameState): void {
  let guard = 80;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

function fillPool(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId)!;
  player.manaPool.generic = 20;
  for (const color of ["W", "U", "B", "R", "G"] as const) player.manaPool[color] = 20;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
}

/** Cast Emergent Ultimatum from alice's hand and resolve up to the first choice. */
function castUltimatum(state: GameState) {
  const alice = state.players[0]!;
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  const ult = createCardInstance(state, "emergent-ultimatum", alice.id, "hand");
  fillPool(state, alice.id);
  castSpell(state, alice.id, ult.instanceId, []);
  drain(state);
  return ult;
}

describe("Emergent Ultimatum", () => {
  it("searches three monocolored cards, an opponent shuffles one back, the rest are cast free", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    alice.library = [];
    const bear = createCardInstance(state, "grizzly-bears", alice.id, "library"); // G
    const vamp = createCardInstance(state, "vampire-of-the-dire-moon", alice.id, "library"); // B
    const mists = createCardInstance(state, "reach-through-mists", alice.id, "library"); // U instant
    createCardInstance(state, "baleful-strix", alice.id, "library"); // U/B multicolour - excluded
    createCardInstance(state, "darksteel-myr", alice.id, "library"); // colourless - excluded
    for (let i = 0; i < 6; i++) createCardInstance(state, "forest", alice.id, "library"); // draw fodder

    const ult = castUltimatum(state);

    // Step one: only the three monocolored cards are offered.
    const search = state.pendingCardChoices[0]!;
    expect(search.emergentStep).toBe("search");
    expect(new Set(search.candidateInstanceIds)).toEqual(
      new Set([bear.instanceId, vamp.instanceId, mists.instanceId]),
    );
    resolveCardChoice(state, alice.id, [bear.instanceId, vamp.instanceId, mists.instanceId]);

    // Step two: the opponent chooses one of the three exiled cards.
    const pick = state.pendingCardChoices[0]!;
    expect(pick.emergentStep).toBe("opponent-pick");
    expect(pick.playerId).toBe(bob.id);
    resolveCardChoice(state, bob.id, [mists.instanceId]); // shuffle the instant back
    drain(state); // the two free creature spells resolve

    // The instant is back in alice's library; the two creatures are in play.
    expect(findInstance(state, mists.instanceId)!.instance.zone).toBe("library");
    expect(findInstance(state, bear.instanceId)!.instance.zone).toBe("battlefield");
    expect(findInstance(state, vamp.instanceId)!.instance.zone).toBe("battlefield");
    // Emergent Ultimatum exiles itself rather than going to the graveyard.
    expect(findInstance(state, ult.instanceId)!.instance.zone).toBe("exile");
  });

  it("refuses a search that names two cards of the same name", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    alice.library = [];
    const bearA = createCardInstance(state, "grizzly-bears", alice.id, "library");
    const bearB = createCardInstance(state, "grizzly-bears", alice.id, "library");
    for (let i = 0; i < 6; i++) createCardInstance(state, "forest", alice.id, "library");

    castUltimatum(state);
    expect(() => resolveCardChoice(state, alice.id, [bearA.instanceId, bearB.instanceId])).toThrow(
      /different names/i,
    );
  });
});
