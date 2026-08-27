import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, drawCard, requirePlayer } from "../state.js";
import { controllerMeets } from "../conditions.js";
import { castCostReduction } from "../casting.js";
import { applyEffect } from "../effects.js";
import { isValidTarget } from "../targeting.js";
import { checkStateBasedActions } from "../sba.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

function settle(state: GameState): void {
  let guard = 0;
  while (state.stack.length > 0 && guard++ < 50) resolveTopOfStack(state);
}

function stockLibrary(state: GameState, playerId: string, n = 5): void {
  const p = requirePlayer(state, playerId);
  p.library = [];
  for (let i = 0; i < n; i++) createCardInstance(state, "swamp", playerId, "library");
}

describe("Winter batch 2: new board conditions", () => {
  it("controls-lands basic counts only basic lands", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    createCardInstance(state, "swamp", alice, "battlefield");
    createCardInstance(state, "rockfall-vale", alice, "battlefield"); // nonbasic
    expect(controllerMeets(state, alice, { kind: "controls-lands", count: 2, basic: true })).toBe(false);
    createCardInstance(state, "forest", alice, "battlefield");
    expect(controllerMeets(state, alice, { kind: "controls-lands", count: 2, basic: true })).toBe(true);
  });

  it("any-player-life-at-most reads every player", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    expect(controllerMeets(state, alice, { kind: "any-player-life-at-most", life: 13 })).toBe(false);
    state.players[1]!.life = 13;
    expect(controllerMeets(state, alice, { kind: "any-player-life-at-most", life: 13 })).toBe(true);
  });

  it("creature-cards-in-graveyard counts creature cards only", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    for (let i = 0; i < 4; i++) createCardInstance(state, "willow-elf", alice, "graveyard");
    createCardInstance(state, "swamp", alice, "graveyard");
    expect(controllerMeets(state, alice, { kind: "creature-cards-in-graveyard", count: 4 })).toBe(true);
    expect(controllerMeets(state, alice, { kind: "creature-cards-in-graveyard", count: 5 })).toBe(false);
  });
});

describe("Winter batch 2: spell cost reduction", () => {
  it("Blasphemous Act costs {1} less per creature on the battlefield", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    for (let i = 0; i < 3; i++) createCardInstance(state, "willow-elf", alice, "battlefield");
    createCardInstance(state, "willow-elf", state.players[1]!.id, "battlefield");
    const def = TEST_CARD_DEFINITIONS["blasphemous-act"]!;
    const reduced = castCostReduction(state, alice, def, def.manaCost!);
    expect(reduced.generic).toBe(8 - 4);
    expect(reduced.colors.R).toBe(1); // the coloured pip survives
  });

  it("Mortality Spear costs {2} less only if you gained life this turn", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const def = TEST_CARD_DEFINITIONS["mortality-spear"]!;
    expect(castCostReduction(state, alice, def, def.manaCost!).generic).toBe(2);
    requirePlayer(state, alice).lifeGainedThisTurn = 3;
    expect(castCostReduction(state, alice, def, def.manaCost!).generic).toBe(0);
  });

  it("Overwhelming Remorse costs {1} less per creature card in the graveyard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    for (let i = 0; i < 3; i++) createCardInstance(state, "willow-elf", alice, "graveyard");
    const def = TEST_CARD_DEFINITIONS["overwhelming-remorse"]!;
    expect(castCostReduction(state, alice, def, def.manaCost!).generic).toBe(4 - 3);
  });
});

describe("Winter batch 2: new effects", () => {
  it("Exsanguinate drains each opponent and gains the total lost", () => {
    const state = makeTestGame(["alice", "bob", "carol"]);
    const alice = state.players[0]!.id;
    const src = createCardInstance(state, "exsanguinate", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "drain", amount: 3 }, []);
    expect(requirePlayer(state, "bob").life).toBe(37);
    expect(requirePlayer(state, "carol").life).toBe(37);
    expect(requirePlayer(state, alice).life).toBe(46); // 40 + 3 + 3
  });

  it("Blasphemous Act's damageAll deals 13 to every creature", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    createCardInstance(state, "willow-elf", alice, "battlefield");
    createCardInstance(state, "willow-elf", state.players[1]!.id, "battlefield");
    const src = createCardInstance(state, "blasphemous-act", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "damageAll", amount: 13 }, []);
    checkStateBasedActions(state);
    expect(requirePlayer(state, alice).battlefield.length).toBe(0);
    expect(requirePlayer(state, "bob").battlefield.length).toBe(0);
  });

  it("Aftermath Analyst returns every land card from the graveyard tapped", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    createCardInstance(state, "swamp", alice, "graveyard");
    createCardInstance(state, "forest", alice, "graveyard");
    createCardInstance(state, "willow-elf", alice, "graveyard"); // stays behind
    const src = createCardInstance(state, "aftermath-analyst", alice, "graveyard");
    applyEffect(
      state,
      alice,
      src.instanceId,
      { kind: "returnAllFromGraveyard", cardType: "Land", destination: "battlefield", tapped: true },
      [],
    );
    const lands = requirePlayer(state, alice).battlefield.filter((c) => c.definitionId === "swamp" || c.definitionId === "forest");
    expect(lands.length).toBe(2);
    expect(lands.every((l) => l.tapped)).toBe(true);
    expect(requirePlayer(state, alice).graveyard.some((c) => c.definitionId === "willow-elf")).toBe(true);
  });

  it("Noxious Gearhulk destroys a creature and gains life equal to its toughness", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const gearhulk = createCardInstance(state, "noxious-gearhulk", alice, "battlefield");
    const victim = createCardInstance(state, "norwood-ranger", state.players[1]!.id, "battlefield"); // 1/2
    const before = requirePlayer(state, alice).life;
    const toughness = TEST_CARD_DEFINITIONS[victim.definitionId]!.toughness ?? 0;
    applyEffect(
      state,
      alice,
      gearhulk.instanceId,
      TEST_CARD_DEFINITIONS["noxious-gearhulk"]!.triggeredAbilities![0]!.effect,
      [{ kind: "card", instanceId: victim.instanceId }],
    );
    expect(requirePlayer(state, state.players[1]!.id).graveyard.some((c) => c.instanceId === victim.instanceId)).toBe(true);
    expect(requirePlayer(state, alice).life).toBe(before + toughness);
  });
});

