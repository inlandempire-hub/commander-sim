import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { chooseTriggerTarget, putOntoBattlefield } from "../permanents.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import { resolveSearch } from "../effects.js";
import { castSpell } from "../casting.js";
import { declareAttackers } from "../combat.js";
import { damageCreature } from "../damage.js";
import { checkStateBasedActions } from "../sba.js";
import { effectiveKeywords, effectivePower, hasKeyword } from "../counters.js";
import { advanceStep } from "../turn.js";
import type { GameState, StackTarget } from "../types.js";

/**
 * The ten cards added on 2026-08-12, and the five engine capabilities they
 * needed: keywords that can be granted rather than only printed, triggers that
 * choose a target before going on the stack, surveil, and two new trigger
 * events.
 *
 * Every expectation here is the printed card. Where the engine takes a
 * shortcut - the random discard, the shockland entering tapped and then
 * untapping - the test says so rather than quietly asserting the shortcut is
 * the card.
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

/** makeTestGame deals no cards, so a surveil has nothing to look at until this. */
function stockLibrary(state: GameState, playerId: string, count = 5): void {
  for (let i = 0; i < count; i++) createCardInstance(state, "grizzly-bears", playerId, "library");
}

/** makeTestGame starts in the untap step; sorcery-speed casting needs a main phase. */
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
  // The tests are about what the cards do, not about paying for them, and not
  // about who holds priority.
  player.manaPool.generic = (player.manaPool.generic ?? 0) + 20;
  for (const color of ["W", "U", "B", "R", "G"] as const) player.manaPool[color] = 20;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
  castSpell(state, playerId, card.instanceId, options.targets ?? [], { chosenMode: options.mode });
  return card;
}

describe("granted keywords", () => {
  it("Heroic Intervention shields every permanent, not just creatures", () => {
    const state = makeTestGame();
    const [donny] = [state.players[0]!];
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);
    const land = enters(state, "bayou", donny.id);
    drain(state);

    expect(hasKeyword(state, bear, "Indestructible")).toBe(false);

    castFromHand(state, "heroic-intervention", donny.id);
    drain(state);

    for (const permanent of [bear, land]) {
      expect(effectiveKeywords(state, permanent)).toContain("Hexproof");
      expect(effectiveKeywords(state, permanent)).toContain("Indestructible");
    }
  });

  it("wears off in the cleanup step, like every other until-end-of-turn effect", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);
    drain(state);
    castFromHand(state, "heroic-intervention", donny.id);
    drain(state);
    expect(hasKeyword(state, bear, "Indestructible")).toBe(true);

    let guard = 30;
    while (state.step !== "cleanup" && guard-- > 0) advanceStep(state);
    advanceStep(state);

    expect(hasKeyword(state, bear, "Indestructible")).toBe(false);
  });

  it("really stops a creature dying, not just the panel", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);
    drain(state);
    castFromHand(state, "heroic-intervention", donny.id);
    drain(state);

    damageCreature(state, bear, 99);
    checkStateBasedActions(state);

    expect(findInstance(state, bear.instanceId)?.instance.zone).toBe("battlefield");
  });
});

