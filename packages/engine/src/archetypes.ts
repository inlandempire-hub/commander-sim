import type { DeckList } from "./commander.js";
import { BLECH_DECK } from "./cardLab.js";

/**
 * Pre-built archetype decks, one per colour, for the bot to pilot and for
 * humans to play against (see ROADMAP.md Phase 4).
 *
 * Every card is a real Magic card the engine represents *exactly* - the
 * mono-black and mono-red pools were generated straight from Scryfall by
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

/** Mono-red aggro: cheap, fast, and happy to trade - the deck most likely to just kill you. */
const RED_NONLANDS = [
  "crimson-kobolds",
  "kobolds-of-kher-keep",
  "mountain-bandit",
  "capital-guard",
  "goblin-trailblazer",
  "roc-hunter",
  // Red's share of first strike, replacing four vanilla bodies.
  "goblin-striker",
  "sabretooth-tiger",
  "lightning-hounds",
  "viashino-spearhunter",
  "halberdier",
  "anaba-bodyguard",
  "goblin-berserker",
  "twinscroll-shaman",
  "balduvian-barbarians",
  "boggart-brute",
  "fearless-halberdier",
  "frenzied-raptor",
  "goblin-hero",
  // Red land destruction, plus burn that a counterspell cannot answer.
  "stone-rain",
  "volcanic-upheaval",
  "shatter",
  "inescapable-blaze",
  "hulking-bugbear",
  "nimble-birdsticker",
  "pyromantic-pilgrim",
  "raging-cougar",
  "wall-of-granite",
  "wild-colos",
  "barbarian-horde",
  "cobblebrute",
  "dragon-moose",
  "hulking-devil",
  "komodo-rhino",
  "lightning-elemental",
  "monster-mashup",
  "ogre-warrior",
  "raging-minotaur",
  "shatterskull-giant",
  "talruum-minotaur",
  "vulshok-berserker",
  "charging-monstrosaur",
  "fire-elemental",
  "gerrards-irregulars",
  "obsidian-giant",
  "quaketusk-boar",
  "renegade-troops",
  "shatterskull-recruit",
  "flameborn-viron",
  "volcanic-dragon",
  // Burn: reach to finish a game the creatures couldn't, and removal that
  // doubles as damage to the face.
  "lightning-bolt",
  "shock",
  "tarfire",
  "searing-spear",
  "lightning-strike",
  "volcanic-hammer",
  "open-fire",
  "flame-lash",
  "lightning-blast",
  "explosive-impact",
  "brute-force",
  "infuriate",];

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
    name: "Radiant Ranks (mono-white)",
    plan: "Flood the board with small creatures and tokens, then pump the whole team with Glorious Anthem.",
    deck: build("agent-phil-coulson", WHITE_NONLANDS, "plains"),
  },
  {
    /*
     * The first archetype here that is a real deck rather than a colour.
     *
     * The other five are generated - a commander, a pile of cards the DSL can
     * express, and basics to fill - so they have no mana base and no plan beyond
     * their colour. This one is somebody's actual list, transcribed card for
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
    name: "Warband (mono-red)",
    plan: "Cheap aggressive creatures backed by burn, closing behind a hasty Rorix Bladewing.",
    deck: build("rorix-bladewing", RED_NONLANDS, "mountain"),
  },
  {
    name: "Tidewall (mono-blue)",
    plan: "Counter anything that matters, block what resolves anyway, draw cards, and win in the air.",
    deck: build("caelorna-coral-tyrant", BLUE_NONLANDS, "island"),
  },
];

export function archetypeByName(name: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.name === name);
}

/** Picks an archetype at random - what the bot uses when no deck is specified. */
export function randomArchetype(): Archetype {
  return ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]!;
}
