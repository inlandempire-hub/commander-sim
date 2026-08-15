"""Generate engine card fixtures from the cached Scryfall bulk data.

Only emits cards the engine can represent *exactly* - if a card has any text the
effect DSL can't express, it is skipped rather than approximated. That rule is
the whole point: a fixture that silently drops half a card's rules text is worse
than not having the card at all.

    py -X utf8 tools/scryfall-report/gen_fixtures.py B 45 > black.ts
    py -X utf8 tools/scryfall-report/gen_fixtures.py --commanders R
    py -X utf8 tools/scryfall-report/gen_fixtures.py --spells U 20

Deliberately conservative: a card whose text this cannot express exactly is
skipped, never approximated.

First Strike and Double Strike were refused here until 2026-07-31, when the
engine gained the separate combat-damage sub-step they need. They are supported
now. Anything still absent from SUPPORTED_KEYWORDS or SPELL_RULES is absent
because the engine genuinely cannot do it.
"""

import gzip
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).parent / "data" / "oracle-cards.jsonl.gz"

# Keywords the engine actually enforces in play.
SUPPORTED_KEYWORDS = {
    "first strike": "First Strike",
    "double strike": "Double Strike",
    "flying": "Flying",
    "trample": "Trample",
    "deathtouch": "Deathtouch",
    "lifelink": "Lifelink",
    "haste": "Haste",
    "vigilance": "Vigilance",
    "menace": "Menace",
    "reach": "Reach",
    "defender": "Defender",
    "hexproof": "Hexproof",
    "indestructible": "Indestructible",
}

"""
Lifegain and draw on something entering the battlefield.

These are written out one shape at a time on purpose. A single loose pattern -
`^When(?:ever)? .*enters, you gain (\\d+) life\\.$` - is what this file used
until 2026-08-07, and it matched all of these and emitted every one of them as
`enters-battlefield`, the trigger that fires only when the card itself arrives.
For a card that says "whenever *another* creature you control enters" that is
the one moment its own text excludes, so it gained life exactly once, at the
wrong time, and never again. Eight cards shipped that way and had to be
corrected; the note on TriggeredAbility in types.ts is the scar.

Bogwater Lumaret is the card that proved the pattern was still dangerous - it
reads "whenever this creature *or another creature you control* enters", and the
loose pattern quietly wrote it as a plain ETB.

Anything resembling one of these that does not match exactly is refused by
ENTERS_TRIGGERISH below rather than guessed at.
"""
# Every card-writing path in this file goes through `enters_trigger` below, so
# these are written once and cover creatures, lands, artifacts and enchantments
# alike. There used to be a second, narrower copy for permanents; two copies of
# a rule this easy to get wrong is one copy too many.
SELF = r"(?:creature|land|permanent|artifact|enchantment)"

# "When this creature enters, you gain 2 life." / "When this land enters, ..."
SELF_ENTERS_GAIN = re.compile(r"^When this %s enters, you gain (\d+) life\.$" % SELF)
SELF_ENTERS_DRAW = re.compile(r"^When this %s enters, draw a card\.$" % SELF)
# "Whenever another creature you control enters, you gain 1 life." - Kor Skyfisher family.
OTHERS_ENTERS_GAIN = re.compile(
    r"^Whenever another creature you control enters, you gain (\d+) life\.$"
)
# "Whenever this creature or another creature you control enters, ..." - Kor
# Celebrant, and Bogwater Lumaret, which is the card that proved the old loose
# pattern was still live in the creature path.
SELF_OR_OTHERS_ENTERS_GAIN = re.compile(
    r"^Whenever this %s or another creature you control enters, you gain (\d+) life\.$" % SELF
)
# "Whenever another creature enters, you gain 1 life." - Soul Warden, watching
# every player's side of the table rather than only its controller's.
ANY_ENTERS_GAIN = re.compile(r"^Whenever another creature enters, you gain (\d+) life\.$")

# The guard. Any line that talks about something entering and gaining life or
# drawing, and is not one of the exact shapes above, refuses the card.
ENTERS_TRIGGERISH = re.compile(r"^When(?:ever)? .*enters.*, (?:you gain \d+ life|draw)")

# "{1}{G}: This creature gets +2/+2 until end of turn." - an activated ability
# using the same until-end-of-turn modifier the pump spells do.
ACTIVATED_PUMP = re.compile(
    r"^((?:\{[^}]+\})+): This creature gets \+(\d+)/\+(\d+) until end of turn\.$"
)

WORD_NUMBERS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


# ---------------------------------------------------------------------------
# Lands and other noncreature permanents.
#
# Added 2026-08-07. Until then this file emitted creatures, instants and
# sorceries only, which is why the pool had 817 cards and exactly five lands -
# the basics, hand-written. A real decklist is a quarter to a third lands, so
# no list could ever be more than three-quarters representable however many
# creatures got added.
# ---------------------------------------------------------------------------

# A land with a basic land type taps for that colour without saying so: the
# ability comes from the type, and the card's own text is reminder text in
# brackets that strip_reminder throws away. Bayou reads as blank rules text and
# is a dual land; the mana has to come from "Land - Swamp Forest".
BASIC_LAND_MANA = {
    "Plains": "W", "Island": "U", "Swamp": "B", "Mountain": "R", "Forest": "G",
}

# "{T}: Add {G}." / "{T}: Add {C}{C}." - one colour, one or more of it.
TAP_ADD = re.compile(r"^\{T\}: Add ((?:\{[WUBRGC]\})+)\.$")
# "{T}: Add {B} or {G}." - written as two separate abilities, which is what the
# engine's activatedAbilities array already is. No new engine concept needed.
TAP_ADD_EITHER = re.compile(r"^\{T\}: Add \{([WUBRGC])\}(?:, \{([WUBRGC])\},)? or \{([WUBRGC])\}\.$")
ENTERS_TAPPED = re.compile(r"^This (?:land|permanent|artifact|creature|enchantment) enters tapped\.$")

# "This land enters tapped unless ..." - the drawback most nonbasic duals carry.
# Three conditions cover every one of them in the format; a fourth gets added
# the day a card needs it, rather than inventing a predicate language now.
ENTERS_TAPPED_UNLESS_LANDS = re.compile(
    r"^This land enters tapped unless you control (two|three|\d+) or more other lands\.$"
)
ENTERS_TAPPED_UNLESS_OPPONENTS = re.compile(
    r"^This land enters tapped unless you have (two|three|\d+) or more opponents\.$"
)
# Capitalised for the same reason `ONLY_IF_SUBTYPE` is - "unless you control a
# basic land" would otherwise become the subtype "basic" and never be true, so
# the land would enter tapped forever.
ENTERS_TAPPED_UNLESS_SUBTYPE = re.compile(
    r"^This land enters tapped unless you control an? ([A-Z][a-z]+)(?: or an? ([A-Z][a-z]+))?\.$"
)

# "Whenever you gain life, put a +1/+1 counter on this creature." (Pest Mascot)
GAIN_LIFE_COUNTER_SELF = re.compile(
    r"^Whenever you gain life, put a \+1/\+1 counter on this creature\.$"
)
# "Whenever you gain life, put a +1/+1 counter on each Pest, Bat, Insect, Snake,
# and Spider you control." (Blech, Loafing Pest) - note "each", not "each
# other": Blech is a Pest and counts itself.
GAIN_LIFE_COUNTER_EACH = re.compile(
    r"^Whenever you gain life, put a \+1/\+1 counter on each ([A-Za-z, ]+?) you control\.$"
)

# "{T}: Add one mana of any color." and Command Tower's restricted version.
# Both become five abilities, one per colour - the same trick as "Add {B} or
# {G}", because activatedAbilities is already a list. The restricted one marks
# all five, and the engine refuses whichever the commander's colours disallow.
TAP_ADD_ANY = re.compile(r"^\{T\}: Add one mana of any color\.$")
TAP_ADD_ANY_IN_IDENTITY = re.compile(
    r"^\{T\}: Add one mana of any color in your commander's color identity\.$"
)
# Exotic Orchard. Still five abilities; the engine filters them against the
# opponent's board every time rather than against the commander's colours.
TAP_ADD_ANY_OPPONENT_LANDS = re.compile(
    r"^\{T\}: Add one mana of any color that a land an opponent controls could produce\.$"
)
# Delighted Halfling. The mana is any colour but is not interchangeable with the
# rest of the pool, so it needs the restriction written onto every half.
TAP_ADD_ANY_LEGENDARY = re.compile(
    r"^\{T\}: Add one mana of any color\. Spend this mana only to cast a legendary spell"
    r"(, and that spell can't be countered)?\.$"
)

