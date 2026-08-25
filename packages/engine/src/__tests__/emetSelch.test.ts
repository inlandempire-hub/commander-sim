import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, moveCard } from "../state.js";
import { pushTrigger } from "../permanents.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { effectivePower } from "../counters.js";
import type { GameState, TriggeredAbility } from "../types.js";

function drainAndAnswerDiscards(state: GameState): void {
  let guard = 40;
  while (guard-- > 0) {
    if (state.stack.length > 0) {
      resolveTopOfStack(state);
      continue;
    }
    // Loot's mandatory discard, if it stops to ask.
    if (state.pendingDiscards && state.pendingDiscards.length > 0) {
      const d = state.pendingDiscards[0]!;
      const player = state.players.find((p) => p.id === d.playerId)!;
      // Answered by the harness in a real game; here just discard the first card.
      moveCard(state, player.hand[0]!.instanceId, "graveyard");
      state.pendingDiscards.shift();
      continue;
    }
    break;
  }
}

const upkeepAbilityOf = (state: GameState): TriggeredAbility =>
  state.cardDefinitions["emet-selch-unsundered"]!.triggeredAbilities!.find((t) => t.event === "upkeep")!;

describe("Emet-Selch, Unsundered", () => {
  it("transforms into Hades in your upkeep once your graveyard has fourteen cards", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.activePlayerIndex = 0;
    const emet = createCardInstance(state, "emet-selch-unsundered", alice.id, "battlefield");
    for (let i = 0; i < 14; i++) createCardInstance(state, "grizzly-bears", alice.id, "graveyard");

    // Fire the upkeep trigger; its intervening-if is met, so it goes on the stack.
    const pushed = pushTrigger(state, emet.instanceId, alice.id, upkeepAbilityOf(state));
    expect(pushed).not.toBeNull();
    resolveTopOfStack(state); // "you may transform" - stops to ask
    expect(state.pendingConfirmation?.playerId).toBe(alice.id);
    resolveConfirmation(state, alice.id, true);

    const now = findInstance(state, emet.instanceId)!.instance;
    expect(now.definitionId).toBe("hades-sorcerer-of-eld");
    expect(effectivePower(state, now)).toBe(6); // the 6/6 back face
  });

  it("does not offer the transform with only thirteen cards in the graveyard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.activePlayerIndex = 0;
    const emet = createCardInstance(state, "emet-selch-unsundered", alice.id, "battlefield");
    for (let i = 0; i < 13; i++) createCardInstance(state, "grizzly-bears", alice.id, "graveyard");

    // The intervening-if fails, so nothing goes on the stack.
    expect(pushTrigger(state, emet.instanceId, alice.id, upkeepAbilityOf(state))).toBeNull();
    expect(findInstance(state, emet.instanceId)!.instance.definitionId).toBe("emet-selch-unsundered");
  });

  it("as Hades, cards that would hit the graveyard are exiled instead", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const emet = createCardInstance(state, "emet-selch-unsundered", alice.id, "battlefield");
    // Flip it to Hades in place.
    findInstance(state, emet.instanceId)!.instance.definitionId = "hades-sorcerer-of-eld";

    const doomed = createCardInstance(state, "grizzly-bears", alice.id, "hand");
    moveCard(state, doomed.instanceId, "graveyard");
    // The replacement redirects it.
    expect(findInstance(state, doomed.instanceId)!.instance.zone).toBe("exile");
  });

  it("loots when it enters (draw a card, then discard a card)", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const emet = createCardInstance(state, "emet-selch-unsundered", alice.id, "battlefield");
    for (let i = 0; i < 5; i++) createCardInstance(state, "forest", alice.id, "library");
    createCardInstance(state, "grizzly-bears", alice.id, "hand");
    const handBefore = alice.hand.length;
    const gyBefore = alice.graveyard.length;

    pushTrigger(state, emet.instanceId, alice.id, state.cardDefinitions["emet-selch-unsundered"]!.triggeredAbilities!.find((t) => t.event === "enters-battlefield")!);
    drainAndAnswerDiscards(state);

    // Drew one and discarded one: hand unchanged, one more card in the graveyard.
    expect(alice.hand.length).toBe(handBefore);
    expect(alice.graveyard.length).toBe(gyBefore + 1);
  });
});