describe("Blight Mound", () => {
  it("gives menace and +1/+0 only while the Pest is attacking", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    enters(state, "blight-mound", donny.id);
    const pest = enters(state, "pest-mascot", donny.id);
    pest.summoningSickness = false;
    drain(state);

    // Sitting at home: no menace, printed power.
    const restingPower = effectivePower(state, pest);
    expect(hasKeyword(state, pest, "Menace")).toBe(false);

    let guard = 20;
    while (state.step !== "declare-attackers" && guard-- > 0) advanceStep(state);
    declareAttackers(state, donny.id, [
      { attackerInstanceId: pest.instanceId, defendingPlayerId: state.players[1]!.id },
    ]);

    expect(hasKeyword(state, pest, "Menace")).toBe(true);
    expect(effectivePower(state, pest)).toBe(restingPower + 1);
  });

  it("makes a Pest when a nontoken creature you control dies, and not for a token", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    enters(state, "blight-mound", donny.id);
    const bear = enters(state, "grizzly-bears", donny.id);
    drain(state);

    damageCreature(state, bear, 99);
    checkStateBasedActions(state);
    drain(state);

    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life"),
    ).toHaveLength(1);

    // A token dying does not make another - "nontoken" is the whole point.
    const pest = donny.battlefield.find(
      (c) => c.definitionId === "token-bg-11-pest-dies-gain-life",
    )!;
    damageCreature(state, pest, 99);
    checkStateBasedActions(state);
    drain(state);
    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life"),
    ).toHaveLength(0);
  });

  it("leaves an opponent's dying creature alone", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    enters(state, "blight-mound", donny.id);
    const theirs = enters(state, "grizzly-bears", mike.id);
    drain(state);

    damageCreature(state, theirs, 99);
    checkStateBasedActions(state);
    drain(state);

    expect(donny.battlefield.filter((c) => c.definitionId.startsWith("token-bg-11-pest"))).toHaveLength(0);
  });
});

describe("the Pest tokens' own rules text", () => {
  it("gains its controller life when it dies", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const before = donny.life;
    const pest = enters(state, "token-bg-11-pest-dies-gain-life", donny.id);
    drain(state);

    damageCreature(state, pest, 99);
    checkStateBasedActions(state);
    drain(state);

    expect(donny.life).toBe(before + 1);
  });

  it("gains its controller life when it attacks - a different token, a different trigger", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const pest = enters(state, "token-bg-11-pest-attacks-gain-life", donny.id);
    pest.summoningSickness = false;
    drain(state);
    const before = donny.life;

    let guard = 20;
    while (state.step !== "declare-attackers" && guard-- > 0) advanceStep(state);
    declareAttackers(state, donny.id, [
      { attackerInstanceId: pest.instanceId, defendingPlayerId: state.players[1]!.id },
    ]);
    drain(state);

    expect(donny.life).toBe(before + 1);
  });
});

describe("triggers that choose a target", () => {
  it("parks Duskshell Crawler's counter until a target is named", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    // Two other creatures, so the choice is real - with one candidate the
    // engine takes it without asking.
    const bear = enters(state, "grizzly-bears", donny.id);
    enters(state, "pest-mascot", donny.id);
    drain(state);

    enters(state, "duskshell-crawler", donny.id);

    expect(state.pendingTargetChoices).toHaveLength(1);
    expect(state.pendingTargetChoices[0]!.playerId).toBe(donny.id);
    expect(state.stack).toHaveLength(0);

    chooseTriggerTarget(state, donny.id, { kind: "card", instanceId: bear.instanceId });
    expect(state.pendingTargetChoices).toHaveLength(0);
    drain(state);

    expect(findInstance(state, bear.instanceId)!.instance.plusOneCounters).toBe(1);
  });

  it("refuses a target the engine did not offer", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    enters(state, "grizzly-bears", donny.id);
    enters(state, "pest-mascot", donny.id);
    drain(state);
    enters(state, "duskshell-crawler", donny.id);

    expect(() => chooseTriggerTarget(state, mike.id, { kind: "player", playerId: mike.id })).toThrow(
      /belongs to/,
    );
    expect(() =>
      chooseTriggerTarget(state, donny.id, { kind: "player", playerId: mike.id }),
    ).toThrow(/not a legal target/);
  });

  it("takes the only legal target without asking", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    // The Crawler itself is the only creature on the table, and it is a legal
    // target for its own trigger.
    const crawler = enters(state, "duskshell-crawler", donny.id);

    expect(state.pendingTargetChoices).toHaveLength(0);
    drain(state);
    expect(findInstance(state, crawler.instanceId)!.instance.plusOneCounters).toBe(1);
  });

  it("gives trample to each of your creatures carrying a counter, itself included", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const bear = enters(state, "grizzly-bears", donny.id);
    const crawler = enters(state, "duskshell-crawler", donny.id);
    drain(state);
    if (state.pendingTargetChoices.length > 0) {
      chooseTriggerTarget(state, donny.id, { kind: "card", instanceId: crawler.instanceId });
      drain(state);
    }

    // The Crawler put the counter on itself, so it has trample and the bear
    // - which has no counter - does not.
    expect(hasKeyword(state, crawler, "Trample")).toBe(true);
    expect(hasKeyword(state, bear, "Trample")).toBe(false);

    bear.plusOneCounters = 1;
    expect(hasKeyword(state, bear, "Trample")).toBe(true);
    // And it goes away again the moment the counter does.
    bear.plusOneCounters = 0;
    expect(hasKeyword(state, bear, "Trample")).toBe(false);
  });

  it("Blood Artist drains the chosen player and pays its own controller", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    enters(state, "blood-artist", donny.id);
    const bear = enters(state, "grizzly-bears", mike.id);
    drain(state);
    const donnyLife = donny.life;
    const mikeLife = mike.life;

    damageCreature(state, bear, 99);
    checkStateBasedActions(state);

    chooseTriggerTarget(state, donny.id, { kind: "player", playerId: mike.id });
    drain(state);

    // "Target player loses 1 life and *you* gain 1 life" - two different
    // people, off one target.
    expect(mike.life).toBe(mikeLife - 1);
    expect(donny.life).toBe(donnyLife + 1);
  });

  it("Blood Artist sees its own death too", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    const artist = enters(state, "blood-artist", donny.id);
    drain(state);
    const mikeLife = mike.life;

    damageCreature(state, artist, 99);
    checkStateBasedActions(state);
    chooseTriggerTarget(state, donny.id, { kind: "player", playerId: mike.id });
    drain(state);

    expect(mike.life).toBe(mikeLife - 1);
  });
});

