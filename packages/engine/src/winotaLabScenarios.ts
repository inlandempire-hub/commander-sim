import type { LabScenario } from "./cardLab.js";

/**
 * One scenario per card in the Winota, Joiner of Forces list - the board each
 * card needs in order to be put through its whole text, and the list of what to
 * try on it.
 *
 * Read `checks` as instructions, not assertions. Each line is one clause of the
 * card: what to do, and what should happen if the engine has it right. A line
 * that fails is a bug to write down, except where `gaps` already says the engine
 * does not model that clause.
 *
 * Order follows the decklist (commander first, then alphabetical) so walking the
 * lab front to back walks the deck.
 *
 * Three habits worth knowing before you start, on top of the two the Blech list
 * teaches (reset is part of the method; you control both seats):
 *
 * - **Most of this deck happens in combat.** Winota, Ainok Strike Leader, Anim
 *   Pakal, Legion Warboss and half a dozen others do nothing at all in a main
 *   phase. Getting to declare-attackers is the first step of most of these
 *   boards, not an afterthought.
 * - **"Non-Human" is the deck's whole point**, and it is easy to test the wrong
 *   half. Every board that involves Winota carries both a Human and a non-Human
 *   for that reason: a trigger that fires on both is as broken as one that fires
 *   on neither.
 * - **The hate pieces bind you too.** Archon of Emeria, Deafening Silence and
 *   Ethersworn Canonist all say "each player", so the board that tests them is
 *   one where your own second spell is refused. That is the card working.
 */