# The two riders a mana ability can carry, both written as their own sentence
# after the ability:
#   "{T}: Add {B} or {G}. This land deals 1 damage to you."   (painlands)
#   "{T}: Add {B}. Activate only if you control a Swamp."     (Tainted Wood)
# Peeled off before the ability itself is read, so one rider does not need a
# second copy of every mana pattern to go with it.
PAIN_RIDER = re.compile(
    r"\s*This (?:land|creature|permanent|artifact) deals (\d+) damage to you\.$"
)
ONLY_IF_RIDER = re.compile(r"\s*Activate only if (.+?)\.$")

# The conditions an "Activate only if" rider names. Same closed set the taplands
# use, and deliberately so - both are asking the engine one question about the
# board, and the day they stop agreeing is the day one of them is wrong.
#
# The subtype has to be capitalised, because in oracle text a real subtype
# always is. Without that, "activate only if you control a commander" reads as
# the subtype "commander", matches no card in the game, and the ability becomes
# one that can never be activated - a card silently turned into a blank.
ONLY_IF_SUBTYPE = re.compile(r"^you control an? ([A-Z][a-z]+)(?: or an? ([A-Z][a-z]+))?$")
ONLY_IF_SUBTYPE_COUNT = re.compile(r"^you control (two|three|\d+) or more ([A-Z][a-z]+)s$")
ONLY_IF_COLOR_COUNT = re.compile(
    r"^you control (two|three|\d+) or more (white|blue|black|red|green) permanents$"
)

COLOR_WORDS = {"white": "W", "blue": "U", "black": "B", "red": "R", "green": "G"}

# Filter lands: "{B/G}, {T}: Add {B}{B}, {B}{G}, or {G}{G}."
#
# One printed ability with three outputs, written as three - the same trick as
# "Add {B} or {G}", for the same reason. The {B/G} in the cost is a real hybrid
# symbol: it must be paid with black or green, and colourless mana can never
# cover it.
FILTER_LAND = re.compile(
    r"^\{([WUBRGC])/([WUBRGC])\}, \{T\}: Add "
    r"((?:\{[WUBRGC]\})+), ((?:\{[WUBRGC]\})+), or ((?:\{[WUBRGC]\})+)\.$"
)

# "{G}, {T}: You gain 1 life." - Sapseep Forest, whose whole card is that
# ability plus the restriction rider on the end of it.
ACTIVATED_GAIN_LIFE = re.compile(
    r"^((?:\{[^}]+\})+), \{T\}: You gain (\d+) life\.$"
)

# "{T}: Regenerate target Insect, Rat, Spider, or Squirrel." - Swarmyard.
TAP_REGENERATE = re.compile(
    r"^\{T\}: Regenerate target ([A-Za-z]+)(?:, ([A-Za-z]+))?(?:, ([A-Za-z]+))?"
    r"(?:, or ([A-Za-z]+))?\.$"
)



# Fetchlands, and the one shape they all share:
#   "{T}, Pay 1 life, Sacrifice this land: Search your library for a Swamp or
#    Mountain card, put it onto the battlefield, then shuffle."
#
# The find is by land *type*, not by "basic land" - a fetch can take Bayou, and
# writing it as basics-only would be a materially weaker card.
FETCH = re.compile(
    r"^\{T\}, Pay (\d+) life, Sacrifice this land: Search your library for an? "
    r"([A-Za-z]+)(?:, ([A-Za-z]+),)? or ([A-Za-z]+) card, put it onto the battlefield( tapped)?, "
    r"then shuffle\.$"
)
# "Sacrifice this creature: Search your library for a basic land card, put that
# card onto the battlefield tapped, then shuffle." - Sakura-Tribe Elder.
SAC_FOR_BASIC = re.compile(
    r"^Sacrifice this (?:creature|land|permanent): Search your library for a basic land card, "
    r"put (?:it|that card) onto the battlefield( tapped)?, then shuffle\.$"
)

# Riveteers Overlook and its cycle:
#   "When this land enters, sacrifice it. When you do, search your library for a
#    basic Swamp, Mountain, or Forest card, put it onto the battlefield tapped,
#    then shuffle and you gain 1 life."
#
# The "When you do" is a reflexive trigger, which in practice is just "and then"
# - nothing can respond between the two halves, so it is one sequence.
#
# Note "basic Swamp, Mountain, or Forest": both basicLandOnly *and* subtypes,
# unlike a fetchland, which asks only for the type and so can take a dual.
SAC_FOR_BASIC_SUBTYPE_AND_LIFE = re.compile(
    r"^When this land enters, sacrifice it\. When you do, search your library for a basic "
    r"([A-Za-z]+)(?:, ([A-Za-z]+),)? or ([A-Za-z]+) card, put it onto the battlefield( tapped)?, "
    r"then shuffle and you gain (\d+) life\.$"
)

# "{G}, Sacrifice this creature: Exile target noncreature artifact or
# noncreature enchantment." - Haywire Mite.
#
# The sacrifice half needed nothing built: `sacrificeSelf` has been an
# activation cost since the fetchlands. What was missing was a target selector
# that could name two card types and exclude creatures from both.
SAC_TO_EXILE_NONCREATURE = re.compile(
    r"^((?:\{[^}]+\})+), Sacrifice this creature: Exile target noncreature ([a-z]+) "
    r"or noncreature ([a-z]+)\.$"
)


def enters_tapped_condition(line):
    """The `entersTappedUnless` clause for a conditional tapland, or None."""
    lands = ENTERS_TAPPED_UNLESS_LANDS.match(line)
    if lands:
        return '{ kind: "controls-other-lands", count: %d }' % number(lands.group(1))
    opponents = ENTERS_TAPPED_UNLESS_OPPONENTS.match(line)
    if opponents:
        return '{ kind: "opponents", count: %d }' % number(opponents.group(1))
    subtype = ENTERS_TAPPED_UNLESS_SUBTYPE.match(line)
    if subtype:
        names = [g for g in subtype.groups() if g]
        return '{ kind: "controls-subtype", subtypes: [%s] }' % ", ".join('"%s"' % n for n in names)
    return None


def gain_life_trigger(line):
    """A "whenever you gain life" trigger, or None."""
    if GAIN_LIFE_COUNTER_SELF.match(line):
        return '{ event: "gain-life", effect: { kind: "addCounter", amount: 1 } }'
    each = GAIN_LIFE_COUNTER_EACH.match(line)
    if each:
        # "Pest, Bat, Insect, Snake, and Spider" -> the five subtypes. The
        # Oxford comma is the catch: splitting on commas first leaves "and
        # Spider" as a subtype, and "and Spider" matches nothing on any card.
        parts = re.split(r",\s*|\s+and\s+", each.group(1))
        subtypes = [re.sub(r"^and\s+", "", s.strip()) for s in parts if s.strip()]
        subtypes = [s for s in subtypes if s]
        if not subtypes:
            return None
        return (
            '{ event: "gain-life", effect: { kind: "addCounterToEachOther", amount: 1, '
            'subtypes: [%s], includesSelf: true } }' % ", ".join('"%s"' % s for s in subtypes)
        )
    return None


# ---------------------------------------------------------------------------
# Tokens.
#
# `createToken` has worked since 2026-08-03, but it takes a
# `tokenDefinitionId`, and the only definitions in existence were two written
# by hand (Soldier, Saproling). So "token creation" was never the missing
# feature - what was missing was a way to *mint* the definition a card names.
#
# A token is an ordinary CardDefinition flagged `isToken`, so minting one is
# reading the noun phrase the card prints and writing that down.
# ---------------------------------------------------------------------------

TOKEN_COLORS = {"white": "W", "blue": "U", "black": "B", "red": "R", "green": "G"}

