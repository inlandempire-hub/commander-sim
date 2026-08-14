import { describe, expect, it } from "vitest";
import { BLECH_DECK, LAB_OPPONENT, LAB_YOU, createLabGame, landsForCost, type LabScenario } from "../cardLab.js";
import { LAB_SCENARIOS, labScenarioFor } from "../cardLabScenarios.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import { canPlayCardNow } from "../autoPass.js";
import { castSpellWithAutoTap } from "../autoTap.js";
import { playLand } from "../casting.js";
import { chooseTriggerTarget } from "../permanents.js";
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

describe("the card lab covers the deck", () => {
  it("has one scenario for every distinct card in the Blech deck, and nothing else", () => {
    const deck = new Set([BLECH_DECK.commanderId, ...BLECH_DECK.libraryIds]);
    const covered = new Set(LAB_SCENARIOS.map((s) => s.cardId));
    expect([...deck].filter((id) => !covered.has(id))).toEqual([]);
    expect([...covered].filter((id) => !deck.has(id))).toEqual([]);
  });

  it("names each card once", () => {
    const ids = LAB_SCENARIOS.map((s) => s.cardId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is a legal Commander deck", () => {
    // Not strictly the lab's business, but it is the cheapest possible check
    // that 100 fixtures agree with each other on singleton and colour identity.
    expect(BLECH_DECK.libraryIds).toHaveLength(99);
    const result = validateCommanderDeck(BLECH_DECK, TEST_CARD_DEFINITIONS);
    expect(result.errors).toEqual([]);
    expect(result.legal).toBe(true);
  });
});

describe("every scenario stands up", () => {
  it.each(LAB_SCENARIOS.map((s) => [s.cardId, s] as const))("%s", (_cardId, scenario) => {
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

    const state = createLabGame(scenario);
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

  function handCard(state: ReturnType<typeof createLabGame>, definitionId: string) {
    const you = state.players.find((p) => p.id === LAB_YOU)!;
    return you.hand.find((c) => c.definitionId === definitionId)!;
  }

  it("Blech: cast from the command zone, gain life, and count the counters", () => {
    const state = createLabGame(labScenarioFor("blech-loafing-pest")!);
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
    const state = createLabGame(labScenarioFor("blood-artist")!);
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
    const state = createLabGame(labScenarioFor("scute-swarm")!);
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

describe("the derived land base", () => {
  it("covers coloured pips, hybrid pips and generic", () => {
    // Hornet Queen, {4}{G}{G}{G}: three green sources plus four more lands.
    expect(landsForCost({ generic: 4, colors: { G: 3 } })).toHaveLength(7);
    // Braids, {1}{B}{B}: a Swamp for each black pip.
    expect(landsForCost({ generic: 1, colors: { B: 2 } }).filter((l) => l === "swamp")).toHaveLength(2);
    // Revitalizing Repast, a lone {B/G}: a Forest, which pays either half.
    expect(landsForCost({ generic: 0, colors: {}, hybrid: [["B", "G"]] })).toEqual(["forest"]);
    // A land under test costs nothing, and asking for ability mana still works.
    expect(landsForCost(undefined)).toEqual([]);
    expect(landsForCost(undefined, { g: 1 })).toEqual(["forest"]);
  });

  it("is what a scenario gets unless it names its own", () => {
    const scute = labScenarioFor("scute-swarm")!;
    const state = createLabGame(scute);
    const you = state.players.find((p) => p.id === LAB_YOU)!;
    // Four lands, deliberately: the fifth takes the Insect branch and the sixth
    // takes the copy branch, which is the whole card.
    expect(you.battlefield.filter((c) => TEST_CARD_DEFINITIONS[c.definitionId]!.types.includes("Land"))).toHaveLength(4);
  });
});
