import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, moveCard } from "../state.js";
import { chooseTriggerTarget, putOntoBattlefield } from "../permanents.js";
import { applyEffect, resolveSacrificeChoice, resolveSearch } from "../effects.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { canPayAdditionalCost, castSpell, landDropsAllowed, playLand } from "../casting.js";
import { activateAbility } from "../abilities.js";
import { declareAttackers } from "../combat.js";
import { checkStateBasedActions, sacrificePermanent } from "../sba.js";
import { effectivePower, effectiveTriggers, hasKeyword } from "../counters.js";
import { advanceStep } from "../turn.js";
import { affordableXValues } from "../autoPass.js";
import type { GameState, StackTarget } from "../types.js";

/**
 * The 2026-08-13 batch: costs that are not mana, two new ways for a permanent
 * to leave the battlefield, and abilities that were never printed on the card
 * they are attached to.
 *
 * The assertions that earn their place here are the ones about *when* something
 * is paid or read. An additional cost is paid as the spell is cast, so a
 * creature is already gone before the spell resolves; a departing creature's
 * counters can only be counted before it moves; and a granted ability has to be
 * found by every fire site that used to read the printed list.
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

/**
 * Hands the turn to a player, so a sorcery-speed spell of theirs is legal.
 *
 * Setup rather than a rules shortcut: half these cards are cast by the
 * opponent, and walking the turn round to reach them would bury the assertion
 * under a page of `advanceStep`.
 */
function giveTurnTo(state: GameState, playerId: string): void {
  state.activePlayerIndex = state.players.findIndex((p) => p.id === playerId);
  state.priorityPlayerIndex = state.activePlayerIndex;
}

/** Enough mana of every colour that a cost is never what a test is measuring. */
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
  options: {
    targets?: StackTarget[];
    chosenX?: number;
    sacrificeInstanceId?: string;
    useAlternativeCost?: boolean;
  } = {},
) {
  const card = createCardInstance(state, definitionId, playerId, "hand");
  fillPool(state, playerId);
  castSpell(state, playerId, card.instanceId, options.targets ?? [], {
    chosenX: options.chosenX,
    sacrificeInstanceId: options.sacrificeInstanceId,
    useAlternativeCost: options.useAlternativeCost,
  });
  return card;
}

describe("an additional cost is paid as the spell is cast", () => {
  it("Toxic Deluge takes the life it announced, and wipes for exactly that much", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    // A 2/2 and a 3/3. X = 2 kills the first and leaves the second on 1 toughness.
    const bear = enters(state, "grizzly-bears", mike.id);
    const spider = enters(state, "giant-spider", mike.id);

    castFromHand(state, "toxic-deluge", donny.id, { chosenX: 2 });
    drain(state);
    checkStateBasedActions(state);

    expect(donny.life).toBe(38);
    expect(findInstance(state, bear.instanceId)?.instance.zone).toBe("graveyard");
    expect(findInstance(state, spider.instanceId)?.instance.zone).toBe("battlefield");
  });

  it("refuses to cast without a value for X, because the X is in the life", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const card = createCardInstance(state, "toxic-deluge", donny.id, "hand");
    fillPool(state, donny.id);

    /*
     * Toxic Deluge prints no {X} in its mana cost at all. A check that read
     * only the mana cost would take X = 0 quietly, and the card would pay no
     * life and wipe nothing - which looks exactly like a broken board wipe.
     */
    expect(() => castSpell(state, donny.id, card.instanceId)).toThrow(/value for X/);
  });

  it("will not let you pay life you do not have", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    donny.life = 3;
    const card = createCardInstance(state, "toxic-deluge", donny.id, "hand");
    fillPool(state, donny.id);

    expect(() => castSpell(state, donny.id, card.instanceId, [], { chosenX: 4 })).toThrow(
      /additional cost/,
    );
    // Down to exactly nothing is legal, though - it is the real rule, and it is
    // the ceiling the card is played to.
    expect(canPayAdditionalCost(state, donny.id, state.cardDefinitions["toxic-deluge"]!, 3)).toBe(true);
  });

  it("only offers the values of X the life total can actually cover", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    donny.life = 2;
    const card = createCardInstance(state, "toxic-deluge", donny.id, "hand");
    fillPool(state, donny.id);

    // 0, 1 and 2 - and not 3, which the mana could pay for and the life cannot.
    expect(affordableXValues(state, donny.id, card.instanceId)).toEqual([0, 1, 2]);
  });

  it("Tend the Pests eats the creature before it resolves, and counts its power", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const spider = enters(state, "giant-spider", donny.id); // 2/4

    castFromHand(state, "tend-the-pests", donny.id, { sacrificeInstanceId: spider.instanceId });

    /*
     * Already in the graveyard with the spell still on the stack. That is what
     * makes it a cost rather than an effect, and it is why the power had to be
     * read at cast time - by the time this resolves there is nothing to read.
     */
    expect(findInstance(state, spider.instanceId)?.instance.zone).toBe("graveyard");

    drain(state);
    const pests = donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life");
    expect(pests).toHaveLength(2);
  });

  it("cannot be cast at all with no creature to give up", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const card = createCardInstance(state, "tend-the-pests", donny.id, "hand");
    fillPool(state, donny.id);

    // Not "a legal spell that makes nothing" - rule 601.2f, the spell is simply
    // not castable, and the client must not offer it.
    expect(() => castSpell(state, donny.id, card.instanceId)).toThrow(/additional cost/);
    expect(canPayAdditionalCost(state, donny.id, state.cardDefinitions["tend-the-pests"]!, 0)).toBe(false);
  });
});

