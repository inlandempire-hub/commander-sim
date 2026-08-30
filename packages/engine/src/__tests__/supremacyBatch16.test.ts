import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { activateAbility } from "../abilities.js";
import { effectivePower } from "../counters.js";
import { isValidTarget } from "../targeting.js";
import { resolveTopOfStack } from "../stack.js";

function resolveStack(state: ReturnType<typeof makeTestGame>): void {
  let g = 10;
  while (state.stack.length > 0 && g-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 16", () => {
  it("Steel Seraph: prototype cast enters as a 3/3", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main";
    alice.manaPool = { W: 3 };
    const seraph = createCardInstance(state, "steel-seraph", alice.id, "hand");
    castSpell(state, alice.id, seraph.instanceId, [], { usePrototype: true });
    resolveStack(state);
    const inPlay = alice.battlefield.find((c) => c.definitionId === "steel-seraph")!;
    expect(effectivePower(state, inPlay), "prototype size 3/3").toBe(3);
  });

  it("Ambitious Farmhand: transforms to Seasoned Cathar only under coven", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    state.phase = "precombat-main"; state.step = "main";
    const farmhand = createCardInstance(state, "ambitious-farmhand", alice.id, "battlefield");
    farmhand.summoningSickness = false;
    expect(() => activateAbility(state, alice.id, farmhand.instanceId, 0), "no coven yet").toThrow();
    // Three distinct powers: farmhand 1, grizzly 2, regent 6.
    createCardInstance(state, "grizzly-bears", alice.id, "battlefield");
    createCardInstance(state, "necropolis-regent", alice.id, "battlefield");
    alice.manaPool = { W: 3 };
    activateAbility(state, alice.id, farmhand.instanceId, 0);
    resolveStack(state);
    expect(farmhand.definitionId, "flipped to the back face").toBe("seasoned-cathar");
  });

  it("Null Elemental Blast: only multicolored permanents are legal targets", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const gold = createCardInstance(state, "glissa-sunslayer", bob.id, "battlefield"); // B/G
    const mono = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // mono green
    const sel = { kind: "permanent", multicolored: true } as const;
    expect(isValidTarget(state, sel, { kind: "card", instanceId: gold.instanceId }, alice.id)).toBe(true);
    expect(isValidTarget(state, sel, { kind: "card", instanceId: mono.instanceId }, alice.id)).toBe(false);
  });
});
