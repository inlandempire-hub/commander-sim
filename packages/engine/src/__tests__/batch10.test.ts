import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, moveCard, requirePlayer } from "../state.js";
import { chooseTriggerTargets, enteredBattlefield, putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack, resolveConfirmation } from "../stack.js";
import { advanceStep } from "../turn.js";
import { applyEffect, resolveCardChoice, resolveColorChoice } from "../effects.js";
import { castSpell, playLand } from "../casting.js";
import { activatableAbilities, activateAbility } from "../abilities.js";
import { blockProblem, dealCombatDamage, declareAttackers, declareBlockers } from "../combat.js";
import { isValidTarget } from "../targeting.js";
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

/**
 * Chrome Mox - and the reason the colour question had to learn which permanent
 * was asking: two of them can imprint different cards.
 */
describe("Chrome Mox", () => {
  it("offers the cards it may imprint, and not the ones it may not", () => {
    const { state, me } = game();
    createCardInstance(state, "lightning-bolt", me, "hand");
    createCardInstance(state, "sol-ring", me, "hand"); // artifact
    createCardInstance(state, "mountain", me, "hand"); // land
    const mox = createCardInstance(state, "chrome-mox", me, "hand");
    putOntoBattlefield(state, mox.instanceId);
    settle(state);

    const pending = state.pendingCardChoices[0]!;
    expect(pending.min).toBe(0); // "you **may**"
    const offered = pending.candidateInstanceIds.map(
      (id) => state.cardDefinitions[requirePlayer(state, me).hand.find((c) => c.instanceId === id)!.definitionId]!.name,
    );
    expect(offered).toEqual(["Lightning Bolt"]);
  });

  it("taps for the imprinted card's colour and nothing else", () => {
    const { state, me } = game();
    const bolt = createCardInstance(state, "lightning-bolt", me, "hand");
    const mox = createCardInstance(state, "chrome-mox", me, "hand");
    putOntoBattlefield(state, mox.instanceId);
    settle(state);
    resolveCardChoice(state, me, [bolt.instanceId]);

    expect(bolt.zone).toBe("exile");
    expect(mox.imprintedInstanceId).toBe(bolt.instanceId);
    // Red, because Lightning Bolt is red - and nothing else.
    const abilities = activatableAbilities(state, me, mox.instanceId);
    const colours = abilities.map(
      (i) => (state.cardDefinitions["chrome-mox"]!.activatedAbilities![i]!.effect as { color: string }).color,
    );
    expect(colours).toEqual(["R"]);
  });

  it("taps for nothing at all when it imprinted nothing", () => {
    const { state, me } = game();
    createCardInstance(state, "lightning-bolt", me, "hand");
    const mox = createCardInstance(state, "chrome-mox", me, "hand");
    putOntoBattlefield(state, mox.instanceId);
    settle(state);
    // Declining is a real answer, and it is what makes the card a gamble.
    resolveCardChoice(state, me, []);

    expect(mox.imprintedInstanceId).toBeUndefined();
    expect(activatableAbilities(state, me, mox.instanceId)).toHaveLength(0);
  });

  it("does not ask at all with nothing eligible in hand", () => {
    const { state, me } = game();
    createCardInstance(state, "mountain", me, "hand");
    const mox = createCardInstance(state, "chrome-mox", me, "hand");
    putOntoBattlefield(state, mox.instanceId);
    settle(state);

    expect(state.pendingCardChoices).toHaveLength(0);
  });

  it("two of them can tap for two different colours", () => {
    const { state, me } = game();
    const bolt = createCardInstance(state, "lightning-bolt", me, "hand");
    const swords = createCardInstance(state, "swords-to-plowshares", me, "hand");
    const first = createCardInstance(state, "chrome-mox", me, "hand");
    putOntoBattlefield(state, first.instanceId);
    settle(state);
    resolveCardChoice(state, me, [bolt.instanceId]);

    const second = createCardInstance(state, "chrome-mox", me, "hand");
    putOntoBattlefield(state, second.instanceId);
    settle(state);
    resolveCardChoice(state, me, [swords.instanceId]);

    const colourOf = (mox: CardInstance): string[] =>
      activatableAbilities(state, me, mox.instanceId).map(
        (i) => (state.cardDefinitions["chrome-mox"]!.activatedAbilities![i]!.effect as { color: string }).color,
      );
    // The whole reason `colorAllowed` had to take the permanent: nothing about
    // their controller tells these two apart.
    expect(colourOf(first)).toEqual(["R"]);
    expect(colourOf(second)).toEqual(["W"]);
  });
});

/**
 * Goblin Cratermaker - the first activated ability in the pool with bullets.
 */
