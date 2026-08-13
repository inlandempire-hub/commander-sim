import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, moveCard } from "../state.js";
import { chooseTriggerTarget, putOntoBattlefield } from "../permanents.js";
import { applyEffect } from "../effects.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { castSpell, playLand } from "../casting.js";
import { activateAbility, activatableAbilities } from "../abilities.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";
import { damageCreature } from "../damage.js";
import { checkStateBasedActions } from "../sba.js";
import { effectivePower, effectiveToughness, hasKeyword } from "../counters.js";
import { advanceStep } from "../turn.js";
import type { GameState, StackTarget } from "../types.js";

/**
 * The 2026-08-13 batch: modal double-faced cards, numbers counted off the board
 * at resolution, and the first Equipment.
 *
 * The interesting assertions here are the ones about *when* a number is read.
 * X is settled at cast time and a count is not, and the difference is a card
 * drawing one fewer because a creature died in response.
 */

function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  return instance;
}

function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

function mainPhase(state: GameState): void {
  let guard = 20;
  while (state.phase !== "precombat-main" && guard-- > 0) advanceStep(state);
}

function castFromHand(
  state: GameState,
  definitionId: string,
  playerId: string,
  options: { mode?: number; targets?: StackTarget[] } = {},
) {
  const card = createCardInstance(state, definitionId, playerId, "hand");
  const player = state.players.find((p) => p.id === playerId)!;
  player.manaPool.generic = (player.manaPool.generic ?? 0) + 20;
  for (const color of ["W", "U", "B", "R", "G"] as const) player.manaPool[color] = 20;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  castSpell(state, playerId, card.instanceId, options.targets ?? [], { chosenMode: options.mode });
  return card;
}

describe("modal double-faced cards", () => {
  it("plays the back face as a land, and it really is that land", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const card = createCardInstance(state, "bala-ged-recovery", donny.id, "hand");

    playLand(state, donny.id, card.instanceId);

    const onBoard = donny.battlefield.find((c) => c.instanceId === card.instanceId)!;
    // Not "a Sorcery sitting on the battlefield" - it is the land.
    expect(onBoard.definitionId).toBe("bala-ged-sanctuary");
    expect(state.cardDefinitions[onBoard.definitionId]!.types).toContain("Land");
    expect(onBoard.tapped).toBe(true); // Bala Ged Sanctuary enters tapped
  });

  it("turns back over when it leaves the battlefield", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const card = createCardInstance(state, "bala-ged-recovery", donny.id, "hand");
    playLand(state, donny.id, card.instanceId);

    // Destroyed, milled, bounced - any way out. A card in a graveyard has its
    // front face's characteristics, so this goes through the one door every
    // zone change uses.
    moveCard(state, card.instanceId, "graveyard");

    const inGraveyard = donny.graveyard.find((c) => c.instanceId === card.instanceId);
    expect(inGraveyard?.definitionId).toBe("bala-ged-recovery");
  });

  it("casts the front face as an ordinary spell", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const buried = createCardInstance(state, "grizzly-bears", donny.id, "graveyard");

    castFromHand(state, "bala-ged-recovery", donny.id, {
      targets: [{ kind: "card", instanceId: buried.instanceId }],
    });
    drain(state);

    expect(donny.hand.some((c) => c.instanceId === buried.instanceId)).toBe(true);
  });

  it("offers the shockland question on the back of Boggart Trawler", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const before = donny.life;
    const card = createCardInstance(state, "boggart-trawler", donny.id, "hand");

    playLand(state, donny.id, card.instanceId);
    expect(state.pendingConfirmation?.prompt).toContain("pay 3 life");

    resolveConfirmation(state, donny.id, true);
    expect(donny.life).toBe(before - 3);
    expect(donny.battlefield.find((c) => c.instanceId === card.instanceId)!.tapped).toBe(false);
  });

  it("exiles a whole graveyard from the front of Boggart Trawler", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    mainPhase(state);
    createCardInstance(state, "grizzly-bears", mike.id, "graveyard");
    createCardInstance(state, "swamp", mike.id, "graveyard");

    const trawler = createCardInstance(state, "boggart-trawler", donny.id, "hand");
    donny.manaPool.generic = 20;
    donny.manaPool.B = 20;
    castSpell(state, donny.id, trawler.instanceId, []);
    drain(state);
    // One legal target each side, so the engine asks; aim it at Mike.
    if (state.pendingTargetChoices.length > 0) {
      chooseTriggerTarget(state, donny.id, { kind: "player", playerId: mike.id });
      drain(state);
    }

    expect(mike.graveyard).toHaveLength(0);
    expect(mike.exile).toHaveLength(2);
  });
});

