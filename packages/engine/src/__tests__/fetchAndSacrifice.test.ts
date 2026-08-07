import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requireDefinition } from "../state.js";
import { activateAbility } from "../abilities.js";
import { resolveTopOfStack } from "../stack.js";
import { resolveSearch } from "../effects.js";
import { potentialAvailableMana } from "../mana.js";
import { manaSources } from "../autoTap.js";
import { hasAnyLegalAction } from "../autoPass.js";
import type { GameState } from "../types.js";

/**
 * Fetchlands and Sakura-Tribe Elder: the two activated-ability costs that carry
 * a mana base, `payLife` and `sacrificeSelf`.
 *
 * Both are paid on *activation*, not on resolution, and that ordering is the
 * whole trick - a fetchland is already in the graveyard when its search
 * resolves, and the search still works, because an ability is independent of
 * its source once it is on the stack.
 */

function mainPhase(): GameState {
  const state = makeTestGame();
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

function settle(state: GameState): void {
  let guard = 20;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

describe("fetchlands", () => {
  it("pays a life and sacrifices itself as the cost", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const before = alice.life;
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    activateAbility(state, alice.id, fetch.instanceId, 0);

    expect(alice.life).toBe(before - 1);
    expect(fetch.zone).toBe("graveyard");
    expect(alice.battlefield).not.toContain(fetch);
  });

  it("still finds the land, from the graveyard", () => {
    // The point of paying the cost up front: the source is gone and the ability
    // resolves anyway. Written the other way round - sacrifice as part of the
    // effect - a fetchland would never fetch.
    const state = mainPhase();
    const alice = state.players[0]!;
    const swamp = createCardInstance(state, "swamp", alice.id, "library");
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    activateAbility(state, alice.id, fetch.instanceId, 0);
    settle(state);

    expect(state.pendingSearch?.candidateInstanceIds).toContain(swamp.instanceId);
    resolveSearch(state, alice.id, swamp.instanceId);
    expect(swamp.zone).toBe("battlefield");
  });

  it("puts the land in untapped, because the card does not say tapped", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const forest = createCardInstance(state, "forest", alice.id, "library");
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    activateAbility(state, alice.id, fetch.instanceId, 0);
    settle(state);
    resolveSearch(state, alice.id, forest.instanceId);

    expect(forest.tapped).toBe(false);
  });

  it("finds a nonbasic that has the land type", () => {
    // "A Swamp or Forest card" is a type, not "a basic land". A fetch that
    // could only take basics would be a materially weaker card, and Bayou is
    // the standard reason anyone plays one.
    const state = mainPhase();
    const alice = state.players[0]!;
    const bayou = createCardInstance(state, "bayou", alice.id, "library");
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    activateAbility(state, alice.id, fetch.instanceId, 0);
    settle(state);

    expect(state.pendingSearch?.candidateInstanceIds).toContain(bayou.instanceId);
  });

  it("offers only the two types it names", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const island = createCardInstance(state, "island", alice.id, "library");
    const plains = createCardInstance(state, "plains", alice.id, "library");
    const swamp = createCardInstance(state, "swamp", alice.id, "library");
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield"); // Swamp or Forest

    activateAbility(state, alice.id, fetch.instanceId, 0);
    settle(state);

    const offered = state.pendingSearch?.candidateInstanceIds ?? [];
    expect(offered).toContain(swamp.instanceId);
    expect(offered).not.toContain(island.instanceId);
    expect(offered).not.toContain(plains.instanceId);
  });

  it("cannot be activated with no life to pay", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    alice.life = 0;
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    expect(() => activateAbility(state, alice.id, fetch.instanceId, 0)).toThrow(/cannot pay/);
    // And nothing was paid on the way to failing.
    expect(fetch.zone).toBe("battlefield");
    expect(fetch.tapped).toBe(false);
  });

  it("can be activated at exactly the life it costs", () => {
    // Paying down to 0 is legal; losing for it is a state-based action, not a
    // restriction on paying. Hence `<` rather than `<=` on the check.
    const state = mainPhase();
    const alice = state.players[0]!;
    alice.life = 1;
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    expect(() => activateAbility(state, alice.id, fetch.instanceId, 0)).not.toThrow();
    expect(alice.life).toBe(0);
  });

  it("is never counted as a source of mana", () => {
    // It taps, so a naive scan sees a tap ability. It produces nothing, costs a
    // life and costs the land - counting it would have the game offer spells
    // that cannot be cast.
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    expect(manaSources(state, alice)).toHaveLength(0);
    expect(potentialAvailableMana(state, alice.id)).toEqual({});
  });

  it("counts as something worth stopping the turn for", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    createCardInstance(state, "swamp", alice.id, "library");
    createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    expect(hasAnyLegalAction(state, alice.id)).toBe(true);
  });

  it("stops being an action when the life is not there", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    alice.life = 0;
    createCardInstance(state, "swamp", alice.id, "library");
    createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    expect(hasAnyLegalAction(state, alice.id)).toBe(false);
  });
});

