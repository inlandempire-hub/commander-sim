"""Audit every fixture's triggered abilities against the real card's oracle text.

    node -e "import('./packages/engine/dist/cards/testCards.js').then(m=>console.log(JSON.stringify(m.TEST_CARD_DEFINITIONS)))" > fixtures.json
    py -X utf8 tools/scryfall-report/audit_triggers.py fixtures.json

`audit_fixtures.py` checks a card's *printed characteristics* - cost, P/T, type
line, keywords. That will never catch a wrong trigger, because a trigger is not
a characteristic: Soul Warden's fixture had the right cost, the right body and
the wrong event, and passed that audit cleanly while gaining life at a moment
its own text excludes.

So this reads the oracle text instead and checks the triggers both ways:

  WRONG EVENT      the fixture models a trigger the card has, as the wrong one
                   (the Soul Warden family: "whenever another creature enters"
                   written as "when this enters")
  MISSING TRIGGER  the card prints a trigger the fixture models as nothing at
                   all - the card is quietly a vanilla creature in the sim
  INVENTED TRIGGER the fixture has a trigger with no clause on the real card

Reminder text in parentheses is stripped first: it restates a keyword and is
full of trigger words that are not themselves triggers ("(Whenever this
creature deals damage...)"), which is what made the first pass of this audit
report 190 things that were all fine.
"""

import gzip
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).parent / "data" / "oracle-cards.jsonl.gz"

# The events packages/engine/src/types.ts actually models.
MODELLED = {
    "enters-battlefield", "attacks", "dies", "landfall", "permanent-enters", "gain-life",
    "permanent-dies", "upkeep", "first-main", "begin-combat", "end-step",
}


def load_scryfall():
    by_name = {}
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            if "Token" in card.get("type_line", ""):
                continue
            by_name.setdefault(card["name"].lower(), card)
    return by_name


def strip_reminders(text):
    """Reminder text is parenthetical and restates rules, so it is dense with
    trigger words that trigger nothing. Removed before anything else looks at
    the text."""
    return re.sub(r"\([^)]*\)", "", text)


def clauses(card):
    """The trigger clauses of a card: every sentence that opens with a trigger
    word. Scryfall separates abilities with newlines, and a single line can
    hold a trigger plus follow-on sentences, so split on both."""
    text = strip_reminders(card.get("oracle_text") or "")
    found = []
    for line in text.split("\n"):
        # An ability word sits in front of the trigger and is pure flavour:
        # "Landfall - Whenever a land you control enters...". Stripping it is
        # not cosmetic - without it the line does not start with a trigger
        # word, so the whole clause was invisible here and Tifa Lockhart's
        # perfectly correct landfall was reported as invented.
        line = re.sub(r"^[A-Z][A-Za-z' ]+ [-—] ", "", line.strip())
        for sentence in re.split(r"(?<=[.!])\s+", line):
            s = sentence.strip()
            if re.match(r"^(When|Whenever|At the beginning|At end of)\b", s, re.I):
                found.append(s)
    return found


def watched_noun(clause):
    """What a battlefield-watching trigger is watching for: "creature", "aura",
    "artifact". Checked against the fixture's `watchFor`, because getting the
    event right and the filter wrong is just as broken as getting the event
    wrong - a Soul Warden that watches Auras never fires either."""
    m = re.search(
        r"when(?:ever)?\s+(?:an|a|another|one or more|this \w+ or another)\s+"
        r"([a-z][a-z' ]*?)\s*(?:you control|an opponent controls|another player controls)?\s+enters",
        clause.lower(),
    )
    if not m:
        return None
    noun = m.group(1).strip()
    # "nontoken creature", "legendary creature" - the engine filters on card
    # type and subtype, so keep the last word.
    return noun.split()[-1] if noun else None