describe("Winter batch 2: draw watchers", () => {
  it("Scrawling Crawler drains an opponent whenever they draw", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    stockLibrary(state, bob);
    createCardInstance(state, "scrawling-crawler", alice, "battlefield");
    drawCard(state, bob, 1);
    settle(state);
    expect(requirePlayer(state, bob).life).toBe(39);
    // The controller's own draw does not drain them.
    stockLibrary(state, alice);
    drawCard(state, alice, 1);
    settle(state);
    expect(requirePlayer(state, alice).life).toBe(40);
  });

  it("Spiteful Visions deals 1 damage to any player who draws", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    stockLibrary(state, bob);
    createCardInstance(state, "spiteful-visions", alice, "battlefield");
    drawCard(state, bob, 1);
    settle(state);
    expect(requirePlayer(state, bob).life).toBe(39);
  });

  it("Howling Mine's extra draw goes to whoever's draw step it is", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    stockLibrary(state, bob);
    const mine = createCardInstance(state, "howling-mine", alice, "battlefield");
    state.activePlayerIndex = 1; // bob's turn
    const before = requirePlayer(state, bob).hand.length;
    applyEffect(state, alice, mine.instanceId, { kind: "draw", amount: 1, who: "active-player" }, []);
    expect(requirePlayer(state, bob).hand.length).toBe(before + 1);
  });
});

describe("Winter batch 3: commander and spells", () => {
  it("Winter's delirium shrinks each opponent's max hand size in cleanup", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    createCardInstance(state, "winter-misanthropic-guide", alice, "battlefield");
    // Four card types in Winter's controller's graveyard -> opponent limit 3.
    createCardInstance(state, "willow-elf", alice, "graveyard"); // Creature
    createCardInstance(state, "swamp", alice, "graveyard"); // Land
    createCardInstance(state, "rakdos-charm", alice, "graveyard"); // Instant
    createCardInstance(state, "spiteful-visions", alice, "graveyard"); // Enchantment
    for (let i = 0; i < 6; i++) createCardInstance(state, "swamp", bob, "hand");
    for (let i = 0; i < 6; i++) createCardInstance(state, "swamp", alice, "hand");
    // Advance from the end step into cleanup, which runs the discard-to-hand-
    // size pass as it is entered.
    state.phase = "ending";
    state.step = "end";
    advanceStep(state);
    // Bob is trimmed to 3 by Winter's delirium; Winter's own controller keeps 6.
    expect(requirePlayer(state, bob).hand.length).toBe(3);
    expect(requirePlayer(state, alice).hand.length).toBe(6);
  });

  it("Rakdos Charm's third mode pings every creature's controller", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    createCardInstance(state, "willow-elf", alice, "battlefield");
    createCardInstance(state, "willow-elf", alice, "battlefield");
    createCardInstance(state, "willow-elf", bob, "battlefield");
    const src = createCardInstance(state, "rakdos-charm", alice, "graveyard");
    applyEffect(state, alice, src.instanceId, { kind: "eachCreatureDamagesController", amount: 1 }, []);
    expect(requirePlayer(state, alice).life).toBe(38); // two creatures
    expect(requirePlayer(state, bob).life).toBe(39); // one creature
  });

  it("Pulse of Murasa can return a land or a creature, from any graveyard", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const bob = state.players[1]!.id;
    const land = createCardInstance(state, "swamp", alice, "graveyard");
    const oppCreature = createCardInstance(state, "willow-elf", bob, "graveyard");
    const selector = {
      kind: "card-in-your-graveyard" as const,
      cardTypes: ["Creature", "Land"] as ("Creature" | "Land")[],
      anyGraveyard: true,
    };
    expect(isValidTarget(state, selector, { kind: "card", instanceId: land.instanceId }, alice)).toBe(true);
    expect(isValidTarget(state, selector, { kind: "card", instanceId: oppCreature.instanceId }, alice)).toBe(true);
    // An instant in the graveyard is not a legal target.
    const inst = createCardInstance(state, "rakdos-charm", alice, "graveyard");
    expect(isValidTarget(state, selector, { kind: "card", instanceId: inst.instanceId }, alice)).toBe(false);
  });
});

describe("Winter batch 2: targeting", () => {
  it("Eyeblight's Ending cannot target an Elf but can target a non-Elf", () => {
    const state = makeTestGame();
    const alice = state.players[0]!.id;
    const elf = createCardInstance(state, "willow-elf", state.players[1]!.id, "battlefield");
    const nonElf = createCardInstance(state, "stormfist-crusader", state.players[1]!.id, "battlefield");
    const selector = { kind: "creature" as const, excludeSubtypes: ["Elf"] };
    expect(isValidTarget(state, selector, { kind: "card", instanceId: elf.instanceId }, alice)).toBe(false);
    expect(isValidTarget(state, selector, { kind: "card", instanceId: nonElf.instanceId }, alice)).toBe(true);
  });
});
