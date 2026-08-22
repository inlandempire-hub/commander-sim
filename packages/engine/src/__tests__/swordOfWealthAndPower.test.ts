import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, findInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { declareAttackers, dealCombatDamage } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";
import { effectivePower, effectiveToughness } from "../counters.js";
import type { GameState } from "../types.js";

function drain(state: GameState): void {
  let guard = 60;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

function fillPool(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId)!;
  player.manaPool.generic = 20;
  for (const color of ["W", "U", "B", "R", "G"] as const) player.manaPool[color] = 20;
  state.priorityPlayerIndex = state.players.findIndex((p) => p.id === playerId);
}

/** Sword on the battlefield, attached to a fresh Grizzly Bears alice controls. */
function equippedBears(state: GameState, ownerId: string) {
  const bears = createCardInstance(state, "grizzly-bears", ownerId, "battlefield");
  const sword = createCardInstance(state, "sword-of-wealth-and-power", ownerId, "battlefield");
  sword.attachedTo = bears.instanceId;
  return { bears, sword };
}

describe("Sword of Wealth and Power", () => {
  it("gives +2/+2 and protection from instants and sorceries", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const { bears } = equippedBears(state, alice.id);

    expect(effectivePower(state, findInstance(state, bears.instanceId)!.instance)).toBe(4); // 2 + 2
    expect(effectiveToughness(state, findInstance(state, bears.instanceId)!.instance)).toBe(4);

    // Bob's Murder (an instant) cannot target the protected creature.
    const murder = createCardInstance(state, "murder", bob.id, "hand");
    fillPool(state, bob.id);
    expect(() =>
      castSpell(state, bob.id, murder.instanceId, [{ kind: "card", instanceId: bears.instanceId }]),
    ).toThrow(/protection/i);
  });

  it("on combat damage makes a Treasure and arms the next-cast copy, then copies the next instant", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    const bob = state.players[1]!;
    const { bears } = equippedBears(state, alice.id);
    findInstance(state, bears.instanceId)!.instance.summoningSickness = false;

    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    declareAttackers(state, alice.id, [{ attackerInstanceId: bears.instanceId, defendingPlayerId: bob.id }]);
    state.step = "combat-damage";
    dealCombatDamage(state, "regular");
    drain(state);

    // A Treasure token, and the delayed copy is armed.
    const treasures = alice.battlefield.filter(
      (c) => state.cardDefinitions[c.definitionId]?.id === "token-treasure",
    );
    expect(treasures.length).toBe(1);
    expect(alice.copyNextInstantOrSorcery).toBe(1);

    // Casting an instant now copies it: the copy joins it on the stack, and it
    // resolves twice (Reach Through Mists draws one, so two cards total).
    state.phase = "postcombat-main";
    state.step = "main";
    state.stack = [];
    const handBefore = alice.hand.length;
    for (let i = 0; i < 5; i++) createCardInstance(state, "grizzly-bears", alice.id, "library");
    const spell = createCardInstance(state, "reach-through-mists", alice.id, "hand");
    fillPool(state, alice.id);
    castSpell(state, alice.id, spell.instanceId, []);
    expect(state.stack.length).toBe(2); // the spell and its copy
    expect(alice.copyNextInstantOrSorcery).toBe(0);
    drain(state);
    expect(alice.hand.length).toBe(handBefore + 2);
  });
});
