import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import type { GameState } from "../types.js";

function settle(state: GameState): void {
  let guard = 0;
  while ((state.stack.length > 0 || state.pendingConfirmation) && guard++ < 60) {
    if (state.pendingConfirmation) resolveConfirmation(state, state.pendingConfirmation.playerId, true);
    else resolveTopOfStack(state);
  }
}

describe("Winter batch 8: kicker and convoke", () => {
  it("Urborg Repossession returns a creature and gains 2; kicked, returns another permanent", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const creature = createCardInstance(state, "willow-elf", alice, "graveyard");
    const land = createCardInstance(state, "forest", alice, "graveyard");
    const spell = createCardInstance(state, "urborg-repossession", alice, "hand");
    requirePlayer(state, alice).manaPool.B = 1;
    requirePlayer(state, alice).manaPool.G = 1;
    requirePlayer(state, alice).manaPool.generic = 1;
    castSpell(state, alice, spell.instanceId, [{ kind: "card", instanceId: creature.instanceId }], { kicked: true, ignoreTiming: true });
    settle(state);
    expect(requirePlayer(state, alice).hand.some((c) => c.instanceId === creature.instanceId)).toBe(true);
    expect(requirePlayer(state, alice).hand.some((c) => c.instanceId === land.instanceId)).toBe(true); // kicked extra
    expect(requirePlayer(state, alice).life).toBe(42);
  });

  it("Pile On can be paid partly by convoking a creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    const victim = createCardInstance(state, "willow-elf", bob, "battlefield");
    const helper = createCardInstance(state, "willow-elf", alice, "battlefield"); // green: pays generic
    const spell = createCardInstance(state, "pile-on", alice, "hand");
    // {3}{B}, convoke one creature for {1}, so pay {2}{B} from the pool.
    requirePlayer(state, alice).manaPool.B = 1;
    requirePlayer(state, alice).manaPool.generic = 2;
    castSpell(state, alice, spell.instanceId, [{ kind: "card", instanceId: victim.instanceId }], {
      convokeCreatures: [helper.instanceId], ignoreTiming: true,
    });
    settle(state);
    expect(requirePlayer(state, bob).battlefield.some((c) => c.instanceId === victim.instanceId)).toBe(false);
    expect(helper.tapped).toBe(true);
  });
});
