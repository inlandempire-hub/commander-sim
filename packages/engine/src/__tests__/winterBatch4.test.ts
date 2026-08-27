import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, drawCard, requirePlayer } from "../state.js";
import { applyEffect } from "../effects.js";
import { enteredBattlefield, pushTrigger } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { checkStateBasedActions } from "../sba.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

function settle(state: GameState): void {
  let guard = 0;
  while (state.stack.length > 0 && guard++ < 60) resolveTopOfStack(state);
}
function stock(state: GameState, playerId: string, id = "swamp", n = 6): void {
  const p = requirePlayer(state, playerId);
  p.library = [];
  for (let i = 0; i < n; i++) createCardInstance(state, id, playerId, "library");
}
function trig(defId: string, event: string) {
  return TEST_CARD_DEFINITIONS[defId]!.triggeredAbilities!.find((t) => t.event === event)!;
}

describe("Winter batch 4", () => {
  it("Elder Gargaroth's attacks-or-blocks modal makes a 3/3 Beast (engine picks the first mode)", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const g = createCardInstance(state, "elder-gargaroth", alice, "battlefield");
    pushTrigger(state, g.instanceId, alice, trig("elder-gargaroth", "attacks-or-blocks"));
    settle(state);
    const beasts = requirePlayer(state, alice).battlefield.filter((c) => c.definitionId === "token-g-33-beast");
    expect(beasts.length).toBe(1);
  });

  it("Twilight Prophet drains by the revealed card's mana value", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    requirePlayer(state, alice).library = [];
    createCardInstance(state, "noxious-gearhulk", alice, "library"); // top, mana value 6
    requirePlayer(state, alice).hasCitysBlessing = true;
    const p = createCardInstance(state, "twilight-prophet", alice, "battlefield");
    pushTrigger(state, p.instanceId, alice, trig("twilight-prophet", "upkeep"));
    settle(state);
    expect(requirePlayer(state, bob).life).toBe(34);
    expect(requirePlayer(state, alice).life).toBe(46);
    expect(requirePlayer(state, alice).hand.some((c) => c.definitionId === "noxious-gearhulk")).toBe(true);
  });

  it("Gixian Puppeteer drains on the second draw each turn, and reanimates on death", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    stock(state, alice);
    createCardInstance(state, "gixian-puppeteer", alice, "battlefield");
    drawCard(state, alice, 1);
    settle(state);
    expect(requirePlayer(state, bob).life).toBe(40); // first draw: nothing
    drawCard(state, alice, 1);
    settle(state);
    expect(requirePlayer(state, bob).life).toBe(38); // second draw: -2
    expect(requirePlayer(state, alice).life).toBe(42); // +2

    // Death reanimates a small creature from the graveyard.
    createCardInstance(state, "willow-elf", alice, "graveyard"); // mana value 1
    const dying = createCardInstance(state, "gixian-puppeteer", alice, "battlefield");
    pushTrigger(state, dying.instanceId, alice, trig("gixian-puppeteer", "dies"));
    settle(state);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.definitionId === "willow-elf")).toBe(true);
  });

  it("Liliana reanimates as a Zombie that her -7 then spares", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const lili = TEST_CARD_DEFINITIONS["liliana-deaths-majesty"]!;
    const src = createCardInstance(state, "liliana-deaths-majesty", alice, "battlefield");
    createCardInstance(state, "willow-elf", alice, "graveyard");
    // -3: reanimate the Elf as a black Zombie.
    applyEffect(state, alice, src.instanceId, lili.loyaltyAbilities![1]!.effect, [
      { kind: "card", instanceId: requirePlayer(state, alice).graveyard[0]!.instanceId },
    ]);
    const elf = requirePlayer(state, alice).battlefield.find((c) => c.definitionId === "willow-elf")!;
    expect(elf.grantedSubtypes).toContain("Zombie");
    // A plain non-Zombie creature to contrast.
    createCardInstance(state, "norwood-ranger", alice, "battlefield");
    // -7: destroy all non-Zombie creatures.
    applyEffect(state, alice, src.instanceId, lili.loyaltyAbilities![2]!.effect, []);
    checkStateBasedActions(state);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.definitionId === "willow-elf")).toBe(true);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.definitionId === "norwood-ranger")).toBe(false);
  });

  it("Grisly Salvage takes a creature/land to hand and mills the rest", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    requirePlayer(state, alice).library = [];
    createCardInstance(state, "rakdos-charm", alice, "library"); // Instant - milled
    createCardInstance(state, "willow-elf", alice, "library"); // Creature - taken
    createCardInstance(state, "swamp", alice, "library");
    createCardInstance(state, "rakdos-charm", alice, "library");
    createCardInstance(state, "spiteful-visions", alice, "library");
    const src = createCardInstance(state, "grisly-salvage", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, TEST_CARD_DEFINITIONS["grisly-salvage"]!.castEffect!, []);
    expect(requirePlayer(state, alice).hand.some((c) => c.definitionId === "willow-elf")).toBe(true);
    expect(requirePlayer(state, alice).graveyard.filter((c) => c.definitionId !== "grisly-salvage").length).toBe(4);
  });

  it("Veteran Explorer fetches up to two basics for each player on death", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    for (const p of [alice, bob]) {
      requirePlayer(state, p).library = [];
      for (let i = 0; i < 3; i++) createCardInstance(state, "forest", p, "library");
    }
    const ve = createCardInstance(state, "veteran-explorer", alice, "battlefield");
    pushTrigger(state, ve.instanceId, alice, trig("veteran-explorer", "dies"));
    settle(state);
    expect(requirePlayer(state, alice).battlefield.filter((c) => c.definitionId === "forest").length).toBe(2);
    expect(requirePlayer(state, bob).battlefield.filter((c) => c.definitionId === "forest").length).toBe(2);
  });

  it("Old Rutstein makes a token keyed to the milled card's type", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    requirePlayer(state, alice).library = [];
    createCardInstance(state, "willow-elf", alice, "library"); // creature -> Insect
    const r = createCardInstance(state, "old-rutstein", alice, "battlefield");
    enteredBattlefield(state, r);
    pushTrigger(state, r.instanceId, alice, trig("old-rutstein", "enters-battlefield"));
    settle(state);
    expect(requirePlayer(state, alice).battlefield.some((c) => c.definitionId === "token-g-11-insect")).toBe(true);
  });
});
