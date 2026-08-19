import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requirePlayer } from "../state.js";
import { enteredBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { attackRequirement, compelledAttackers, declareAttackers } from "../combat.js";
import { effectivePower } from "../counters.js";
import { activateAbility } from "../abilities.js";
import type { CardInstance, GameState } from "../types.js";

/**
 * Batch 9's attack step.
 *
 * Six cards that all live in the declare-attackers step and disagree with each
 * other about what happens there: one trigger that fires per attacker and one
 * that fires once for the swing, tokens that arrive already in combat, and
 * creatures that never had a choice about being in it.
 */
function game(): { state: GameState; me: string; them: string } {
  const state = makeTestGame();
  state.phase = "combat";
  state.step = "declare-attackers";
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

/** Resolve everything the declaration put on the stack. */
function settle(state: GameState): void {
  for (const choice of state.pendingTargetChoices) state.stack.push(choice.object);
  state.pendingTargetChoices = [];
  let guard = 0;
  while (state.stack.length > 0 && guard++ < 50) resolveTopOfStack(state);
}

function creaturesNamed(state: GameState, playerId: string, name: string): CardInstance[] {
  return requirePlayer(state, playerId).battlefield.filter(
    (c) => state.cardDefinitions[c.definitionId]?.name === name,
  );
}

describe("Anim Pakal, Thousandth Moon", () => {
  it("fires once for the whole swing, not once per attacker", () => {
    const { state, me, them } = game();
    const pakal = put(state, "anim-pakal-thousandth-moon", me);
    const bear = put(state, "grizzly-bears", me);
    const guard = put(state, "capital-guard", me);

    declareAttackers(state, me, [
      { attackerInstanceId: pakal.instanceId, defendingPlayerId: them },
      { attackerInstanceId: bear.instanceId, defendingPlayerId: them },
      { attackerInstanceId: guard.instanceId, defendingPlayerId: them },
    ]);
    settle(state);

    // One counter and one Gnome. Written as a per-attacker trigger this would
    // be three counters and six Gnomes.
    expect(pakal.plusOneCounters).toBe(1);
    expect(creaturesNamed(state, me, "Gnome")).toHaveLength(1);
  });

  it("counts the counter it just added, so the second combat is bigger", () => {
    const { state, me, them } = game();
    const pakal = put(state, "anim-pakal-thousandth-moon", me);
    pakal.plusOneCounters = 2;

    declareAttackers(state, me, [{ attackerInstanceId: pakal.instanceId, defendingPlayerId: them }]);
    settle(state);

    // The counter goes on before the Gnomes are counted - the printed order,
    // and worth one extra Gnome every time.
    expect(pakal.plusOneCounters).toBe(3);
    expect(creaturesNamed(state, me, "Gnome")).toHaveLength(3);
  });

  it("the Gnomes arrive tapped and attacking and do not set it off again", () => {
    const { state, me, them } = game();
    const pakal = put(state, "anim-pakal-thousandth-moon", me);

    declareAttackers(state, me, [{ attackerInstanceId: pakal.instanceId, defendingPlayerId: them }]);
    settle(state);

    const gnome = creaturesNamed(state, me, "Gnome")[0]!;
    expect(gnome.tapped).toBe(true);
    expect(state.attackers[gnome.instanceId]).toBe(them);
    // A token put onto the battlefield attacking was never declared, so nothing
    // watching for an attack sees it - which is the only thing stopping this
    // card looping forever.
    expect(creaturesNamed(state, me, "Gnome")).toHaveLength(1);
  });

  it("does not fire when only Gnomes attack", () => {
    const { state, me, them } = game();
    put(state, "anim-pakal-thousandth-moon", me);
    const gnome = put(state, "token-c-11-gnome-artifact", me);

    declareAttackers(state, me, [{ attackerInstanceId: gnome.instanceId, defendingPlayerId: them }]);
    settle(state);

    expect(creaturesNamed(state, me, "Gnome")).toHaveLength(1); // the one that attacked
  });
});

describe("Ainok Strike Leader", () => {
  it("fires when it attacks, and aims a Goblin at each opponent", () => {
    const { state, me, them } = game();
    const ainok = put(state, "ainok-strike-leader", me);

    declareAttackers(state, me, [{ attackerInstanceId: ainok.instanceId, defendingPlayerId: them }]);
    settle(state);

    const goblins = creaturesNamed(state, me, "Goblin");
    expect(goblins).toHaveLength(1); // one opponent in a duel
    expect(goblins[0]!.tapped).toBe(true);
    expect(state.attackers[goblins[0]!.instanceId]).toBe(them);
  });

  it("fires when the commander attacks without it", () => {
    const { state, me, them } = game();
    put(state, "ainok-strike-leader", me);
    const boss = put(state, "grizzly-bears", me);
    boss.isCommander = true;

    declareAttackers(state, me, [{ attackerInstanceId: boss.instanceId, defendingPlayerId: them }]);
    settle(state);

    expect(creaturesNamed(state, me, "Goblin")).toHaveLength(1);
  });

  it("fires once when both attack, not twice", () => {
    const { state, me, them } = game();
    const ainok = put(state, "ainok-strike-leader", me);
    const boss = put(state, "grizzly-bears", me);
    boss.isCommander = true;

    declareAttackers(state, me, [
      { attackerInstanceId: ainok.instanceId, defendingPlayerId: them },
      { attackerInstanceId: boss.instanceId, defendingPlayerId: them },
    ]);
    settle(state);

    // "and/or" - both attacking is still one trigger.
    expect(creaturesNamed(state, me, "Goblin")).toHaveLength(1);
  });

  it("does not fire for some other creature attacking", () => {
    const { state, me, them } = game();
    put(state, "ainok-strike-leader", me);
    const bear = put(state, "grizzly-bears", me);

    declareAttackers(state, me, [{ attackerInstanceId: bear.instanceId, defendingPlayerId: them }]);
    settle(state);

    expect(creaturesNamed(state, me, "Goblin")).toHaveLength(0);
  });

  it("one Goblin per opponent in a pod, each attacking its own", () => {
    const state = makeTestGame(["alice", "bob", "carol"]);
    state.phase = "combat";
    state.step = "declare-attackers";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    const [me, bob, carol] = state.players.map((p) => p.id) as [string, string, string];
    const ainok = put(state, "ainok-strike-leader", me);

    declareAttackers(state, me, [{ attackerInstanceId: ainok.instanceId, defendingPlayerId: bob }]);
    settle(state);

    const goblins = creaturesNamed(state, me, "Goblin");
    expect(goblins).toHaveLength(2);
    // "attacking **that player**" - not both piled onto whoever Ainok chose.
    expect(new Set(goblins.map((g) => state.attackers[g.instanceId]))).toEqual(new Set([bob, carol]));
  });

  it("its sacrifice shields tokens and nothing else", () => {
    const { state, me } = game();
    const ainok = put(state, "ainok-strike-leader", me);
    const token = put(state, "token-r-11-goblin", me);
    const real = put(state, "grizzly-bears", me);

    activateAbility(state, me, ainok.instanceId, 0);
    settle(state);

    expect(token.grantedKeywords).toContain("Indestructible");
    expect(real.grantedKeywords).not.toContain("Indestructible");
  });
});

describe("Goblin Rabblemaster", () => {
  it("makes a hasty Goblin at the beginning of combat", () => {
    const { state, me } = game();
    state.phase = "precombat-main";
    state.step = "main";
    put(state, "goblin-rabblemaster", me);

    advanceStep(state); // into combat, begin-combat
    expect(state.step).toBe("begin-combat");
    settle(state);

    const goblins = creaturesNamed(state, me, "Goblin");
    expect(goblins).toHaveLength(1);
    // Haste is printed on this one, so it survives the turn ending as a hasty
    // Goblin - the difference from Legion Warboss's.
    expect(state.cardDefinitions[goblins[0]!.definitionId]?.keywords).toContain("Haste");
  });

  it("compels its other Goblins to attack, and not itself", () => {
    const { state, me, them } = game();
    const rabble = put(state, "goblin-rabblemaster", me);
    const goblin = put(state, "token-r-11-goblin", me);
    const bear = put(state, "grizzly-bears", me);

    expect(attackRequirement(state, me, goblin.instanceId)).toMatch(/must attack each combat/);
    // "**Other** Goblin creatures" - the Rabblemaster stays home if it likes.
    expect(attackRequirement(state, me, rabble.instanceId)).toBeNull();
    expect(attackRequirement(state, me, bear.instanceId)).toBeNull();

    expect(() =>
      declareAttackers(state, me, [{ attackerInstanceId: bear.instanceId, defendingPlayerId: them }]),
    ).toThrow(/must attack each combat/);
  });

  it("does not compel a Goblin that cannot attack", () => {
    const { state, me, them } = game();
    put(state, "goblin-rabblemaster", me);
    const sick = put(state, "token-r-11-goblin", me);
    sick.summoningSickness = true;

    // "if able" - a summoning-sick Goblin is not able, so the declaration stands.
    expect(compelledAttackers(state, me)).toHaveLength(0);
    expect(() => declareAttackers(state, me, [])).not.toThrow();
    expect(state.attackers[sick.instanceId]).toBeUndefined();
    expect(them).toBeTruthy();
  });

  it("grows by one for each other attacking Goblin", () => {
    const { state, me, them } = game();
    const rabble = put(state, "goblin-rabblemaster", me);
    const a = put(state, "token-r-11-goblin", me);
    const b = put(state, "token-r-11-goblin", me);

    declareAttackers(state, me, [
      { attackerInstanceId: rabble.instanceId, defendingPlayerId: them },
      { attackerInstanceId: a.instanceId, defendingPlayerId: them },
      { attackerInstanceId: b.instanceId, defendingPlayerId: them },
    ]);
    settle(state);

    // 2/2 plus one for each of the two other attacking Goblins, and not for
    // itself - "each **other** attacking Goblin".
    expect(effectivePower(state, rabble)).toBe(4);
  });

  it("counts only Goblins that are actually attacking", () => {
    const { state, me, them } = game();
    const rabble = put(state, "goblin-rabblemaster", me);
    const home = put(state, "token-r-11-goblin", me);
    home.summoningSickness = true; // not able, so not compelled and not attacking

    declareAttackers(state, me, [{ attackerInstanceId: rabble.instanceId, defendingPlayerId: them }]);
    settle(state);

    expect(effectivePower(state, rabble)).toBe(2);
  });
});

describe("Legion Warboss", () => {
  it("makes a Goblin that has haste and must attack", () => {
    const { state, me } = game();
    state.phase = "precombat-main";
    state.step = "main";
    put(state, "legion-warboss", me);

    advanceStep(state);
    settle(state);

    const goblin = creaturesNamed(state, me, "Goblin")[0]!;
    expect(goblin.grantedKeywords).toContain("Haste");
    expect(goblin.summoningSickness).toBe(false);
    expect(goblin.mustAttackThisCombat).toBe(true);
    expect(attackRequirement(state, me, goblin.instanceId)).toMatch(/must attack this combat/);
  });

  it("stops compelling the token once the combat is over", () => {
    const { state, me } = game();
    state.phase = "precombat-main";
    state.step = "main";
    put(state, "legion-warboss", me);
    advanceStep(state);
    settle(state);
    const goblin = creaturesNamed(state, me, "Goblin")[0]!;

    // Advanced *into* end-combat rather than out of it: a step's automatic
    // actions run as it is reached.
    state.phase = "combat";
    state.step = "combat-damage";
    advanceStep(state);
    expect(state.step).toBe("end-combat");

    // "this combat" - and this deck makes extra ones on purpose, so the flag
    // ends with the combat rather than with the turn.
    expect(goblin.mustAttackThisCombat).toBe(false);
  });

  it("mentors a smaller attacking creature", () => {
    const { state, me, them } = game();
    const warboss = put(state, "legion-warboss", me);
    const small = put(state, "ornithopter", me); // 0/2

    declareAttackers(state, me, [
      { attackerInstanceId: warboss.instanceId, defendingPlayerId: them },
      { attackerInstanceId: small.instanceId, defendingPlayerId: them },
    ]);
    settle(state);

    expect(small.plusOneCounters).toBe(1);
  });

  it("cannot mentor something as big as itself", () => {
    const { state, me, them } = game();
    const warboss = put(state, "legion-warboss", me);
    const equal = put(state, "grizzly-bears", me); // 2/2, same power

    declareAttackers(state, me, [
      { attackerInstanceId: warboss.instanceId, defendingPlayerId: them },
      { attackerInstanceId: equal.instanceId, defendingPlayerId: them },
    ]);
    settle(state);

    // No legal target, so the trigger does nothing at all rather than picking
    // the nearest thing.
    expect(equal.plusOneCounters).toBe(0);
    expect(warboss.plusOneCounters).toBe(0);
  });
});

describe("Voice of Victory", () => {
  it("mobilizes two Warriors, tapped and attacking", () => {
    const { state, me, them } = game();
    const voice = put(state, "voice-of-victory", me);

    declareAttackers(state, me, [{ attackerInstanceId: voice.instanceId, defendingPlayerId: them }]);
    settle(state);

    const warriors = creaturesNamed(state, me, "Warrior");
    expect(warriors).toHaveLength(2);
    for (const warrior of warriors) {
      expect(warrior.tapped).toBe(true);
      expect(state.attackers[warrior.instanceId]).toBe(them);
    }
  });

  it("sacrifices them at the next end step", () => {
    const { state, me, them } = game();
    const voice = put(state, "voice-of-victory", me);
    declareAttackers(state, me, [{ attackerInstanceId: voice.instanceId, defendingPlayerId: them }]);
    settle(state);
    expect(creaturesNamed(state, me, "Warrior")).toHaveLength(2);

    state.phase = "postcombat-main";
    state.step = "main";
    advanceStep(state);
    settle(state);

    expect(state.step).toBe("end");
    // Without this clause mobilize is a two-Warrior anthem every combat, which
    // is a materially better card.
    expect(creaturesNamed(state, me, "Warrior")).toHaveLength(0);
    expect(requirePlayer(state, me).graveyard.filter((c) => c.definitionId === "token-r-11-warrior")).toHaveLength(0);
  });

  it("shuts opponents out of your turn", () => {
    const { state, me } = game();
    put(state, "voice-of-victory", me);
    // The same restriction Grand Abolisher carries, written the same way.
    expect(state.cardDefinitions["voice-of-victory"]?.staticRestrictions).toContainEqual({
      kind: "opponents-cannot-cast",
      duringYourTurnOnly: true,
    });
  });
});

describe("Myrel, Shield of Argive", () => {
  it("makes a Soldier for each Soldier you control, counting itself", () => {
    const { state, me, them } = game();
    const myrel = put(state, "myrel-shield-of-argive", me);
    put(state, "capital-guard", me); // Human Soldier
    put(state, "grizzly-bears", me); // not a Soldier

    declareAttackers(state, me, [{ attackerInstanceId: myrel.instanceId, defendingPlayerId: them }]);
    settle(state);

    // Myrel and the Guard - two Soldiers, so two tokens. Myrel counts because
    // the card says "the number of Soldiers you control" without "other".
    expect(creaturesNamed(state, me, "Soldier")).toHaveLength(2);
  });

  it("the tokens it makes are not attacking", () => {
    const { state, me, them } = game();
    const myrel = put(state, "myrel-shield-of-argive", me);
    declareAttackers(state, me, [{ attackerInstanceId: myrel.instanceId, defendingPlayerId: them }]);
    settle(state);

    const soldier = creaturesNamed(state, me, "Soldier")[0]!;
    // Myrel's tokens arrive untapped and out of combat - the card says nothing
    // about attacking, unlike every other token-on-attack card in this batch.
    expect(soldier.tapped).toBe(false);
    expect(state.attackers[soldier.instanceId]).toBeUndefined();
  });
});
