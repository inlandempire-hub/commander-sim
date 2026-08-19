import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, moveCard, requirePlayer } from "../state.js";
import { enteredBattlefield, putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { advanceStep } from "../turn.js";
import { applyEffect } from "../effects.js";
import { playLand } from "../casting.js";
import { hasKeyword } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

function game(): { state: GameState; me: string; them: string } {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return { state, me: state.players[0]!.id, them: state.players[1]!.id };
}

function put(state: GameState, definitionId: string, playerId: string): CardInstance {
  const instance = createCardInstance(state, definitionId, playerId, "battlefield");
  enteredBattlefield(state, instance);
  instance.summoningSickness = false;
  return instance;
}

function settle(state: GameState): void {
  for (const choice of state.pendingTargetChoices) state.stack.push(choice.object);
  state.pendingTargetChoices = [];
  let guard = 0;
  while (state.stack.length > 0 && guard++ < 50) resolveTopOfStack(state);
}

function named(state: GameState, playerId: string, name: string): CardInstance[] {
  return requirePlayer(state, playerId).battlefield.filter(
    (c) => state.cardDefinitions[c.definitionId]?.name === name,
  );
}

/**
 * Emeria's Call - and the one word that makes it worth seven mana: the shield
 * is "until **your next turn**", so it has to survive somebody else's.
 */
describe("Emeria's Call", () => {
  it("makes two 4/4 fliers", () => {
    const { state, me } = game();
    applyEffect(state, me, "source", state.cardDefinitions["emerias-call"]!.castEffect!, []);
    const angels = named(state, me, "Angel Warrior");
    expect(angels).toHaveLength(2);
    expect(hasKeyword(state, angels[0]!, "Flying")).toBe(true);
  });

  it("shields everything except the Angels it just made", () => {
    const { state, me } = game();
    const bear = put(state, "grizzly-bears", me);
    applyEffect(state, me, "source", state.cardDefinitions["emerias-call"]!.castEffect!, []);

    expect(hasKeyword(state, bear, "Indestructible")).toBe(true);
    // "**Non-Angel** creatures" - the 4/4s are meant to survive on their own.
    for (const angel of named(state, me, "Angel Warrior")) {
      expect(hasKeyword(state, angel, "Indestructible")).toBe(false);
    }
  });

  it("keeps the shield through the opponent's whole turn", () => {
    const { state, me } = game();
    const bear = put(state, "grizzly-bears", me);
    applyEffect(state, me, "source", state.cardDefinitions["emerias-call"]!.castEffect!, []);

    // To the end of my turn, and on through theirs.
    state.phase = "ending";
    state.step = "cleanup";
    advanceStep(state);
    expect(state.players[state.activePlayerIndex]!.id).not.toBe(me);
    expect(hasKeyword(state, bear, "Indestructible")).toBe(true);

    state.phase = "ending";
    state.step = "cleanup";
    advanceStep(state);
    // Their cleanup has run and mine has not; the shield is still up, because
    // it ends when *my* turn begins.
    expect(state.players[state.activePlayerIndex]!.id).toBe(me);
    expect(hasKeyword(state, bear, "Indestructible")).toBe(false);
  });

  it("does not survive as an ordinary end-of-turn grant would not", () => {
    const { state, me } = game();
    const bear = put(state, "grizzly-bears", me);
    // The ordinary list, for contrast: cleared by the very next cleanup.
    bear.grantedKeywords.push("Hexproof");
    applyEffect(state, me, "source", state.cardDefinitions["emerias-call"]!.castEffect!, []);

    // Through the cleanup step and into the opponent's turn. Cleanup takes no
    // priority, so it is passed through rather than rested in - one call runs
    // it and carries on.
    state.phase = "ending";
    state.step = "end";
    advanceStep(state);
    expect(state.players[state.activePlayerIndex]!.id).not.toBe(me);

    expect(hasKeyword(state, bear, "Hexproof")).toBe(false);
    expect(hasKeyword(state, bear, "Indestructible")).toBe(true);
  });

  it("has a land on the back that can be played instead", () => {
    const { state, me } = game();
    const card = createCardInstance(state, "emerias-call", me, "hand");
    playLand(state, me, card.instanceId);
    // Only one land face, so there is nothing to choose - reaching playLand at
    // all can only have meant the land.
    expect(card.definitionId).toBe("emeria-shattered-skyclave");
    expect(card.zone).toBe("battlefield");
  });
});

/**
 * Needleverge Pathway - the first card in the pool that is a land on both sides,
 * which is what made a land drop a question.
 */
describe("Needleverge Pathway", () => {
  it("plays as its front face by default", () => {
    const { state, me } = game();
    const card = createCardInstance(state, "needleverge-pathway", me, "hand");
    playLand(state, me, card.instanceId);
    expect(card.definitionId).toBe("needleverge-pathway");
  });

  it("plays as its back face when that is what was asked for", () => {
    const { state, me } = game();
    const card = createCardInstance(state, "needleverge-pathway", me, "hand");
    playLand(state, me, card.instanceId, "back");
    expect(card.definitionId).toBe("pillarverge-pathway");
    expect(card.zone).toBe("battlefield");
  });

  it("is red on one side and white on the other", () => {
    const { state } = game();
    const front = state.cardDefinitions["needleverge-pathway"]!;
    const back = state.cardDefinitions["pillarverge-pathway"]!;
    expect(front.activatedAbilities?.[0]?.effect).toEqual({ kind: "addMana", color: "R", amount: 1 });
    expect(back.activatedAbilities?.[0]?.effect).toEqual({ kind: "addMana", color: "W", amount: 1 });
  });

  it("turns back over when it leaves the battlefield", () => {
    const { state, me } = game();
    const card = createCardInstance(state, "needleverge-pathway", me, "hand");
    playLand(state, me, card.instanceId, "back");
    expect(card.definitionId).toBe("pillarverge-pathway");

    moveCard(state, card.instanceId, "graveyard");
    // One physical card: in a graveyard it is Needleverge Pathway again.
    expect(card.definitionId).toBe("needleverge-pathway");
  });
});

/**
 * Charismatic Conqueror - the first "you may" in this engine aimed at an
 * opponent, and the two halves belong to two different players.
 */
describe("Charismatic Conqueror", () => {
  it("asks the opponent when their creature arrives untapped", () => {
    const { state, me, them } = game();
    put(state, "charismatic-conqueror", me);
    const theirs = createCardInstance(state, "grizzly-bears", them, "hand");
    putOntoBattlefield(state, theirs.instanceId);
    settle(state);

    // The question belongs to them, not to the Conqueror's controller.
    expect(state.pendingConfirmation?.playerId).toBe(them);
  });

  it("taps it when they say yes, and no Vampire is made", () => {
    const { state, me, them } = game();
    put(state, "charismatic-conqueror", me);
    const theirs = createCardInstance(state, "grizzly-bears", them, "hand");
    putOntoBattlefield(state, theirs.instanceId);
    settle(state);

    resolveConfirmation(state, them, true);
    settle(state);

    expect(theirs.tapped).toBe(true);
    expect(named(state, me, "Vampire")).toHaveLength(0);
  });

  it("makes a lifelinking Vampire when they say no", () => {
    const { state, me, them } = game();
    put(state, "charismatic-conqueror", me);
    const theirs = createCardInstance(state, "grizzly-bears", them, "hand");
    putOntoBattlefield(state, theirs.instanceId);
    settle(state);

    resolveConfirmation(state, them, false);
    settle(state);

    expect(theirs.tapped).toBe(false);
    const vampires = named(state, me, "Vampire");
    expect(vampires).toHaveLength(1);
    // Mine, not theirs - the two halves of this card belong to two players.
    expect(vampires[0]!.controllerId).toBe(me);
    expect(hasKeyword(state, vampires[0]!, "Lifelink")).toBe(true);
  });

  it("says nothing about a permanent that arrives tapped", () => {
    const { state, me, them } = game();
    put(state, "charismatic-conqueror", me);
    // A tapland is the card's whole drawback.
    const theirs = createCardInstance(state, "clifftop-retreat", them, "hand");
    putOntoBattlefield(state, theirs.instanceId, { tapped: true });
    settle(state);

    expect(state.pendingConfirmation).toBeNull();
  });

  it("ignores its own controller's permanents", () => {
    const { state, me } = game();
    put(state, "charismatic-conqueror", me);
    const mine = createCardInstance(state, "grizzly-bears", me, "hand");
    putOntoBattlefield(state, mine.instanceId);
    settle(state);

    expect(state.pendingConfirmation).toBeNull();
  });

  it("ignores an opponent's land, which is neither an artifact nor a creature", () => {
    const { state, me, them } = game();
    put(state, "charismatic-conqueror", me);
    const land = createCardInstance(state, "mountain", them, "hand");
    putOntoBattlefield(state, land.instanceId);
    settle(state);

    expect(state.pendingConfirmation).toBeNull();
  });
});
