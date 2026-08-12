import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance, requirePlayer } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { castSpell } from "../casting.js";
import { addMana } from "../mana.js";
import { affordableXValues } from "../autoPass.js";
import { applyEffect } from "../effects.js";
import { costWithX, resolveAmounts } from "../x.js";
import { effectivePower, effectiveToughness } from "../counters.js";
import { checkStateBasedActions } from "../sba.js";
import type { GameState } from "../types.js";

/**
 * {X} in a mana cost, and The Meathook Massacre - which needed it plus three
 * other things, none of them large and none of them optional:
 *
 * - the announced X surviving from the cast into an enters-the-battlefield
 *   trigger, which fires after the spell has left the stack;
 * - a death watcher narrowed by *who controlled* the dying creature, since the
 *   card has two of them pointed in opposite directions;
 * - life loss aimed at each opponent, which is not damage.
 */

function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  return instance;
}

function inHand(state: GameState, definitionId: string, playerId: string): string {
  return createCardInstance(state, definitionId, playerId, "hand").instanceId;
}

function mainPhase(state: GameState): void {
  state.phase = "precombat-main";
  state.step = "main";
}

function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

/** Gives a player enough of one colour to pay for anything in these tests. */
function stockMana(state: GameState, playerId: string, black: number): void {
  addMana(requirePlayer(state, playerId).manaPool, "B", black);
}

/**
 * Kills a creature the way the game does, by shrinking it past zero toughness
 * and letting state-based actions notice.
 *
 * Deliberately not `fireWatchers` called by hand: the whole question these
 * tests ask is whether the death watchers see a real death, and a helper that
 * fires them directly would pass even if `sba.ts` never called them.
 */
function kill(state: GameState, instance: { instanceId: string; controllerId: string }): void {
  applyEffect(state, instance.controllerId, instance.instanceId, { kind: "pump", power: -99, toughness: -99 }, []);
  checkStateBasedActions(state);
  drain(state);
}

describe("X in a mana cost", () => {
  it("adds X generic per {X} symbol", () => {
    // {X}{B}{B} at X = 3 is {3}{B}{B}.
    expect(costWithX({ generic: 0, colors: { B: 2 }, x: 1 }, 3)).toEqual({
      generic: 3,
      colors: { B: 2 },
      x: 1,
    });
    /*
     * {X}{X}{G} at X = 3 is {6}{G}, not {3}{G} - Pest Infestation is the reason
     * `x` counts the symbols rather than being a yes/no flag.
     */
    expect(costWithX({ generic: 0, colors: { G: 1 }, x: 2 }, 3).generic).toBe(6);
  });

  it("leaves a cost with no {X} completely alone", () => {
    const printed = { generic: 2, colors: { B: 1 } };
    expect(costWithX(printed, 4)).toBe(printed);
  });

  it("refuses to cast without a value announced", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    mainPhase(state);
    stockMana(state, alice.id, 10);

    expect(() => castSpell(state, alice.id, massacre)).toThrow(/value for X/);
  });

  it("charges for the X that was announced", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    mainPhase(state);
    stockMana(state, alice.id, 6);

    castSpell(state, alice.id, massacre, [], { chosenX: 3 });
    // {3}{B}{B} out of six black leaves one.
    expect(alice.manaPool.B).toBe(1);
  });

  it("refuses an X the player cannot pay for", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    mainPhase(state);
    stockMana(state, alice.id, 3);

    expect(() => castSpell(state, alice.id, massacre, [], { chosenX: 5 })).toThrow(/cannot afford/);
  });

  it("offers exactly the values that could be paid for", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    // Five Swamps on the battlefield: {B}{B} plus up to {3}.
    for (let i = 0; i < 5; i++) enters(state, "swamp", alice.id);
    mainPhase(state);

    expect(affordableXValues(state, alice.id, massacre)).toEqual([0, 1, 2, 3]);
  });

  it("always offers zero, because casting it for nothing is a real play", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    enters(state, "swamp", alice.id);
    enters(state, "swamp", alice.id);
    mainPhase(state);

    expect(affordableXValues(state, alice.id, massacre)).toEqual([0]);
  });
});

