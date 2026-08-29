import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castCostReduction } from "../casting.js";
import { advanceStep } from "../turn.js";
import { requireDefinition } from "../state.js";

describe("Supremacy batch 5 (static artifacts)", () => {
  it("Pearl Medallion: white spells you cast cost {1} less", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "pearl-medallion", alice.id, "battlefield");
    const swords = requireDefinition(state, "swords-to-plowshares"); // {W}
    const bears = requireDefinition(state, "grizzly-bears"); // {1}{G}, not white

    // Inspiring Overseer {2}{W} -> {1}{W} with the Medallion out.
    const overseer = requireDefinition(state, "inspiring-overseer");
    const reduced = castCostReduction(state, alice.id, overseer, overseer.manaCost!);
    expect(reduced.generic, "white spell shaved by 1").toBe(1);

    // A non-white spell is unaffected.
    const green = castCostReduction(state, alice.id, bears, bears.manaCost!);
    expect(green.generic).toBe(bears.manaCost!.generic);

    // Swords has no generic to shave; still white, floor at 0.
    const sw = castCostReduction(state, alice.id, swords, swords.manaCost!);
    expect(sw.generic).toBe(0);
  });

  it("Winter Moon: only one nonbasic land untaps", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    createCardInstance(state, "winter-moon", alice.id, "battlefield");
    const cmd1 = createCardInstance(state, "command-tower", alice.id, "battlefield");
    const cmd2 = createCardInstance(state, "command-tower", alice.id, "battlefield");
    const plains = createCardInstance(state, "plains", alice.id, "battlefield");
    cmd1.tapped = true;
    cmd2.tapped = true;
    plains.tapped = true;

    // End Bob's turn; the single advanceStep runs through Alice's (auto-skipped)
    // untap step exactly once.
    state.activePlayerIndex = 1;
    state.phase = "ending";
    state.step = "end";
    advanceStep(state);
    expect(state.activePlayerIndex, "now Alice's turn, past her untap").toBe(0);

    const untappedNonbasics = [cmd1, cmd2].filter((c) => !c.tapped).length;
    expect(untappedNonbasics, "only one Command Tower untapped").toBe(1);
    expect(plains.tapped, "the basic Plains untapped freely").toBe(false);
  });
});