describe("an alternative cost replaces the mana cost", () => {
  it("Deadly Rollick is free while you control a commander", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    const commander = enters(state, "blech-loafing-pest", donny.id);
    commander.isCommander = true;
    const bear = enters(state, "grizzly-bears", mike.id);

    const card = createCardInstance(state, "deadly-rollick", donny.id, "hand");
    state.priorityPlayerIndex = 0;
    // No mana at all in the pool, and it still casts.
    castSpell(state, donny.id, card.instanceId, [{ kind: "card", instanceId: bear.instanceId }], {
      useAlternativeCost: true,
    });
    drain(state);

    expect(findInstance(state, bear.instanceId)?.instance.zone).toBe("exile");
  });

  it("refuses the alternative cost with the commander still in the command zone", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    /*
     * "If you control a commander" means on the battlefield. A commander
     * waiting to be cast is not one you control, and reading the command zone
     * here would make the card free from the opening hand of every game.
     */
    const waiting = createCardInstance(state, "blech-loafing-pest", donny.id, "command");
    waiting.isCommander = true;
    const bear = enters(state, "grizzly-bears", mike.id);

    const card = createCardInstance(state, "deadly-rollick", donny.id, "hand");
    state.priorityPlayerIndex = 0;
    expect(() =>
      castSpell(state, donny.id, card.instanceId, [{ kind: "card", instanceId: bear.instanceId }], {
        useAlternativeCost: true,
      }),
    ).toThrow(/alternative cost is not available/);
  });
});

