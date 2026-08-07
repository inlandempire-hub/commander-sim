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
ENTERS_TAPPED_UNLESS_SUBTYPE = re.compile(
    r"^This land enters tapped unless you control an? ([A-Za-z]+)(?: or an? ([A-Za-z]+))?\.$"
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


def enters_trigger(line):
    """The TS for a lifegain/draw-on-enters trigger, or None if this isn't one.

    `watchFor` is written out rather than left off on every watcher: omitting it
    watches *every* permanent, which no card of this shape means, and which
    Tanglespan Lookout got wrong once.
    """
    gain = SELF_ENTERS_GAIN.match(line)
    if gain:
        return '{ event: "enters-battlefield", effect: { kind: "gainLife", amount: %s } }' % gain.group(1)
    if SELF_ENTERS_DRAW.match(line):
        return '{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }'

    for pattern, includes_self, watches in (
        (SELF_OR_OTHERS_ENTERS_GAIN, True, "controller"),
        (OTHERS_ENTERS_GAIN, False, "controller"),
        (ANY_ENTERS_GAIN, False, "any"),
    ):
        watcher = pattern.match(line)
        if watcher:
            return (
                '{ event: "permanent-enters", watches: "%s", %swatchFor: { type: "Creature" }, '
                'effect: { kind: "gainLife", amount: %s } }'
                % (watches, "includesSelf: true, " if includes_self else "", watcher.group(1))
            )
    return None


def mana_ability(color, amount=1, identity_only=False):
    return (
        '{ cost: { tap: true }, effect: { kind: "addMana", color: "%s", amount: %d }%s }'
        % (color, amount, ", requiresCommanderIdentity: true" if identity_only else "")
    )


def any_color_abilities(identity_only=False):
    """One ability per colour. A choice of five, written as five."""
    return [mana_ability(c, 1, identity_only) for c in ("W", "U", "B", "R", "G")]


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

        tap_add = TAP_ADD.match(line)
        if tap_add:
            symbols = re.findall(r"\{([WUBRGC])\}", tap_add.group(1))
            # "Add {C}{C}" is one ability producing two, not two abilities.
            if len(set(symbols)) != 1:
                return None
            activated.append(mana_ability(symbols[0], len(symbols)))
            continue

        either = TAP_ADD_EITHER.match(line)
        if either:
            for color in [g for g in either.groups() if g]:
                activated.append(mana_ability(color))
            continue

        if TAP_ADD_ANY.match(line):
            activated.extend(any_color_abilities())
            continue
        if TAP_ADD_ANY_IN_IDENTITY.match(line):
            activated.extend(any_color_abilities(identity_only=True))
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
    generic, colors = parsed
    pips = ", ".join("%s: %d" % (c, n) for c, n in sorted(colors.items()))
    return "{ generic: %d, colors: {%s} }" % (generic, " %s " % pips if pips else "")


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
     lambda m: '{ kind: "destroy", target: { kind: "permanent", cardType: "%s" } }' % m[1].capitalize()),
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
]


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
    """Scryfall's '{2}{B}{B}' into the engine's {generic, colors} shape. Returns None for anything with hybrid/phyrexian/X symbols, which the engine can't pay."""
    generic = 0
    colors = {}
    for symbol in re.findall(r"\{([^}]+)\}", cost_string or ""):
        if symbol.isdigit():
            generic += int(symbol)
        elif symbol in "WUBRG":
            colors[symbol] = colors.get(symbol, 0) + 1
        else:
            return None  # hybrid, phyrexian, {X}, snow - not representable
    return generic, colors


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

        sac = SAC_FOR_BASIC.match(line)
        if sac:
            activated.append(
                '{ cost: { sacrificeSelf: true }, effect: { kind: "searchLibrary", '
                'cardType: "Land", basicLandOnly: true, destination: "battlefield"%s } }'
                % (", tapped: true" if sac.group(1) else "")
            )
            continue

        # Mana creatures. Same three shapes the permanent path reads, sharing
        # the same builders - a creature that taps for mana is not a different
        # kind of mana ability from a land that does.
        tap_add = TAP_ADD.match(line)
        if tap_add:
            symbols = re.findall(r"\{([WUBRGC])\}", tap_add.group(1))
            if len(set(symbols)) != 1:
                return None
            activated.append(mana_ability(symbols[0], len(symbols)))
            continue
        either = TAP_ADD_EITHER.match(line)
        if either:
            for color in [g for g in either.groups() if g]:
                activated.append(mana_ability(color))
            continue
        if TAP_ADD_ANY.match(line):
            activated.extend(any_color_abilities())
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
    parsed = parse_mana_cost(card.get("mana_cost"))
    generic, colors = parsed
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
    lines.append(
        "  manaCost: { generic: %d, colors: { %s } },"
        % (generic, ", ".join("%s: %d" % (c, n) for c, n in sorted(colors.items())))
    )
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
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            key = card["name"].lower()
            if key not in wanted or key in found:
                continue
            if card.get("layout") in ("art_series", "token", "double_faced_token"):
                continue
            found[key] = card

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
        cards = emit_named(names)
        print()
        print("// ids: %s" % json.dumps([slugify(c["name"]) for c in cards]))
        print("// consts: %s" % ", ".join(const_name(c["name"]) for c in cards))
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
