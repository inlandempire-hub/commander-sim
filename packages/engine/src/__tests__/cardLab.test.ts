import { describe, expect, it } from "vitest";
import { LAB_OPPONENT, LAB_YOU, createLabGame, landsForCost, type LabDeck, type LabScenario } from "../cardLab.js";
import { LAB_DECKS } from "../cardLabDecks.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { canPlayCardNow } from "../autoPass.js";
import { castSpellWithAutoTap } from "../autoTap.js";
import { playLand } from "../casting.js";
import { chooseTriggerTarget } from "../permanents.js";
import { declareAttackers } from "../combat.js";
import { resolveTopOfStack } from "../stack.js";
import { validateCommanderDeck } from "../commander.js";
import type { CardType } from "../types.js";

/**
 * What keeps the card lab honest.
 *
 * The lab is a human-driven thing: its checklists are read, not asserted. That
 * makes exactly one kind of failure invisible - a scenario that no longer stands
 * up. A land base written before a fixture's cost was corrected leaves the card
 * uncastable, and the lab looks like the *engine* is broken. So every scenario
 * is built here and the one mechanical promise it makes is checked: the card
 * under test can be played, on the turn it is handed to you, from the board it
 * is handed on.
 */

const PERMANENT_TYPES: CardType[] = ["Land", "Creature", "Artifact", "Enchantment", "Planeswalker"];

function allReferencedIds(scenario: LabScenario): string[] {
  return [
    scenario.cardId,
    ...(scenario.lands ?? []),
    ...(scenario.yours ?? []).map((p) => p.id),
    ...(scenario.theirs ?? []).map((p) => p.id),
    ...(scenario.yourHand ?? []),
    ...(scenario.theirHand ?? []),
    ...(scenario.yourGraveyard ?? []),
    ...(scenario.theirGraveyard ?? []),
    ...(scenario.yourLibraryTop ?? []),
    ...(scenario.theirLibraryTop ?? []),
  ];
}

/** Every board in every deck, flattened, so a failure names both. */
const ALL_BOARDS: Array<[string, LabDeck, LabScenario]> = LAB_DECKS.flatMap((deck) =>
  deck.scenarios.map((scenario) => [`${deck.slug}/${scenario.cardId}`, deck, scenario] as [string, LabDeck, LabScenario]),
);

