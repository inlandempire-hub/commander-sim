"""Audit every card fixture in the engine against the cached Scryfall bulk data.

Run after dumping the engine's TEST_CARD_DEFINITIONS to JSON:

    node -e "import('./packages/engine/dist/cards/testCards.js').then(m=>console.log(JSON.stringify(m.TEST_CARD_DEFINITIONS)))" > fixtures.json
    py -X utf8 tools/scryfall-report/audit_fixtures.py fixtures.json

Reports, per fixture: whether the name exists in Scryfall at all, and any
mismatch in mana cost, power/toughness, type line or keywords. A fixture whose
name is not in the data is a hard error - it means the card is not real (and so
not Commander legal).
"""

import gzip
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).parent / "data" / "oracle-cards.jsonl.gz"

# Keywords the engine models that Scryfall does not list as a "keyword" - it
# folds them into oracle text instead, so we look for them there as a fallback.
ORACLE_ONLY = {"Ward"}


def load_scryfall():
    """Name -> card. Token printings are skipped: several share a name with a
    real card ("Kobolds of Kher Keep" exists as both) and the token entry is
    marked not-Commander-legal, which produced a false failure on a perfectly
    good fixture."""
    by_name = {}
    multi_faced = []
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            if "Token" in card.get("type_line", ""):
                continue
            by_name.setdefault(card["name"].lower(), card)
            if card.get("card_faces"):
                multi_faced.append(card)

    """
    Faces are indexed in a *second* pass, and only where the name is not already
    a card of its own.

    A modal double-faced card is filed under "Front // Back", and the engine
    holds each face as its own definition - so the faces have to be findable.
    But plenty of face names collide with real single-faced cards ("Regrowth",
    "Lightning Strike"), and indexing in one pass let whichever came first in
    the file win. That silently re-pointed a dozen perfectly good fixtures at
    the wrong card and reported them all as broken.
    """
    for card in multi_faced:
        for face in card["card_faces"]:
            name = face["name"].lower()
            if name in by_name:
                continue
            merged = dict(card)
            merged.update({k: v for k, v in face.items() if v is not None})
            # Colour identity and legality belong to the whole card, never to
            # one side of it.
            merged["legalities"] = card.get("legalities", {})
            merged["color_identity"] = card.get("color_identity", [])
            # Power, toughness and loyalty belong to the *face* and must be
            # cleared when it has none - not inherited from the card.
            #
            # Scryfall's "prepare" layout (Eccentric Pestfinder // Turn Stones)
            # repeats the front face's 5/5 at the top level, and the update
            # above only overwrites keys the face actually carries. That left a
            # Sorcery face claiming to be a 5/5 and reported a correct fixture
            # as broken.
            for stat in ("power", "toughness", "loyalty"):
                merged[stat] = face.get(stat)
            by_name[name] = merged
    return by_name


def _normalize_mana(s):
    """Sort the single-colour pips into WUBRG so cosmetic colour order never
    reads as a mismatch. {X} and generic keep their leading position; hybrid
    pips keep theirs after the colours."""
    import re

    tokens = re.findall(r"\{[^}]+\}", s or "")
    order = {"{W}": 0, "{U}": 1, "{B}": 2, "{R}": 3, "{G}": 4}
    lead = [t for t in tokens if t == "{X}" or re.fullmatch(r"\{\d+\}", t)]
    colors = sorted([t for t in tokens if t in order], key=lambda t: order[t])
    rest = [t for t in tokens if t not in order and t != "{X}" and not re.fullmatch(r"\{\d+\}", t)]
    return "".join(lead + colors + rest)


def mana_cost_to_string(cost):
    """Render the engine's {generic, colors} mana cost the way Scryfall does."""
    if cost is None:
        return ""
    parts = []
    # {X} comes first, as it is printed, and there may be more than one of it -
    # Pest Infestation is {X}{X}{G}. `x` is a count for that reason, and the
    # engine keeps it out of the generic total because a card in hand has X = 0.
    parts.extend(["{X}"] * cost.get("x", 0))
    generic = cost.get("generic", 0)
    if generic:
        parts.append("{%d}" % generic)
    for color in ("W", "U", "B", "R", "G"):
        parts.extend(["{%s}" % color] * cost.get("colors", {}).get(color, 0))
    # "{B/G}" - one symbol paid with either colour. Revitalizing Repast is the
    # first fixture whose *cost* has one; the filter lands only had them in an
    # activation cost, which this never looked at.
    for pair in cost.get("hybrid", []) or []:
        parts.append("{%s}" % "/".join(pair))
    # "{U/P}" - a Phyrexian pip, paid with the colour or 2 life.
    for pip in cost.get("phyrexian", []) or []:
        parts.append("{%s/P}" % pip)
    # A genuinely free spell is written "{0}", not "" - "" means "no mana cost
    # at all", which is a different thing (lands, most tokens).
    return "".join(parts) or "{0}"