# "four 1/1 green Insect creature tokens with flying and deathtouch"
# "a 1/1 black Snake creature token with deathtouch"
# "a 1/1 green Insect creature token"
TOKEN_PHRASE = re.compile(
    r"^(a|an|one|two|three|four|five|six|seven|eight|nine|ten|\d+) "
    r"(\d+)/(\d+) "
    r"((?:(?:white|blue|black|red|green)(?: and )?)+) "
    r"([A-Z][a-z]+(?: [A-Z][a-z]+)*) creature tokens?"
    r"(?: with ([a-z, ]+?))?$"
)

# A token carrying its own rules text - "with \"When this token dies, you gain
# 1 life.\"" - is refused rather than stripped down to a vanilla body. Every
# Pest in this deck has one, and a Pest that silently stopped gaining life
# would be a materially different card.
TOKEN_HAS_RULES_TEXT = re.compile(r'creature tokens? with "')


def mint_token(phrase):
    """(count, token TS, token id) for a printed token phrase, or None.

    None means "do not write this card": either the phrase is a shape this has
    never seen, or the token carries rules text, which is refused above.
    """
    match = TOKEN_PHRASE.match(phrase.strip())
    if not match:
        return None
    count_word, power, toughness, colors_text, subtypes_text, keywords_text = match.groups()
    count = WORD_NUMBERS.get(count_word, None)
    if count is None:
        try:
            count = int(count_word)
        except ValueError:
            return None

    colors = [TOKEN_COLORS[c] for c in re.split(r"\s+and\s+", colors_text.strip()) if c in TOKEN_COLORS]
    if not colors:
        return None
    subtypes = subtypes_text.split()

    keywords = []
    if keywords_text:
        for word in re.split(r",\s*|\s+and\s+", keywords_text.strip()):
            word = word.strip().lower()
            if not word:
                continue
            if word not in SUPPORTED_KEYWORDS:
                return None  # a keyword the engine does not enforce
            keywords.append(SUPPORTED_KEYWORDS[word])

    # The id has to describe the token completely, because two cards making
    # "a 1/1 green Insect" and "a 1/1 green Insect with flying" must not share
    # one definition. Colour and keywords are in the name for that reason.
    parts = ["".join(colors).lower(), "%s%s" % (power, toughness), "-".join(s.lower() for s in subtypes)]
    if keywords:
        parts.append("-".join(k.lower().replace(" ", "") for k in keywords))
    token_id = "token-%s" % "-".join(parts)

    lines = [
        "export const %s: CardDefinition = {" % const_name(token_id),
        '  id: "%s",' % token_id,
        '  name: "%s",' % " ".join(subtypes),
        '  types: ["Creature"],',
        "  subtypes: [%s]," % ", ".join('"%s"' % s for s in subtypes),
        "  colorIdentity: [%s]," % ", ".join('"%s"' % c for c in colors),
        "  power: %s," % power,
        "  toughness: %s," % toughness,
    ]
    if keywords:
        lines.append("  keywords: [%s]," % ", ".join('"%s"' % k for k in keywords))
    lines.append("  isToken: true,")
    lines.append('  tier: "vanilla",')
    lines.append("};")
    return count, "\n".join(lines), token_id


# Every token definition any card in this run minted, keyed by id so two cards
# naming the same token share one definition rather than emitting it twice.
MINTED_TOKENS = {}


def token_effect(phrase):
    """The `createToken` effect TS for a printed token phrase, or None.

    None refuses the whole card. That is the right answer for a token with its
    own rules text: TOKEN_PHRASE cannot match the quotation, so a Pest token
    that gains you life on death is refused rather than quietly minted as a
    vanilla 1/1 - which would be a different card wearing the same name.
    """
    minted = mint_token(phrase)
    if minted is None:
        return None
    count, token_ts, token_id = minted
    MINTED_TOKENS[token_id] = token_ts
    return '{ kind: "createToken", count: %d, tokenDefinitionId: "%s" }' % (count, token_id)


"""
A triggered ability, read as two halves that are matched separately.

Until 2026-08-10 this file matched whole lines: one pattern per (trigger,
effect) pair, so "when this creature enters, you gain 2 life" and "whenever
this creature attacks, you gain 2 life" were two unrelated regexes and the
second one simply did not exist. The engine could play Shopkeeper's Bane
perfectly - attacks triggers and life gain had both worked for weeks - and the
generator refused it purely because nobody had written that pair down.

Splitting the line at the comma fixes that shape of gap for good: every trigger
clause now composes with every effect the DSL can express, so adding one new
clause adds it for all of them at once.
"""

# The ability word some cards print in italics before the real text - "Landfall
# — ", "Morbid — ". It has no rules meaning at all (rule 207.2c), so it is
# stripped rather than parsed. Scryfall writes a true em dash.
ABILITY_WORD = re.compile(r"^[A-Z][a-z]+(?: [a-z]+)? — ")

# Each entry is (pattern, trigger fields). The pattern matches only the "When
# ..." clause; whatever follows the comma is handed to `trigger_effect`.
#
# `watchFor` is written out rather than left off on every watcher: omitting it
# watches *every* permanent, which no card of this shape means, and which
# Tanglespan Lookout got wrong once.
TRIGGER_CLAUSES = [
    (r"When this %s enters" % SELF, '{ event: "enters-battlefield"'),
    (r"When this %s dies" % SELF, '{ event: "dies"'),
    (r"Whenever this creature attacks", '{ event: "attacks"'),
    # "Whenever you gain life" is deliberately absent: `gain_life_trigger` owns
    # it, because its effects (counters on this creature, counters on each of
    # five subtypes) are shapes nothing else uses. Two matchers for one clause
    # would mean whichever ran first quietly decided the answer.
    # Watchers on something else entering.
    (r"Whenever this %s or another creature you control enters" % SELF,
     '{ event: "permanent-enters", watches: "controller", includesSelf: true, watchFor: { type: "Creature" }'),
    (r"Whenever another creature you control enters",
     '{ event: "permanent-enters", watches: "controller", watchFor: { type: "Creature" }'),
    (r"Whenever another creature enters",
     '{ event: "permanent-enters", watches: "any", watchFor: { type: "Creature" }'),
    # Landfall. "a land you control" is its controller's only; "a land" with no
    # qualifier is every player's, which is Lifegift and nothing else so far.
    (r"Whenever a land you control enters", '{ event: "landfall", watches: "controller"'),
    (r"Whenever a land enters", '{ event: "landfall", watches: "any"'),
    # Watchers on a death. Ordered longest-first so the narrowed forms are not
    # swallowed by the plain one.
    (r"Whenever a creature you control with a \+1/\+1 counter on it dies",
     '{ event: "permanent-dies", watches: "controller", includesSelf: true, '
     'watchFor: { type: "Creature", withCounter: true }'),
    (r"Whenever a nontoken creature you control dies",
     '{ event: "permanent-dies", watches: "controller", includesSelf: true, '
     'watchFor: { type: "Creature", nontoken: true }'),
    (r"Whenever this creature or another creature dies",
     '{ event: "permanent-dies", watches: "any", includesSelf: true, watchFor: { type: "Creature" }'),
    (r"Whenever a creature you control dies",
     '{ event: "permanent-dies", watches: "controller", includesSelf: true, watchFor: { type: "Creature" }'),
    # Turn-based. "each" is every player's step, "your" only the controller's -
    # the difference is how often the card does anything, so both are written.
    (r"At the beginning of each upkeep", '{ event: "upkeep", watches: "any"'),
    (r"At the beginning of your upkeep", '{ event: "upkeep", watches: "controller"'),
    (r"At the beginning of each end step", '{ event: "end-step", watches: "any"'),
    (r"At the beginning of your end step", '{ event: "end-step", watches: "controller"'),
    (r"At the beginning of your first main phase", '{ event: "first-main", watches: "controller"'),
    (r"At the beginning of combat on your turn", '{ event: "begin-combat", watches: "controller"'),
]
TRIGGER_CLAUSES = [(re.compile(r"^%s, " % p), fields) for p, fields in TRIGGER_CLAUSES]

