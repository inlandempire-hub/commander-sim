import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { enteredBattlefield, putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { resolveCardChoice } from "../effects.js";
import { activateLoyaltyAbility } from "../abilities.js";
import { checkStateBasedActions } from "../sba.js";
import { effectivePower } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * Ajani, Nacatl Pariah // Ajani, Nacatl Avenger - the card this pool put off
 * twice, and the -4 that was the reason.
 */
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
  while (state.stack.length > 0 && guard++ < 60) resolveTopOfStack(state);
}

function named(state: GameState, playerId: string, name: string): CardInstance[] {
  return requirePlayer(state, playerId).battlefield.filter(
    (c) => state.cardDefinitions[c.definitionId]?.name === name,
  );
}

describe("Ajani, Nacatl Pariah", () => {
  it("brings a Cat with him", () => {
    const { state, me } = game();
    const ajani = createCardInstance(state, "ajani-nacatl-pariah", me, "hand");
    putOntoBattlefield(state, ajani.instanceId);
    settle(state);

    expect(named(state, me, "Cat Warrior")).toHaveLength(1);
  });

  it("offers to turn over when another Cat dies, and does", () => {
    const { state, me } = game();
    const ajani = put(state, "ajani-nacatl-pariah", me);
    const cat = put(state, "token-w-21-cat-warrior", me);

    cat.damageMarked = 5;
    checkStateBasedActions(state);
    settle(state);

    // "You may" - a real question, because turning over gives up a 1/2 body.
    expect(state.pendingConfirmation?.playerId).toBe(me);
    resolveConfirmation(state, me, true);
    settle(state);

    expect(ajani.definitionId).toBe("ajani-nacatl-avenger");
    expect(ajani.zone).toBe("battlefield");
    // A planeswalker arrives with its printed loyalty.
    expect(ajani.loyalty).toBe(3);
  });

  it("stays a Cat when the offer is declined", () => {
    const { state, me } = game();
    const ajani = put(state, "ajani-nacatl-pariah", me);
    const cat = put(state, "token-w-21-cat-warrior", me);

    cat.damageMarked = 5;
    checkStateBasedActions(state);
    settle(state);
    resolveConfirmation(state, me, false);
    settle(state);

    expect(ajani.definitionId).toBe("ajani-nacatl-pariah");
  });

  it("fires once for a batch of Cats, not once each", () => {
    const { state, me } = game();
    put(state, "ajani-nacatl-pariah", me);
    for (let i = 0; i < 3; i++) {
      const cat = put(state, "token-w-21-cat-warrior", me);
      cat.damageMarked = 5;
    }

    checkStateBasedActions(state);
    settle(state);

    // "One or more" - three Cats dying to one wipe is one event. Three prompts
    // to turn over one Ajani is not the card.
    expect(state.pendingConfirmation).not.toBeNull();
    resolveConfirmation(state, me, true);
    settle(state);
    expect(state.pendingConfirmation).toBeNull();
  });

  it("does not turn over for his own death", () => {
    const { state, me } = game();
    const ajani = put(state, "ajani-nacatl-pariah", me);
    ajani.damageMarked = 5;

    checkStateBasedActions(state);
    settle(state);

    // "**Other** Cats" - and he is a Cat Warrior himself.
    expect(state.pendingConfirmation).toBeNull();
    expect(ajani.zone).toBe("graveyard");
  });

  it("does not turn over for an opponent's Cat", () => {
    const { state, me, them } = game();
    put(state, "ajani-nacatl-pariah", me);
    const theirs = put(state, "token-w-21-cat-warrior", them);
    theirs.damageMarked = 5;

    checkStateBasedActions(state);
    settle(state);

    expect(state.pendingConfirmation).toBeNull();
  });

  it("does not turn over for a creature that is not a Cat", () => {
    const { state, me } = game();
    put(state, "ajani-nacatl-pariah", me);
    const bear = put(state, "grizzly-bears", me);
    bear.damageMarked = 5;

    checkStateBasedActions(state);
    settle(state);

    expect(state.pendingConfirmation).toBeNull();
  });
});

