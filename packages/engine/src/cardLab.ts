import { createCardInstance, createGameState, requireDefinition, requirePlayer } from "./state.js";
import { TEST_CARD_DEFINITIONS } from "./cards/testCards.js";
import type { CardInstance, Color, GameState, ManaCost } from "./types.js";

/**
 * The card lab: one board per card, stood up so that card's whole text can be
 * put to work.
 *
 * Engine tests prove a mechanic in isolation - "sacrifice a 3/3 to Tend the
 * Pests, assert three Pests" - by reaching into the state and placing exactly
 * what the assertion needs. That is the right shape for a test and the wrong
 * shape for confidence: it proves the effect handler works when called, not
 * that the card can be found in a hand, paid for, aimed, resolved and seen to
 * have happened. Those are different failures, and the second kind has been
 * found by hand in this project more than once (a targeted ability that went on
 * the stack with no targets, an anthem that rendered as an empty sentence).
 *
 * So: a scenario per card, in the real client, against the real engine. Nothing
 * here is a test framework. It is a board, a hand, and a list of what to try -
 * and the human reading the list is the assertion.
 *
 * Everything is deliberately deterministic: no shuffle, no mulligan, no bot,
 * the same board every time you open the same card. A lab you cannot reproduce
 * is not a lab.
 */

/** A permanent already on the battlefield when the scenario opens. */
export interface LabPermanent {
  /** Definition id, from `TEST_CARD_DEFINITIONS`. */
  id: string;
  tapped?: boolean;
  /** +1/+1 counters already on it. */
  counters?: number;
  /** -1/-1 counters already on it. */
  minusCounters?: number;
  /** Counters that are neither - a charge counter, a time counter. */
  otherCounters?: number;
  /**
   * Index into the *same player's* permanent list, for an Aura or an
   * Equipment. An index rather than an id because the list is written inline
   * and the instance ids don't exist until the board is built.
   */
  attachedToIndex?: number;
  /** Damage already marked on it this turn. */
  damage?: number;
}

/** Mana wanted beyond the card's own printed cost, for its abilities. */
export interface LabMana {
  generic?: number;
  b?: number;
  g?: number;
}

export interface LabScenario {
  /** The card under test. Starts in your hand, always. */
  cardId: string;
  /** What has been put on the board for it, and why. */
  setup: string;
  /**
   * What to do and what should happen, in the order to do it. One line per
   * clause of the card, so a card with three abilities has at least three.
   */
  checks: string[];
  /**
   * Clauses the engine knowingly does not model. A failure against one of these
   * is expected, and saying so here is what stops it being re-reported as a bug
   * every time somebody walks the list.
   */
  gaps?: string[];
  /** Mana for the card's abilities, on top of its printed cost. */
  extraMana?: LabMana;
  /**
   * An explicit land base, replacing the one derived from the cost. Only for
   * the cards that count lands - Scute Swarm, the checklands, Springheart
   * Nantuko - where "enough to cast it" is not the same as "the right number".
   * The headless test still checks the card is affordable, so this cannot
   * quietly drift away from the cost.
   */
  lands?: string[];
  yours?: LabPermanent[];
  theirs?: LabPermanent[];
  /** Extra cards in your hand beyond the card under test. */
  yourHand?: string[];
  theirHand?: string[];
  yourGraveyard?: string[];
  theirGraveyard?: string[];
  /** Cards placed on top of your library, in this order. */
  yourLibraryTop?: string[];
  theirLibraryTop?: string[];
  yourLife?: number;
  theirLife?: number;
  /**
   * Your commander starts on the battlefield instead of in the command zone -
   * for "if you control a commander" (Deadly Rollick) and for the two cards
   * that count Pests, which Blech itself is one of.
   */
  commanderInPlay?: boolean;
  /**
   * The card under test *is* the commander in the command zone, so no copy is
   * put in your hand. Only Blech uses this, and it matters: a commander is cast
   * from the command zone with tax on it, and testing it out of a hand would be
   * testing a route the card never takes.
   */
  fromCommandZone?: boolean;
}

export const LAB_YOU = "Deadly Donny";
export const LAB_OPPONENT = "Salty Mike";

/** The commander every lab board is built behind, so the deck's own cards work. */
export const LAB_COMMANDER = "blech-loafing-pest";

/**
 * The deck the lab walks: "Blech, Loafing Pest", 100 cards, all implemented.
 *
 * Here rather than only in the lab because it is a real, legal, playable deck
 * now - the first one in the project that is somebody's actual list rather than
 * a pile assembled to exercise the engine. The lab's coverage is checked against
 * it, so a card in the deck with no scenario is a test failure rather than an
 * omission nobody notices.
 */