# Rule 603.4's intervening-if, which sits between the clause and the effect.
TRIGGER_ONLY_IF = [
    (re.compile(r"^if a creature died this turn, "), '{ kind: "creature-died-this-turn" }'),
    # "if you control no Snakes" - Ophiomancer. Written as the negation of
    # "you control a Snake", which is a condition the engine already asks
    # everywhere else. The plural is stripped: the subtype is "Snake".
    (re.compile(r"^if you control no ([A-Z][a-z]+)s, "),
     lambda m: '{ kind: "not", condition: { kind: "controls-subtype", subtypes: ["%s"] } }' % m.group(1)),
]

# What a trigger can do. Only shapes with no target and no choice beyond the
# "you may" - a trigger that needs a target needs targeting support the
# triggered path does not have yet, and emitting one would put an ability on
# the stack that can never resolve.
TRIGGER_EFFECTS = [
    # "you gain 1 life" and "gain 1 life" are the same effect: the second is
    # what is left after "you may " is peeled off the front of Lifegift.
    (re.compile(r"^(?:you )?gain (\d+) life\.$"), lambda m: '{ kind: "gainLife", amount: %s }' % m.group(1)),
    (re.compile(r"^draw a card\.$"), lambda m: '{ kind: "draw", amount: 1 }'),
    (re.compile(r"^draw (\w+) cards\.$"),
     lambda m: '{ kind: "draw", amount: %d }' % WORD_NUMBERS[m.group(1)]
     if m.group(1) in WORD_NUMBERS else None),
    (re.compile(r"^put a \+1/\+1 counter on this creature\.$"),
     lambda m: '{ kind: "addCounter", amount: 1 }'),
    # "create four 1/1 green Insect creature tokens with flying and
    # deathtouch". The token itself is minted as a side effect and
    # collected in MINTED_TOKENS for the emitter to write out.
    (re.compile(r"^create (.+)\.$"), lambda m: token_effect(m.group(1))),
]


def trigger_effect(text):
    """The TS for the effect half of a trigger line, or None if unreadable."""
    for pattern, build in TRIGGER_EFFECTS:
        match = pattern.match(text)
        if match:
            return build(match)
    return None


def enters_trigger(line):
    """The TS for a triggered ability, or None if this line is not one.

    Named for what it used to handle. Kept because four call sites use it and
    renaming it is a change to those files rather than to this behaviour.
    """
    line = ABILITY_WORD.sub("", line)
    for pattern, fields in TRIGGER_CLAUSES:
        match = pattern.match(line)
        if not match:
            continue
        rest = line[match.end():]

        only_if = ""
        for cond_pattern, cond_ts in TRIGGER_ONLY_IF:
            cond = cond_pattern.match(rest)
            if cond:
                # Some conditions read a name out of the text, so an entry
                # may be a builder rather than a fixed string.
                only_if = ", onlyIf: %s" % (cond_ts(cond) if callable(cond_ts) else cond_ts)
                rest = rest[cond.end():]
                break

        # "you may draw a card" - the game stops and asks rather than taking it.
        optional = ""
        if rest.startswith("you may "):
            optional = ", optional: true"
            rest = rest[len("you may "):]
            # Recapitalise nothing - the effect patterns are all lowercase
            # because they always follow a comma.

        effect = trigger_effect(rest)
        if effect is None:
            # A clause we know followed by an effect we do not. Refusing here
            # rather than falling through is what stops a card keeping its
            # trigger and silently losing what the trigger does.
            return None
        return "%s%s%s, effect: %s }" % (fields, only_if, optional, effect)
    return None


def mana_ability(color, amount=1, color_from=None, riders=""):
    source = ', colorFrom: "%s"' % color_from if color_from else ""
    return (
        '{ cost: { tap: true }, effect: { kind: "addMana", color: "%s", amount: %d }%s%s }'
        % (color, amount, source, riders)
    )


def any_color_abilities(color_from=None, riders=""):
    """One ability per colour. A choice of five, written as five."""
    return [mana_ability(c, 1, color_from, riders) for c in ("W", "U", "B", "R", "G")]


def only_if_condition(clause):
    """The `activateOnlyIf` condition for an "Activate only if ..." rider, or None."""
    color = ONLY_IF_COLOR_COUNT.match(clause)
    if color:
        return '{ kind: "controls-color", color: "%s", count: %d }' % (
            COLOR_WORDS[color.group(2)],
            number(color.group(1)),
        )
    counted = ONLY_IF_SUBTYPE_COUNT.match(clause)
    if counted:
        return '{ kind: "controls-subtype", subtypes: ["%s"], count: %d }' % (
            counted.group(2),
            number(counted.group(1)),
        )
    subtype = ONLY_IF_SUBTYPE.match(clause)
    if subtype:
        names = [g for g in subtype.groups() if g]
        return '{ kind: "controls-subtype", subtypes: [%s] }' % ", ".join('"%s"' % n for n in names)
    return None


def split_riders(line):
    """
    Peels the trailing rider sentences off an ability line.

    Returns (core, riders, ok). `ok` is False when a rider was recognised as a
    rider but its wording could not be read - "activate only as a sorcery", a
    timing restriction rather than a board one. That has to refuse the card
    rather than fall through, because dropping the restriction silently would
    make the ability strictly better than the printed card.
    """
    riders = ""
    ok = True

    only_if = ONLY_IF_RIDER.search(line)
    if only_if:
        condition = only_if_condition(only_if.group(1))
        if condition is None:
            return line, "", False
        riders += ", activateOnlyIf: %s" % condition
        line = line[: only_if.start()]

    pain = PAIN_RIDER.search(line)
    if pain:
        riders += ", damageToController: %s" % pain.group(1)
        line = line[: pain.start()]

    return line.strip(), riders, ok


def gain_life_ability(line):
    """"{G}, {T}: You gain 1 life. Activate only if ...", or None."""
    core, riders, ok = split_riders(line)
    if not ok:
        return False
    match = ACTIVATED_GAIN_LIFE.match(core)
    if not match:
        return None
    cost = ts_mana_cost(match.group(1))
    if cost is None:
        return None  # hybrid or {X} in the activation cost
    return (
        '{ cost: { tap: true, mana: %s }, effect: { kind: "gainLife", amount: %s }%s }'
        % (cost, match.group(2), riders)
    )


def regenerate_ability(line):
    """"{T}: Regenerate target Insect, Rat, Spider, or Squirrel.", or None."""
    match = TAP_REGENERATE.match(line)
    if not match:
        return None
    subtypes = [g for g in match.groups() if g]
    return (
        '{ cost: { tap: true }, effect: { kind: "regenerate", target: '
        '{ kind: "creature", subtypes: [%s] } } }' % ", ".join('"%s"' % s for s in subtypes)
    )


def mana_abilities(line):
    """
    Every activated ability a mana line produces, or None if it isn't one.

    Shared by the creature path and the permanent path, because a creature that
    taps for mana is not a different kind of mana ability from a land that does
    - and a pattern that lived on only one of them is how Elves of Deep Shadow
    and Llanowar Wastes came to need the same feature twice.

    Returns `False` (not None) for a line that *is* a mana ability but whose
    rider could not be read, so the caller refuses the card instead of trying
    the next pattern on it.
    """
    core, riders, ok = split_riders(line)
    if not ok:
        return False

    tap_add = TAP_ADD.match(core)
    if tap_add:
        symbols = re.findall(r"\{([WUBRGC])\}", tap_add.group(1))
        # "Add {C}{C}" is one ability producing two, not two abilities.
        if len(set(symbols)) != 1:
            return None
        return [mana_ability(symbols[0], len(symbols), riders=riders)]

    either = TAP_ADD_EITHER.match(core)
    if either:
        return [mana_ability(c, riders=riders) for c in either.groups() if c]

    if TAP_ADD_ANY.match(core):
        return any_color_abilities(riders=riders)
    if TAP_ADD_ANY_IN_IDENTITY.match(core):
        return any_color_abilities("commander-identity", riders=riders)
    if TAP_ADD_ANY_OPPONENT_LANDS.match(core):
        return any_color_abilities("opponent-lands", riders=riders)

    legendary = TAP_ADD_ANY_LEGENDARY.match(core)
    if legendary:
        # The "can't be countered" half is optional on the wording and is only
        # written out when the card actually says it, rather than being assumed
        # to travel with the restriction.
        restriction = '{ kind: "legendary-spell"%s }' % (
            ", grantsUncounterable: true" if legendary.group(1) else ""
        )
        return any_color_abilities(
            riders=riders + ", producesRestrictedMana: %s" % restriction,
        )

    filter_land = FILTER_LAND.match(core)
    if filter_land:
        hybrid = '{ generic: 0, colors: {}, hybrid: [["%s", "%s"]] }' % (
            filter_land.group(1),
            filter_land.group(2),
        )
        abilities = []
        for output in filter_land.group(3, 4, 5):
            symbols = re.findall(r"\{([WUBRGC])\}", output)
            parts = []
            for color in dict.fromkeys(symbols):
                parts.append('{ color: "%s", amount: %d }' % (color, symbols.count(color)))
            abilities.append(
                '{ cost: { tap: true, mana: %s }, effect: '
                '{ kind: "addManaCombination", mana: [%s] }%s }'
                % (hybrid, ", ".join(parts), riders)
            )
        return abilities

    return None


