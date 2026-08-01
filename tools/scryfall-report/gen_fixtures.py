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

GAIN_LIFE = re.compile(r"^When(?:ever)? .*enters, you gain (\d+) life\.$")
DRAW_CARD = re.compile(r"^When(?:ever)? .*enters, draw a card\.$")

# "{1}{G}: This creature gets +2/+2 until end of turn." - an activated ability
# using the same until-end-of-turn modifier the pump spells do.
ACTIVATED_PUMP = re.compile(
    r"^((?:\{[^}]+\})+): This creature gets \+(\d+)/\+(\d+) until end of turn\.$"
)

WORD_NUMBERS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


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
        gain = GAIN_LIFE.match(line)
        if gain:
            triggers.append('{ event: "enters-battlefield", effect: { kind: "gainLife", amount: %s } }' % gain.group(1))
            continue
        if DRAW_CARD.match(line):
            triggers.append('{ event: "enters-battlefield", effect: { kind: "draw", amount: 1 } }')
            continue

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


def main():
    args = sys.argv[1:]
    commanders = "--commanders" in args
    spells = "--spells" in args
    args = [a for a in args if not a.startswith("--")]
    color = args[0]
    limit = int(args[1]) if len(args) > 1 else 45

    if spells:
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
