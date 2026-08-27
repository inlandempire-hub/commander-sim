import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { castSpell } from "../casting.js";
import { activateAbility } from "../abilities.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { hasKeyword } from "../counters.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

function settle(state: GameState): void {
  let guard = 0;
  while ((state.stack.length > 0 || state.pendingConfirmation) && guard++ < 60) {
    if (state.pendingConfirmation) resolveConfirmation(state, state.pendingConfirmation.playerId, true);
    else resolveTopOfStack(state);
  }
}

describe("Winter batch 10", () => {
  it("Six lets you retrace a permanent card from the graveyard by discarding a land", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    createCardInstance(state, "six", alice, "battlefield"); // grants retrace
    const enchant = createCardInstance(state, "rites-of-flourishing", alice, "graveyard"); // nonland permanent
    const land = createCardInstance(state, "forest", alice, "hand"); // discarded for retrace
    requirePlayer(state, alice).manaPool.G = 1;
    requirePlayer(state, alice).manaPool.generic = 2; // {2}{G}
    castSpell(state, alice, enchant.instanceId, [], { retraceDiscard: land.instanceId, ignoreTiming: true });
    settle(state);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.instanceId === enchant.instanceId)).toBe(true);
    expect(requirePlayer(state, alice).graveyard.some((c) => c.instanceId === land.instanceId)).toBe(true);
  });

  it("Chainer lets you cast a creature from the graveyard, and it gains haste", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const chainer = createCardInstance(state, "chainer-nightmare-adept", alice, "battlefield");
    createCardInstance(state, "swamp", alice, "hand"); // discarded to enable
    const dead = createCardInstance(state, "willow-elf", alice, "graveyard");
    const discardCard = requirePlayer(state, alice).hand[0]!;
    activateAbility(state, alice, chainer.instanceId, 0, [], undefined, { discardInstanceIds: [discardCard.instanceId] });
    settle(state);
    expect(requirePlayer(state, alice).mayCastCreatureFromGraveyardThisTurn).toBe(true);
    requirePlayer(state, alice).manaPool.G = 1;
    castSpell(state, alice, dead.instanceId, [], { ignoreTiming: true });
    settle(state);
    const elf = requirePlayer(state, alice).battlefield.find((c) => c.instanceId === dead.instanceId)!;
    expect(elf).toBeDefined();
    expect(hasKeyword(state, elf, "Haste")).toBe(true);
  });

  it("Shigeki's Channel returns X nonlegendary cards from the graveyard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const shigeki = createCardInstance(state, "shigeki-jukai-visionary", alice, "hand");
    createCardInstance(state, "willow-elf", alice, "graveyard");
    createCardInstance(state, "norwood-ranger", alice, "graveyard");
    createCardInstance(state, "six", alice, "graveyard"); // legendary - excluded
    requirePlayer(state, alice).manaPool.G = 2;
    requirePlayer(state, alice).manaPool.generic = 4; // {X}{X}{G}{G} with X=2 -> {4}{G}{G}
    activateAbility(state, alice, shigeki.instanceId, 1, [], undefined, { chosenX: 2 });
    settle(state);
    const hand = requirePlayer(state, alice).hand;
    expect(hand.filter((c) => c.definitionId === "willow-elf" || c.definitionId === "norwood-ranger").length).toBe(2);
    expect(hand.some((c) => c.definitionId === "six")).toBe(false); // legendary stays
  });
});