def interpret_permanent(card):
    """
    (activated, triggers, enters_tapped) for a noncreature permanent, or None.

    Same contract as `interpret`: one unrepresentable line and the whole card is
    refused. Conditional versions are refused on purpose - "enters tapped unless
    you control two or more other lands" written as flatly tapped is a strictly
    worse card than the one printed, and a fixture that quietly nerfs a card is
    exactly what this file exists to prevent.
    """
    text = strip_reminder(card.get("oracle_text"))
    # Older printings name themselves ("When Radiant Fountain enters..."), the
    # same normalisation the spell path does.
    text = text.replace(card["name"], "this permanent")
    activated = []
    triggers = []
    enters_tapped = False
    enters_tapped_unless = None

    subtypes = card["type_line"].split("—")[-1].strip().split() if "—" in card["type_line"] else []
    if "Land" in card["type_line"]:
        for subtype in subtypes:
            if subtype in BASIC_LAND_MANA:
                activated.append(mana_ability(BASIC_LAND_MANA[subtype]))

    for line in [l.strip() for l in text.split("\n") if l.strip()]:
        if ENTERS_TAPPED.match(line):
            enters_tapped = True
            continue

        condition = enters_tapped_condition(line)
        if condition:
            # It still enters tapped by default; the condition is the exception.
            enters_tapped = True
            enters_tapped_unless = condition
            continue

        gain = gain_life_trigger(line)
        if gain:
            triggers.append(gain)
            continue

        mana = mana_abilities(line)
        if mana is False:
            return None  # a rider on a mana ability that could not be read
        if mana:
            activated.extend(mana)
            continue

        regenerate = regenerate_ability(line)
        if regenerate:
            activated.append(regenerate)
            continue

        lifegain = gain_life_ability(line)
        if lifegain is False:
            return None
        if lifegain:
            activated.append(lifegain)
            continue

        # A land that eats itself on arrival for a tapped basic and a point of
        # life. One triggered ability holding a sequence, not an activated one -
        # nothing is paid and nobody chooses to do it.
        overlook = SAC_FOR_BASIC_SUBTYPE_AND_LIFE.match(line)
        if overlook:
            subtypes = [g for g in overlook.group(1, 2, 3) if g]
            triggers.append(
                '{ event: "enters-battlefield", effect: { kind: "sequence", effects: ['
                '{ kind: "sacrifice", what: "self" }, '
                '{ kind: "searchLibrary", cardType: "Land", basicLandOnly: true, subtypes: [%s], '
                'destination: "battlefield"%s }, '
                '{ kind: "gainLife", amount: %s }] } }'
                % (", ".join('"%s"' % s for s in subtypes),
                   ", tapped: true" if overlook.group(4) else "",
                   overlook.group(5))
            )
            continue

        fetch = FETCH.match(line)
        if fetch:
            life = int(fetch.group(1))
            subtypes = [g for g in fetch.group(2, 3, 4) if g]
            activated.append(
                '{ cost: { tap: true, payLife: %d, sacrificeSelf: true }, effect: '
                '{ kind: "searchLibrary", cardType: "Land", subtypes: [%s], '
                'destination: "battlefield"%s } }'
                % (life, ", ".join('"%s"' % s for s in subtypes),
                   ", tapped: true" if fetch.group(5) else "")
            )
            continue

        # The same shared parser the creature path uses, and the same guard.
        # A land or an enchantment can say "whenever another creature you
        # control enters" just as a creature can - Seraph Sanctuary does - and
        # it must not become the permanent's own arrival on either path.
        trigger = enters_trigger(line) or gain_life_trigger(line)
        if trigger:
            triggers.append(trigger)
            continue
        if ENTERS_TRIGGERISH.match(line):
            return None

        return None  # a line we can't express - skip the whole card

    # A land that taps for nothing and does nothing is not a card worth having,
    # and is usually a sign the interesting half of its text was in a line this
    # refused. Wastes and Wastes-likes are the only real exception and they are
    # not in any list yet.
    if not activated and not triggers:
        return None
    return activated, triggers, enters_tapped, enters_tapped_unless


def emit_permanent(card, activated, triggers, enters_tapped, enters_tapped_unless=None):
    """A CardDefinition for a land, artifact or enchantment - no power/toughness."""
    head = card["type_line"].split("—")[0]
    types = [t for t in ("Land", "Artifact", "Enchantment") if t in head]
    subtypes = card["type_line"].split("—")[-1].strip().split() if "—" in card["type_line"] else []
    supertypes = [s for s in ("Legendary", "Basic", "Snow") if s in head]

    lines = [
        "export const %s: CardDefinition = {" % const_name(card["name"]),
        '  id: "%s",' % slugify(card["name"]),
        '  name: "%s",' % card["name"].replace('"', '\\"'),
        '  scryfallId: "%s",' % card["id"],
        "  types: [%s]," % ", ".join('"%s"' % t for t in types),
    ]
    if subtypes:
        lines.append("  subtypes: [%s]," % ", ".join('"%s"' % s for s in subtypes))
    if supertypes:
        lines.append("  supertypes: [%s]," % ", ".join('"%s"' % s for s in supertypes))
    # Lands have no mana cost at all - not a cost of zero. Writing `{generic: 0}`
    # would make one castable from the hand as a {0} spell.
    if "Land" not in types:
        cost = ts_mana_cost(card.get("mana_cost"))
        if cost is None:
            return None
        lines.append("  manaCost: %s," % cost)
    lines.append("  colorIdentity: [%s]," % ", ".join('"%s"' % c for c in card.get("color_identity") or []))
    if enters_tapped:
        lines.append("  entersTapped: true,")
    if enters_tapped_unless:
        lines.append("  entersTappedUnless: %s," % enters_tapped_unless)
    if triggers:
        lines.append("  triggeredAbilities: [%s]," % ", ".join(triggers))
    if activated:
        lines.append("  activatedAbilities: [%s]," % ", ".join(activated))
    # A mana ability is declarative data, the same as a keyword - the five basic
    # lands have been "vanilla" with an activated ability since the first day.
    # A trigger is the thing that makes a card scripted.
    lines.append('  tier: "%s",' % ("scripted" if triggers else "vanilla"))
    lines.append("};")
    return "\n".join(lines)


def permanent_candidates(colors, want_type):
    """
    Commander-legal lands/artifacts/enchantments this file can represent exactly.

    `colors` is a deck's colour identity as a string - "BG" for Golgari, "C" or
    "" for colourless only - and a card is included when its own identity is a
    *subset* of it. That is the actual Commander deckbuilding rule, and it is
    the difference between 21 lands and 131: an equality test against a single
    colour excludes every dual land ever printed, which is most of the ones
    worth having.
    """
    wanted = {c for c in colors.upper() if c in "WUBRG"}
    out = []
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            if card["legalities"]["commander"] != "legal":
                continue
            type_line = card["type_line"]
            if "Token" in type_line or "//" in card["name"] or card["name"].startswith("A-"):
                continue
            if want_type not in type_line:
                continue
            # A land that is also a creature is played as a land but dies to
            # creature removal and can attack; neither emitter is right for it.
            # An artifact creature is a creature: it needs power and toughness,
            # and emit_permanent writes none. A land creature is played as a
            # land but dies to creature removal. Neither belongs on this path -
            # the Myr and the Hedron Crawler came through here before this
            # check and would have been written as 0/0 permanents.
            if "Creature" in type_line:
                continue
            if not set(card.get("color_identity") or []) <= wanted:
                continue
            interpreted = interpret_permanent(card)
            if interpreted is None:
                continue
            out.append((card, *interpreted))
    return out


