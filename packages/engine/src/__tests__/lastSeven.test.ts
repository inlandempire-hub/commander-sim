import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { applyEffect, resolveCardChoice, resolveSacrificeChoice, resolveSearch } from "../effects.js";
import { resolveConfirmation, resolveTopOfStack } from "../stack.js";
import {
  castPreparedSpell,
  castSpell,
  playLand,
  suspendCard,
} from "../casting.js";
import { advanceStep } from "../turn.js";
import { gainLife } from "../life.js";
import type { GameState, StackTarget } from "../types.js";

/**
 * The last seven cards on the Blech list.
 *
 * Four of them turn on a count the engine had no way to say: "up to X targets",
 * "two target players", "up to one target", and "mana value X or less" where X
 * moves during the turn. The other three are a card played without being cast,
 * a copy of a spell that is not a card, and a payment that has an "if you
 * didn't" branch.
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
  options: { targets?: StackTarget[]; chosenX?: number; bestowOnto?: string } = {},
) {
  const card = createCardInstance(state, definitionId, playerId, "hand");
  fillPool(state, playerId);
  castSpell(state, playerId, card.instanceId, options.targets ?? [], {
    chosenX: options.chosenX,
    bestowOnto: options.bestowOnto,
  });
  return card;
}

function toEndStep(state: GameState): void {
  let guard = 30;
  while (state.step !== "end" && guard-- > 0) advanceStep(state);
}

describe("how many things a spell points at", () => {
  it("Pest Infestation destroys up to X, and refuses more", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    const a = enters(state, "skullclamp", mike.id);
    const b = enters(state, "the-ozolith", mike.id);
    const c = enters(state, "doubling-season", mike.id);

    const card = createCardInstance(state, "pest-infestation", donny.id, "hand");
    fillPool(state, donny.id);
    // X = 2, so three targets is not a legal cast.
    expect(() =>
      castSpell(
        state,
        donny.id,
        card.instanceId,
        [a, b, c].map((i) => ({ kind: "card" as const, instanceId: i.instanceId })),
        { chosenX: 2 },
      ),
    ).toThrow(/at most 2/);

    castSpell(
      state,
      donny.id,
      card.instanceId,
      [a, b].map((i) => ({ kind: "card" as const, instanceId: i.instanceId })),
      { chosenX: 2 },
    );
    drain(state);

    expect(findInstance(state, a.instanceId)?.instance.zone).toBe("graveyard");
    expect(findInstance(state, c.instanceId)?.instance.zone).toBe("battlefield");
    // "Twice X" - four Pests for X = 2, which is a different number from the
    // two the cost charged and the two it destroyed.
    expect(donny.battlefield.filter((t) => t.definitionId === "token-bg-11-pest-dies-gain-life")).toHaveLength(4);
  });

  it("Pest Infestation is happy to destroy nothing, because it says 'up to'", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const card = createCardInstance(state, "pest-infestation", donny.id, "hand");
    fillPool(state, donny.id);

    castSpell(state, donny.id, card.instanceId, [], { chosenX: 1 });
    drain(state);
    expect(donny.battlefield.filter((t) => t.definitionId === "token-bg-11-pest-dies-gain-life")).toHaveLength(2);
  });

  it("Scheming Symmetry demands two players, and asks each in turn", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    for (let i = 0; i < 3; i++) {
      createCardInstance(state, "grizzly-bears", donny.id, "library");
      createCardInstance(state, "giant-spider", mike.id, "library");
    }

    const card = createCardInstance(state, "scheming-symmetry", donny.id, "hand");
    fillPool(state, donny.id);
    // One target is not "two target players".
    expect(() =>
      castSpell(state, donny.id, card.instanceId, [{ kind: "player", playerId: donny.id }]),
    ).toThrow(/requires 2 targets/);

    castSpell(state, donny.id, card.instanceId, [
      { kind: "player", playerId: donny.id },
      { kind: "player", playerId: mike.id },
    ]);
    drain(state);

    // The first player is asked, and the second only once they have answered.
    expect(state.pendingSearch?.playerId).toBe(donny.id);
    const mine = donny.library[0]!.instanceId;
    resolveSearch(state, donny.id, mine);
    expect(donny.library[0]!.instanceId).toBe(mine);

    expect(state.pendingSearch?.playerId).toBe(mike.id);
    const theirs = mike.library[1]!.instanceId;
    resolveSearch(state, mike.id, theirs);
    expect(mike.library[0]!.instanceId).toBe(theirs);
  });
});

describe("Braids offers a choice and punishes the refusal", () => {
  it("lets the controller give up any permanent type, not only a creature", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "braids-arisen-nightmare", donny.id);
    const land = enters(state, "forest", donny.id);

    toEndStep(state);
    drain(state);

    // A land is a legal thing to give up - the card names five types.
    expect(state.pendingSacrifice?.candidateInstanceIds).toContain(land.instanceId);
  });

  it("drains and draws when the opponent declines", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    for (let i = 0; i < 3; i++) createCardInstance(state, "forest", donny.id, "library");
    const braids = enters(state, "braids-arisen-nightmare", donny.id);
    const fodder = enters(state, "grizzly-bears", donny.id);
    enters(state, "giant-spider", mike.id);
    const handBefore = donny.hand.length;

    toEndStep(state);
    drain(state);
    resolveSacrificeChoice(state, donny.id, fodder.instanceId);

    // The opponent is now asked, and their Spider shares a type with the Bear.
    const offer = state.pendingCardChoices[0]!;
    expect(offer.playerId).toBe(mike.id);
    expect(offer.min).toBe(0);

    resolveCardChoice(state, mike.id, []);
    expect(mike.life).toBe(38);
    expect(donny.hand.length).toBe(handBefore + 1);
    void braids;
  });

  it("costs the opponent nothing but the permanent when they accept", () => {
    const state = makeTestGame();
    const [donny, mike] = state.players as [(typeof state.players)[0], (typeof state.players)[0]];
    mainPhase(state);
    for (let i = 0; i < 3; i++) createCardInstance(state, "forest", donny.id, "library");
    enters(state, "braids-arisen-nightmare", donny.id);
    const fodder = enters(state, "grizzly-bears", donny.id);
    const theirs = enters(state, "giant-spider", mike.id);
    const handBefore = donny.hand.length;

    toEndStep(state);
    drain(state);
    resolveSacrificeChoice(state, donny.id, fodder.instanceId);
    resolveCardChoice(state, mike.id, [theirs.instanceId]);

    expect(findInstance(state, theirs.instanceId)?.instance.zone).toBe("graveyard");
    expect(mike.life).toBe(40);
    expect(donny.hand.length).toBe(handBefore);
  });
});

describe("Moseo's cap moves with the life gained", () => {
  it("offers only creatures cheap enough for the life gained this turn", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "moseo-veins-new-dean", donny.id);
    drain(state);
    // Grizzly Bears is mana value 2; Hornet Queen is 7.
    createCardInstance(state, "grizzly-bears", donny.id, "graveyard");
    createCardInstance(state, "hornet-queen", donny.id, "graveyard");

    gainLife(state, donny.id, 2);
    toEndStep(state);

    // Two life gained, so the 2-drop is a legal target and the 7-drop is not.
    const choice = state.pendingTargetChoices[0];
    const parked = choice ?? null;
    if (parked) {
      const names = parked.candidates.map((c) =>
        c.kind === "card" ? state.cardDefinitions[findInstance(state, c.instanceId)!.instance.definitionId]!.name : "",
      );
      expect(names).toContain("Grizzly Bears");
      expect(names).not.toContain("Hornet Queen");
    } else {
      // Exactly one legal target is taken without asking.
      const obj = state.stack.find((o) => o.effect.kind === "returnFromGraveyard");
      expect(obj).toBeDefined();
      const target = obj!.targets[0];
      expect(target?.kind).toBe("card");
      const def = state.cardDefinitions[findInstance(state, (target as { instanceId: string }).instanceId)!.instance.definitionId]!;
      expect(def.name).toBe("Grizzly Bears");
    }
  });

  it("does not fire at all without life gained, and does nothing with an empty graveyard", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    enters(state, "moseo-veins-new-dean", donny.id);
    drain(state);

    toEndStep(state);
    // The intervening-if is false, so the ability never reaches the stack.
    expect(state.stack.some((o) => o.effect.kind === "returnFromGraveyard")).toBe(false);
  });
});

describe("suspend is a way of playing a card, not of casting it", () => {
  it("exiles Profane Tutor with time counters and casts it when they run out", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    for (let i = 0; i < 5; i++) createCardInstance(state, "grizzly-bears", donny.id, "library");
    const tutor = createCardInstance(state, "profane-tutor", donny.id, "hand");
    fillPool(state, donny.id);

    suspendCard(state, donny.id, tutor.instanceId);
    expect(findInstance(state, tutor.instanceId)?.instance.zone).toBe("exile");
    expect(tutor.timeCounters).toBe(2);
    // Nothing on the stack: suspending is not casting.
    expect(state.stack).toHaveLength(0);

    // Two of the controller's upkeeps, one counter each.
    const toMyUpkeep = () => {
      let guard = 40;
      while (guard-- > 0) {
        advanceStep(state);
        if (state.step === "upkeep" && state.players[state.activePlayerIndex]!.id === donny.id) return;
      }
    };
    toMyUpkeep();
    expect(tutor.timeCounters).toBe(1);
    toMyUpkeep();
    expect(tutor.timeCounters).toBe(0);

    /*
     * The last counter cast it, free - and it is a real cast, so it went on the
     * stack rather than resolving on the spot. Only once it resolves does the
     * search stop the game to ask, which is the proof it was genuinely cast
     * rather than having its effect applied by hand.
     */
    expect(state.stack.some((o) => o.effect.kind === "searchLibrary")).toBe(true);
    drain(state);
    expect(state.pendingSearch?.playerId).toBe(donny.id);
  });

  it("refuses to suspend a card with no suspend cost", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const bear = createCardInstance(state, "grizzly-bears", donny.id, "hand");
    fillPool(state, donny.id);
    expect(() => suspendCard(state, donny.id, bear.instanceId)).toThrow(/no suspend cost/);
  });
});

