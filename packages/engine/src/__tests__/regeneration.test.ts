import { describe, expect, it } from "vitest";
import { createCardInstance, createGameState } from "../state.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { activateAbility } from "../abilities.js";
import { applyEffect } from "../effects.js";
import { checkStateBasedActions } from "../sba.js";
import { damageCreature } from "../damage.js";
import { dealCombatDamage } from "../combat.js";
import { advanceStep } from "../turn.js";
import { isValidTarget } from "../targeting.js";
import type { GameState, TargetSelector } from "../types.js";

/**
 * Regeneration, which Swarmyard needed and nothing else in the pool had.
 *
 * "The next time this creature would be destroyed this turn, instead tap it,
 * remove it from combat, and heal all damage on it." Every clause in that
 * sentence is load-bearing, and the two easiest to skip are the ones tested
 * hardest here: a creature that kept its marked damage would simply be
 * destroyed again by the next state-based check, and one that stayed in combat
 * would go on dealing damage after it had been saved.
 *
 * The other half is what regeneration does *not* do. It replaces destruction,
 * and a creature whose toughness has been reduced to 0 is not destroyed - it is
 * put into the graveyard as a state-based action (rule 704.5a). Getting that
 * backwards would quietly turn Swarmyard into protection from a board wipe it
 * does nothing against.
 */

function mainPhase(): GameState {
  const state = createGameState(["donny", "mike"], TEST_CARD_DEFINITIONS);
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

/** Puts a shield on a creature the way Swarmyard does, resolving the ability. */
function regenerate(state: GameState, playerId: string, instanceId: string): void {
  applyEffect(state, playerId, instanceId, {
    kind: "regenerate",
    target: { kind: "creature" },
  }, [{ kind: "card", instanceId }]);
}

describe("a regeneration shield", () => {
  it("saves a creature from lethal damage", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    damageCreature(state, spider, 4); // a 2/4
    checkStateBasedActions(state);

    expect(donny.battlefield).toContain(spider);
    expect(donny.graveyard).not.toContain(spider);
  });

  it("taps the creature and heals the damage", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    damageCreature(state, spider, 4);
    checkStateBasedActions(state);

    expect(spider.tapped).toBe(true);
    // Without this the very next state-based check would destroy it again and
    // the shield would look like it had done nothing at all.
    expect(spider.damageMarked).toBe(0);
    expect(spider.regenerationShields).toBe(0);
  });

  it("is spent, so a second lethal hit kills", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    damageCreature(state, spider, 4);
    checkStateBasedActions(state);
    damageCreature(state, spider, 4);
    checkStateBasedActions(state);

    expect(donny.graveyard).toContain(spider);
  });

  it("stacks, so two shields save it twice", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);
    regenerate(state, donny.id, spider.instanceId);

    damageCreature(state, spider, 4);
    checkStateBasedActions(state);
    damageCreature(state, spider, 4);
    checkStateBasedActions(state);

    expect(donny.battlefield).toContain(spider);
  });

  it("saves a creature from deathtouch damage", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    damageCreature(state, spider, 1, { deathtouch: true });
    checkStateBasedActions(state);

    expect(donny.battlefield).toContain(spider);
    // The deathtouch mark goes with the damage, or the next single point of
    // ordinary damage would be lethal to a creature that just regenerated.
    expect(spider.deathtouchDamage).toBe(false);
  });

  it("saves a creature from being destroyed outright", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    applyEffect(state, donny.id, spider.instanceId, { kind: "destroy", target: { kind: "creature" } }, [
      { kind: "card", instanceId: spider.instanceId },
    ]);

    expect(donny.battlefield).toContain(spider);
    expect(spider.tapped).toBe(true);
  });

  it("does nothing against a toughness of zero", () => {
    // -N/-N is not destruction, which is exactly why it is the removal of
    // choice against a deck that regenerates.
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    spider.temporaryToughnessBonus = -4; // a 2/4 down to 2/0
    checkStateBasedActions(state);

    expect(donny.graveyard).toContain(spider);
  });

  it("does not fire a dies trigger", () => {
    // The destruction is replaced, so as far as the game is concerned nothing
    // happened to the creature at all.
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    damageCreature(state, spider, 4);
    checkStateBasedActions(state);

    expect(state.stack).toHaveLength(0);
  });

  it("wears off at end of turn", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    regenerate(state, donny.id, spider.instanceId);

    state.phase = "ending";
    state.step = "end";
    advanceStep(state); // into cleanup

    expect(spider.regenerationShields).toBe(0);
  });
});

