"""Stamps each card fixture with its Scryfall card id, so the client can build
an image URL for it.

We store only the id - not the image URLs themselves - because every Scryfall
image URL is derivable from it:

    https://cards.scryfall.io/<size>/front/<id[0]>/<id[1]>/<id>.jpg

Nothing about the artwork is copied into this repo; the id is a database key,
and the browser fetches the image from Scryfall's CDN at runtime.

The id comes from the oracle_cards bulk file, which holds exactly one row per
unique card - Scryfall's own choice of representative printing. See
docs/CARD-ART.md for what that means when a card has a dozen printings.

Usage:
    py -X utf8 tools/scryfall-report/fetch_bulk_data.py      # if data/ is stale
    py -X utf8 tools/scryfall-report/add_scryfall_ids.py     # report only
    py -X utf8 tools/scryfall-report/add_scryfall_ids.py --write
"""

import gzip
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BULK_PATH = os.path.join(HERE, "data", "oracle-cards.jsonl.gz")
# Both halves of the pool. The bulk-generated file arrived on 2026-08-21 and
# this tool would otherwise never stamp anything in it - which matters, because
# the generator's spell path had been emitting cards with no id at all.
FIXTURE_PATHS = [
    os.path.normpath(os.path.join(HERE, "..", "..", "packages", "engine", "src", "cards", name))
    for name in ("testCards.ts", "generatedCards.ts")
]

# Matches the opening of a fixture and captures its name field, e.g.
#   export const LIGHTNING_BOLT: CardDefinition = {
#     id: "lightning-bolt",
#     name: "Lightning Bolt",
#     scryfallId: "7673784e-db4b-43a1-8d55-1bb9fc1e284f",
#
# The scryfallId line is part of the match, and optional. It has to be: the
# "is this one already stamped?" check below reads the matched text, and while
# the match stopped at `name:` the answer was always no - so a second run
# stamped every card a second time and wrote 875 duplicate lines into the
# fixtures. The stamp is written directly after `name:`, so this is where it is.
#
# The comment line is part of it too, and for the same reason. The five basic
# lands carry a deliberate printing with a note above it saying so; without
# this, the match stopped at `name:`, the "already stamped?" check said no, and
# a run inserted a *second* id above the chosen one - which is a TypeScript
# duplicate-key error rather than a silent wrong answer, but only by luck.
DEFINITION_RE = re.compile(
    r'(export const (\w+): CardDefinition = \{\n'
    r'(\s*)id: "([^"]+)",\n'
    r'\s*name: "([^"]+)",\n)'
    r'((?:\s*//[^\n]*\n)?\s*scryfallId: "[^"]+",\n)?'
)


def load_names_to_ids() -> dict:
    """name -> scryfall card id, for every card in the oracle bulk file."""
    by_name = {}
    multi_faced = []
    with gzip.open(BULK_PATH, "rt", encoding="utf-8") as handle:
        for line in handle:
            card = json.loads(line)
            # Only real, illustrated cards. Scryfall's oracle file includes
            # tokens and art series; a fixture never refers to those by name.
            if card.get("layout") in ("art_series", "token", "double_faced_token", "front_card"):
                continue
            by_name.setdefault(card["name"], card["id"])
            if card.get("card_faces"):
                multi_faced.append(card)

    """
    Each face of a modal double-faced card answers to the *card's* id.

    The engine holds the two faces as separate definitions, so both need
    stamping - and both point at the same Scryfall row, which is correct: there
    is one physical card and one entry for it. Second pass, and never over a
    name that is already a card of its own, for the same reason as the audits:
    plenty of face names collide with real single-faced cards.
    """
    for card in multi_faced:
        for face in card["card_faces"]:
            by_name.setdefault(face["name"], card["id"])
    return by_name


def main() -> None:
    write = "--write" in sys.argv

    if not os.path.exists(BULK_PATH):
        sys.exit("Missing %s - run fetch_bulk_data.py first." % BULK_PATH)

    by_name = load_names_to_ids()
    matched, missing, already = [], [], []

    def replace(match: "re.Match") -> str:
        header, const_name, indent, card_id, card_name, existing = match.groups()
        if existing:
            already.append(card_name)
            return header + existing
        scryfall_id = by_name.get(card_name)
        if scryfall_id is None:
            missing.append((const_name, card_name))
            return header
        matched.append(card_name)
        return header + '%sscryfallId: "%s",\n' % (indent, scryfall_id)

    patched_by_path = {}
    for path in FIXTURE_PATHS:
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as handle:
            patched_by_path[path] = DEFINITION_RE.sub(replace, handle.read())

    print("matched: %d" % len(matched))
    print("already stamped: %d" % len(already))
    print("no Scryfall row: %d" % len(missing))
    for const_name, card_name in missing:
        print("  %s (%s)" % (const_name, card_name))

    if not write:
        print("\nDry run. Re-run with --write to patch the fixtures.")
        return

    for path, patched in patched_by_path.items():
        with open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(patched)
        print("Wrote %s" % path)


if __name__ == "__main__":
    main()
