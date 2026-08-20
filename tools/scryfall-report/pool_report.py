"""How much of the Commander-legal card pool the engine can express today.

    py -X utf8 tools/scryfall-report/pool_report.py
    py -X utf8 tools/scryfall-report/pool_report.py --top 40

`deck_report.py` answers that question for one decklist. This answers it for
the whole pool, through the same `classify` - so the two can never disagree.

**Read the three numbers as three different questions.** They are not degrees
of the same one, and conflating them is how "how many cards can we do" gets
answered wrongly in both directions:

  IMPLEMENTED  a fixture exists in testCards.ts. Playable right now.
  ADDABLE      `gen_fixtures` will emit it, exactly, with nobody reading it.
               This is the number that can be turned into cards in an
               afternoon, and it is the *floor* of what the engine can do.
  BLOCKED      the generator refuses it. This is **not** the same as "the
               engine cannot do it", and on this pool most of it is not:
               every card in the Winota list's weird tier was hand-written
               against capabilities the generator has no template for. The
               headings starting "Generator gap" are counted separately for
               exactly this reason.

The last section is the work queue: what each missing capability would unlock
across the whole pool, which is the pool-wide version of the per-deck one.
"""

import sys
from collections import Counter, defaultdict

import deck_report as dr


def main(argv):
    top = 25
    if "--top" in argv:
        top = int(argv[argv.index("--top") + 1])

    oracle = dr.load_oracle()
    implemented = dr.load_implemented()

    # One row per card, not per name-key: load_oracle indexes split cards under
    # their halves too, so iterating it directly would count Fire // Ice three
    # times.
    seen = set()
    cards = []
    for card in oracle.values():
        if card["name"] in seen:
            continue
        seen.add(card["name"])
        if card.get("legalities", {}).get("commander") != "legal":
            continue
        cards.append(card)

    counts = Counter()
    by_reason = defaultdict(list)
    generator_only = 0
    for card in cards:
        if card["name"].lower() in implemented:
            counts["implemented"] += 1
            continue
        verdict, reasons = dr.classify(card)
        if verdict == "addable":
            counts["addable"] += 1
            continue
        counts["blocked"] += 1
        titles = {title for _line, title, _why in (reasons or [])}
        for title in titles:
            by_reason[title].append(card["name"])
        # A card every one of whose blockers is a generator gap is a card the
        # engine can already express - somebody has to sit down and write it.
        if titles and all(t.startswith("Generator gap") for t in titles):
            generator_only += 1

    total = len(cards)
    print("=" * 78)
    print("POOL REPORT - the whole Commander-legal pool")
    print("=" * 78)
    print(f"{total} Commander-legal cards in the cached Scryfall data")
    print()
    print(f"  IMPLEMENTED   {counts['implemented']:>6}   a fixture exists today")
    print(f"  ADDABLE       {counts['addable']:>6}   the generator will emit it exactly, unread")
    print(f"  BLOCKED       {counts['blocked']:>6}   the generator refuses it")
    print()
    print(f"  of those blocked, {generator_only} are blocked *only* by generator gaps -")
    print("  the engine can express them; they are hand-written card work.")
    print()
    reachable = counts["implemented"] + counts["addable"] + generator_only
    print(f"  reachable without new engine capability: {reachable} "
          f"({reachable * 100 // total}% of the pool)")

    print()
    print("=" * 78)
    print("WHAT WOULD UNLOCK THE MOST")
    print("=" * 78)
    print("Cards mentioning each gap. A card usually names more than one, so")
    print("these do not add up and none of them is a promise on its own.")
    print()
    for title, names in sorted(by_reason.items(), key=lambda kv: -len(kv[1]))[:top]:
        print(f"{len(names):>6}  {title}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