describe("Overgrown Tomb", () => {
  it("asks whether to pay, and enters untapped when you do", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const before = donny.life;
    const tomb = enters(state, "overgrown-tomb", donny.id);

    expect(state.pendingConfirmation?.playerId).toBe(donny.id);
    // Tapped while the question is open - the safe direction.
    expect(tomb.tapped).toBe(true);

    resolveConfirmation(state, donny.id, true);
    expect(tomb.tapped).toBe(false);
    expect(donny.life).toBe(before - 2);
  });

  it("stays tapped and costs nothing when you decline", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const before = donny.life;
    const tomb = enters(state, "overgrown-tomb", donny.id);

    resolveConfirmation(state, donny.id, false);
    expect(tomb.tapped).toBe(true);
    expect(donny.life).toBe(before);
  });

  it("does not offer a payment that would kill you", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    // Paying 2 at 2 life is legal by the rules and loses the game. Offering it
    // would be offering a way to concede by accident.
    donny.life = 2;
    const tomb = enters(state, "overgrown-tomb", donny.id);

    expect(state.pendingConfirmation).toBeNull();
    expect(tomb.tapped).toBe(true);
    expect(donny.life).toBe(2);
  });
});

describe("Underground Mortuary", () => {
  it("enters tapped and offers the top card to the graveyard", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    stockLibrary(state, donny.id);
    const topBefore = donny.library[0]!.instanceId;
    const libraryBefore = donny.library.length;

    const land = enters(state, "underground-mortuary", donny.id);
    expect(land.tapped).toBe(true);
    drain(state);

    expect(state.pendingSearch?.playerId).toBe(donny.id);
    expect(state.pendingSearch!.candidateInstanceIds).toEqual([topBefore]);

    resolveSearch(state, donny.id, topBefore);

    expect(donny.graveyard.some((c) => c.instanceId === topBefore)).toBe(true);
    expect(donny.library).toHaveLength(libraryBefore - 1);
  });

  it("leaves the card on top when you decline, and does not shuffle", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    stockLibrary(state, donny.id);
    const orderBefore = donny.library.map((c) => c.instanceId);

    enters(state, "underground-mortuary", donny.id);
    drain(state);
    resolveSearch(state, donny.id, null);

    // Surveil never shuffles - shuffling would throw away the information the
    // land just bought.
    expect(donny.library.map((c) => c.instanceId)).toEqual(orderBefore);
  });
});

