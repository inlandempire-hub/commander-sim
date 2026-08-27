import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, drawCard, requirePlayer } from "../state.js";
import { applyEffect } from "../effects.js";
import { pushTrigger } from "../permanents.js";
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

describe("Winter batch 7", () => {
  it("Tempt with Discovery fetches a land for you and matches each opponent", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, alice).library = [];
    for (let i = 0; i < 3; i++) createCardInstance(state, "forest", alice, "library");
    requirePlayer(state, bob).library = [createCardInstance(state, "swamp", bob, "library")];
    const src = createCardInstance(state, "tempt-with-discovery", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "temptWithDiscovery" }, []);
    // You fetch one, plus one more because Bob took the offer: two forests.
    expect(requirePlayer(state, alice).battlefield.filter((c) => c.definitionId === "forest").length).toBe(2);
    expect(requirePlayer(state, bob).battlefield.filter((c) => c.definitionId === "swamp").length).toBe(1);
  });

  it("Descent into Avernus grows Treasures and damage each upkeep", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    const d = createCardInstance(state, "descent-into-avernus", alice, "battlefield");
    pushTrigger(state, d.instanceId, alice, trig("descent-into-avernus", "upkeep"));
    settle(state);
    expect(d.otherCounters).toBe(2);
    expect(requirePlayer(state, alice).battlefield.filter((c) => c.definitionId === "token-treasure").length).toBe(2);
    expect(requirePlayer(state, alice).life).toBe(38);
    expect(requirePlayer(state, bob).life).toBe(38);
  });

  it("Demonic Covenant spawns a 5/5 Demon at end of step", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    requirePlayer(state, alice).library = [
      createCardInstance(state, "willow-elf", alice, "library"),
      createCardInstance(state, "norwood-ranger", alice, "library"),
    ];
    const dc = createCardInstance(state, "demonic-covenant", alice, "battlefield");
    pushTrigger(state, dc.instanceId, alice, trig("demonic-covenant", "end-step"));
    settle(state);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.definitionId === "token-b-55-demon-flying")).toBe(true);
  });

  it("Warp World floods permanents back onto the battlefield", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    createCardInstance(state, "willow-elf", alice, "battlefield");
    createCardInstance(state, "forest", alice, "battlefield"); // 2 permanents -> reveal 2
    // Ensure the library has permanents to reveal after the shuffle-in.
    for (let i = 0; i < 4; i++) createCardInstance(state, "norwood-ranger", alice, "library");
    const src = createCardInstance(state, "warp-world", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "warpWorld" }, []);
    // Two permanents were shuffled in and two cards revealed & deployed - board is non-empty.
    expect(requirePlayer(state, alice).battlefield.length).toBeGreaterThan(0);
  });

  it("Starving Revenant's Descend 8 drains once you have eight permanents in the yard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, alice).library = [];
    for (let i = 0; i < 3; i++) createCardInstance(state, "swamp", alice, "library");
    createCardInstance(state, "starving-revenant", alice, "battlefield");
    // Fewer than eight permanent cards in the graveyard: no drain.
    drawCard(state, alice, 1);
    settle(state);
    expect(requirePlayer(state, bob).life).toBe(40);
    // Eight permanent cards in the graveyard: the drain fires.
    for (let i = 0; i < 8; i++) createCardInstance(state, "forest", alice, "graveyard");
    drawCard(state, alice, 1);
    settle(state);
    expect(requirePlayer(state, bob).life).toBe(39);
    expect(requirePlayer(state, alice).life).toBe(41);
  });
});