def scryfall_keywords(card):
    """Lowercased, because Scryfall writes "First strike" where the engine's
    Keyword union writes "First Strike" - comparing raw strings reported 25
    perfectly good fixtures as invented keywords."""
    keywords = {k.lower() for k in card.get("keywords") or []}
    text = card.get("oracle_text") or ""
    for keyword in ORACLE_ONLY:
        if re.search(r"\b%s\b" % keyword, text):
            keywords.add(keyword.lower())
    return keywords


def audit(fixtures, by_name):
    problems = []
    for fixture in fixtures.values():
        name = fixture["name"]
        if fixture.get("isToken"):
            # Tokens aren't Scryfall cards - their characteristics come from the
            # oracle text of whatever creates them, so there is nothing to match.
            continue
        card = by_name.get(name.lower())
        if card is None:
            problems.append((name, "NOT IN SCRYFALL DATA - not a real card"))
            continue

        issues = []

        if not fixture.get("types", []) == [] and "Land" not in fixture.get("types", []):
            expected = card.get("mana_cost") or ""
            actual = mana_cost_to_string(fixture.get("manaCost"))
            # Colour order within a cost is cosmetic - Scryfall keeps each card's
            # printed order (a Sultai card prints {B}{G}{U}) while the fixture
            # renders WUBRG - and the engine pays mana order-independently. Sort
            # the single-colour pips on both sides before comparing so only a
            # genuinely different cost is flagged.
            if _normalize_mana(expected) != _normalize_mana(actual):
                issues.append("mana cost: fixture %s, Scryfall %s" % (actual or "(none)", expected or "(none)"))

        if card.get("power") is not None:
            if str(fixture.get("power")) != card["power"]:
                issues.append("power: fixture %s, Scryfall %s" % (fixture.get("power"), card["power"]))
        if card.get("toughness") is not None:
            if str(fixture.get("toughness")) != card["toughness"]:
                issues.append("toughness: fixture %s, Scryfall %s" % (fixture.get("toughness"), card["toughness"]))

        type_line = card.get("type_line") or ""
        for card_type in fixture.get("types", []):
            if card_type not in type_line:
                issues.append("type '%s' missing from Scryfall type line '%s'" % (card_type, type_line))
        for subtype in fixture.get("subtypes", []):
            if subtype not in type_line:
                issues.append("subtype '%s' missing from Scryfall type line '%s'" % (subtype, type_line))

        expected_keywords = scryfall_keywords(card)
        actual_keywords = {k.lower() for k in fixture.get("keywords") or []}
        # The engine models a few printed *abilities* as keywords for convenience -
        # "can't be blocked" and "nonbasic landwalk" are written out on the card,
        # not as keyword lines, so they never appear in Scryfall's keyword list.
        actual_keywords -= {"unblockable", "nonbasic landwalk"}
        invented = actual_keywords - expected_keywords
        if invented:
            issues.append("keywords on fixture but not on the real card: %s" % ", ".join(sorted(invented)))

        # cantBeCountered is a flag rather than a keyword, so the keyword check
        # above can't see it. Verify it both ways: a fixture claiming it must
        # have the line, and a card that has the line must not silently lose it.
        # Only when the card says *it* can't be countered. Delighted Halfling
        # says "that spell can't be countered" about whatever its mana pays for,
        # which is a property of the other spell and not of the Halfling - it is
        # a 1/2 creature spell that any counterspell answers. Matching the bare
        # phrase read that as the card protecting itself.
        oracle = card.get("oracle_text") or ""
        says_uncounterable = bool(
            re.search(r"(?:^|\.\s)This spell can't be countered", oracle)
            or re.search(r"^%s can't be countered" % re.escape(card["name"]), oracle, re.M)
        )
        if bool(fixture.get("cantBeCountered")) != says_uncounterable:
            issues.append(
                "cantBeCountered: fixture %s, Scryfall oracle text %s"
                % (bool(fixture.get("cantBeCountered")), says_uncounterable)
            )

        identity = set(fixture.get("colorIdentity") or [])
        if identity != set(card.get("color_identity") or []):
            issues.append(
                "color identity: fixture %s, Scryfall %s"
                % (sorted(identity), sorted(card.get("color_identity") or []))
            )

        if card.get("legalities", {}).get("commander") != "legal":
            issues.append("NOT COMMANDER LEGAL")

        if issues:
            problems.append((name, "; ".join(issues)))
    return problems


def main():
    # utf-8-sig, not utf-8: PowerShell's `Out-File -Encoding utf8` writes a BOM,
    # and json.loads rejects it outright.
    fixtures = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    by_name = load_scryfall()
    problems = audit(fixtures, by_name)
    print("Audited %d fixtures against %d Scryfall cards." % (len(fixtures), len(by_name)))
    if not problems:
        print("No problems found.")
        return
    print("%d problem(s):" % len(problems))
    for name, detail in problems:
        print("  - %s: %s" % (name, detail))


if __name__ == "__main__":
    main()
