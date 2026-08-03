import { createGameState, drawCard } from "./state.js";
import { OPENING_HAND_SIZE, createMulliganState } from "./mulligan.js";
import { setUpCommanderDeck, type DeckList } from "./commander.js";
import { TEST_CARD_DEFINITIONS } from "./cards/testCards.js";
import type { GameState } from "./types.js";

/**
 * The demo two-player game shared by every client of this engine (the local
 * hotseat UI, the networked server) so there's exactly one place that
 * defines "what is the placeholder Commander game we're testing with" - see
 * CLAUDE.md's note on consuming the engine via its built dist, not source,
 * for why this needs to be here rather than duplicated per-consumer.
 */

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function repeat(id: string, n: number): string[] {
  return Array.from({ length: n }, () => id);
}

export const DEADLY_DONNY = "Deadly Donny";
export const SALTY_MIKE = "Salty Mike";

/**
 * Two demo Commander decks built from the engine's card fixtures (see
 * cards/testCards.ts). Not tuned decks - just enough variety to click around
 * and see the engine's mechanics work. A real deck builder over the whole
 * card pool comes in Phase 5.
 *
 * Every card here is a real Magic card transcribed from Scryfall's bulk
 * data, and `tools/scryfall-report/audit_fixtures.py` re-verifies that on
 * demand - name, cost, power/toughness, type line, keywords, colour identity
 * and Commander legality. Nothing in the simulator is invented.
 *
 * Deadly Donny plays mono-white behind Agent Phil Coulson, Salty Mike plays
 * mono-green behind Tifa Lockhart (changed 2026-07-30 from the earlier
 * Gruul/mono-red split, alongside growing each colour's nonland pool to hit
 * the "~50 lands per deck" ROADMAP.md target - previously 84/99 and 93/99
 * lands, now 44/99 and 45/99). Singleton rules mean only basics repeat.
 *
 * Donny's list deliberately carries five Heroes, because Coulson's ability
 * only does anything if there are other Heroes on his battlefield.
 */
const MONO_GREEN_NONLAND_CARDS = [
  "grizzly-bears",
  "llanowar-elves",
  "elvish-visionary",
  "elvish-mystic",
  "runeclaw-bear",
  "elvish-warrior",
  "giant-spider",
  "craw-wurm",
  "wall-of-wood",
  "gladecover-scout",
  "willow-elf",
  "norwood-ranger",
  "trained-jackal",
  "ankle-biter",
  "charging-badger",
  "balduvian-bears",
  "bear-cub",
  "cylian-elf",
  "forest-bear",
  "kalonian-tusker",
  "swordwise-centaur",
  "terrain-elemental",
  "jibbirik-omnivore",
  "moon-sprite",
  "pygmy-razorback",
  "willow-faerie",
  "underdark-basilisk",
  "alpine-grizzly",
  "centaur-courser",
  "colossodon-yearling",
  "gorilla-warrior",
  "harrier-naga",
  "murasa-brute",
  "nessian-courser",
  "spined-karok",
  "sporecap-spider",
  "hitchclaw-recluse",
  "mosscoat-goriak",
  "wary-okapi",
  "woodland-patrol",
  "leatherback-baloth",
  "axebane-beast",
  "broodhunter-wurm",
  "golden-bear",
  "nettle-swine",
  "wild-elephant",
  "order-of-the-sacred-bell",
  "rowan-treefolk",
  "rumbling-baloth",
  "wild-ceratok",
  "tomakul-honor-guard",
  "ambush-viper",
  "hornet-sting",
  "nourish",
];