describe("Ajani, Nacatl Avenger", () => {
  it("puts a counter on each Cat with its +2", () => {
    const { state, me } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    const cat = put(state, "token-w-21-cat-warrior", me);
    const bear = put(state, "grizzly-bears", me);

    activateLoyaltyAbility(state, me, ajani.instanceId, 0);
    settle(state);

    expect(ajani.loyalty).toBe(5);
    expect(cat.plusOneCounters).toBe(1);
    expect(bear.plusOneCounters).toBe(0);
    expect(effectivePower(state, cat)).toBe(3);
  });

  it("makes a Cat with its 0, and shoots for the board with a red permanent out", () => {
    const { state, me, them } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    put(state, "mountain-bandit", me); // a red permanent
    const before = requirePlayer(state, them).life;

    activateLoyaltyAbility(state, me, ajani.instanceId, 1, [{ kind: "player", playerId: them }]);
    settle(state);

    // The Bandit, the new Cat - and Ajani is a planeswalker, so he is not one.
    expect(named(state, me, "Cat Warrior")).toHaveLength(1);
    expect(requirePlayer(state, them).life).toBe(before - 2);
  });

  it("makes the Cat but deals no damage without a red permanent", () => {
    const { state, me, them } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    put(state, "savannah-lions", me); // white
    const before = requirePlayer(state, them).life;

    activateLoyaltyAbility(state, me, ajani.instanceId, 1);
    settle(state);

    expect(named(state, me, "Cat Warrior")).toHaveLength(1);
    expect(requirePlayer(state, them).life).toBe(before);
  });

  it("is not itself a red permanent, having no mana cost", () => {
    const { state } = game();
    // "a red permanent **other than Ajani**" needs no exclusion: colour comes
    // from the mana cost, and a back face has none.
    expect(state.cardDefinitions["ajani-nacatl-avenger"]!.manaCost).toBeUndefined();
  });

  it("its -4 asks each opponent to keep one of each named type", () => {
    const { state, me, them } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    ajani.loyalty = 4;
    const artifact = put(state, "sol-ring", them);
    const creature = put(state, "grizzly-bears", them);
    const other = put(state, "savannah-lions", them);
    const land = put(state, "mountain", them);

    activateLoyaltyAbility(state, me, ajani.instanceId, 2);
    settle(state);

    const question = state.pendingCardChoices[0]!;
    expect(question.playerId).toBe(them); // they choose, not me
    expect(question.mode).toBe("keep-one-per-type");
    // Nonland permanents only - the land was never at risk.
    expect(question.candidateInstanceIds).not.toContain(land.instanceId);

    resolveCardChoice(state, them, [artifact.instanceId, creature.instanceId]);

    expect(artifact.zone).toBe("battlefield");
    expect(creature.zone).toBe("battlefield");
    expect(other.zone).toBe("graveyard");
    expect(land.zone).toBe("battlefield");
  });

  it("refuses an answer that keeps two of the same type", () => {
    const { state, me, them } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    ajani.loyalty = 4;
    const a = put(state, "grizzly-bears", them);
    const b = put(state, "savannah-lions", them);

    activateLoyaltyAbility(state, me, ajani.instanceId, 2);
    settle(state);

    // Four slots, not four cards.
    expect(() => resolveCardChoice(state, them, [a.instanceId, b.instanceId])).toThrow(/one permanent of each/);
  });

  it("takes everything from an opponent who keeps nothing", () => {
    const { state, me, them } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    ajani.loyalty = 4;
    const bear = put(state, "grizzly-bears", them);

    activateLoyaltyAbility(state, me, ajani.instanceId, 2);
    settle(state);
    resolveCardChoice(state, them, []);

    expect(bear.zone).toBe("graveyard");
  });

  it("leaves its own controller's board alone", () => {
    const { state, me, them } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    ajani.loyalty = 4;
    const mine = put(state, "grizzly-bears", me);
    put(state, "savannah-lions", them);

    activateLoyaltyAbility(state, me, ajani.instanceId, 2);
    settle(state);

    // "Each **opponent**" - one question, and it is not mine.
    expect(state.pendingCardChoices).toHaveLength(1);
    expect(state.pendingCardChoices[0]!.playerId).toBe(them);
    expect(mine.zone).toBe("battlefield");
  });

  it("asks nothing of an opponent with an empty board", () => {
    const { state, me } = game();
    const ajani = put(state, "ajani-nacatl-avenger", me);
    ajani.loyalty = 4;

    activateLoyaltyAbility(state, me, ajani.instanceId, 2);
    settle(state);

    expect(state.pendingCardChoices).toHaveLength(0);
  });
});