export const WINOTA_LAB_SCENARIOS: LabScenario[] = [
  {
    cardId: "winota-joiner-of-forces",
    fromCommandZone: true,
    setup:
      "Winota in the command zone, with a non-Human and a Human already out to attack with, and Humans waiting on top of your library to find.",
    yours: [{ id: "ragavan-nimble-pilferer" }, { id: "ocelot-pride" }, { id: "mother-of-runes" }],
    yourLibraryTop: ["myrel-shield-of-argive", "boromir-warden-of-the-tower", "mountain", "grand-abolisher"],
    checks: [
      "Cast Winota from the command zone for {2}{R}{W}. Winota arrives as a 4/4 Human Warrior.",
      "Attack with Ragavan alone. Ragavan is a Monkey Pirate, so the trigger fires: you are shown the top six cards and offered the Human creature cards among them.",
      "Take Myrel: Myrel arrives tapped and attacking, already in the combat, without being cast and without paying {3}{W}.",
      "Myrel has indestructible until end of turn - block Myrel with something that would kill a 3/4 and the creature survives.",
      "The cards you did not take go to the bottom of your library, not back on top. Look at the top afterwards: it is not the card you saw.",
      "Reset. Attack with Mother of Runes alone: no trigger at all. It is a Human, and the ability says non-Human.",
      "Reset. Attack with Ragavan and Ocelot Pride together: two separate triggers, one per non-Human attacker, each looking at six cards of its own.",
      "Reset. Attack with Winota: Winota is a Human too, and so does not trigger this ability at all.",
    ],
  },
  {
    cardId: "ainok-strike-leader",
    commanderInPlay: true,
    setup:
      "Winota already on the battlefield and a second Ainok Strike Leader already out, since the one you cast this turn cannot attack. Ocelot Pride is the creature that is neither.",
    yours: [{ id: "ainok-strike-leader" }, { id: "ocelot-pride" }],
    checks: [
      "Cast Ainok Strike Leader for {1}{W}: a 2/2 Dog Warrior.",
      "Attack with the Ainok that was already out. The trigger fires and a 1/1 red Goblin token arrives tapped and attacking Salty Mike - already in the combat, not waiting for the next one.",
      "Reset. Attack with Winota alone: the trigger fires again. 'This creature and/or your commander' means either one on its own is enough.",
      "Reset. Attack with Ocelot Pride alone: no trigger. It is neither the Ainok nor your commander.",
      "Reset. Attack with the Ainok and Winota together: one trigger, not two. It is a single 'whenever you attack with' ability, not one per attacker.",
      "Sacrifice the Ainok: the Goblin token gains indestructible until end of turn. Ocelot Pride does not - the ability says creature tokens.",
    ],
  },
  {
    cardId: "ajani-nacatl-pariah",
    setup:
      "Ocelot Pride out as another Cat, and Goblin Cratermaker out as the way to kill it. Ajani only transforms when a Cat that is not him dies.",
    yours: [{ id: "ocelot-pride" }, { id: "goblin-cratermaker" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Ajani, Nacatl Pariah for {1}{W}: a 1/2 Cat Warrior, and his enter trigger makes a 2/1 white Cat Warrior token.",
      "Activate Goblin Cratermaker and destroy the Cat token. Ajani's second trigger goes on the stack, and it is a 'may'.",
      "Decline it: Ajani stays a creature. That is the branch that is easy to leave untested.",
      "Reset and take it: Ajani is exiled and returns transformed as Ajani, Nacatl Avenger - a planeswalker with 3 loyalty, and a new object, so he is untapped and has nothing on him.",
      "Reset. Kill Ajani himself instead: no trigger. The ability says 'other Cats'.",
      "On the back face, +2: a +1/+1 counter on each Cat you control - Ocelot Pride gets one, Goblin Cratermaker does not.",
      "0: another 2/1 Cat Warrior token, and because you control a red permanent (the Cratermaker), Ajani deals damage equal to the number of creatures you control to any target. Count your creatures first and check the number matches.",
      "Reset with no red permanent out and use 0 again: the token still arrives, the damage does not. The rider is conditional, not part of the token.",
      "-4: each opponent keeps one artifact, one creature, one enchantment and one planeswalker and sacrifices the rest. Give Salty Mike two creatures first so there is a real choice, and note that he chooses, not you.",
    ],
  },
  {
    cardId: "alseid-of-lifes-bounty",
    setup:
      "A creature and an enchantment of your own to protect, and a red creature across the table to test the protection against.",
    yours: [{ id: "goblin-rabblemaster" }, { id: "high-noon" }],
    theirs: [{ id: "goblin-cratermaker" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Alseid of Life's Bounty for {W}: a 1/1 that is both an Enchantment and a Creature, with lifelink.",
      "Activate it: {1} and sacrifice it, targeting Goblin Rabblemaster. You are asked to choose a colour - take red.",
      "Salty Mike's red Goblin Cratermaker can no longer damage, block or target the Rabblemaster.",
      "Reset. Target High Noon instead: an enchantment you control is a legal target, which is the half of the card people forget.",
      "Reset. Try to target Salty Mike's Cratermaker: refused. It says 'you control'.",
      "Reset. Attack with Alseid itself on a later turn: lifelink gains you life when Alseid deals the damage, which is the clause the sacrifice ability tempts you never to see.",
      "The protection is until end of turn only - pass the turn and check it has gone.",
    ],
  },
  {
    cardId: "ancient-tomb",
    setup: "Nothing but the land itself. Sol Ring in hand as somewhere for two colourless to go.",
    yourHand: ["sol-ring"],
    checks: [
      "Play Ancient Tomb: it enters untapped.",
      "Tap it: two colourless mana in the pool at once, from one tap, and you take 2 damage for it. Your life goes to 38.",
      "Cast Sol Ring with the two colourless: {1} generic is paid happily by colourless mana.",
      "Reset and try to pay a coloured pip with it - the mana is {C}, and no amount of it makes white.",
    ],
  },
  {
    cardId: "angraths-marauders",
    setup:
      "A creature to attack with and a burn spell in hand, because the doubling applies to any damage from a source you control, not only combat damage.",
    yours: [{ id: "goblin-rabblemaster" }],
    theirs: [{ id: "grand-abolisher" }],
    checks: [
      "Cast Angrath's Marauders for {5}{R}{R}: a 4/4 Human Pirate.",
      "Attack with Goblin Rabblemaster and let it through: a 2/2 deals 4. The doubling replaces the damage, so the creature's printed power does not change.",
      "Reset. Block the Rabblemaster with Grand Abolisher: it deals 4 to the blocker as well - a permanent counts, not just a player.",
      "Attack with the Marauders themselves on a later turn: 8, not 4. It doubles its own damage too.",
      "Have Salty Mike attack you with Grand Abolisher: you take 2, not 4. It reads 'a source you control'.",
    ],
  },
  {
    cardId: "anim-pakal-thousandth-moon",
    setup:
      "A non-Gnome already out to attack with, since Anim Pakal cannot attack the turn it arrives, and a second copy already on the battlefield to carry the counters.",
    yours: [{ id: "anim-pakal-thousandth-moon" }, { id: "ragavan-nimble-pilferer" }],
    checks: [
      "Cast Anim Pakal for {1}{R}{W}: a 1/2 Human Soldier.",
      "Attack with Ragavan. The Anim Pakal that was already out gets a +1/+1 counter *first*, and then makes X Gnome tokens where X is the number of counters on it - so one Gnome, not zero.",
      "The Gnomes arrive tapped and attacking, and they are 1/1 colourless Gnome artifact creatures.",
      "Attack again next turn: a second counter, and now two Gnomes. The order of the two halves is the whole card - counter, then count.",
      "Attack with only a Gnome token: no trigger. Gnomes are exactly what the ability excludes.",
      "Attack with Ragavan and a Gnome together: it triggers once. 'One or more non-Gnome creatures' is one trigger for the batch.",
    ],
  },
  {
    cardId: "arcane-signet",
    setup: "Nothing but the Signet. Winota's identity is Boros, which is what the Signet reads off.",
    checks: [
      "Cast Arcane Signet for {2}.",
      "Tap it: the picker offers {R} and {W} and nothing else. Your commander's colour identity is the whole list, not the five colours.",
      "Take {R} and spend it. Reset and take {W}.",
      "It has no summoning sickness to wait out - an artifact that is not a creature can be tapped the turn it arrives.",
    ],
  },
  {
    cardId: "archivist-of-oghma",
    setup:
      "A fetchland on Salty Mike's side, because the trigger needs an opponent to search and a fetchland is the cheapest way to make one.",
    theirs: [{ id: "arid-mesa" }],
    checks: [
      "Cast the Archivist for {1}{W}: a 2/2 Halfling Cleric with flash.",
      "Reset and cast it on Salty Mike's turn instead, with the mana held up. Flash is the reason this card is in the deck and it is the clause most easily left untried.",
      "Crack Salty Mike's Arid Mesa: you gain 1 life and draw a card. Both halves, off his search.",
      "Search your own library for something: no trigger. It watches opponents only.",
    ],
  },
  {
    cardId: "archon-of-emeria",
    setup:
      "Two cheap spells in your hand, because the clause that matters most is the one that stops your own second spell. A nonbasic land in Salty Mike's hand for the other half.",
    yourHand: ["lotus-petal", "ornithopter"],
    theirHand: ["command-tower"],
    checks: [
      "Cast Archon of Emeria for {2}{W}: a 2/3 with flying.",
      "That was your one spell for the turn. Try to cast Lotus Petal: refused. 'Each player' includes you, and this is the line that makes the card a real cost to play.",
      "Pass the turn and cast Ornithopter: allowed. The limit is per turn, not per game.",
      "On Salty Mike's turn, have him play Command Tower: it enters tapped.",
      "Have him play a basic instead: it enters untapped. The clause says nonbasic.",
    ],
  },
  {
    cardId: "arid-mesa",
    setup: "Nothing but the land. The pile under your library holds a basic of every type for it to find.",
    checks: [
      "Play Arid Mesa: it enters untapped, and it makes no mana on its own.",
      "Activate it: tap, pay 1 life, sacrifice it. You are offered a search of your library.",
      "The list is Mountains and Plains only - the Forest, Island and Swamp in there are not on offer.",
      "Take the Plains: it arrives on the battlefield untapped, and your library is shuffled afterwards.",
      "Your life is 39. The 1 life is part of the cost, so it is paid even though nothing else about the card mentions life.",
      "Reset and decline the search: the land is still sacrificed and the life still paid. A cost is not a 'may'.",
    ],
  },
  {
    cardId: "aven-mindcensor",
    setup:
      "A fetchland on Salty Mike's side to make him search, and one of your own so you can see that your searches are untouched.",
    theirs: [{ id: "arid-mesa" }],
    yours: [{ id: "marsh-flats" }],
    checks: [
      "Cast Aven Mindcensor for {2}{W}: a 2/1 Bird Wizard with flying.",
      "Reset and cast it with flash, on Salty Mike's turn in response to him cracking the fetchland. That is how the card is actually played and it is the line worth proving.",
      "Crack Salty Mike's Arid Mesa: he is shown four cards, not his whole library. Count them.",
      "If none of those four is a Mountain or Plains he finds nothing - which is the card working, not a bug.",
      "Crack your own Marsh Flats: you see the whole library. It says 'an opponent'.",
    ],
  },
  {
    cardId: "battlefield-forge",
    setup: "Nothing but the land itself.",
    checks: [
      "Play Battlefield Forge: it enters untapped.",
      "Tap it and the picker offers three abilities: {C}, {R} and {W}.",
      "Take {C}: no damage. Your life stays at 40, which is the whole point of the first ability.",
      "Reset and take {R}: one red mana and 1 damage to you.",
      "Reset and take {W}: the same, in white. The pain is on the coloured halves only.",
    ],
  },
  {
    cardId: "blade-historian",
    setup:
      "Two creatures already out - one to attack with and one to leave home - and a blocker across the table so double strike has something to hit twice.",
    yours: [{ id: "goblin-rabblemaster" }, { id: "mother-of-runes" }],
    theirs: [{ id: "phyrexian-walker" }],
    checks: [
      "Cast Blade Historian for {R/W}{R/W}{R/W}{R/W}. Every pip can be paid with either colour - pay some with Plains and some with Mountains and check it is happy either way.",
      "Attack with Goblin Rabblemaster: it has double strike while it is attacking.",
      "Block it with Phyrexian Walker (0/3): the Rabblemaster deals 2 in first strike and 2 again in the normal step, so the 0/3 dies.",
      "Mother of Runes, sitting at home, does not have double strike. The buff says attacking creatures.",
      "Attack with Blade Historian itself: it has double strike too - 'creatures you control' includes it.",
      "Pass the turn and have Salty Mike attack: his attackers get nothing. It is your creatures only.",
    ],
  },
  {
    cardId: "blinkmoth-nexus",
    setup: "A second Blinkmoth Nexus already out, since the one you play this turn can be animated but the pump ability needs a target.",
    yours: [{ id: "blinkmoth-nexus" }],
    extraMana: { generic: 3 },
    checks: [
      "Play Blinkmoth Nexus: it enters untapped and taps for {C}.",
      "Pay {1} to animate the one that was already out: a 1/1 Blinkmoth artifact creature with flying, and it is still a land - check the type line says both.",
      "It can attack, because it has been in play since before this turn. Animate the one you just played and try to attack with it: refused, it is a creature that came under your control this turn.",
      "Pay {1} and tap the animated one: target Blinkmoth gets +1/+1. Point it at itself for a 2/2.",
      "The pump ability targets Blinkmoths only - with nothing animated there is nothing to point it at.",
      "Pass the turn: the animation wears off and it is a plain land again, with no damage carried over.",
    ],
  },
  {
    cardId: "boromir-warden-of-the-tower",
    setup:
      "Two spells in Salty Mike's hand: an Ornithopter, which costs nothing at all, and a Lotus Petal he can pay for. That is the only difference the trigger cares about.",
    theirHand: ["ornithopter", "phyrexian-walker"],
    yours: [{ id: "ocelot-pride" }],
    checks: [
      "Cast Boromir for {2}{W}: a 3/3 Human Soldier with vigilance.",
      "Attack with him and check he does not tap. Vigilance is the easiest clause to forget on a card with this much text.",
      "On Salty Mike's turn, have him cast Ornithopter. No mana was spent, so Boromir counters it - and the trigger is not a 'may'.",
      "Have him cast Phyrexian Walker the same way: also {0}, also countered. It is about mana spent, not about the card.",
      "Give him a Mountain and have him cast something he actually pays for: not countered.",
      "Sacrifice Boromir: your creatures gain indestructible until end of turn, and The Ring tempts you.",
      "Ocelot Pride is now your Ring-bearer: it is legendary, and it cannot be blocked by creatures with greater power. Check both.",
      "Tempt yourself again later and the second ability lands on top of the first - the Ring levels up, it does not restart.",
    ],
  },
  {
    cardId: "cathar-commando",
    setup: "An artifact and an enchantment on Salty Mike's side, one for each half of the target line, and a creature that is neither.",
    theirs: [{ id: "sol-ring" }, { id: "deafening-silence" }, { id: "phyrexian-walker" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Cathar Commando for {1}{W}: a 3/1 Human Soldier.",
      "Reset and cast it with flash on Salty Mike's turn instead - as a surprise blocker, which is half of why the card is in the deck.",
      "Activate it: {1} and sacrifice it, destroying Sol Ring.",
      "Reset and destroy Deafening Silence instead: an enchantment is the other half of the target line.",
      "Reset and try to point it at Phyrexian Walker: refused. An artifact *creature* is a legal target, a plain creature is not - note that the Walker is both, so use a non-artifact creature to see the refusal.",
    ],
  },
  {
    cardId: "cavern-of-souls",
    setup:
      "A Human and a non-Human in your hand to spend the mana on, and a Counterspell plus two Islands on Salty Mike's side so 'can't be countered' can actually be tried.",
    yourHand: ["myrel-shield-of-argive", "ragavan-nimble-pilferer"],
    theirs: [{ id: "island" }, { id: "island" }],
    theirHand: ["counterspell"],
    extraMana: { generic: 3 },
    checks: [
      "Play Cavern of Souls: as it enters you are asked to name a creature type. Choose Human.",
      "Tap it for {C}: that ability is unrestricted and always available.",
      "Reset. Tap it for {W} instead and cast Myrel with it: allowed, Myrel is a Human.",
      "Reset. Try to spend the {W} on Ragavan: refused. He is a Monkey Pirate, and the mana is only for the chosen type.",
      "Cast Myrel with Cavern mana and have Salty Mike answer with Counterspell: it cannot counter the spell.",
      "Reset, name Monkey instead, and check the whole thing points the other way - Ragavan is now the one who can be paid for and cannot be countered.",
    ],
  },
  {
    cardId: "charismatic-conqueror",
    setup:
      "A creature and an artifact in Salty Mike's hand, and a land, so all three kinds of permanent can be walked past the trigger.",
    theirHand: ["phyrexian-walker", "sol-ring", "mountain"],
    theirs: [{ id: "mountain" }, { id: "mountain" }],
    checks: [
      "Cast Charismatic Conqueror for {1}{W}: a 2/2 Vampire Soldier with vigilance.",
      "On Salty Mike's turn, have him cast Phyrexian Walker. It enters untapped, so the trigger fires and *he* is offered the choice to tap it.",
      "Have him decline: you create a 1/1 white Vampire token with lifelink.",
      "Reset and have him accept: the Walker taps and you get nothing. Both branches are the card.",
      "Have him play Sol Ring: an artifact triggers it just as a creature does.",
      "Have him play a land: no trigger. Lands are on neither list.",
      "Cast a creature of your own: no trigger. It watches permanents an opponent controls.",
    ],
  },
  {
    cardId: "chrome-mox",
    setup:
      "Three cards in hand for the imprint to choose between: a white spell, a red one, and an artifact that is not a legal choice at all.",
    yourHand: ["swords-to-plowshares", "pyroblast", "sol-ring"],
    checks: [
      "Cast Chrome Mox for {0}. Its enter trigger offers you a card from your hand to exile, and it is a 'may'.",
      "Decline it: the Mox stays on the battlefield making nothing at all. That is the branch that catches people out and it is a legal line.",
      "Reset and exile Swords to Plowshares: tap the Mox and it makes {W}, and only {W}.",
      "Reset and exile Pyroblast instead: now the same Mox makes {R}. The colour is the exiled card's, so two Moxen side by side can make different colours.",
      "Sol Ring is not on offer either time - the imprint says nonartifact, nonland.",
      "The exiled card is gone for good: check it is not in your hand or graveyard afterwards.",
    ],
  },
  {
    cardId: "city-of-brass",
    setup: "Nothing but the land. A Human in hand as somewhere for the mana to go.",
    yourHand: ["myrel-shield-of-argive"],
    checks: [
      "Play City of Brass: it enters untapped, and nothing happens yet. The damage is on tapping, not on entering.",
      "Tap it: the picker offers all five colours - including the three outside your commander's identity, which a mana ability is allowed to make.",
      "You take 1 damage as it taps. Your life is 39.",
      "Take {U} and try to spend it on something: the mana is real, even though nothing in this deck wants blue.",
      "It hurts whenever it *becomes tapped*, not only when you tap it for mana - which is the wording, and it is why the trigger is where it is.",
    ],
  },
  {
    cardId: "city-of-traitors",
    setup: "A second land in hand, since the whole card is what happens when you play one.",
    yourHand: ["mountain"],
    checks: [
      "Play City of Traitors: it enters untapped.",
      "Tap it: two colourless mana from one tap, and no damage - this is the Ancient Tomb effect without the pain and with a much worse drawback.",
      "Pass the turn, then play the Mountain: City of Traitors is sacrificed. The trigger is not optional.",
      "Reset and play nothing at all: it stays. The cost is a land drop, not a turn.",
      "It triggers on *another* land, so it does not sacrifice itself as it enters.",
    ],
  },
  {
    cardId: "clarion-conqueror",
    setup:
      "One of each thing the Conqueror switches off and one it does not: an artifact that makes mana, a creature with an ability, and a land, which is untouched.",
    yours: [{ id: "sol-ring" }, { id: "blinkmoth-nexus" }, { id: "goblin-cratermaker" }],
    checks: [
      "Cast Clarion Conqueror for {2}{W}: a 3/3 Dragon with flying.",
      "Try to tap Sol Ring for mana: refused. A mana ability is an activated ability, and this is the clause that makes the card a real cost to your own board.",
      "Try to activate Goblin Cratermaker: refused as well.",
      "Tap a Plains: fine. Lands are not on the list, which is exactly why this deck can play the card.",
      "Blinkmoth Nexus is the interesting one: its animate ability is a land's, so it still works - but once it is animated it is a creature, and the pump ability on it is then switched off.",
      "It says 'each player', so check it binds Salty Mike too: give him a Sol Ring and try to tap it on his turn.",
    ],
  },
  {
    cardId: "clifftop-retreat",
    setup: "Nothing on the battlefield, so the first branch is the untested one - it enters tapped when you have nothing.",
    lands: [],
    checks: [
      "Play Clifftop Retreat with an empty battlefield: it enters tapped.",
      "Reset. Play a Mountain first, then the Retreat: it enters untapped.",
      "Reset. Play a Plains first instead: also untapped. Either subtype satisfies it.",
      "Note it is a subtype question, not a colour one - Sacred Foundry is a Mountain Plains and would also do it, while a Command Tower would not.",
      "Once it is untapped, tap it: the picker offers {R} and {W}.",
    ],
  },
  {
    cardId: "combat-celebrant",
    setup:
      "Two other creatures already out, tapped, so that 'untap all other creatures' has something visible to do.",
    yours: [{ id: "goblin-rabblemaster", tapped: true }, { id: "mother-of-runes", tapped: true }],
    checks: [
      "Cast Combat Celebrant for {2}{R}: a 4/1 Human Warrior. It cannot attack this turn, so pass a turn before the rest of this.",
      "Attack with the Celebrant: you are offered the exert. It is a 'may', so try declining it once - the attack still happens and nothing else does.",
      "Reset and exert it: all your other creatures untap - the Rabblemaster and Mother of Runes stand back up, in the middle of combat, able to attack in the extra phase.",
      "After this combat phase there is an additional one. Get to it and attack again with the creatures that just untapped.",
      "The Celebrant itself does not untap - it is the exerted one - and it will not untap in your next untap step either. Pass a turn and check it is still tapped.",
      "In the second combat, try to exert it again: refused. Once per turn is the whole restraint on the card.",
    ],
  },
  {
    cardId: "command-tower",
    setup: "Nothing but the land. Winota's identity is what it reads off.",
    checks: [
      "Play Command Tower: it enters untapped.",
      "Tap it: the picker offers {R} and {W} and nothing else.",
      "That is the commander's colour identity, not the deck's contents - it would offer the same two if your library were mono-white.",
    ],
  },
  {
    cardId: "deafening-silence",
    setup:
      "A creature and two noncreature spells in your hand, because the clause only bites the second noncreature spell and you need to see it not biting the creature.",
    yourHand: ["ornithopter", "lotus-petal", "swords-to-plowshares"],
    checks: [
      "Cast Deafening Silence for {W}: that was your one noncreature spell for the turn.",
      "Try to cast Lotus Petal: refused. 'Each player' includes you.",
      "Cast Ornithopter instead: allowed. It is a creature spell, and creature spells are not limited at all - which is why this deck can play the card.",
      "Pass the turn and cast Lotus Petal: allowed. The limit is per turn.",
      "On Salty Mike's turn, have him cast two noncreature spells: the second is refused.",
    ],
  },
  {
    cardId: "deflecting-swat",
    commanderInPlay: true,
    uncastableOnOpen:
      "It targets a spell or ability, and a lab board never opens with one on the stack - the first check puts one there.",
    setup:
      "Winota on the battlefield so the free cast is available, and a removal spell in Salty Mike's hand pointed at something of yours, so there is a target worth re-pointing.",
    yours: [{ id: "ocelot-pride" }, { id: "goblin-rabblemaster" }],
    theirs: [{ id: "plains" }, { id: "phyrexian-walker" }],
    theirHand: ["swords-to-plowshares"],
    checks: [
      "Have Salty Mike cast Swords to Plowshares on your Ocelot Pride.",
      "In response, cast Deflecting Swat without paying its mana cost - you control a commander, so the alternative cost is available. Check no mana leaves your pool.",
      "Choose new targets for the Swords: point it at his own Phyrexian Walker instead. It resolves and exiles his creature.",
      "Reset. Cast Deflecting Swat the ordinary way for {2}{R}: the free cast is a 'may', not a replacement.",
      "Reset with your commander in the command zone rather than on the battlefield: the free cast is not offered. 'If you control a commander' means on the battlefield.",
      "It can re-point an ability as well as a spell - crack a fetchland or activate something targeted and try it on that.",
    ],
  },
  {
    cardId: "dollmakers-shop",
    setup:
      "A Toy token maker and a non-Toy attacker, plus enough mana to unlock the second door, because a Room is two cards in one and the second half is the one that gets skipped.",
    yours: [{ id: "goblin-rabblemaster" }, { id: "ocelot-pride" }],
    extraMana: { generic: 4, w: 2 },
    checks: [
      "Cast the front door, Dollmaker's Shop, for {1}{W}. It is an Enchantment - Room, and only that door is unlocked.",
      "Attack with Goblin Rabblemaster: one 1/1 white Toy artifact creature token, because one or more non-Toy creatures attacked a player.",
      "Attack with two non-Toys at once: still one token. It is 'one or more', not one each.",
      "Attack with only a Toy token: no trigger at all.",
      "Unlock the second door by paying {4}{W}{W} at sorcery speed. Both halves are now live - the Shop's trigger still works.",
      "Porcelain Gallery sets every creature's base power and toughness to the number of creatures you control. With three creatures out they are all 3/3, whatever they were printed as.",
      "Make a fourth creature and watch them all become 4/4 - it is a base-setting effect, so it recalculates rather than adding.",
      "Put a +1/+1 counter on one of them: it is 4/4 plus the counter. Counters are applied after the base is set, not swallowed by it.",
      "Reset and cast Porcelain Gallery first, for {4}{W}{W}, then unlock the Shop for {1}{W}. Either door can be the one you play first.",
    ],
  },
  {
    cardId: "drannith-magistrate",
    setup:
      "A card in Salty Mike's graveyard he would like to cast, and one in his hand, so the difference between the two zones is what you are looking at.",
    theirGraveyard: ["bala-ged-recovery"],
    theirHand: ["lotus-petal"],
    theirs: [{ id: "forest" }, { id: "forest" }],
    checks: [
      "Cast Drannith Magistrate for {1}{W}: a 1/3 Human Wizard.",
      "Have Salty Mike cast Lotus Petal from his hand: allowed. The Magistrate does not stop hands.",
      "Have him try to cast anything from his graveyard or from exile: refused.",
      "It says 'your opponents', so your own casts from anywhere are untouched - cast something of your own from outside your hand if the board offers it.",
      "Note what it does *not* stop: he can still play lands, and he can still activate abilities of cards in other zones.",
    ],
  },
  {
    cardId: "eiganjo-seat-of-the-empire",
    setup:
      "An attacking creature to shoot, and two legendary creatures of your own on the board so the cost reduction has something to count.",
    theirs: [{ id: "phyrexian-walker" }],
    yours: [{ id: "ragavan-nimble-pilferer" }, { id: "myrel-shield-of-argive" }],
    extraMana: { generic: 2, w: 1 },
    checks: [
      "Play Eiganjo as a land: it taps for {W}, and it is legendary.",
      "Reset. Channel it from your hand instead: {2}{W}, discard it, 4 damage to target attacking or blocking creature.",
      "The cost is {1} less for each legendary creature you control. With Ragavan and Myrel out that is {W}, not {2}{W} - check the number before you pay it.",
      "There must be a creature attacking or blocking for it to have a target. Try it in your main phase with nothing in combat: no legal target.",
      "Pass the turn, have Salty Mike attack with Phyrexian Walker, and channel Eiganjo at it in the declare-attackers step.",
      "The channel discards the card as a cost, so the land is gone - you cannot channel it and still play it as a land.",
    ],
  },
  {
    cardId: "emerias-call",
    setup:
      "Two creatures out, one an Angel and one not, so 'non-Angel creatures you control' has both halves on the board. Enough mana for the seven-drop front face.",
    yours: [{ id: "goblin-rabblemaster" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Emeria's Call for {4}{W}{W}{W}: two 4/4 white Angel Warrior tokens with flying.",
      "Goblin Rabblemaster gains indestructible; the two Angels do not. The clause says non-Angel, and it is the Angels it leaves out.",
      "It lasts until your next turn, not until end of turn - pass the turn, have Salty Mike try to kill the Rabblemaster on his turn, and check it survives.",
      "Take your turn back and check the indestructible has now gone.",
      "Reset and play the back face instead: Emeria, Shattered Skyclave enters as a land, and you are asked whether to pay 3 life.",
      "Pay it: the land enters untapped and your life is 37. Decline: it enters tapped and your life is untouched.",
    ],
  },
  {
    cardId: "enlightened-tutor",
    setup:
      "Nothing on the board. The pile under your library holds artifacts and enchantments for the search, and creatures and lands that must not be on offer.",
    checks: [
      "Cast Enlightened Tutor for {W}: you are offered a search of your library.",
      "The list is artifacts and enchantments only - Sol Ring, Arcane Signet, Lotus Petal, Chrome Mox, High Noon, Deafening Silence, Windcrag Siege. No creatures, no lands, no spells.",
      "Take High Noon: it goes on *top of your library*, not into your hand. Check your hand size is unchanged.",
      "Draw for turn next turn and there it is. That delay is the whole cost of the card.",
      "The library is shuffled before the card goes on top, so the rest of the order is not what it was.",
      "Reset and decline the search: the spell still resolves and does nothing, which is legal and worth seeing once.",
    ],
  },
  {
    cardId: "eomer-king-of-rohan",
    setup:
      "Three Humans and a non-Human already out, so the counters have something to count and something to ignore. A creature across the table for the damage.",
    yours: [
      { id: "mother-of-runes" },
      { id: "grand-abolisher" },
      { id: "voice-of-victory" },
      { id: "ocelot-pride" },
    ],
    theirs: [{ id: "phyrexian-walker" }],
    checks: [
      "Cast Eomer for {3}{R}{W}. He enters with a +1/+1 counter for each *other* Human you control - three of them, so a 5/5, not a 2/2 and not a 6/6.",
      "Ocelot Pride is a Cat and is not counted. Neither is Eomer himself.",
      "His enter trigger makes a target player the monarch. Point it at yourself and check you are the monarch.",
      "Reset and point it at Salty Mike instead - 'target player' really is any player, which is a line worth knowing before you need it.",
      "The same trigger deals damage equal to his power to any target. His power is 5 by then, because the counters are already on him - point it at Phyrexian Walker and watch a 0/3 die to 5.",
      "Point it at Salty Mike instead: 5 to the face.",
      "He has double strike - attack with him and check the damage lands in two steps.",
    ],
  },
  {
    cardId: "esper-sentinel",
    setup:
      "Salty Mike holding two noncreature spells and a creature, with mana to pay the tax if he wants to. The card is a tax, not a lock, so both branches matter.",
    theirHand: ["lotus-petal", "sol-ring", "phyrexian-walker"],
    theirs: [{ id: "mountain" }, { id: "mountain" }],
    checks: [
      "Cast Esper Sentinel for {W}: a 1/1 Artifact Creature - Human Soldier.",
      "On Salty Mike's turn, have him cast Lotus Petal. He is offered the choice to pay {1} - X is Esper Sentinel's power, which is 1.",
      "Have him decline: you draw a card.",
      "Reset and have him pay: you draw nothing. That is the card working, not failing.",
      "Have him cast a second noncreature spell the same turn: no trigger. It is his *first* each turn.",
      "Pass the turn and have him cast one: it triggers again.",
      "Have him cast Phyrexian Walker: no trigger. A creature spell is not a noncreature spell.",
      "Put a +1/+1 counter on the Sentinel and try again: the tax is now {2}. X is read when the trigger resolves, not when the card was cast.",
    ],
  },
  {
    cardId: "ethersworn-canonist",
    setup:
      "Two artifacts and two nonartifact spells in your hand, because this one counts the two kinds separately and you need to see the artifact half go through.",
    yourHand: ["lotus-petal", "sol-ring", "swords-to-plowshares", "pyroblast"],
    theirs: [{ id: "phyrexian-walker" }],
    extraMana: { generic: 3, r: 1, w: 1 },
    checks: [
      "Cast Ethersworn Canonist for {1}{W}: a 2/2 Artifact Creature - Human Cleric.",
      "That was a nonartifact spell? No - the Canonist is an artifact, so it does not count against you. Cast Swords to Plowshares next: allowed.",
      "Now try Pyroblast: refused. You have cast a nonartifact spell this turn.",
      "Cast Lotus Petal and Sol Ring in the same turn: both allowed, and allowed after the nonartifact spell too. Artifacts are not limited at all.",
      "Pass the turn: the count resets and a nonartifact spell goes through again.",
      "It says 'each player', so check Salty Mike is bound the same way on his own turn.",
    ],
  },
  {
    cardId: "gamble",
    setup:
      "Two other cards in hand, because the discard is at random and with one card in hand there is no randomness to see.",
    yourHand: ["ornithopter", "lotus-petal", "sol-ring"],
    checks: [
      "Cast Gamble for {R}: you are offered a search of your whole library, with no filter at all. Any card.",
      "Take Myrel: the card goes to your hand.",
      "Then discard a card at random. It might be Myrel. Run this several times and check it really is random rather than always the last card.",
      "The order is the whole card: search, then draw into the hand, then discard at random from the hand *including* what you just found.",
      "The library is shuffled at the end.",
      "Reset and decline the search: you still discard at random. The discard is not conditional on finding anything.",
    ],
  },
  {
    cardId: "gemstone-caverns",
    setup:
      "The one card in the deck that can start the game already on the battlefield. That branch cannot be reached from a lab board, so this one tests the ordinary half.",
    gaps: [
      "Beginning the game with it on the battlefield needs an opening hand and a starting player, neither of which a lab board has. The engine does model it - see `beginsOnBattlefield` - and it is exercised in the headless tests instead.",
    ],
    checks: [
      "Play Gemstone Caverns as an ordinary land: it enters untapped, with no luck counter on it.",
      "Tap it: one colourless mana. With no luck counter that is the whole card.",
      "Reset. Put a luck counter on it by hand if the board lets you, and tap it again: now the picker offers all five colours instead.",
      "The two are alternatives, not additions - with a counter it makes one mana of any colour, not {C} as well.",
    ],
  },
  {
    cardId: "gingerbrute",
    setup:
      "Two blockers across the table, one with haste and one without, which is the only way to see what the evasion ability actually does.",
    theirs: [{ id: "phyrexian-walker" }, { id: "ragavan-nimble-pilferer" }],
    extraMana: { generic: 3 },
    checks: [
      "Cast Gingerbrute for {1}: a 1/1 Artifact Creature - Food Golem with haste.",
      "Attack with it the same turn. Haste is why this card is in a deck that wants non-Human attackers immediately.",
      "Before blockers, pay {1} for the evasion. Phyrexian Walker has no haste and can no longer block it; Ragavan does have haste and still can.",
      "Reset and do not pay: both can block. The ability is not free and not automatic.",
      "Reset. Pay {2}, tap it and sacrifice it: you gain 3 life, and it is a Food joke rather than a real plan.",
      "It is a Gingerbrute, not a Human - attack with it while Winota is out and check the trigger fires.",
    ],
  },
  {
    cardId: "giver-of-runes",
    setup:
      "Another creature to protect and a colourless permanent across the table, because 'protection from colorless' is the half of this card that never gets tried.",
    yours: [{ id: "goblin-rabblemaster" }],
    theirs: [{ id: "phyrexian-walker" }, { id: "goblin-cratermaker" }],
    checks: [
      "Cast Giver of Runes for {W}: a 1/2 Kor Cleric. She cannot use her ability this turn - pass a turn first.",
      "Tap her targeting Goblin Rabblemaster: you are offered a colour, and also colourless.",
      "Take red: Salty Mike's red Goblin Cratermaker can no longer target, block or damage the Rabblemaster.",
      "Reset and take colourless instead: now the colourless Phyrexian Walker is the one that cannot block it. That is the half that matters against artifacts.",
      "Try to target Giver of Runes herself: refused. It says 'another target creature you control'.",
      "Try to target a creature of Salty Mike's: refused too.",
    ],
  },
  {
    cardId: "goblin-cratermaker",
    setup:
      "A creature to shoot and a colourless permanent to destroy, so both bullets have something to point at - and a coloured noncreature permanent that the second bullet must refuse.",
    theirs: [{ id: "phyrexian-walker" }, { id: "sol-ring" }, { id: "deafening-silence" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Goblin Cratermaker for {1}{R}: a 2/2 Goblin Warrior.",
      "Activate it: {1} and sacrifice it. You are asked to choose a mode first, before any target.",
      "Take the first mode and deal 2 damage to Phyrexian Walker: a 0/3 survives at 3 toughness with 2 marked. Use a smaller creature to see one die.",
      "Reset and take the second mode: destroy Sol Ring, a colourless nonland permanent.",
      "Reset, second mode again, and try to point it at Deafening Silence: refused. It is white, not colourless.",
      "Try to point either mode at a land: refused. The second mode says nonland.",
      "Note the first mode can hit any creature, coloured or not, and the second cannot hit a coloured one. Two different questions on one card.",
    ],
  },
  {
    cardId: "goblin-rabblemaster",
    setup:
      "Another Goblin already out, so 'other Goblins attack each combat if able' has a victim, and a non-Goblin that must be left alone.",
    yours: [{ id: "goblin-cratermaker" }, { id: "mother-of-runes" }],
    checks: [
      "Cast Goblin Rabblemaster for {2}{R}: a 2/2 Goblin Warrior.",
      "Pass to your next turn. At the beginning of combat you get a 1/1 red Goblin token with haste - it can attack immediately.",
      "Try to declare attackers without Goblin Cratermaker: refused. Other Goblins you control attack each combat if able.",
      "Mother of Runes is not a Goblin and is free to stay home.",
      "The Rabblemaster is not compelled by its own ability - it says 'other'. Leave it back and check that is allowed.",
      "Attack with the Rabblemaster and two other Goblins: it gets +1/+0 for each other attacking Goblin, so a 4/2.",
      "Attack with the Rabblemaster alone: still 2/2. The pump counts other attacking Goblins, not Goblins on the board.",
    ],
  },
  {
    cardId: "grand-abolisher",
    setup:
      "Salty Mike holding a removal spell and controlling an artifact and a creature with abilities, so all three halves of the lock can be tried.",
    theirHand: ["swords-to-plowshares"],
    theirs: [{ id: "sol-ring" }, { id: "goblin-cratermaker" }, { id: "plains" }],
    checks: [
      "Cast Grand Abolisher for {W}{W}: a 2/2 Human Cleric.",
      "Still on your turn, have Salty Mike try to cast Swords to Plowshares: refused.",
      "Have him try to tap Sol Ring for mana: refused - an artifact's activated ability.",
      "Have him try to activate Goblin Cratermaker: refused - a creature's.",
      "Have him tap his Plains for mana: allowed. Lands are not on the list, which is the gap in the card.",
      "Pass the turn. On his own turn all of it works again - the lock is 'during your turn' only.",
    ],
  },
  {
    cardId: "greymond-avacyns-stalwart",
    setup:
      "Three other Humans out, so you are one short of the four the +2/+2 wants and can see it switch on when the fourth arrives. A non-Human to prove the buff is Humans only.",
    yours: [
      { id: "mother-of-runes" },
      { id: "grand-abolisher" },
      { id: "voice-of-victory" },
      { id: "ocelot-pride" },
    ],
    checks: [
      "Cast Greymond for {2}{W}{W}. As he enters you are asked to choose two abilities from first strike, vigilance and lifelink. Take vigilance and lifelink.",
      "Every Human you control has both - Mother of Runes, Grand Abolisher, Voice of Victory and Greymond himself. Attack with one and check it does not tap and does gain life.",
      "Ocelot Pride is a Cat and has neither.",
      "Greymond is himself a Human, so he has the chosen abilities too. That 'includes himself' is easy to get wrong.",
      "Count your Humans: four, counting Greymond, so they are also all +2/+2. Mother of Runes is a 3/4.",
      "Kill one Human so you are down to three: the +2/+2 goes away and the keywords stay. Two separate clauses on one card.",
      "Reset and choose first strike and vigilance instead: the whole buff changes with the choice, which is why the choice is made as he enters and never again.",
    ],
  },
  {
    cardId: "hexing-squelcher",
    setup:
      "A Counterspell and two Islands on Salty Mike's side, because three of this card's four lines are about being countered and cannot be tested without something to counter with.",
    yours: [{ id: "ocelot-pride" }],
    theirs: [{ id: "island" }, { id: "island" }],
    theirHand: ["counterspell", "swords-to-plowshares"],
    checks: [
      "Cast Hexing Squelcher for {1}{R} and have Salty Mike answer with Counterspell: it cannot be countered. The clause is on the spell itself.",
      "Now cast another spell of your own and have him try again: also uncounterable. 'Spells you control can't be countered' covers everything after it, not just the Squelcher.",
      "Have him cast Swords to Plowshares on the Squelcher: he has to pay 2 life first for the ward, or the spell is countered.",
      "Ocelot Pride has ward too, at 2 life - 'other creatures you control have Ward - Pay 2 life'. Have him target the Cat and check.",
      "The Squelcher's own ward is printed on it, so it is not granting itself a second one - check the ward is 2, not 4.",
      "Your own targeting of your own creatures does not pay ward. Point something of yours at the Cat and check nothing is charged.",
    ],
  },
  {
    cardId: "high-noon",
    setup: "Two spells in your hand, since the limit is what the card is for, and a creature across the table for the damage half.",
    yourHand: ["lotus-petal", "ornithopter"],
    theirs: [{ id: "phyrexian-walker" }],
    extraMana: { generic: 4, r: 1 },
    checks: [
      "Cast High Noon for {1}{W}: that was your one spell for the turn.",
      "Try to cast Lotus Petal: refused. Unlike Deafening Silence this one counts *every* spell, creature spells included - try Ornithopter too and check it is refused as well.",
      "Pass the turn and cast one: allowed. The limit is per turn.",
      "Salty Mike is bound the same way - it says each player.",
      "Activate it: {4}{R}, sacrifice it, 5 damage to any target. Point it at Phyrexian Walker and watch a 0/3 die.",
      "Reset and point it at Salty Mike: 5 to the face. 'Any target' really is any.",
      "Note the sacrifice is part of the cost, so the enchantment is gone whether or not the damage matters.",
    ],
  },
  {
    cardId: "homeward-path",
    setup:
      "A creature of yours that Salty Mike has taken, which is the only board on which this card does anything at all.",
    theirs: [{ id: "ocelot-pride" }],
    checks: [
      "Play Homeward Path: it enters untapped.",
      "Tap it for {C}: the first ability is an ordinary colourless land.",
      "Set up the real case: get one of your creatures under Salty Mike's control - the Ocelot Pride on his side is standing in for that.",
      "Tap Homeward Path for the second ability: each player gains control of all creatures they *own*, so the Cat comes home.",
      "It is not targeted and not optional, and it works for every player at once - including giving Salty Mike back anything of his you had taken.",
      "With nothing stolen in either direction it does nothing. Check activating it then is legal and simply changes nothing.",
    ],
  },
  {
    cardId: "imperial-recruiter",
    setup:
      "Nothing on the board. The pile under your library is stocked with creatures on both sides of the power line, which is the only thing this card asks about.",
    checks: [
      "Cast Imperial Recruiter for {2}{R}: a 1/1 Human Advisor, and its enter trigger offers you a search.",
      "The list is creature cards with power 2 or less. Mother of Runes, Ocelot Pride, Signal Pest and Ornithopter are on it.",
      "Ranger-Captain of Eos is a 3/3 and is not. Check it is absent rather than merely further down.",
      "Take Mother of Runes: the card goes to your *hand*, not the battlefield. This is a tutor, not a reanimator.",
      "The library is shuffled afterwards.",
      "Reset and decline: the trigger is not a 'may', but a search with nothing taken is legal - confirm the Recruiter still arrives either way.",
      "It reads power, not mana value: a cheap 3/3 is illegal and an expensive 1/1 is fine.",
    ],
  },
  {
    cardId: "inkmoth-nexus",
    setup:
      "A creature across the table to shoot with infect, since -1/-1 counters on a blocker are the half of the card you can actually see.",
    theirs: [{ id: "phyrexian-walker" }],
    extraMana: { generic: 2 },
    checks: [
      "Play Inkmoth Nexus: it enters untapped and taps for {C}.",
      "Pay {1} to animate it: a 1/1 Phyrexian Blinkmoth artifact creature with flying and infect, and still a land.",
      "It came under your control before this turn only if it was already out - the one you just played is summoning sick as a creature. Pass a turn before attacking.",
      "Attack with it unblocked: Salty Mike gets a poison counter, and his life total does not move. That is infect, and it is not damage.",
      "Reset. Have Phyrexian Walker block it: the Walker gets a -1/-1 counter instead of damage marked on it.",
      "Pass the turn: the animation ends, and it is a plain land again - the -1/-1 counters it dealt do not go anywhere.",
      "It is not a Human. Attack with it while Winota is out and check the trigger fires.",
    ],
  },
  {
    cardId: "kiki-jiki-mirror-breaker",
    setup:
      "A nonlegendary creature worth copying and a legendary one that must be refused, which is the whole target line.",
    yours: [{ id: "goblin-rabblemaster" }, { id: "myrel-shield-of-argive" }],
    checks: [
      "Cast Kiki-Jiki for {2}{R}{R}{R}: a 2/2 Goblin Shaman with haste. He can use his own ability the turn he arrives - that is what the haste is for.",
      "Tap him targeting Goblin Rabblemaster: a token copy arrives with haste.",
      "The copy is a real Goblin Rabblemaster - it has the token-making trigger and the 'other Goblins must attack' clause too.",
      "Attack with the copy immediately. The haste is the point of the card.",
      "Try to target Myrel: refused. Myrel is legendary.",
      "Try to target Kiki-Jiki himself: refused, for the same reason.",
      "Pass to the next end step: the copy is sacrificed. Check it goes away on its own without you doing anything.",
    ],
  },
  {
    cardId: "legion-warboss",
    setup:
      "A bigger attacker already out, because mentor only works on an attacking creature with *lesser* power and needs something smaller than the Warboss to land on.",
    yours: [{ id: "ocelot-pride" }, { id: "grand-abolisher" }],
    checks: [
      "Cast Legion Warboss for {2}{R}: a 2/2 Goblin Soldier. Pass a turn - it has no haste of its own.",
      "At the beginning of combat you get a 1/1 red Goblin token. It has haste until end of turn and it attacks this combat if able.",
      "Try to leave that token home: refused. Unlike the Rabblemaster's token, this one is compelled.",
      "Attack with the Warboss and Ocelot Pride (a 1/1): mentor triggers and puts a +1/+1 counter on the Cat, because 1 is less than 2.",
      "Reset and attack with the Warboss and Grand Abolisher (a 2/2): mentor has no legal target. Equal power is not lesser power.",
      "The Warboss is a Goblin, so a Goblin Rabblemaster on the board would compel it to attack - worth knowing before the two are on the table together.",
    ],
  },
  {
    cardId: "lotus-petal",
    setup: "Nothing but the Petal, and a white card in hand for the mana to pay for.",
    yourHand: ["mother-of-runes"],
    checks: [
      "Cast Lotus Petal for {0}.",
      "Tap and sacrifice it: the picker offers all five colours. Take {W}.",
      "Cast Mother of Runes with it. One mana, once, and the artifact is gone - that is the whole card.",
      "Reset and take {U}: a colour outside your commander's identity is legal for a mana ability.",
      "It is not a mana source you can hold: the sacrifice is part of the cost, so there is no way to tap it and keep it.",
    ],
  },
  {
    cardId: "loyal-apprentice",
    commanderInPlay: true,
    setup:
      "Winota on the battlefield, because the whole ability is a lieutenant clause and does nothing at all without a commander out.",
    checks: [
      "Cast Loyal Apprentice for {1}{R}: a 2/1 Human Artificer with haste.",
      "At the beginning of combat on your turn - with Winota out - you get a 1/1 colourless Thopter artifact creature token with flying, and it gains haste until end of turn.",
      "Attack with the Thopter immediately: the haste is granted, not printed, so check it really can.",
      "Reset with Winota in the command zone instead: no token at all. That is the lieutenant clause, and it is the half people forget to test.",
      "The Thopter is not a Human. With Winota on the battlefield, attacking with it fires the trigger.",
      "It triggers at the beginning of combat on *your* turn only - pass and check nothing happens in Salty Mike's combat.",
    ],
  },
  {
    cardId: "mana-confluence",
    setup: "Nothing but the land.",
    checks: [
      "Play Mana Confluence: it enters untapped.",
      "Tap it and pay 1 life: the picker offers all five colours. Your life is 39.",
      "The life is part of the cost here, unlike City of Brass where it is a trigger on tapping. Compare the two: this one charges you even if you tap it for a colour you never spend.",
      "Take a colour outside your commander's identity and check it is allowed.",
    ],
  },
  {
    cardId: "mana-vault",
    setup: "Nothing but the Vault. Three colourless is a lot of mana on turn one and all of the card's cost is later.",
    checks: [
      "Cast Mana Vault for {1} and tap it: three colourless mana from one tap.",
      "Pass the turn. It does not untap in your untap step.",
      "At the beginning of your upkeep you may pay {4} to untap it. Decline it once and check it stays tapped.",
      "At the beginning of your draw step, because it is still tapped, it deals 1 damage to you. Your life drops each turn you leave it down.",
      "Reset and pay the {4} in upkeep: it untaps, and then the draw-step trigger finds it untapped and does nothing.",
      "The damage trigger has an 'if it is tapped' condition, so check it really is checked at the draw step rather than assumed.",
    ],
  },
  {
    cardId: "marsh-flats",
    setup: "Nothing but the land. The pile under your library holds a Plains and a Swamp for it to find.",
    checks: [
      "Play Marsh Flats: it enters untapped and makes no mana of its own.",
      "Activate it: tap, pay 1 life, sacrifice it, and search for a Plains or Swamp card.",
      "Take the Plains: it arrives untapped. Your life is 39.",
      "The Mountain in the pile is not on offer - which is worth noticing, because this is a Boros deck playing a fetchland that cannot find half its colours.",
      "It finds a *card* with the subtype, not only a basic: Sacred Foundry is a Mountain Plains and would be a legal choice if it were in the pile.",
    ],
  },
  {
    cardId: "mother-of-runes",
    setup:
      "Another creature to protect and a red creature across the table to protect it from. Mother of Runes cannot use its ability the turn it arrives.",
    yours: [{ id: "goblin-rabblemaster" }],
    theirs: [{ id: "goblin-cratermaker" }],
    checks: [
      "Cast Mother of Runes for {W}: a 1/1 Human Cleric.",
      "Try to tap it this turn: refused, it is summoning sick. Pass a turn.",
      "Tap it targeting Goblin Rabblemaster and choose red: Salty Mike's red creature can no longer block, target or damage the Rabblemaster.",
      "Unlike Giver of Runes, Mother of Runes *can* target itself - 'target creature you control' with no 'another'. Do that and check it is allowed.",
      "It offers colours only, not colourless. That is the difference between the two Runes cards and it is worth seeing side by side.",
      "The protection ends at end of turn.",
    ],
  },
  {
    cardId: "mountain",
    setup: "One basic land, and the shortest checklist in the lab.",
    checks: [
      "Play the Mountain: it enters untapped.",
      "Tap it: one red mana, no picker, no cost.",
      "It is a Mountain by subtype, which is what Clifftop Retreat, Needleverge Pathway and the fetchlands are looking for.",
    ],
  },
  {
    cardId: "mox-amber",
    setup:
      "A legendary creature and a nonlegendary one already out, because the Mox reads only the legendary permanents and is a dead card without them.",
    yours: [{ id: "myrel-shield-of-argive" }, { id: "goblin-rabblemaster" }],
    checks: [
      "Cast Mox Amber for {0}.",
      "Tap it: it offers {W}, from Myrel, and nothing else. Goblin Rabblemaster is red but not legendary, so red is not on the list.",
      "Reset with no legendary permanent at all: tapping it produces nothing. That is the card, not a bug - it is why the deck runs so many legends.",
      "Play a legendary red creature and check red joins the list.",
      "Your commander counts when it is on the battlefield and not when it is in the command zone. Try both.",
    ],
  },
  {
    cardId: "mox-diamond",
    setup:
      "Two lands in hand, since the Mox has to eat one as it enters and with none in hand it never arrives at all.",
    yourHand: ["mountain", "plains"],
    checks: [
      "Cast Mox Diamond for {0}: as it enters you are asked to discard a land card.",
      "Discard the Mountain: the Mox stays, and it taps for any colour.",
      "Reset and decline: the Mox is put into the graveyard instead of entering. That is the replacement clause and it is the half that is never tested.",
      "Reset with no land in hand at all: same thing - it cannot enter.",
      "Tap it: the picker offers all five colours, unlike Mox Amber which reads your board.",
      "The discard is not a cost of casting - the spell resolves either way, and it is entering the battlefield that is conditional.",
    ],
  },
  {
    cardId: "multiversal-passage",
    setup: "Nothing but the land. Every branch of this card is a question you answer as it enters.",
    checks: [
      "Play Multiversal Passage: as it enters you are asked to choose a basic land type. Take Mountain.",
      "Then you are asked whether to pay 2 life. Pay it: the land enters untapped and your life is 38.",
      "Tap it: it makes {R}, because it *is* a Mountain - check the type line, not just the mana.",
      "Reset, choose Mountain, and decline the life: it enters tapped. Both halves of that clause, since it is easy to implement only one.",
      "Reset and choose Plains instead: it makes {W}, and it now satisfies Clifftop Retreat's 'you control a Mountain or a Plains'.",
      "Reset and choose Island: it makes blue, in a Boros deck. The choice is not limited by your identity, which is worth confirming.",
    ],
  },
  {
    cardId: "myrel-shield-of-argive",
    setup:
      "Two Soldiers already out to be counted, one creature that is not a Soldier, and a spell in Salty Mike's hand for the lock half.",
    yours: [{ id: "voice-of-victory" }, { id: "signal-pest" }, { id: "ocelot-pride" }],
    theirHand: ["swords-to-plowshares"],
    theirs: [{ id: "plains" }, { id: "sol-ring" }],
    checks: [
      "Cast Myrel for {3}{W}: a 3/4 Human Soldier.",
      "Still on your turn, have Salty Mike try to cast Swords to Plowshares: refused. Have him try to tap Sol Ring: refused too.",
      "Pass the turn: on his own turn both work. It is the Grand Abolisher lock, on a body, and only during your turn.",
      "Pass back and attack with Myrel: you get X 1/1 colourless Soldier artifact creature tokens, where X is the number of Soldiers you control.",
      "Count first: Myrel is a Soldier, Voice of Victory is a Bard, Signal Pest is a Pest, Ocelot Pride is a Cat. Work out X by hand and check the engine agrees.",
      "The tokens are Soldiers themselves, so attacking again next turn makes many more. Do it twice and watch it snowball.",
      "The tokens arrive without haste and not attacking - unlike Ainok's Goblins. Check they are not in this combat.",
    ],
  },
  {
    cardId: "needleverge-pathway",
    setup: "Nothing but the land. A modal double-faced land is one card that is two lands, and you choose on the way down.",
    checks: [
      "Play Needleverge Pathway, front face: it enters untapped and taps for {R}.",
      "Reset and play the back face, Pillarverge Pathway, instead: it enters untapped and taps for {W}.",
      "Only one face is ever on the battlefield - there is no unlocking and no flipping later. Check the permanent is the face you chose and stays it.",
      "It uses your land drop either way.",
      "Neither face is a Mountain or a Plains by subtype, so it does *not* turn on Clifftop Retreat. That is the real cost of the cycle.",
    ],
  },
  {
    cardId: "ocelot-pride",
    setup:
      "A lifelink creature to do the gaining, and nine other permanents so the city's blessing is one permanent away and you can watch it switch on.",
    yours: [
      { id: "alseid-of-lifes-bounty" },
      { id: "plains" },
      { id: "plains" },
      { id: "mountain" },
      { id: "mountain" },
      { id: "sol-ring" },
      { id: "arcane-signet" },
      { id: "lotus-petal" },
    ],
    checks: [
      "Cast Ocelot Pride for {W}: a 1/1 Cat with first strike and lifelink.",
      "Do not gain any life, then pass to your end step: no token. The trigger has an 'if you gained life this turn' condition.",
      "Reset. Attack with Alseid of Life's Bounty (lifelink) and let it through, then reach your end step: a 1/1 white Cat token arrives.",
      "Count your permanents. Under ten, so no city's blessing, and the copy clause does nothing.",
      "Reset with ten or more permanents out: you get the city's blessing, and now for each token that entered this turn you get a copy of it. One Cat becomes two.",
      "The blessing is 'for the rest of the game' - drop back below ten permanents and check you keep it.",
      "The copy clause counts *every* token that entered this turn, not only the Cat. Make a Goblin token first and check it is copied too.",
      "Ocelot Pride is a Cat, which matters beside Ajani - kill it and see whether Ajani's transform trigger fires.",
    ],
  },
  {
    cardId: "ornithopter",
    setup: "Nothing at all. A 0/2 flier for no mana, and one of the deck's cheapest non-Human attackers.",
    commanderInPlay: true,
    checks: [
      "Cast Ornithopter for {0}. Check it really costs nothing - no lands need to be tapped.",
      "It is a 0/2 Artifact Creature - Thopter with flying.",
      "Attack with it next turn: it is a non-Human, so Winota triggers. Zero power is not the point of the card here.",
      "It has no other text at all. If anything else happens, that is the bug.",
    ],
  },
  {
    cardId: "ornithopter-of-paradise",
    setup: "Nothing at all - it is a mana creature, so the board is just the card and a turn to wait out.",
    checks: [
      "Cast Ornithopter of Paradise for {2}: a 0/2 Artifact Creature - Thopter with flying.",
      "Try to tap it for mana this turn: refused, it is a summoning-sick creature. That is the difference between this and an artifact like Arcane Signet.",
      "Pass a turn and tap it: the picker offers all five colours.",
      "It is a non-Human with flying, so it is both a mana source and a Winota trigger. Attacking with it and tapping it for mana are alternatives - check that attacking leaves it tapped and unavailable.",
    ],
  },
  {
    cardId: "path-to-exile",
    setup:
      "A creature of Salty Mike's to exile, and one of your own, because the land the exiled creature's controller gets is the part that is easy to give to the wrong player.",
    theirs: [{ id: "phyrexian-walker" }],
    yours: [{ id: "ocelot-pride" }],
    checks: [
      "Cast Path to Exile for {W} on Phyrexian Walker: it is exiled, not destroyed - check the graveyard is empty.",
      "*Salty Mike* is then offered a search for a basic land card. He is the creature's controller, so it is his search and his land.",
      "Take it: the basic arrives on his battlefield tapped, and his library is shuffled.",
      "Have him decline: the creature is still exiled. The search is a 'may'.",
      "Reset and point it at your own Ocelot Pride: legal, and now *you* are the one offered the land. It says 'target creature', not 'a creature an opponent controls'.",
      "Only a basic land is on offer - a Sacred Foundry in the pile is not a legal choice.",
    ],
  },
  {
    cardId: "phyrexian-walker",
    setup: "Nothing at all. A 0/3 for no mana, in the deck because it is a body that costs nothing and is not a Human.",
    commanderInPlay: true,
    checks: [
      "Cast Phyrexian Walker for {0}.",
      "It is a 0/3 Artifact Creature - Phyrexian Construct with no abilities whatsoever.",
      "Attack with it next turn: Winota triggers, because it is not a Human. Its zero power is beside the point.",
      "It blocks well for free - put it in front of something and check a 0/3 survives what a 0/2 would not.",
    ],
  },
  {
    cardId: "plains",
    setup: "One basic land, and the other shortest checklist in the lab.",
    checks: [
      "Play the Plains: it enters untapped.",
      "Tap it: one white mana, no picker, no cost.",
      "It is a Plains by subtype, which is what Clifftop Retreat, Marsh Flats and Arid Mesa are looking for.",
    ],
  },
  {
    cardId: "plateau",
    setup: "Nothing but the land. A dual that is two basic types at once, which is more than a land that taps for two colours.",
    checks: [
      "Play Plateau: it enters untapped, with no condition and no life to pay.",
      "Tap it and the picker offers {R} and {W}.",
      "Its type line reads 'Land - Mountain Plains'. That is the half that matters: it satisfies Clifftop Retreat on its own, and both fetchlands in the deck can find it.",
      "It has no printed ability text at all - the mana abilities come from the basic land types, which is why the reminder text is in brackets.",
    ],
  },
  {
    cardId: "professional-face-breaker",
    setup:
      "Two creatures to attack with, and a blocker across the table, since the trigger is about combat damage getting through to a player.",
    yours: [{ id: "ocelot-pride" }, { id: "goblin-rabblemaster" }],
    theirs: [{ id: "phyrexian-walker" }],
    checks: [
      "Cast Professional Face-Breaker for {2}{R}: a 2/3 Human Warrior with menace.",
      "Attack with it next turn: menace means it cannot be blocked except by two or more creatures. With one blocker across the table it cannot be blocked at all.",
      "Let the damage through: you get one Treasure token.",
      "Attack with two creatures and let both through: still one Treasure. It is 'one or more creatures', one trigger for the batch.",
      "Reset and have Phyrexian Walker block your Ocelot Pride so nothing gets through: no Treasure.",
      "Sacrifice the Treasure: the top card of your library is exiled and you may play it this turn.",
      "Play it: check it uses your land drop if it is a land, and needs paying for if it is a spell. 'May play' is not 'for free'.",
      "Reset, sacrifice a Treasure, and do not play the card: it stays exiled and is lost at end of turn.",
    ],
  },
  {
    cardId: "pyroblast",
    uncastableOnOpen:
      "Both its modes need a target, and the first one wants a spell on the stack, which a lab board never opens with.",
    setup:
      "A blue permanent and a non-blue one across the table, plus a Counterspell and two Islands in Salty Mike's hands, so the difference between Pyroblast and Red Elemental Blast can actually be seen.",
    theirs: [{ id: "island" }, { id: "island" }, { id: "phyrexian-walker" }],
    theirHand: ["counterspell"],
    checks: [
      "Have Salty Mike cast Counterspell at something. In response, cast Pyroblast for {R} and take the first mode: it counters the blue spell.",
      "Reset. Take the first mode against a *non-blue* spell: the spell is a legal target and Pyroblast resolves doing nothing. That is the whole difference from Red Elemental Blast - 'counter it if it's blue' targets anything.",
      "Take the second mode against Salty Mike's Island: destroyed.",
      "Reset and point the second mode at Phyrexian Walker, which is colourless: a legal target, and nothing happens.",
      "Walk the two Blasts side by side once. Red Elemental Blast cannot target a non-blue thing at all; Pyroblast can, and fizzles politely.",
    ],
  },
  {
    cardId: "quicksilver-brash-blur",
    setup:
      "The other card in the deck that can start the game on the battlefield. That half needs an opening hand, so this board tests the power-up.",
    gaps: [
      "Beginning the game with him on the battlefield needs an opening hand, which a lab board does not have. The engine models it - see `beginsOnBattlefield` - and the headless tests cover it.",
    ],
    extraMana: { generic: 4, r: 1 },
    checks: [
      "Cast Quicksilver for {R}: a 1/1 Mutant Hero with haste. Attack with him the same turn.",
      "The power-up costs {4}{R}, but it is reduced by his mana cost if he entered this turn - so on the turn he arrives it is {4}, not {4}{R}. Check the number you are actually charged.",
      "Activate it: a +1/+1 counter and a double strike counter. He is a 2/2 with double strike.",
      "Try to activate it a second time: refused. Each power-up ability is once per game, not once per turn - pass a turn and check it is still refused.",
      "Pass a turn and cast a second Quicksilver if the board allows: the reduction is gone, so the cost is the full {4}{R}.",
      "The double strike comes from a counter, not a grant - it does not wear off at end of turn.",
    ],
  },
  {
    cardId: "ragavan-nimble-pilferer",
    setup:
      "An empty board across the table so Ragavan can get through, since every word of his text is about combat damage to a player.",
    extraMana: { generic: 1 },
    checks: [
      "Cast Ragavan for {R}: a 2/1 Monkey Pirate with no haste of its own. Pass a turn.",
      "Attack and connect: you get a Treasure token, and the top card of *Salty Mike's* library is exiled - his, not yours.",
      "You may cast that card until end of turn. Try it, and check you pay for it normally.",
      "Let the turn end without casting it: it stays exiled and is lost.",
      "Reset. Cast him for his dash cost of {1}{R} instead: he arrives with haste and can attack immediately.",
      "At the beginning of the next end step the dashed Ragavan returns to your hand rather than staying. That is the trade.",
      "Ragavan is a Monkey Pirate, so with Winota out the trigger fires - dash plus Winota is why the card is here.",
    ],
  },
  {
    cardId: "ranger-captain-of-eos",
    setup:
      "A spell in Salty Mike's hand for the sacrifice half, and a library stocked with one-drops for the search half.",
    theirHand: ["swords-to-plowshares", "phyrexian-walker"],
    theirs: [{ id: "plains" }, { id: "plains" }],
    checks: [
      "Cast Ranger-Captain of Eos for {1}{W}{W}: a 3/3 Human Soldier Ranger, and its enter trigger offers a search.",
      "The list is creature cards with mana value 1 or less: Mother of Runes, Ocelot Pride, Ornithopter, Signal Pest, Gingerbrute.",
      "Note this reads mana value, where Imperial Recruiter reads power and Recruiter of the Guard reads toughness. Three tutors, three different questions - check each one is asking its own.",
      "Take Mother of Runes: the card goes to your hand. The search is a 'may', so try declining it too.",
      "Sacrifice the Ranger-Captain: your opponents can't cast noncreature spells this turn.",
      "Have Salty Mike try Swords to Plowshares: refused. Have him cast Phyrexian Walker: allowed - it is a creature spell.",
      "Pass the turn: the lock is gone. It is 'this turn' only, and it is the protection you sacrifice him for at the right moment.",
    ],
  },
  {
    cardId: "raph-and-leo-sibling-rivals",
    setup:
      "Two other creatures to attack with and then untap, because untapping one or two attackers is only worth anything if they can attack again in the extra phase.",
    yours: [{ id: "goblin-rabblemaster" }, { id: "ocelot-pride" }],
    checks: [
      "Cast Raph & Leo for {1}{R/W}{R/W}: a 2/4 Mutant Ninja Turtle. Pay the hybrid pips with either colour.",
      "Pass a turn, then attack with all three. The trigger fires - it is the first combat phase of the turn.",
      "Untap one or two target attacking creatures. Take both the Rabblemaster and the Cat: they untap while still attacking.",
      "Try to target a creature that is not attacking: refused.",
      "After this phase there is an additional combat phase. Get to it and attack again with the two you untapped.",
      "In that second combat, attack with Raph & Leo again: the trigger has an 'if it's the first combat phase' condition, so it does nothing - no infinite combats.",
      "Untap only one creature rather than two: 'one or two' means one is a legal answer.",
    ],
  },
  {
    cardId: "recruiter-of-the-guard",
    setup:
      "Nothing on the board. The pile under your library holds creatures on both sides of the toughness line.",
    checks: [
      "Cast Recruiter of the Guard for {2}{W}: a 1/1 Human Soldier, and its enter trigger offers a search.",
      "The list is creature cards with toughness 2 or less. Mother of Runes (1/1), Ocelot Pride (1/1), Imperial Recruiter (1/1) are on it.",
      "Ornithopter is a 0/2 and is on it too - zero power does not matter here, only toughness.",
      "Phyrexian Walker is a 0/3 and is not on it. Check it is absent.",
      "Take a card: it goes to your hand, and the library is shuffled.",
      "The search is a 'may' - decline it once and check the Recruiter still arrives.",
    ],
  },
  {
    cardId: "red-elemental-blast",
    uncastableOnOpen:
      "Both modes name a blue target, and a board with no blue spell on the stack and no blue permanent gives it nothing to point at.",
    setup:
      "A blue permanent and a colourless one across the table, and a Counterspell in Salty Mike's hand, so both modes have something legal and something illegal to try.",
    theirs: [{ id: "island" }, { id: "island" }, { id: "phyrexian-walker" }],
    theirHand: ["counterspell"],
    checks: [
      "Have Salty Mike cast Counterspell. Respond with Red Elemental Blast for {R}, first mode: the blue spell is countered.",
      "Reset. Try the first mode against a spell that is not blue: refused outright - the target itself is illegal, which is where this differs from Pyroblast.",
      "Second mode: destroy Salty Mike's Island, a blue permanent.",
      "Try the second mode on Phyrexian Walker: refused. Colourless is not blue.",
      "Walk it beside Pyroblast once and note that Pyroblast would have let both of those be targeted and simply done nothing.",
    ],
  },
  {
    cardId: "rionya-fire-dancer",
    setup:
      "A creature worth copying and two cheap instants in hand, because X counts the instants and sorceries you have cast this turn and with none cast it is just one token.",
    yours: [{ id: "goblin-rabblemaster" }],
    yourHand: ["pyroblast", "swords-to-plowshares"],
    extraMana: { r: 1, w: 1 },
    checks: [
      "Cast Rionya for {3}{R}{R}: a 3/4 Human Wizard. Pass a turn.",
      "With no spells cast this turn, reach the beginning of combat: the trigger makes X copies of another target creature you control, where X is one plus zero. One token copy of Goblin Rabblemaster, with haste.",
      "Reset. Cast Pyroblast and Swords to Plowshares first, then reach combat: X is three. Three token copies.",
      "Try to target Rionya: refused. It says 'another target creature you control'.",
      "The copies have haste - attack with them the same turn.",
      "At the beginning of the next end step they are exiled, not sacrificed. Check they leave without triggering anything that watches creatures dying.",
    ],
  },
  {
    cardId: "rite-of-flame",
    setup:
      "A Rite of Flame already in a graveyard, because the card counts copies of itself in *each* graveyard and the second one is what makes it more than a wash.",
    yourGraveyard: ["rite-of-flame"],
    theirGraveyard: ["rite-of-flame"],
    checks: [
      "Cast Rite of Flame for {R}: it adds {R}{R}, then {R} for each card named Rite of Flame in each graveyard.",
      "There are two - one in yours, one in Salty Mike's - so you get {R}{R}{R}{R}. Count what lands in your pool.",
      "Note it counts *each* graveyard, not just yours. That is the clause that is easy to implement as your own.",
      "The Rite you just cast is not counted: it is still on the stack when the count happens, and goes to the graveyard afterwards.",
      "Reset with empty graveyards: {R}{R} for {R}, a net gain of one. Still the floor of the card.",
    ],
  },
  {
    cardId: "sacred-foundry",
    setup: "Nothing but the land. A shockland is one question asked as it enters.",
    checks: [
      "Play Sacred Foundry: you are asked whether to pay 2 life.",
      "Pay it: it enters untapped and your life is 38.",
      "Reset and decline: it enters tapped, and your life is untouched.",
      "Tap it: the picker offers {R} and {W}.",
      "Its type line is 'Land - Mountain Plains', so it turns on Clifftop Retreat and both fetchlands can find it. That is worth confirming - it is a subtype question, not a colour one.",
    ],
  },
  {
    cardId: "sanctum-prelate",
    setup:
      "Spells at three different mana values in your hand and a creature spell, because the number bites noncreature spells only and you need to see all four outcomes.",
    yourHand: ["swords-to-plowshares", "sol-ring", "phyrexian-walker", "high-noon"],
    extraMana: { generic: 3, w: 1 },
    checks: [
      "Cast Sanctum Prelate for {1}{W}{W}: as it enters you are asked to choose a number. Choose 1.",
      "Try to cast Swords to Plowshares, mana value 1: refused.",
      "Cast Sol Ring, mana value 1: also refused. It is a noncreature spell too.",
      "Cast High Noon, mana value 2: allowed. Only the chosen number is locked.",
      "Cast Phyrexian Walker, mana value 0: allowed - and it would be allowed at any number, because it is a creature spell.",
      "Reset and choose 0: now the free artifacts and the free creatures part company. Ornithopter is a creature and still castable; Lotus Petal is not.",
      "The number is chosen as it enters and never again. Check there is no way to change it afterwards.",
    ],
  },
  {
    cardId: "scalding-tarn",
    setup: "Nothing but the land. The pile under your library holds an Island and a Mountain for it.",
    checks: [
      "Play Scalding Tarn: it enters untapped and makes no mana of its own.",
      "Activate it: tap, pay 1 life, sacrifice it, search for an Island or Mountain card.",
      "Take the Mountain: it arrives untapped, and your life is 39.",
      "The Plains in the pile is not on offer. In a Boros deck this fetchland finds exactly one of your two colours, which is the cost of playing it for the shuffle alone.",
      "Sacred Foundry is a Mountain Plains, so it *is* a legal find - which is how the card earns its slot here.",
    ],
  },
  {
    cardId: "serra-ascendant",
    setup:
      "Nothing on the board. You start at 40 life, so the buff is on from the first moment - the interesting half is watching it switch off.",
    checks: [
      "Cast Serra Ascendant for {W}: printed as a 1/1 Human Monk with lifelink.",
      "You have 40 life, so it is a 6/6 with flying right now. Check the printed line and the actual line separately.",
      "Attack with it: 6 damage and 6 life gained, because lifelink is printed and the +5/+5 is conditional.",
      "Drop your life to 29 - take damage from Ancient Tomb, City of Brass, a shockland, whatever the board offers - and check it goes back to a 1/1 with no flying.",
      "At exactly 30 it is still a 6/6. The clause is '30 or more'.",
      "Gain the life back and check the buff returns. It is a static condition, checked continuously, not a trigger.",
    ],
  },
  {
    cardId: "shatterskull-smashing",
    setup:
      "Two creatures across the table so the damage has two things to be divided between, and enough lands to pay a big X.",
    theirs: [{ id: "phyrexian-walker" }, { id: "goblin-cratermaker" }],
    extraMana: { generic: 6, r: 2 },
    gaps: [
      "The client's cast flow sends exactly one target, so the two-target split cannot be reached from this board. The engine implements and enforces it, and it is reachable over the protocol - see ROADMAP.md. Point it at one creature and the rest of the card works.",
    ],
    checks: [
      "Cast Shatterskull Smashing with X = 2 at Phyrexian Walker: 2 damage, and a 0/3 survives.",
      "Cast it with X = 3 at the Cratermaker: 3 damage kills a 2/2.",
      "Cast it with X = 6: the damage doubles to 12. Check the number that actually lands, not the X you paid.",
      "At X = 5 there is no doubling - the clause is '6 or more', so walk 5 and 6 back to back.",
      "It can hit a planeswalker as well as a creature. Put Ajani, Nacatl Avenger on the board and point it at him.",
      "Reset and play the back face instead: Shatterskull, the Hammer Pass enters as a land, and you are asked whether to pay 3 life.",
      "Pay it and the land is untapped, at 37 life. Decline and it enters tapped. Then tap it for {R}.",
    ],
  },
  {
    cardId: "signal-pest",
    setup:
      "Two other creatures to attack with, and blockers across the table with and without flying, because the evasion is the half people never check.",
    yours: [{ id: "goblin-rabblemaster" }, { id: "ocelot-pride" }],
    theirs: [{ id: "phyrexian-walker" }, { id: "ornithopter" }],
    checks: [
      "Cast Signal Pest for {1}: a 0/1 Artifact Creature - Pest. Pass a turn.",
      "Attack with all three: battle cry gives each *other* attacking creature +1/+0. The Rabblemaster is a 3/2 and the Cat is a 2/1.",
      "Signal Pest itself gets nothing - it says 'each other attacking creature', and a 0/1 staying 0/1 is the point.",
      "Try to block Signal Pest with Phyrexian Walker: refused. It can't be blocked except by creatures with flying or reach.",
      "Block it with Ornithopter, which has flying: allowed. That is the other half of the same restriction.",
      "It is a Pest, not a Human - attack with it while Winota is out and check the trigger fires.",
    ],
  },
  {
    cardId: "silence",
    setup:
      "Two spells in Salty Mike's hand and lands to cast them with, since a lock is only visible when there is something it is stopping.",
    theirHand: ["swords-to-plowshares", "phyrexian-walker"],
    theirs: [{ id: "plains" }, { id: "plains" }],
    checks: [
      "Cast Silence for {W}: your opponents can't cast spells this turn.",
      "Have Salty Mike try Swords to Plowshares: refused.",
      "Have him try Phyrexian Walker: also refused. Unlike Ranger-Captain of Eos, this one stops creature spells too - walk the two side by side.",
      "He can still play lands and activate abilities. Check both, because they are what the card does not do.",
      "Pass the turn: the lock is gone. It is 'this turn', so cast on his upkeep it protects your whole next turn - try that line, it is why the card is in the deck.",
    ],
  },
  {
    cardId: "simian-spirit-guide",
    setup:
      "A red spell in hand for the mana to pay for, because the only interesting thing about this card is that it is played from the hand without being cast.",
    yourHand: ["goblin-cratermaker"],
    extraMana: { generic: 1 },
    checks: [
      "Do not cast Simian Spirit Guide. Instead activate it from your hand: exile it, add {R}.",
      "That is an ability, not a spell, so it works under Deafening Silence, Archon of Emeria and High Noon. Put one of them on the board and check.",
      "Spend the {R} on Goblin Cratermaker.",
      "Reset and cast it normally for {2}{R}: a 2/2 Ape Spirit. Both halves are real, and the body is the one nobody uses.",
      "The exile is a cost, so the card is gone whether or not you spend the mana.",
    ],
  },
  {
    cardId: "skrelv-defector-mite",
    setup:
      "Another creature to protect and a white blocker across the table, because the ability names a colour and the whole point is what that colour then cannot do.",
    yours: [{ id: "goblin-rabblemaster" }],
    theirs: [{ id: "mother-of-runes" }, { id: "phyrexian-walker" }],
    checks: [
      "Cast Skrelv for {W}: a 1/1 Legendary Artifact Creature - Phyrexian Mite with toxic 1.",
      "Pass a turn and attack with him unblocked: Salty Mike loses 1 life *and* gets a poison counter. Both, not one instead of the other - that is toxic rather than infect.",
      "Try to block with Skrelv: refused. He can't block.",
      "Activate him: {W/P} and tap. Pay it with a white mana once, and with 2 life the second time - check your life drops by exactly 2.",
      "Choose white, targeting Goblin Rabblemaster: it gains toxic 1 and hexproof from white, and Mother of Runes (white) can't block it this turn.",
      "Phyrexian Walker is colourless and can still block it. The protection is from the named colour only.",
      "Attack with the pumped Rabblemaster and check the granted toxic 1 gives a poison counter too.",
      "Try to target Skrelv himself: refused. It says 'another target creature you control'.",
      "At 2 life or less the ability is not offered at all - paying 2 life down to 0 is not a legal payment.",
    ],
  },
  {
    cardId: "sokenzan-crucible-of-defiance",
    setup:
      "Two legendary creatures out, so the channel cost reduction has something to count and you can see the number move.",
    yours: [{ id: "myrel-shield-of-argive" }, { id: "ragavan-nimble-pilferer" }],
    extraMana: { generic: 3, r: 1 },
    checks: [
      "Play Sokenzan as a land: it taps for {R}, and it is legendary.",
      "Reset. Channel it from your hand instead: {3}{R}, discard it, and you get two 1/1 colourless Spirit creature tokens with haste until end of turn.",
      "The cost is {1} less for each legendary creature you control. With Myrel and Ragavan out it is {1}{R}, not {3}{R} - check before you pay.",
      "Attack with the Spirits immediately: the haste is the reason to do this in combat rather than in your main phase.",
      "They are not Humans. With Winota out, attacking with them fires the trigger twice.",
      "The channel discards the card as a cost, so you cannot channel it and still play it as a land.",
    ],
  },
  {
    cardId: "sol-ring",
    setup: "Nothing but the Ring, and a four-drop in hand for the mana to go into.",
    yourHand: ["myrel-shield-of-argive"],
    checks: [
      "Cast Sol Ring for {1}.",
      "Tap it the same turn: two colourless mana. An artifact that is not a creature has no summoning sickness to wait out.",
      "Cast Myrel with it plus two more lands: {3}{W} paid mostly by the Ring.",
      "The mana is {C}: it pays generic happily and no coloured pip at all. Try to pay the {W} with it and check it is refused.",
      "This card is in both lab decks - if you have walked it on the Blech boards, its verdict there is filed separately from this one.",
    ],
  },
  {
    cardId: "spirit-of-the-labyrinth",
    setup:
      "A card-draw effect on hand, because the clause is about the second draw and there is no way to see it without drawing twice.",
    yours: [{ id: "sunbaked-canyon" }],
    extraMana: { generic: 1 },
    checks: [
      "Cast Spirit of the Labyrinth for {1}{W}: a 3/1 Enchantment Creature - Spirit.",
      "Pass a turn and take your draw for turn: that is your one card.",
      "Sacrifice Sunbaked Canyon to draw another: the draw simply does not happen.",
      "Crucially, a refused draw is *not* drawing from an empty library - check you have not lost the game and that nothing thinks you tried.",
      "It says 'each player', so Salty Mike is limited too. Have him try to draw twice on his turn.",
      "Pass the turn: the count resets, and the next draw for turn works.",
    ],
  },
  {
    cardId: "starting-town",
    setup:
      "Nothing but the land. Its whole text is about which turn of the game it is, and a lab board opens on turn one.",
    checks: [
      "Play Starting Town on turn one: it enters untapped, because it is your first turn.",
      "Tap it for {C}: free, no life.",
      "Reset. Tap it and pay 1 life instead: the picker offers all five colours, and your life is 39.",
      "Pass to your fourth turn and play a second copy if the board allows: it enters tapped. The window is your first, second or third turn only.",
      "It is a Town by subtype, which nothing else in this deck cares about - worth noting so a future card does not surprise you.",
    ],
  },
  {
    cardId: "sunbaked-canyon",
    setup: "Nothing but the land. Every one of its abilities costs you something, which is the whole design.",
    extraMana: { generic: 1 },
    checks: [
      "Play Sunbaked Canyon: it enters untapped.",
      "Tap it and pay 1 life: the picker offers {R} and {W} only, not five colours. Your life is 39.",
      "There is no free colourless ability on this one - compare it with Battlefield Forge, which has one.",
      "Reset. Pay {1}, tap it and sacrifice it: you draw a card. That is the land turning into a cantrip when you no longer need the mana.",
      "The sacrifice and the mana ability are alternatives - once it is tapped for mana it cannot also be sacrificed to draw that turn.",
    ],
  },
  {
    cardId: "sunbillow-verge",
    setup:
      "Nothing on the board, so the conditional half starts switched off and you can watch it come on.",
    lands: [],
    checks: [
      "Play Sunbillow Verge with an empty battlefield: it enters untapped.",
      "Tap it: only {W} is offered. The red ability is switched off because you control no Mountain and no Plains.",
      "Reset. Play a Mountain first, then the Verge: now the picker offers {W} and {R}.",
      "Reset with a Plains instead: also both. Either subtype does it.",
      "The Verge itself is not a Mountain or a Plains, so it cannot turn its own second ability on.",
      "Note this is an 'activate only if' gate rather than an enters-tapped gate - the land is always untapped, and it is the ability that is conditional.",
    ],
  },
  {
    cardId: "swords-to-plowshares",
    setup:
      "A big creature of Salty Mike's and a small one of your own, because the life goes to the creature's controller and the amount is its power.",
    theirs: [{ id: "angraths-marauders" }],
    yours: [{ id: "ocelot-pride" }],
    checks: [
      "Cast Swords to Plowshares for {W} on Angrath's Marauders: it is exiled, not destroyed - check the graveyard.",
      "Salty Mike gains 4 life, equal to its power. He is on 44.",
      "Reset and point it at your own Ocelot Pride: legal, and *you* gain 1. It says 'its controller', and this is the line worth proving.",
      "Exile is why this is in the deck rather than a destroy effect - it beats indestructible and leaves nothing to recur.",
      "Point it at a creature with a +1/+1 counter and check the life gained counts the counter, not the printed power.",
    ],
  },
  {
    cardId: "voice-of-victory",
    setup:
      "A spell in Salty Mike's hand for the lock half, and an empty board across the table so the tokens can attack.",
    theirHand: ["swords-to-plowshares"],
    theirs: [{ id: "plains" }, { id: "plains" }],
    checks: [
      "Cast Voice of Victory for {1}{W}: a 1/3 Human Bard.",
      "Still on your turn, have Salty Mike try to cast Swords to Plowshares: refused. This is the Grand Abolisher clause without the ability half - check he *can* still activate abilities.",
      "Pass the turn: on his own turn he can cast normally.",
      "Pass back and attack with Voice of Victory: mobilize 2 makes two 1/1 red Warrior tokens, tapped and attacking, already in this combat.",
      "The Warriors are sacrificed at the beginning of the next end step. Get there and check they go.",
      "They are not Humans. With Winota out, they fire the trigger - two attackers, two triggers.",
    ],
  },
  {
    cardId: "windcrag-siege",
    setup:
      "An attack trigger of your own already on the board, because the Mardu half doubles a triggered ability that a creature attacking causes, and needs one to double.",
    yours: [{ id: "ainok-strike-leader" }, { id: "ocelot-pride" }],
    checks: [
      "Cast Windcrag Siege for {1}{R}{W}: as it enters you choose Mardu or Jeskai. Take Mardu.",
      "Attack with Ainok Strike Leader: its attack trigger fires an additional time, so you get two Goblin tokens rather than one.",
      "With Winota on the board, attack with a non-Human and check that trigger is doubled too - two looks at the top six, which is what the card is here for.",
      "A trigger that is not caused by a creature attacking is untouched. Check an enter-the-battlefield trigger fires once.",
      "Reset and choose Jeskai instead: at the beginning of your upkeep you get a 1/1 red Goblin token with lifelink and haste until end of turn.",
      "Attack with that Goblin the same turn and check you gain the life.",
      "The choice is made as it enters and never again - there is no way to switch modes later.",
    ],
  },
  {
    cardId: "windswept-heath",
    setup: "Nothing but the land. The pile under your library holds a Forest and a Plains for it.",
    checks: [
      "Play Windswept Heath: it enters untapped and makes no mana of its own.",
      "Activate it: tap, pay 1 life, sacrifice it, search for a Forest or Plains card.",
      "Take the Plains: it arrives untapped, and your life is 39.",
      "The Mountain is not on offer, so in this deck the Heath finds white only - it is here for the shuffle and the Plains, not for green.",
      "Sacred Foundry is a Mountain Plains and is a legal find, which is how it reaches red at all.",
      "This card is in both lab decks. Its verdict here is filed separately from the one on the Blech boards.",
    ],
  },
  {
    cardId: "zealous-conscripts",
    setup:
      "Something of Salty Mike's worth stealing and something of your own worth untapping, because the trigger does three things at once and 'target permanent' is any permanent.",
    theirs: [{ id: "angraths-marauders" }, { id: "sol-ring", tapped: true }],
    yours: [{ id: "goblin-rabblemaster", tapped: true }],
    checks: [
      "Cast Zealous Conscripts for {4}{R}: a 3/3 Human Warrior with haste, and its enter trigger targets a permanent.",
      "Take Angrath's Marauders: you control it until end of turn, it untaps, and it gains haste. Attack with it immediately.",
      "At end of turn it goes back to Salty Mike. Check it really returns rather than staying.",
      "Reset and target your own tapped Goblin Rabblemaster instead: gaining control of something you already control is legal, and the useful half is that it untaps and gains haste.",
      "Reset and target Salty Mike's Sol Ring: it is 'target permanent', not target creature. Untap it and tap it for mana on your own turn.",
      "The Conscripts themselves have haste, so they can attack the turn they arrive as well.",
    ],
  },
];