describe("substituting X into an effect", () => {
  it("replaces the marker with the announced value", () => {
    const substituted = resolveAmounts(
      { kind: "pumpAll", power: { kind: "x", negate: true }, toughness: { kind: "x", negate: true }, scope: "all" },
      3,
    );
    expect(substituted).toEqual({ kind: "pumpAll", power: -3, toughness: -3, scope: "all" });
  });

  it("reaches inside a sequence", () => {
    const substituted = resolveAmounts(
      {
        kind: "sequence",
        effects: [
          { kind: "gainLife", amount: 1 },
          { kind: "pumpAll", power: { kind: "x" }, toughness: { kind: "x" }, scope: "controller" },
        ],
      },
      2,
    );
    expect(substituted).toEqual({
      kind: "sequence",
      effects: [
        { kind: "gainLife", amount: 1 },
        { kind: "pumpAll", power: 2, toughness: 2, scope: "controller" },
      ],
    });
  });
});

describe("The Meathook Massacre", () => {
  it("shrinks every creature by the X it was cast for", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const mine = enters(state, "grizzly-bears", alice.id); // 2/2
    const theirs = enters(state, "grizzly-bears", mike.id);
    drain(state);

    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    mainPhase(state);
    stockMana(state, alice.id, 3);
    castSpell(state, alice.id, massacre, [], { chosenX: 1 });
    drain(state);

    // "Each creature", not "each creature you control" - both sides shrink.
    expect(effectivePower(state, mine)).toBe(1);
    expect(effectiveToughness(state, mine)).toBe(1);
    expect(effectiveToughness(state, theirs)).toBe(1);
  });

  it("kills what it shrinks past zero", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const theirs = enters(state, "grizzly-bears", mike.id);
    drain(state);

    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    mainPhase(state);
    stockMana(state, alice.id, 4);
    castSpell(state, alice.id, massacre, [], { chosenX: 2 });
    drain(state);
    checkStateBasedActions(state);

    expect(findInstance(state, theirs.instanceId)?.instance.zone).toBe("graveyard");
  });

  it("keeps X after resolving, because the trigger fires from the battlefield", () => {
    /*
     * The one thing that could quietly break: X is announced while the card is
     * a spell, and the -X/-X is an enters-the-battlefield trigger that fires
     * after it has become a permanent. Resetting X on the zone change - as
     * counters and pumps are reset - would wipe the board for nothing.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    mainPhase(state);
    stockMana(state, alice.id, 5);
    castSpell(state, alice.id, massacre, [], { chosenX: 3 });
    drain(state);

    expect(findInstance(state, massacre)?.instance.chosenX).toBe(3);
  });

  it("drains each opponent when a creature you control dies", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    enters(state, "the-meathook-massacre", alice.id);
    const mine = enters(state, "grizzly-bears", alice.id);
    drain(state);
    const theirLife = mike.life;
    const myLife = alice.life;

    kill(state, mine);

    expect(mike.life).toBe(theirLife - 1);
    // "Whenever a creature *you control* dies, each opponent loses 1 life" -
    // your own creature dying must not also gain you life off the other half.
    expect(alice.life).toBe(myLife);
  });

  it("gains you life when a creature an opponent controls dies", () => {
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    enters(state, "the-meathook-massacre", alice.id);
    const theirs = enters(state, "grizzly-bears", mike.id);
    drain(state);
    const theirLife = mike.life;
    const myLife = alice.life;

    kill(state, theirs);

    expect(alice.life).toBe(myLife + 1);
    // And the drain half must not also fire - that would be the card reading
    // "whenever a creature dies" twice, which is a strictly better card.
    expect(mike.life).toBe(theirLife);
  });

  it("watches every death once it is on the battlefield, cast for any X", () => {
    // The two death triggers are not gated on X at all - a Massacre cast for
    // zero still drains, which is why casting it for nothing is a real play.
    const state = makeTestGame();
    const [alice, mike] = [state.players[0]!, state.players[1]!];
    const massacre = inHand(state, "the-meathook-massacre", alice.id);
    const mine = enters(state, "grizzly-bears", alice.id);
    mainPhase(state);
    stockMana(state, alice.id, 2);
    castSpell(state, alice.id, massacre, [], { chosenX: 0 });
    drain(state);

    // X = 0 means -0/-0, so nothing died on the way in.
    expect(findInstance(state, mine.instanceId)?.instance.zone).toBe("battlefield");

    const theirLife = mike.life;
    kill(state, mine);
    expect(mike.life).toBe(theirLife - 1);
  });
});
