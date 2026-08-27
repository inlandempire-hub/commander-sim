import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { applyEffect } from "../effects.js";
import { enteredBattlefield, pushTrigger } from "../permanents.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { castSpell } from "../casting.js";
import { damagePlayer } from "../damage.js";
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

describe("Winter batch 6", () => {
  it("Gala Greeters rotates through its Alliance modes across the turn", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const gala = createCardInstance(state, "gala-greeters", alice, "battlefield");
    // First entering creature -> mode 1 (a +1/+1 counter on Gala).
    pushTrigger(state, gala.instanceId, alice, trig("gala-greeters", "permanent-enters"));
    settle(state);
    expect(gala.plusOneCounters).toBe(1);
    // Second entering creature -> mode 2 (a tapped Treasure).
    pushTrigger(state, gala.instanceId, alice, trig("gala-greeters", "permanent-enters"));
    settle(state);
    const treasure = requirePlayer(state, alice).battlefield.find((c) => c.definitionId === "token-treasure");
    expect(treasure?.tapped).toBe(true);
    // Third -> mode 3 (gain 2 life).
    pushTrigger(state, gala.instanceId, alice, trig("gala-greeters", "permanent-enters"));
    settle(state);
    expect(requirePlayer(state, alice).life).toBe(42);
  });

  it("Baleful Mastery's alternative cost makes an opponent draw", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, bob).library = [createCardInstance(state, "swamp", bob, "library")];
    const victim = createCardInstance(state, "willow-elf", bob, "battlefield");
    const bm = createCardInstance(state, "baleful-mastery", alice, "hand");
    // Pay the {1}{B} alternative: floating mana for it.
    requirePlayer(state, alice).manaPool.B = 1;
    requirePlayer(state, alice).manaPool.generic = 1;
    castSpell(state, alice, bm.instanceId, [{ kind: "card", instanceId: victim.instanceId }], { useAlternativeCost: true });
    settle(state);
    expect(requirePlayer(state, bob).battlefield.some((c) => c.instanceId === victim.instanceId)).toBe(false); // exiled
    expect(requirePlayer(state, bob).hand.length).toBe(1); // opponent drew
  });

  it("Obscuring Haze prevents damage from an opponent's creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    const src = createCardInstance(state, "obscuring-haze", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "preventDamageFromOpponentCreatures" }, []);
    const bobCreature = createCardInstance(state, "willow-elf", bob, "battlefield");
    const dealt = damagePlayer(state, requirePlayer(state, alice), 5, { sourceInstanceId: bobCreature.instanceId }).dealt;
    expect(dealt).toBe(0);
    // Your own creature's damage is unaffected.
    const mine = createCardInstance(state, "willow-elf", alice, "battlefield");
    const dealt2 = damagePlayer(state, requirePlayer(state, bob), 5, { sourceInstanceId: mine.instanceId }).dealt;
    expect(dealt2).toBe(5);
  });

  it("Over the Top puts revealed permanents onto the battlefield", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    // Two nonland permanents controlled -> reveal two.
    createCardInstance(state, "willow-elf", alice, "battlefield");
    createCardInstance(state, "howling-mine", alice, "battlefield");
    requirePlayer(state, alice).library = [];
    createCardInstance(state, "norwood-ranger", alice, "library"); // permanent -> battlefield
    createCardInstance(state, "rakdos-charm", alice, "library"); // instant -> graveyard
    const src = createCardInstance(state, "over-the-top", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "revealTopPermanentsToBattlefield" }, []);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.definitionId === "norwood-ranger")).toBe(true);
    expect(requirePlayer(state, alice).graveyard.some((c) => c.definitionId === "rakdos-charm")).toBe(true);
  });

  it("Restless Vents loots when it attacks", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    createCardInstance(state, "swamp", alice, "hand"); // something to discard
    requirePlayer(state, alice).library = [createCardInstance(state, "forest", alice, "library")];
    const vents = createCardInstance(state, "restless-vents", alice, "battlefield");
    const handBefore = requirePlayer(state, alice).hand.length;
    pushTrigger(state, vents.instanceId, alice, trig("restless-vents", "attacks"));
    settle(state);
    // Card-neutral: discarded one, drew one.
    expect(requirePlayer(state, alice).hand.length).toBe(handBefore);
    expect(requirePlayer(state, alice).hand.some((c) => c.definitionId === "forest")).toBe(true);
  });

  it("Restless Cottage makes a Food and exiles a graveyard card on attack", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const graveCard = createCardInstance(state, "willow-elf", alice, "graveyard");
    const cottage = createCardInstance(state, "restless-cottage", alice, "battlefield");
    pushTrigger(state, cottage.instanceId, alice, trig("restless-cottage", "attacks"));
    settle(state);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.definitionId === "token-food")).toBe(true);
    expect(requirePlayer(state, alice).exile.some((c) => c.instanceId === graveCard.instanceId)).toBe(true);
  });
});
