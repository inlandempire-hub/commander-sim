import { BLECH_DECK, type LabDeck } from "./cardLab.js";
import { LAB_SCENARIOS } from "./cardLabScenarios.js";
import { WINOTA_DECK } from "./winotaDeck.js";
import { WINOTA_LAB_SCENARIOS } from "./winotaLabScenarios.js";
import { WINTER_DECK } from "./winterDeck.js";
import { WINTER_LAB_SCENARIOS } from "./winterLabScenarios.js";
import { FELIX_DECK } from "./demoGame.js";
import { FELIX_LAB_SCENARIOS } from "./felixLabScenarios.js";

/**
 * The decks the card lab can walk.
 *
 * The lab was one deck's for as long as the project had one real deck. It has
 * two now, and three things that used to be global turn out to belong to a deck
 * rather than to the lab: the commander every board is built behind, the basics
 * a derived land base is made of, and what a tutor finds. Each of them is not
 * merely unhelpful but *wrong* when it comes from the other deck - an
 * Enlightened Tutor that can only find Golgari artifacts is indistinguishable,
 * from the chair, from an Enlightened Tutor that is broken.
 *
 * Order is the order the index offers them, and `slug` is in the URL and in
 * every stored tick, so neither is safe to change once somebody has walked one.
 */

/**
 * What sits under the top of every library on a Blech board.
 *
 * One fixed pile rather than a shuffled deck, and chosen so that every kind of
 * search in the deck finds something: a basic of all five types for the
 * fetchlands, creatures for Sylvan Tutor, artifacts for Pest Infestation's
 * targets, and enough cards that milling and drawing cannot empty it.
 */
const BLECH_LIBRARY_TAIL: string[] = [
  "forest",
  "swamp",
  "plains",
  "island",
  "mountain",
  "pest-mascot",
  "blood-artist",
  "hornet-queen",
  "sol-ring",
  "bayou",
  "skullclamp",
  "essence-warden",
  "sakura-tribe-elder",
  "haywire-mite",
  "shopkeepers-bane",
  "birds-of-paradise",
  ...Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? "forest" : "swamp")),
];

/**
 * The same, for a Winota board.
 *
 * This deck asks more of its library than Blech does: it searches it five
 * different ways, each with its own filter, and Winota herself looks at the top
 * six for a Human every time a non-Human attacks. So the pile is stocked to
 * answer all of them - Humans and non-Humans, a creature under each recruiter's
 * ceiling, artifacts and enchantments for Enlightened Tutor, and a basic of
 * every type for the four fetchlands.
 *
 * Everything in it is a card from the deck, which is not required but is worth
 * keeping: a board that hands you a card the deck does not play is a board that
 * teaches you something untrue about the deck.
 */
const WINOTA_LIBRARY_TAIL: string[] = [
  // The four fetchlands between them want all five basics.
  "plains",
  "mountain",
  "island",
  "swamp",
  "forest",
  // Humans, for Winota's trigger and for the top of a Gamble.
  "mother-of-runes",
  "imperial-recruiter",
  "recruiter-of-the-guard",
  "myrel-shield-of-argive",
  "ranger-captain-of-eos",
  "grand-abolisher",
  "serra-ascendant",
  "voice-of-victory",
  "boromir-warden-of-the-tower",
  // Non-Humans, which are the half of the deck that attacks.
  "ragavan-nimble-pilferer",
  "ocelot-pride",
  "goblin-rabblemaster",
  "signal-pest",
  "ornithopter",
  "gingerbrute",
  // Artifacts and enchantments, for Enlightened Tutor.
  "sol-ring",
  "arcane-signet",
  "lotus-petal",
  "chrome-mox",
  "high-noon",
  "deafening-silence",
  "windcrag-siege",
  // Spells, so a search that names no type still has a choice to make.
  "swords-to-plowshares",
  "path-to-exile",
  "pyroblast",
  ...Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? "plains" : "mountain")),
];

/**
 * The pile under a Winter, Misanthropic Guide board.
 *
 * This deck searches its library a dozen ways and self-mills constantly, so the
 * tail is stocked to answer all of it: a basic of every type for Farseek and the
 * fetches, creatures and permanents for the recursion and reveal effects, and
 * enough depth that milling and each-player draws cannot bottom it out.
 */