describe("a sacrifice chosen while the ability resolves", () => {
  it("Disciple of Freyalise gains and draws that creature's power", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 5; i++) createCardInstance(state, "forest", donny.id, "library");
    const spider = enters(state, "giant-spider", donny.id); // power 2
    const startingHand = donny.hand.length;

    enters(state, "disciple-of-freyalise", donny.id);
    drain(state);

    // It stopped and asked rather than taking one.
    expect(state.pendingSacrifice?.playerId).toBe(donny.id);
    expect(state.pendingSacrifice?.optional).toBe(true);
    // "Another creature" - the Disciple itself is not on the list.
    expect(state.pendingSacrifice?.candidateInstanceIds).toEqual([spider.instanceId]);

    resolveSacrificeChoice(state, donny.id, spider.instanceId);

    expect(donny.life).toBe(42);
    expect(donny.hand.length).toBe(startingHand + 2);
    expect(findInstance(state, spider.instanceId)?.instance.zone).toBe("graveyard");
  });

  it("declining does nothing at all, which is what 'if you do' means", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 5; i++) createCardInstance(state, "forest", donny.id, "library");
    const spider = enters(state, "giant-spider", donny.id);
    const startingHand = donny.hand.length;

    enters(state, "disciple-of-freyalise", donny.id);
    drain(state);
    resolveSacrificeChoice(state, donny.id, null);

    expect(donny.life).toBe(40);
    expect(donny.hand.length).toBe(startingHand);
    expect(findInstance(state, spider.instanceId)?.instance.zone).toBe("battlefield");
  });

  it("asks nothing when there is no other creature", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);

    enters(state, "disciple-of-freyalise", donny.id);
    drain(state);

    // A question with no answers would stop the game forever, so it is never
    // asked: the Disciple is simply a 3/3.
    expect(state.pendingSacrifice).toBeNull();
  });

  it("plays its back face as a shockland", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const card = createCardInstance(state, "disciple-of-freyalise", donny.id, "hand");

    playLand(state, donny.id, card.instanceId);

    const onBoard = donny.battlefield.find((c) => c.instanceId === card.instanceId)!;
    expect(onBoard.definitionId).toBe("garden-of-freyalise");
    expect(onBoard.tapped).toBe(true);
    // The shockland question, asked as it arrives.
    expect(state.pendingConfirmation?.prompt).toContain("3 life");
    resolveConfirmation(state, donny.id, true);
    expect(onBoard.tapped).toBe(false);
    expect(donny.life).toBe(37);
  });
});

describe("Icetill Explorer changes the rules of the turn", () => {
  it("grants a second land drop, and takes it away when it dies", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    expect(landDropsAllowed(state, donny.id)).toBe(1);

    const explorer = enters(state, "icetill-explorer", donny.id);
    expect(landDropsAllowed(state, donny.id)).toBe(2);

    const first = createCardInstance(state, "forest", donny.id, "hand");
    const second = createCardInstance(state, "forest", donny.id, "hand");
    const third = createCardInstance(state, "forest", donny.id, "hand");
    state.priorityPlayerIndex = 0;
    playLand(state, donny.id, first.instanceId);
    // The landfall mill goes on the stack, and a land cannot be played with a
    // spell waiting - so the trigger is resolved before the second drop.
    drain(state);
    playLand(state, donny.id, second.instanceId);
    drain(state);
    expect(() => playLand(state, donny.id, third.instanceId)).toThrow(/already played a land/);

    /*
     * Read fresh rather than counted onto the player when it arrived, so the
     * extra drop leaves with the creature - which is the rule, and the
     * alternative would need every removal spell to know about land drops.
     */
    moveCard(state, explorer.instanceId, "graveyard");
    expect(landDropsAllowed(state, donny.id)).toBe(1);
  });

  it("mills on landfall, and milling out is not losing", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "icetill-explorer", donny.id);
    const top = createCardInstance(state, "swamp", donny.id, "library");

    const land = createCardInstance(state, "forest", donny.id, "hand");
    state.priorityPlayerIndex = 0;
    playLand(state, donny.id, land.instanceId);
    drain(state);

    expect(findInstance(state, top.instanceId)?.instance.zone).toBe("graveyard");
    expect(donny.library).toHaveLength(0);
    // The next landfall finds an empty library. That is legal and quiet - only
    // *drawing* from an empty library loses the game.
    const second = createCardInstance(state, "forest", donny.id, "hand");
    playLand(state, donny.id, second.instanceId);
    drain(state);
    expect(donny.attemptedDrawFromEmptyLibrary).toBe(false);
  });

  it("lets a land be played out of the graveyard, and only while it is out", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const buried = createCardInstance(state, "swamp", donny.id, "graveyard");
    state.priorityPlayerIndex = 0;

    expect(() => playLand(state, donny.id, buried.instanceId)).toThrow(/not in .* hand/);

    enters(state, "icetill-explorer", donny.id);
    playLand(state, donny.id, buried.instanceId);
    expect(findInstance(state, buried.instanceId)?.instance.zone).toBe("battlefield");
  });
});

