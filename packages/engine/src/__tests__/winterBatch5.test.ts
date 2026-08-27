import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, discardCard, requirePlayer } from "../state.js";
import { applyEffect } from "../effects.js";
import { pushTrigger } from "../permanents.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { landDropsAllowed } from "../casting.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

function settle(state: GameState): void {
  let guard = 0;
  while ((state.stack.length > 0 || state.pendingConfirmation) && guard++ < 60) {
    if (state.pendingConfirmation) resolveConfirmation(state, state.pendingConfirmation.playerId, true);
    else resolveTopOfStack(state);
  }
}
function trig(defId: string, event: string) {
  return TEST_CARD_DEFINITIONS[defId]!.triggeredAbilities!.find((t) => t.event === event)!;
}

describe("Winter batch 5", () => {
  it("Cavalier of Flame burns each opponent for the lands in your graveyard on death", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    createCardInstance(state, "forest", alice, "graveyard");
    createCardInstance(state, "swamp", alice, "graveyard");
    const pw = createCardInstance(state, "liliana-deaths-majesty", bob, "battlefield");
    const before = pw.loyalty;
    const src = createCardInstance(state, "cavalier-of-flame", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, trig("cavalier-of-flame", "dies").effect, []);
    expect(requirePlayer(state, bob).life).toBe(38);
    expect(pw.damageMarked).toBe(2);
    void before;
  });

  it("Sangromancer gains life when an opponent discards", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    createCardInstance(state, "sangromancer", alice, "battlefield");
    const card = createCardInstance(state, "swamp", bob, "hand");
    discardCard(state, bob, card.instanceId);
    settle(state);
    expect(requirePlayer(state, alice).life).toBe(43);
  });

  it("Osseous Sticktwister burns an opponent who can't sacrifice or discard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, bob).hand = [];
    requirePlayer(state, bob).battlefield = []; // no nonland permanent
    const src = createCardInstance(state, "osseous-sticktwister", alice, "battlefield"); // power 2
    applyEffect(state, alice, src.instanceId, { kind: "eachOpponentSacOrDiscardElseDamage", amount: { kind: "source-power" } }, []);
    expect(requirePlayer(state, bob).life).toBe(38);
  });

  it("Keen Duelist trades the top of libraries and the life it costs", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, alice).library = [createCardInstance(state, "rakdos-charm", alice, "library")]; // MV 2
    requirePlayer(state, bob).library = [createCardInstance(state, "noxious-gearhulk", bob, "library")]; // MV 6
    const kd = createCardInstance(state, "keen-duelist", alice, "battlefield");
    pushTrigger(state, kd.instanceId, alice, trig("keen-duelist", "upkeep"));
    settle(state);
    expect(requirePlayer(state, alice).life).toBe(34); // loses Bob's 6
    expect(requirePlayer(state, bob).life).toBe(38); // loses Alice's 2
    expect(requirePlayer(state, alice).hand.some((c) => c.definitionId === "rakdos-charm")).toBe(true);
    expect(requirePlayer(state, bob).hand.some((c) => c.definitionId === "noxious-gearhulk")).toBe(true);
  });

  it("Druid of Purification destroys an opponent's artifact but not your own", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    const mine = createCardInstance(state, "howling-mine", alice, "battlefield");
    const theirs = createCardInstance(state, "howling-mine", bob, "battlefield");
    const d = createCardInstance(state, "druid-of-purification", alice, "battlefield");
    applyEffect(state, alice, d.instanceId, trig("druid-of-purification", "enters-battlefield").effect, []);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.instanceId === mine.instanceId)).toBe(true);
    expect(requirePlayer(state, bob).battlefield.some((c) => c.instanceId === theirs.instanceId)).toBe(false);
  });

  it("Rootweaver Druid puts one fetched basic under your control", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, bob).library = [];
    for (let i = 0; i < 3; i++) createCardInstance(state, "forest", bob, "library");
    const d = createCardInstance(state, "rootweaver-druid", alice, "battlefield");
    applyEffect(state, alice, d.instanceId, trig("rootweaver-druid", "enters-battlefield").effect, []);
    expect(requirePlayer(state, alice).battlefield.filter((c) => c.definitionId === "forest").length).toBe(1);
    expect(requirePlayer(state, bob).battlefield.filter((c) => c.definitionId === "forest").length).toBe(2);
  });

  it("Rites of Flourishing gives every player an extra land drop", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    createCardInstance(state, "rites-of-flourishing", alice, "battlefield");
    expect(landDropsAllowed(state, alice)).toBe(2);
    expect(landDropsAllowed(state, bob)).toBe(2);
  });
});
