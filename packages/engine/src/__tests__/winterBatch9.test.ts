import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { applyEffect } from "../effects.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

function settle(state: GameState): void {
  let guard = 0;
  while ((state.stack.length > 0 || state.pendingConfirmation) && guard++ < 60) {
    if (state.pendingConfirmation) resolveConfirmation(state, state.pendingConfirmation.playerId, true);
    else resolveTopOfStack(state);
  }
}

describe("Winter batch 9", () => {
  it("Wishclaw Talisman enters with three wish counters", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const w = createCardInstance(state, "wishclaw-talisman", alice, "battlefield");
    enteredBattlefield(state, w);
    settle(state);
    expect(w.otherCounters).toBe(3);
    // Its ability hands the artifact to an opponent when it resolves.
    applyEffect(state, alice, w.instanceId, { kind: "giveControlToOpponent" }, []);
    expect(w.controllerId).toBe(state.players[1]!.id);
  });

  it("Healing Technique gains life equal to the returned card's mana value", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const card = createCardInstance(state, "noxious-gearhulk", alice, "graveyard"); // mana value 6
    const src = createCardInstance(state, "healing-technique", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, TEST_CARD_DEFINITIONS["healing-technique"]!.castEffect!, [
      { kind: "card", instanceId: card.instanceId },
    ]);
    expect(requirePlayer(state, alice).hand.some((c) => c.instanceId === card.instanceId)).toBe(true);
    expect(requirePlayer(state, alice).life).toBe(46);
  });

  it("Pendant of Prosperity enters under an opponent's control", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    const p = createCardInstance(state, "pendant-of-prosperity", alice, "battlefield");
    enteredBattlefield(state, p);
    expect(p.controllerId).toBe(bob);
    expect(requirePlayer(state, bob).battlefield.some((c) => c.instanceId === p.instanceId)).toBe(true);
  });
});