describe("Path of Ancestry scries when its mana pays for the right creature", () => {
  function pathGame() {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    // Blech is a Pest, so a creature spell sharing a type has to be a Pest too.
    const commander = createCardInstance(state, "blech-loafing-pest", donny.id, "command");
    commander.isCommander = true;
    const path = enters(state, "path-of-ancestry", donny.id);
    path.tapped = false;
    for (let i = 0; i < 5; i++) createCardInstance(state, "forest", donny.id, "library");
    state.priorityPlayerIndex = 0;
    return { state, donny, path };
  }

  it("marks its mana without restricting it", () => {
    const { state, donny, path } = pathGame();
    // The black half - Blech's identity is B/G, so W, U and R are refused.
    const abilities = state.cardDefinitions["path-of-ancestry"]!.activatedAbilities!;
    const blackIndex = abilities.findIndex(
      (a) => a.effect.kind === "addMana" && a.effect.color === "B",
    );
    activateAbility(state, donny.id, path.instanceId, blackIndex);

    // In the ordinary pool, spendable on anything - not held apart the way
    // Delighted Halfling's mana is.
    expect(donny.manaPool.B).toBe(1);
    expect(donny.restrictedMana).toHaveLength(0);
    expect(donny.manaMarks).toHaveLength(1);
  });

  it("does not scry when the mana buys something that shares no type", () => {
    const { state, donny, path } = pathGame();
    const abilities = state.cardDefinitions["path-of-ancestry"]!.activatedAbilities!;
    const greenIndex = abilities.findIndex(
      (a) => a.effect.kind === "addMana" && a.effect.color === "G",
    );
    activateAbility(state, donny.id, path.instanceId, greenIndex);
    donny.manaPool.G = (donny.manaPool.G ?? 0) + 1;

    // Grizzly Bears is a Bear, and Blech is a Pest.
    const bears = createCardInstance(state, "grizzly-bears", donny.id, "hand");
    castSpell(state, donny.id, bears.instanceId);

    expect(state.stack.some((o) => o.effect.kind === "scry")).toBe(false);
  });
});

describe("a permanent leaving the battlefield is not always a death", () => {
  it("The Ozolith catches the counters of a creature that dies", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const ozolith = enters(state, "the-ozolith", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);
    bear.plusOneCounters = 3;

    sacrificePermanent(state, bear.instanceId);
    drain(state);

    expect(ozolith.plusOneCounters).toBe(3);
  });

  it("catches them from an exile too, which a dies trigger would miss", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    const ozolith = enters(state, "the-ozolith", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);
    bear.plusOneCounters = 2;

    // Exiled by an opponent's spell: it left the battlefield and did not die.
    applyEffect(state, mike.id, ozolith.instanceId, { kind: "exile", target: { kind: "creature" } }, [
      { kind: "card", instanceId: bear.instanceId },
    ]);
    drain(state);

    expect(findInstance(state, bear.instanceId)?.instance.zone).toBe("exile");
    expect(ozolith.plusOneCounters).toBe(2);
  });

  it("ignores a creature that had no counters", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const ozolith = enters(state, "the-ozolith", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);

    sacrificePermanent(state, bear.instanceId);
    drain(state);

    expect(ozolith.plusOneCounters).toBe(0);
  });

  it("moves the whole pile onto one creature at the beginning of combat", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const ozolith = enters(state, "the-ozolith", donny.id);
    ozolith.plusOneCounters = 4;
    const spider = enters(state, "giant-spider", donny.id);

    let guard = 10;
    while (state.step !== "begin-combat" && guard-- > 0) advanceStep(state);

    /*
     * One legal target, so it is taken without asking - but it is a "you may",
     * and an optional ability stops on its way off the stack to put the
     * question. Both have to be answered before anything moves.
     */
    let turns = 10;
    while ((state.stack.length > 0 || state.pendingConfirmation) && turns-- > 0) {
      if (state.pendingConfirmation) {
        resolveConfirmation(state, state.pendingConfirmation.playerId, true);
        continue;
      }
      resolveTopOfStack(state);
    }

    expect(spider.plusOneCounters).toBe(4);
    // Emptied, so it cannot pay out twice from one death.
    expect(ozolith.plusOneCounters).toBe(0);
  });

  it("does not fire at all with nothing on it", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "the-ozolith", donny.id);
    enters(state, "giant-spider", donny.id);

    let guard = 10;
    while (state.step !== "begin-combat" && guard-- > 0) advanceStep(state);

    // The intervening-if is false, so the ability never reaches the stack.
    expect(state.stack.some((o) => o.effect.kind === "moveAllCounters")).toBe(false);
  });
});

