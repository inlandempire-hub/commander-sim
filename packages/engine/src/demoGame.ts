import { createGameState, drawCard } from "./state.js";
import { OPENING_HAND_SIZE, createMulliganState } from "./mulligan.js";
import { setUpCommanderDeck, type DeckList } from "./commander.js";
import { BLECH_DECK } from "./cardLab.js";
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
 * Deadly Donny plays mono-white behind Agent Phil Coulson. Salty Mike plays the
 * Blech list, a real Golgari deck (changed 2026-08-17 from mono-green behind
 * Tifa Lockhart, which had itself replaced a Gruul/mono-red split on
 * 2026-07-30). Singleton rules mean only basics repeat.
 *
 * The two sides are deliberately no longer matched in kind: Donny's is a
 * generated colour pile, Mike's is a deck with a mana base and a plan.
 *
 * Donny's list deliberately carries five Heroes, because Coulson's ability
 * only does anything if there are other Heroes on his battlefield.
 */
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

/**
 * Salty Mike plays the Blech list - a real deck somebody built, not a colour.
 *
 * Changed 2026-08-17 from mono-green behind Tifa Lockhart. The same object the
 * deck picker offers and the card lab walks, rather than a second transcription
 * of the same 99 cards: two copies would disagree the first time one card
 * changed, and the disagreement would show up as the bot playing something that
 * is not in the deck.
 *
 * This is what a plain load of the client deals, and it is also the pair
 * packages/bot/src/__tests__/fullGame.test.ts plays out - so a real decklist is
 * now exercised on every run of the suite rather than only when asked for.
 */
export const MIKE_DECK: DeckList = BLECH_DECK;

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
  /**
   * Whether each library is shuffled on the way in. On by default - a game of
   * Magic starts with a shuffle, and every caller but one wants it.
   *
   * Off for a caller that has already ordered the library itself. The seeded
   * shuffles in the bot's deck tests named a seed, built an order from it, and
   * then had that order thrown away here by a `Math.random` shuffle - so the
   * tests were not reproducible, and a failure could not be re-run from the
   * seed it printed. A test that says "seed 3" must get seed 3.
   */
  shuffle?: boolean;
}

function dealOpeningHands(state: GameState, playerIds: string[], options: GameOptions): void {
  for (const id of playerIds) drawCard(state, id, OPENING_HAND_SIZE, { silent: true });
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
    const libraryIds = options.shuffle === false ? [...deck.libraryIds] : shuffled(deck.libraryIds);
    setUpCommanderDeck(state, id, { ...deck, libraryIds });
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
