import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  createGameState,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { decideAction } from "../decide.js";
import { chooseAttackers, chooseBlockers } from "../combat.js";
import { nextAction } from "../play.js";

const BOT = "Salty Mike";
const HUMAN = "Deadly Donny";

function game(): GameState {
  const state = createGameState([BOT, HUMAN], TEST_CARD_DEFINITIONS);
  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  return state;
}

/** Puts the bot in the defending seat during declare-blockers. */
function combatAgainstBot(): GameState {
  const state = createGameState([HUMAN, BOT], TEST_CARD_DEFINITIONS);
  state.phase = "combat";
  state.step = "declare-blockers";
  state.activePlayerIndex = 0; // the human is attacking
  state.priorityPlayerIndex = 0;
  return state;
}

describe("main phase: land drops", () => {
  it("plays a land when it has one", () => {
    const state = game();
    const forest = createCardInstance(state, "forest", BOT, "hand");
    expect(decideAction(state, BOT)).toEqual({ kind: "playLand", instanceId: forest.instanceId });
  });

  it("does not play a second land in the same turn", () => {
    const state = game();
    createCardInstance(state, "forest", BOT, "hand");
    state.players[0]!.landsPlayedThisTurn = 1;
    expect(decideAction(state, BOT).kind).not.toBe("playLand");
  });
});

describe("main phase: casting", () => {
  it("casts straight away with an empty pool and lets the engine tap for it", () => {
    // It used to return one tap-a-land action per decision and only cast on the
    // third, which on a 450ms timer meant three visible pauses before anything
    // happened. Every path that applies a bot action now auto-taps, the same as
    // a human's click, so the tapping step is gone.
    const state = game();
    createCardInstance(state, "forest", BOT, "battlefield");
    createCardInstance(state, "forest", BOT, "battlefield");
    const bears = createCardInstance(state, "grizzly-bears", BOT, "hand"); // {1}{G}
    state.players[0]!.landsPlayedThisTurn = 1;
    expect(state.players[0]!.manaPool).toEqual({});

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: bears.instanceId,
      targets: [],
      fromCommandZone: false,
    });
  });

  it("still will not try to cast what it has no sources for", () => {
    // The tapping step is gone, so `couldAfford` is now the only thing standing
    // between the bot and an illegal cast the engine would throw on.
    const state = game();
    createCardInstance(state, "forest", BOT, "battlefield"); // one source, needs two
    createCardInstance(state, "grizzly-bears", BOT, "hand"); // {1}{G}
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).not.toBe("castSpell");
  });

  it("casts once the mana is floating", () => {
    const state = game();
    const bears = createCardInstance(state, "grizzly-bears", BOT, "hand");
    state.players[0]!.manaPool = { G: 1, generic: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT)).toEqual({
      kind: "castSpell",
      instanceId: bears.instanceId,
      targets: [],
      fromCommandZone: false,
    });
  });

  it("prefers the most expensive creature it can afford", () => {
    const state = game();
    createCardInstance(state, "llanowar-elves", BOT, "hand"); // {G}
    const wurm = createCardInstance(state, "craw-wurm", BOT, "hand"); // {4}{G}{G}
    state.players[0]!.manaPool = { G: 2, generic: 4 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") expect(action.instanceId).toBe(wurm.instanceId);
  });

  it("casts the commander out of the command zone before anything else", () => {
    const state = game();
    const tifa = createCardInstance(state, "tifa-lockhart", BOT, "command", { isCommander: true });
    createCardInstance(state, "grizzly-bears", BOT, "hand");
    state.players[0]!.manaPool = { G: 2, generic: 2 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") {
      expect(action.instanceId).toBe(tifa.instanceId);
      expect(action.fromCommandZone).toBe(true);
    }
  });

  it("accounts for commander tax when deciding it can't afford a recast", () => {
    const state = game();
    const tifa = createCardInstance(state, "tifa-lockhart", BOT, "command", { isCommander: true });
    state.players[0]!.commanderCastCount[tifa.instanceId] = 3; // {1}{G} + {6} tax
    state.players[0]!.manaPool = { G: 1, generic: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });
});

