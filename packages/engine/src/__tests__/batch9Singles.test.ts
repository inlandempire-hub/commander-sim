import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { resolveSearch } from "../effects.js";
import { advanceStep } from "../turn.js";
import { applyEffect } from "../effects.js";
import { effectivePower, effectiveToughness, hasKeyword } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * Batch 9's four singles - the cards that share nothing with each other.
 *
 * A buff about its own controller's life total, a trigger on somebody else's
 * tutor, and an artifact that refuses to untap.
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
  while (state.stack.length > 0 && guard++ < 50) resolveTopOfStack(state);
}

describe("Serra Ascendant", () => {
  it("is a 1/1 at a starting life total", () => {
    const { state, me } = game();
    const serra = put(state, "serra-ascendant", me);
    // Commander starts at 40, which is above 30 - so this is the *interesting*
    // half: it is a 6/6 flier from turn one in this format, which is the whole
    // reason the card is banned in it.
    requirePlayer(state, me).life = 20;

    expect(effectivePower(state, serra)).toBe(1);
    expect(effectiveToughness(state, serra)).toBe(1);
    expect(hasKeyword(state, serra, "Flying")).toBe(false);
  });

  it("grows and takes off at 30 life", () => {
    const { state, me } = game();
    const serra = put(state, "serra-ascendant", me);
    requirePlayer(state, me).life = 30;

    expect(effectivePower(state, serra)).toBe(6);
    expect(effectiveToughness(state, serra)).toBe(6);
    expect(hasKeyword(state, serra, "Flying")).toBe(true);
  });

  it("shrinks again the moment the total falls", () => {
    const { state, me } = game();
    const serra = put(state, "serra-ascendant", me);
    requirePlayer(state, me).life = 30;
    expect(effectivePower(state, serra)).toBe(6);

    requirePlayer(state, me).life = 29;
    // Read on every access rather than latched, which is what makes a burn
    // spell to the face a removal spell here.
    expect(effectivePower(state, serra)).toBe(1);
    expect(hasKeyword(state, serra, "Flying")).toBe(false);
  });

  it("keeps its lifelink either way", () => {
    const { state, me } = game();
    const serra = put(state, "serra-ascendant", me);
    requirePlayer(state, me).life = 5;
    expect(hasKeyword(state, serra, "Lifelink")).toBe(true);
  });

  it("hands nothing to the rest of your board", () => {
    const { state, me } = game();
    put(state, "serra-ascendant", me);
    const bear = put(state, "grizzly-bears", me);
    requirePlayer(state, me).life = 40;

    // The one thing this card must not be: a one-mana anthem.
    expect(effectivePower(state, bear)).toBe(2);
    expect(hasKeyword(state, bear, "Flying")).toBe(false);
  });

  it("does not grow on an opponent's life total", () => {
    const { state, me, them } = game();
    const serra = put(state, "serra-ascendant", me);
    requirePlayer(state, me).life = 10;
    requirePlayer(state, them).life = 40;

    expect(effectivePower(state, serra)).toBe(1);
  });
});

describe("Archivist of Oghma", () => {
  it("draws and gains when an opponent tutors", () => {
    const { state, me, them } = game();
    put(state, "archivist-of-oghma", me);
    createCardInstance(state, "forest", me, "library");
    createCardInstance(state, "grizzly-bears", them, "library");
    const handBefore = requirePlayer(state, me).hand.length;
    const lifeBefore = requirePlayer(state, me).life;

    applyEffect(state, them, "source", {
      kind: "searchLibrary",
      cardType: "Creature",
      destination: "hand",
    }, []);
    // The search stops the game and asks them first; the trigger it set off is
    // waiting underneath it, exactly as it would be in a real game.
    resolveSearch(state, them, state.pendingSearch!.candidateInstanceIds[0]!);
    settle(state);

    expect(requirePlayer(state, me).hand.length).toBe(handBefore + 1);
    expect(requirePlayer(state, me).life).toBe(lifeBefore + 1);
  });

  it("fires even when the search finds nothing", () => {
    const { state, me, them } = game();
    put(state, "archivist-of-oghma", me);
    createCardInstance(state, "forest", me, "library");
    // Their library holds no creature, so the tutor finds nothing at all.
    createCardInstance(state, "forest", them, "library");
    const before = requirePlayer(state, me).hand.length;

    applyEffect(state, them, "source", {
      kind: "searchLibrary",
      cardType: "Creature",
      destination: "hand",
    }, []);
    expect(state.pendingSearch!.candidateInstanceIds).toHaveLength(0);
    resolveSearch(state, them, null);
    settle(state);

    // Searching is what they did; finding is a separate question.
    expect(requirePlayer(state, me).hand.length).toBe(before + 1);
  });

  it("does not fire on your own tutor", () => {
    const { state, me } = game();
    put(state, "archivist-of-oghma", me);
    createCardInstance(state, "grizzly-bears", me, "library");

    applyEffect(state, me, "source", {
      kind: "searchLibrary",
      cardType: "Creature",
      destination: "hand",
    }, []);

    expect(state.stack).toHaveLength(0);
  });

  it("does not fire on Winota looking at the top six", () => {
    const { state, me } = game();
    put(state, "archivist-of-oghma", me);
    const them = state.players[1]!.id;
    for (let i = 0; i < 8; i++) createCardInstance(state, "capital-guard", them, "library");

    applyEffect(state, them, "source", {
      kind: "deployFromTop",
      amount: 6,
      cardType: "Creature",
      subtype: "Human",
    }, []);

    // Looking is not searching - which is exactly why one of the two shuffles.
    expect(state.stack).toHaveLength(0);
  });
});