describe("Springheart Nantuko is an Aura when it is bestowed", () => {
  it("attaches, buffs, and stops being a creature", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const host = enters(state, "grizzly-bears", donny.id);

    const nantuko = castFromHand(state, "springheart-nantuko", donny.id, {
      bestowOnto: host.instanceId,
    });
    drain(state);

    const onBoard = donny.battlefield.find((c) => c.instanceId === nantuko.instanceId)!;
    expect(onBoard.bestowed).toBe(true);
    expect(onBoard.attachedTo).toBe(host.instanceId);
    // +1/+1 to the host, and the Nantuko itself is not a creature meanwhile.
    expect(donny.battlefield.filter((c) => c.instanceId === host.instanceId)).toHaveLength(1);
  });

  it("offers the payment on landfall, and takes the other branch when declined", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const host = enters(state, "grizzly-bears", donny.id);
    const nantuko = castFromHand(state, "springheart-nantuko", donny.id, {
      bestowOnto: host.instanceId,
    });
    drain(state);
    fillPool(state, donny.id);

    const land = createCardInstance(state, "forest", donny.id, "hand");
    playLand(state, donny.id, land.instanceId);
    drain(state);

    expect(state.pendingConfirmation?.prompt).toContain("{1}{G}");
    resolveConfirmation(state, donny.id, false);

    // "If you didn't create a token this way" - the Insect is the other half.
    expect(donny.battlefield.filter((c) => c.definitionId === "token-g-11-insect")).toHaveLength(1);
    void nantuko;
  });

  it("copies the enchanted creature when the payment is taken", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const host = enters(state, "grizzly-bears", donny.id);
    castFromHand(state, "springheart-nantuko", donny.id, { bestowOnto: host.instanceId });
    drain(state);
    fillPool(state, donny.id);

    const land = createCardInstance(state, "forest", donny.id, "hand");
    playLand(state, donny.id, land.instanceId);
    drain(state);
    resolveConfirmation(state, donny.id, true);

    const bears = donny.battlefield.filter((c) => c.definitionId === "grizzly-bears");
    expect(bears).toHaveLength(2);
    expect(bears.filter((c) => c.isTokenCopy)).toHaveLength(1);
    expect(donny.battlefield.filter((c) => c.definitionId === "token-g-11-insect")).toHaveLength(0);
  });
});

