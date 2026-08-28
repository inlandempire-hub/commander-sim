import type { LabScenario } from "./cardLab.js";

/**
 * One scenario per card in the Felix Five-Boots list - the board each card needs
 * to be put through its whole text, and the list of what to try on it.
 *
 * Read `checks` as instructions, not assertions. Each line is one clause of the
 * card: what to do, and what should happen if the engine has it right. A line
 * that fails is a bug to write down, except where `gaps` already says the engine
 * does not model that clause.
 *
 * Order follows the decklist (commander first). Two habits this Sultai deck asks
 * for, on top of the ones the other lists teach (reset is part of the method;
 * you control both seats):
 *
 * - **The counterspells need a spell to answer.** A board cannot open with
 *   something half-resolved on the stack, so the four counters (An Offer, Arcane
 *   Denial, Dispel, Flare of Denial) start uncastable and their checklists put a
 *   spell there first. Same for You Are Already Dead, which needs a creature that
 *   was dealt damage this turn.
 * - **The payoff is combat damage.** Felix herself, Necropolis Regent, the
 *   frogs and the Boots all read combat damage, so getting to declare-attackers
 *   and through to the damage step is the first step of those boards, not an
 *   afterthought - and Felix's own text doubles the triggers those hits cause.
 */
export const FELIX_LAB_SCENARIOS: LabScenario[] = [
  {
    cardId: "felix-five-boots",
    fromCommandZone: true,
    setup:
      "Felix in the command zone, with a creature that has a combat-damage trigger already out, so the doubling has something to double.",
    yours: [{ id: "shadowmage-infiltrator" }],
    checks: [
      "Cast Felix from the command zone for {2}{B}{G}{U}: a 5/4 with menace and ward {2}.",
      "Attack with Shadowmage Infiltrator and connect: its 'draw a card' trigger is caused by combat damage from a creature you control, so Felix triggers it an additional time - you draw twice.",
      "Reset. Attack with Felix herself and connect: she has no combat-damage trigger of her own, so nothing to double there - the doubling is about OTHER permanents' triggers.",
      "Target Felix with a {1} removal spell: ward {2} taxes it, and menace means she needs two blockers.",
    ],
  },
  {
    cardId: "an-offer-you-cant-refuse",
    setup: "A noncreature spell of Salty Mike's to counter.",
    theirHand: ["sol-ring"],
    uncastableOnOpen:
      "An Offer counters a noncreature spell, and a board cannot open with one already on the stack. Have Salty Mike cast Sol Ring first, then answer it.",
    checks: [
      "With Sol Ring on the stack, cast An Offer for {U}: it is countered.",
      "Its controller creates two Treasure tokens - the 'refusal' the card is named for.",
      "Reset with a creature spell on the stack: not a legal target - it is noncreature only.",
    ],
  },
  {
    cardId: "arbor-elf",
    setup: "A Forest of your own to untap, tapped so the untap is visible.",
    yours: [{ id: "forest", tapped: true }],
    checks: [
      "Cast Arbor Elf for {G}: a 1/1.",
      "Tap Arbor Elf: untap target Forest. The tapped Forest comes back up - so it nets mana with any Forest, not just a basic.",
    ],
  },
  {
    cardId: "arcane-denial",
    setup: "A spell of Salty Mike's on the stack to counter.",
    theirHand: ["grizzly-bears"],
    uncastableOnOpen:
      "Arcane Denial counters a spell, and no spell can be on the stack as a board opens. Have Salty Mike cast Grizzly Bears first.",
    checks: [
      "With a spell on the stack, cast Arcane Denial for {1}{U}: it is countered.",
      "Its controller may draw up to two cards at the next upkeep - the compensation clause.",
      "You draw a card at the next upkeep as well.",
    ],
  },
  {
    cardId: "arcane-signet",
    setup: "Nothing but the artifact - its mana follows your commander's identity.",
    checks: [
      "Cast Arcane Signet for {2}.",
      "Tap it for {B}, {G} or {U} - Felix's identity - but not {R} or {W}.",
    ],
  },
  {
    cardId: "baleful-strix",
    setup: "Nothing but the creature - a cantrip body.",
    checks: [
      "Cast Baleful Strix for {U}{B}: a 1/1 with flying and deathtouch.",
      "On entry, draw a card.",
    ],
  },
  {
    cardId: "blasphemous-edict",
    setup: "Creatures on both sides so the edict has something to take, plus a crowd for the alternative cost to key off.",
    yours: [{ id: "baleful-strix" }],
    theirs: [{ id: "grizzly-bears" }, { id: "silvercoat-lion" }],
    checks: [
      "Cast Blasphemous Edict for {3}{B}{B}: each player sacrifices thirteen creatures of their choice - here, everything, since nobody has thirteen.",
      "The alternative cost is {B} if there are thirteen or more creatures on the battlefield - not the case here, so it costs full.",
    ],
    gaps: ["Each player's sacrifice choice is resolved by the engine."],
  },
  {
    cardId: "bojuka-bog",
    setup: "A graveyard for the entry trigger to exile.",
    theirGraveyard: ["grizzly-bears", "silvercoat-lion"],
    checks: [
      "Play Bojuka Bog: it enters tapped, and on entry exiles target player's graveyard - wipe Salty Mike's.",
      "Tap it for {B}.",
    ],
  },
  {
    cardId: "brainstorm",
    setup: "A stocked library and hand so the draw-three-put-back has cards to move.",
    yourHand: ["swamp", "island"],
    checks: [
      "Cast Brainstorm for {U}: draw three, then put two cards from your hand on top of your library in any order.",
      "It is card selection, not advantage - your hand size is unchanged after it resolves.",
    ],
    gaps: ["The two cards put back are chosen by the engine rather than by a prompt."],
  },
  {
    cardId: "culling-ritual",
    setup: "A spread of cheap nonland permanents on both sides, since it hits everything of mana value 2 or less and pays you for each.",
    yours: [{ id: "arbor-elf" }],
    theirs: [{ id: "grizzly-bears" }, { id: "sol-ring" }, { id: "high-noon" }],
    checks: [
      "Cast Culling Ritual for {2}{B}{G}: destroy each nonland permanent with mana value 2 or less - both sides, yours included.",
      "Add {B} or {G} for each permanent destroyed - a burst of mana off the wipe.",
    ],
  },
  {
    cardId: "cultivate",
    setup: "Nothing but the spell.",
    checks: [
      "Cast Cultivate for {2}{G}: search for up to two basic lands, one onto the battlefield tapped and one to hand.",
    ],
  },
  {
    cardId: "death-begets-life",
    setup: "Creatures and an enchantment on both sides, since the card destroys both and draws you a card per permanent.",
    yours: [{ id: "baleful-strix" }, { id: "high-noon" }],
    theirs: [{ id: "grizzly-bears" }, { id: "silvercoat-lion" }],
    checks: [
      "Cast Death Begets Life for {5}{B}{G}{U}: destroy all creatures and enchantments.",
      "Draw a card for each permanent destroyed this way - count the board first, that many cards.",
    ],
  },
  {
    cardId: "demonic-bargain",
    setup: "A deep library, since it exiles the top thirteen before you tutor.",
    checks: [
      "Cast Demonic Bargain for {2}{B}: exile the top thirteen cards, then search your library for a card and put it into your hand.",
      "The thirteen are exiled, not milled - they do not feed the graveyard.",
    ],
    gaps: ["The tutor takes a reasonable card automatically rather than opening a full library picker."],
  },
  {
    cardId: "demonic-counsel",
    setup: "A graveyard of four card types so delirium upgrades the search, and a Demon in the library either way.",
    yourGraveyard: ["grizzly-bears", "brainstorm", "sol-ring", "swamp"],
    checks: [
      "Cast Demonic Counsel for {1}{B}: search for a Demon card and put it into your hand.",
      "With four card types in your graveyard, delirium instead lets you search for ANY card - the upgrade is the whole point.",
    ],
    gaps: ["The search takes a reasonable card automatically."],
  },
  {
    cardId: "dig-up",
    setup: "Nothing but the spell - it fetches a basic, or any card for its cleave cost.",
    extraMana: { generic: 1, b: 2 },
    checks: [
      "Cast Dig Up for {G}: search for a basic land, put it into your hand.",
      "Reset and pay the cleave cost {1}{B}{B}{G}: the bracketed words drop, so it searches for ANY card instead of a basic land.",
    ],
    gaps: ["The search takes a reasonable card automatically."],
  },
  {
    cardId: "dispel",
    setup: "An instant of Salty Mike's on the stack.",
    theirHand: ["brainstorm"],
    uncastableOnOpen:
      "Dispel counters an instant, and none can be on the stack as a board opens. Have Salty Mike cast an instant first.",
    checks: [
      "With an instant on the stack, cast Dispel for {U}: it is countered.",
      "Reset with a sorcery or creature spell on the stack: not a legal target - instants only.",
    ],
  },
  {
    cardId: "drown-in-the-loch",
    setup: "A creature to destroy whose mana value the target's graveyard can cover.",
    theirs: [{ id: "grizzly-bears" }],
    theirGraveyard: ["silvercoat-lion", "storm-crow", "runeclaw-bear"],
    checks: [
      "Cast Drown in the Loch for {U}{B}, choose the destroy mode: destroy a creature whose mana value is at most the number of cards in its controller's graveyard - Grizzly Bears (2) against a three-card yard.",
      "The counter mode answers a spell the same way, capped by the caster's graveyard - test it with a spell on the stack.",
    ],
  },
  {
    cardId: "emergent-ultimatum",
    setup: "A library with monocolored cards to find, since it fetches three of different names.",
    checks: [
      "Cast Emergent Ultimatum for {B}{B}{G}{G}{G}{U}{U}: search for up to three monocolored cards with different names and exile them.",
      "An opponent chooses one to shuffle back; you may cast the other two without paying their mana costs. Then Emergent Ultimatum is exiled.",
    ],
    gaps: ["Both the search and the opponent's choose-one are resolved by the engine."],
  },
  {
    cardId: "emet-selch-unsundered",
    setup: "A deep graveyard, since the back face's threshold and its 'play from graveyard' clause both read it.",
    yourGraveyard: ["grizzly-bears", "brainstorm", "sol-ring", "swamp", "silvercoat-lion", "storm-crow", "runeclaw-bear"],
    yourHand: ["island"],
    checks: [
      "Cast Emet-Selch for {1}{U}{B}: a 2/4 with vigilance. On entry, draw a card then discard a card.",
      "Attack with Emet-Selch: draw then discard again - the trigger is on enter OR attack.",
      "At your upkeep with fourteen or more cards in your graveyard, you may transform Emet-Selch into Hades, a 6/6 that lets you play cards from your graveyard and exiles cards that would go there.",
    ],
    gaps: ["The enter/attack loot keeps a safe discard automatically rather than prompting."],
  },
  {
    cardId: "fabricate",
    setup: "An artifact in the library to find.",
    checks: [
      "Cast Fabricate for {2}{U}: search for an artifact card and put it into your hand.",
    ],
    gaps: ["The search takes a reasonable artifact automatically."],
  },
  {
    cardId: "fallaji-archaeologist",
    setup: "A stocked library so the mill has a noncreature nonland card to offer.",
    yourLibraryTop: ["brainstorm", "sol-ring", "grizzly-bears"],
    checks: [
      "Cast Fallaji Archaeologist for {1}{U}: a 0/3, and on entry mill three.",
      "You may put a noncreature nonland card milled this way into your hand; if you don't, put a +1/+1 counter on it instead.",
    ],
    gaps: ["The keep-or-counter choice is resolved by the engine (it takes the card when one is eligible)."],
  },
  {
    cardId: "flare-of-denial",
    setup: "A spell to counter, and a blue creature you can sacrifice for the alternative cost.",
    yours: [{ id: "baleful-strix" }],
    theirHand: ["grizzly-bears"],
    uncastableOnOpen:
      "Flare of Denial counters a spell, and none can be on the stack as a board opens. Have Salty Mike cast a spell first.",
    checks: [
      "With a spell on the stack, cast Flare of Denial for {1}{U}{U}: it is countered.",
      "Reset and pay the alternative cost by sacrificing a nontoken blue creature (Baleful Strix) instead of the mana.",
    ],
  },
  {
    cardId: "flare-of-malice",
    setup: "Opposing creatures of differing mana value, since the edict takes the biggest, plus a black creature for the alternative cost.",
    yours: [{ id: "psychic-frog" }],
    theirs: [{ id: "grizzly-bears" }, { id: "necropolis-regent" }],
    checks: [
      "Cast Flare of Malice for {2}{B}{B}: each opponent sacrifices the creature or planeswalker with the greatest mana value among theirs - the Regent, not the Bear.",
      "Reset and pay the alternative cost by sacrificing a nontoken black creature (Psychic Frog) instead of the mana.",
    ],
  },
  {
    cardId: "foreboding-landscape",
    setup: "A card in hand for the cycling line.",
    yourHand: ["island"],
    checks: [
      "Play Foreboding Landscape; tap it for {C}.",
      "Activate {T}, Sacrifice it: search for a basic Swamp, Forest or Island, tapped.",
      "Reset and cycle it for {B}{G}{U}: discard it, draw a card.",
    ],
  },
  {
    cardId: "gitaxian-probe",
    setup: "Salty Mike holding cards to look at.",
    theirHand: ["grizzly-bears", "sol-ring"],
    checks: [
      "Cast Gitaxian Probe for {U/P} - pay {U} or 2 life. Look at target player's hand, then draw a card.",
      "Pay the Phyrexian pip with life on a reset: it casts for free off your life total.",
    ],
  },
  {
    cardId: "glen-elendras-answer",
    setup: "Spells and abilities of Salty Mike's to sweep - best walked with something on the stack.",
    theirHand: ["grizzly-bears"],
    checks: [
      "Cast Glen Elendra's Answer for {2}{U}{U}: it can't be countered.",
      "It counters all spells and abilities your opponents control and makes a 1/1 blue-black flying Faerie for each - stack two opposing spells first to see two Faeries.",
    ],
  },
  {
    cardId: "glissa-sunslayer",
    setup: "A board to attack into, plus an enchantment and a counter for the choose-one modes.",
    theirs: [{ id: "high-noon" }, { id: "grizzly-bears", counters: 2 }],
    checks: [
      "Cast Glissa Sunslayer for {1}{B}{G}: a 3/3 with first strike and deathtouch.",
      "Connect with her: choose one - draw a card and lose 1 life, destroy an enchantment (High Noon), or remove up to three counters from a permanent (the Bear's +1/+1s).",
    ],
  },
  {
    cardId: "growth-spiral",
    setup: "A land in hand to drop off the back of it.",
    yourHand: ["island"],
    checks: [
      "Cast Growth Spiral for {G}{U}: draw a card, then you may put a land from your hand onto the battlefield - the extra land drop is the ramp.",
    ],
  },
  {
    cardId: "halimar-depths",
    setup: "A stocked library so the entry look-at-top-three has cards to reorder.",
    yourLibraryTop: ["brainstorm", "sol-ring", "grizzly-bears"],
    checks: [
      "Play Halimar Depths: it enters tapped, and on entry you look at the top three and put them back in any order.",
      "Tap it for {U}.",
    ],
    gaps: ["The reorder is resolved by the engine rather than prompting."],
  },
  {
    cardId: "hinterland-harbor",
    setup: "A Forest out, the condition the tapped clause reads.",
    yours: [{ id: "forest" }],
    checks: [
      "You control a Forest, so Hinterland Harbor enters untapped.",
      "Tap it for {G} or {U}.",
      "Reset with neither Forest nor Island: it enters tapped.",
    ],
  },
  {
    cardId: "infectious-bite",
    setup: "A creature of yours to bite with and a creature of Salty Mike's to bite.",
    yours: [{ id: "necropolis-regent" }],
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Infectious Bite for {1}{G}: your creature deals damage equal to its power to a creature you don't control - the 6/5 Regent squashes the Bear.",
      "Each opponent gets a poison counter as well.",
    ],
  },
  {
    cardId: "laboratory-maniac",
    setup: "Just the creature - the win comes when your library runs out.",
    checks: [
      "Cast Laboratory Maniac for {2}{U}: a 2/2.",
      "While it is out, if you would draw from an empty library you win the game instead of losing - the alternate win this deck can assemble with Peer into the Abyss.",
    ],
  },
  {
    cardId: "lavaspur-boots",
    setup: "A creature of yours to equip it onto.",
    yours: [{ id: "psychic-frog" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Lavaspur Boots for {1}.",
      "Equip {1} to Psychic Frog: it gets +1/+0 and gains haste and ward {1}.",
    ],
  },
  {
    cardId: "lorien-revealed",
    setup: "Nothing but the spell - it either draws three or fetches an Island.",
    checks: [
      "Cast Lorien Revealed for {3}{U}{U}: draw three cards.",
      "Reset and use islandcycling {1} instead: discard it to search for an Island.",
    ],
  },
  {
    cardId: "mishras-bauble",
    setup: "Salty Mike with a library to peek at.",
    checks: [
      "Cast Mishra's Bauble for {0}.",
      "Activate {T}, Sacrifice it: look at the top card of target player's library, and draw a card at the next upkeep.",
    ],
  },
  {
    cardId: "mist-syndicate-naga",
    setup: "Just the creature - cast it the normal way here; ninjutsu is a combat trick for another board.",
    checks: [
      "Cast Mist-Syndicate Naga for {2}{U}: a 3/1.",
      "Connect with it: create a token copy of itself - and each copy that connects makes another, so it snowballs while unblocked.",
    ],
  },
  {
    cardId: "necropolis-regent",
    setup: "A board to attack into so the combat-damage trigger fires.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Necropolis Regent for {3}{B}{B}{B}: a 6/5 flyer.",
      "Whenever a creature you control deals combat damage to a player, put that many +1/+1 counters on it - connect with the Regent and it grows by 6.",
      "Under Felix this trigger is doubled, so the same hit stacks twelve counters.",
    ],
  },
  {
    cardId: "omniscience",
    setup: "A hand of spells to cast for free once it lands.",
    yourHand: ["necropolis-regent", "peer-into-the-abyss"],
    checks: [
      "Cast Omniscience for {7}{U}{U}{U}.",
      "Now cast spells from your hand without paying their mana costs - drop the Regent and Peer into the Abyss for nothing.",
    ],
  },
  {
    cardId: "opulent-palace",
    setup: "Nothing but the land.",
    checks: [
      "Play Opulent Palace: it enters tapped.",
      "Tap it for {B}, {G} or {U} - a Sultai tri-land.",
    ],
  },
  {
    cardId: "peer-into-the-abyss",
    setup: "A deep library, since the target draws half of it.",
    checks: [
      "Cast Peer into the Abyss for {4}{B}{B}{B}: target player draws cards equal to half their library and loses half their life, rounding up.",
      "Point it at yourself with Laboratory Maniac out to set up the empty-library win, or at an opponent to gut their life total.",
    ],
  },
  {
    cardId: "ponder",
    setup: "A stocked library to arrange.",
    yourLibraryTop: ["brainstorm", "sol-ring", "grizzly-bears"],
    checks: [
      "Cast Ponder for {U}: look at the top three, put them back in any order, you may shuffle, then draw a card.",
    ],
    gaps: ["The reorder and the shuffle choice are resolved by the engine."],
  },
  {
    cardId: "prologue-to-phyresis",
    setup: "Salty Mike present to poison - the card needs no target.",
    checks: [
      "Cast Prologue to Phyresis for {1}{U}: each opponent gets a poison counter, and you draw a card.",
    ],
  },
  {
    cardId: "propaganda",
    setup: "Just the enchantment - it taxes attacks against you.",
    checks: [
      "Cast Propaganda for {2}{U}.",
      "Creatures can't attack you unless their controller pays {2} for each attacker - drive Salty Mike into a combat and watch the tax.",
    ],
  },
  {
    cardId: "psychic-frog",
    setup: "A card in hand for the discard pump, and cards in the graveyard for the flying line.",
    yourHand: ["island"],
    yourGraveyard: ["brainstorm", "sol-ring", "grizzly-bears"],
    checks: [
      "Cast Psychic Frog for {U}{B}: a 1/2.",
      "Discard a card: put a +1/+1 counter on it.",
      "Exile three cards from your graveyard: it gains flying until end of turn.",
      "Connect with it: draw a card - and Felix doubles that to two.",
    ],
  },
  {
    cardId: "quilled-greatwurm",
    setup: "A board to attack into, and counters on your creatures for the graveyard-cast cost later.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Quilled Greatwurm for {4}{G}{G}: a 7/7 with trample.",
      "Deal combat damage on your turn with a creature: put that many +1/+1 counters on it (it must survive).",
      "From the graveyard, you may cast it by removing six counters from among your creatures in addition to its cost.",
    ],
  },
  {
    cardId: "radstorm",
    setup: "Prior spells this turn for storm to copy, and counters or players to proliferate.",
    yours: [{ id: "grizzly-bears", counters: 1 }],
    yourHand: ["ponder", "brainstorm"],
    checks: [
      "Cast a cheap spell or two first, then Radstorm for {3}{U}: storm copies it once per spell cast before it this turn.",
      "Each copy (and the original) proliferates - add a counter to the +1/+1 on your Bear and a poison counter on a poisoned opponent.",
    ],
    gaps: ["Storm copies and the proliferate choices are resolved by the engine."],
  },
  {
    cardId: "rampant-frogantua",
    setup: "A board to attack into. The +10/+10 clause needs a player to have lost, which is not the case here.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Rampant Frogantua for {2}{G}: a 3/3 with trample.",
      "Connect with it: you may mill that many, then put any land cards among them onto the battlefield tapped.",
      "It gets +10/+10 for each player who has lost the game - zero here, so it stays 3/3 until someone dies.",
    ],
  },
  {
    cardId: "reliquary-tower",
    setup: "Nothing but the land - it lifts your hand-size cap.",
    checks: [
      "Play Reliquary Tower: you now have no maximum hand size - relevant against Winter's squeeze in a real game.",
      "Tap it for {C}.",
    ],
  },
  {
    cardId: "revel-in-riches",
    setup: "A creature of Salty Mike's to kill for a Treasure.",
    theirs: [{ id: "grizzly-bears" }],
    yourHand: ["you-are-already-dead"],
    checks: [
      "Cast Revel in Riches for {4}{B}.",
      "Whenever an opponent's creature dies, make a Treasure - kill the Bear and confirm a Treasure appears.",
      "At your upkeep, if you control ten or more Treasures, you win the game.",
    ],
  },
  {
    cardId: "shadowmage-infiltrator",
    setup: "A board to attack into - it is unblockable to most decks and draws on connect.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Shadowmage Infiltrator for {1}{U}{B}: a 1/3 with fear.",
      "Fear means only artifact and/or black creatures can block it - the Bear can't.",
      "Connect: you may draw a card - and Felix doubles it.",
    ],
  },
  {
    cardId: "silent-hallcreeper",
    setup: "A creature of yours to copy for the third mode, and a board to attack into.",
    yours: [{ id: "necropolis-regent" }],
    checks: [
      "Cast Silent Hallcreeper for {1}{U}: a 1/1 that can't be blocked.",
      "Connect: choose one not chosen - two +1/+1 counters, draw a card, or become a copy of another creature you control (the Regent).",
    ],
  },
  {
    cardId: "starwinder",
    setup: "A board to attack into - cast it normally here; warp is a tempo line for another board.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Starwinder for {5}{U}{U}: a 7/7.",
      "Whenever a creature you control connects, you may draw that many cards - connect with Starwinder for seven, doubled by Felix to fourteen.",
    ],
  },
  {
    cardId: "step-through",
    setup: "Two creatures to bounce - the spell targets two.",
    yours: [{ id: "baleful-strix" }],
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Step Through for {3}{U}{U}: return two target creatures to their owners' hands - your Strix (to re-trigger its draw) and their Bear.",
      "Reset and use wizardcycling {2}: discard it to search for a Wizard card.",
    ],
  },
  {
    cardId: "swiftfoot-boots",
    setup: "A creature of yours to equip it onto.",
    yours: [{ id: "necropolis-regent" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Swiftfoot Boots for {2}.",
      "Equip {1}: the creature gains hexproof and haste - protection for your commander or a fresh threat.",
    ],
  },
  {
    cardId: "sword-of-wealth-and-power",
    setup: "A creature to equip and a board to attack into.",
    yours: [{ id: "psychic-frog" }],
    theirs: [{ id: "grizzly-bears" }],
    extraMana: { generic: 2 },
    checks: [
      "Cast Sword of Wealth and Power for {3}.",
      "Equip {2}: +2/+2 and protection from instants and sorceries.",
      "Connect with the equipped creature: make a Treasure, and your next instant or sorcery this turn is copied.",
    ],
  },
  {
    cardId: "temple-of-deceit",
    setup: "A stocked library for the entry scry.",
    yourLibraryTop: ["grizzly-bears"],
    checks: [
      "Play Temple of Deceit: it enters tapped, and on entry scry 1.",
      "Tap it for {U} or {B}.",
    ],
    gaps: ["The scry keep-or-bottom choice is resolved by the engine."],
  },
  {
    cardId: "temple-of-malady",
    setup: "A stocked library for the entry scry.",
    yourLibraryTop: ["grizzly-bears"],
    checks: [
      "Play Temple of Malady: it enters tapped, and on entry scry 1.",
      "Tap it for {B} or {G}.",
    ],
    gaps: ["The scry keep-or-bottom choice is resolved by the engine."],
  },
  {
    cardId: "thundertrap-trainer",
    setup: "A stocked library so the look-at-top-four has a noncreature nonland card to reveal.",
    yourLibraryTop: ["brainstorm", "grizzly-bears", "sol-ring", "island"],
    checks: [
      "Cast Thundertrap Trainer for {1}{U}: a 1/2, and on entry look at the top four - you may reveal a noncreature nonland card and take it, the rest to the bottom randomly.",
      "Offspring {4}: pay the extra as you cast it to get a 1/1 token copy on entry.",
    ],
    gaps: ["The reveal-and-take is resolved by the engine."],
  },
  {
    cardId: "time-stretch",
    setup: "A target player - the spell needs no board.",
    checks: [
      "Cast Time Stretch for {8}{U}{U}: target player takes two extra turns after this one.",
      "Point it at yourself and confirm two extra turns are queued.",
    ],
  },
  {
    cardId: "trailblazers-boots",
    setup: "A creature to equip, and a nonbasic land of Salty Mike's for the landwalk to read.",
    yours: [{ id: "psychic-frog" }],
    theirs: [{ id: "command-tower" }],
    extraMana: { generic: 2 },
    checks: [
      "Cast Trailblazer's Boots for {2}.",
      "Equip {2}: the creature has nonbasic landwalk - unblockable while Salty Mike controls a nonbasic land like Command Tower.",
    ],
  },
  {
    cardId: "traverse-the-ulvenwald",
    setup: "A graveyard of four card types so delirium upgrades the search.",
    yourGraveyard: ["grizzly-bears", "brainstorm", "sol-ring", "swamp"],
    checks: [
      "Cast Traverse the Ulvenwald for {G}: search for a basic land, put it into your hand.",
      "With delirium on (four card types in your graveyard), it instead searches for a creature or land card - the upgrade.",
    ],
    gaps: ["The search takes a reasonable card automatically."],
  },
  {
    cardId: "twenty-toed-toad",
    setup: "Attackers to swing alongside it, since two of its clauses read attacking with two or more creatures.",
    yours: [{ id: "psychic-frog" }],
    checks: [
      "Cast Twenty-Toed Toad for {3}{U}: a 3/3, and your maximum hand size becomes twenty.",
      "Attack with two or more creatures: put a +1/+1 counter on the Toad and draw a card.",
      "Whenever it attacks, you win if it has twenty or more counters or you hold twenty or more cards - the deck's grindy alt-win.",
    ],
  },
  {
    cardId: "waterlogged-teachings",
    setup: "An instant in the library to find - the tail keeps one there.",
    checks: [
      "Cast Waterlogged Teachings for {3}{U/B}: search for an instant card or a card with flash and put it into your hand.",
    ],
    gaps: ["The search takes a reasonable instant automatically."],
  },
  {
    cardId: "windfall",
    setup: "Hands on both sides so the wheel has something to spin.",
    yourHand: ["island", "swamp"],
    theirHand: ["grizzly-bears", "silvercoat-lion", "storm-crow"],
    checks: [
      "Cast Windfall for {2}{U}: each player discards their hand, then draws equal to the most any player discarded - here, Salty Mike's three.",
    ],
  },
  {
    cardId: "winged-boots",
    setup: "A creature of yours to equip it onto.",
    yours: [{ id: "necropolis-regent" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Winged Boots for {1}{U}.",
      "Equip {1}: the creature gains flying and ward {4} - hard to answer, and now evasive.",
    ],
  },
  {
    cardId: "you-are-already-dead",
    setup: "A creature that has been dealt damage this turn, since that is the only thing it can destroy.",
    theirs: [{ id: "grizzly-bears" }],
    uncastableOnOpen:
      "You Are Already Dead can only destroy a creature that was dealt damage this turn, and a board opens with nothing having been in combat. Ping or fight a creature first, then cast it.",
    checks: [
      "After a creature has taken damage this turn, cast You Are Already Dead for {B}: destroy it, and draw a card.",
      "A creature that has taken no damage is not a legal target.",
    ],
  },
  {
    cardId: "zephyr-boots",
    setup: "A creature to equip and a board to attack into.",
    yours: [{ id: "psychic-frog" }],
    theirs: [{ id: "grizzly-bears" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Zephyr Boots for {1}.",
      "Equip {2}: the creature gains flying.",
      "Connect with the equipped creature: draw a card, then discard a card.",
    ],
  },
  {
    cardId: "forest",
    setup: "Nothing but the land - the green source.",
    checks: ["Play Forest untapped.", "Tap it for {G}."],
  },
  {
    cardId: "island",
    setup: "Nothing but the land - the blue source.",
    checks: ["Play Island untapped.", "Tap it for {U}."],
  },
  {
    cardId: "swamp",
    setup: "Nothing but the land - the black source.",
    checks: ["Play Swamp untapped.", "Tap it for {B}."],
  },
];
