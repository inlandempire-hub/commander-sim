import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requireDefinition } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { applyEffect } from "../effects.js";

function settle(state: ReturnType<typeof makeTestGame>): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("Supremacy batch 8 (MDFCs)", () => {
  it("Witch Enchanter: ETB destroys an opponent's artifact; its back is a white land", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    createCardInstance(state, "sol-ring", bob.id, "battlefield");
    const witch = createCardInstance(state, "witch-enchanter", alice.id, "hand");
    putOntoBattlefield(state, witch.instanceId, { wasCast: true });
    settle(state);
    expect(bob.battlefield.some((c) => c.definitionId === "sol-ring"), "Sol Ring destroyed").toBe(false);

    const back = requireDefinition(state, "witch-blessed-meadow");
    expect(back.isBackFace).toBe(true);
    expect(back.types).toContain("Land");
    expect(requireDefinition(state, "witch-enchanter").backFaceId).toBe("witch-blessed-meadow");
  });

  it("Razorgrass Ambush: 3 damage to an attacking creature; back is a land", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const attacker = createCardInstance(state, "grizzly-bears", bob.id, "battlefield"); // 2/2
    state.attackers[attacker.instanceId] = alice.id;
    const spell = createCardInstance(state, "razorgrass-ambush", alice.id, "hand");
    applyEffect(state, alice.id, spell.instanceId, {
      kind: "damage", amount: 3, target: { kind: "permanent", cardTypes: ["Creature"], attackingOrBlocking: true },
    }, [{ kind: "card", instanceId: attacker.instanceId }]);
    expect(attacker.damageMarked, "3 damage dealt").toBe(3);
    expect(requireDefinition(state, "razorgrass-ambush").backFaceId).toBe("razorgrass-field");
  });
});