describe.each(LAB_DECKS.map((d) => [d.slug, d] as const))("the card lab covers %s", (_slug, deck) => {
  it("has one scenario for every distinct card in the list, and nothing else", () => {
    const list = new Set([deck.deck.commanderId, ...deck.deck.libraryIds]);
    const covered = new Set(deck.scenarios.map((s) => s.cardId));
    expect([...list].filter((id) => !covered.has(id)), "cards with no board").toEqual([]);
    expect([...covered].filter((id) => !list.has(id)), "boards for cards not in the list").toEqual([]);
  });

  it("names each card once", () => {
    const ids = deck.scenarios.map((s) => s.cardId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is a legal Commander deck", () => {
    // Not strictly the lab's business, but it is the cheapest possible check
    // that 100 fixtures agree with each other on singleton and colour identity.
    expect(deck.deck.libraryIds).toHaveLength(99);
    const result = validateCommanderDeck(deck.deck, TEST_CARD_DEFINITIONS);
    expect(result.errors).toEqual([]);
    expect(result.legal).toBe(true);
  });

  it("walks the list in decklist order, commander first", () => {
    // So that "start at the top" and "next" walk the deck rather than a pile
    // in whatever order the boards happened to be written.
    expect(deck.scenarios[0]!.cardId).toBe(deck.deck.commanderId);
  });
});

describe("the lab's decks", () => {
  it("give each deck its own slug", () => {
    const slugs = LAB_DECKS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("stock a library tail out of cards that exist", () => {
    for (const deck of LAB_DECKS) {
      for (const id of deck.libraryTail) {
        expect(TEST_CARD_DEFINITIONS[id], `${deck.slug} library tail: unknown "${id}"`).toBeDefined();
      }
      expect(deck.libraryTail.length, `${deck.slug} needs a tail deep enough to draw from`).toBeGreaterThan(20);
    }
  });
});

describe("every scenario stands up", () => {
  it.each(ALL_BOARDS)("%s", (_name, deck, scenario) => {
    for (const id of allReferencedIds(scenario)) {
      expect(TEST_CARD_DEFINITIONS[id], `unknown definition "${id}"`).toBeDefined();
    }

    // Only a permanent can be put onto a battlefield. An instant sitting there
    // is not a board a player could ever have had.
    for (const spec of [...(scenario.yours ?? []), ...(scenario.theirs ?? [])]) {
      const def = TEST_CARD_DEFINITIONS[spec.id]!;
      expect(
        def.types.some((t) => PERMANENT_TYPES.includes(t)),
        `${spec.id} is not a permanent and cannot start on the battlefield`,
      ).toBe(true);
    }
    for (const id of scenario.lands ?? []) {
      expect(TEST_CARD_DEFINITIONS[id]!.types, `${id} is not a land`).toContain("Land");
    }

    expect(scenario.setup.length, "every scenario says what its board is for").toBeGreaterThan(20);
    expect(scenario.checks.length, "every scenario has something to check").toBeGreaterThan(0);

    const state = createLabGame(scenario, deck);
    expect(state.phase).toBe("precombat-main");
    expect(state.players[state.priorityPlayerIndex]!.id).toBe(LAB_YOU);
    // Nothing half-resolved: the board opens with the game waiting on you, not
    // on an answer to a prompt left over from setting it up.
    expect(state.stack).toHaveLength(0);
    expect(state.pendingSearch).toBeNull();
    expect(state.pendingConfirmation).toBeNull();
    expect(state.pendingSacrifice).toBeNull();
    expect(state.mulligan).toBeNull();

    const you = state.players.find((p) => p.id === LAB_YOU)!;
    const them = state.players.find((p) => p.id === LAB_OPPONENT)!;
    expect(you.landsPlayedThisTurn).toBe(0);
    expect(them.library.length).toBeGreaterThan(10);
    // Setup is not a sequence of events: a board that stands two creatures up
    // beside Essence Warden must not open with the life already gained.
    expect(you.life).toBe(scenario.yourLife ?? 40);
    for (const creature of you.battlefield) expect(creature.summoningSickness).toBe(false);

    // The promise the lab makes: this card is playable, right now, from here.
    const underTest = scenario.fromCommandZone
      ? you.command.find((c) => c.definitionId === scenario.cardId)
      : you.hand.find((c) => c.definitionId === scenario.cardId);
    expect(underTest, "the card under test is where the lab said it would be").toBeDefined();
    if (scenario.uncastableOnOpen) {
      // A board is allowed to hand you a card it cannot cast yet, but only with
      // a reason written down - see `uncastableOnOpen`. Checked so that the
      // escape hatch cannot quietly become a way to switch the promise off.
      expect(scenario.uncastableOnOpen.length, "say why in a sentence").toBeGreaterThan(20);
      return;
    }
    expect(
      canPlayCardNow(state, LAB_YOU, underTest!.instanceId),
      `${scenario.cardId} cannot be played from its own scenario`,
    ).toBe(true);
  });
});

describe("a scenario is a board you can actually play from", () => {
  /*
   * Three walkthroughs, driven through the same functions the client calls -
   * `castSpellWithAutoTap` and `playLand`, not `applyEffect` on a hand-placed
   * instance.
   *
   * The check above proves a scenario is *well formed*. These prove it is
   * *playable*: that the lands really pay for the card, that the supporting
   * board really is what the card's trigger wants to find, and that the whole
   * route from a card in a hand to an effect on the table works. That is the
   * gap this lab exists to cover, so it is worth covering the covering.
   */
  function resolveEverything(state: ReturnType<typeof createLabGame>): void {
    let guard = 40;
    while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
  }

  const BLECH = LAB_DECKS.find((d) => d.slug === "blech")!;

  /** One Blech board, by the card it is for. */
  function blechBoard(cardId: string) {
    const scenario = BLECH.scenarios.find((s) => s.cardId === cardId)!;
    return createLabGame(scenario, BLECH);
  }

  function handCard(state: ReturnType<typeof createLabGame>, definitionId: string) {
    const you = state.players.find((p) => p.id === LAB_YOU)!;
    return you.hand.find((c) => c.definitionId === definitionId)!;
  }

  it("Blech: cast from the command zone, gain life, and count the counters", () => {
    const state = blechBoard("blech-loafing-pest");
    const you = state.players.find((p) => p.id === LAB_YOU)!;

    const blech = you.command[0]!;
    castSpellWithAutoTap(state, LAB_YOU, blech.instanceId, [], { fromCommandZone: true });
    resolveEverything(state);
    expect(you.battlefield.some((c) => c.definitionId === "blech-loafing-pest")).toBe(true);

    playLand(state, LAB_YOU, handCard(state, "radiant-fountain").instanceId);
    resolveEverything(state);
    expect(you.life).toBe(42);

    const counters = (definitionId: string) =>
      you.battlefield.find((c) => c.definitionId === definitionId)?.plusOneCounters;
    // The four creature types Blech names, plus Blech itself - it says "each
    // Pest" with no "other", and Blech is a Pest.
    expect(counters("duskshell-crawler")).toBe(1);
    expect(counters("sakura-tribe-elder")).toBe(1);
    expect(counters("arasta-of-the-endless-web")).toBe(1);
    expect(counters("blech-loafing-pest")).toBe(1);
    // Two, because Pest Mascot has its own "whenever you gain life" trigger.
    expect(counters("pest-mascot")).toBe(2);
    // An Ape is none of the named types.
    expect(counters("grizzly-bears")).toBe(0);
  });

  it("Blood Artist: the supporting board really does give it something to kill", () => {
    const state = blechBoard("blood-artist");
    const you = state.players.find((p) => p.id === LAB_YOU)!;
    const them = state.players.find((p) => p.id === LAB_OPPONENT)!;

    castSpellWithAutoTap(state, LAB_YOU, handCard(state, "blood-artist").instanceId);
    resolveEverything(state);

    const lion = them.battlefield.find((c) => c.definitionId === "silvercoat-lion")!;
    castSpellWithAutoTap(state, LAB_YOU, handCard(state, "fell-the-profane").instanceId, [
      { kind: "card", instanceId: lion.instanceId },
    ]);
    resolveEverything(state);
    expect(them.battlefield.some((c) => c.definitionId === "silvercoat-lion")).toBe(false);

    // The drain is a targeted trigger, so it waits for you to say who loses the
    // life - which is the clause the checklist asks you to point at Salty Mike.
    expect(state.pendingTargetChoices.length).toBeGreaterThan(0);
    chooseTriggerTarget(state, LAB_YOU, { kind: "player", playerId: LAB_OPPONENT });
    resolveEverything(state);
    expect(them.life).toBe(39);
    expect(you.life).toBe(41);
  });

  it("Scute Swarm: the land base is the point, and the fifth land takes the small branch", () => {
    const state = blechBoard("scute-swarm");
    const you = state.players.find((p) => p.id === LAB_YOU)!;

    castSpellWithAutoTap(state, LAB_YOU, handCard(state, "scute-swarm").instanceId);
    resolveEverything(state);

    playLand(state, LAB_YOU, handCard(state, "forest").instanceId);
    resolveEverything(state);

    // Five lands, so a plain Insect token - not a copy of the Swarm.
    const tokens = you.battlefield.filter((c) => TEST_CARD_DEFINITIONS[c.definitionId]!.isToken);
    expect(tokens).toHaveLength(1);
    expect(TEST_CARD_DEFINITIONS[tokens[0]!.definitionId]!.name).toContain("Insect");
    expect(you.battlefield.filter((c) => c.definitionId === "scute-swarm")).toHaveLength(1);
  });
});

describe("a Winota board is a board you can actually play from", () => {
  /*
   * The same covering as the three Blech walkthroughs above, for the deck that
   * arrived second. Worth its own: everything the second deck touches - the
   * commander a board is built behind, the basics its lands are made of, the
   * pile under its library - is exactly what used to be hardcoded to Blech, so
   * "the boards are well formed" is a much weaker claim here than it looks.
   */
  const WINOTA = LAB_DECKS.find((d) => d.slug === "winota")!;

  function winotaBoard(cardId: string) {
    const scenario = WINOTA.scenarios.find((s) => s.cardId === cardId)!;
    return createLabGame(scenario, WINOTA);
  }

  function resolveEverything(state: ReturnType<typeof createLabGame>): void {
    let guard = 40;
    while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
  }

  it("Winota: cast her off Boros basics, attack with a non-Human, and be offered the Humans", () => {
    const state = winotaBoard("winota-joiner-of-forces");
    const you = state.players.find((p) => p.id === LAB_YOU)!;

    // Boros basics, from a deck-derived land base. The old Golgari-only version
    // could not have paid for her at all.
    const lands = you.battlefield.filter((c) => TEST_CARD_DEFINITIONS[c.definitionId]!.types.includes("Land"));
    expect(lands.map((c) => c.definitionId).sort()).toEqual(["mountain", "mountain", "plains", "plains"]);

    castSpellWithAutoTap(state, LAB_YOU, you.command[0]!.instanceId, [], { fromCommandZone: true });
    resolveEverything(state);
    expect(you.battlefield.some((c) => c.definitionId === "winota-joiner-of-forces")).toBe(true);

    // The supporting board really is what her trigger wants to find: a
    // non-Human that can attack the turn the board opens.
    const ragavan = you.battlefield.find((c) => c.definitionId === "ragavan-nimble-pilferer")!;
    state.phase = "combat";
    state.step = "declare-attackers";
    declareAttackers(state, LAB_YOU, [
      { attackerInstanceId: ragavan.instanceId, defendingPlayerId: LAB_OPPONENT },
    ]);
    resolveEverything(state);

    // The three Humans the scenario stacked on top, and nothing else from the
    // six she looked at.
    expect(state.pendingSearch).not.toBeNull();
    const offered = state.pendingSearch!.candidateInstanceIds.map(
      (id) => you.library.find((c) => c.instanceId === id)?.definitionId,
    );
    expect(offered).toContain("myrel-shield-of-argive");
    expect(offered).toContain("boromir-warden-of-the-tower");
    expect(offered).not.toContain("mountain");
  });

  it("Sol Ring: the same card on two decks gets two boards, and both stand up", () => {
    // Four cards are in both lists. They are two different verdicts because
    // they are two different boards - see `labProgressKey`.
    const onWinota = winotaBoard("sol-ring");
    const winotaLands = onWinota.players
      .find((p) => p.id === LAB_YOU)!
      .battlefield.filter((c) => TEST_CARD_DEFINITIONS[c.definitionId]!.types.includes("Land"));
    expect(winotaLands.every((c) => c.definitionId === "mountain" || c.definitionId === "plains")).toBe(true);
    expect(onWinota.players.find((p) => p.id === LAB_YOU)!.command[0]!.definitionId).toBe(
      "winota-joiner-of-forces",
    );

    const blech = LAB_DECKS.find((d) => d.slug === "blech")!;
    const onBlech = createLabGame(blech.scenarios.find((s) => s.cardId === "sol-ring")!, blech);
    expect(onBlech.players.find((p) => p.id === LAB_YOU)!.command[0]!.definitionId).toBe("blech-loafing-pest");
  });
});

describe("the derived land base", () => {
  it("covers coloured pips, hybrid pips and generic", () => {
    // Hornet Queen, {4}{G}{G}{G}: three green sources plus four more lands.
    expect(landsForCost({ generic: 4, colors: { G: 3 } })).toHaveLength(7);
    // Braids, {1}{B}{B}: a Swamp for each black pip, and the generic one is
    // spread over the deck's colours rather than piled onto either.
    expect(landsForCost({ generic: 1, colors: { B: 2 } }).filter((l) => l === "swamp")).toHaveLength(3);
    // Revitalizing Repast, a lone {B/G}: one land, not two, and a Forest -
    // either half pays it, and this is the half the Blech boards were built on.
    expect(landsForCost({ generic: 0, colors: {}, hybrid: [["B", "G"]] })).toEqual(["forest"]);
    // A land under test costs nothing, and asking for ability mana still works.
    expect(landsForCost(undefined)).toEqual([]);
    expect(landsForCost(undefined, { g: 1 })).toEqual(["forest"]);
  });

  it("is built from the deck's colours, not the lab's", () => {
    // The same colourless cost on the two decks' boards. Sol Ring names no
    // colour at all, so nothing but the deck can say what pays for it.
    expect(landsForCost({ generic: 1, colors: {} }, {}, ["B", "G"])).toEqual(["swamp"]);
    expect(landsForCost({ generic: 1, colors: {} }, {}, ["R", "W"])).toEqual(["mountain"]);
    // And a Boros pip gets a Boros basic, which the old Golgari-only version
    // could not produce at all.
    expect(landsForCost({ generic: 0, colors: { R: 1, W: 1 } }, {}, ["R", "W"])).toEqual(["plains", "mountain"]);
    expect(landsForCost(undefined, { w: 2 }, ["R", "W"])).toEqual(["plains", "plains"]);
  });

  it("is what a scenario gets unless it names its own", () => {
    const blech = LAB_DECKS.find((d) => d.slug === "blech")!;
    const scute = blech.scenarios.find((s) => s.cardId === "scute-swarm")!;
    const state = createLabGame(scute, blech);
    const you = state.players.find((p) => p.id === LAB_YOU)!;
    // Four lands, deliberately: the fifth takes the Insect branch and the sixth
    // takes the copy branch, which is the whole card.
    expect(you.battlefield.filter((c) => TEST_CARD_DEFINITIONS[c.definitionId]!.types.includes("Land"))).toHaveLength(4);
  });
});