describe("numbers counted when the effect resolves", () => {
  it("Inspiring Call draws one card per creature carrying a counter", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 4; i++) createCardInstance(state, "grizzly-bears", donny.id, "library");
    const a = enters(state, "grizzly-bears", donny.id);
    const b = enters(state, "grizzly-bears", donny.id);
    const c = enters(state, "grizzly-bears", donny.id);
    drain(state);
    a.plusOneCounters = 1;
    b.plusOneCounters = 2;
    // `c` has none, so it is neither counted nor shielded.
    const handBefore = donny.hand.length;

    castFromHand(state, "inspiring-call", donny.id);
    drain(state);

    expect(donny.hand.length).toBe(handBefore + 2);
    expect(hasKeyword(state, a, "Indestructible")).toBe(true);
    expect(hasKeyword(state, b, "Indestructible")).toBe(true);
    expect(hasKeyword(state, c, "Indestructible")).toBe(false);
  });

  it("Return of the Wildspeaker reads the greatest power, ignoring Humans", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 6; i++) createCardInstance(state, "grizzly-bears", donny.id, "library");
    const bear = enters(state, "grizzly-bears", donny.id); // 2/2 Bear
    enters(state, "hornet-nest", donny.id); // 0/2 Insect
    drain(state);
    bear.plusOneCounters = 3; // now a 5/5, and the greatest power
    const handBefore = donny.hand.length;

    castFromHand(state, "return-of-the-wildspeaker", donny.id, { mode: 0 });
    drain(state);

    expect(donny.hand.length).toBe(handBefore + 5);
  });

  it("pumps only the non-Humans", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);
    const human = enters(state, "tomakul-honor-guard", donny.id); // a Human
    drain(state);
    const bearPower = effectivePower(state, bear);
    const humanPower = effectivePower(state, human);

    castFromHand(state, "return-of-the-wildspeaker", donny.id, { mode: 1 });
    drain(state);

    expect(effectivePower(state, bear)).toBe(bearPower + 3);
    expect(effectivePower(state, human)).toBe(humanPower);
  });

  it("Iridescent Hornbeetle pays for counters even after the creature dies", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const beetle = enters(state, "iridescent-hornbeetle", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);
    drain(state);

    // Three counters put on a creature this turn, through the engine so the
    // tally sees them.
    applyEffect(state, donny.id, beetle.instanceId, { kind: "addCounter", amount: 3 }, [
      { kind: "card", instanceId: bear.instanceId },
    ]);
    expect(donny.plusOneCountersPlacedThisTurn).toBe(3);

    // Then it dies. A card that read the *board* would now make nothing; the
    // Hornbeetle reads what it put on, so it still makes three.
    damageCreature(state, bear, 99);
    checkStateBasedActions(state);
    drain(state);

    let guard = 30;
    while (state.step !== "end" && guard-- > 0) advanceStep(state);
    drain(state);

    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-g-11-insect"),
    ).toHaveLength(3);
  });

  it("and the tally resets with the turn", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const beetle = enters(state, "iridescent-hornbeetle", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);
    drain(state);
    applyEffect(state, donny.id, beetle.instanceId, { kind: "addCounter", amount: 2 }, [
      { kind: "card", instanceId: bear.instanceId },
    ]);
    expect(donny.plusOneCountersPlacedThisTurn).toBe(2);

    let guard = 40;
    while (state.turnNumber === 1 && guard-- > 0) advanceStep(state);

    expect(donny.plusOneCountersPlacedThisTurn).toBe(0);
  });
});