def classify(clause, card_name):
    """Which engine event a trigger clause is, or a reason it is none of them.

    Returns (event, note). `event` is None when the engine has no such event,
    in which case `note` says what the clause actually asks for - which is the
    useful half of a "missing trigger" report.
    """
    c = clause.lower()
    # "Soul Warden" in older templating, "this creature" in newer.
    self_ref = r"(this creature|this permanent|this artifact|this enchantment|%s)" % re.escape(card_name.lower())

    # Turn-based triggers became real events on 2026-08-10 (Deathreap Ritual).
    # The draw step is deliberately still not one: no card in the pool wants
    # it, and an event nothing ever fires is worse than no event.
    if re.match(r"^at the beginning of", c) or re.match(r"^at end of", c):
        if "upkeep" in c:
            return "upkeep", None
        if "end step" in c or re.match(r"^at end of turn", c):
            return "end-step", None
        if "first main phase" in c:
            return "first-main", None
        if "combat on" in c:
            return "begin-combat", None
        return None, "timing trigger the engine has no event for (draw step, upkeep of a chosen player)"

    if "enters" in c:
        # Both templatings: "a land enters the battlefield under your control"
        # (older) and "a land you control enters" (current). Only matching the
        # first reported Tifa Lockhart's perfectly good landfall as invented.
        if (
            re.search(r"a land enters the battlefield under your control", c)
            or re.search(r"a land you control enters", c)
            # Lifegift says just "whenever a land enters", meaning every
            # player's. Still landfall - `watches` is what differs, and
            # that is checked against the fixture separately.
            or re.search(r"whenever a land enters", c)
            or "landfall" in c
        ):
            return "landfall", None
        if re.search(r"\banother\b.*\bcreature\b.*enters", c) or re.search(
            r"this creature or another creature", c
        ):
            return "permanent-enters", None
        if re.search(r"whenever (a|another) .*creature.*enters", c):
            return "permanent-enters", None
        if re.search(r"^when(ever)?\s+%s\s+enters" % self_ref, c):
            return "enters-battlefield", None
        # Any other "whenever <something> enters" watches the battlefield. The
        # engine models these with a watchFor filter, so what it watches for is
        # checked separately against the fixture.
        if re.search(r"whenever .*enters", c):
            return "permanent-enters", None
        return "enters-battlefield", None

    if re.search(r"deals combat damage to a player", c):
        return None, "combat damage to a player - not modelled"
    if re.search(r"deals damage", c):
        return None, "damage-dealt trigger - not modelled"

    if re.search(r"^when(ever)?\s+%s\s+attacks" % self_ref, c) or re.search(
        r"whenever .*attacks", c
    ):
        if re.search(r"whenever (a|another|one or more) ", c) and not re.search(
            r"^when(ever)?\s+%s" % self_ref, c
        ):
            return None, "watches other creatures attacking - not modelled"
        return "attacks", None

    if "blocks" in c or "becomes blocked" in c:
        return None, "block trigger - not modelled"

    if re.search(r"\bdies\b", c):
        if re.search(r"^when(ever)?\s+%s\s+dies" % self_ref, c):
            return "dies", None
        # Watching *other* permanents die became a real event on 2026-08-10
        # (Meltstrider Eulogist), mirroring `permanent-enters`. Anything
        # whose filter the engine cannot express is still refused, below.
        if re.search(r"whenever (a|an|another|one or more|this \w+ or another) .*dies", c):
            return "permanent-dies", None
        return None, "watches other creatures dying in a way the filter cannot express"

    if re.search(r"leaves the battlefield", c):
        return None, "leaves-the-battlefield trigger - not modelled"
    # "Whenever you gain life" became a real event on 2026-08-07, for Blech,
    # Loafing Pest and Pest Mascot. Checked before the catch-all below, which
    # otherwise reports a correctly modelled trigger as both missing *and*
    # invented - the audit contradicting itself about the same card.
    if re.search(r"^whenever you gain life", c):
        return "gain-life", None
    if re.search(r"you (cast|draw|gain|lose)", c):
        return None, "watches you casting/drawing/gaining - not modelled"
    if "becomes tapped" in c or "becomes the target" in c:
        return None, "tap/target trigger - not modelled"

    return None, "unrecognised trigger shape"


def fixture_watches(trigger):
    """The noun a fixture's watchFor filter amounts to, lowercased, so it can be
    compared with the noun in the printed text."""
    watch_for = trigger.get("watchFor") or {}
    return (watch_for.get("subtype") or watch_for.get("type") or "").lower() or None