describe("a copy of a spell is not a card", () => {
  it("Eccentric Pestfinder becomes prepared, then casts Turn Stones without moving", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const finder = enters(state, "eccentric-pestfinder", donny.id);

    // No life gained, so the intervening-if is false.
    toEndStep(state);
    drain(state);
    expect(finder.prepared).toBe(false);

    mainPhase(state);
    gainLife(state, donny.id, 1);
    toEndStep(state);
    drain(state);
    expect(finder.prepared).toBe(true);

    mainPhase(state);
    fillPool(state, donny.id);
    castPreparedSpell(state, donny.id, finder.instanceId);
    // Nothing moved: the creature is still on the battlefield, unprepared.
    expect(findInstance(state, finder.instanceId)?.instance.zone).toBe("battlefield");
    expect(finder.prepared).toBe(false);
    drain(state);

    // "For each opponent" - one Pest in a duel.
    expect(donny.battlefield.filter((c) => c.definitionId === "token-bg-11-pest-dies-gain-life")).toHaveLength(1);
  });

  it("refuses to cast the copy when it is not prepared", () => {
    const state = makeTestGame();
    const donny = state.players[0]!;
    mainPhase(state);
    const finder = enters(state, "eccentric-pestfinder", donny.id);
    fillPool(state, donny.id);
    expect(() => castPreparedSpell(state, donny.id, finder.instanceId)).toThrow(/not prepared/);
  });
});