describe("Goblin Cratermaker", () => {
  it("refuses to be activated without a mode", () => {
    const { state, me, them } = game();
    const maker = put(state, "goblin-cratermaker", me);
    put(state, "grizzly-bears", them);
    requirePlayer(state, me).manaPool.generic = 1;

    expect(() => activateAbility(state, me, maker.instanceId, 0, [])).toThrow(/mode/);
  });

  it("shoots a creature for 2 on its first mode", () => {
    const { state, me, them } = game();
    const maker = put(state, "goblin-cratermaker", me);
    const bear = put(state, "grizzly-bears", them);
    requirePlayer(state, me).manaPool.generic = 1;

    activateAbility(state, me, maker.instanceId, 0, [{ kind: "card", instanceId: bear.instanceId }], 0);
    settle(state);

    // The Cratermaker is already in the graveyard - the sacrifice is a cost -
    // and the damage happens anyway.
    expect(maker.zone).toBe("graveyard");
    expect(bear.damageMarked).toBe(2);
  });

  it("destroys a colourless nonland permanent on its second", () => {
    const { state, me, them } = game();
    const maker = put(state, "goblin-cratermaker", me);
    const ring = put(state, "sol-ring", them);
    requirePlayer(state, me).manaPool.generic = 1;

    activateAbility(state, me, maker.instanceId, 0, [{ kind: "card", instanceId: ring.instanceId }], 1);
    settle(state);

    expect(ring.zone).toBe("graveyard");
  });

  it("cannot point its second mode at a coloured permanent", () => {
    const { state, me, them } = game();
    const maker = put(state, "goblin-cratermaker", me);
    const bear = put(state, "grizzly-bears", them); // {1}{G}, so green
    requirePlayer(state, me).manaPool.generic = 1;

    expect(() =>
      activateAbility(state, me, maker.instanceId, 0, [{ kind: "card", instanceId: bear.instanceId }], 1),
    ).toThrow();
  });

  it("cannot point its second mode at a land, colourless though it is", () => {
    const { state, me, them } = game();
    const maker = put(state, "goblin-cratermaker", me);
    const mountain = put(state, "mountain", them);
    requirePlayer(state, me).manaPool.generic = 1;

    // "colorless **nonland**" - two conditions, and neither implies the other.
    expect(() =>
      activateAbility(state, me, maker.instanceId, 0, [{ kind: "card", instanceId: mountain.instanceId }], 1),
    ).toThrow();
  });

  it("is offered while either half has a target", () => {
    const { state, me, them } = game();
    const maker = put(state, "goblin-cratermaker", me);
    // A creature to shoot, but nothing colourless to destroy.
    put(state, "grizzly-bears", them);
    requirePlayer(state, me).manaPool.generic = 1;

    expect(activatableAbilities(state, me, maker.instanceId)).toEqual([0]);
  });
});

/**
 * Skrelv, Defector Mite - one white mana and five mechanics, four of them keyed
 * to the same named colour.
 */
