import type { LabScenario } from "./cardLab.js";

/**
 * One scenario per card in the Blech, Loafing Pest list - the board each card
 * needs in order to be put through its whole text, and the list of what to try.
 *
 * Read `checks` as instructions, not assertions. Each line is one clause of the
 * card: what to do, and what should happen if the engine has it right. A line
 * that fails is a bug to write down, except where `gaps` already says the engine
 * does not model that clause.
 *
 * Order follows the decklist (commander first, then alphabetical) so walking the
 * lab front to back walks the deck.
 *
 * Two habits worth knowing before you start:
 *
 * - **Reset is part of the method.** Several cards have two branches that cannot
 *   both be reached in one turn - a land that enters tapped unless a condition
 *   holds, a modal spell. Those checks say to reset and take the other line.
 * - **You control both seats.** Salty Mike is not a bot here, so you can declare
 *   his blocks, cast from his hand and answer his prompts. That is the only way
 *   to test "whenever an opponent casts", "each opponent may sacrifice", and
 *   every attack trigger from the receiving end.
 */
export const LAB_SCENARIOS: LabScenario[] = [
  {
    cardId: "blech-loafing-pest",
    fromCommandZone: true,
    setup:
      "Blech in the command zone, with one creature of each type it cares about already out plus a Grizzly Bears that it does not. Radiant Fountain in hand as a life-gain button.",
    yours: [
      { id: "pest-mascot" },
      { id: "duskshell-crawler" },
      { id: "sakura-tribe-elder" },
      { id: "arasta-of-the-endless-web" },
      { id: "grizzly-bears" },
    ],
    yourHand: ["radiant-fountain"],
    checks: [
      "Cast Blech from the command zone for {1}{B}{G}. It arrives as a 3/4 Pest.",
      "Play the Radiant Fountain: you gain 2 life and Blech triggers once - one trigger for the life gain, not one per creature.",
      "It resolves onto five creatures: Pest Mascot, Duskshell Crawler, Sakura-Tribe Elder, Arasta, and Blech itself. Blech says 'each Pest' with no 'other', and Blech is a Pest.",
      "Grizzly Bears is an Ape and gets nothing.",
      "Pest Mascot ends up with two counters, not one - it has its own 'whenever you gain life' trigger as well as Blech's.",
      "Cast Blech a second time (kill it, let it go to the command zone) and the tax makes it {3}{B}{G}.",
    ],
  },
  {
    cardId: "adventurers-inn",
    setup: "A Pest Mascot out, so the life gain has something visible to do.",
    yours: [{ id: "pest-mascot" }],
    checks: [
      "Play Adventurer's Inn: it enters untapped and you gain 2 life.",
      "Pest Mascot picks up a +1/+1 counter from its own life-gain trigger, which is how you can see the 2 life really happened.",
      "Tap the Inn: one colourless mana in the pool, not green or black.",
    ],
  },
  {
    cardId: "arachnogenesis",
    setup:
      "Salty Mike has three creatures and you have two. You will need to pass the turn and attack with his board to be the one being attacked.",
    theirs: [{ id: "grizzly-bears" }, { id: "craw-wurm" }, { id: "silvercoat-lion" }],
    yours: [{ id: "shopkeepers-bane" }],
    checks: [
      "Pass the turn. In Salty Mike's combat, attack with all three of his creatures.",
      "In the declare-blockers step, cast Arachnogenesis: three 1/2 Spider tokens with reach arrive - one per creature attacking you, not per creature on the board.",
      "Let combat damage happen without blocking: you take none. All three attackers are non-Spiders and their damage is prevented.",
      "Take the turn back and attack with Shopkeeper's Bane on your own turn: the prevention was until end of turn only, so this damage lands normally.",
    ],
  },
  {
    cardId: "arasta-of-the-endless-web",
    setup:
      "Salty Mike is holding an instant and a sorcery; you are holding an instant of your own, to prove the trigger only watches opponents.",
    yourHand: ["golgari-charm"],
    theirHand: ["dark-ritual", "sylvan-tutor"],
    extraMana: { b: 1, g: 1 },
    checks: [
      "Cast Arasta: a 3/5 that is both an Enchantment and a Creature, with reach.",
      "Cast your own Golgari Charm: Arasta does not trigger. It watches opponents only.",
      "Pass the turn and cast Dark Ritual from Salty Mike's hand: Arasta triggers and *you* get the 1/2 Spider token, not him.",
      "Cast Sylvan Tutor from his hand too: a sorcery triggers it just as an instant does.",
      "Attack a flier with the Spider token to confirm reach: it can block flying creatures.",
    ],
  },
  {
    cardId: "assassins-trophy",
    setup: "Salty Mike controls an artifact, a creature and a land - one of each thing you might point this at.",
    theirs: [{ id: "sol-ring" }, { id: "grizzly-bears" }, { id: "forest" }],
    yours: [{ id: "haywire-mite" }],
    checks: [
      "Cast Assassin's Trophy targeting Sol Ring: it is destroyed.",
      "Salty Mike is then offered a search of his library for a basic land. Take it - the basic arrives on his battlefield untapped, and his library is shuffled.",
      "Reset. Target his Forest instead: a land is a legal target, and he gets the basic land back off the same clause.",
      "Reset. Try to target your own Haywire Mite: refused. It says 'a permanent an opponent controls'.",
      "Reset and decline the search: the destroy still happened. The search is 'may'.",
    ],
  },
  {
    cardId: "bala-ged-recovery",
    setup: "Two cards waiting in your graveyard - a creature and an artifact - so either face is worth playing.",
    yourGraveyard: ["blood-artist", "sol-ring"],
    checks: [
      "Cast the front face, Bala Ged Recovery, targeting Blood Artist: it returns to your hand.",
      "It can target any card in your graveyard, not just a creature - point it at Sol Ring instead.",
      "Reset. Choose the back face instead: Bala Ged Sanctuary is played as a land, uses your land drop, and enters tapped.",
      "The land face taps for {G} on your next turn.",
    ],
  },
  {
    cardId: "bayou",
    setup: "Nothing but the land itself.",
    checks: [
      "Play Bayou: it enters untapped.",
      "Tap it and the ability picker offers both {B} and {G}. Take {B}.",
      "Reset and take {G} instead.",
      "It is a Swamp and a Forest as well as a land, which is what Tainted Wood and Wastewood Verge are looking for - check the type line reads 'Land - Swamp Forest'.",
    ],
  },
  {
    cardId: "birds-of-paradise",
    setup:
      "A second Birds already in play, because a creature that arrives this turn cannot be tapped for mana. The one in play tests the ability, the one in hand tests the cast.",
    yours: [{ id: "birds-of-paradise" }],
    checks: [
      "Cast the Birds from your hand: a 0/1 with flying.",
      "Try to tap the one you just cast for mana: refused, it has summoning sickness.",
      "Tap the Birds that was already out: the picker offers all five colours. Take {U} - a colour outside your commander's identity, which a mana ability is allowed to make.",
      "Reset and take {G}, then spend it: the mana is real, not decorative.",
    ],
  },
  {
    cardId: "blight-mound",
    setup:
      "A Pest to attack with, a Grizzly Bears to throw away, and two blockers across the table so menace can be tested properly. Tend the Pests in hand as the sacrifice outlet.",
    yours: [{ id: "pest-mascot" }, { id: "grizzly-bears" }],
    theirs: [{ id: "silvercoat-lion" }, { id: "wall-of-wood" }],
    yourHand: ["tend-the-pests"],
    extraMana: { b: 1, g: 1 },
    checks: [
      "Cast Blight Mound.",
      "Attack with Pest Mascot: while attacking it is a 3/3 (+1/+0 on a 2/3) and has menace.",
      "Try to block it with one creature: refused. Block with both: allowed.",
      "Attack with Grizzly Bears as well: it is not a Pest and gets neither the bonus nor menace.",
      "Cast Tend the Pests sacrificing Grizzly Bears: Blight Mound sees a nontoken creature die and makes a 1/1 Pest, on top of the two Pests from Tend the Pests itself.",
      "Let one of those Pest tokens die: it gains you 1 life but does *not* make another Pest. Blight Mound says nontoken.",
    ],
  },
  {
    cardId: "blood-artist",
    setup: "A creature on each side and Fell the Profane in hand, so you can kill either one on demand.",
    yours: [{ id: "grizzly-bears" }],
    theirs: [{ id: "silvercoat-lion" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast Blood Artist: a 0/1.",
      "Cast Fell the Profane on Salty Mike's Silvercoat Lion. Blood Artist triggers and asks which player loses the life - point it at Salty Mike. He goes to 39 and you go to 41.",
      "Reset and kill your own Grizzly Bears instead: it still triggers. It says 'this creature or another creature', either side of the table.",
      "You can point the life loss at yourself: the target is any player, and the card is not 'target opponent'.",
      "Let Blood Artist itself die (block it with something bigger): it triggers on its own death.",
    ],
  },
  {
    cardId: "bloodstained-mire",
    setup: "Nothing but the fetchland. The library holds a Swamp and a Mountain for it to find.",
    checks: [
      "Play Bloodstained Mire: it enters untapped.",
      "Activate it: you pay 1 life (40 to 39), it is sacrificed to the graveyard, and the search opens.",
      "The search offers the Swamp and the Mountain and nothing else - no Forest, no nonland card.",
      "Take the Swamp: it arrives untapped, and can be tapped for {B} the same turn (a land has no summoning sickness).",
      "Reset and take nothing: the land is still sacrificed and the life still paid. That is the cost, not the effect.",
    ],
  },
  {
    cardId: "boggart-trawler",
    setup: "Both graveyards stocked, so it matters which player you point the trigger at.",
    yourGraveyard: ["blood-artist"],
    theirGraveyard: ["grizzly-bears", "dark-ritual", "sol-ring"],
    checks: [
      "Cast the front face, Boggart Trawler: a 3/1, and its arrival trigger asks for a player.",
      "Point it at Salty Mike: all three cards leave his graveyard for exile.",
      "Reset and point it at yourself: your own Blood Artist is exiled. It is 'target player', not 'target opponent'.",
      "Reset. Play the back face, Boggart Bog, as a land instead: you are asked whether to pay 3 life. Pay it and the land enters untapped; decline and it enters tapped.",
    ],
  },
  {
    cardId: "bogwater-lumaret",
    setup: "Send in the Pest and Sakura-Tribe Elder in hand, so you can make both a token and a real creature arrive.",
    yourHand: ["send-in-the-pest", "sakura-tribe-elder"],
    theirHand: ["grizzly-bears"],
    extraMana: { generic: 2, b: 1, g: 1 },
    checks: [
      "Cast Bogwater Lumaret. Its own arrival gains you 1 life - it says 'this creature or another creature you control'.",
      "Cast Sakura-Tribe Elder: another 1 life.",
      "Cast Send in the Pest: the Pest token also counts. A token entering is a creature entering.",
      "Pass the turn and cast Grizzly Bears from Salty Mike's hand: no life. It only watches your side.",
    ],
  },
  {
    cardId: "braids-arisen-nightmare",
    setup:
      "One of every card type on your side to feed it, and a matching set on Salty Mike's so he has something to give up in answer.",
    yours: [{ id: "grizzly-bears" }, { id: "sol-ring" }, { id: "lifegift" }],
    theirs: [{ id: "silvercoat-lion" }, { id: "skullclamp" }, { id: "forest" }],
    checks: [
      "Cast Braids, then pass to your end step: the trigger asks whether to sacrifice something.",
      "Give up Grizzly Bears. Salty Mike is then offered the chance to sacrifice a permanent sharing a card type - a creature. Accept for him: he loses his Silvercoat Lion, and you draw nothing and he loses no life.",
      "Reset and decline for him instead: he loses 2 life and you draw a card.",
      "Reset and give up Sol Ring. Now the type to match is Artifact, so the only thing he can offer is Skullclamp - not the Forest, not the Lion.",
      "Reset and decline the whole trigger: nothing happens at all. It is 'you may'.",
    ],
  },
  {
    cardId: "command-tower",
    setup: "Nothing but the land. Your commander is Blech, whose identity is black and green.",
    checks: [
      "Play Command Tower: it enters untapped.",
      "Tap it: the picker offers {B} and {G} only. White, blue and red are outside Blech's identity and must not be offered.",
      "Take {B} and spend it.",
    ],
  },
  {
    cardId: "dark-ritual",
    setup: "A single Swamp, and Braids in hand as somewhere to put the mana.",
    yourHand: ["braids-arisen-nightmare"],
    checks: [
      "Cast Dark Ritual for {B}: three black mana appear in your pool.",
      "Cast Braids, Arisen Nightmare with them - {1}{B}{B}, all three paid out of the pool with no land tapped.",
      "Reset. Cast Dark Ritual and then pass without spending: the pool empties at the end of the step. Floating mana does not survive.",
    ],
  },
  {
    cardId: "deadly-rollick",
    setup:
      "Blech is on the battlefield, so the free cast is available. Two creatures across the table to point it at.",
    commanderInPlay: true,
    theirs: [{ id: "craw-wurm" }, { id: "grizzly-bears" }],
    checks: [
      "Cast Deadly Rollick: you are offered the free cast, because you control your commander.",
      "Take it and exile Craw Wurm: no mana leaves your lands.",
      "Reset and pay {3}{B} the normal way instead: the free cast is optional.",
      "Exile is not destruction - nothing that watches for creatures dying should fire.",
    ],
  },
  {
    cardId: "deathcap-glade",
    setup: "One other land out and a Forest in hand, so both halves of the tapped condition can be reached.",
    lands: ["forest"],
    yourHand: ["forest"],
    checks: [
      "Play Deathcap Glade while you control only one other land: it enters tapped.",
      "Reset. Play the Forest from your hand first, then pass a turn and play Deathcap Glade with two other lands out: it enters untapped.",
      "Tap it: it offers both {B} and {G}.",
    ],
  },
  {
    cardId: "deathreap-ritual",
    setup: "A creature on each side and Fell the Profane in hand, so a creature can be made to die on either turn.",
    yours: [{ id: "grizzly-bears" }],
    theirs: [{ id: "silvercoat-lion" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast Deathreap Ritual and pass to your end step with nothing dead: no trigger. The intervening-if is not met.",
      "Reset. Cast Fell the Profane on Silvercoat Lion, then pass to your end step: you are offered a card. Draw it.",
      "Keep passing into Salty Mike's end step: it triggers again. It says *each* end step, not yours.",
      "Decline the draw once: it is 'you may'.",
    ],
  },
  {
    cardId: "delighted-halfling",
    setup:
      "A second Halfling already in play so the mana can be used this turn, plus Blech in hand as a legendary spell for the restricted mana to pay for, and a Grizzly Bears as a spell it must refuse.",
    yours: [{ id: "delighted-halfling" }, { id: "forest" }, { id: "forest" }],
    yourHand: ["grizzly-bears"],
    checks: [
      "Cast the Halfling from hand: a 1/2.",
      "Tap the Halfling that was already out for {C}: plain colourless, no restriction.",
      "Reset. Tap it for the restricted mana instead - take {B} - and cast Blech from the command zone with it plus two Forests: allowed, Blech is legendary.",
      "Reset. Tap it for restricted {G} and try to cast Grizzly Bears with it: refused. Grizzly Bears is not legendary, so that mana cannot pay for it.",
    ],
  },
  {
    cardId: "disciple-of-freyalise",
    setup: "A fat creature to eat - Craw Wurm, a 6/4 - and a small one, so the X is visibly the creature's power.",
    yours: [{ id: "craw-wurm" }, { id: "grizzly-bears" }],
    checks: [
      "Cast Disciple of Freyalise: a 3/3, and its arrival asks whether to sacrifice another creature.",
      "Give up Craw Wurm: you gain 6 life and draw 6 cards. X is its power, not its mana value.",
      "Reset and give up Grizzly Bears instead: 2 life and 2 cards.",
      "Reset and decline: nothing happens, and the Disciple stays. It is 'you may'.",
      "It cannot eat itself - 'another creature'.",
      "Reset. Play the back face, Garden of Freyalise, as a land: pay 3 life for untapped, or decline for tapped.",
    ],
  },
  {
    cardId: "doubling-season",
    setup:
      "Send in the Pest and Revitalizing Repast in hand - one makes a token, the other puts a counter - so both halves can be seen. A Pest Mascot to receive the counter.",
    yours: [{ id: "pest-mascot" }],
    yourHand: ["send-in-the-pest", "revitalizing-repast"],
    extraMana: { generic: 1, b: 1, g: 1 },
    checks: [
      "Cast Doubling Season.",
      "Cast Send in the Pest: two Pest tokens arrive instead of one.",
      "Cast Revitalizing Repast on Pest Mascot: two +1/+1 counters instead of one.",
      "Both clauses only cover permanents and tokens you control - a token Salty Mike makes is unaffected.",
    ],
  },
  {
    cardId: "duskshell-crawler",
    setup: "Two creatures without counters, and a big blocker across the table so trample can be measured.",
    yours: [{ id: "shopkeepers-bane" }, { id: "grizzly-bears" }],
    theirs: [{ id: "wall-of-wood" }],
    checks: [
      "Cast Duskshell Crawler: a 0/3, and its arrival asks for a creature to put a +1/+1 counter on.",
      "Point it at Shopkeeper's Bane: it becomes a 5/3.",
      "Attack with Shopkeeper's Bane into the 0/3 Wall of Wood. It has trample from Duskshell Crawler (it has a counter), so 2 damage goes through to Salty Mike.",
      "Attack with Grizzly Bears too: no counter on it, so no trample, and all its damage stops at the blocker.",
      "The counter can go on Duskshell Crawler itself - the target is any creature.",
    ],
  },
  {
    cardId: "eccentric-pestfinder",
    setup: "Radiant Fountain in hand as the life gain the end-step check needs, and enough mana left over to cast the back face.",
    yourHand: ["radiant-fountain"],
    extraMana: { b: 1, g: 1 },
    checks: [
      "Cast Eccentric Pestfinder: a 5/5 with trample.",
      "Pass to your end step without gaining life: nothing happens. The if is not met.",
      "Reset. Play Radiant Fountain (gain 2), then pass to your end step: it becomes prepared.",
      "Cast the copy of Turn Stones off the prepared creature: one Pest token per opponent, so one here. The creature stays on the battlefield and stops being prepared.",
      "The Pestfinder is not tapped or exiled by casting the copy - nothing physically moved.",
    ],
  },
  {
    cardId: "elves-of-deep-shadow",
    setup: "A second copy already in play so the mana ability is usable this turn.",
    yours: [{ id: "elves-of-deep-shadow" }],
    checks: [
      "Cast the Elves from hand: a 1/1.",
      "Tap the one already out for {B}: you get the mana *and* take 1 damage, going to 39.",
      "The damage is dealt to you by the creature, so it is damage rather than life loss - anything watching for damage should see it.",
    ],
  },
  {
    cardId: "essence-warden",
    setup: "Send in the Pest in hand for a token, and a creature in Salty Mike's hand to prove it watches both sides.",
    yourHand: ["send-in-the-pest"],
    theirHand: ["grizzly-bears"],
    extraMana: { generic: 1, b: 1 },
    checks: [
      "Cast Essence Warden: casting it gains you nothing. It says 'another creature'.",
      "Cast Send in the Pest: the Pest token arriving gains you 1 life.",
      "Pass the turn and cast Grizzly Bears from Salty Mike's hand: you gain 1 life from that too. Essence Warden watches every creature, not just yours.",
    ],
  },
  {
    cardId: "eumidian-terrabotanist",
    setup: "A Forest and a Radiant Fountain in hand, and a Pest Mascot to show the life gain landing.",
    yours: [{ id: "pest-mascot" }],
    yourHand: ["forest", "radiant-fountain"],
    checks: [
      "Cast Eumidian Terrabotanist: a 2/3.",
      "Play the Forest: landfall triggers and you gain 1 life. Pest Mascot picks up a counter off its own trigger, confirming the life really arrived.",
      "Pass a turn and play Radiant Fountain: you gain 1 from landfall and 2 from the Fountain - three separate life events.",
      "A land Salty Mike plays does nothing: it says 'a land you control'.",
    ],
  },
  {
    cardId: "exotic-orchard",
    setup:
      "Salty Mike controls a Swamp and an Island, so the Orchard should offer black and blue - and specifically not green.",
    theirs: [{ id: "swamp" }, { id: "island" }],
    checks: [
      "Play Exotic Orchard: it enters untapped.",
      "Tap it: the picker offers {B} and {U}, the colours Salty Mike's lands could produce.",
      "It must not offer {G}. He controls no green source, and what *your* lands make is irrelevant.",
      "Take {B} and spend it.",
    ],
  },
  {
    cardId: "fell-the-profane",
    setup: "A creature and a planeswalker across the table, since the spell names both.",
    theirs: [{ id: "craw-wurm" }, { id: "grist-the-hunger-tide" }],
    checks: [
      "Cast Fell the Profane on Craw Wurm: destroyed.",
      "Reset and target Grist instead: a planeswalker is a legal target and is destroyed outright, loyalty and all.",
      "Destroying a creature is a death - anything watching for a creature dying should fire, which is the bug this card had once.",
      "Reset. Play the back face, Fell Mire, as a land: pay 3 life for untapped or decline for tapped.",
    ],
  },
  {
    cardId: "feral-appetite",
    setup:
      "A Pest to attack with, a non-Pest beside it, a big blocker to bite, and both graveyards stocked for the exile ability.",
    yours: [{ id: "pest-mascot" }, { id: "grizzly-bears" }],
    theirs: [{ id: "craw-wurm" }],
    yourGraveyard: ["blood-artist", "sol-ring"],
    extraMana: { generic: 1, g: 1 },
    checks: [
      "Cast Feral Appetite.",
      "Attack with Pest Mascot and have Craw Wurm block: the Pest is a 3/3 with deathtouch while attacking, so the 6/4 Wurm dies to it.",
      "Grizzly Bears attacking gets neither bonus - it is not a Pest.",
      "Activate for {1}{G} exiling Blood Artist from your graveyard: a creature card was exiled, so a Pest token arrives.",
      "Activate again exiling Sol Ring: the card is exiled but no token. It is not a creature card.",
      "It says 'a graveyard' - Salty Mike's cards are legal targets too.",
    ],
  },
  {
    cardId: "forest",
    setup: "Nothing but the land.",
    checks: [
      "Play the Forest: it enters untapped and uses your one land drop for the turn.",
      "Tap it for {G}.",
      "Try to play a second land this turn: refused.",
    ],
  },
  {
    cardId: "fumulus-the-infestation",
    setup:
      "An Insect to attack with, a nontoken creature to sacrifice, and Tend the Pests in hand as the outlet. Craw Wurm across the table as a blocker that cannot catch a flier.",
    yours: [{ id: "duskshell-crawler" }, { id: "grizzly-bears" }],
    theirs: [{ id: "craw-wurm" }],
    yourHand: ["tend-the-pests"],
    extraMana: { b: 1, g: 1 },
    checks: [
      "Cast Fumulus: a 2/2 with flying and deathtouch.",
      "Cast Tend the Pests sacrificing Grizzly Bears: Fumulus sees a nontoken creature sacrificed and makes a 1/1 black Insect with flying.",
      "Let a Pest token die: no Insect. It says nontoken.",
      "Attack with Duskshell Crawler, an Insect: Fumulus triggers, Salty Mike loses 1 life and you gain 1.",
      "Attack with Grizzly Bears: nothing. An Ape is not an Insect, Leech, Slug or Worm.",
      "Attack with Fumulus itself - it is an Insect, so it triggers off its own attack.",
    ],
  },
  {
    cardId: "golgari-charm",
    setup:
      "Small creatures on both sides for the first mode, an enchantment across the table for the second, and a creature about to die for the third. Fell the Profane in hand to do the killing.",
    yours: [{ id: "essence-warden" }, { id: "grizzly-bears" }],
    theirs: [{ id: "birds-of-paradise" }, { id: "lifegift" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast Golgari Charm and take the first mode: every creature gets -1/-1, so Essence Warden and Birds of Paradise both die and Grizzly Bears survives as a 1/1. It hits your own board too.",
      "Reset and take the second mode: destroy Salty Mike's Lifegift. It needs a target, and only enchantments are offered.",
      "Reset and take the third mode: your creatures get regeneration shields. Cast Fell the Profane on Grizzly Bears - it is not destroyed, it taps and its damage is healed instead.",
      "The shield is used up: cast a second kill on the same creature and it dies.",
    ],
  },
  {
    cardId: "grist-the-hunger-tide",
    setup:
      "A creature to feed the second ability, a target across the table for it, and three creature cards in your graveyard for the third.",
    yours: [{ id: "grizzly-bears" }],
    theirs: [{ id: "craw-wurm" }, { id: "grist-the-hunger-tide" }],
    yourGraveyard: ["blood-artist", "pest-mascot", "hornet-queen"],
    yourLibraryTop: ["duskshell-crawler", "swamp", "hornet-nest"],
    checks: [
      "Cast Grist for {1}{B}{G}: it arrives with 3 loyalty.",
      "Activate +1: an Insect token arrives and you mill Duskshell Crawler - an Insect card, so a loyalty counter goes on and it repeats. The second mill is a Swamp, so it stops. Loyalty ends at 5 and you have two Insect tokens.",
      "Only one loyalty ability per turn: try a second and it is refused.",
      "Pass two turns, then activate -2: you may sacrifice a creature, and if you do, destroy target creature or planeswalker. Give up Grizzly Bears and kill Craw Wurm.",
      "Reset and use -2 declining the sacrifice: nothing is destroyed. The destroy hangs off 'when you do'.",
      "Get to 5 loyalty and activate -5: Salty Mike loses 3 life, one for each creature card in your graveyard.",
      "Grist is a 1/1 Insect creature everywhere except the battlefield: check the card in your hand reads as a creature too.",
    ],
    gaps: [
      "The card detail panel prints nothing for a planeswalker's abilities - the engine has all three, the renderer does not describe them.",
    ],
  },
  {
    cardId: "haywire-mite",
    setup: "A noncreature artifact and a noncreature enchantment across the table, plus an artifact creature it must refuse.",
    theirs: [{ id: "sol-ring" }, { id: "lifegift" }, { id: "twitching-doll" }],
    extraMana: { g: 1 },
    checks: [
      "Cast Haywire Mite for {1}: a 1/1 artifact creature.",
      "Try to use its ability this turn: refused. The cost includes sacrificing itself, but it is a tap-free ability - so if it *is* offered, that is correct; what must not work is anything needing {T}.",
      "Pay {G} and sacrifice it targeting Sol Ring: exiled. Its own death trigger also gains you 2 life.",
      "Reset and target Lifegift: an enchantment is equally legal.",
      "Reset and try to target Twitching Doll: refused. It is an artifact *creature*, and the ability says noncreature.",
    ],
  },
  {
    cardId: "heroic-intervention",
    setup:
      "Two of your permanents and, in Salty Mike's hand, a removal spell and a targeted spell to be turned away.",
    yours: [{ id: "grizzly-bears" }, { id: "sol-ring" }],
    theirHand: ["fell-the-profane", "assassins-trophy"],
    checks: [
      "Cast Heroic Intervention.",
      "Cast Fell the Profane from Salty Mike's hand at Grizzly Bears: refused - it has hexproof from an opponent's spell.",
      "Cast Assassin's Trophy at Sol Ring: also refused. It covers every permanent you control, not just creatures.",
      "Pass the turn: the protection is gone, and the same spells can now be cast.",
      "Indestructible half: with the Intervention up, a -1/-1 sweep still kills (toughness 0 is not destruction) but a destroy effect does not.",
    ],
  },
  {
    cardId: "hornet-nest",
    setup: "Craw Wurm across the table to hit it with, and Tainted Strike in hand for a second, sharper source of damage.",
    theirs: [{ id: "craw-wurm" }],
    yourHand: ["tainted-strike"],
    extraMana: { b: 1 },
    checks: [
      "Cast Hornet Nest: a 0/2 with defender.",
      "Try to attack with it: refused.",
      "Pass the turn, attack with Craw Wurm and block with Hornet Nest: it is dealt 6 damage, so six 1/1 Insects with flying and deathtouch arrive - and the Nest dies.",
      "The tokens have deathtouch: block with one next turn and it kills whatever it blocks.",
      "Reset. Cast Tainted Strike on Craw Wurm first, then block: the damage is infect, so the Nest gets -1/-1 counters rather than damage marked. Watch whether the token trigger still fires - it should not, because no damage was dealt.",
    ],
  },
  {
    cardId: "hornet-queen",
    setup: "Nothing but the mana for it - seven lands.",
    checks: [
      "Cast Hornet Queen for {4}{G}{G}{G}: a 2/2 with flying and deathtouch.",
      "Four 1/1 Insect tokens arrive with it, each with flying and deathtouch.",
      "The tokens are summoning sick this turn like any creature, so they cannot attack yet.",
      "Pass a turn and attack with one: it is blocked and its deathtouch kills the blocker whatever the blocker's toughness.",
    ],
  },
  {
    cardId: "icetill-explorer",
    setup: "Two lands in hand for the extra land drop, and a land already sitting in your graveyard for the second clause.",
    yourHand: ["forest", "swamp"],
    yourGraveyard: ["bayou"],
    checks: [
      "Cast Icetill Explorer: a 2/4.",
      "Play the Forest, then the Swamp: two land drops in one turn, which is the whole first clause.",
      "Each land entering mills you a card - two cards this turn, and you can see them arrive in your graveyard.",
      "Pass a turn and play Bayou straight out of your graveyard: allowed only because of the Explorer.",
      "Kill the Explorer and try to play a land from the graveyard again: refused.",
    ],
  },
  {
    cardId: "illegitimate-business",
    setup: "A Pest Mascot to make the life gain visible.",
    yours: [{ id: "pest-mascot" }],
    checks: [
      "Play Illegitimate Business: it enters tapped.",
      "You gain 1 life as it arrives, and Pest Mascot picks up a counter to prove it.",
      "It cannot be tapped for mana this turn - it is already tapped.",
      "Pass a turn: it untaps and offers both {B} and {G}.",
    ],
  },
  {
    cardId: "inspiring-call",
    setup:
      "Three creatures, two of them already carrying counters, and Fell the Profane in hand to test the indestructible half.",
    yours: [{ id: "pest-mascot", counters: 1 }, { id: "grizzly-bears", counters: 2 }, { id: "essence-warden" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast Inspiring Call: you draw 2 cards - one for each creature with a counter, not one per counter and not one per creature.",
      "Cast Fell the Profane on Pest Mascot: it survives. It had a counter, so it is indestructible.",
      "Cast Fell the Profane on Essence Warden: it dies. No counter, no indestructible - the card only protects 'those creatures'.",
      "Pass the turn: the indestructible is gone.",
    ],
  },
  {
    cardId: "iridescent-hornbeetle",
    setup:
      "Revitalizing Repast and Duskshell Crawler in hand, so you can put counters on creatures during the turn and watch the end step count them.",
    yours: [{ id: "pest-mascot" }],
    yourHand: ["revitalizing-repast", "duskshell-crawler"],
    extraMana: { generic: 1, g: 2 },
    checks: [
      "Cast Iridescent Hornbeetle, then pass to your end step having put no counters on anything: no tokens. The count is zero.",
      "Reset. Cast Revitalizing Repast on Pest Mascot (one counter) and Duskshell Crawler (another counter on arrival), then pass to your end step: two 1/1 Insect tokens.",
      "It counts counters *put on* creatures this turn, not counters currently sitting there - a creature that arrived with counters last turn adds nothing.",
    ],
  },
  {
    cardId: "lifegift",
    setup: "A land in your hand and a land in Salty Mike's, because this one watches every land, not only yours.",
    yourHand: ["forest"],
    theirHand: ["swamp"],
    checks: [
      "Cast Lifegift.",
      "Play the Forest: you are offered 1 life. Take it.",
      "Decline the offer once: it is 'you may'.",
      "Pass the turn and play the Swamp from Salty Mike's hand: you are offered the life again. It says 'a land', with no controller named.",
    ],
  },
  {
    cardId: "llanowar-wastes",
    setup: "Nothing but the land.",
    checks: [
      "Play Llanowar Wastes: it enters untapped.",
      "Tap it for {C}: no damage. The painless mode is a separate ability.",
      "Reset and tap it for {B} instead: you take 1 damage, going to 39.",
      "Reset and take {G}: same 1 damage.",
    ],
  },
  {
    cardId: "marsh-flats",
    setup: "Nothing but the fetchland. The library holds a Plains and a Swamp.",
    checks: [
      "Play Marsh Flats and activate it: 1 life paid, the land sacrificed, and the search opens.",
      "It offers the Plains and the Swamp only.",
      "Take the Plains: it arrives untapped, even though white is outside your commander's identity. Colour identity is a deck-building rule, not a play restriction.",
      "The library is shuffled afterwards.",
    ],
  },
  {
    cardId: "meltstrider-eulogist",
    setup:
      "One creature with a counter and one without, plus Fell the Profane in hand so either can be made to die.",
    yours: [{ id: "pest-mascot", counters: 1 }, { id: "grizzly-bears" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast Meltstrider Eulogist: a 3/3.",
      "Cast Fell the Profane on Pest Mascot: it had a counter, so you draw a card.",
      "Reset and kill Grizzly Bears instead: no draw. No counter on it.",
      "A creature Salty Mike controls dying draws you nothing - it says 'you control'.",
    ],
  },
  {
    cardId: "moseo-veins-new-dean",
    setup:
      "Three creature cards in your graveyard at different mana values, and Radiant Fountain in hand as the life gain that switches the trigger on and sets its cap.",
    yourGraveyard: ["essence-warden", "pest-mascot", "hornet-queen"],
    yourHand: ["radiant-fountain"],
    checks: [
      "Cast Moseo: a 2/1 with flying, and a Pest token arrives with it.",
      "Attack with the Pest token: you gain 1 life off its own trigger.",
      "Pass to your end step having gained no life: no trigger.",
      "Reset. Play Radiant Fountain (gain 2), then pass to your end step: the trigger fires and offers creature cards of mana value 2 or less. Essence Warden ({G}) is offered, Pest Mascot (3) and Hornet Queen (7) are not.",
      "Return Essence Warden: it arrives on the battlefield, not in your hand.",
      "The target is 'up to one', so taking nothing is a legal answer.",
    ],
  },
  {
    cardId: "necrodominance",
    setup: "A creature you can kill and cards in hand, so both the exile replacement and the draw can be watched.",
    yours: [{ id: "grizzly-bears" }],
    yourHand: ["fell-the-profane", "dark-ritual"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast Necrodominance for {B}{B}{B}.",
      "Cast Dark Ritual: when it finishes resolving it is exiled rather than put in your graveyard.",
      "Cast Fell the Profane on your own Grizzly Bears: the creature is exiled too. The replacement covers cards from anywhere, not just spells.",
      "Pass to your end step: you are asked how much life to pay. Pay 5 and draw 5 cards.",
      "Pay 0: nothing is drawn and nothing is lost.",
      "Skip your draw step: pass the turn twice and confirm you do not draw for turn.",
      "Maximum hand size is five: end a turn holding more than five and the rest are discarded - and, because of the replacement, discarded to exile.",
    ],
  },
  {
    cardId: "ophiomancer",
    setup: "A Snake already on your board, so the intervening-if can be seen to stop the trigger.",
    yours: [{ id: "sakura-tribe-elder" }],
    checks: [
      "Cast Ophiomancer: a 2/2.",
      "Pass into the next upkeep: no Snake token, because Sakura-Tribe Elder is a Snake and you already control one.",
      "Sacrifice Sakura-Tribe Elder (its own ability does it), then pass into an upkeep with no Snakes: a 1/1 black Snake with deathtouch arrives.",
      "Pass into the following upkeep: no second Snake. You control one now.",
      "It says *each* upkeep - the token should arrive on Salty Mike's upkeep as well as yours if you have no Snake at the time.",
    ],
  },
  {
    cardId: "overgrown-tomb",
    setup: "Nothing but the land.",
    checks: [
      "Play Overgrown Tomb: you are asked whether to pay 2 life.",
      "Pay it: you go to 38 and the land enters untapped.",
      "Reset and decline: you stay at 40 and it enters tapped.",
      "Tap it: it offers {B} and {G}, and its type line reads 'Land - Swamp Forest'.",
    ],
  },
  {
    cardId: "path-of-ancestry",
    setup:
      "Two Forests already out, a Pest in hand and a Snake in hand - so you can spend the Path's mana on a creature that shares a type with Blech, and on one that does not.",
    lands: ["forest", "swamp"],
    yourHand: ["pest-mascot", "sakura-tribe-elder"],
    checks: [
      "Play Path of Ancestry: it enters tapped.",
      "Pass a turn. Tap it: it offers {B} and {G} only - Blech's identity.",
      "Spend that mana as part of casting Pest Mascot: Pest Mascot is a Pest, Blech is a Pest, so you scry 1. Choose to bottom the card and confirm it moves.",
      "Reset. Spend the Path's mana on Sakura-Tribe Elder instead, a Snake Shaman: no scry.",
      "Reset. Tap the Path but pay for Pest Mascot entirely out of the other lands: no scry. The rider follows the mana, not the spell.",
    ],
    gaps: ["The card detail panel does not mention the scry rider, though the engine applies it."],
  },
  {
    cardId: "pest-infestation",
    setup:
      "Two artifacts and an enchantment across the table, plus five spare lands so X can be 2. Nine lands in total, so read the mana carefully: {X}{X}{G} at X=2 costs {4}{G}.",
    theirs: [{ id: "sol-ring" }, { id: "skullclamp" }, { id: "lifegift" }],
    extraMana: { generic: 4 },
    checks: [
      "Cast Pest Infestation and choose X = 2: the cost asked for is {4}{G}, because the card prints {X} twice.",
      "Point it at Sol Ring and Lifegift - an artifact and an enchantment, in either mix.",
      "Both are destroyed, and *four* Pest tokens arrive. Twice X, not X.",
      "Reset and choose X = 2 but only pick one target: legal, it is 'up to X'. You still get four tokens.",
      "Reset and choose X = 0: no targets at all and no tokens.",
      "Let a Pest token die: you gain 1 life.",
    ],
  },
  {
    cardId: "pest-mascot",
    setup: "Radiant Fountain and Adventurer's Inn in hand, so you can gain life twice.",
    yourHand: ["radiant-fountain", "adventurers-inn"],
    theirs: [{ id: "wall-of-wood" }],
    checks: [
      "Cast Pest Mascot: a 2/3 with trample.",
      "Play Radiant Fountain: you gain 2 life and Pest Mascot gets one +1/+1 counter - one per life-gain event, not one per life.",
      "Pass a turn and play Adventurer's Inn: another single counter, so it is a 4/5.",
      "Attack into the 0/3 Wall of Wood: trample sends the excess through to Salty Mike.",
    ],
  },
  {
    cardId: "polluted-delta",
    setup: "Nothing but the fetchland. The library holds an Island and a Swamp.",
    checks: [
      "Play Polluted Delta and activate it: 1 life, sacrificed, search opens.",
      "It offers the Island and the Swamp only - no Forest.",
      "Take the Island: untapped, and it taps for {U} even though blue is outside your identity.",
    ],
  },
  {
    cardId: "profane-tutor",
    setup: "Two lands, which is exactly the suspend cost. The card has no mana cost of its own, so suspending is the only way to play it.",
    extraMana: { generic: 1, b: 1 },
    yourLibraryTop: ["hornet-queen"],
    checks: [
      "Try to cast Profane Tutor normally: it has no mana cost and cannot be cast.",
      "Suspend it for {1}{B}: it goes to exile with two time counters on it. Nothing goes on the stack and nothing triggers off a cast.",
      "Pass to your next upkeep: one time counter is removed, leaving one.",
      "Pass to the upkeep after that: the last counter comes off and the card is cast for free, in your upkeep - a step where a sorcery normally cannot be cast at all.",
      "The search finds any card, not just a creature. Take Hornet Queen into your hand.",
    ],
  },
  {
    cardId: "radiant-fountain",
    setup: "A Pest Mascot to show the life landing.",
    yours: [{ id: "pest-mascot" }],
    checks: [
      "Play Radiant Fountain: it enters untapped and you gain 2 life.",
      "Pest Mascot picks up one counter, not two - one life-gain event.",
      "Tap it for {C}.",
    ],
  },
  {
    cardId: "return-of-the-wildspeaker",
    setup:
      "Two non-Human creatures, the bigger a 6/4, and a Human beside them - Sedgemoor Witch - so the 'non-Human' clause has something to exclude.",
    yours: [{ id: "craw-wurm" }, { id: "grizzly-bears" }, { id: "sedgemoor-witch" }],
    theirs: [{ id: "wall-of-wood" }],
    checks: [
      "Cast Return of the Wildspeaker and take the first mode: you draw 6 - the greatest power among non-Human creatures, which is Craw Wurm.",
      "Reset and take the second mode: Craw Wurm and Grizzly Bears get +3/+3, Sedgemoor Witch does not. She is a Human Warlock.",
      "With the pump up, attack: the bonus is real in combat and gone at end of turn.",
      "It is an instant - cast it in Salty Mike's turn as well.",
    ],
  },
  {
    cardId: "revitalizing-repast",
    setup: "A creature to protect and a kill spell in hand to try it against.",
    yours: [{ id: "grizzly-bears" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast Revitalizing Repast for {B/G}: the hybrid pip is paid with either a Forest or a Swamp, your choice.",
      "Put the counter on Grizzly Bears: it becomes a 3/3.",
      "Cast Fell the Profane on it: it survives, it is indestructible until end of turn.",
      "Pass the turn and kill it again: it dies. The counter stays, the indestructible does not.",
      "Reset. Play the back face, Old-Growth Grove, as a land: it enters tapped and offers {B} and {G}.",
    ],
  },
  {
    cardId: "ribtruss-roaster",
    setup: "Three creatures to devour, of which you need only sacrifice as many as you like.",
    yours: [{ id: "grizzly-bears" }, { id: "essence-warden" }, { id: "sakura-tribe-elder" }],
    checks: [
      "Cast Ribtruss Roaster: as it enters you are offered the chance to sacrifice any number of creatures.",
      "Give up two: it arrives as a 3/3 with two +1/+1 counters, so a 5/5.",
      "Pass to your end step: two Pest tokens, one per counter.",
      "Reset and devour nothing: it arrives a plain 3/3 and its end step makes no tokens at all.",
      "Let a Pest token die: 1 life.",
    ],
  },
  {
    cardId: "ripples-of-undeath",
    setup: "Enough mana spare to pay the {1} on the trigger, and a library worth milling.",
    extraMana: { generic: 1 },
    yourLibraryTop: ["hornet-queen", "sol-ring", "blood-artist"],
    checks: [
      "Cast Ripples of Undeath. Nothing happens now - the trigger is on your *first main phase*, so it will not fire until your next turn.",
      "Pass two turns to reach your own first main phase: three cards are milled - Hornet Queen, Sol Ring, Blood Artist.",
      "You are then offered {1} and 3 life. Pay it and take one of those three cards into your hand.",
      "Reset and decline: the three cards stay in the graveyard and you keep the life.",
      "The card offered must be one of the three just milled, not any card in the graveyard.",
    ],
  },
  {
    cardId: "rishkars-expertise",
    setup:
      "A 6/4 as the biggest thing you control, and two cheap spells in hand for the free cast - one within the mana value limit and one over it.",
    yours: [{ id: "craw-wurm" }],
    yourHand: ["hornet-queen", "pest-mascot"],
    checks: [
      "Cast Rishkar's Expertise: you draw 6, the greatest power among creatures you control.",
      "You are then offered a free cast of a spell with mana value 5 or less from your hand. Pest Mascot (3) is offered; Hornet Queen (7) is not.",
      "Take Pest Mascot for free: no mana leaves your lands.",
      "Reset and decline the free cast: the draw still happened.",
      "It counts every creature you control, not only non-Humans - that is the other card.",
    ],
  },
  {
    cardId: "riveteers-overlook",
    setup: "Nothing but the land. The library holds basics for it to find.",
    checks: [
      "Play Riveteers Overlook: it arrives and immediately sacrifices itself.",
      "The search opens for a basic Swamp, Mountain or Forest. Take the Forest.",
      "The Forest arrives *tapped*, and you gain 1 life. Net effect: you traded a land drop for a tapped basic and 1 life.",
      "The Overlook itself is in your graveyard.",
      "It offers only basics - no Bayou, no dual.",
    ],
  },
  {
    cardId: "root-manipulation",
    setup: "Two creatures to pump and a blocker across the table, so both menace and the granted attack trigger can be seen.",
    yours: [{ id: "grizzly-bears" }, { id: "essence-warden" }],
    theirs: [{ id: "wall-of-wood" }, { id: "silvercoat-lion" }],
    checks: [
      "Cast Root Manipulation: Grizzly Bears is a 4/4 and Essence Warden a 3/3 until end of turn.",
      "Attack with both: try to block one with a single creature - refused, they have menace. Two blockers is legal.",
      "Each attacking creature also gains 'whenever this creature attacks, you gain 1 life' - so attacking with both gains you 2 life.",
      "Pass the turn: the pump, the menace and the granted trigger are all gone.",
      "A creature that arrives after the spell resolved gets nothing.",
    ],
    gaps: [
      "The card detail panel does not mention the granted attack trigger, though the engine grants it.",
    ],
  },
  {
    cardId: "sakura-tribe-elder",
    setup: "A blocker across the table so the classic use - block, then sacrifice - can be tried.",
    theirs: [{ id: "craw-wurm" }],
    checks: [
      "Cast Sakura-Tribe Elder: a 1/1 Snake.",
      "Sacrifice it: the search opens for a basic land, which arrives *tapped*, and the library is shuffled.",
      "The cost is only the sacrifice - no mana, no tap - so it works the turn it arrives despite summoning sickness.",
      "Reset. Pass the turn, block Craw Wurm with the Elder, then sacrifice it before damage: you still get the land and take no damage.",
      "It offers basics only.",
    ],
  },
  {
    cardId: "sapseep-forest",
    setup:
      "Two green creatures out, which is the two green permanents the ability wants. A Forest for the {G} the ability costs.",
    lands: ["forest"],
    yours: [{ id: "grizzly-bears" }, { id: "essence-warden" }],
    checks: [
      "Play Sapseep Forest: it enters tapped, so nothing can be done with it this turn.",
      "Pass a turn. Tap it for {G}.",
      "Reset that turn: instead pay {G} from the Forest and tap Sapseep Forest for the ability - you gain 1 life.",
      "Sapseep Forest is a Forest but it is not a green permanent. The two green permanents here are the creatures; a board with only one would refuse the ability.",
    ],
  },
  {
    cardId: "scheming-symmetry",
    setup: "Both libraries stocked, since both players search.",
    yourLibraryTop: ["hornet-queen"],
    theirLibraryTop: ["craw-wurm"],
    checks: [
      "Cast Scheming Symmetry: it asks for two target players. In a duel that is you and Salty Mike - both of you, not a choice of one.",
      "You search first: take Hornet Queen, and it goes on *top* of your library, not into your hand.",
      "Then Salty Mike searches: answer for him and put Craw Wurm on top of his.",
      "Draw for turn next turn: you get Hornet Queen off the top.",
      "Either player may decline their search and take nothing.",
    ],
  },
  {
    cardId: "scute-swarm",
    setup:
      "Four lands out and two more in hand, so the fifth land takes the Insect branch and the sixth takes the copy branch.",
    lands: ["forest", "forest", "forest", "swamp"],
    yourHand: ["forest", "swamp"],
    checks: [
      "Cast Scute Swarm: a 1/1.",
      "Play the Forest, taking you to five lands: a plain 1/1 green Insect token arrives. Fewer than six lands.",
      "Pass a turn and play the Swamp, taking you to six: this time you get a token that is a *copy* of Scute Swarm - a 1/1 Insect that itself has the landfall trigger.",
      "Play one more land with two Swarms out and both trigger: two copies.",
      "A land Salty Mike plays does nothing - it says 'a land you control'.",
    ],
  },
  {
    cardId: "sedgemoor-witch",
    setup:
      "An instant and a sorcery in your hand, one in Salty Mike's, and a removal spell in his hand to test ward.",
    yourHand: ["golgari-charm", "sylvan-tutor"],
    theirHand: ["fell-the-profane", "dark-ritual"],
    extraMana: { b: 1, g: 2 },
    checks: [
      "Cast Sedgemoor Witch: a 3/2 with menace and ward.",
      "Cast Golgari Charm: magecraft triggers and a Pest token arrives. Cast Sylvan Tutor: another. Both instants and sorceries count.",
      "Pass the turn and cast Dark Ritual from Salty Mike's hand: no token. It says 'whenever *you* cast'.",
      "Cast Fell the Profane from his hand targeting the Witch: he must pay 3 life or the spell is countered. Decline the payment and watch the spell get countered.",
      "Accept the payment instead: he goes to 37 and the Witch dies normally.",
      "Attack with the Witch: a single blocker is refused, two is allowed.",
    ],
    gaps: [
      "'Whenever you cast **or copy**' - nothing in the engine copies a spell yet, so the copy half cannot fire.",
    ],
  },
  {
    cardId: "send-in-the-pest",
    setup: "Two cards in Salty Mike's hand, so the discard has a choice to make.",
    theirHand: ["grizzly-bears", "dark-ritual"],
    checks: [
      "Cast Send in the Pest: Salty Mike is asked to discard, and *he* chooses which card - it is not random and it is not your choice.",
      "A 1/1 Pest token arrives for you.",
      "Attack with the Pest: you gain 1 life off its own trigger.",
      "That token's trigger is on attacking, not on dying - it is the other Pest token in this deck that gains life when it dies.",
    ],
  },
  {
    cardId: "shopkeepers-bane",
    setup: "A blocker across the table so trample and the attack trigger can be seen together. A Pest Mascot to catch the life gain.",
    yours: [{ id: "pest-mascot" }],
    theirs: [{ id: "wall-of-wood" }],
    checks: [
      "Cast Shopkeeper's Bane: a 4/2 with trample.",
      "It is summoning sick, so pass a turn before attacking.",
      "Attack: the trigger gains you 2 life, and Pest Mascot picks up a counter to prove it.",
      "Block it with the 0/3 Wall of Wood: 3 damage is assigned to the Wall and 1 tramples over to Salty Mike.",
      "The trigger is on attacking, so it fires even if the attack is blocked or the creature dies.",
    ],
  },
  {
    cardId: "skullclamp",
    setup: "Two creatures - a 1/1 that Skullclamp will kill outright, and a bigger one it will not. Fell the Profane in hand.",
    yours: [{ id: "essence-warden" }, { id: "grizzly-bears" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 3, b: 2 },
    checks: [
      "Cast Skullclamp for {1}.",
      "Equip it to Essence Warden for {1}: she is a 1/1, so +1/-1 makes her a 2/0 and she dies immediately - and you draw two cards.",
      "Reset. Equip Grizzly Bears instead: a 3/1. It survives.",
      "Cast Fell the Profane on the equipped Bears: it dies and you draw two.",
      "The buff reaches only the equipped creature: Essence Warden standing beside an equipped Bears is still a 1/1.",
      "Kill an unequipped creature: no draw. The trigger is 'whenever *equipped* creature dies'.",
      "Equip is sorcery speed - try it on Salty Mike's turn and it should be refused.",
    ],
    gaps: [
      "The card detail panel renders the buff as 'other creatures you control get +1/-1'. The engine scopes it correctly to the equipped creature; the wording is the renderer's.",
    ],
  },
  {
    cardId: "sol-ring",
    setup: "One land, and Hornet Queen in hand as somewhere for the mana to go.",
    yourHand: ["braids-arisen-nightmare"],
    checks: [
      "Cast Sol Ring for {1}.",
      "Tap it: two colourless mana at once, from one activation.",
      "An artifact has no summoning sickness - the mana is available the turn it arrives.",
      "Spend it: {C}{C} pays the generic part of a cost but cannot pay the {B}{B} of Braids.",
    ],
  },
  {
    cardId: "springheart-nantuko",
    setup:
      "A creature to bestow onto, four lands and two more in hand for the landfall triggers, and the extra {1}{G} the trigger asks for.",
    lands: ["forest", "forest", "swamp", "swamp"],
    yours: [{ id: "craw-wurm" }],
    yourHand: ["forest", "swamp"],
    checks: [
      "Cast Springheart Nantuko as a plain creature for {1}{G}: a 1/1 that also reads as an Enchantment.",
      "Play a land: it is not attached to anything, so you get a 1/1 green Insect token.",
      "Reset. Cast it bestowed for {1}{G}{1}{G} onto Craw Wurm: it is an Aura now, not a creature, and the Wurm is a 7/5.",
      "Play a land: you are offered {1}{G}. Pay it and you get a token copy of Craw Wurm - a whole 6/4.",
      "Reset that step and decline the payment: you get the 1/1 Insect instead. 'If you didn't' is the other half of the same clause.",
      "Kill the bestowed Nantuko's host: the Nantuko becomes a 1/1 creature on the battlefield rather than dying with it.",
    ],
  },
  {
    cardId: "springleaf-parade",
    setup: "Two spare lands so X can be 2, and a creature that is not a token to prove the granted ability is token-only.",
    yours: [{ id: "grizzly-bears" }],
    extraMana: { generic: 2 },
    checks: [
      "Cast Springleaf Parade with X = 2: two 1/1 colourless Shapeshifter tokens arrive.",
      "They have changeling, so they are every creature type - Blech's trigger should see them as Pests, and a Pest lord should pump them.",
      "Pass a turn, then tap a Shapeshifter token for mana: it can make any colour.",
      "Tap Grizzly Bears for mana: refused. The ability is granted to creature *tokens* only.",
      "Reset with X = 0: no tokens at all.",
    ],
    gaps: [
      "The card detail panel prints the static as an empty sentence ('Other creatures you control .'). The engine grants the mana ability correctly; the renderer has nothing to say about granted abilities.",
    ],
  },
  {
    cardId: "swamp",
    setup: "Nothing but the land.",
    checks: [
      "Play the Swamp: untapped, and it uses your land drop.",
      "Tap it for {B}.",
      "Its type line reads 'Basic Land - Swamp', which is what Tainted Wood and Woodland Cemetery are looking for.",
    ],
  },
  {
    cardId: "swarmyard",
    setup:
      "An Insect and a creature that is none of the four named types, plus a kill spell in hand to test the shield against.",
    yours: [{ id: "duskshell-crawler" }, { id: "grizzly-bears" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Play Swarmyard: untapped.",
      "Tap it for {C}.",
      "Reset. Tap it for the regeneration ability instead, targeting Duskshell Crawler: only Insects, Rats, Spiders and Squirrels are offered - Grizzly Bears is not.",
      "Cast Fell the Profane on the shielded Insect: it is not destroyed. Instead it taps, leaves combat and its damage is healed.",
      "Kill it a second time: the shield was used up, so this time it dies.",
    ],
  },
  {
    cardId: "sylvan-tutor",
    setup: "A library with creatures and noncreatures in it, so the filter can be seen working.",
    yourLibraryTop: ["sol-ring", "hornet-queen"],
    checks: [
      "Cast Sylvan Tutor: the search offers creature cards only. Sol Ring must not be offered.",
      "Take Hornet Queen: it goes on top of your library, not into your hand.",
      "Draw for turn next turn: you get it.",
      "You may decline and take nothing.",
    ],
  },
  {
    cardId: "tainted-strike",
    setup:
      "A creature of yours to make infectious, a blocker across the table for the creature-damage half, and Salty Mike's life total to poison.",
    yours: [{ id: "grizzly-bears" }],
    theirs: [{ id: "craw-wurm" }],
    checks: [
      "Cast Tainted Strike on Grizzly Bears: it is a 3/2 with infect until end of turn.",
      "Attack unblocked: Salty Mike's life does not move. He gets 3 poison counters instead.",
      "Reset. Attack and have Craw Wurm block: the Wurm takes three -1/-1 counters rather than 3 damage, becoming a 3/1.",
      "The -1/-1 counters are permanent - pass the turn and the Wurm is still a 3/1, while the infect itself has worn off.",
      "It can be cast on Salty Mike's creature too - the target is any creature.",
    ],
  },
  {
    cardId: "tainted-wood",
    setup: "A Forest out and a Swamp in hand, so the 'only if you control a Swamp' clause can be tested from both sides.",
    lands: ["forest"],
    yourHand: ["swamp"],
    checks: [
      "Play Tainted Wood: untapped.",
      "Tap it for {C}: allowed with no conditions.",
      "Reset. Try to tap it for {B} or {G} while you control no Swamp: refused.",
      "Pass a turn, play the Swamp, then tap Tainted Wood for {B}: now allowed.",
      "A Bayou or Overgrown Tomb would satisfy it too - they are Swamps as well as Forests.",
    ],
  },
  {
    cardId: "tend-the-pests",
    setup: "A 6/4 and a 2/2, so the number of Pests is visibly the sacrificed creature's power.",
    yours: [{ id: "craw-wurm" }, { id: "grizzly-bears" }],
    checks: [
      "Cast Tend the Pests: before anything else you are asked which creature to sacrifice. That is an additional cost, so it is paid before the spell is even on the stack.",
      "Give up Craw Wurm: six Pest tokens.",
      "Reset and give up Grizzly Bears: two Pest tokens. X is power, not mana value.",
      "Reset with no creature you are willing to give up: cancelling means the spell is never cast at all, and no mana is spent.",
      "Let a Pest token die: 1 life each.",
      "It is an instant - cast it in Salty Mike's turn, or in response to his removal, and the creature is still sacrificed first.",
    ],
  },
  {
    cardId: "the-meathook-massacre",
    setup:
      "Creatures of several sizes on both sides so -X/-X can be judged, plus the spare mana for X = 2.",
    yours: [{ id: "essence-warden" }, { id: "grizzly-bears" }, { id: "craw-wurm" }],
    theirs: [{ id: "birds-of-paradise" }, { id: "silvercoat-lion" }],
    extraMana: { generic: 2 },
    checks: [
      "Cast The Meathook Massacre with X = 2: the cost is {2}{B}{B}.",
      "Every creature gets -2/-2. Essence Warden, Birds of Paradise and Silvercoat Lion die; Grizzly Bears and Craw Wurm live. It hits your own board too.",
      "As your creatures died, Salty Mike lost 1 life for each. As his died, you gained 1 for each.",
      "The X stays defined after the spell resolves - the enchantment does not re-apply it later, but the arrival trigger used the right number.",
      "Kill something else later: the two death triggers keep working for the rest of the game.",
    ],
  },
  {
    cardId: "the-ozolith",
    setup:
      "A creature carrying two counters and a kill spell in hand, so the counters can be made to leave the battlefield.",
    yours: [{ id: "grizzly-bears", counters: 2 }, { id: "essence-warden" }],
    yourHand: ["fell-the-profane"],
    extraMana: { generic: 2, b: 2 },
    checks: [
      "Cast The Ozolith for {1}.",
      "Cast Fell the Profane on your own Grizzly Bears: it dies with two counters on it, and those two counters move onto The Ozolith.",
      "Pass a turn to reach your beginning of combat: you are offered the chance to move all counters onto a target creature. Take it and point at Essence Warden - she becomes a 3/3.",
      "The Ozolith now has no counters, so next turn's beginning of combat offers nothing.",
      "Reset. Kill a creature with no counters on it: nothing moves. It says 'if it had counters on it'.",
      "Decline the move once: it is 'you may', and the counters stay on The Ozolith.",
    ],
  },
  {
    cardId: "toxic-deluge",
    setup: "Creatures of several sizes on both sides, and 40 life to spend.",
    yours: [{ id: "essence-warden" }, { id: "grizzly-bears" }, { id: "craw-wurm" }],
    theirs: [{ id: "birds-of-paradise" }, { id: "silvercoat-lion" }],
    checks: [
      "Cast Toxic Deluge: before the spell is on the stack you are asked how much life to pay. That is the additional cost, and it sets X.",
      "Pay 3: you go to 37 and every creature gets -3/-3. Only Craw Wurm survives.",
      "The life is paid as a cost, so it happens even if the spell is somehow countered.",
      "Reset and pay 0: legal, and nothing dies.",
      "It hits your creatures as well as his - 'all creatures'.",
    ],
  },
  {
    cardId: "twilight-mire",
    setup: "A Forest out, because the filter ability needs a black or green source to pay for it.",
    lands: ["forest"],
    checks: [
      "Play Twilight Mire: untapped.",
      "Tap it for {C}: one colourless.",
      "Reset. Tap the Forest for {G}, then pay that {G} and tap the Mire: you are offered three outputs - {B}{B}, {B}{G} and {G}{G}. Take {B}{B}.",
      "That is the point of the card: one green mana in, two black out.",
      "The {B/G} in the cost can be paid with either colour.",
    ],
  },
  {
    cardId: "twitching-doll",
    setup: "A second Doll already in play, since both of its abilities need {T} and a fresh one is summoning sick.",
    yours: [{ id: "twitching-doll" }],
    checks: [
      "Cast Twitching Doll for {1}{G}: a 2/2 artifact creature.",
      "Tap the one already out for mana: any colour, and it also gets a nest counter.",
      "Pass a turn so it untaps, and tap it for mana again: a second counter.",
      "Pass another turn, then tap and sacrifice it: a 2/2 Spider with reach for each counter on it - two here.",
      "That ability is sorcery-speed only: try it during Salty Mike's turn and it should be refused.",
      "The counters are nest counters, not +1/+1 - the Doll stays a 2/2 the whole time.",
    ],
  },
  {
    cardId: "underground-mortuary",
    setup: "A library worth looking at, since surveil shows you the top card.",
    yourLibraryTop: ["hornet-queen"],
    checks: [
      "Play Underground Mortuary: it enters tapped.",
      "Surveil 1 triggers: you are shown Hornet Queen and choose whether to bin it. Put it in the graveyard.",
      "Reset and keep it on top instead: draw next turn and you get it.",
      "Pass a turn: the land untaps and offers {B} and {G}.",
      "Its type line reads 'Land - Swamp Forest'.",
    ],
  },
  {
    cardId: "undergrowth-stadium",
    setup: "Nothing but the land. This is a two-player game, which is the whole point of the check.",
    checks: [
      "Play Undergrowth Stadium: it enters tapped, because you have one opponent and it wants two or more.",
      "Pass a turn: it untaps and offers {B} and {G}.",
    ],
    gaps: [
      "The untapped branch cannot be reached in a duel - it needs a three-player game, which the client does not build yet.",
    ],
  },
  {
    cardId: "verdant-catacombs",
    setup: "Nothing but the fetchland.",
    checks: [
      "Play Verdant Catacombs and activate it: 1 life paid, land sacrificed, search opens.",
      "It offers the Swamp and the Forest only - no Plains, Island or Mountain.",
      "Take either: it arrives untapped and can be tapped the same turn.",
      "A Bayou would also be a legal find, being both a Swamp and a Forest - check whether one in the library is offered.",
    ],
  },
  {
    cardId: "wastewood-verge",
    setup: "No other lands, and a Forest in hand, so the conditional half can be tested from both sides.",
    lands: [],
    yourHand: ["forest"],
    checks: [
      "Play Wastewood Verge: untapped.",
      "Tap it for {G}: allowed unconditionally.",
      "Reset. Try to tap it for {B} while you control no Swamp and no Forest: refused.",
      "Pass a turn, play the Forest, then tap the Verge for {B}: now allowed.",
      "Wastewood Verge is not itself a Forest, which is why it cannot satisfy its own condition.",
    ],
  },
  {
    cardId: "winding-constrictor",
    setup:
      "A creature to receive counters and two ways to put them there - Revitalizing Repast in hand, and Duskshell Crawler's arrival trigger.",
    yours: [{ id: "grizzly-bears" }],
    yourHand: ["revitalizing-repast", "duskshell-crawler"],
    extraMana: { generic: 1, g: 2 },
    checks: [
      "Cast Winding Constrictor: a 2/3 Snake.",
      "Cast Revitalizing Repast on Grizzly Bears: two counters arrive instead of one, so it is a 4/4.",
      "Cast Duskshell Crawler and put its counter on Grizzly Bears: two more, taking it to 6/6.",
      "It covers artifacts as well as creatures - put a counter on The Ozolith and check you get two.",
      "It only covers permanents *you* control: a counter Salty Mike puts on his own creature is unaffected.",
    ],
    gaps: [
      "'If you would get one or more counters, you get that many plus one' - counters on a *player* (poison, experience) are not modelled, so that second line does nothing.",
    ],
  },
  {
    cardId: "windswept-heath",
    setup: "Nothing but the fetchland.",
    checks: [
      "Play Windswept Heath and activate it: 1 life, sacrificed, search opens.",
      "It offers the Forest and the Plains only.",
      "Take the Plains: it arrives untapped and taps for {W}, outside your identity, which is fine in play.",
    ],
  },
  {
    cardId: "wooded-foothills",
    setup: "Nothing but the fetchland.",
    checks: [
      "Play Wooded Foothills and activate it: 1 life, sacrificed, search opens.",
      "It offers the Mountain and the Forest only.",
      "Take the Forest: untapped, usable at once.",
      "The life payment is part of the cost, so it happens even with nothing to find.",
    ],
  },
  {
    cardId: "woodland-cemetery",
    setup: "No other lands, and a Swamp in hand, so both halves of the condition can be reached.",
    lands: [],
    yourHand: ["swamp"],
    checks: [
      "Play Woodland Cemetery while you control no Swamp and no Forest: it enters tapped.",
      "Reset. Play the Swamp first, pass a turn, then play Woodland Cemetery: it enters untapped.",
      "Tap it: it offers {B} and {G}.",
      "It asks for a Swamp or a Forest by type, so a Bayou satisfies it as well as a basic.",
    ],
  },
];

/** Every card the lab covers, in the order they are walked. */
export const LAB_CARD_IDS: string[] = LAB_SCENARIOS.map((s) => s.cardId);

export function labScenarioFor(cardId: string): LabScenario | undefined {
  return LAB_SCENARIOS.find((s) => s.cardId === cardId);
}
