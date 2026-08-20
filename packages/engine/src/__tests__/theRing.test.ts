import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { resolveCardChoice } from "../effects.js";
import { activateAbility } from "../abilities.js";
import { castSpell } from "../casting.js";
import { advanceStep } from "../turn.js";
import { blockProblem, declareAttackers, declareBlockers, dealCombatDamage } from "../combat.js";
import { hasKeyword } from "../counters.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * The Ring, and Boromir who hands it to you.
 *
 * An emblem with four cumulative abilities and a creature that bears them. Every
 * one of the four belongs to the *bearer*, which is why they are read off the
 * player's level rather than stamped onto a creature - a stamped ability would
 * stay on a creature that stopped bearing it.
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
  while (state.stack.length > 0 && guard++ < 40) resolveTopOfStack(state);
}

/** A player already tempted to the given level, bearing the given creature. */
function tempted(state: GameState, playerId: string, level: number, bearer: CardInstance): void {
  const player = requirePlayer(state, playerId);
  player.ringLevel = level;
  player.ringBearerInstanceId = bearer.instanceId;
}

describe("Boromir, Warden of the Tower", () => {
  it("counters a spell cast for no mana", () => {
    const { state, me, them } = game();
    put(state, "boromir-warden-of-the-tower", me);
    // A {0} spell: no mana was spent, which is the rule and is what makes him
    // answer a Mox as well as a Force of Will.
    const thopter = createCardInstance(state, "ornithopter", them, "hand");

    state.activePlayerIndex = 1;
    state.priorityPlayerIndex = 1;
    castSpell(state, them, thopter.instanceId, []);
    settle(state);

    expect(thopter.zone).toBe("graveyard");
    expect(thopter.zone).not.toBe("battlefield");
  });

  it("leaves a spell that was paid for alone", () => {
    const { state, me, them } = game();
    put(state, "boromir-warden-of-the-tower", me);
    const bolt = createCardInstance(state, "lightning-bolt", them, "hand");
    requirePlayer(state, them).manaPool.R = 1;

    state.activePlayerIndex = 1;
    state.priorityPlayerIndex = 1;
    castSpell(state, them, bolt.instanceId, [{ kind: "player", playerId: me }]);
    settle(state);

    expect(requirePlayer(state, me).life).toBe(37);
  });

  it("does not counter its own controller's free spells", () => {
    const { state, me } = game();
    put(state, "boromir-warden-of-the-tower", me);
    const thopter = createCardInstance(state, "ornithopter", me, "hand");

    castSpell(state, me, thopter.instanceId, []);
    settle(state);

    // "Whenever an **opponent** casts a spell."
    expect(thopter.zone).toBe("battlefield");
  });

  it("shields the board and tempts you when sacrificed", () => {
    const { state, me } = game();
    const boromir = put(state, "boromir-warden-of-the-tower", me);
    const bear = put(state, "grizzly-bears", me);

    activateAbility(state, me, boromir.instanceId, 0);
    settle(state);

    expect(hasKeyword(state, bear, "Indestructible")).toBe(true);
    expect(requirePlayer(state, me).ringLevel).toBe(1);
    // A Ring-bearer is a real choice, and the game stops for it.
    expect(state.pendingCardChoices[0]?.mode).toBe("ring-bearer");
    resolveCardChoice(state, me, [bear.instanceId]);
    expect(requirePlayer(state, me).ringBearerInstanceId).toBe(bear.instanceId);
  });

  it("tempts without asking when you control no creature to bear it", () => {
    const { state, me } = game();
    const boromir = put(state, "boromir-warden-of-the-tower", me);

    activateAbility(state, me, boromir.instanceId, 0);
    settle(state);

    // He sacrificed himself, so there is nobody left to carry it - and the
    // emblem still went up a level.
    expect(requirePlayer(state, me).ringLevel).toBe(1);
    expect(state.pendingCardChoices).toHaveLength(0);
    expect(requirePlayer(state, me).ringBearerInstanceId).toBeNull();
  });
});

