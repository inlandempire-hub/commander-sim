import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, moveCard } from "../state.js";
import { chooseTriggerTarget, putOntoBattlefield } from "../permanents.js";
import { applyEffect, resolveCardChoice, resolveAmountChoice, resolveSacrificeChoice } from "../effects.js";
import { resolveTopOfStack } from "../stack.js";
import { castSpell, playLand } from "../casting.js";
import { activateAbility, activateLoyaltyAbility } from "../abilities.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";
import { checkStateBasedActions } from "../sba.js";
import { effectivePower, effectiveToughness, effectiveActivated, typesOf } from "../counters.js";
import { advanceStep } from "../turn.js";
import type { GameState, StackTarget } from "../types.js";

/**
 * The 2026-08-13 sweep: poison, planeswalkers, copies, devour, and the two
 * questions that are neither a card nor a target.
 *
 * The assertions worth having here are the ones about what a thing *is* rather
 * than what it does - infect damage is not damage, a token copy is not a token
 * definition, and Grist is a creature everywhere except the battlefield.
 */

function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  return instance;
}

function drain(state: GameState): void {
  let guard = 60;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

function mainPhase(state: GameState): void {
  let guard = 20;
  while (state.phase !== "precombat-main" && guard-- > 0) advanceStep(state);
}

function fillPool(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId)!;
  player.manaPool.generic = 20;
  for (const color of ["W", "U", "B", "R", "G"] as const) player.manaPool[color] = 20;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
}

function castFromHand(
  state: GameState,
  definitionId: string,
  playerId: string,
  options: { targets?: StackTarget[]; chosenX?: number } = {},
) {
  const card = createCardInstance(state, definitionId, playerId, "hand");
  fillPool(state, playerId);
  castSpell(state, playerId, card.instanceId, options.targets ?? [], { chosenX: options.chosenX });
  return card;
}

/** Stocks a library so mill and draw have something to move. */
function stockLibrary(state: GameState, playerId: string, ids: string[]): void {
  for (const id of ids) createCardInstance(state, id, playerId, "library");
}

describe("infect changes what damage is", () => {
  it("Tainted Strike turns combat damage into poison counters", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);
    bear.summoningSickness = false;

    castFromHand(state, "tainted-strike", donny.id, {
      targets: [{ kind: "card", instanceId: bear.instanceId }],
    });
    drain(state);
    expect(effectivePower(state, bear)).toBe(3);

    let guard = 10;
    while (state.step !== "declare-attackers" && guard-- > 0) advanceStep(state);
    declareAttackers(state, donny.id, [
      { attackerInstanceId: bear.instanceId, defendingPlayerId: mike.id },
    ]);
    dealCombatDamage(state, "regular");

    // Not life loss: the life total is untouched and the poison is counted.
    expect(mike.life).toBe(40);
    expect(mike.poisonCounters).toBe(3);
  });

  it("deals -1/-1 counters to a creature, which regeneration cannot undo", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const spider = enters(state, "giant-spider", donny.id); // 2/4
    const attacker = enters(state, "grizzly-bears", donny.id);

    applyEffect(state, donny.id, attacker.instanceId, {
      kind: "pump",
      power: 0,
      toughness: 0,
      target: { kind: "creature" },
      grants: ["Infect"],
    }, [{ kind: "card", instanceId: attacker.instanceId }]);

    applyEffect(state, donny.id, attacker.instanceId, { kind: "damage", amount: 2, target: { kind: "creature" } }, [
      { kind: "card", instanceId: spider.instanceId },
    ]);

    // Counters, not marked damage - so the creature is genuinely smaller, and
    // it does not wear off at end of turn.
    expect(spider.minusOneCounters).toBe(2);
    expect(spider.damageMarked).toBe(0);
    expect(effectivePower(state, spider)).toBe(0);
    expect(effectiveToughness(state, spider)).toBe(2);
  });

  it("loses the game at ten poison counters", () => {
    const state = makeTestGame();
    const mike = state.players[1]!;
    mike.poisonCounters = 10;
    checkStateBasedActions(state);
    expect(mike.hasLost).toBe(true);
    expect(mike.lossReason).toContain("poison");
  });
});

