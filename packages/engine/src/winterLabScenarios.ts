import type { LabScenario } from "./cardLab.js";

/**
 * One scenario per card in the Winter, Misanthropic Guide list - the board each
 * card needs to be put through its whole text, and the list of what to try.
 *
 * Read `checks` as instructions, not assertions. Each line is one clause of the
 * card: what to do, and what should happen if the engine has it right. A line
 * that fails is a bug to write down, except where `gaps` already says the engine
 * does not model that clause.
 *
 * Order follows the decklist (commander first, then the list's own order) so
 * walking the lab front to back walks the deck.
 *
 * Three habits this deck asks for, on top of the ones Blech and Winota teach
 * (reset is part of the method; you control both seats):
 *
 * - **A lot of this deck asks a rival a question.** Rootweaver, Tempt with
 *   Discovery, Over the Top, Warp World, Thieves' Auction and the group searches
 *   all hand every player a choice. The engine makes those choices for the other
 *   seats itself - the same documented posture searchLibrary and the edicts take
 *   elsewhere - so you will not be prompted for Salty Mike. Each board that leans
 *   on this says so in `gaps`.
 * - **The graveyard is a resource here, not a bin.** Delirium (four card types),
 *   descend (permanent cards), and a dozen recursion effects all read it, so many
 *   boards open with a stocked graveyard and the clause under test is what it is
 *   worth.
 * - **Winter's own squeeze is a static, cross-player thing** - each opponent's
 *   maximum hand size, not yours - so testing it means driving to a cleanup step
 *   with a rival holding cards, not reading it off the board.
 */
