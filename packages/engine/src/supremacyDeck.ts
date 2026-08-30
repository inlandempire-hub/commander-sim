import type { DeckList } from "./commander.js";

/**
 * Supremacy - the Phelia, Exuberant Shepherd mono-white deck, the seventh
 * pre-built archetype. Grown list-first like Winota and Winter: every one of its
 * cards was implemented because the decklist wanted it, each transcribed exactly
 * from the Scryfall bulk data. See tools/scryfall-report/decks/supremacy.txt.
 *
 * The full paper list was 103 cards; Jeong Jeong's Deserters, Null Elemental
 * Blast and Appa, Steadfast Guardian were cut to land at 100 (commander + 99).
 * Those three are still implemented as fixtures - they live in the pool and are
 * buildable in the deck builder - but are not in this pre-built list.
 */
export const SUPREMACY_DECK: DeckList = {
  commanderId: "phelia-exuberant-shepherd",
  libraryIds: [
    "pacifism", "ossification", "authority-of-the-consuls", "cathar-commando", "helpful-hunter",
    "inspiring-overseer", "ambitious-farmhand", "elspeth-storm-slayer", "mentor-of-the-meek",
    "banishing-light", "path-to-exile", "swords-to-plowshares", "elesh-norn-mother-of-machines",
    "makeshift-binding", "cavern-of-souls", "dimensional-exile", "rescuer-chwinga", "chrome-mox",
    "recruiter-of-the-guard", "scouting-hawk", "restoration-angel", "prayer-of-binding", "the-one-ring",
    "roaming-throne", "library-of-alexandria", "fumigate", "thorins-last-stand", "disruptor-flute",
    "touch-the-spirit-realm", "thopter-arrest", "thraben-inspector", "witch-enchanter", "novice-inspector",
    "spirited-companion", "thalia-guardian-of-thraben", "cloudshift", "charming-prince",
    "overlord-of-the-mistmoors", "armageddon", "mother-of-runes", "starfield-shepherd", "deafening-silence",
    "containment-priest", "enlightened-tutor", "portable-hole", "reprieve", "the-duke-rebel-sentry",
    "flickerwisp", "razorgrass-ambush", "oust", "seam-rip", "pearl-medallion", "parallax-wave",
    "guide-of-souls", "dog-umbra", "orims-chant", "giver-of-runes", "steel-seraph", "ephemerate",
    "solitude", "the-mountain-kings-return", "ranger-captain-of-eos", "winter-moon",
    ...Array.from({ length: 36 }, () => "plains"),
  ],
};