def number(word):
    """'two' or '2' into an int, or None if it is neither."""
    if word is None:
        return None
    if word.isdigit():
        return int(word)
    return WORD_NUMBERS.get(word.lower())


def ts_mana_cost(cost_string):
    parsed = parse_mana_cost(cost_string)
    if parsed is None:
        return None
    generic, colors, x = parsed
    pips = ", ".join("%s: %d" % (c, n) for c, n in sorted(colors.items()))
    suffix = ", x: %d" % x if x else ""
    return "{ generic: %d, colors: {%s}%s }" % (generic, " %s " % pips if pips else "", suffix)


def signed(value):
    """-0 is a valid TS number literal but reads as a typo; normalise it to 0."""
    return 0 if value == 0 else value


# Each entry maps one whole line of oracle text to one engine effect. The
# engine's castEffect is a single Effect, so only single-effect spells qualify -
# a spell with two clauses is skipped rather than half-implemented.
SPELL_RULES = [
    (r"^Target creature gets \+(\d+)/\+(\d+) until end of turn\.$",
     lambda m: '{ kind: "pump", power: %s, toughness: %s, target: { kind: "creature" } }' % (m[1], m[2])),
    (r"^Target creature gets -(\d+)/-(\d+) until end of turn\.$",
     lambda m: '{ kind: "pump", power: %d, toughness: %d, target: { kind: "creature" } }'
               % (signed(-int(m[1])), signed(-int(m[2])))),
    (r"^Creatures you control get \+(\d+)/\+(\d+) until end of turn\.$",
     lambda m: '{ kind: "pumpAll", power: %s, toughness: %s, scope: "controller" }' % (m[1], m[2])),
    (r"^All creatures get -(\d+)/-(\d+) until end of turn\.$",
     lambda m: '{ kind: "pumpAll", power: %d, toughness: %d, scope: "all" }'
               % (signed(-int(m[1])), signed(-int(m[2])))),
    (r"^Destroy target creature\.$",
     lambda m: '{ kind: "destroy", target: { kind: "creature" } }'),
    # Land/artifact/enchantment destruction. Creatures keep their own selector;
    # every other permanent type goes through `permanent` with a named type.
    (r"^Destroy target (land|artifact|enchantment)\.$",
     lambda m: '{ kind: "destroy", target: { kind: "permanent", cardTypes: ["%s"] } }' % m[1].capitalize()),
    (r"^Exile target creature\.$",
     lambda m: '{ kind: "exile", target: { kind: "creature" } }'),
    (r"^~ deals (\d+) damage to any target\.$",
     lambda m: '{ kind: "damage", amount: %s, target: { kind: "any-target" } }' % m[1]),
    (r"^This spell deals (\d+) damage to any target\.$",
     lambda m: '{ kind: "damage", amount: %s, target: { kind: "any-target" } }' % m[1]),
    (r"^Draw (a|two|three|four) cards?\.$",
     lambda m: '{ kind: "draw", amount: %d }' % number(m[1])),
    (r"^You gain (\d+) life\.$",
     lambda m: '{ kind: "gainLife", amount: %s }' % m[1]),
    (r"^Counter target spell\.$",
     lambda m: '{ kind: "counter", target: { kind: "spell" } }'),
    (r"^Counter target spell unless its controller pays ((?:\{[^}]+\})+)\.$",
     lambda m: '{ kind: "counter", target: { kind: "spell" }, unlessPays: %s }' % ts_mana_cost(m[1])),

    # Graveyard recursion.
    # Not "permanent" - that is a category spanning several card types, not a
    # type the engine's cardType filter can name, so those cards are skipped.
    (r"^Return target (creature|artifact|enchantment|land|instant|sorcery) card from your graveyard to your hand\.$",
     lambda m: '{ kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard", cardType: "%s" } }'
               % m[1].capitalize()),
    (r"^Return target card from your graveyard to your hand\.$",
     lambda m: '{ kind: "returnFromGraveyard", destination: "hand", target: { kind: "card-in-your-graveyard" } }'),
    (r"^Return target (creature|artifact|enchantment) card from your graveyard to the battlefield\.$",
     lambda m: '{ kind: "returnFromGraveyard", destination: "battlefield", target: { kind: "card-in-your-graveyard", cardType: "%s" } }'
               % m[1].capitalize()),

    # Tutors. "Reveal it" is a no-op in a two-player game where the engine picks
    # the card anyway, so those templates map to the same effect.
    (r"^Search your library for a basic land card, put it onto the battlefield tapped, then shuffle\.$",
     lambda m: '{ kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "battlefield", tapped: true }'),
    (r"^Search your library for a basic land card, put it onto the battlefield, then shuffle\.$",
     lambda m: '{ kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "battlefield" }'),
    (r"^Search your library for a basic land card, reveal it, put it into your hand, then shuffle\.$",
     lambda m: '{ kind: "searchLibrary", cardType: "Land", basicLandOnly: true, destination: "hand" }'),
    (r"^Search your library for a (creature|land|artifact|enchantment|instant|sorcery) card, reveal it, put it into your hand, then shuffle\.$",
     lambda m: '{ kind: "searchLibrary", cardType: "%s", destination: "hand" }' % m[1].capitalize()),
    (r"^Search your library for a card, put that card into your hand, then shuffle\.$",
     lambda m: '{ kind: "searchLibrary", destination: "hand" }'),
    # Tutors that put the card back on top - Sylvan Tutor, Vampiric Tutor.
    # "Then shuffle and put that card on top": the shuffle comes first, which is
    # the whole card, and `resolveSearch` honours that ordering.
    (r"^Search your library for a (creature|land|artifact|enchantment|instant|sorcery) card, reveal it, then shuffle and put that card on top\.$",
     lambda m: '{ kind: "searchLibrary", cardType: "%s", destination: "library-top" }' % m[1].capitalize()),
    (r"^Search your library for a card, then shuffle and put that card on top\.$",
     lambda m: '{ kind: "searchLibrary", destination: "library-top" }'),

    # Rituals. `addMana` has existed since the first Forest was written; what
    # was missing was any way to reach it from a spell rather than from a
    # permanent's tap ability, so Dark Ritual read as unrepresentable.
    (r"^Add ((?:\{[WUBRGC]\})+)\.$", lambda m: add_mana_effect(m[1])),

    # Removal with a rider the victim answers - Assassin's Trophy. Written as a
    # sequence because it is one resolution: the destroy cannot be responded to
    # before the search. `who: "target-controller"` is what hands the search to
    # the player whose permanent just died rather than to the caster.
    (r"^Destroy target permanent an opponent controls\. Its controller may search their library for a basic land card, put it onto the battlefield, then shuffle\.$",
     lambda m: '{ kind: "sequence", effects: ['
               '{ kind: "destroy", target: { kind: "permanent", controlledBy: "opponent" } }, '
               '{ kind: "searchLibrary", cardType: "Land", basicLandOnly: true, '
               'destination: "battlefield", who: "target-controller" }] }'),
]


def add_mana_effect(symbols):
    """'{B}{B}{B}' into addMana, or addManaCombination when the colours differ.

    Two kinds rather than one because `addMana` carries a single colour
    everywhere it is read - the auto-tapper, the pip that flies to the pool, the
    bot's affordability check - and a ritual that adds three of one colour is
    exactly the single-colour shape those readers already handle.
    """
    counts = {}
    for symbol in re.findall(r"\{([WUBRGC])\}", symbols):
        counts[symbol] = counts.get(symbol, 0) + 1
    if len(counts) == 1:
        color, amount = next(iter(counts.items()))
        return '{ kind: "addMana", color: "%s", amount: %d }' % (color, amount)
    parts = ", ".join('{ color: "%s", amount: %d }' % (c, n) for c, n in sorted(counts.items()))
    return '{ kind: "addManaCombination", mana: [%s] }' % parts