const WINTER_LIBRARY_TAIL: string[] = [
  // A basic of each type - Farseek wants Plains/Island/Swamp/Mountain, the rest
  // want the deck's own Swamp/Forest/Mountain.
  "swamp",
  "forest",
  "mountain",
  "plains",
  "island",
  // Creatures and permanents, for the reveal, recursion and Over the Top lines.
  "sakura-tribe-elder",
  "eternal-witness",
  "elder-gargaroth",
  "solemn-simulacrum",
  "essence-warden",
  "howling-mine",
  "command-tower",
  ...Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? "swamp" : "forest")),
];

/**
 * The pile under a Felix Five-Boots board.
 *
 * Sultai wants its library three ways at once: basics for Cultivate and the
 * fetches, an artifact for Fabricate, an instant for Waterlogged Teachings, and
 * a Demon for Demonic Counsel - so the tail carries one of each, plus depth for
 * the wheels and big draws this deck leans on.
 */
const FELIX_LIBRARY_TAIL: string[] = [
  "forest",
  "island",
  "swamp",
  // An artifact for Fabricate, an instant for Waterlogged Teachings, a creature
  // for the graveyard-value lines.
  "arcane-signet",
  "baleful-strix",
  "brainstorm",
  "psychic-frog",
  "shadowmage-infiltrator",
  "necropolis-regent",
  ...Array.from({ length: 14 }, (_, i) => ["forest", "island", "swamp"][i % 3]!),
];

export const LAB_DECKS: LabDeck[] = [
  {
    slug: "blech",
    name: "Blech, Loafing Pest",
    blurb:
      "Trade small creatures for cards and life: Pest tokens, sacrifice payoffs, and unconditional removal for anything that gets past them.",
    deck: BLECH_DECK,
    identity: ["B", "G"],
    libraryTail: BLECH_LIBRARY_TAIL,
    scenarios: LAB_SCENARIOS,
  },
  {
    slug: "winota",
    name: "Winota, Joiner of Forces",
    blurb:
      "Tax and deny with cheap hate pieces, then attack with non-Humans so Winota drags free Humans off the top of the library.",
    deck: WINOTA_DECK,
    identity: ["R", "W"],
    libraryTail: WINOTA_LIBRARY_TAIL,
    scenarios: WINOTA_LAB_SCENARIOS,
  },
  {
    slug: "winter",
    name: "Winter, Misanthropic Guide",
    blurb:
      "Flood everyone with cards and symmetrical value, punish the draws with the delirium hand-size squeeze, then reset the board with a group wipe or Warp World.",
    deck: WINTER_DECK,
    identity: ["B", "R", "G"],
    libraryTail: WINTER_LIBRARY_TAIL,
    scenarios: WINTER_LAB_SCENARIOS,
  },
  {
    slug: "felix",
    name: "Felix Five-Boots",
    blurb:
      "Grind card advantage behind counters and removal, then close with Felix's doubled combat triggers or a Twenty-Toed Toad / Laboratory Maniac win.",
    deck: FELIX_DECK,
    identity: ["B", "G", "U"],
    libraryTail: FELIX_LIBRARY_TAIL,
    scenarios: FELIX_LAB_SCENARIOS,
  },
];

/** The deck a `?deck=` slug names, or undefined. The index is the fallback. */
export function labDeckBySlug(slug: string | null | undefined): LabDeck | undefined {
  if (!slug) return undefined;
  return LAB_DECKS.find((d) => d.slug === slug);
}

/** The board for one card within one deck. */
export function labScenarioIn(deck: LabDeck, cardId: string): LabScenarioWithIndex | undefined {
  const index = deck.scenarios.findIndex((s) => s.cardId === cardId);
  if (index < 0) return undefined;
  return { scenario: deck.scenarios[index]!, index };
}

interface LabScenarioWithIndex {
  scenario: LabDeck["scenarios"][number];
  index: number;
}

/**
 * Where a card's ticks are filed.
 *
 * Deck-scoped because four cards are in both lists - Command Tower, Sol Ring,
 * Marsh Flats, Windswept Heath - and they are walked on two different boards.
 * One key for both would have the second walk overwrite the first's verdict.
 */
export function labProgressKey(deckSlug: string, cardId: string): string {
  return `${deckSlug}/${cardId}`;
}