const MONO_WHITE_NONLAND_CARDS = [
  "healing-salve",
  "devoted-hero",
  "eager-cadet",
  "elite-vanguard",
  "expedition-envoy",
  "isamaru-hound-of-konda",
  "kitesail-scout",
  "lantern-kami",
  "rustwing-falcon",
  "savannah-lions",
  "staunch-shieldmate",
  "suntail-hawk",
  "tasseled-dromedary",
  "valiant-guard",
  "volunteer-militia",
  "yoked-ox",
  "ageless-guardian",
  "alabaster-host-sanctifier",
  "alaborn-grenadier",
  "armored-warhorse",
  "blade-of-the-sixth-pride",
  "cliffhaven-sell-sword",
  "concordia-pegasus",
  "dromoka-warrior",
  "fortified-rampart",
  "fresh-volunteers",
  "glory-seeker",
  "knight-errant",
  "knight-of-new-benalia",
  "kyoshi-warrior-guard",
  "leonin-skyhunter",
  "makindi-aeronaut",
  "maned-serval",
  "mistral-charger",
  "prowling-caracal",
  "royal-falcon",
  "silvercoat-lion",
  "skyblade-of-the-legion",
  "ant-man-scott-lang",
  "steadfast-paladin",
  "stormfront-pegasus",
  "story-seeker",
  "territorial-roc",
  "thraben-valiant",
  "amateur-hero",
  "chapel-geist",
  "dawn-gryff",
  "standing-troops",
  "wild-griffin",
  "assault-griffin",
  "hawkeye-clint-barton",
  "valkyrior-skyrider",
  "the-falcon-sam-wilson",
  "chaplains-blessing",
  "angels-mercy",
];

export const DONNY_DECK: DeckList = {
  commanderId: "agent-phil-coulson",
  libraryIds: [...MONO_WHITE_NONLAND_CARDS, ...repeat("plains", 99 - MONO_WHITE_NONLAND_CARDS.length)],
};

export const MIKE_DECK: DeckList = {
  commanderId: "tifa-lockhart",
  libraryIds: [...MONO_GREEN_NONLAND_CARDS, ...repeat("forest", 99 - MONO_GREEN_NONLAND_CARDS.length)],
};

/**
 * Whether players get to look at their opening hand and send it back.
 *
 * Off by default, and that is deliberate rather than lazy: a headless test or
 * a bot-vs-bot run wants a game that is already under way, and every one of
 * them would otherwise have to answer a mulligan prompt before it could assert
 * anything. The client turns it on, because a real game of Magic starts here.
 */
export interface GameOptions {
  mulligan?: boolean;
}

function dealOpeningHands(state: GameState, playerIds: string[], options: GameOptions): void {
  for (const id of playerIds) drawCard(state, id, OPENING_HAND_SIZE);
  if (options.mulligan) state.mulligan = createMulliganState(playerIds);
}

/**
 * Builds a two-player game from any pair of decks - the general form that
 * createDemoGame() is one fixed instance of. Used for archetype matchups (see
 * archetypes.ts) and for bot-vs-bot simulation.
 */
export function createGameFromDecks(
  players: [{ id: string; deck: DeckList }, { id: string; deck: DeckList }],
  options: GameOptions = {},
): GameState {
  const state = createGameState(
    players.map((p) => p.id),
    TEST_CARD_DEFINITIONS,
  );
  for (const { id, deck } of players) {
    setUpCommanderDeck(state, id, { ...deck, libraryIds: shuffled(deck.libraryIds) });
  }
  dealOpeningHands(
    state,
    players.map((p) => p.id),
    options,
  );
  return state;
}

export function createDemoGame(options: GameOptions = {}): GameState {
  const state = createGameState([DEADLY_DONNY, SALTY_MIKE], TEST_CARD_DEFINITIONS);

  setUpCommanderDeck(state, DEADLY_DONNY, { ...DONNY_DECK, libraryIds: shuffled(DONNY_DECK.libraryIds) });
  setUpCommanderDeck(state, SALTY_MIKE, { ...MIKE_DECK, libraryIds: shuffled(MIKE_DECK.libraryIds) });

  dealOpeningHands(state, [DEADLY_DONNY, SALTY_MIKE], options);

  return state;
}