# "This spell can't be countered." is a whole line of its own on every card that
# has it, and the engine models it as a flag rather than an effect - so it is
# lifted out before the remaining lines are matched, instead of blocking them.
CANT_BE_COUNTERED = re.compile(r"^This spell can't be countered\.$")


def lift_cant_be_countered(lines):
    """Splits the can't-be-countered line off. Returns (remaining_lines, flag)."""
    kept = [l for l in lines if not CANT_BE_COUNTERED.match(l)]
    return kept, len(kept) != len(lines)


def spell_effect(card):
    """(effect, cant_be_countered) for this instant/sorcery, or None."""
    text = strip_reminder(card.get("oracle_text"))
    # Damage spells name themselves in their own oracle text ("Shock deals 2
    # damage..."). Normalise that to ~ so one pattern covers every printing.
    text = text.replace(card["name"], "~")
    lines, uncounterable = lift_cant_be_countered([l.strip() for l in text.split("\n") if l.strip()])
    if len(lines) != 1:
        return None
    for pattern, build in SPELL_RULES:
        match = re.match(pattern, lines[0])
        if match:
            built = build(match)
            # ts_mana_cost returns None for a cost the engine can't express,
            # which would otherwise be emitted as the literal "None".
            if built is None or "None" in built:
                return None
            return built, uncounterable
    return None


def strip_reminder(text):
    return re.sub(r"\s*\([^)]*\)", "", text or "").strip()


def slugify(name):
    slug = name.lower().replace("'", "").replace(",", "")
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def const_name(name):
    return re.sub(r"[^A-Z0-9]+", "_", name.upper()).strip("_")


def parse_mana_cost(cost_string):
    """Scryfall's '{2}{B}{B}' into the engine's {generic, colors, x} shape.

    Returns None for anything with hybrid or phyrexian symbols, which the engine
    still cannot pay. {X} is counted rather than refused: the engine gained X
    costs on 2026-08-10, and a card is now blocked by whatever its *text* needs
    rather than by the symbol in its cost.
    """
    generic = 0
    colors = {}
    x = 0
    for symbol in re.findall(r"\{([^}]+)\}", cost_string or ""):
        if symbol.isdigit():
            generic += int(symbol)
        elif symbol in "WUBRG":
            colors[symbol] = colors.get(symbol, 0) + 1
        elif symbol == "X":
            x += 1
        else:
            return None  # hybrid, phyrexian, snow - not representable
    return generic, colors, x


def interpret(card):
    """Returns (keywords, triggers, activated, cant_be_countered) if fully representable, else None."""
    text = strip_reminder(card.get("oracle_text"))
    keywords = []
    triggers = []
    activated = []

    lines, uncounterable = lift_cant_be_countered([l.strip() for l in text.split("\n") if l.strip()])
    for line in lines:
        trigger = enters_trigger(line) or gain_life_trigger(line)
        if trigger:
            triggers.append(trigger)
            continue
        if ENTERS_TRIGGERISH.match(line):
            # Close to one of the shapes above without being one of them. Refuse
            # rather than guess: guessing here is precisely how eight cards ended
            # up gaining life at the one moment their text excludes.
            return None

        pump = ACTIVATED_PUMP.match(line)
        if pump:
            cost = ts_mana_cost(pump.group(1))
            if cost is None:
                return None  # hybrid or {X} in the activation cost
            # No `target` on the effect: the engine reads that as "the source
            # itself", which is exactly what "this creature gets +N/+N" means.
            activated.append(
                '{ cost: { mana: %s }, effect: { kind: "pump", power: %s, toughness: %s } }'
                % (cost, pump.group(2), pump.group(3))
            )
            continue

        exile_sac = SAC_TO_EXILE_NONCREATURE.match(line)
        if exile_sac:
            cost = ts_mana_cost(exile_sac.group(1))
            if cost is None:
                return None  # hybrid or {X} in the activation cost
            types = [exile_sac.group(2).capitalize(), exile_sac.group(3).capitalize()]
            activated.append(
                '{ cost: { mana: %s, sacrificeSelf: true }, effect: { kind: "exile", '
                'target: { kind: "permanent", cardTypes: [%s], noncreature: true } } }'
                % (cost, ", ".join('"%s"' % t for t in types))
            )
            continue

        sac = SAC_FOR_BASIC.match(line)
        if sac:
            activated.append(
                '{ cost: { sacrificeSelf: true }, effect: { kind: "searchLibrary", '
                'cardType: "Land", basicLandOnly: true, destination: "battlefield"%s } }'
                % (", tapped: true" if sac.group(1) else "")
            )
            continue

        # Mana creatures, through the same parser the permanent path uses -
        # Elves of Deep Shadow is Llanowar Wastes with legs, and the rider on
        # it is word for word the same rider.
        mana = mana_abilities(line)
        if mana is False:
            return None
        if mana:
            activated.extend(mana)
            continue

        regenerate = regenerate_ability(line)
        if regenerate:
            activated.append(regenerate)
            continue

        lifegain = gain_life_ability(line)
        if lifegain is False:
            return None
        if lifegain:
            activated.append(lifegain)
            continue

        parts = [p.strip().lower() for p in line.split(",") if p.strip()]
        if parts and all(p in SUPPORTED_KEYWORDS for p in parts):
            keywords.extend(SUPPORTED_KEYWORDS[p] for p in parts)
            continue
        return None  # a line we can't express - skip the whole card

    return keywords, triggers, activated, uncounterable


def emit_spell(card, effect, uncounterable=False):
    """A CardDefinition for an instant or sorcery - no P/T, one castEffect."""
    types = [t for t in ("Instant", "Sorcery") if t in card["type_line"]]
    lines = [
        "export const %s: CardDefinition = {" % const_name(card["name"]),
        '  id: "%s",' % slugify(card["name"]),
        '  name: "%s",' % card["name"].replace('"', '\\"'),
        "  types: [%s]," % ", ".join('"%s"' % t for t in types),
        "  manaCost: %s," % ts_mana_cost(card.get("mana_cost")),
        "  colorIdentity: [%s]," % ", ".join('"%s"' % c for c in card.get("color_identity") or []),
        "  castEffect: %s," % effect,
    ]
    if uncounterable:
        lines.append("  cantBeCountered: true,")
    lines.append('  tier: "scripted",')
    lines.append("};")
    return "\n".join(lines)


def emit(card, keywords, triggers, activated=(), uncounterable=False):
    # Formatted by ts_mana_cost rather than unpacked here. parse_mana_cost grew
    # a third member when {X} costs shipped on 2026-08-10 and this was still
    # unpacking two, so every creature and artifact routed through emit_named
    # crashed the whole run - which is why nothing has been generated through
    # this path since. One formatter, one place to change.
    mana_cost = ts_mana_cost(card.get("mana_cost"))
    if mana_cost is None:
        # Hybrid or phyrexian. The colour-spread paths filter the cost before
        # calling this; emit_named does not, and reports the skip itself.
        return None
    subtypes = card["type_line"].split("—")[-1].strip().split() if "—" in card["type_line"] else []
    types = [t for t in ("Artifact", "Creature", "Enchantment") if t in card["type_line"].split("—")[0]]
    supertypes = ["Legendary"] if "Legendary" in card["type_line"] else []

    lines = [
        "export const %s: CardDefinition = {" % const_name(card["name"]),
        '  id: "%s",' % slugify(card["name"]),
        '  name: "%s",' % card["name"].replace('"', '\\"'),
        # Stamped here rather than left to add_scryfall_ids.py afterwards: a
        # fixture without one has no card art, and "run the other script too" is
        # a step that gets forgotten.
        '  scryfallId: "%s",' % card["id"],
        "  types: [%s]," % ", ".join('"%s"' % t for t in types),
    ]
    if subtypes:
        lines.append("  subtypes: [%s]," % ", ".join('"%s"' % s for s in subtypes))
    if supertypes:
        lines.append('  supertypes: ["Legendary"],')
    lines.append("  manaCost: %s," % mana_cost)
    lines.append("  colorIdentity: [%s]," % ", ".join('"%s"' % c for c in card.get("color_identity") or []))
    lines.append("  power: %s," % card["power"])
    lines.append("  toughness: %s," % card["toughness"])
    if keywords:
        lines.append("  keywords: [%s]," % ", ".join('"%s"' % k for k in keywords))
    if triggers:
        lines.append("  triggeredAbilities: [%s]," % ", ".join(triggers))
    if activated:
        lines.append("  activatedAbilities: [%s]," % ", ".join(activated))
    if uncounterable:
        lines.append("  cantBeCountered: true,")
    if supertypes:
        lines.append("  canBeCommander: true,")
    lines.append('  tier: "%s",' % ("scripted" if triggers or activated or uncounterable else "vanilla"))
    lines.append("};")
    return "\n".join(lines)