describe("Mana Vault", () => {
  it("taps for three colourless", () => {
    const { state, me } = game();
    const vault = put(state, "mana-vault", me);
    expect(state.cardDefinitions[vault.definitionId]?.activatedAbilities?.[0]?.effect).toEqual({
      kind: "addMana",
      color: "C",
      amount: 3,
    });
  });

  it("stays tapped through the untap step", () => {
    const { state, them } = game();
    // Owned by the player whose turn is about to begin: the untap step only
    // ever untaps the *active* player's permanents.
    const vault = put(state, "mana-vault", them);
    const bear = put(state, "grizzly-bears", them);
    vault.tapped = true;
    bear.tapped = true;

    state.phase = "ending";
    state.step = "cleanup";
    // One call carries the turn over and through the untap step, which takes no
    // priority and so is never rested in.
    advanceStep(state);

    expect(bear.tapped).toBe(false);
    expect(vault.tapped).toBe(true);
  });

  it("offers the untap in your upkeep, and takes it", () => {
    const { state, me } = game();
    const vault = put(state, "mana-vault", me);
    vault.tapped = true;
    requirePlayer(state, me).manaPool.generic = 4;

    state.phase = "beginning";
    state.step = "untap";
    advanceStep(state); // into upkeep
    expect(state.step).toBe("upkeep");
    settle(state);

    expect(state.pendingConfirmation?.playerId).toBe(me);
    resolveConfirmation(state, me, true);
    settle(state);

    expect(vault.tapped).toBe(false);
  });

  it("bills you a life in the draw step while it is still tapped", () => {
    const { state, me } = game();
    const vault = put(state, "mana-vault", me);
    vault.tapped = true;
    const before = requirePlayer(state, me).life;
    createCardInstance(state, "forest", me, "library");

    state.phase = "beginning";
    state.step = "upkeep";
    advanceStep(state); // into the draw step
    expect(state.step).toBe("draw");
    settle(state);

    expect(requirePlayer(state, me).life).toBe(before - 1);
  });

  it("bills you nothing once it is untapped", () => {
    const { state, me } = game();
    const vault = put(state, "mana-vault", me);
    vault.tapped = false;
    const before = requirePlayer(state, me).life;
    createCardInstance(state, "forest", me, "library");

    state.phase = "beginning";
    state.step = "upkeep";
    advanceStep(state);
    settle(state);

    // The intervening-if is the escape hatch: pay in the upkeep and the damage
    // never happens.
    expect(requirePlayer(state, me).life).toBe(before);
  });
});

describe("Loyal Apprentice", () => {
  it("makes a hasty flying Thopter while you control your commander", () => {
    const { state, me } = game();
    put(state, "loyal-apprentice", me);
    const boss = put(state, "grizzly-bears", me);
    boss.isCommander = true;

    advanceStep(state); // precombat main -> begin combat
    expect(state.step).toBe("begin-combat");
    settle(state);

    const thopters = requirePlayer(state, me).battlefield.filter(
      (c) => c.definitionId === "token-c-11-thopter-flying",
    );
    expect(thopters).toHaveLength(1);
    expect(hasKeyword(state, thopters[0]!, "Flying")).toBe(true);
    expect(thopters[0]!.grantedKeywords).toContain("Haste");
    expect(thopters[0]!.summoningSickness).toBe(false);
  });

  it("does nothing without a commander on the battlefield", () => {
    const { state, me } = game();
    put(state, "loyal-apprentice", me);
    put(state, "grizzly-bears", me); // no commander among them

    advanceStep(state);
    settle(state);

    expect(
      requirePlayer(state, me).battlefield.filter((c) => c.definitionId === "token-c-11-thopter-flying"),
    ).toHaveLength(0);
  });

  it("does nothing on an opponent's combat", () => {
    const { state, me, them } = game();
    put(state, "loyal-apprentice", me);
    const boss = put(state, "grizzly-bears", me);
    boss.isCommander = true;
    // "on **your** turn" - their combat is not it.
    state.activePlayerIndex = 1;
    state.priorityPlayerIndex = 1;
    expect(them).toBeTruthy();

    advanceStep(state);
    settle(state);

    expect(
      requirePlayer(state, me).battlefield.filter((c) => c.definitionId === "token-c-11-thopter-flying"),
    ).toHaveLength(0);
  });
});