describe("Fumulus watches two events nothing watched before", () => {
  it("makes an Insect when any player sacrifices a nontoken creature", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    enters(state, "fumulus-the-infestation", donny.id);
    const theirs = enters(state, "grizzly-bears", mike.id);

    // "A player", not "you" - an opponent's sacrifice counts.
    sacrificePermanent(state, theirs.instanceId);
    drain(state);

    expect(donny.battlefield.filter((c) => c.definitionId === "token-b-11-insect-flying")).toHaveLength(1);
  });

  it("ignores a token being sacrificed, and a creature that merely died", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "fumulus-the-infestation", donny.id);

    const token = enters(state, "token-g-11-insect", donny.id);
    sacrificePermanent(state, token.instanceId);
    drain(state);
    expect(donny.battlefield.filter((c) => c.definitionId === "token-b-11-insect-flying")).toHaveLength(0);

    // Killed rather than sacrificed - every sacrifice is a death and almost no
    // death is a sacrifice, which is why these are two events.
    const bear = enters(state, "grizzly-bears", donny.id);
    applyEffect(state, donny.id, bear.instanceId, { kind: "destroy", target: { kind: "creature" } }, [
      { kind: "card", instanceId: bear.instanceId },
    ]);
    drain(state);
    expect(donny.battlefield.filter((c) => c.definitionId === "token-b-11-insect-flying")).toHaveLength(0);
  });

  it("drains when one of the four named types attacks, and not when a Bear does", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    const fumulus = enters(state, "fumulus-the-infestation", donny.id);
    fumulus.summoningSickness = false;
    const bear = enters(state, "grizzly-bears", donny.id);
    bear.summoningSickness = false;

    let guard = 10;
    while (state.step !== "declare-attackers" && guard-- > 0) advanceStep(state);

    declareAttackers(state, donny.id, [
      { attackerInstanceId: fumulus.instanceId, defendingPlayerId: mike.id },
      { attackerInstanceId: bear.instanceId, defendingPlayerId: mike.id },
    ]);
    while (state.pendingTargetChoices.length > 0) {
      chooseTriggerTarget(state, donny.id, state.pendingTargetChoices[0]!.candidates[0]!);
    }
    drain(state);

    // Fumulus is itself an Insect and says nothing about "another", so it
    // counts - once. The Bear does not.
    expect(mike.life).toBe(39);
    expect(donny.life).toBe(41);
  });
});

describe("abilities that were never printed on the card", () => {
  it("Root Manipulation grants menace and a whole trigger for the turn", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);
    bear.summoningSickness = false;

    castFromHand(state, "root-manipulation", donny.id);
    drain(state);

    expect(effectivePower(state, bear)).toBe(4);
    expect(hasKeyword(state, bear, "Menace")).toBe(true);
    // The whole point: an ability the Bear's own card does not list.
    expect(effectiveTriggers(state, bear).some((t) => t.event === "attacks")).toBe(true);

    let guard = 10;
    while (state.step !== "declare-attackers" && guard-- > 0) advanceStep(state);
    declareAttackers(state, donny.id, [
      { attackerInstanceId: bear.instanceId, defendingPlayerId: mike.id },
    ]);
    drain(state);

    // The granted trigger really fired, which is the assertion the whole
    // `effectiveTriggers` change exists for.
    expect(donny.life).toBe(41);
  });

  it("wears off in the cleanup step, like every other until-end-of-turn grant", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);

    castFromHand(state, "root-manipulation", donny.id);
    drain(state);
    expect(bear.grantedTriggers).toHaveLength(1);

    let guard = 20;
    while (state.step !== "cleanup" && guard-- > 0) advanceStep(state);
    advanceStep(state);

    expect(bear.grantedTriggers).toHaveLength(0);
    expect(hasKeyword(state, bear, "Menace")).toBe(false);
  });
});