export const BLECH_DECK: { commanderId: string; libraryIds: string[] } = {
  commanderId: LAB_COMMANDER,
  libraryIds: [
    "adventurers-inn",
    "arachnogenesis",
    "arasta-of-the-endless-web",
    "assassins-trophy",
    "bala-ged-recovery",
    "bayou",
    "birds-of-paradise",
    "blight-mound",
    "blood-artist",
    "bloodstained-mire",
    "boggart-trawler",
    "bogwater-lumaret",
    "braids-arisen-nightmare",
    "command-tower",
    "dark-ritual",
    "deadly-rollick",
    "deathcap-glade",
    "deathreap-ritual",
    "delighted-halfling",
    "disciple-of-freyalise",
    "doubling-season",
    "duskshell-crawler",
    "eccentric-pestfinder",
    "elves-of-deep-shadow",
    "essence-warden",
    "eumidian-terrabotanist",
    "exotic-orchard",
    "fell-the-profane",
    "feral-appetite",
    "forest",
    "forest",
    "forest",
    "forest",
    "forest",
    "fumulus-the-infestation",
    "golgari-charm",
    "grist-the-hunger-tide",
    "haywire-mite",
    "heroic-intervention",
    "hornet-nest",
    "hornet-queen",
    "icetill-explorer",
    "illegitimate-business",
    "inspiring-call",
    "iridescent-hornbeetle",
    "lifegift",
    "llanowar-wastes",
    "marsh-flats",
    "meltstrider-eulogist",
    "moseo-veins-new-dean",
    "necrodominance",
    "ophiomancer",
    "overgrown-tomb",
    "path-of-ancestry",
    "pest-infestation",
    "pest-mascot",
    "polluted-delta",
    "profane-tutor",
    "radiant-fountain",
    "return-of-the-wildspeaker",
    "revitalizing-repast",
    "ribtruss-roaster",
    "ripples-of-undeath",
    "rishkars-expertise",
    "riveteers-overlook",
    "root-manipulation",
    "sakura-tribe-elder",
    "sapseep-forest",
    "scheming-symmetry",
    "scute-swarm",
    "sedgemoor-witch",
    "send-in-the-pest",
    "shopkeepers-bane",
    "skullclamp",
    "sol-ring",
    "springheart-nantuko",
    "springleaf-parade",
    "swamp",
    "swamp",
    "swamp",
    "swamp",
    "swarmyard",
    "sylvan-tutor",
    "tainted-strike",
    "tainted-wood",
    "tend-the-pests",
    "the-meathook-massacre",
    "the-ozolith",
    "toxic-deluge",
    "twilight-mire",
    "twitching-doll",
    "underground-mortuary",
    "undergrowth-stadium",
    "verdant-catacombs",
    "wastewood-verge",
    "winding-constrictor",
    "windswept-heath",
    "wooded-foothills",
    "woodland-cemetery",
  ],
};

/**
 * What sits under the top of every library.
 *
 * One fixed pile rather than a shuffled deck, and chosen so that every kind of
 * search in the deck finds something: a basic of all five types for the
 * fetchlands, creatures for Sylvan Tutor, artifacts for Pest Infestation's
 * targets, and enough cards that milling and drawing cannot empty it.
 */