describe("Sakura-Tribe Elder", () => {
  it("sacrifices itself with no tap and no mana", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const before = alice.life;
    const elder = createCardInstance(state, "sakura-tribe-elder", alice.id, "battlefield");

    activateAbility(state, alice.id, elder.instanceId, 0);

    expect(elder.zone).toBe("graveyard");
    expect(alice.life).toBe(before);
  });

  it("works the turn it arrives", () => {
    // Summoning sickness only stops abilities with the tap symbol. This one has
    // none, so a freshly cast Elder can be sacrificed immediately - which is
    // most of why the card is played.
    const state = mainPhase();
    const alice = state.players[0]!;
    const elder = createCardInstance(state, "sakura-tribe-elder", alice.id, "battlefield");
    elder.summoningSickness = true;

    expect(() => activateAbility(state, alice.id, elder.instanceId, 0)).not.toThrow();
  });

  it("finds a basic land and brings it in tapped", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const forest = createCardInstance(state, "forest", alice.id, "library");
    const bayou = createCardInstance(state, "bayou", alice.id, "library");
    const elder = createCardInstance(state, "sakura-tribe-elder", alice.id, "battlefield");

    activateAbility(state, alice.id, elder.instanceId, 0);
    settle(state);

    const offered = state.pendingSearch?.candidateInstanceIds ?? [];
    expect(offered).toContain(forest.instanceId);
    // Basic land only - Bayou is a land with the right types and is still not
    // a legal find here, which is the difference from a fetchland.
    expect(offered).not.toContain(bayou.instanceId);

    resolveSearch(state, alice.id, forest.instanceId);
    expect(forest.zone).toBe("battlefield");
    expect(forest.tapped).toBe(true);
  });
});

describe("sacrificing goes through the death rules", () => {
  it("is not destruction - indestructible does not save it", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const elder = createCardInstance(state, "sakura-tribe-elder", alice.id, "battlefield");

    activateAbility(state, alice.id, elder.instanceId, 0);

    expect(elder.zone).toBe("graveyard");
  });

  it("sends a sacrificed commander to the command zone", () => {
    // Proof that the sacrifice reuses the death handler rather than doing its
    // own moveCard: the commander replacement effect applies, and so - by the
    // same route - would any dies trigger.
    const state = mainPhase();
    const alice = state.players[0]!;
    const elder = createCardInstance(state, "sakura-tribe-elder", alice.id, "battlefield");
    elder.isCommander = true;

    activateAbility(state, alice.id, elder.instanceId, 0);

    expect(elder.zone).toBe("command");
    expect(alice.graveyard).not.toContain(elder);
  });

  it("says so in the log", () => {
    const state = mainPhase();
    const alice = state.players[0]!;
    const fetch = createCardInstance(state, "verdant-catacombs", alice.id, "battlefield");

    activateAbility(state, alice.id, fetch.instanceId, 0);

    const log = state.log.map((entry) => entry.text).join("\n");
    expect(log).toContain("sacrifices Verdant Catacombs");
    expect(log).toContain("pays 1 life");
  });
});

describe("what the fixtures say", () => {
  it("gives every fetchland the same three-part cost", () => {
    const state = mainPhase();
    for (const id of [
      "bloodstained-mire", "marsh-flats", "polluted-delta",
      "verdant-catacombs", "windswept-heath", "wooded-foothills",
    ]) {
      const ability = requireDefinition(state, id).activatedAbilities?.[0];
      expect(ability?.cost.tap, id).toBe(true);
      expect(ability?.cost.payLife, id).toBe(1);
      expect(ability?.cost.sacrificeSelf, id).toBe(true);
      expect(ability?.effect.kind, id).toBe("searchLibrary");
    }
  });

  it("never brings a fetched land in tapped", () => {
    const state = mainPhase();
    for (const id of ["bloodstained-mire", "verdant-catacombs", "wooded-foothills"]) {
      const effect = requireDefinition(state, id).activatedAbilities?.[0]?.effect;
      if (effect?.kind !== "searchLibrary") throw new Error("not a search");
      expect(effect.tapped, id).toBeUndefined();
    }
  });

  it("models Bogwater Lumaret as watching other creatures, not only itself", () => {
    // "Whenever this creature *or another creature you control* enters." The
    // loose pattern this generator used until today wrote it as a plain ETB,
    // which pays out once and never again.
    const state = mainPhase();
    const trigger = requireDefinition(state, "bogwater-lumaret").triggeredAbilities?.[0];
    expect(trigger?.event).toBe("permanent-enters");
    expect(trigger?.includesSelf).toBe(true);
    expect(trigger?.watches).toBe("controller");
    expect(trigger?.watchFor).toEqual({ type: "Creature" });
  });
});