describe("Grist is a creature everywhere except the battlefield", () => {
  it("reads as an Insect in the graveyard and as a planeswalker in play", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const inGraveyard = createCardInstance(state, "grist-the-hunger-tide", donny.id, "graveyard");

    /*
     * The opposite of every other characteristic-defining ability here: it
     * applies in every zone *but* play. A card that read `def.types` would
     * count Grist as a creature card on the battlefield and not in the
     * graveyard, which is exactly backwards.
     */
    expect(typesOf(state, inGraveyard)).toContain("Creature");

    const onBoard = enters(state, "grist-the-hunger-tide", donny.id);
    expect(typesOf(state, onBoard)).not.toContain("Creature");
    expect(onBoard.loyalty).toBe(3);
  });

  it("spends loyalty to activate, and only once a turn", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    stockLibrary(state, donny.id, ["forest", "forest", "forest"]);
    const grist = enters(state, "grist-the-hunger-tide", donny.id);
    state.priorityPlayerIndex = 0;

    activateLoyaltyAbility(state, donny.id, grist.instanceId, 0);
    drain(state);
    expect(grist.loyalty).toBe(4);
    // A Forest was milled, not an Insect, so the loop stopped after one round.
    expect(donny.battlefield.filter((c) => c.definitionId === "token-bg-11-insect")).toHaveLength(1);

    expect(() => activateLoyaltyAbility(state, donny.id, grist.instanceId, 0)).toThrow(
      /already used a loyalty ability/,
    );
  });

  it("refuses a minus ability it cannot pay for, and dies at zero", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const grist = enters(state, "grist-the-hunger-tide", donny.id);
    state.priorityPlayerIndex = 0;

    // The ultimate costs five and it has three.
    expect(() => activateLoyaltyAbility(state, donny.id, grist.instanceId, 2)).toThrow(/does not have 5 loyalty/);

    grist.loyalty = 5;
    for (let i = 0; i < 3; i++) createCardInstance(state, "grizzly-bears", donny.id, "graveyard");
    activateLoyaltyAbility(state, donny.id, grist.instanceId, 2);
    drain(state);
    checkStateBasedActions(state);

    expect(state.players[1]!.life).toBe(37);
    // Loyalty spent as the ability was activated, so it is gone by the time
    // state-based actions look.
    expect(findInstance(state, grist.instanceId)?.instance.zone).toBe("graveyard");
  });
});

describe("a token copy is a copy of a real card", () => {
  it("Scute Swarm makes an Insect below six lands and a copy of itself at six", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const swarm = enters(state, "scute-swarm", donny.id);
    state.priorityPlayerIndex = 0;
    for (let i = 0; i < 4; i++) enters(state, "forest", donny.id);
    drain(state);

    const fifth = createCardInstance(state, "forest", donny.id, "hand");
    playLand(state, donny.id, fifth.instanceId);
    drain(state);
    /*
     * Five Insects, not one: every land arriving is a landfall, including the
     * four put out to build the board. What matters is that all five were the
     * *token* branch - the Swarm has not copied itself yet.
     */
    expect(donny.battlefield.filter((c) => c.definitionId === "token-g-11-insect")).toHaveLength(5);
    expect(donny.battlefield.filter((c) => c.definitionId === "scute-swarm")).toHaveLength(1);

    const sixth = createCardInstance(state, "forest", donny.id, "hand");
    donny.landsPlayedThisTurn = 0;
    playLand(state, donny.id, sixth.instanceId);
    drain(state);

    const swarms = donny.battlefield.filter((c) => c.definitionId === "scute-swarm");
    expect(swarms).toHaveLength(2);
    // The copy is a token; the original is not. Flagged on the instance,
    // because the definition they share is a printed card.
    expect(swarms.filter((c) => c.isTokenCopy)).toHaveLength(1);
    expect(swarm.isTokenCopy).toBe(false);
  });

  it("the copy ceases to exist when it leaves, and the real one does not", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const real = enters(state, "scute-swarm", donny.id);
    applyEffect(state, donny.id, real.instanceId, { kind: "createCopyToken", of: "self" }, []);
    const copy = donny.battlefield.find((c) => c.isTokenCopy)!;

    moveCard(state, copy.instanceId, "graveyard");
    moveCard(state, real.instanceId, "graveyard");

    expect(donny.graveyard.map((c) => c.instanceId)).not.toContain(copy.instanceId);
    expect(donny.graveyard.map((c) => c.instanceId)).toContain(real.instanceId);
  });
});

describe("devour is asked as the creature arrives", () => {
  it("Ribtruss Roaster enters with a counter per creature given up", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const a = enters(state, "grizzly-bears", donny.id);
    const b = enters(state, "giant-spider", donny.id);

    const roaster = enters(state, "ribtruss-roaster", donny.id);
    expect(state.pendingCardChoices[0]?.max).toBe(2);

    resolveCardChoice(state, donny.id, [a.instanceId, b.instanceId]);
    expect(roaster.plusOneCounters).toBe(2);
    expect(findInstance(state, a.instanceId)?.instance.zone).toBe("graveyard");

    // The end step reads those counters.
    let guard = 20;
    while (state.step !== "end" && guard-- > 0) advanceStep(state);
    drain(state);
    expect(donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life")).toHaveLength(2);
  });

  it("declining devour costs nothing and places no counters", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "grizzly-bears", donny.id);
    const roaster = enters(state, "ribtruss-roaster", donny.id);

    resolveCardChoice(state, donny.id, []);
    expect(roaster.plusOneCounters).toBe(0);
    expect(state.pendingCardChoices).toHaveLength(0);
  });
});