describe("Arasta of the Endless Web", () => {
  it("spins a Spider when an opponent casts an instant", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    mainPhase(state);
    enters(state, "arasta-of-the-endless-web", donny.id);
    drain(state);

    const victim = enters(state, "grizzly-bears", mike.id);
    drain(state);
    castFromHand(state, "giant-growth", mike.id, {
      targets: [{ kind: "card", instanceId: victim.instanceId }],
    });
    drain(state);

    expect(donny.battlefield.filter((c) => c.definitionId === "token-g-12-spider-reach")).toHaveLength(1);
  });

  it("does not trigger off its own controller's spells", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "arasta-of-the-endless-web", donny.id);
    drain(state);

    castFromHand(state, "giant-growth", donny.id, {
      targets: [{ kind: "card", instanceId: state.players[0]!.battlefield[0]!.instanceId }],
    });
    drain(state);

    expect(donny.battlefield.filter((c) => c.definitionId === "token-g-12-spider-reach")).toHaveLength(0);
  });

  it("does not trigger off a creature spell - it says instant or sorcery", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    mainPhase(state);
    enters(state, "arasta-of-the-endless-web", donny.id);
    drain(state);
    // A creature is a sorcery-speed cast, so it has to be the caster's turn.
    state.activePlayerIndex = 1;

    castFromHand(state, "grizzly-bears", mike.id);
    drain(state);

    expect(donny.battlefield.filter((c) => c.definitionId === "token-g-12-spider-reach")).toHaveLength(0);
  });
});

describe("Hornet Nest", () => {
  it("makes one Insect per point of damage that lands", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const nest = enters(state, "hornet-nest", donny.id);
    drain(state);

    damageCreature(state, nest, 3);
    drain(state);

    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-g-11-insect-flying-deathtouch"),
    ).toHaveLength(3);
  });

  it("makes nothing behind a prevention shield - no damage was dealt", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    const nest = enters(state, "hornet-nest", donny.id);
    drain(state);
    nest.damagePrevention = 5;

    damageCreature(state, nest, 3);
    drain(state);

    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-g-11-insect-flying-deathtouch"),
    ).toHaveLength(0);
  });
});

describe("Send in the Pest", () => {
  it("takes a card from each opponent's hand and leaves a Pest behind", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    mainPhase(state);
    createCardInstance(state, "grizzly-bears", mike.id, "hand");
    const handBefore = mike.hand.length;

    castFromHand(state, "send-in-the-pest", donny.id);
    drain(state);

    expect(mike.hand).toHaveLength(handBefore - 1);
    expect(mike.graveyard).toHaveLength(1);
    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-attacks-gain-life"),
    ).toHaveLength(1);
  });

  it("still makes the Pest against an empty hand", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    mainPhase(state);
    mike.hand.length = 0;

    castFromHand(state, "send-in-the-pest", donny.id);
    drain(state);

    expect(
      donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-attacks-gain-life"),
    ).toHaveLength(1);
  });
});

describe("Golgari Charm", () => {
  it("mode one shrinks every creature on the table", () => {
    const state = makeTestGame();
    const [donny, mike] = [state.players[0]!, state.players[1]!];
    mainPhase(state);
    const mine = enters(state, "grizzly-bears", donny.id);
    const theirs = enters(state, "grizzly-bears", mike.id);
    drain(state);

    castFromHand(state, "golgari-charm", donny.id, { mode: 0 });
    drain(state);

    expect(effectivePower(state, mine)).toBe(1);
    expect(effectivePower(state, theirs)).toBe(1);
  });

  it("mode three shields your own board from destruction", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const bear = enters(state, "grizzly-bears", donny.id);
    drain(state);

    castFromHand(state, "golgari-charm", donny.id, { mode: 2 });
    drain(state);
    expect(bear.regenerationShields).toBe(1);

    damageCreature(state, bear, 99);
    checkStateBasedActions(state);

    // Regenerated rather than destroyed: still on the battlefield, tapped,
    // damage healed.
    expect(findInstance(state, bear.instanceId)?.instance.zone).toBe("battlefield");
    expect(bear.tapped).toBe(true);
  });
});