def candidates(color, want_legendary):
    out = []
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            if card["legalities"]["commander"] != "legal":
                continue
            type_line = card["type_line"]
            if "Token" in type_line or "//" in card["name"] or "Creature" not in type_line:
                continue
            # Land creatures (Dryad Arbor) have no mana cost and are played as a
            # land rather than cast. The emitter below would give one a {0} cost
            # and drop the Land type entirely, producing a castable 1/1 that
            # isn't the real card - so skip them rather than misrepresent them.
            if "Land" in type_line:
                continue
            if (card.get("color_identity") or []) != [color]:
                continue
            if ("Legendary" in type_line) != want_legendary:
                continue
            if card.get("power") is None or not str(card["power"]).isdigit():
                continue
            if not str(card["toughness"]).isdigit():
                continue
            if parse_mana_cost(card.get("mana_cost")) is None:
                continue
            interpreted = interpret(card)
            if interpreted is None:
                continue
            out.append((card, *interpreted))
    return out


def spell_candidates(color):
    out = []
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            if card["legalities"]["commander"] != "legal":
                continue
            type_line = card["type_line"]
            if "//" in card["name"]:
                continue
            if "Instant" not in type_line and "Sorcery" not in type_line:
                continue
            if (card.get("color_identity") or []) != [color]:
                continue
            if parse_mana_cost(card.get("mana_cost")) is None:
                continue
            interpreted = spell_effect(card)
            if interpreted is None:
                continue
            out.append((card, *interpreted))
    return out


def mana_value(card):
    return int(card.get("cmc") or 0)


def spread(pool, limit):
    """A spread across the mana curve rather than the N cheapest cards."""
    if len(pool) <= limit:
        return pool
    step = len(pool) / limit
    return [pool[int(i * step)] for i in range(limit)]


def emit_named(names):
    """
    Fixtures for an explicit list of cards, each routed to the right emitter.

    The mode the deck-led loop actually wants: deck_report.py says which cards
    of a list are addable, and this emits exactly those. Generating a colour
    spread and picking the wanted cards out of it was the alternative, and it
    scales badly the moment a list needs one specific uncommon.

    A name that cannot be represented is reported on stderr rather than skipped
    silently - being handed 6 fixtures when you asked for 7 is the kind of thing
    nobody notices until a deck is short a card.
    """
    wanted = {n.strip().lower(): n.strip() for n in names if n.strip()}
    found = {}
    # Half-names, indexed separately and consulted only for names the
    # full-name pass could not answer. A modal double-faced card is stored
    # under "Emeria's Call // Emeria, Shattered Skyclave" and everybody types
    # the front face, so without this the generator calls a real card "no
    # such card in the bulk data" - the same wrong answer deck_report.py grew
    # a halves index to stop giving. Second dict for the reason that one is:
    # a half-name must never shadow a card that genuinely has that name.
    halves = {}
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            if card.get("layout") in ("art_series", "token", "double_faced_token"):
                continue
            key = card["name"].lower()
            # Half-names are collected *before* the wanted-name check below,
            # which skips every card whose full name nobody asked for - which is
            # every modal double-faced card, i.e. precisely the ones this index
            # exists to catch. Collected the first time round it did nothing at
            # all.
            if " // " in card["name"]:
                for half in card["name"].split(" // "):
                    stripped = half.strip().lower()
                    if stripped in wanted:
                        halves.setdefault(stripped, card)
            if key not in wanted or key in found:
                continue
            found[key] = card

    for key, card in halves.items():
        found.setdefault(key, card)

    for key, original in wanted.items():
        card = found.get(key)
        if card is None:
            print("// SKIPPED %s - no such card in the bulk data" % original, file=sys.stderr)
            continue
        type_line = card["type_line"]
        body = None
        if "Instant" in type_line or "Sorcery" in type_line:
            effect = spell_effect(card)
            if effect:
                body = emit_spell(card, effect[0], effect[1])
        elif "Creature" in type_line:
            interpreted = interpret(card)
            if interpreted is not None:
                body = emit(card, *interpreted)
        else:
            interpreted = interpret_permanent(card)
            if interpreted is not None:
                body = emit_permanent(card, *interpreted)
        if body is None:
            print("// SKIPPED %s - not representable exactly" % card["name"], file=sys.stderr)
            continue
        print()
        print(body)
    return [c for c in found.values()]


def main():
    args = sys.argv[1:]
    commanders = "--commanders" in args
    spells = "--spells" in args
    if "--named" in args:
        names = [a for a in args if not a.startswith("--")]
        if not names:
            names = [line for line in sys.stdin.read().splitlines()]
        print("// Generated by gen_fixtures.py --named")
        # Collected while the cards are interpreted, so the cards have to be
        # built first and printed second.
        import io
        buffer = io.StringIO()
        real_stdout = sys.stdout
        sys.stdout = buffer
        try:
            cards = emit_named(names)
        finally:
            sys.stdout = real_stdout
        for token_ts in MINTED_TOKENS.values():
            print()
            print(token_ts)
        real_stdout.write(buffer.getvalue())
        print()
        ids = list(MINTED_TOKENS.keys()) + [slugify(c["name"]) for c in cards]
        consts = [const_name(i) for i in MINTED_TOKENS] + [const_name(c["name"]) for c in cards]
        print()
        print("// ids: %s" % json.dumps(ids))
        print("// consts: %s" % ", ".join(consts))
        return
    permanent_type = next(
        (t for flag, t in (("--lands", "Land"), ("--artifacts", "Artifact"),
                           ("--enchantments", "Enchantment")) if flag in args),
        None,
    )
    args = [a for a in args if not a.startswith("--")]
    color = args[0]
    limit = int(args[1]) if len(args) > 1 else 45

    if permanent_type:
        pool = permanent_candidates(color, permanent_type)
        pool.sort(key=lambda entry: (mana_value(entry[0]), entry[0]["name"]))
        pool = spread(pool, limit)
        print("// Generated by gen_fixtures.py - %d %ss, colour %s"
              % (len(pool), permanent_type.lower(), color))
        emitted = []
        for card, activated, triggers, enters_tapped in pool:
            body = emit_permanent(card, activated, triggers, enters_tapped)
            if body is None:
                continue
            print()
            print(body)
            emitted.append(card)
        cards = emitted
    elif spells:
        pool = spell_candidates(color)
        pool.sort(key=lambda entry: (mana_value(entry[0]), entry[0]["name"]))
        pool = spread(pool, limit)
        print("// Generated by gen_fixtures.py --spells - %d spells, colour %s" % (len(pool), color))
        for card, effect, uncounterable in pool:
            print()
            print(emit_spell(card, effect, uncounterable))
        cards = [entry[0] for entry in pool]
    else:
        pool = candidates(color, want_legendary=commanders)
        pool.sort(key=lambda entry: (mana_value(entry[0]), entry[0]["name"]))
        if not commanders:
            pool = spread(pool, limit)
        else:
            pool = pool[:30]
        print("// Generated by tools/scryfall-report/gen_fixtures.py - %d cards, colour %s" % (len(pool), color))
        for card, keywords, triggers, activated in pool:
            print()
            print(emit(card, keywords, triggers, activated))
        cards = [entry[0] for entry in pool]

    print()
    print("// ids: %s" % json.dumps([slugify(c["name"]) for c in cards]))
    print("// consts: %s" % ", ".join(const_name(c["name"]) for c in cards))


if __name__ == "__main__":
    main()