def audit(fixtures, by_name):
    wrong, missing, invented, unknown, mismatched = [], [], [], [], []
    # Counted and printed so a clean run can be told apart from a run whose
    # regexes matched nothing. An audit that inspects zero clauses reports zero
    # problems, and looks exactly like an audit that passed.
    coverage = {"cards": 0, "clauses": 0, "fixture_triggers": 0}

    for fixture in fixtures.values():
        if fixture.get("isToken"):
            continue
        name = fixture["name"]
        card = by_name.get(name.lower())
        if card is None:
            unknown.append(name)
            continue

        printed = [(clause, *classify(clause, name)) for clause in clauses(card)]
        printed_events = [event for _, event, _ in printed if event]
        fixture_events = [t["event"] for t in fixture.get("triggeredAbilities") or []]

        coverage["cards"] += 1
        coverage["clauses"] += len(printed)
        coverage["fixture_triggers"] += len(fixture_events)

        # A trigger the card prints that the fixture models as some other event.
        for clause, event, _ in printed:
            if event and event not in fixture_events and fixture_events:
                wrong.append((name, event, fixture_events, clause))

        # A trigger the card prints that the fixture does not model at all.
        for clause, event, note in printed:
            if event and not fixture_events:
                missing.append((name, "models no trigger; card says", clause))
            elif event is None and note:
                missing.append((name, note, clause))

        # A trigger on the fixture with no clause behind it.
        for event in fixture_events:
            if event not in printed_events:
                invented.append((name, event, card.get("oracle_text") or "(no oracle text)"))

        # The right event watching the wrong thing. Worth its own check: a
        # Soul Warden that watched Auras would pass every test above and still
        # never fire once in a real game.
        printed_nouns = [
            watched_noun(clause) for clause, event, _ in printed if event == "permanent-enters"
        ]
        for trigger in fixture.get("triggeredAbilities") or []:
            if trigger["event"] != "permanent-enters":
                continue
            watches = fixture_watches(trigger)
            if watches is None:
                mismatched.append((name, "no watchFor filter at all", printed_nouns))
            elif printed_nouns and watches not in printed_nouns:
                mismatched.append((name, "watchFor says '%s'" % watches, printed_nouns))

    return wrong, missing, invented, mismatched, unknown, coverage


def section(title, rows, render):
    print()
    print("=" * 72)
    print("%s: %d" % (title, len(rows)))
    print("=" * 72)
    for row in rows:
        print(render(row))


def main():
    fixtures = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    by_name = load_scryfall()
    wrong, missing, invented, mismatched, unknown, coverage = audit(fixtures, by_name)

    print("Audited %d fixtures against %d Scryfall cards." % (len(fixtures), len(by_name)))
    print(
        "Matched %d fixtures to a real card; read %d printed trigger clause(s) "
        "and %d fixture trigger(s)." % (coverage["cards"], coverage["clauses"], coverage["fixture_triggers"])
    )
    if unknown:
        section("NOT IN SCRYFALL DATA", unknown, lambda n: "  - %s" % n)

    section(
        "WRONG EVENT - card prints this trigger, fixture models a different one",
        wrong,
        lambda r: "  - %s\n      card implies: %s\n      fixture has:  %s\n      clause: %s"
        % (r[0], r[1], ", ".join(r[2]), r[3]),
    )
    section(
        "MISSING - trigger printed on the card that the fixture does not model",
        missing,
        lambda r: "  - %s (%s)\n      %s" % (r[0], r[1], r[2]),
    )
    section(
        "INVENTED - trigger on the fixture with no clause on the real card",
        invented,
        lambda r: "  - %s: %s\n      oracle: %s" % (r[0], r[1], r[2].replace("\n", " | ")),
    )
    section(
        "WRONG FILTER - right event, watching the wrong kind of permanent",
        mismatched,
        lambda r: "  - %s: %s; card watches %s"
        % (r[0], r[1], ", ".join(n for n in r[2] if n) or "(could not read)"),
    )


if __name__ == "__main__":
    main()