describe("The Ring's four abilities", () => {
  it("1 - the bearer cannot be blocked by anything bigger", () => {
    const { state, me, them } = game();
    const bearer = put(state, "grizzly-bears", me); // 2/2
    tempted(state, me, 1, bearer);
    const small = put(state, "savannah-lions", them); // 2/1
    const big = put(state, "capital-guard", them); // 2/2... equal, so legal

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: bearer.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";

    // "greater power" - equal is fine, which is what the word means.
    expect(blockProblem(state, them, small.instanceId, bearer.instanceId)).toBeNull();
    expect(blockProblem(state, them, big.instanceId, bearer.instanceId)).toBeNull();

    big.plusOneCounters = 1; // now a 3/3
    expect(blockProblem(state, them, big.instanceId, bearer.instanceId)).toMatch(/no greater than/);
  });

  it("1 - and only the bearer", () => {
    const { state, me, them } = game();
    const bearer = put(state, "grizzly-bears", me);
    const other = put(state, "savannah-lions", me);
    tempted(state, me, 1, bearer);
    const blocker = put(state, "capital-guard", them);
    blocker.plusOneCounters = 3;

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: other.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";

    expect(blockProblem(state, them, blocker.instanceId, other.instanceId)).toBeNull();
  });

  it("2 - the bearer draws and discards when it attacks", () => {
    const { state, me, them } = game();
    const bearer = put(state, "grizzly-bears", me);
    tempted(state, me, 2, bearer);
    createCardInstance(state, "forest", me, "library");
    createCardInstance(state, "mountain", me, "hand");
    const before = requirePlayer(state, me).hand.length;

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: bearer.instanceId, defendingPlayerId: them }]);
    settle(state);

    expect(requirePlayer(state, me).hand.length).toBe(before + 1);
    // Which card you give up is a real decision, so the game stops and asks.
    expect(state.pendingDiscards[0]?.playerId).toBe(me);
  });

  it("2 - and does nothing at level one", () => {
    const { state, me, them } = game();
    const bearer = put(state, "grizzly-bears", me);
    tempted(state, me, 1, bearer);
    createCardInstance(state, "forest", me, "library");
    const before = requirePlayer(state, me).hand.length;

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: bearer.instanceId, defendingPlayerId: them }]);
    settle(state);

    expect(requirePlayer(state, me).hand.length).toBe(before);
  });

  it("3 - a creature that blocks the bearer is sacrificed at end of combat", () => {
    const { state, me, them } = game();
    const bearer = put(state, "grizzly-bears", me);
    tempted(state, me, 3, bearer);
    const blocker = put(state, "capital-guard", them);

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: bearer.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";
    declareBlockers(state, them, [
      { blockerInstanceId: blocker.instanceId, attackerInstanceId: bearer.instanceId },
    ]);
    settle(state);

    // Still there while combat is on - it blocks and deals its damage first.
    expect(blocker.zone).toBe("battlefield");

    state.step = "combat-damage";
    advanceStep(state); // into end-combat
    expect(state.step).toBe("end-combat");
    settle(state);

    expect(blocker.zone).toBe("graveyard");
  });

  it("4 - each opponent loses 3 when the bearer connects", () => {
    const { state, me, them } = game();
    const bearer = put(state, "grizzly-bears", me);
    tempted(state, me, 4, bearer);
    const before = requirePlayer(state, them).life;

    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, me, [{ attackerInstanceId: bearer.instanceId, defendingPlayerId: them }]);
    state.step = "declare-blockers";
    declareBlockers(state, them, []);
    dealCombatDamage(state);
    settle(state);

    // Two damage from the Bears, and three more from The Ring.
    expect(requirePlayer(state, them).life).toBe(before - 5);
  });

  it("the abilities follow the bearer rather than sticking to a creature", () => {
    const { state, me } = game();
    const first = put(state, "grizzly-bears", me);
    const second = put(state, "savannah-lions", me);
    tempted(state, me, 4, first);

    requirePlayer(state, me).ringBearerInstanceId = second.instanceId;

    // Nothing had to be taken off the old bearer, which is the whole reason the
    // abilities are read rather than stamped.
    expect(state.cardDefinitions[first.definitionId]?.triggeredAbilities ?? []).toHaveLength(0);
    expect(first.grantedTriggers).toHaveLength(0);
  });

  it("stops at four however many times you are tempted", () => {
    const { state, me } = game();
    const player = requirePlayer(state, me);
    for (let i = 0; i < 6; i++) {
      const boromir = put(state, "boromir-warden-of-the-tower", me);
      activateAbility(state, me, boromir.instanceId, 0);
      settle(state);
      if (state.pendingCardChoices.length > 0) {
        resolveCardChoice(state, me, [state.pendingCardChoices[0]!.candidateInstanceIds[0]!]);
      }
    }
    expect(player.ringLevel).toBe(4);
  });
});
