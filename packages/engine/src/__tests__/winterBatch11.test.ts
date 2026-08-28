import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { applyEffect } from "../effects.js";
import { enteredBattlefield, pushTrigger } from "../permanents.js";
import { castSpell, mayPlayFromExile } from "../casting.js";
import { effectiveToughness } from "../counters.js";
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
function trig(defId: string, event: string) {
  return TEST_CARD_DEFINITIONS[defId]!.triggeredAbilities!.find((t) => t.event === event)!;
}

describe("Winter batch 11: the last three", () => {
  it("Virtue of Persistence's adventure resolves, then the card waits in exile to reanimate later", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    const victim = createCardInstance(state, "elder-gargaroth", bob, "battlefield"); // 6/6 -> 3/3
    const virtue = createCardInstance(state, "virtue-of-persistence", alice, "hand");
    requirePlayer(state, alice).manaPool.B = 1;
    requirePlayer(state, alice).manaPool.generic = 1;
    castSpell(state, alice, virtue.instanceId, [{ kind: "card", instanceId: victim.instanceId }], {
      useAdventure: true,
      ignoreTiming: true,
    });
    settle(state);
    expect(effectiveToughness(state, victim)).toBe(3); // -3/-3
    expect(requirePlayer(state, alice).life).toBe(42);
    // The card is now in exile, castable as the enchantment.
    const inExile = requirePlayer(state, alice).exile.find((c) => c.instanceId === virtue.instanceId)!;
    expect(inExile).toBeDefined();
    expect(inExile.adventuredInExile).toBe(true);
    requirePlayer(state, alice).manaPool.B = 2;
    requirePlayer(state, alice).manaPool.generic = 5;
    castSpell(state, alice, virtue.instanceId, [], { ignoreTiming: true });
    settle(state);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.instanceId === virtue.instanceId)).toBe(true);
  });

  it("Brass's Tunnel-Grinder transforms into Tecutlan after three bore counters", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const brass = createCardInstance(state, "brasss-tunnel-grinder", alice, "battlefield");
    for (let i = 0; i < 3; i++) {
      requirePlayer(state, alice).descendedThisTurn = true;
      applyEffect(state, alice, brass.instanceId, { kind: "brassEndStep", boreToTransform: 3 }, []);
    }
    expect(brass.definitionId).toBe("tecutlan-the-searing-rift");
  });

  it("Thieves' Auction exiles every nontoken permanent and hands them back out", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    createCardInstance(state, "elder-gargaroth", alice, "battlefield");
    createCardInstance(state, "willow-elf", bob, "battlefield");
    const src = createCardInstance(state, "thieves-auction", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "thievesAuction" }, []);
    // Both permanents are back on the battlefield, redistributed and tapped.
    const board = [...requirePlayer(state, alice).battlefield, ...requirePlayer(state, bob).battlefield];
    const redistributed = board.filter((c) => c.definitionId === "elder-gargaroth" || c.definitionId === "willow-elf");
    expect(redistributed.length).toBe(2);
    expect(redistributed.every((c) => c.tapped)).toBe(true);
  });

  it("Share the Spoils exiles the top of each library into a shared pile the active player may use", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, alice).library = [createCardInstance(state, "rakdos-charm", alice, "library")];
    requirePlayer(state, bob).library = [createCardInstance(state, "swamp", bob, "library")];
    const share = createCardInstance(state, "share-the-spoils", alice, "battlefield");
    enteredBattlefield(state, share);
    pushTrigger(state, share.instanceId, alice, trig("share-the-spoils", "enters-battlefield"));
    settle(state);
    const aliceCard = requirePlayer(state, alice).exile.find((c) => c.definitionId === "rakdos-charm")!;
    const bobCard = requirePlayer(state, bob).exile.find((c) => c.definitionId === "swamp")!;
    expect(aliceCard?.shareTheSpoilsExiled).toBe(true);
    expect(bobCard?.shareTheSpoilsExiled).toBe(true);
    // The active player (alice) may play from the pile - including the card an opponent exiled.
    state.activePlayerIndex = 0;
    expect(mayPlayFromExile(state, alice, aliceCard)).toBe(true);
    expect(mayPlayFromExile(state, alice, bobCard)).toBe(true);
  });
});
