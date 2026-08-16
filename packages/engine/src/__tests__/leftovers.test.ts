import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { playLand } from "../casting.js";
import { declareAttackers } from "../combat.js";
import { advanceStep } from "../turn.js";
import { resolveTopOfStack } from "../stack.js";
import { activateAbility } from "../abilities.js";
import { applyEffect } from "../effects.js";
import { resolveEnterChoice } from "../permanents.js";
import { effectiveActivated, effectivePower, hasKeyword } from "../counters.js";
import { spendablePool } from "../mana.js";
import { attemptWardPayments } from "../ward.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

/**
 * The cards batches 2 and 3 could not finish, and five tutors the generator
 * could not read.
 *
 * Nearly all of these are cards whose *second* line was the problem - the first
 * was already expressible, which is exactly how a card ends up half-built and
 * looking finished.
 */
describe("the leftovers", () => {
  function game(): { state: GameState; me: string; them: string } {
    const state = makeTestGame();
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  describe("a search narrowed by what the card is", () => {
    /** Runs a tutor's search and returns the names it offered. */
    function offered(state: GameState, playerId: string, sourceId: string, effect: Parameters<typeof applyEffect>[3]) {
      applyEffect(state, playerId, sourceId, effect, []);
      const pending = state.pendingSearch!;
      return pending.candidateInstanceIds.map(
        (id) =>
          TEST_CARD_DEFINITIONS[
            state.players.flatMap((p) => p.library).find((c) => c.instanceId === id)!.definitionId
          ]!.name,
      );
    }

    it("Imperial Recruiter offers only creatures with power 2 or less", () => {
      const { state, me } = game();
      const source = createCardInstance(state, "imperial-recruiter", me, "battlefield");
      const player = state.players[0]!;
      player.library.length = 0;
      createCardInstance(state, "grizzly-bears", me, "library"); // 2/2
      createCardInstance(state, "craw-wurm", me, "library"); // 6/4
      createCardInstance(state, "plains", me, "library"); // not a creature

      const names = offered(state, me, source.instanceId, {
        kind: "searchLibrary",
        cardType: "Creature",
        maxPower: 2,
        destination: "hand",
      });
      expect(names).toEqual(["Grizzly Bears"]);
    });

    it("Recruiter of the Guard asks about toughness instead", () => {
      const { state, me } = game();
      const source = createCardInstance(state, "recruiter-of-the-guard", me, "battlefield");
      const player = state.players[0]!;
      player.library.length = 0;
      // Savannah Lions is 2/1 - too big for the power recruiter, fine for this one.
      createCardInstance(state, "savannah-lions", me, "library");
      createCardInstance(state, "craw-wurm", me, "library");

      const names = offered(state, me, source.instanceId, {
        kind: "searchLibrary",
        cardType: "Creature",
        maxToughness: 2,
        destination: "hand",
      });
      expect(names).toEqual(["Savannah Lions"]);
    });

    it("Ranger-Captain of Eos asks about mana value", () => {
      const { state, me } = game();
      const source = createCardInstance(state, "ranger-captain-of-eos", me, "battlefield");
      const player = state.players[0]!;
      player.library.length = 0;
      createCardInstance(state, "ornithopter", me, "library"); // {0}
      createCardInstance(state, "grizzly-bears", me, "library"); // {1}{G}

      const names = offered(state, me, source.instanceId, {
        kind: "searchLibrary",
        cardType: "Creature",
        maxManaValue: 1,
        destination: "hand",
      });
      expect(names).toEqual(["Ornithopter"]);
    });

    it("Enlightened Tutor takes either of the two types it names", () => {
      const { state, me } = game();
      const source = createCardInstance(state, "enlightened-tutor", me, "battlefield");
      const player = state.players[0]!;
      player.library.length = 0;
      createCardInstance(state, "sol-ring", me, "library"); // Artifact
      createCardInstance(state, "high-noon", me, "library"); // Enchantment
      createCardInstance(state, "grizzly-bears", me, "library"); // neither

      const names = offered(state, me, source.instanceId, {
        kind: "searchLibrary",
        cardType: ["Artifact", "Enchantment"],
        destination: "library-top",
      });
      expect(names.sort()).toEqual(["High Noon", "Sol Ring"]);
    });
  });

  describe("Cavern of Souls", () => {
    /** The Cavern on the battlefield with a creature type already named. */
    function setUp(creatureType: string) {
      const { state, me } = game();
      const cavern = createCardInstance(state, "cavern-of-souls", me, "battlefield");
      resolveEnterChoiceFor(state, me, cavern.instanceId, { creatureType });
      return { state, me, cavern };
    }

    function resolveEnterChoiceFor(
      state: GameState,
      playerId: string,
      instanceId: string,
      answer: { creatureType: string },
    ) {
      state.pendingEnterChoice = {
        playerId,
        instanceId,
        choice: { kind: "creature-type" },
        prompt: "choose a creature type",
      };
      resolveEnterChoice(state, playerId, answer);
    }

    it("makes mana that pays only for the chosen creature type", () => {
      const { state, me, cavern } = setUp("Bear");
      // Ability 0 is the colourless one; 1-5 are the colours, W first.
      activateAbility(state, me, cavern.instanceId, 1, []);
      const player = state.players[0]!;

      const bear = TEST_CARD_DEFINITIONS["grizzly-bears"]!;
      const knight = TEST_CARD_DEFINITIONS["youthful-knight"]!;
      expect(bear.subtypes).toContain("Bear");
      expect(knight.subtypes ?? []).not.toContain("Bear");

      expect(spendablePool(player, bear).W ?? 0).toBe(1);
      expect(spendablePool(player, knight).W ?? 0).toBe(0);
    });

    it("makes nothing spendable at all before the type is chosen", () => {
      const { state, me } = game();
      const cavern = createCardInstance(state, "cavern-of-souls", me, "battlefield");
      activateAbility(state, me, cavern.instanceId, 1, []);
      // No type was named, so nothing is of it. The game never actually reaches
      // this state - it holds on the choice - but a default would be a Cavern
      // that quietly made mana for the wrong deck.
      expect(spendablePool(state.players[0]!, TEST_CARD_DEFINITIONS["grizzly-bears"]!).W ?? 0).toBe(0);
    });

    it("leaves the colourless half unrestricted", () => {
      const { state, me, cavern } = setUp("Bear");
      activateAbility(state, me, cavern.instanceId, 0, []);
      // {C} pays for anything, which is the whole reason the card prints it.
      expect(state.players[0]!.manaPool.generic).toBe(1);
    });
  });

  describe("Multiversal Passage", () => {
    it("has no mana ability until it is told what it is", () => {
      const { state, me } = game();
      const land = createCardInstance(state, "multiversal-passage", me, "battlefield");
      expect(effectiveActivated(state, land)).toHaveLength(0);

      state.pendingEnterChoice = {
        playerId: me,
        instanceId: land.instanceId,
        choice: { kind: "basic-land-type" },
        prompt: "choose a basic land type",
      };
      resolveEnterChoice(state, me, { basicLandType: "Mountain" });

      const abilities = effectiveActivated(state, land);
      expect(abilities).toHaveLength(1);
      expect(abilities[0]!.effect).toEqual({ kind: "addMana", color: "R", amount: 1 });
    });
  });

  describe("Greymond, Avacyn's Stalwart", () => {
    function setUp(keywords: Array<"First Strike" | "Vigilance" | "Lifelink">) {
      const { state, me, them } = game();
      const greymond = createCardInstance(state, "greymond-avacyns-stalwart", me, "battlefield");
      state.pendingEnterChoice = {
        playerId: me,
        instanceId: greymond.instanceId,
        choice: { kind: "keywords", from: ["First Strike", "Vigilance", "Lifelink"], count: 2 },
        prompt: "choose two abilities",
      };
      resolveEnterChoice(state, me, { keywords });
      return { state, me, them, greymond };
    }

    it("hands the chosen abilities to your Humans, and to itself", () => {
      const { state, me, greymond } = setUp(["First Strike", "Lifelink"]);
      const human = createCardInstance(state, "youthful-knight", me, "battlefield"); // Human Knight
      const notHuman = createCardInstance(state, "grizzly-bears", me, "battlefield");

      expect(hasKeyword(state, human, "Lifelink")).toBe(true);
      // No "other" on the card, so Greymond is one of his own Humans.
      expect(hasKeyword(state, greymond, "Lifelink")).toBe(true);
      // The one he did not choose stays off.
      expect(hasKeyword(state, human, "Vigilance")).toBe(false);
      expect(hasKeyword(state, notHuman, "Lifelink")).toBe(false);
    });

    it("gives +2/+2 only once there are four Humans", () => {
      const { state, me } = setUp(["First Strike", "Vigilance"]);
      const human = createCardInstance(state, "youthful-knight", me, "battlefield");
      const printed = TEST_CARD_DEFINITIONS["youthful-knight"]!.power!;

      // Two Humans on the table - Greymond and this one.
      expect(effectivePower(state, human)).toBe(printed);

      createCardInstance(state, "youthful-knight", me, "battlefield");
      expect(effectivePower(state, human)).toBe(printed);

      // The fourth turns it on.
      createCardInstance(state, "youthful-knight", me, "battlefield");
      expect(effectivePower(state, human)).toBe(printed + 2);
    });
  });

  describe("Archon of Emeria", () => {
    it("taps an opponent's nonbasic land, and leaves basics and its own side alone", () => {
      const { state, me, them } = game();
      createCardInstance(state, "archon-of-emeria", me, "battlefield");

      // The opponent plays a nonbasic land.
      state.activePlayerIndex = 1;
      state.priorityPlayerIndex = 1;
      const theirs = createCardInstance(state, "command-tower", them, "hand");
      playLand(state, them, theirs.instanceId);
      expect(theirs.tapped).toBe(true);

      // A basic is untouched - the card says nonbasic.
      state.players[1]!.landsPlayedThisTurn = 0;
      const basic = createCardInstance(state, "plains", them, "hand");
      playLand(state, them, basic.instanceId);
      expect(basic.tapped).toBe(false);

      // And the Archon's own controller is unaffected: "your opponents".
      state.activePlayerIndex = 0;
      state.priorityPlayerIndex = 0;
      const mine = createCardInstance(state, "command-tower", me, "hand");
      playLand(state, me, mine.instanceId);
      expect(mine.tapped).toBe(false);
    });
  });

  describe("Aven Mindcensor", () => {
    it("shows an opponent only the top four cards of their library", () => {
      const { state, me, them } = game();
      createCardInstance(state, "aven-mindcensor", me, "battlefield");
      const opponent = state.players[1]!;
      opponent.library.length = 0;
      for (let i = 0; i < 4; i++) createCardInstance(state, "grizzly-bears", them, "library");
      // The fifth card is the only Plains, and it is out of reach.
      const buried = createCardInstance(state, "plains", them, "library");

      applyEffect(
        state,
        them,
        createCardInstance(state, "sol-ring", them, "battlefield").instanceId,
        { kind: "searchLibrary", basicLandOnly: true, destination: "battlefield" },
        [],
      );

      // The search happened and found nothing: four Bears, no basic among them.
      expect(state.pendingSearch?.candidateInstanceIds).toEqual([]);
      expect(opponent.library).toContain(buried);
    });

    it("does not narrow its own controller's searches", () => {
      const { state, me } = game();
      createCardInstance(state, "aven-mindcensor", me, "battlefield");
      const player = state.players[0]!;
      player.library.length = 0;
      for (let i = 0; i < 4; i++) createCardInstance(state, "grizzly-bears", me, "library");
      createCardInstance(state, "plains", me, "library");

      applyEffect(
        state,
        me,
        createCardInstance(state, "sol-ring", me, "battlefield").instanceId,
        { kind: "searchLibrary", basicLandOnly: true, destination: "battlefield" },
        [],
      );
      expect(state.pendingSearch?.candidateInstanceIds).toHaveLength(1);
    });
  });

  describe("Windcrag Siege", () => {
    /** The Siege on the battlefield with one of its two halves already chosen. */
    function setUp(mode: string) {
      const { state, me, them } = game();
      const siege = createCardInstance(state, "windcrag-siege", me, "battlefield");
      state.pendingEnterChoice = {
        playerId: me,
        instanceId: siege.instanceId,
        choice: { kind: "mode", options: ["Mardu", "Jeskai"] },
        prompt: "choose Mardu or Jeskai",
      };
      resolveEnterChoice(state, me, { mode });
      return { state, me, them, siege };
    }

    it("Mardu makes an attack trigger happen twice", () => {
      const { state, me, them } = setUp("Mardu");
      state.phase = "combat";
      state.step = "declare-attackers";
      // Winota watches for a non-Human creature attacking - one trigger becomes
      // two, which is what "an additional time" means.
      const winota = createCardInstance(state, "winota-joiner-of-forces", me, "battlefield");
      winota.summoningSickness = false;
      const wurm = createCardInstance(state, "craw-wurm", me, "battlefield");
      wurm.summoningSickness = false;
      const player = state.players[0]!;
      player.library.length = 0;
      for (let i = 0; i < 12; i++) createCardInstance(state, "youthful-knight", me, "library");

      declareAttackers(state, me, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: them }]);
      expect(state.stack).toHaveLength(2);
    });

    it("Jeskai does not double anything", () => {
      const { state, me, them } = setUp("Jeskai");
      state.phase = "combat";
      state.step = "declare-attackers";
      const winota = createCardInstance(state, "winota-joiner-of-forces", me, "battlefield");
      winota.summoningSickness = false;
      const wurm = createCardInstance(state, "craw-wurm", me, "battlefield");
      wurm.summoningSickness = false;
      const player = state.players[0]!;
      player.library.length = 0;
      for (let i = 0; i < 12; i++) createCardInstance(state, "youthful-knight", me, "library");

      declareAttackers(state, me, [{ attackerInstanceId: wurm.instanceId, defendingPlayerId: them }]);
      expect(state.stack).toHaveLength(1);
    });

    it("Jeskai makes a Goblin on upkeep, with keywords that wear off", () => {
      const { state, me } = setUp("Jeskai");
      state.phase = "ending";
      state.step = "cleanup";
      state.activePlayerIndex = 1;
      advanceStep(state); // into the controller's turn, through their upkeep
      while (state.stack.length > 0) resolveTopOfStack(state);

      const goblin = state.players[0]!.battlefield.find(
        (c) => state.cardDefinitions[c.definitionId]?.name === "Goblin",
      );
      expect(goblin).toBeDefined();
      expect(hasKeyword(state, goblin!, "Haste")).toBe(true);
      expect(hasKeyword(state, goblin!, "Lifelink")).toBe(true);

      // "Until end of turn" - the token stays, the keywords do not.
      //
      // Stepped from the *end* step rather than straight to cleanup: a step's
      // automatic actions run on the way in, so setting `step` to cleanup by
      // hand and advancing walks straight past the clearing this is about.
      state.phase = "ending";
      state.step = "end";
      advanceStep(state);
      expect(state.players[0]!.battlefield).toContain(goblin);
      expect(hasKeyword(state, goblin!, "Haste")).toBe(false);
    });

    it("Mardu makes no Goblin", () => {
      const { state } = setUp("Mardu");
      state.phase = "ending";
      state.step = "cleanup";
      state.activePlayerIndex = 1;
      advanceStep(state);
      while (state.stack.length > 0) resolveTopOfStack(state);
      expect(
        state.players[0]!.battlefield.some((c) => state.cardDefinitions[c.definitionId]?.name === "Goblin"),
      ).toBe(false);
    });
  });

  describe("Hexing Squelcher", () => {
    it("hands ward to your other creatures, and not to itself twice", () => {
      const { state, me, them } = game();
      const squelcher = createCardInstance(state, "hexing-squelcher", me, "battlefield");
      const other = createCardInstance(state, "grizzly-bears", me, "battlefield");
      const opponent = state.players[1]!;
      opponent.life = 40;

      // Targeting the Bears costs the opponent 2 life, which it did not before.
      expect(attemptWardPayments(state, them, [{ kind: "card", instanceId: other.instanceId }])).toBe(true);
      expect(opponent.life).toBe(38);

      // The Squelcher's own ward is printed, and is the same price.
      expect(attemptWardPayments(state, them, [{ kind: "card", instanceId: squelcher.instanceId }])).toBe(true);
      expect(opponent.life).toBe(36);
    });

    it("does not tax its own controller", () => {
      const { state, me } = game();
      createCardInstance(state, "hexing-squelcher", me, "battlefield");
      const other = createCardInstance(state, "grizzly-bears", me, "battlefield");
      const life = state.players[0]!.life;
      // Ward only ever triggers against an opponent's spell.
      expect(attemptWardPayments(state, me, [{ kind: "card", instanceId: other.instanceId }])).toBe(true);
      expect(state.players[0]!.life).toBe(life);
    });
  });
});
