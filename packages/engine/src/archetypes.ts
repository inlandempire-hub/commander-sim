import type { DeckList } from "./commander.js";
import { BLECH_DECK } from "./cardLab.js";
import { WINOTA_DECK } from "./winotaDeck.js";
import { WINTER_DECK } from "./winterDeck.js";
import { SUPREMACY_DECK } from "./supremacyDeck.js";
import { FELIX_DECK } from "./demoGame.js";

/**
 * Pre-built archetype decks, one per colour, for the bot to pilot and for
 * humans to play against (see ROADMAP.md Phase 4).
 *
 * Every card is a real Magic card the engine represents *exactly* - the
 * remaining colour pools were generated straight from Scryfall by
 * `tools/scryfall-report/gen_fixtures.py`, which refuses any card carrying
 * rules text the effect DSL can't express rather than approximating it.
 * `tools/scryfall-report/audit_fixtures.py` re-checks all of them on demand.
 *
 * Updated 2026-07-31: the caveat that used to sit here - "every one of these
 * wins by attacking, and there cannot be a control deck until the engine has
 * counterspells and real card draw" - no longer holds. It has both now, and
 * Tidewall (mono-blue) is built to win by not letting anything resolve. The
 * other four still win through combat, but they now carry real removal,
 * combat tricks and sweepers rather than creatures alone.
 */

function repeat(id: string, n: number): string[] {
  return Array.from({ length: n }, () => id);
}

export interface Archetype {
  name: string;
  /** One line on how it wants to win, for deck-select UI and for the game log. */
  plan: string;
  deck: DeckList;
}

/** Mono-white go-wide: cheap bodies, token makers, and an anthem to make them all matter. */
const WHITE_NONLANDS = [
  "healing-salve",
  "devoted-hero",
  "elite-vanguard",
  "expedition-envoy",
  "isamaru-hound-of-konda",
  "kitesail-scout",
  "lantern-kami",
  "rustwing-falcon",
  "savannah-lions",
  "suntail-hawk",
  // First strike, replacing eight vanilla 1/1s and 0/4s. White is the colour
  // that gets it, and a 2/2 first striker beats almost everything the other
  // decks can attack into it.
  "tundra-wolves",
  "youthful-knight",
  "fencing-ace",
  "knight-of-meadowgrain",
  "capashen-knight",
  "razorfoot-griffin",
  "plover-knights",
  "silverclaw-griffin",
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
  // White answers an anthem rather than the creatures under it.
  "demystify",
  "quiet-purity",
  "mistral-charger",
  "prowling-caracal",
  "royal-falcon",
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
  "glorious-anthem",
  "raise-the-alarm",
  "captains-call",
  // Mass pumps turn a wide board into a lethal alpha strike, which is the
  // whole point of playing this many small creatures.
  "inspired-charge",
  "righteous-charge",
  "glorious-charge",
  "aegis-of-the-heavens",
  "mana-tithe",
  // White's reanimation: get the best thing back after a sweeper.
  "resurrection",
  "breath-of-life",];