describe("Feral Appetite", () => {
  it("exiles from anybody's graveyard and pays only for a creature", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    mainPhase(state);
    enters(state, "feral-appetite", donny.id);
    drain(state);
    const theirLand = createCardInstance(state, "swamp", mike.id, "graveyard");
    donny.manaPool.generic = 20;
    donny.manaPool.G = 20;

    // A land: exiled, and no Pest.
    activateAbility(state, donny.id, donny.battlefield[0]!.instanceId, 0, [
      { kind: "card", instanceId: theirLand.instanceId },
    ]);
    drain(state);
    expect(mike.graveyard).toHaveLength(0);
    expect(donny.battlefield.filter((c) => c.definitionId.startsWith("token-bg-11-pest"))).toHaveLength(0);

    // A creature: exiled, and a Pest arrives.
    const theirBear = createCardInstance(state, "grizzly-bears", mike.id, "graveyard");
    donny.manaPool.generic = 20;
    donny.manaPool.G = 20;
    activateAbility(state, donny.id, donny.battlefield[0]!.instanceId, 0, [
      { kind: "card", instanceId: theirBear.instanceId },
    ]);
    drain(state);
    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life"),
    ).toHaveLength(1);
  });
});

describe("Skullclamp", () => {
  it("buffs only what it is attached to, and nothing while it sits alone", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const clamp = enters(state, "skullclamp", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);
    const other = enters(state, "grizzly-bears", donny.id);
    drain(state);

    // Unattached: an Equipment is not an anthem.
    expect(effectivePower(state, bear)).toBe(2);
    expect(effectivePower(state, other)).toBe(2);

    donny.manaPool.generic = 20;
    activateAbility(state, donny.id, clamp.instanceId, 0, [
      { kind: "card", instanceId: bear.instanceId },
    ]);
    drain(state);

    expect(clamp.attachedTo).toBe(bear.instanceId);
    expect(effectivePower(state, bear)).toBe(3);
    expect(effectiveToughness(state, bear)).toBe(1);
    expect(effectivePower(state, other)).toBe(2);
  });

  it("draws two when the equipped creature dies, and not for any other", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 5; i++) createCardInstance(state, "swamp", donny.id, "library");
    const clamp = enters(state, "skullclamp", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);
    const other = enters(state, "grizzly-bears", donny.id);
    drain(state);
    donny.manaPool.generic = 20;
    activateAbility(state, donny.id, clamp.instanceId, 0, [
      { kind: "card", instanceId: bear.instanceId },
    ]);
    drain(state);

    // The unequipped one dying draws nothing.
    let handBefore = donny.hand.length;
    damageCreature(state, other, 99);
    checkStateBasedActions(state);
    drain(state);
    expect(donny.hand.length).toBe(handBefore);

    handBefore = donny.hand.length;
    damageCreature(state, bear, 99);
    checkStateBasedActions(state);
    drain(state);
    expect(donny.hand.length).toBe(handBefore + 2);
    // And the Equipment has fallen off.
    expect(clamp.attachedTo).toBeUndefined();
  });

  it("cannot be equipped at instant speed", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const clamp = enters(state, "skullclamp", donny.id);
    enters(state, "grizzly-bears", donny.id);
    drain(state);
    donny.manaPool.generic = 20;

    // Still in the beginning phase - "equip only as a sorcery".
    expect(activatableAbilities(state, donny.id, clamp.instanceId)).toEqual([]);
  });
});

describe("Arachnogenesis", () => {
  it("makes a Spider per attacker and fogs everything else", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    // Mike attacks with two bears; Donny is the defender.
    state.activePlayerIndex = 1;
    const a = enters(state, "grizzly-bears", mike.id);
    const b = enters(state, "grizzly-bears", mike.id);
    for (const c of [a, b]) c.summoningSickness = false;
    drain(state);

    let guard = 20;
    while (state.step !== "declare-attackers" && guard-- > 0) advanceStep(state);
    declareAttackers(state, mike.id, [
      { attackerInstanceId: a.instanceId, defendingPlayerId: donny.id },
      { attackerInstanceId: b.instanceId, defendingPlayerId: donny.id },
    ]);
    drain(state);

    castFromHand(state, "arachnogenesis", donny.id);
    drain(state);

    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-g-12-spider-reach"),
    ).toHaveLength(2);

    const lifeBefore = donny.life;
    dealCombatDamage(state);
    // Both bears are fogged - they are not Spiders.
    expect(donny.life).toBe(lifeBefore);
  });
});