describe("Necrodominance rewrites the turn", () => {
  it("skips the draw step and caps the hand at five", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    stockLibrary(state, donny.id, Array(20).fill("forest"));
    enters(state, "necrodominance", donny.id);
    for (let i = 0; i < 8; i++) createCardInstance(state, "forest", donny.id, "hand");
    const before = donny.hand.length;

    let guard = 30;
    while (state.phase !== "precombat-main" && guard-- > 0) advanceStep(state);
    // The draw step is behind us and it took nothing.
    expect(donny.hand.length).toBe(before);

    // The trim happens on the way *into* cleanup, so the check comes after it.
    guard = 30;
    while (state.step !== "cleanup" && guard-- > 0) advanceStep(state);
    expect(donny.hand.length).toBe(5);
  });

  it("pays life for cards, and exiles what would hit the graveyard", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    stockLibrary(state, donny.id, Array(10).fill("forest"));
    const necro = enters(state, "necrodominance", donny.id);
    const before = donny.hand.length;

    applyEffect(state, donny.id, necro.instanceId, { kind: "payLifeDrawThatMany" }, []);
    expect(state.pendingAmount?.max).toBe(39);
    resolveAmountChoice(state, donny.id, 4);
    expect(donny.life).toBe(36);
    expect(donny.hand.length).toBe(before + 4);

    // "Would be put into your graveyard from anywhere, exile it instead."
    const bear = enters(state, "grizzly-bears", donny.id);
    moveCard(state, bear.instanceId, "graveyard");
    expect(findInstance(state, bear.instanceId)?.instance.zone).toBe("exile");
    expect(donny.graveyard).toHaveLength(0);
  });
});

describe("counters that are not +1/+1", () => {
  it("Twitching Doll counts its nest counters, which change no stats", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const doll = enters(state, "twitching-doll", donny.id);
    doll.summoningSickness = false;
    state.priorityPlayerIndex = 0;

    // Three taps would need three untaps; the counters are placed by hand to
    // keep the test about what they *do* rather than about untapping.
    doll.otherCounters = 3;
    expect(effectivePower(state, doll)).toBe(2);

    const sacIndex = (state.cardDefinitions["twitching-doll"]!.activatedAbilities ?? []).findIndex(
      (a) => a.cost.sacrificeSelf,
    );
    activateAbility(state, donny.id, doll.instanceId, sacIndex);
    drain(state);

    expect(donny.battlefield.filter((c) => c.definitionId === "token-g-12-spider-reach")).toHaveLength(3);
  });

  it("the mana ability adds one each time it is used", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const doll = enters(state, "twitching-doll", donny.id);
    doll.summoningSickness = false;
    state.priorityPlayerIndex = 0;

    activateAbility(state, donny.id, doll.instanceId, 4); // the green half
    expect(donny.manaPool.G).toBe(1);
    expect(doll.otherCounters).toBe(1);
  });
});

describe("choices with a price, and abilities that were granted", () => {
  it("Ripples of Undeath mills three and sells one back", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    stockLibrary(state, donny.id, ["swamp", "forest", "grizzly-bears", "forest", "forest"]);
    enters(state, "ripples-of-undeath", donny.id);
    fillPool(state, donny.id);

    let guard = 20;
    while (state.phase !== "precombat-main" && guard-- > 0) advanceStep(state);
    drain(state);

    expect(donny.graveyard).toHaveLength(3);
    const choice = state.pendingCardChoices[0]!;
    expect(choice.candidateInstanceIds).toHaveLength(3);

    const wanted = choice.candidateInstanceIds[2]!;
    resolveCardChoice(state, donny.id, [wanted]);
    expect(findInstance(state, wanted)?.instance.zone).toBe("hand");
    expect(donny.life).toBe(37);
  });

  it("Springleaf Parade hands its tokens a mana ability nothing printed", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    castFromHand(state, "springleaf-parade", donny.id, { chosenX: 2 });
    drain(state);

    const shifters = donny.battlefield.filter(
      (c) => c.definitionId === "token-c-11-shapeshifter-changeling",
    );
    expect(shifters).toHaveLength(2);
    // Printed with none; granted five, one per colour.
    expect(state.cardDefinitions["token-c-11-shapeshifter-changeling"]!.activatedAbilities).toBeUndefined();
    expect(effectiveActivated(state, shifters[0]!)).toHaveLength(5);

    // A real card is not a token, so it gets nothing.
    const bear = enters(state, "grizzly-bears", donny.id);
    expect(effectiveActivated(state, bear)).toHaveLength(0);
  });

  it("Rishkar's Expertise draws off the biggest creature and casts one for free", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    stockLibrary(state, donny.id, Array(10).fill("forest"));
    enters(state, "giant-spider", donny.id); // power 2
    // Something castable in hand: a hand of nothing but lands has no spell to
    // offer, and the card would correctly do nothing.
    createCardInstance(state, "grizzly-bears", donny.id, "hand");
    const before = donny.hand.length;

    castFromHand(state, "rishkars-expertise", donny.id);
    drain(state);

    // Two cards drawn, and then the offer over a hand that now holds them.
    expect(donny.hand.length).toBeGreaterThan(before);
    const choice = state.pendingCardChoices[0];
    expect(choice?.mode).toBe("cast-free");
  });
});