export const WINTER_LAB_SCENARIOS: LabScenario[] = [
  {
    cardId: "winter-misanthropic-guide",
    fromCommandZone: true,
    setup:
      "Winter in the command zone. A stocked graveyard of four different card types waits so the delirium clause has something to bite on, and Salty Mike holds a full hand for it to shrink.",
    yourGraveyard: ["sakura-tribe-elder", "rampant-growth", "howling-mine", "swamp"],
    theirHand: ["grizzly-bears", "silvercoat-lion", "storm-crow", "runeclaw-bear", "elite-vanguard", "sol-ring", "high-noon"],
    checks: [
      "Cast Winter from the command zone for {1}{B}{R}{G}: a 3/4 Human Warlock with ward {2}.",
      "Target Winter with a {1} removal spell and let it resolve to nothing unless you also pay {2}: ward is the tax.",
      "Advance to your upkeep: each player draws two cards, you first. It is 'each player', not just you.",
      "Your graveyard has creature, sorcery, artifact and land - four card types - so delirium is on. Salty Mike's maximum hand size is seven minus four, i.e. three: pass to his cleanup and watch him discard down to three.",
      "Exile one type out of your graveyard so only three remain: delirium switches off and his maximum hand size is seven again.",
    ],
    gaps: ["The hand-size squeeze is a maximum, enforced at cleanup - it does not make a player discard the instant it turns on."],
  },
  {
    cardId: "aftermath-analyst",
    setup: "Lands already in the graveyard for the sacrifice ability to haul back, plus the mana for it.",
    yourGraveyard: ["swamp", "forest", "mountain"],
    extraMana: { generic: 3, g: 1 },
    checks: [
      "Cast Aftermath Analyst for {1}{G}: a 1/3, and its enter trigger mills three.",
      "Activate {3}{G}, Sacrifice it: every land card in your graveyard returns to the battlefield tapped - the three you seeded plus whatever the mill added.",
    ],
  },
  {
    cardId: "arachnogenesis",
    setup:
      "You are being attacked, because both halves of the card measure the attackers: two of Salty Mike's creatures swinging at you.",
    theirs: [{ id: "grizzly-bears" }, { id: "silvercoat-lion" }],
    uncastableOnOpen:
      "Arachnogenesis wants creatures attacking you, and a board cannot open mid-combat with attackers already declared. Move to Salty Mike's combat and have him attack first.",
    checks: [
      "With two creatures attacking you, cast Arachnogenesis: two 1/2 green Spiders with reach - X equals the attackers.",
      "Combat damage step: the two attackers deal nothing. All combat damage from non-Spider creatures is prevented this turn.",
      "The Spiders themselves are not prevented - block with one and it deals its 1.",
    ],
  },
  {
    cardId: "baleful-mastery",
    setup: "A creature across the table to exile, so the spell has a legal target the moment it opens.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Baleful Mastery for its full {3}{B}: exile Grizzly Bears, and no opponent draws.",
      "Reset and take the {1}{B} alternative cost instead: Grizzly Bears is still exiled, but Salty Mike draws a card for the discount.",
      "Reset and aim it at a planeswalker: 'creature or planeswalker' - both are legal targets.",
    ],
  },
  {
    cardId: "blasphemous-act",
    setup: "A crowded board, because the whole card is that each creature makes it cheaper: creatures on both sides.",
    yours: [{ id: "sakura-tribe-elder" }, { id: "essence-warden" }],
    theirs: [{ id: "grizzly-bears" }, { id: "silvercoat-lion" }, { id: "runeclaw-bear" }],
    checks: [
      "Five creatures are out, so Blasphemous Act costs {8}{R} minus 5 - it lights up for {3}{R}. Cast it.",
      "It deals 13 to each creature: everything with 13 or less toughness dies, both sides, yours included.",
    ],
  },
  {
    cardId: "bramble-sovereign",
    setup: "A nontoken creature in hand to cast under it, and the {1}{G} spare to pay the copy trigger.",
    yourHand: ["grizzly-bears"],
    extraMana: { generic: 1, g: 1 },
    checks: [
      "Cast Bramble Sovereign for {2}{G}{G}: a 4/4.",
      "Cast Grizzly Bears: Bramble Sovereign's trigger offers to pay {1}{G}. Pay it and a token copy of Grizzly Bears is created under your control.",
      "Decline the payment on a second creature: no copy. It is a 'may'.",
      "The trigger is 'another nontoken creature' - a token entering does not trigger it, so the copy does not chain.",
    ],
  },
  {
    cardId: "brasss-tunnel-grinder",
    setup:
      "Cards in hand to rummage on the way in, and a permanent card already sitting in the graveyard so you count as having descended this turn.",
    yourHand: ["swamp", "forest"],
    yourGraveyard: ["grizzly-bears"],
    checks: [
      "Cast Brass's Tunnel-Grinder for {2}{R}: on entry, discard any number of cards, then draw that many plus one. Discard the two lands and draw three.",
      "It has no bore counters yet. Put a permanent card into your graveyard this turn (descend), pass to your end step: a bore counter is added.",
      "Get it to three bore counters over three turns: at that end step the counters are removed and it transforms into Tecutlan, the Searing Rift - a land.",
      "Tap Tecutlan for {R} and spend that mana to cast a permanent spell: discover fires for that spell's mana value.",
    ],
    gaps: ["Discover picks and casts/exiles for you rather than prompting - the same auto-resolution searchLibrary uses."],
  },
  {
    cardId: "canyon-slough",
    setup: "Nothing but the land. A card in hand to cycle it away to instead.",
    yourHand: ["grizzly-bears"],
    checks: [
      "Play Canyon Slough: it enters tapped.",
      "Tap it for {B} or {R} - a Swamp Mountain dual.",
      "Reset. Instead of playing it, cycle it for {2}: discard it, draw a card.",
    ],
  },
  {
    cardId: "cavalier-of-flame",
    setup: "Cards in hand for the enter trigger's discard-and-draw, lands in the graveyard for the death trigger's count, and a team to pump.",
    yours: [{ id: "sakura-tribe-elder" }],
    yourHand: ["swamp", "mountain"],
    yourGraveyard: ["forest", "mountain", "swamp"],
    extraMana: { r: 1, generic: 1 },
    checks: [
      "Cast Cavalier of Flame for {2}{R}{R}{R}: a 6/5, and its enter trigger discards any number then draws that many. Pitch the two lands, draw two.",
      "Activate {1}{R}: your creatures get +1/+0 and haste until end of turn.",
      "Sacrifice or kill Cavalier: it deals X to each opponent and each planeswalker they control, X = land cards in your graveyard. Count the graveyard first.",
    ],
  },
  {
    cardId: "chainer-nightmare-adept",
    setup: "A creature already in your graveyard to cast, and a card in hand to discard for the cost.",
    yourGraveyard: ["grizzly-bears"],
    yourHand: ["swamp"],
    extraMana: { generic: 1, g: 1 },
    checks: [
      "Cast Chainer for {2}{B}{R}: a 3/2.",
      "Activate 'Discard a card': discard the Swamp, and you may cast a creature spell from your graveyard this turn. Cast Grizzly Bears from the graveyard.",
      "Because you did not cast it from your hand, Chainer's second ability gives it haste until your next turn.",
      "The discard ability is once each turn - it greys out after the first use.",
    ],
  },
  {
    cardId: "cinder-glade",
    setup: "Two basics already out, since that is the line the tapped clause turns on.",
    yours: [{ id: "mountain" }, { id: "forest" }],
    checks: [
      "You control two basic lands, so Cinder Glade enters untapped.",
      "Tap it for {R} or {G}.",
      "Reset with fewer than two basics out and play it: it enters tapped.",
    ],
  },
  {
    cardId: "command-tower",
    setup: "Nothing but the land - its mana is defined by your commander's identity, which is Jund.",
    checks: [
      "Play Command Tower untapped.",
      "Tap it for {B}, {R} or {G} - any colour in Winter's identity - but not {W} or {U}.",
    ],
  },
  {
    cardId: "demonic-covenant",
    setup: "A Demon of your own already out so the attack trigger has something to fire on.",
    yours: [{ id: "sangromancer" }],
    checks: [
      "Cast Demonic Covenant for {4}{B}{B}.",
      "At your end step it makes a 5/5 flying Demon and mills two. If the two milled cards share all their types, it is sacrificed.",
      "Attack a player with one or more Demons: you draw a card and lose 1 life - one trigger for the attack, not one per Demon.",
    ],
    gaps: ["Whether the two milled cards share all their types is down to what happens to be on top - it is not steerable from the board."],
  },
  {
    cardId: "descent-into-avernus",
    setup: "Just the enchantment. The counters accrue on your upkeeps, so the board is only the starting point.",
    checks: [
      "Cast Descent into Avernus for {2}{R}.",
      "First upkeep: two descent counters go on, then each player makes X Treasures and it deals X to each player, X = counters. X is 2.",
      "Second upkeep: two more counters, X is now 4 - each player gets four Treasures and takes 4. It escalates.",
    ],
  },
  {
    cardId: "drag-to-the-roots",
    setup:
      "A nonland permanent to destroy, and a graveyard of four card types so the delirium discount is live.",
    theirs: [{ id: "silvercoat-lion" }],
    yourGraveyard: ["grizzly-bears", "rampant-growth", "howling-mine", "swamp"],
    checks: [
      "Four card types are in your graveyard, so Drag to the Roots costs {2} less - it lights up for {B}{G}. Cast it, destroying Silvercoat Lion.",
      "Reset with three or fewer types and it costs the full {2}{B}{G}.",
    ],
  },
  {
    cardId: "dragonskull-summit",
    setup: "A Swamp already out, the condition the tapped clause reads.",
    yours: [{ id: "swamp" }],
    checks: [
      "You control a Swamp, so Dragonskull Summit enters untapped.",
      "Tap it for {B} or {R}.",
      "Reset with neither a Swamp nor a Mountain out: it enters tapped.",
    ],
  },
  {
    cardId: "druid-of-purification",
    setup: "Artifacts and enchantments you do not control for the group choice to point at.",
    theirs: [{ id: "sol-ring" }, { id: "high-noon" }],
    checks: [
      "Cast Druid of Purification for {3}{G}: a 2/3, and on entry each player may choose an artifact or enchantment you do not control.",
      "Everything chosen is destroyed - Sol Ring and High Noon both go.",
      "The chosen permanents must be ones you do not control: your own artifacts are safe.",
    ],
    gaps: ["Each player's choice is made by the engine - you are not prompted for Salty Mike's pick."],
  },
  {
    cardId: "elder-gargaroth",
    setup: "A board to attack into, so the attack mode of the choose-one can be walked.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Elder Gargaroth for {3}{G}{G}: a 6/6 with reach, vigilance and trample.",
      "Attack with it: choose one - make a 3/3 Beast, gain 3 life, or draw a card. Try each on a reset.",
      "It also triggers on block: on a later turn, block an attacker and the same menu appears.",
    ],
  },
  {
    cardId: "essence-warden",
    setup: "A creature in hand to drop after it, since the trigger is on another creature entering.",
    yourHand: ["grizzly-bears"],
    extraMana: { generic: 2 },
    checks: [
      "Cast Essence Warden for {G}: a 1/1.",
      "Cast Grizzly Bears: you gain 1 life. It is 'another creature', so the Warden entering did not gain you life.",
    ],
  },
  {
    cardId: "eternal-witness",
    setup: "A card in your graveyard worth buying back.",
    yourGraveyard: ["blasphemous-act"],
    checks: [
      "Cast Eternal Witness for {1}{G}{G}: a 2/1, and on entry you may return target card from your graveyard to your hand.",
      "Take Blasphemous Act back.",
      "The ability is a 'may' with a target - decline it on a reset and nothing returns.",
    ],
  },
  {
    cardId: "evolving-wilds",
    setup: "Nothing but the land.",
    checks: [
      "Play Evolving Wilds untapped.",
      "Activate {T}, Sacrifice it: search for a basic land, put it onto the battlefield tapped, shuffle.",
    ],
  },
  {
    cardId: "exotic-orchard",
    setup: "A land of Salty Mike's out, since Exotic Orchard reads what an opponent's lands make.",
    theirs: [{ id: "swamp" }],
    checks: [
      "Play Exotic Orchard.",
      "Salty Mike controls a Swamp, so Exotic Orchard can tap for {B}.",
      "Reset with no opponent lands and it makes nothing - the ability reads their board, not yours.",
    ],
  },
  {
    cardId: "exsanguinate",
    setup: "Just the spell and enough mana to spend on X. Salty Mike at 40 to drain.",
    extraMana: { generic: 4 },
    checks: [
      "Cast Exsanguinate for {X}{B}{B} with X chosen from what you can pay. Each opponent loses X life.",
      "You gain life equal to the total lost - one opponent, so equal to X.",
      "It is legal for X = 0: cast it that way and nothing happens, which is the floor of the picker.",
    ],
  },
  {
    cardId: "eyeblights-ending",
    setup: "A non-Elf creature to kill, because that is what the card restricts to.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Eyeblight's Ending for {2}{B}: destroy Grizzly Bears, a non-Elf.",
      "Reset with only an Elf across the table (Llanowar Elves): it is not a legal target.",
    ],
    theirHand: [],
  },
  {
    cardId: "farseek",
    setup: "Nothing but the spell - the point is what it can fetch.",
    checks: [
      "Cast Farseek for {1}{G}: search for a Plains, Island, Swamp or Mountain card and put it onto the battlefield tapped.",
      "A basic Forest is not a legal choice - the four land types are named, and Forest is not among them.",
    ],
  },
  {
    cardId: "gala-greeters",
    setup: "A creature in hand to trigger the alliance, and the mana to keep casting.",
    yourHand: ["grizzly-bears", "silvercoat-lion"],
    extraMana: { generic: 4 },
    checks: [
      "Cast Gala Greeters for {1}{G}: a 1/1.",
      "Cast a creature: choose one not chosen this turn - a +1/+1 counter on Gala Greeters, a tapped Treasure, or 2 life.",
      "Cast a second creature the same turn: the mode you already used is off the menu.",
    ],
  },
  {
    cardId: "gixian-puppeteer",
    setup:
      "A creature card of mana value 3 or less already in your graveyard for the death trigger to reanimate, plus a way to draw a second card.",
    yourGraveyard: ["grizzly-bears"],
    yourHand: ["howling-mine"],
    checks: [
      "Cast Gixian Puppeteer for {3}{B}: a 4/3.",
      "Draw your second card in a turn (the first is your draw step): each opponent loses 2 and you gain 2.",
      "Kill Gixian Puppeteer: return a creature card of mana value 3 or less from your graveyard to the battlefield - Grizzly Bears qualifies.",
    ],
  },
  {
    cardId: "grisly-salvage",
    setup: "Nothing but the spell - it reads the top five of your library.",
    checks: [
      "Cast Grisly Salvage for {B}{G}: reveal the top five, take one creature or land card to hand, the rest to the graveyard.",
      "The rest going to the graveyard is the point in this deck - it feeds delirium and descend.",
    ],
    gaps: ["The engine takes the first eligible card rather than prompting you to choose among the five."],
  },
  {
    cardId: "haunted-ridge",
    setup: "Two other lands already out, the tapped clause's condition.",
    yours: [{ id: "swamp" }, { id: "mountain" }],
    checks: [
      "You control two other lands, so Haunted Ridge enters untapped.",
      "Tap it for {B} or {R}.",
      "Reset with one land out: it enters tapped.",
    ],
  },
  {
    cardId: "haywire-mite",
    setup: "A noncreature artifact or enchantment across the table to eat, and the {G} for the ability.",
    theirs: [{ id: "sol-ring" }],
    extraMana: { g: 1 },
    checks: [
      "Cast Haywire Mite for {1}: a 1/1 artifact creature.",
      "Activate {G}, Sacrifice it: exile target noncreature artifact or noncreature enchantment - Sol Ring goes.",
      "Its death trigger gains you 2 life as it is sacrificed.",
    ],
  },
  {
    cardId: "healing-technique",
    setup: "A high-cost card in your graveyard, since the life you gain is its mana value.",
    yourGraveyard: ["blasphemous-act"],
    checks: [
      "Cast Healing Technique for {3}{G}: return target card from your graveyard to your hand and gain life equal to its mana value.",
      "Take Blasphemous Act (mana value 9): gain 9 life. Then Healing Technique is exiled, not put in the graveyard.",
      "Demonstrate: when you cast it you may copy it and choose an opponent to also copy it.",
    ],
    gaps: ["The demonstrate copy is resolved by the engine; you will not be asked to pick new targets for Salty Mike's copy."],
  },
  {
    cardId: "howling-mine",
    setup: "Just the artifact. The draw bonus lands on each player's draw step.",
    checks: [
      "Cast Howling Mine for {2}.",
      "At each player's draw step, if it is untapped, that player draws an extra card - you and Salty Mike both.",
      "It only helps while untapped - there is no way to tap it here, but note the 'if untapped' clause.",
    ],
  },
  {
    cardId: "karplusan-forest",
    setup: "Nothing but the land.",
    checks: [
      "Play Karplusan Forest untapped.",
      "Tap it for {C} and no life is lost.",
      "Tap it for {R} or {G} and it deals 1 damage to you.",
    ],
  },
  {
    cardId: "keen-duelist",
    setup: "Salty Mike with a stocked library so the reveal has something to hit.",
    theirLibraryTop: ["blasphemous-act"],
    checks: [
      "Cast Keen Duelist for {1}{B}: a 2/2.",
      "At your upkeep, you and target opponent each reveal the top card. You each lose life equal to the OTHER's revealed card's mana value, and each put your own card into your hand.",
      "So a big card on Salty Mike's top hurts you, and yours hurts him - the symmetry is the risk.",
    ],
  },
  {
    cardId: "liliana-deaths-majesty",
    setup: "A creature card in your graveyard for the -3, and non-Zombies on the board for the -7.",
    yours: [{ id: "sakura-tribe-elder" }],
    theirs: [{ id: "grizzly-bears" }],
    yourGraveyard: ["elder-gargaroth"],
    checks: [
      "Cast Liliana for {3}{B}{B}: 5 starting loyalty.",
      "+1: make a 2/2 Zombie and mill two.",
      "-3: return Elder Gargaroth from your graveyard to the battlefield - it is a black Zombie in addition to its other colours and types.",
      "-7: destroy all non-Zombie creatures. The Gargaroth you returned is a Zombie now, so it survives; your Snake and their Bear die.",
    ],
    gaps: ["The returned creature is granted the Zombie type (which the -7 reads); its added black colour is tracked but not layered onto other effects."],
  },
  {
    cardId: "llanowar-wastes",
    setup: "Nothing but the land.",
    checks: [
      "Play Llanowar Wastes untapped.",
      "Tap it for {C}, no life lost.",
      "Tap it for {B} or {G} and take 1 damage.",
    ],
  },
  {
    cardId: "mire-triton",
    setup: "Nothing but the creature - its whole payoff is on entry.",
    checks: [
      "Cast Mire Triton for {1}{B}: a 2/1 with deathtouch.",
      "On entry: mill two and gain 2 life.",
    ],
  },
  {
    cardId: "mortality-spear",
    setup: "A nonland permanent to destroy, and a way to have gained life this turn for the discount.",
    theirs: [{ id: "high-noon" }],
    yours: [{ id: "essence-warden" }],
    yourHand: ["essence-warden"],
    extraMana: { generic: 2 },
    checks: [
      "Cast the spare Essence Warden first to gain life via the one already out - now you have gained life this turn.",
      "Mortality Spear costs {2} less: cast it for {B}{G}, destroying High Noon - 'nonland permanent' covers an enchantment.",
      "Reset with no life gained and it costs the full {2}{B}{G}.",
    ],
  },
  {
    cardId: "noxious-gearhulk",
    setup: "A creature to destroy on entry, whose toughness you will gain as life.",
    theirs: [{ id: "elder-gargaroth" }],
    checks: [
      "Cast Noxious Gearhulk for {4}{B}{B}: a 5/4 with menace.",
      "On entry you may destroy another target creature: destroy the Gargaroth and gain life equal to its toughness (6).",
      "It is a 'may' - decline it on a reset and nothing dies.",
    ],
  },
  {
    cardId: "nyx-weaver",
    setup: "A card in your graveyard for the exile-return ability, and the mana to run it.",
    yourGraveyard: ["blasphemous-act"],
    extraMana: { generic: 1, b: 1, g: 1 },
    checks: [
      "Cast Nyx Weaver for {1}{B}{G}: a 2/3 reach enchantment creature.",
      "At your upkeep it mills two - self-mill toward delirium.",
      "Activate {1}{B}{G}, Exile Nyx Weaver: return target card from your graveyard to your hand.",
    ],
  },
  {
    cardId: "obscuring-haze",
    commanderInPlay: true,
    setup: "Winter on the battlefield so 'if you control a commander' is true, and opposing creatures whose damage there is to prevent.",
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "You control Winter, so you may cast Obscuring Haze without paying its mana cost.",
      "It prevents all damage this turn from creatures your opponents control - a one-sided fog.",
      "Reset with no commander in play: it costs its full {2}{G}.",
    ],
  },
  {
    cardId: "old-rutstein",
    setup: "Nothing but the creature - it mills on entry and each upkeep and branches on what it hits.",
    checks: [
      "Cast Old Rutstein for {1}{B}{G}: a 1/4, and on entry it mills a card.",
      "A land milled makes a Treasure; a creature milled makes a 1/1 Insect; a noncreature nonland milled makes a Blood token.",
      "It repeats at each upkeep.",
    ],
    gaps: ["Which token you get follows whatever is milled - it is not steerable from the board."],
  },
  {
    cardId: "osseous-sticktwister",
    setup: "A graveyard of four card types so delirium is on, and Salty Mike holding a card to be squeezed.",
    yourGraveyard: ["grizzly-bears", "rampant-growth", "howling-mine", "swamp"],
    theirHand: ["silvercoat-lion"],
    theirs: [{ id: "grizzly-bears" }],
    checks: [
      "Cast Osseous Sticktwister for {1}{B}: a 2/2 with lifelink.",
      "At your end step, with delirium on, each opponent must sacrifice a nonland permanent or discard a card.",
      "An opponent who does neither takes damage equal to Sticktwister's power - so it is a squeeze, not a guaranteed hit.",
    ],
    gaps: ["Salty Mike's sacrifice-or-discard choice is made by the engine."],
  },
  {
    cardId: "over-the-top",
    setup:
      "Nonland permanents on both sides, because each player reveals that many cards - and permanent cards stocked on top so there is something to hit.",
    yours: [{ id: "sakura-tribe-elder" }, { id: "essence-warden" }],
    yourLibraryTop: ["grizzly-bears", "sol-ring", "blasphemous-act"],
    checks: [
      "Cast Over the Top for {5}{R}{R}: each player reveals cards equal to their nonland permanents.",
      "Every permanent card revealed goes onto the battlefield; the rest go to the graveyard.",
      "You control two nonland permanents, so you reveal two - stack the top so you know what comes down.",
    ],
    gaps: ["Each player's reveal-and-drop is resolved by the engine for the other seats."],
  },
  {
    cardId: "oversold-cemetery",
    setup: "Four or more creature cards in your graveyard, the threshold the upkeep clause reads.",
    yourGraveyard: ["grizzly-bears", "silvercoat-lion", "runeclaw-bear", "sakura-tribe-elder"],
    checks: [
      "Cast Oversold Cemetery for {1}{B}.",
      "At your upkeep, with four or more creature cards in your graveyard, you may return a creature card from your graveyard to your hand.",
      "Drop below four creatures in the yard and the upkeep does nothing.",
    ],
  },
  {
    cardId: "overwhelming-remorse",
    setup: "A creature to exile, and creature cards in your graveyard to cheapen it.",
    theirs: [{ id: "elder-gargaroth" }],
    yourGraveyard: ["grizzly-bears", "silvercoat-lion"],
    checks: [
      "Two creature cards in your graveyard, so Overwhelming Remorse costs {2} less - {2}{B}. Cast it, exiling the Gargaroth.",
      "Reset with an empty graveyard and it costs the full {4}{B}.",
    ],
  },
  {
    cardId: "pendant-of-prosperity",
    setup: "Just the artifact - the twist is who it enters under.",
    extraMana: { generic: 2 },
    checks: [
      "Cast Pendant of Prosperity for {3}: it enters under an opponent's control, not yours.",
      "Its {2}, {T} ability draws its controller a card and lets them play a land, then draws the OWNER (you) a card and lets you play a land - a symmetric draw either way.",
    ],
  },
  {
    cardId: "pile-on",
    setup: "A creature to destroy, and creatures of your own to convoke with.",
    theirs: [{ id: "elder-gargaroth" }],
    yours: [{ id: "sakura-tribe-elder" }, { id: "essence-warden" }],
    checks: [
      "Cast Pile On for {3}{B}: destroy target creature or planeswalker, then surveil 2.",
      "Convoke: tap your creatures while casting to pay for {1} or a matching colour each - two creatures shave two off the cost.",
    ],
    gaps: ["Surveil keeps the safe ordering automatically rather than prompting you."],
  },
  {
    cardId: "pulse-of-murasa",
    setup: "A creature or land card in a graveyard to return.",
    yourGraveyard: ["grizzly-bears"],
    checks: [
      "Cast Pulse of Murasa for {2}{G}: return target creature or land card from a graveyard to its owner's hand, and gain 6 life.",
      "It reads 'a graveyard' - Salty Mike's yard is a legal source too.",
    ],
  },
  {
    cardId: "rakdos-charm",
    setup: "One legal target for each mode: a graveyard to exile, an artifact to destroy, and creatures for the last mode.",
    theirs: [{ id: "sol-ring" }, { id: "grizzly-bears" }],
    theirGraveyard: ["silvercoat-lion"],
    checks: [
      "Cast Rakdos Charm for {B}{R}, choose one.",
      "Mode 1: exile target player's graveyard - point at Salty Mike's.",
      "Mode 2: destroy target artifact - Sol Ring.",
      "Mode 3: each creature deals 1 to its controller - a symmetric ping across every creature out.",
    ],
  },
  {
    cardId: "rampant-growth",
    setup: "Nothing but the spell.",
    checks: [
      "Cast Rampant Growth for {1}{G}: search for a basic land, put it onto the battlefield tapped, shuffle.",
    ],
  },
  {
    cardId: "restless-cottage",
    setup: "The mana to animate it and a graveyard card to exile on its attack.",
    theirGraveyard: ["grizzly-bears"],
    extraMana: { generic: 2, b: 1, g: 1 },
    checks: [
      "Play Restless Cottage: it enters tapped.",
      "Tap it for {B} or {G}.",
      "Activate {2}{B}{G}: it becomes a 4/4 black-green Horror until end of turn, still a land.",
      "Attack with it: create a Food token and exile up to one card from a graveyard.",
    ],
  },
  {
    cardId: "restless-vents",
    setup: "The mana to animate it and a card in hand for the loot on attack.",
    yourHand: ["swamp"],
    extraMana: { generic: 1, b: 1, r: 1 },
    checks: [
      "Play Restless Vents: it enters tapped.",
      "Tap it for {B} or {R}.",
      "Activate {1}{B}{R}: it becomes a 2/3 black-red Insect with menace until end of turn, still a land.",
      "Attack with it: you may discard a card; if you do, draw a card.",
    ],
  },
  {
    cardId: "revitalizing-repast",
    setup: "A creature to buff - the instant puts a counter on it and hands it indestructible.",
    yours: [{ id: "sakura-tribe-elder" }],
    checks: [
      "Cast Revitalizing Repast for its {B/G} hybrid pip: put a +1/+1 counter on target creature and give it indestructible until end of turn.",
      "Point it at your Snake before a Blasphemous Act to see the indestructible save it.",
    ],
  },
  {
    cardId: "rites-of-flourishing",
    setup: "Just the enchantment - it changes every player's draw step and land drops.",
    checks: [
      "Cast Rites of Flourishing for {2}{G}.",
      "At each player's draw step, that player draws an extra card - symmetric.",
      "Each player may play an additional land each turn - play two lands this turn to confirm.",
    ],
  },
  {
    cardId: "riveteers-overlook",
    setup: "Nothing but the land - it sacrifices itself for a fetch.",
    checks: [
      "Play Riveteers Overlook: on entry it sacrifices itself and searches for a basic Swamp, Mountain or Forest, tapped, and you gain 1 life.",
    ],
  },
  {
    cardId: "rockfall-vale",
    setup: "Two other lands out, the tapped clause's condition.",
    yours: [{ id: "forest" }, { id: "mountain" }],
    checks: [
      "You control two other lands, so Rockfall Vale enters untapped.",
      "Tap it for {R} or {G}.",
      "Reset with one land out: it enters tapped.",
    ],
  },
  {
    cardId: "rootbound-crag",
    setup: "A Mountain out, the condition it reads.",
    yours: [{ id: "mountain" }],
    checks: [
      "You control a Mountain, so Rootbound Crag enters untapped.",
      "Tap it for {R} or {G}.",
      "Reset with neither Mountain nor Forest: it enters tapped.",
    ],
  },
  {
    cardId: "rootweaver-druid",
    setup: "Salty Mike with a library of basics to be searched, since the whole card is a group search that hands you the pick of it.",
    checks: [
      "Cast Rootweaver Druid for {2}{G}: a 2/1, and on entry each opponent may search for up to three basics.",
      "For each searcher, one of those basics enters tapped under YOUR control and the rest under theirs - the ramp is split your way.",
    ],
    gaps: ["The opponent's search is resolved by the engine, and which basic comes to you is picked automatically."],
  },
  {
    cardId: "sakura-tribe-elder",
    setup: "Nothing but the creature.",
    checks: [
      "Cast Sakura-Tribe Elder for {1}{G}: a 1/1.",
      "Sacrifice it: search for a basic land, put it onto the battlefield tapped, shuffle. No mana needed.",
    ],
  },
  {
    cardId: "sangromancer",
    setup: "A creature of Salty Mike's to kill, and Salty Mike holding a card to discard - both triggers gain you 3.",
    theirs: [{ id: "grizzly-bears" }],
    theirHand: ["silvercoat-lion"],
    yourHand: ["eyeblights-ending"],
    checks: [
      "Cast Sangromancer for {2}{B}{B}: a 3/3 flyer.",
      "Kill an opponent's creature (Eyeblight's Ending the Bear): you may gain 3 life.",
      "Make an opponent discard: you may gain 3 life again. Both are 'may'.",
    ],
  },
  {
    cardId: "savage-lands",
    setup: "Nothing but the land.",
    checks: [
      "Play Savage Lands: it enters tapped.",
      "Tap it for {B}, {R} or {G} - a Jund tri-land.",
    ],
  },
  {
    cardId: "scrawling-crawler",
    setup: "Just the artifact creature - both its clauses are about drawing.",
    checks: [
      "Cast Scrawling Crawler for {3}: a 3/2.",
      "At your upkeep, each player draws a card - you and Salty Mike.",
      "Whenever an opponent draws a card, that player loses 1 life - so their bonus draw costs them.",
    ],
  },
  {
    cardId: "share-the-spoils",
    setup: "Both libraries stocked, since the enchantment exiles the top of each on entry.",
    checks: [
      "Cast Share the Spoils for {1}{R}: on entry, exile the top card of each player's library into a shared pile.",
      "During your turn you may play a land or cast a spell from that pile, spending mana as any colour; when you do, exile the top of your library to refill.",
      "When an opponent loses the game, the pile grows again - one card off each library's top.",
    ],
    gaps: ["The impulse pile is playable for any seat on that seat's turn; the engine resolves opponents' use of it."],
  },
  {
    cardId: "shigeki-jukai-visionary",
    setup: "A stocked library for the tap ability, and nonlegendary cards in the graveyard for channel.",
    yourGraveyard: ["grizzly-bears", "silvercoat-lion"],
    extraMana: { generic: 1, g: 1 },
    checks: [
      "Cast Shigeki for {1}{G}: a 1/3 enchantment creature.",
      "Activate {1}{G}, {T}, Return Shigeki to hand: reveal the top four, put a land among them onto the battlefield tapped, the rest to the graveyard.",
      "Channel from hand: {X}{X}{G}{G}, Discard Shigeki - return X target nonlegendary cards from your graveyard to hand. Pick X = 2 to take both.",
    ],
  },
  {
    cardId: "six",
    setup: "A nonland permanent card in your graveyard to retrace, and a land in hand to discard as the retrace cost.",
    yourGraveyard: ["grizzly-bears"],
    yourHand: ["swamp"],
    checks: [
      "Cast Six for {2}{G}: a 2/4 reach.",
      "Attack with Six: mill three, and you may put a land among them into your hand.",
      "During your turn, permanent cards in your graveyard have retrace - cast Grizzly Bears from the graveyard by discarding the Swamp on top of its cost.",
    ],
  },
  {
    cardId: "skull-prophet",
    setup: "Nothing but the creature - it is a mana dork that also mills.",
    checks: [
      "Cast Skull Prophet for {B}{G}: a 3/1.",
      "Tap it for {B} or {G}.",
      "Reset and tap it to mill two instead - it is a choice of two tap abilities on one creature.",
    ],
  },
  {
    cardId: "smoldering-marsh",
    setup: "Two basics out, the tapped clause's condition.",
    yours: [{ id: "swamp" }, { id: "mountain" }],
    checks: [
      "You control two basics, so Smoldering Marsh enters untapped.",
      "Tap it for {B} or {R}.",
      "Reset with fewer than two basics: it enters tapped.",
    ],
  },
  {
    cardId: "solemn-simulacrum",
    setup: "Nothing but the creature - a ramp-and-draw body.",
    checks: [
      "Cast Solemn Simulacrum for {4}: a 2/2, and on entry you may search for a basic land, tapped.",
      "When it dies, you may draw a card.",
    ],
  },
  {
    cardId: "spiteful-visions",
    setup: "Just the enchantment - it turns every draw into damage.",
    checks: [
      "Cast Spiteful Visions for {2}{B/R}{B/R}.",
      "At each player's draw step, that player draws an extra card.",
      "Whenever a player draws a card, it deals 1 to that player - so the extra draws bite everyone, you included.",
    ],
  },
  {
    cardId: "starving-revenant",
    setup: "A stocked library so the surveil-and-draw has cards to move.",
    yourLibraryTop: ["grizzly-bears", "silvercoat-lion", "blasphemous-act"],
    checks: [
      "Cast Starving Revenant for {2}{B}{B}: a 4/4, and on entry surveil 2.",
      "For each card you keep on top, you draw it and lose 3 life - so keeping both draws two and costs 6.",
      "Descend 8: while eight or more permanent cards are in your graveyard, each of your draws drains an opponent for 1 and gains you 1.",
    ],
    gaps: ["Surveil keeps the cards on top automatically rather than prompting - so the draw/lose branch is the one you will see."],
  },
  {
    cardId: "stormfist-crusader",
    setup: "Just the creature - it feeds both players and bleeds them.",
    theirHand: [],
    checks: [
      "Cast Stormfist Crusader for {B}{R}: a 2/2 with menace.",
      "At your upkeep, each player draws a card and loses 1 life - symmetric card flow with a symmetric cost.",
    ],
  },
  {
    cardId: "strangled-cemetery",
    setup: "A player at 13 or less life, the tapped clause's condition.",
    yourLife: 13,
    checks: [
      "A player has 13 or less life, so Strangled Cemetery enters untapped.",
      "Tap it for {B} or {G}.",
      "Reset with everyone above 13 and it enters tapped.",
    ],
  },
  {
    cardId: "sulfurous-springs",
    setup: "Nothing but the land.",
    checks: [
      "Play Sulfurous Springs untapped.",
      "Tap it for {C}, no life lost.",
      "Tap it for {B} or {R} and take 1 damage.",
    ],
  },
  {
    cardId: "tempt-with-discovery",
    setup: "Salty Mike with a stocked library so the tempting offer has takers.",
    checks: [
      "Cast Tempt with Discovery for {3}{G}: search for a land and put it onto the battlefield.",
      "Each opponent may search for a land too; for each who does, you get to fetch another land - so a greedy table ramps you hardest.",
    ],
    gaps: ["The opponents' accept/decline is resolved by the engine (documented tempting-offer simplification)."],
  },
  {
    cardId: "terramorphic-expanse",
    setup: "Nothing but the land.",
    checks: [
      "Play Terramorphic Expanse.",
      "Activate {T}, Sacrifice it: search for a basic land, tapped, shuffle.",
    ],
  },
  {
    cardId: "thieves-auction",
    setup: "Nontoken permanents on both sides, since the card exiles them all and redistributes them.",
    yours: [{ id: "sakura-tribe-elder" }],
    theirs: [{ id: "grizzly-bears" }, { id: "sol-ring" }],
    checks: [
      "Cast Thieves' Auction for {4}{R}{R}{R}: exile all nontoken permanents, yours and theirs and your lands.",
      "Starting with you, players take turns choosing an exiled card and putting it onto the battlefield tapped until the pile is empty - the board is reshuffled between seats.",
    ],
    gaps: ["Each player's pick from the exile pile is made by the engine; you are not prompted for Salty Mike's choices."],
  },
  {
    cardId: "twilight-prophet",
    setup: "Ten or more permanents so you have the city's blessing, and a stocked library for the reveal.",
    yours: [
      { id: "swamp" }, { id: "swamp" }, { id: "swamp" }, { id: "forest" }, { id: "forest" },
      { id: "mountain" }, { id: "sakura-tribe-elder" }, { id: "essence-warden" }, { id: "sol-ring" },
    ],
    yourLibraryTop: ["blasphemous-act"],
    checks: [
      "Cast Twilight Prophet for {2}{B}{B}: a 2/4 flyer with ascend.",
      "You control ten-plus permanents, so you have the city's blessing.",
      "At your upkeep with the blessing, reveal the top card and put it in hand; each opponent loses X and you gain X, X = its mana value.",
    ],
  },
  {
    cardId: "twisted-landscape",
    setup: "A card in hand for the cycling line.",
    yourHand: ["grizzly-bears"],
    checks: [
      "Play Twisted Landscape untapped; tap it for {C}.",
      "Activate {T}, Sacrifice it: search for a basic Swamp, Mountain or Forest, tapped.",
      "Reset. Instead cycle it for {B}{R}{G}: discard it, draw a card.",
    ],
  },
  {
    cardId: "urborg-repossession",
    setup: "A creature card and another permanent card in your graveyard, for the base return and the kicked one.",
    yourGraveyard: ["grizzly-bears", "sol-ring"],
    extraMana: { generic: 1, g: 1 },
    checks: [
      "Cast Urborg Repossession for {B}: return target creature card from your graveyard to hand and gain 2 life.",
      "Kick it for {1}{G}: also return another target permanent card - take the Sol Ring back as well.",
    ],
  },
  {
    cardId: "veteran-explorer",
    setup: "Nothing but the creature - its whole payoff is on death, for everyone.",
    checks: [
      "Cast Veteran Explorer for {G}: a 1/1.",
      "When it dies, each player may search for up to two basic lands and put them onto the battlefield.",
      "It is symmetric ramp - Salty Mike gets his two as well.",
    ],
    gaps: ["Each player's search is resolved by the engine."],
  },
  {
    cardId: "virtue-of-persistence",
    setup: "A creature to shrink with the adventure now, and a creature card in a graveyard for the enchantment's upkeep steal later.",
    theirs: [{ id: "grizzly-bears" }],
    theirGraveyard: ["silvercoat-lion"],
    checks: [
      "Cast the adventure, Locthwain Scorn, for {1}{B}: target creature gets -3/-3 and you gain 2. Kill the Bear with it; Virtue of Persistence goes to exile.",
      "Later, cast Virtue of Persistence from exile for {5}{B}{B}: an enchantment.",
      "At your upkeep it puts a target creature card from a graveyard onto the battlefield under your control - take Salty Mike's Silvercoat Lion.",
    ],
  },
  {
    cardId: "warp-world",
    setup: "Permanents on both sides, since each player shuffles their permanents away and reveals that many.",
    yours: [{ id: "sakura-tribe-elder" }, { id: "sol-ring" }],
    theirs: [{ id: "grizzly-bears" }],
    yourLibraryTop: ["essence-warden", "howling-mine", "swamp"],
    checks: [
      "Cast Warp World for {5}{R}{R}: each player shuffles all their permanents into their library, then reveals that many cards.",
      "Artifact, creature and land cards revealed come in first, then enchantments; the rest go to the bottom.",
    ],
    gaps: ["Each player's reveal-and-rebuild is resolved by the engine."],
  },
  {
    cardId: "wishclaw-talisman",
    setup: "A stocked library to tutor from, on your own turn.",
    extraMana: { generic: 1 },
    checks: [
      "Cast Wishclaw Talisman for {1}{B}: it enters with three wish counters.",
      "Activate {1}, {T}, Remove a wish counter: search for any card and put it in hand - then an opponent gains control of Wishclaw.",
      "It is your-turn only, so Salty Mike cannot fire it back on your turn - but now it is his.",
    ],
    gaps: ["The tutor takes a reasonable card automatically rather than opening a full library picker."],
  },
  {
    cardId: "woodland-cemetery",
    setup: "A Swamp out, the condition it reads.",
    yours: [{ id: "swamp" }],
    checks: [
      "You control a Swamp, so Woodland Cemetery enters untapped.",
      "Tap it for {B} or {G}.",
      "Reset with neither Swamp nor Forest: it enters tapped.",
    ],
  },
  {
    cardId: "swamp",
    setup: "Nothing but the land - the black source the deck's base rests on.",
    checks: ["Play Swamp untapped.", "Tap it for {B}."],
  },
  {
    cardId: "forest",
    setup: "Nothing but the land - the green source.",
    checks: ["Play Forest untapped.", "Tap it for {G}."],
  },
  {
    cardId: "mountain",
    setup: "Nothing but the land - the red source.",
    checks: ["Play Mountain untapped.", "Tap it for {R}."],
  },
];