describe("Sedgemoor Witch", () => {
  it("makes a Pest whenever you cast an instant or sorcery", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    enters(state, "sedgemoor-witch", donny.id);

    castFromHand(state, "root-manipulation", donny.id);
    drain(state);

    expect(donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life")).toHaveLength(1);

    // "Whenever **you** cast" - an opponent's spell does nothing.
    giveTurnTo(state, mike.id);
    const theirs = createCardInstance(state, "root-manipulation", mike.id, "hand");
    fillPool(state, mike.id);
    state.priorityPlayerIndex = state.activePlayerIndex;
    castSpell(state, mike.id, theirs.instanceId);
    drain(state);
    expect(donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life")).toHaveLength(1);
  });

  it("counters an opponent's spell when its ward cannot be paid in life", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    const witch = enters(state, "sedgemoor-witch", donny.id);

    // Comfortably able to pay: the ward comes out of their life and the spell
    // goes through.
    giveTurnTo(state, mike.id);
    const first = createCardInstance(state, "fell", mike.id, "hand");
    fillPool(state, mike.id);
    state.priorityPlayerIndex = state.activePlayerIndex;
    castSpell(state, mike.id, first.instanceId, [{ kind: "card", instanceId: witch.instanceId }]);
    expect(mike.life).toBe(37);
    drain(state);
    checkStateBasedActions(state);
    expect(findInstance(state, witch.instanceId)?.instance.zone).toBe("graveyard");

    // And when they cannot afford it, the spell is countered rather than
    // conceding the game on their behalf.
    const witch2 = enters(state, "sedgemoor-witch", donny.id);
    mike.life = 3;
    const second = createCardInstance(state, "fell", mike.id, "hand");
    fillPool(state, mike.id);
    state.priorityPlayerIndex = state.activePlayerIndex;
    castSpell(state, mike.id, second.instanceId, [{ kind: "card", instanceId: witch2.instanceId }]);
    expect(mike.life).toBe(3);
    expect(findInstance(state, second.instanceId)?.instance.zone).toBe("graveyard");
    drain(state);
    expect(findInstance(state, witch2.instanceId)?.instance.zone).toBe("battlefield");
  });
});

describe("destroy now fires the triggers combat death always did", () => {
  it("a creature killed by a spell dies for every watcher", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    /*
     * `destroy` used to call `moveCard` on its own, which skipped the dies
     * triggers, the turn's death count and the commander replacement effect
     * together. A creature killed in combat fired its ability and the same
     * creature killed by a removal spell did not.
     */
    enters(state, "blood-artist", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);

    applyEffect(state, mike.id, bear.instanceId, { kind: "destroy", target: { kind: "creature" } }, [
      { kind: "card", instanceId: bear.instanceId },
    ]);
    while (state.pendingTargetChoices.length > 0) {
      const choice = state.pendingTargetChoices[0]!;
      // Blood Artist aims at a player, and which one is the whole card - the
      // drain and the gain go to different people.
      const opponent = choice.candidates.find((c) => c.kind === "player" && c.playerId === mike.id);
      chooseTriggerTarget(state, choice.playerId, opponent ?? choice.candidates[0]!);
    }
    drain(state);

    expect(state.creatureDeathsThisTurn).toBe(1);
    /*
     * Blood Artist saw it. The *total* is unchanged - one player loses 1 and
     * the other gains 1 - so the assertion has to name who, which is also the
     * thing the card gets wrong when the two halves are muddled.
     */
    expect(mike.life).toBe(39);
    expect(donny.life).toBe(41);
  });
});

describe("scry is surveil pointed the other way", () => {
  it("puts the looked-at card on the bottom without shuffling", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const top = createCardInstance(state, "swamp", donny.id, "library");
    const next = createCardInstance(state, "forest", donny.id, "library");

    applyEffect(state, donny.id, top.instanceId, { kind: "scry", amount: 1 }, []);
    expect(state.pendingSearch?.destination).toBe("library-bottom");
    resolveSearch(state, donny.id, top.instanceId);

    // A reorder, not a zone change - it never left the library.
    expect(donny.library.map((c) => c.instanceId)).toEqual([next.instanceId, top.instanceId]);
    expect(findInstance(state, top.instanceId)?.instance.zone).toBe("library");
  });
});
