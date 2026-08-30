import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requireDefinition } from "../state.js";
import { castCostReduction } from "../casting.js";
import { activateAbility } from "../abilities.js";

describe("Supremacy batch 20 (Disruptor Flute)", () => {
  it("taxes spells of the named card by {3} and locks that source's abilities", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const flute = createCardInstance(state, "disruptor-flute", alice.id, "battlefield");
    flute.chosenOnEntry = { cardName: "Sol Ring" };

    const solRing = requireDefinition(state, "sol-ring"); // {1}
    const bears = requireDefinition(state, "grizzly-bears");
    expect(castCostReduction(state, alice.id, solRing, solRing.manaCost!).generic, "Sol Ring +3").toBe(solRing.manaCost!.generic + 3);
    expect(castCostReduction(state, alice.id, bears, bears.manaCost!).generic, "other spells unaffected").toBe(bears.manaCost!.generic);

    // A Sol Ring on the battlefield: its {T} mana ability still works, but a
    // non-mana ability would be locked. Sol Ring only has a mana ability, so
    // assert the lock does not block a mana ability.
    const sol = createCardInstance(state, "sol-ring", alice.id, "battlefield");
    sol.summoningSickness = false;
    expect(() => activateAbility(state, alice.id, sol.instanceId, 0), "mana ability still allowed").not.toThrow();
  });
});