describe("Skrelv, Defector Mite", () => {
  it("gives a poison counter alongside its combat damage, not instead of it", () => {
    const { state, me, them } = game();
    const skrelv = put(state, "skrelv-defector-mite", me);
    const before = requirePlayer(state, them).life;

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: skrelv.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";
    declareBlockers(state, them, []);
    dealCombatDamage(state);

    // Both. Infect would have done one and not the other, which is why toxic is
    // not written as infect.
    expect(requirePlayer(state, them).life).toBe(before - 1);
    expect(requirePlayer(state, them).poisonCounters).toBe(1);
  });

  it("cannot block", () => {
    const { state, me, them } = game();
    const skrelv = put(state, "skrelv-defector-mite", them);
    const attacker = put(state, "grizzly-bears", me);

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";

    expect(blockProblem(state, them, skrelv.instanceId, attacker.instanceId)).toMatch(/can't block/);
  });

  it("its ability takes a white mana when there is one", () => {
    const { state, me } = game();
    const skrelv = put(state, "skrelv-defector-mite", me);
    put(state, "grizzly-bears", me);
    const player = requirePlayer(state, me);
    player.manaPool.W = 1;
    const life = player.life;

    activateAbility(state, me, skrelv.instanceId, 0, [
      { kind: "card", instanceId: player.battlefield.find((c) => c.definitionId === "grizzly-bears")!.instanceId },
    ]);

    expect(player.manaPool.W).toBe(0);
    expect(player.life).toBe(life);
  });

  it("and 2 life when there is not", () => {
    const { state, me } = game();
    const skrelv = put(state, "skrelv-defector-mite", me);
    const bear = put(state, "grizzly-bears", me);
    const player = requirePlayer(state, me);
    const life = player.life;

    activateAbility(state, me, skrelv.instanceId, 0, [{ kind: "card", instanceId: bear.instanceId }]);

    // "{W/P} can be paid with either {W} or 2 life."
    expect(player.life).toBe(life - 2);
  });

  it("hands over toxic, hexproof from a colour, and unblockability by it", () => {
    const { state, me } = game();
    const skrelv = put(state, "skrelv-defector-mite", me);
    const bear = put(state, "grizzly-bears", me);

    activateAbility(state, me, skrelv.instanceId, 0, [{ kind: "card", instanceId: bear.instanceId }]);
    settle(state);
    // Toxic is about no colour, so it lands as the ability resolves rather than
    // waiting on the answer.
    expect(bear.toxicThisTurn).toBe(1);

    expect(state.pendingColorChoice?.targetInstanceId).toBe(bear.instanceId);
    resolveColorChoice(state, me, "R");

    expect(bear.hexproofFrom).toContain("R");
    expect(bear.blockRestrictionsThisTurn).toContainEqual({ kind: "not-color", color: "R" });
    // Hexproof from a colour is not protection from it - the difference is the
    // reason the card spells out the unblockable clause separately.
    expect(bear.protectionFrom).not.toContain("R");
  });

  it("the colour it named cannot block it", () => {
    const { state, me, them } = game();
    const attacker = put(state, "grizzly-bears", me);
    attacker.blockRestrictionsThisTurn.push({ kind: "not-color", color: "R" });
    const red = put(state, "mountain-bandit", them); // a red creature
    const white = put(state, "savannah-lions", them); // a white one

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: attacker.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";

    expect(blockProblem(state, them, red.instanceId, attacker.instanceId)).toMatch(/aren't red/);
    // The exclusion is a colour, not a keyword: everything else still blocks.
    expect(blockProblem(state, them, white.instanceId, attacker.instanceId)).toBeNull();
  });

  it("hexproof from a colour stops an opponent's red spell and not their white one", () => {
    const { state, me, them } = game();
    const bear = put(state, "grizzly-bears", me);
    bear.hexproofFrom.push("R");
    const bolt = createCardInstance(state, "lightning-bolt", them, "battlefield");
    const swords = createCardInstance(state, "swords-to-plowshares", them, "battlefield");

    const target = { kind: "card" as const, instanceId: bear.instanceId };
    expect(isValidTarget(state, { kind: "any-target" }, target, them, bolt.instanceId)).toBe(false);
    expect(isValidTarget(state, { kind: "creature" }, target, them, swords.instanceId)).toBe(true);
    // And it never stops its own controller.
    expect(isValidTarget(state, { kind: "any-target" }, target, me, bolt.instanceId)).toBe(true);
  });
});

/**
 * Deflecting Swat - the only effect in the pool that reaches back into the stack
 * and edits something already on it.
 */
describe("Deflecting Swat", () => {
  it("is free while you control a commander", () => {
    const { state } = game();
    const swat = state.cardDefinitions["deflecting-swat"]!;
    expect(swat.alternativeCost?.condition).toEqual({ kind: "controls-commander" });
  });

  it("re-points a burn spell away from your creature", () => {
    const { state, me, them } = game();
    const mine = put(state, "grizzly-bears", me);
    const theirs = put(state, "savannah-lions", them);

    // Their Bolt, aimed at my Bears.
    const bolt = createCardInstance(state, "lightning-bolt", them, "hand");
    requirePlayer(state, them).manaPool.R = 1;
    state.activePlayerIndex = 1;
    state.priorityPlayerIndex = 1;
    castSpell(state, them, bolt.instanceId, [{ kind: "card", instanceId: mine.instanceId }]);
    const onStack = state.stack[state.stack.length - 1]!;
    expect(onStack.targets).toEqual([{ kind: "card", instanceId: mine.instanceId }]);

    // My Swat, aimed at their Bolt.
    applyEffect(state, me, "swat", state.cardDefinitions["deflecting-swat"]!.castEffect!, [
      { kind: "spell", stackObjectId: onStack.id },
    ]);

    const pending = state.pendingTargetChoices[0]!;
    expect(pending.playerId).toBe(me); // I choose, though it is still their spell
    expect(pending.retarget).toBe(true);
    chooseTriggerTargets(state, me, [{ kind: "card", instanceId: theirs.instanceId }]);

    // Edited in place, not launched again: one Bolt on the stack, pointed the
    // other way.
    expect(state.stack).toHaveLength(1);
    expect(state.stack[0]!.targets).toEqual([{ kind: "card", instanceId: theirs.instanceId }]);

    resolveTopOfStack(state);
    expect(theirs.damageMarked).toBe(3);
    expect(mine.damageMarked).toBe(0);
  });

  it("does nothing when its target has already left the stack", () => {
    const { state, me } = game();
    applyEffect(state, me, "swat", state.cardDefinitions["deflecting-swat"]!.castEffect!, [
      { kind: "spell", stackObjectId: "gone" },
    ]);
    expect(state.pendingTargetChoices).toHaveLength(0);
  });

  it("may point at an ability, which a counterspell may not", () => {
    const { state } = game();
    const swat = state.cardDefinitions["deflecting-swat"]!.castEffect!;
    expect(swat.kind).toBe("changeTargets");
    if (swat.kind !== "changeTargets") return;
    expect(swat.target).toEqual({ kind: "spell", includeAbilities: true });
    // For contrast: "counter target spell" means spells, which is why a
    // counterspell cannot be pointed at a trigger.
    const bolt = state.cardDefinitions["red-elemental-blast"]!.castEffect!;
    expect(JSON.stringify(bolt)).not.toContain("includeAbilities");
  });
});