/** Mono-black removal: kill the good ones, grind through with deathtouch and lifelink. */
const BLACK_NONLANDS = [
  // Recursion and tutors - black's two best tools, and the reason its removal
  // spells stop being a finite resource.
  "raise-dead",
  "disentomb",
  "zombify",
  "rise-again",
  "demonic-tutor",
  "diabolic-tutor",
  "banehound",
  "gilacorn",
  "vampire-of-the-dire-moon",
  "bog-imp",
  "dakmor-bat",
  "dune-beetle",
  "gifted-aetherborn",
  "hand-of-silumgar",
  "misshapen-fiend",
  "skeletal-snake",
  "wei-infantry",
  "barony-vampire",
  "dusk-imp",
  "feral-shadow",
  "gloom-pangolin",
  "headless-horseman",
  "kraul-raider",
  "midnight-assassin",
  "moriok-reaver",
  "python",
  "undead-minotaur",
  "vampire-noble",
  "witchs-familiar",
  "carrion-screecher",
  "crazed-skirge",
  "dross-crocodile",
  "glamorous-grapplers",
  "insatiable-harpy",
  "moonglove-winnower",
  "nyxborn-marauder",
  "rotted-hulk",
  "skeletal-crocodile",
  "ukud-cobra",
  "vampire-revenant",
  "arrogant-vampire",
  "canal-monitor",
  // Black's land destruction is the most efficient in the game.
  "sinkhole",
  "rain-of-tears",
  "dreg-reaver",
  "mass-of-ghouls",
  "zombie-goliath",
  "feral-abomination",
  "child-of-night",
  "fell",
  "murder",
  "impale",
  "eviscerate",
  "final-reward",
  "darksteel-myr",
  // -N/-N is removal by another name: a creature at 0 toughness dies to a
  // state-based action, so these answer Indestructible too.
  "disfigure",
  "last-gasp",
  "grasp-of-darkness",
  "flatten",
  "throttle",
  "wander-off",
  "final-death",
  "dark-deed",
  // Two sweepers - the mass version of the same effect.
  "languish",
  "infest",];

/**
 * Mono-blue control: the first deck here that does not intend to win a fight.
 *
 * The creature base is deliberately lopsided - walls and big-bottomed blockers
 * to survive the early turns, then fliers to close, because flying is the only
 * evasion the engine has and a ground stall is otherwise unbreakable. Caelorna,
 * Coral Tyrant is a vanilla {1}{U} 0/8, which is exactly what this deck wants
 * from its commander: a two-mana wall that nothing in the other four decks can
 * profitably attack into.
 */
const BLUE_NONLANDS = [
  // Just enough blockers to survive to the mid-game. An earlier version of this
  // list ran sixteen of them and won 1 game in 24: it stabilised every board and
  // then had nothing to actually kill anyone with. Eight is the whole defensive
  // package now, and everything else attacks.
  "aegis-turtle",
  "kraken-hatchling",
  "shorecomber-crab",
  "wall-of-mist",
  "glacial-wall",
  "wall-of-water",
  "wall-of-air",
  "hover-barrier",
  // Fliers - the clock. Flying is the only evasion the engine has, so this is
  // the only way a deck wins a game it isn't winning on the ground.
  "flying-men",
  "storm-crow",
  "talas-scout",
  "seacoast-drake",
  "flying-dolphin-fish",
  "bay-falcon",
  "cloudkin-seer",
  "a-i-m-bot",
  "okos-accomplices",
  "soaring-drake",
  "wind-drake",
  "tome-raider",
  "updraft-elemental",
  "fighting-drake",
  "azure-drake",
  "cloud-manta",
  "moon-heron",
  "phantom-monster",
  "snapping-drake",
  "talas-air-ship",
  "silver-erne",
  "aven-fleetwing",
  "air-elemental",
  "serra-sphinx",
  // A counterspell that cannot itself be countered.
  "last-word",
  "soul-of-the-rapids",
  "nimbus-of-the-isles",
  "gryff-vanguard",
  "wind-spirit",
  "mahamoti-djinn",
  "djinn-of-the-lamp",
  "goliath-sphinx",
  // Counterspells.
  "force-spike",
  "counterspell",
  "mana-leak",
  "quench",
  "itll-quench-ya",
  "cancel",
  "convolute",
  "mindstatic",
  // Card draw - the other half of what makes a control deck work.
  "merchant-of-secrets",
  "reach-through-mists",
  "counsel-of-the-soratami",
  "divination",
  "quick-study",
  "touch-of-brilliance",
  "weave-fate",
  "concentrate",
  "brilliant-plan",
  "jaces-ingenuity",
  "tidings",
  // Blue's only removal in this pool: shrink the attacker instead of killing it.
  "hydrosurge",
  "disorient",
];

function build(commanderId: string, nonlands: string[], basicLandId: string): DeckList {
  return {
    commanderId,
    libraryIds: [...nonlands, ...repeat(basicLandId, 99 - nonlands.length)],
  };
}

