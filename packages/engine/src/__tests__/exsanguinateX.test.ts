import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpellWithAutoTap } from "../autoTap.js";
import { resolveTopOfStack } from "../stack.js";

/**
 * Regression: Exsanguinate ({X}{B}{B}, "each opponent loses X life, you gain
 * that much") crashed when actually cast, because resolveAmounts did not
 * substitute X into the `drain` effect - the X reached the drain handler
 * unresolved. Found by the headless lab walk; the Winter batch test had applied
 * the effect with a pre-resolved amount and so never exercised the cast path.
 */
describe("Exsanguinate with X (drain)", () => {
  it("drains each opponent for X and gains you that much when cast", () => {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    // Three Swamps: {X}{B}{B} with X = 1.
    for (let i = 0; i < 3; i++) createCardInstance(state, "swamp", alice.id, "battlefield");
    const exsang = createCardInstance(state, "exsanguinate", alice.id, "hand");

    const bobBefore = bob.life;
    const aliceBefore = alice.life;
    expect(() => castSpellWithAutoTap(state, alice.id, exsang.instanceId, [], { chosenX: 1 })).not.toThrow();
    let guard = 10;
    while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);

    expect(bob.life, "opponent lost X=1").toBe(bobBefore - 1);
    expect(alice.life, "you gained the life lost").toBe(aliceBefore + 1);
  });
});