describe("regeneration and combat", () => {
  it("takes a regenerated blocker out of combat without unblocking the attacker", () => {
    /*
     * The trap this was written around. `state.blockers` records what was
     * *declared*, and an attacker stays blocked once blocked even after every
     * blocker has left (rule 509.1h). Deleting the blocker's entry instead of
     * flagging it would hand the attacking player a free hit for the defender
     * having regenerated - the opposite of what the card does.
     *
     * Two damage steps are needed to see it at all, which means a first striker.
     */
    const state = mainPhase();
    const donny = state.players[0]!;
    const mike = state.players[1]!;
    // A 1/1 first striker against a 1/1: the blocker dies in the first damage
    // step unless something saves it, and there is a second step to observe.
    const attacker = createCardInstance(state, "tundra-wolves", donny.id, "battlefield");
    const blocker = createCardInstance(state, "llanowar-elves", mike.id, "battlefield");
    attacker.summoningSickness = false;
    blocker.summoningSickness = false;
    state.attackers[attacker.instanceId] = mike.id;
    state.blockers[blocker.instanceId] = attacker.instanceId;
    regenerate(state, mike.id, blocker.instanceId);

    dealCombatDamage(state, "first-strike");
    checkStateBasedActions(state);
    expect(mike.battlefield).toContain(blocker); // saved
    expect(blocker.removedFromCombat).toBe(true);

    const lifeBefore = mike.life;
    dealCombatDamage(state, "regular");

    // The blocker is out of combat so deals nothing, and the attacker is still
    // blocked so hits nobody.
    expect(mike.life).toBe(lifeBefore);
    expect(attacker.damageMarked).toBe(0);
  });

  it("clears the flag at end of combat", () => {
    const state = mainPhase();
    const mike = state.players[1]!;
    const blocker = createCardInstance(state, "grizzly-bears", mike.id, "battlefield");
    blocker.removedFromCombat = true;

    state.phase = "combat";
    state.step = "combat-damage";
    advanceStep(state); // into end-combat

    expect(blocker.removedFromCombat).toBe(false);
  });
});

describe("Swarmyard", () => {
  it("regenerates one of the four types it names", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const yard = createCardInstance(state, "swarmyard", donny.id, "battlefield");
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");

    activateAbility(state, donny.id, yard.instanceId, 1, [
      { kind: "card", instanceId: spider.instanceId },
    ]);
    // Not a mana ability, so it waits on the stack.
    expect(state.stack).toHaveLength(1);
  });

  it("cannot target a creature of another type", () => {
    // "Target Insect, Rat, Spider, or Squirrel" - a Bear is none of them.
    const state = mainPhase();
    const donny = state.players[0]!;
    const bears = createCardInstance(state, "grizzly-bears", donny.id, "battlefield");
    const spider = createCardInstance(state, "giant-spider", donny.id, "battlefield");
    const selector: TargetSelector = {
      kind: "creature",
      subtypes: ["Insect", "Rat", "Spider", "Squirrel"],
    };

    expect(isValidTarget(state, selector, { kind: "card", instanceId: spider.instanceId }, donny.id)).toBe(
      true,
    );
    expect(isValidTarget(state, selector, { kind: "card", instanceId: bears.instanceId }, donny.id)).toBe(
      false,
    );
  });

  it("still taps for colourless", () => {
    const state = mainPhase();
    const donny = state.players[0]!;
    const yard = createCardInstance(state, "swarmyard", donny.id, "battlefield");

    activateAbility(state, donny.id, yard.instanceId, 0);

    expect(donny.manaPool.generic).toBe(1);
  });
});