const LAB_LIBRARY_TAIL: string[] = [
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

function countHybrid(cost: ManaCost, color: Color): number {
  return (cost.hybrid ?? []).filter((options) => options.includes(color)).length;
}

/**
 * The land base a card needs to be cast, worked out from its own printed cost.
 *
 * Derived rather than written down per scenario for the reason every derived
 * thing in this repo is derived: a hand-written list of lands goes stale the
 * moment a fixture's cost is corrected, and it goes stale silently - the card
 * simply stops being castable and the lab looks broken.
 *
 * Hybrid pips count as green, since a Forest pays {B/G} as happily as a Swamp
 * and Twilight Mire needs a green source to filter. Generic is split between
 * the two colours so there is always some of each to reach for.
 */
export function landsForCost(cost: ManaCost | undefined, extra: LabMana = {}): string[] {
  const green = (cost?.colors.G ?? 0) + countHybrid(cost ?? { generic: 0, colors: {} }, "G") + (extra.g ?? 0);
  const black = (cost?.colors.B ?? 0) + (extra.b ?? 0);
  const generic = (cost?.generic ?? 0) + (extra.generic ?? 0);
  const forests = green + Math.ceil(generic / 2);
  const swamps = black + Math.floor(generic / 2);
  return [
    ...Array.from({ length: forests }, () => "forest"),
    ...Array.from({ length: swamps }, () => "swamp"),
  ];
}

function placePermanent(state: GameState, ownerId: string, spec: LabPermanent, placed: CardInstance[]): void {
  const def = requireDefinition(state, spec.id);
  const instance = createCardInstance(state, spec.id, ownerId, "battlefield");
  instance.tapped = spec.tapped ?? false;
  instance.plusOneCounters = spec.counters ?? 0;
  instance.minusOneCounters = spec.minusCounters ?? 0;
  instance.otherCounters = spec.otherCounters ?? 0;
  instance.damageMarked = spec.damage ?? 0;
  instance.loyalty = def.loyalty ?? 0;
  /*
   * Nothing placed here has summoning sickness.
   *
   * A scenario's supporting board is meant to read as "this has been in play
   * since last turn", not "all of this arrived a second ago". Without it, half
   * the attack triggers in the deck cannot be tested on the turn you open the
   * card, and the lab would need a wasted turn passed before every one of them.
   */
  instance.summoningSickness = false;
  if (spec.attachedToIndex !== undefined) {
    const host = placed[spec.attachedToIndex];
    if (!host) throw new Error(`${spec.id}: attachedToIndex ${spec.attachedToIndex} names no permanent`);
    instance.attachedTo = host.instanceId;
    // An Aura creature (Springheart Nantuko, Arasta) is only an Aura while it
    // is attached to something - see `typesOf` in counters.ts.
    if (def.bestowCost) instance.bestowed = true;
  }
  placed.push(instance);
}

function stockLibrary(state: GameState, playerId: string, top: string[]): void {
  for (const id of [...top, ...LAB_LIBRARY_TAIL]) createCardInstance(state, id, playerId, "library");
}

/**
 * Builds the board for one scenario.
 *
 * Permanents are placed straight into the battlefield array rather than moved
 * there through `putOntoBattlefield`, which is the one thing about this file
 * worth being careful about: setup is not a sequence of events. A scenario that
 * stands up two creatures beside Essence Warden must not open with two life
 * already gained, or the very clause under test has been used up before you
 * touch anything.
 *
 * The game opens in your precombat main phase with priority, on turn 1, with no
 * land played yet - so a land is always still available, and so is a sorcery.
 */
export function createLabGame(scenario: LabScenario): GameState {
  const state = createGameState([LAB_YOU, LAB_OPPONENT], TEST_CARD_DEFINITIONS);
  const you = requirePlayer(state, LAB_YOU);
  const them = requirePlayer(state, LAB_OPPONENT);

  const commander = createCardInstance(state, LAB_COMMANDER, LAB_YOU, "command", { isCommander: true });
  if (scenario.commanderInPlay) {
    you.command.pop();
    commander.zone = "battlefield";
    commander.summoningSickness = false;
    you.battlefield.push(commander);
  }

  const def = TEST_CARD_DEFINITIONS[scenario.cardId];
  if (!def) throw new Error(`Unknown card under test: ${scenario.cardId}`);

  const lands = scenario.lands ?? landsForCost(def.manaCost, scenario.extraMana);
  for (const id of lands) {
    const land = createCardInstance(state, id, LAB_YOU, "battlefield");
    land.summoningSickness = false;
  }

  const yours: CardInstance[] = [];
  for (const spec of scenario.yours ?? []) placePermanent(state, LAB_YOU, spec, yours);
  const theirs: CardInstance[] = [];
  for (const spec of scenario.theirs ?? []) placePermanent(state, LAB_OPPONENT, spec, theirs);

  // The card under test, and it goes in last so it is the rightmost card in
  // the fan - the one your eye lands on when the board opens.
  for (const id of scenario.yourHand ?? []) createCardInstance(state, id, LAB_YOU, "hand");
  if (!scenario.fromCommandZone) createCardInstance(state, scenario.cardId, LAB_YOU, "hand");
  for (const id of scenario.theirHand ?? []) createCardInstance(state, id, LAB_OPPONENT, "hand");

  for (const id of scenario.yourGraveyard ?? []) createCardInstance(state, id, LAB_YOU, "graveyard");
  for (const id of scenario.theirGraveyard ?? []) createCardInstance(state, id, LAB_OPPONENT, "graveyard");

  stockLibrary(state, LAB_YOU, scenario.yourLibraryTop ?? []);
  stockLibrary(state, LAB_OPPONENT, scenario.theirLibraryTop ?? []);

  if (scenario.yourLife !== undefined) you.life = scenario.yourLife;
  if (scenario.theirLife !== undefined) them.life = scenario.theirLife;

  state.phase = "precombat-main";
  state.step = "main";
  state.activePlayerIndex = 0;
  state.priorityPlayerIndex = 0;
  state.log.push({ turn: 1, text: `Card lab: ${def.name}` });
  return state;
}