describe("main phase: removal", () => {
  it("points burn at the best creature it can actually kill", () => {
    const state = game();
    createCardInstance(state, "hornet-sting", BOT, "hand"); // 1 damage
    const elves = createCardInstance(state, "llanowar-elves", HUMAN, "battlefield"); // 1/1 - dies
    createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6/4 - survives, so not a target
    state.players[0]!.manaPool = { G: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") {
      expect(action.targets).toEqual([{ kind: "card", instanceId: elves.instanceId }]);
    }
  });

  it("holds burn rather than wasting it on something it can't kill", () => {
    const state = game();
    createCardInstance(state, "hornet-sting", BOT, "hand");
    createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6/4
    state.players[0]!.manaPool = { G: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("throws burn at the opponent's face when that's lethal", () => {
    const state = game();
    createCardInstance(state, "hornet-sting", BOT, "hand");
    createCardInstance(state, "llanowar-elves", HUMAN, "battlefield");
    state.players[1]!.life = 1;
    state.players[0]!.manaPool = { G: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") {
      expect(action.targets).toEqual([{ kind: "player", playerId: HUMAN }]);
    }
  });

  it("won't target a Hexproof creature", () => {
    const state = game();
    createCardInstance(state, "hornet-sting", BOT, "hand");
    createCardInstance(state, "gladecover-scout", HUMAN, "battlefield"); // 1/1 Hexproof
    state.players[0]!.manaPool = { G: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });
});

describe("activated abilities", () => {
  it("fires Agent Phil Coulson's ability when there are other Heroes to buff", () => {
    const state = createGameState([HUMAN, BOT], TEST_CARD_DEFINITIONS);
    state.phase = "precombat-main";
    state.step = "main";
    const coulson = createCardInstance(state, "agent-phil-coulson", HUMAN, "battlefield"); // 2/2
    coulson.summoningSickness = false;
    createCardInstance(state, "hawkeye-clint-barton", HUMAN, "battlefield");
    createCardInstance(state, "amateur-hero", HUMAN, "battlefield");
    createCardInstance(state, "valkyrior-skyrider", HUMAN, "battlefield");
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, HUMAN);
    expect(action).toEqual({ kind: "activateAbility", instanceId: coulson.instanceId, abilityIndex: 0, targets: [] });
  });

  it("leaves Coulson untapped when tapping him would buff fewer creatures than he'd hit for", () => {
    const state = createGameState([HUMAN, BOT], TEST_CARD_DEFINITIONS);
    state.phase = "precombat-main";
    state.step = "main";
    const coulson = createCardInstance(state, "agent-phil-coulson", HUMAN, "battlefield"); // 2 power
    coulson.summoningSickness = false;
    createCardInstance(state, "amateur-hero", HUMAN, "battlefield"); // only 1 beneficiary
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, HUMAN).kind).toBe("passPriority");
  });
});

describe("attacking", () => {
  it("attacks freely when the defender has no creatures", () => {
    const state = game();
    const bears = createCardInstance(state, "grizzly-bears", BOT, "battlefield");
    bears.summoningSickness = false;

    expect(chooseAttackers(state, BOT)).toEqual([
      { attackerInstanceId: bears.instanceId, defendingPlayerId: HUMAN },
    ]);
  });

  it("does not attack into a blocker that eats it for free", () => {
    const state = game();
    const bears = createCardInstance(state, "grizzly-bears", BOT, "battlefield"); // 2/2
    bears.summoningSickness = false;
    createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6/4 - kills it, survives

    expect(chooseAttackers(state, BOT)).toEqual([]);
  });

  it("attacks anyway when the damage is lethal", () => {
    const state = game();
    const wurm = createCardInstance(state, "craw-wurm", BOT, "battlefield"); // 6/4
    wurm.summoningSickness = false;
    state.players[1]!.life = 4;

    expect(chooseAttackers(state, BOT)).toHaveLength(1);
  });

  it("attacks through a ground blocker with a flier", () => {
    const state = game();
    const drake = createCardInstance(state, "wind-drake", BOT, "battlefield"); // 2/2 Flying
    drake.summoningSickness = false;
    createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // no Flying or Reach

    expect(chooseAttackers(state, BOT)).toHaveLength(1);
  });

  it("holds creatures back when the opponent's board could kill it on the swing back", () => {
    const state = game();
    const bears = createCardInstance(state, "grizzly-bears", BOT, "battlefield");
    bears.summoningSickness = false;
    state.players[0]!.life = 4;
    const wurm = createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6 power vs our 4 life
    wurm.tapped = true; // can't block, but will untap and swing

    expect(chooseAttackers(state, BOT)).toEqual([]);
  });

  it("never declares attackers twice", () => {
    const state = game();
    state.phase = "combat";
    state.step = "declare-attackers";
    const bears = createCardInstance(state, "grizzly-bears", BOT, "battlefield");
    bears.summoningSickness = false;
    state.attackers[bears.instanceId] = HUMAN; // already declared

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });
});

describe("blocking", () => {
  it("chump-blocks when it would otherwise die", () => {
    const state = combatAgainstBot();
    const wurm = createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6/4
    const elves = createCardInstance(state, "llanowar-elves", BOT, "battlefield"); // 1/1, dies for nothing
    state.attackers[wurm.instanceId] = BOT;
    state.players[1]!.life = 5;

    expect(chooseBlockers(state, BOT)).toEqual([
      { blockerInstanceId: elves.instanceId, attackerInstanceId: wurm.instanceId },
    ]);
  });

  it("declines a pointless chump block when it is comfortably alive", () => {
    const state = combatAgainstBot();
    const wurm = createCardInstance(state, "craw-wurm", HUMAN, "battlefield");
    createCardInstance(state, "llanowar-elves", BOT, "battlefield");
    state.attackers[wurm.instanceId] = BOT;
    state.players[1]!.life = 40;

    expect(chooseBlockers(state, BOT)).toEqual([]);
  });

  it("takes a block that kills the attacker and survives", () => {
    const state = combatAgainstBot();
    const bears = createCardInstance(state, "grizzly-bears", HUMAN, "battlefield"); // 2/2
    const spider = createCardInstance(state, "giant-spider", BOT, "battlefield"); // 2/4 - kills it, lives
    state.attackers[bears.instanceId] = BOT;

    expect(chooseBlockers(state, BOT)).toEqual([
      { blockerInstanceId: spider.instanceId, attackerInstanceId: bears.instanceId },
    ]);
  });

  it("will not block a flier with a ground creature", () => {
    const state = combatAgainstBot();
    const drake = createCardInstance(state, "wind-drake", HUMAN, "battlefield"); // Flying
    createCardInstance(state, "grizzly-bears", BOT, "battlefield"); // no Flying/Reach
    state.attackers[drake.instanceId] = BOT;
    state.players[1]!.life = 1; // even facing lethal, the block is simply illegal

    expect(chooseBlockers(state, BOT)).toEqual([]);
  });

  it("blocks a flier with Reach", () => {
    const state = combatAgainstBot();
    const drake = createCardInstance(state, "wind-drake", HUMAN, "battlefield"); // 2/2 Flying
    const spider = createCardInstance(state, "giant-spider", BOT, "battlefield"); // 2/4 Reach
    state.attackers[drake.instanceId] = BOT;

    expect(chooseBlockers(state, BOT)).toEqual([
      { blockerInstanceId: spider.instanceId, attackerInstanceId: drake.instanceId },
    ]);
  });

  it("never single-blocks a Menace attacker", () => {
    const state = combatAgainstBot();
    const strangler = createCardInstance(state, "alley-strangler", HUMAN, "battlefield"); // 2/3 Menace
    createCardInstance(state, "giant-spider", BOT, "battlefield"); // the only blocker available
    state.attackers[strangler.instanceId] = BOT;
    state.players[1]!.life = 2; // facing lethal and still can't legally block alone

    expect(chooseBlockers(state, BOT)).toEqual([]);
  });

  it("double-blocks a Menace attacker when that kills it", () => {
    const state = combatAgainstBot();
    const strangler = createCardInstance(state, "alley-strangler", HUMAN, "battlefield"); // 2/3 Menace
    createCardInstance(state, "giant-spider", BOT, "battlefield"); // 2/4
    createCardInstance(state, "craw-wurm", BOT, "battlefield"); // 6/4
    state.attackers[strangler.instanceId] = BOT;

    expect(chooseBlockers(state, BOT)).toHaveLength(2);
  });

  it("never declares blockers twice", () => {
    const state = combatAgainstBot();
    const wurm = createCardInstance(state, "craw-wurm", HUMAN, "battlefield");
    const elves = createCardInstance(state, "llanowar-elves", BOT, "battlefield");
    state.attackers[wurm.instanceId] = BOT;
    state.blockers[elves.instanceId] = wurm.instanceId;
    // The flag, not the map, is what says "declaring is over" - an empty map
    // also means "declined to block".
    state.blockersDeclared = true;
    state.players[1]!.life = 5;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("declares an empty block rather than staying silent", () => {
    const state = combatAgainstBot();
    const wurm = createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6/4
    createCardInstance(state, "llanowar-elves", BOT, "battlefield"); // 1/1 - chump-blocking is pointless
    state.attackers[wurm.instanceId] = BOT;
    state.players[1]!.life = 40; // not under threat, so no reason to chump

    // Declining has to be *said*. While it isn't, the attacker's priority
    // window can't open, and the step would wait forever.
    const action = decideAction(state, BOT);
    expect(action.kind).toBe("declareBlockers");
    expect(action.kind === "declareBlockers" && action.declarations).toEqual([]);
  });
});

describe("hidden information", () => {
  it("cannot see the opponent's hand", () => {
    const state = game();
    // A card the bot could kill - but only if it were allowed to look in the hand.
    createCardInstance(state, "craw-wurm", HUMAN, "hand");
    createCardInstance(state, "hornet-sting", BOT, "hand");
    state.players[0]!.manaPool = { G: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    // nextAction filters the state first; there is no legal battlefield target,
    // so it must hold the burn rather than reaching into a hidden zone.
    expect(nextAction(state, BOT)?.kind).toBe("passPriority");
  });
});

describe("the widened card pool", () => {
  it("uses hard removal on the most valuable creature it can hit", () => {
    const state = game();
    createCardInstance(state, "murder", BOT, "hand");
    createCardInstance(state, "llanowar-elves", HUMAN, "battlefield"); // 1/1
    const wurm = createCardInstance(state, "craw-wurm", HUMAN, "battlefield"); // 6/4 - the real threat
    state.players[0]!.manaPool = { B: 2, generic: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") {
      expect(action.targets).toEqual([{ kind: "card", instanceId: wurm.instanceId }]);
    }
  });

  it("holds removal rather than spending it on a 1/1", () => {
    const state = game();
    createCardInstance(state, "murder", BOT, "hand");
    createCardInstance(state, "llanowar-elves", HUMAN, "battlefield");
    state.players[0]!.manaPool = { B: 2, generic: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("won't aim a destroy spell at an Indestructible creature", () => {
    const state = game();
    createCardInstance(state, "murder", BOT, "hand");
    createCardInstance(state, "darksteel-myr", HUMAN, "battlefield");
    createCardInstance(state, "craw-wurm", HUMAN, "battlefield");
    state.players[0]!.manaPool = { B: 2, generic: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") {
      const targeted = action.targets[0];
      expect(targeted?.kind === "card" && targeted.instanceId).not.toBe(
        state.players[1]!.battlefield.find((c) => c.definitionId === "darksteel-myr")!.instanceId,
      );
    }
  });

  it("casts an anthem once it has creatures for it to pump", () => {
    const state = game();
    const anthem = createCardInstance(state, "glorious-anthem", BOT, "hand");
    createCardInstance(state, "grizzly-bears", BOT, "battlefield");
    createCardInstance(state, "runeclaw-bear", BOT, "battlefield");
    createCardInstance(state, "forest-bear", BOT, "battlefield");
    state.players[0]!.manaPool = { W: 2, generic: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") expect(action.instanceId).toBe(anthem.instanceId);
  });

  it("does not cast an anthem into an empty board", () => {
    const state = game();
    createCardInstance(state, "glorious-anthem", BOT, "hand");
    state.players[0]!.manaPool = { W: 2, generic: 1 };
    state.players[0]!.landsPlayedThisTurn = 1;

    expect(decideAction(state, BOT).kind).toBe("passPriority");
  });

  it("casts a token maker as board development", () => {
    const state = game();
    const call = createCardInstance(state, "captains-call", BOT, "hand");
    state.players[0]!.manaPool = { W: 1, generic: 3 };
    state.players[0]!.landsPlayedThisTurn = 1;

    const action = decideAction(state, BOT);
    expect(action.kind).toBe("castSpell");
    if (action.kind === "castSpell") expect(action.instanceId).toBe(call.instanceId);
  });
});
