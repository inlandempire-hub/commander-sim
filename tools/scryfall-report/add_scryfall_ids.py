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
FIXTURES_PATH = os.path.normpath(
    os.path.join(HERE, "..", "..", "packages", "engine", "src", "cards", "testCards.ts")
)

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
DEFINITION_RE = re.compile(
    r'(export const (\w+): CardDefinition = \{\n'
    r'(\s*)id: "([^"]+)",\n'
    r'\s*name: "([^"]+)",\n)'
    r'(\s*scryfallId: "[^"]+",\n)?'
)


def load_names_to_ids() -> dict:
    """name -> scryfall card id, for every card in the oracle bulk file."""
    by_name = {}
    with gzip.open(BULK_PATH, "rt", encoding="utf-8") as handle:
        for line in handle:
            card = json.loads(line)
            # Only real, illustrated cards. Scryfall's oracle file includes
            # tokens and art series; a fixture never refers to those by name.
            if card.get("layout") in ("art_series", "token", "double_faced_token"):
                continue
            by_name.setdefault(card["name"], card["id"])
    return by_name


def main() -> None:
    write = "--write" in sys.argv

    if not os.path.exists(BULK_PATH):
        sys.exit("Missing %s - run fetch_bulk_data.py first." % BULK_PATH)

    by_name = load_names_to_ids()
    with open(FIXTURES_PATH, "r", encoding="utf-8") as handle:
        source = handle.read()

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

    patched = DEFINITION_RE.sub(replace, source)

    print("matched: %d" % len(matched))
    print("already stamped: %d" % len(already))
    print("no Scryfall row: %d" % len(missing))
    for const_name, card_name in missing:
        print("  %s (%s)" % (const_name, card_name))

    if not write:
        print("\nDry run. Re-run with --write to patch the fixtures.")
        return

    with open(FIXTURES_PATH, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(patched)
    print("\nWrote %s" % FIXTURES_PATH)


if __name__ == "__main__":
    main()