export const ARCHETYPES: Archetype[] = [
  {
    /*
     * The second real deck here, and the first built the other way round: every
     * card in it was implemented *because the list wanted it*, over eleven
     * batches, rather than the list being assembled from what the engine already
     * had. See ROADMAP.md's "The Winota list".
     *
     * It replaced Warband (mono-red) on 2026-08-20, the same trade Blech made
     * for mono-green three days earlier: a real list in place of a colour pile.
     * The red cards are all still in the pool and still buildable in the deck
     * builder; what they are no longer is a pre-built deck.
     */
    name: "Winota, Joiner of Forces (Boros hatebears)",
    plan: "Tax and deny with cheap hate pieces, then attack with non-Humans so Winota drags free Humans off the top of the library.",
    deck: WINOTA_DECK,
  },
  {
    name: "Radiant Ranks (mono-white)",
    plan: "Flood the board with small creatures and tokens, then pump the whole team with Glorious Anthem.",
    deck: build("agent-phil-coulson", WHITE_NONLANDS, "plains"),
  },
  {
    /*
     * The first archetype here that is a real deck rather than a colour.
     *
     * The three colour piles beside it are generated - a commander, a pile of
     * cards the DSL can express, and basics to fill - so they have no mana base
     * and no plan beyond their colour. This one is somebody's actual list, transcribed card for
     * card, and it lives in cardLab.ts because the lab has walked it since it
     * was built. Named after its commander because that is what people call it.
     *
     * It replaced Overgrowth (mono-green) on 2026-08-17. The green cards are all
     * still in the pool and still buildable in the deck builder; what they are no
     * longer is a pre-built deck.
     */
    name: "Blech, Loafing Pest",
    plan: "Trade small creatures for cards and life: Pest tokens, sacrifice payoffs, and unconditional removal for anything that gets past them.",
    deck: BLECH_DECK,
  },
  {
    name: "Gravebound (mono-black)",
    plan: "Answer anything that matters with unconditional removal, then win with deathtouch and lifelink attrition.",
    deck: build("grendel-spawn-of-knull", BLACK_NONLANDS, "swamp"),
  },
  {
    name: "Tidewall (mono-blue)",
    plan: "Counter anything that matters, block what resolves anyway, draw cards, and win in the air.",
    deck: build("caelorna-coral-tyrant", BLUE_NONLANDS, "island"),
  },
  {
    // The hand-built Sultai deck - every non-basic card the engine represents
    // exactly. Selectable in the client with ?deck=felix.
    name: "Felix Five-Boots (Sultai)",
    plan: "Grind card advantage behind counters and removal, then close with Felix's doubled combat triggers or a Twenty-Toed Toad / Laboratory Maniac win.",
    deck: FELIX_DECK,
  },
  {
    // The Jund chaos deck, grown list-first over eleven batches - every one of
    // its 100 cards implemented because the list wanted it. Selectable with
    // ?deck=winter.
    name: "Winter, Misanthropic Guide (Jund chaos)",
    plan: "Flood everyone with cards and symmetrical value, punish the draws with Winter's delirium hand-size squeeze and the draw-matters pieces, then reset the board with a group wipe or Warp World.",
    deck: WINTER_DECK,
  },
  {
    // The Phelia, Exuberant Shepherd mono-white flicker/control deck, grown
    // list-first over 26 batches - every one of its cards implemented because
    // the list wanted it. The paper list was 103; three cards (Jeong Jeong's
    // Deserters, Null Elemental Blast, Appa) were cut to reach 100, and remain
    // in the pool as buildable fixtures. Selectable with ?deck=supremacy.
    name: "Supremacy (Phelia, mono-white flicker)",
    plan: "Answer threats with exile removal, blink your own creatures for repeated enter-the-battlefield value, tax and deny with cheap white hate, and grind ahead on card advantage behind Phelia's flicker engine.",
    deck: SUPREMACY_DECK,
  },
];

export function archetypeByName(name: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.name === name);
}

/** Picks an archetype at random - what the bot uses when no deck is specified. */
export function randomArchetype(): Archetype {
  return ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]!;
}
