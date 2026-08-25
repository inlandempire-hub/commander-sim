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
    "permanent-dies", "permanent-sacrificed", "permanent-attacks", "leaves-battlefield",
    "spell-cast", "damaged", "upkeep", "first-main", "begin-combat", "end-step",
    "land-played", "becomes-tapped",
    "combat-damage-to-player", "creatures-dealt-combat-damage", "combat-damage-dealt",
    "attack-with-two-or-more",
    "creatures-attack", "library-searched", "draw-step", "creatures-die",
}


def load_scryfall():
    by_name = {}
    multi_faced = []
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        for line in fh:
            card = json.loads(line)
            # Art-series cards are printed art, not cards: their faces carry
            # the real card's *name* with a type line of "Card" and no colour
            # identity at all. Indexed first they shadow the genuine face -
            # which is how Pillarverge Pathway came to be reported as a
            # colourless non-land that is not Commander legal.
            # "front_card" is here for the same reason "art_series" is, and was added
            # 2026-08-21 after it bit a third tool: the oversized memorabilia printing of
            # Savage Lands is named "Savage Lands", has the type line "Card", carries no
            # rules text and is not Commander-legal - and it answered for the real Jund
            # tri-land. Any layout that is a picture of a card rather than a card belongs
            # in this list.
            if card.get("layout") in ("art_series", "front_card"):
                continue
            if "Token" in card.get("type_line", ""):
                continue
            by_name.setdefault(card["name"].lower(), card)
            if card.get("card_faces"):
                multi_faced.append(card)
    """
    Faces are indexed in a second pass, and only where the name is not already
    a card of its own - see the same note in audit_fixtures.py. Indexing in one
    pass lets a face called "Regrowth" shadow the real Regrowth.
    """
    for card in multi_faced:
        for face in card["card_faces"]:
            name = face["name"].lower()
            if name in by_name:
                continue
            merged = dict(card)
            merged.update({k: v for k, v in face.items() if v is not None})
            merged["legalities"] = card.get("legalities", {})
            merged["color_identity"] = card.get("color_identity", [])
            by_name[name] = merged
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
    raw = card.get("oracle_text") or ""
    text = strip_reminders(raw)
    found = []
    # Battle cry (Signal Pest). A keyword whose entire trigger is printed as
    # reminder text, which strip_reminders has just removed - so the keyword
    # itself stands in for the clause it means. Written out rather than added to
    # a general keyword table because it is the only one in the pool whose
    # reminder text is a trigger.
    for line in raw.splitlines():
        stripped = line.strip().lower()
        if stripped.startswith("battle cry"):
            found.append("Whenever this creature attacks, each other attacking creature gets +1/+0 until end of turn.")
        # Mentor (Legion Warboss) and mobilize (Voice of Victory) are the same
        # shape battle cry is: a keyword whose entire trigger lives in the
        # reminder text `strip_reminders` has just removed. Three of them is
        # still a written-out list rather than a table - the reminder wording is
        # what is being matched, and a table would invite matching the keyword
        # alone on a card that only mentions it.
        if stripped.startswith("mentor"):
            found.append(
                "Whenever this creature attacks, put a +1/+1 counter on target attacking creature with lesser power."
            )
        if stripped.startswith("mobilize"):
            found.append(
                "Whenever this creature attacks, create tapped and attacking Warrior creature tokens."
            )
    for line in text.split("\n"):
        # An ability word sits in front of the trigger and is pure flavour:
        # "Landfall - Whenever a land you control enters...". Stripping it is
        # not cosmetic - without it the line does not start with a trigger
        # word, so the whole clause was invisible here and Tifa Lockhart's
        # perfectly correct landfall was reported as invented.
        line = re.sub(r"^[A-Z][A-Za-z' ]+ [-—] ", "", line.strip())
        # "• Jeskai - At the beginning of your upkeep, ..." - a modal permanent
        # prints each half as a bullet with the mode's name in front of it. Same
        # problem the ability-word strip above solves: without this the line does
        # not start with a trigger word and the whole clause is invisible.
        line = re.sub(r"^[•\u2022]\s*[A-Z][A-Za-z' ]* [-—] ", "", line.strip())
        for sentence in re.split(r"(?<=[.!])\s+", line):
            s = sentence.strip()
            # "When you do, ..." is a *reflexive* trigger - it hangs off the
            # sentence before it rather than standing on its own, so it is
            # folded into that clause instead of counted as a second one.
            #
            # The engine models the pair as a single `sequence`, which is a
            # real simplification: a reflexive trigger uses the stack, so in
            # paper an opponent could respond between the two halves. For
            # Riveteers Overlook there is nothing worth responding to - the
            # land is already sacrificed by then - but the day a card makes
            # that window matter, it needs a genuine reflexive trigger and
            # not a sequence.
            # "If this creature hasn't been exerted this turn, **you may exert
            # it as it attacks**" - Combat Celebrant, the one triggered ability
            # in the pool that never says "when". Named explicitly rather than
            # by loosening the trigger-word test below, which would sweep in
            # every conditional sentence on every card and quietly report a
            # hundred cards as having triggers they do not have.
            #
            # Collected before the reflexive branch, so the "When you do ..."
            # half that follows it folds into this clause rather than being
            # dropped for having nothing to attach to.
            if re.search(r"you may exert .*\bas it attacks", s, re.I):
                found.append(s)
                continue
            if re.match(r"^When you do\b", s, re.I):
                if found:
                    found[-1] = "%s %s" % (found[-1], s)
                continue
            if re.match(r"^(When|Whenever|At the beginning|At end of)\b", s, re.I):
                found.append(s)
    # "Whenever X enters or attacks, ..." is one printed sentence but two
    # triggers, and the engine models it as two - Emet-Selch. Split it so each
    # half classifies on its own rather than the pair reading as one wrong event.
    expanded = []
    for c in found:
        m = re.match(r"^(Whenever .*?) enters or attacks(,.*)$", c, re.I)
        if m:
            expanded.append("%s enters%s" % (m.group(1), m.group(2)))
            expanded.append("%s attacks%s" % (m.group(1), m.group(2)))
        else:
            expanded.append(c)
    return expanded


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
    #
    # A card whose name carries a title says the short half in its own rules
    # text: "Whenever **Raph & Leo** attack" on "Raph & Leo, Sibling Rivals",
    # "Whenever Emet-Selch ..." on "Emet-Selch, Unsundered". Both halves are
    # accepted, or every legendary written this way reports its own trigger as
    # invented.
    short_name = card_name.split(",")[0].strip().lower()
    self_ref = r"(this creature|this permanent|this artifact|this enchantment|%s|%s)" % (
        re.escape(card_name.lower()),
        re.escape(short_name),
    )

    # Turn-based triggers became real events on 2026-08-10 (Deathreap Ritual),
    # and the draw step joined them on 2026-08-19 with Mana Vault - the one card
    # in the pool that bills you during it.
    if re.match(r"^at the beginning of", c) or re.match(r"^at end of", c):
        if "upkeep" in c:
            return "upkeep", None
        if "draw step" in c:
            return "draw-step", None
        if "end step" in c or re.match(r"^at end of turn", c):
            return "end-step", None
        if "first main phase" in c:
            return "first-main", None
        if "combat on" in c:
            return "begin-combat", None
        return None, "timing trigger the engine has no event for (draw step, upkeep of a chosen player)"

    # "When you play another land, sacrifice this land" - City of Traitors, and a
    # real event since 2026-08-17. Checked before the "enters" branch below,
    # because a land being *played* is not a land entering: the distinction is the
    # whole reason the event exists, and the wrong branch would call it landfall.
    if re.search(r"when you play (a|an|another) land", c):
        return "land-played", None

    # "Whenever this land becomes tapped" - City of Brass. A self event, so the
    # self-reference test is the same one `damaged` uses above.
    if re.search(r"^when(ever)?\s+(this land|this permanent|%s)\s+becomes tapped" % self_ref, c):
        return "becomes-tapped", None

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

    # "Whenever this creature is dealt damage" became a real event on
    # 2026-08-12 (Hornet Nest). *Dealing* damage still is not one: it is a
    # different question asked of a different object, and nothing wants it yet.
    if re.search(r"^when(ever)?\s+%s\s+is dealt damage" % self_ref, c):
        return "damaged", None
    if re.search(r"is dealt damage", c):
        return None, "watches something else being dealt damage - not modelled"
    # "Whenever a creature you control deals combat damage during your turn" -
    # Quilled Greatwurm (since 2026-08-22). Wider than the to-a-player ones below
    # (it counts damage to a blocker too), so it is matched first on its own
    # distinctive "during your turn" wording.
    if re.search(r"deals combat damage during your turn", c):
        return "combat-damage-dealt", None
    # Combat damage to a player became two real events on 2026-08-17, and they
    # are two: "whenever THIS creature deals" fires per creature, and "whenever
    # one or more creatures you control deal" fires once however many connected.
    # The plural verb is the tell, and it is the whole difference between one
    # Treasure and three.
    if re.search(r"one or more creatures you control deal combat damage to a player", c):
        return "creatures-dealt-combat-damage", None
    if re.search(r"^when(ever)?\s+%s\s+deals combat damage to a player" % self_ref, c):
        return "combat-damage-to-player", None
    if re.search(r"deals combat damage to a player", c):
        return None, "combat damage to a player by something else - not modelled"
    if re.search(r"deals damage", c):
        return None, "damage-dealt trigger - not modelled"

    # "Whenever one or more other Cats you control die" - Ajani, and the third
    # event of that shape. Checked before the `dies` branch below, because the
    # plural is the whole difference: one event for a batch, not one per death.
    if re.search(r"^when(ever)? one or more .* die,", c):
        return "creatures-die", None

    # "Whenever you attack with two or more creatures" - Twenty-Toed Toad (since
    # 2026-08-22). A controller-side attack event about the whole declaration,
    # distinct from `attacks` and `permanent-attacks`. Checked before the other
    # attack regexes so it is not swept up as one of those.
    if re.search(r"whenever you attack with two or more creatures", c):
        return "attack-with-two-or-more", None

    # "Whenever you attack with one or more non-Gnome creatures" (Anim Pakal),
    # "whenever you attack with this creature and/or your commander" (Ainok
    # Strike Leader) - a real event since 2026-08-19.
    #
    # Checked before the "whenever ... attacks" branch below, and the difference
    # is the whole reason the event exists: "you attack with" is one event for
    # the whole declaration, and "a creature attacks" is one per creature.
    if re.search(r"^when(ever)? you attack with ", c):
        return "creatures-attack", None
    # "Whenever one or more non-Toy creatures you control attack a player" -
    # Dollmaker's Shop. The same event said the other way round, and the plural
    # verb is still the tell: one Toy for the swing, not one per attacker.
    if re.search(r"^when(ever)? one or more .* attack ", c):
        return "creatures-attack", None

    # "Whenever an opponent searches their library" - Archivist of Oghma.
    if re.search(r"^when(ever)? (a player|an opponent|you) searche?s? ", c):
        return "library-searched", None

    # "You may exert it as it attacks" - Combat Celebrant. A triggered ability
    # that never says "whenever", and the only shape in the pool that does not.
    if re.search(r"you may exert (it|this creature|%s) as it attacks" % self_ref, c):
        return "attacks", None

    # "Whenever Raph & Leo **attack**" - a card named for two creatures takes a
    # plural verb. Nothing else about the trigger differs.
    if re.search(r"^when(ever)?\s+%s\s+attacks?\b" % self_ref, c) or re.search(
        r"whenever .*attacks", c
    ):
        # "Whenever an Insect, Leech, Slug, or Worm you control attacks" -
        # Fumulus, and a real watcher event since 2026-08-13. The twin of
        # `attacks`, which only ever watches the card it is printed on.
        if re.search(r"whenever (a|an|another|one or more) ", c) and not re.search(
            r"^when(ever)?\s+%s" % self_ref, c
        ):
            return "permanent-attacks", None
        return "attacks", None

    if "blocks" in c or "becomes blocked" in c:
        return None, "block trigger - not modelled"

    # Magecraft - "whenever you cast or copy an instant or sorcery spell"
    # (Sedgemoor Witch). The *cast* half is the same `spell-cast` event Arasta
    # uses, narrowed to your own spells; nothing copies a spell in this engine,
    # so that half is documented on the fixture rather than modelled.
    #
    # Checked here, before the `dies` branch, and that ordering is the whole
    # point: this clause quotes the token's own "when this token dies", and a
    # bare search for the word claimed the sentence for the wrong event.
    if re.search(r"^whenever you cast( or copy)? ", c):
        return "spell-cast", None

    # "When you next cast an instant or sorcery spell this turn, copy that spell"
    # - Sword of Wealth and Power. A delayed triggered ability set up by the
    # Equipment's combat trigger and modelled as an *effect*
    # (`copyNextInstantOrSorcery`) on that trigger rather than as a triggered
    # ability of its own, so there is no fixture trigger for it to match - which
    # is documented here rather than left as an unrecognised shape.
    if re.search(r"when you next cast an instant or sorcery spell this turn, copy that spell", c):
        return None, "delayed spell-copy - modelled as an effect on the combat trigger, not a fixture trigger"

    # "Whenever a player sacrifices a nontoken creature" - Fumulus, the
    # Infestation, and a real event since 2026-08-13. Deliberately not folded
    # into `permanent-dies`: every sacrifice is a death and almost no death is a
    # sacrifice, so a card written as the other one pays out on every board
    # stall.
    if re.search(r"whenever a player sacrifices", c):
        return "permanent-sacrificed", None

    if re.search(r"\bdies\b", c):
        if re.search(r"^when(ever)?\s+%s\s+dies" % self_ref, c):
            return "dies", None
        # "Whenever equipped creature dies" - Skullclamp. A permanent-dies
        # watcher narrowed to the single creature this Equipment is attached
        # to, which is what `watchFor.attachedToThis` expresses.
        if re.search(r"^whenever equipped creature dies", c):
            return "permanent-dies", None
        # Watching *other* permanents die became a real event on 2026-08-10
        # (Meltstrider Eulogist), mirroring `permanent-enters`. Anything
        # whose filter the engine cannot express is still refused, below.
        if re.search(r"whenever (a|an|another|one or more|this \w+ or another) .*dies", c):
            return "permanent-dies", None
        return None, "watches other creatures dying in a way the filter cannot express"

    # "Whenever a creature you control leaves the battlefield" - The Ozolith,
    # and a real event since 2026-08-13. Wider than a death on purpose: a
    # creature exiled or bounced left the battlefield without dying.
    if re.search(r"leaves the battlefield", c):
        if re.search(r"whenever (a|an|another|one or more) .*leaves the battlefield", c):
            return "leaves-battlefield", None
        return None, "leaves-the-battlefield trigger - not modelled"
    # "Whenever you gain life" became a real event on 2026-08-07, for Blech,
    # Loafing Pest and Pest Mascot. Checked before the catch-all below, which
    # otherwise reports a correctly modelled trigger as both missing *and*
    # invented - the audit contradicting itself about the same card.
    if re.search(r"^whenever you gain life", c):
        return "gain-life", None
    # "Whenever an opponent casts an instant or sorcery spell" became a real
    # event on 2026-08-12 (Arasta of the Endless Web). Checked before the
    # catch-all below, which would otherwise call a correct fixture invented.
    if re.search(r"^whenever an opponent casts", c):
        return "spell-cast", None
    if re.search(r"you (cast|draw|gain|lose)", c):
        return None, "watches you casting/drawing/gaining - not modelled"
    if "becomes tapped" in c or "becomes the target" in c:
        return None, "tap/target trigger - not modelled"

    # "When that mana is spent to cast ..., scry 1" - Path of Ancestry.
    #
    # A real trigger that is deliberately *not* a `triggeredAbilities` entry:
    # it belongs to a particular lump of mana rather than to the permanent, so
    # the engine hangs it off the mana ability as `marksMana`. Reported as
    # modelled-elsewhere rather than missing, because "missing" would be a lie
    # and silencing it altogether would hide the day it stops being written.
    if re.search(r"^when that mana is spent", c):
        return "mana-spend-rider", None

    return None, "unrecognised trigger shape"


def fixture_watches(trigger):
    """The noun a fixture's watchFor filter amounts to, lowercased, so it can be
    compared with the noun in the printed text."""
    watch_for = trigger.get("watchFor") or {}
    wanted = watch_for.get("subtype") or watch_for.get("type") or ""
    # "an artifact **or** creature an opponent controls" - Charismatic Conqueror,
    # the first fixture to list two types. `watched_noun` reads the printed
    # phrase down to its last word ("creature"), so the last entry is the one to
    # compare against; the alternatives are all in the same sentence anyway.
    if isinstance(wanted, list):
        wanted = wanted[-1] if wanted else ""
    return wanted.lower() or None


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
        # A mana-spend rider lives on an activated ability, so it counts as
        # modelled without appearing in `triggeredAbilities` at all.
        if any(a.get("marksMana") for a in fixture.get("activatedAbilities") or []):
            fixture_events = fixture_events + ["mana-spend-rider"]

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
