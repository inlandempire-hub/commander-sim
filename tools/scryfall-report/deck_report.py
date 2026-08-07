"""Take a decklist, say what the engine can already play and what is blocking the rest.

    py -X utf8 tools/scryfall-report/deck_report.py mydeck.txt
    py -X utf8 tools/scryfall-report/deck_report.py mydeck.txt --verbose

Reads the same "N Card Name" text every Magic tool writes - section headers,
blank lines, comments and set/collector suffixes are all ignored, matching the
client's own importer in packages/client/src/deckbuilder/deckText.ts.

Every card is answered in one of four ways:

  IMPLEMENTED  a fixture already exists in testCards.ts
  ADDABLE      the effect DSL can express it exactly; it just has not been added
  BLOCKED      the engine is missing something, and the report names what
  UNKNOWN      no card by that name in the cached Scryfall data - a typo, or the
               bulk file is stale

**The IMPLEMENTED/ADDABLE/BLOCKED split is not a guess.** It runs the card
through `gen_fixtures.interpret` and `gen_fixtures.spell_effect` - the same
functions that decide what the generator will emit - so a card this calls
ADDABLE is a card the generator will actually produce. If the two ever disagree
that is a bug in this file, not a judgement call.

The *reason* a blocked card is blocked is the one heuristic part: it matches the
oracle lines the generator rejected against a list of named missing
capabilities. It prints the offending line beside the diagnosis so the call can
be checked rather than trusted, and anything it cannot place is reported as
unrecognised rather than guessed at.

The last section is the point of the whole tool: the missing capabilities,
ordered by how many cards in *this* list each one would unblock. That is the
engine work queue for this deck.
"""

import gzip
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import gen_fixtures as gen

HERE = Path(__file__).parent
DATA = HERE / "data" / "oracle-cards.jsonl.gz"
FIXTURES = HERE.parent.parent / "packages" / "engine" / "src" / "cards" / "testCards.ts"

# Lines the decklist format allows that are not cards.
SECTION = re.compile(r"^(commander|deck|sideboard|maybeboard|companion)\s*:?\s*$", re.I)
# "1 Shock (M21) 149" / "1x Shock" / "1 Shock #foil"
ENTRY = re.compile(r"^(\d+)\s*x?\s+(.+?)\s*(?:\((?:[^)]*)\)\s*[\w-]*)?\s*$")


# ---------------------------------------------------------------------------
# Why a card is blocked.
#
# Ordered: the first pattern that matches a line wins, so the more specific
# entries come first. These name *engine capabilities*, not card themes - the
# whole point is that the output is a list of things to build.
# ---------------------------------------------------------------------------
BLOCKERS = [
    (r"\{T\}: Add|^Add \{|^Add one mana|\{T\}, .*: Add",
     "Mana abilities on nonland permanents, and colourless mana",
     "Color is W|U|B|R|G and addMana takes a Color, so a mana rock cannot be written at all"),
    (r"^\{T\}:|^\{\d+\}, \{T\}:",
     "Tap abilities on permanents other than lands",
     "activatedAbilities support a tap cost, but only the pump and mana shapes are generated"),
    (r"^At the beginning of",
     "Turn-based triggers (upkeep, end step, each combat)",
     "trigger events are only enters-battlefield, attacks, dies, landfall, permanent-enters"),
    (r"Whenever (you|an opponent|a player) cast|Whenever .* is cast",
     "Cast triggers",
     "nothing fires when a spell is put on the stack"),
    (r"^Destroy all|^Exile all|^Each player sacrifices|^Destroy each",
     "Mass removal (wrath effects)",
     "there is no destroy-all effect of any kind"),
    (r"an opponent controls|target opponent controls|you don't control",
     "Targets restricted by who controls them",
     "the creature selector is any creature; it cannot be narrowed to an opponent's"),
    (r"for up to (a|one|two|three|\d+) |put one onto the battlefield and the rest",
     "Searching for more than one card at a time",
     "searchLibrary finds exactly one card and sends it to one destination"),
    (r"\bSacrifice\b|\bsacrifices\b|\bsacrificed\b",
     "Sacrifice, as a cost and as an effect",
     "not modelled at all"),
    (r"^Equip|^Enchant |^Enchanted |\battach\b|\bAttached\b|\bequipped\b",
     "Attach - Equipment and Auras",
     "no attachment relationship between permanents exists"),
    (r"\bdiscard",
     "Discard",
     "no effect can move a card from a hand to a graveyard"),
    (r"\bequal to\b|\bfor each\b|\btimes\b",
     "Dynamic amounts",
     "every number in the DSL is a literal, so 'equal to its power' cannot be written"),
    (r"\bgains? (flying|trample|haste|vigilance|lifelink|deathtouch|first strike|double strike|indestructible|hexproof|menace|reach)|\b(have|has) (flying|trample|haste|vigilance|lifelink|deathtouch|indestructible|hexproof)",
     "Granting keywords",
     "staticBuff only adjusts power and toughness"),
    (r"costs? \{|costs? \d+ less|costs? \d+ more",
     "Cost modification",
     "casting costs are fixed at the card"),
    (r"^Create |\bcreates? (a|an|one|two|three|\d+)\b.*token",
     "Token creation for arbitrary tokens",
     "createToken works but needs a fixture per token, and none exist beyond the current few"),
    (r"enters tapped|enters the battlefield tapped",
     "Permanents that enter tapped",
     "nothing can arrive tapped, which is most nonbasic lands"),
    (r"\bproliferate\b|\b(charge|loyalty|\-1/\-1|time|oil) counter",
     "Counters other than +1/+1",
     "counters.ts models plusOneCounters only"),
    (r"\bloyalty\b|^\+\d+:|^\-\d+:",
     "Planeswalkers",
     "not a supported card type"),
    (r"\{X\}",
     "X in a cost",
     "parse_mana_cost refuses X, hybrid and phyrexian symbols"),
    (r"\bscry\b|\bsurveil\b|top of your library|look at the top",
     "Library manipulation (scry, surveil, top-of-library)",
     "the library is a list nothing can look at"),
    (r"\bcan't be blocked\b|\bmenace\b.*\bcan't\b|\bunblockable\b",
     "Evasion beyond flying and menace",
     "declareBlockers only knows flying, reach and menace"),
    (r"\buntap\b",
     "Untap effects",
     "only the untap step untaps anything"),
    (r"\bexile\b.*\byou may (cast|play)\b|from among them",
     "Playing cards from exile",
     "returnFromExile moves cards but nothing can be cast from there"),
    (r"target opponent|each opponent|target player (discards|loses|sacrifices)",
     "Effects aimed at a player other than damage and life",
     "the player selector reaches life totals only"),
    (r"\bcopy\b|\bcopies\b",
     "Copying spells and permanents",
     "not modelled"),
    (r"\bward\b",
     "Ward variants beyond a flat mana cost",
     "wardCost is a mana cost only"),
    (r"\bfight\b",
     "Fight",
     "no effect makes two creatures deal damage to each other"),
    (r"\bregenerate\b|\bshroud\b|\bprotection from\b",
     "Regenerate, shroud and protection",
     "none of the three are implemented"),
]

UNRECOGNISED = ("Unrecognised - needs reading by hand",
                "this line matched none of the known gaps; look at it before assuming anything")


def blocker_for(line):
    for pattern, title, why in BLOCKERS:
        if re.search(pattern, line, re.I):
            return title, why
    return UNRECOGNISED


# ---------------------------------------------------------------------------
# Triggers, taken apart.
#
# A triggered ability is a wrapper and an effect, and they fail for completely
# different reasons and cost completely different amounts to fix. "When this
# creature enters, draw a card" and "when this creature dies, draw a card" both
# use an effect the DSL has had for months; the second is refused only because
# gen_fixtures has no pattern for it, which is an afternoon in a Python file
# rather than engine work.
#
# Without this split every one of those lands in "unrecognised" and reads like a
# missing system. Eternal Witness, Ravenous Chupacabra and Solemn Simulacrum all
# did exactly that on the first run of this tool - and between them they need
# one small engine feature and one generator pattern, not three systems.
# ---------------------------------------------------------------------------
TRIGGER_WRAPPERS = [
    (r"^When(?:ever)? (?:this creature|this permanent|this artifact|this enchantment|~) enters,\s*(.+)$",
     "enters-battlefield"),
    (r"^When(?:ever)? (?:this creature|this permanent|~) dies,\s*(.+)$", "dies"),
    (r"^When(?:ever)? (?:this creature|~) attacks,\s*(.+)$", "attacks"),
    (r"^When(?:ever)? another creature you control enters,\s*(.+)$", "permanent-enters"),
    (r"^When(?:ever)? a land enters(?: the battlefield)?(?: under your control)?,\s*(.+)$", "landfall"),
]


# Wording the DSL already covers, written a different way.
#
# Wizards templates the same effect several ways across twenty years of
# printings - Rampant Growth says "put that card onto the battlefield tapped"
# where Evolving Wilds-era cards say "put it onto the battlefield tapped". The
# generator matches one and refuses the other, which is a Python problem
# masquerading as a missing engine feature. Normalising here is what lets the
# report call that out as a generator gap instead of burying it in
# "unrecognised".
NORMALISATIONS = [
    (r"put that card onto the battlefield", "put it onto the battlefield"),
    (r"put that card into your hand", "put it into your hand"),
    (r"reveal that card, put it", "reveal it, put it"),
    (r"^Return target creature card from your graveyard to your hand",
     "Return target Creature card from your graveyard to your hand"),
]


def normalise(text):
    out = text
    for pattern, replacement in NORMALISATIONS:
        out = re.sub(pattern, replacement, out, flags=re.I)
    return out


def effect_is_expressible(text):
    """True if this sentence is something SPELL_RULES already builds."""
    sentence = normalise(text.strip())
    if not sentence:
        return False
    sentence = sentence[0].upper() + sentence[1:]
    if not sentence.endswith("."):
        sentence += "."
    for pattern, build in gen.SPELL_RULES:
        match = re.match(pattern, sentence)
        if match:
            built = build(match)
            return built is not None and "None" not in built
    # The two trigger effects gen_fixtures hard-codes rather than listing in
    # SPELL_RULES, so they count as expressible too.
    return bool(re.match(r"^(You gain \d+ life|Draw a card)\.$", sentence))


def analyse_line(line):
    """(title, why) for one oracle line the generator refused."""
    for pattern, event in TRIGGER_WRAPPERS:
        match = re.match(pattern, line, re.I)
        if not match:
            continue
        effect = match.group(1).strip()
        optional = bool(re.match(r"^you may\s+", effect, re.I))
        core = re.sub(r"^you may\s+", "", effect, flags=re.I)
        if effect_is_expressible(core):
            if optional:
                return ("Optional triggers (\"you may\")",
                        "triggered abilities always resolve; making one mandatory would change "
                        "the card, so these are refused rather than approximated")
            return ("Generator gap - %s triggers whose effect the DSL already has" % event,
                    "the engine can do this today; gen_fixtures only has patterns for ETB "
                    "gain-life and ETB draw, so everything else is skipped")
        # The wrapper is fine, the effect is not. Diagnose the effect.
        return blocker_for(core)

    # Not a trigger. If the line only failed because of how it is worded, that
    # is a pattern to add to gen_fixtures rather than anything to build.
    if effect_is_expressible(line):
        return ("Generator gap - wording variant of an effect the DSL already has",
                "the engine can do this today; gen_fixtures matches one templating of it "
                "and refuses the others")
    return blocker_for(line)


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
# Rows in the bulk file that are not cards anyone can put in a deck. Art series
# entries are the reason this exists: they are named "Lightning Bolt //
# Lightning Bolt", so an unfiltered index answers a query for Lightning Bolt
# with a piece of memorabilia that has no rules text at all.
NON_CARD_LAYOUTS = {
    "art_series", "token", "double_faced_token", "emblem",
    "scheme", "planar", "vanguard", "augment", "host", "reversible_card",
}


def load_oracle():
    """name (lowercased) -> Scryfall card. Front faces of split/DFC cards too."""
    full = {}
    halves = {}
    with gzip.open(DATA, "rt", encoding="utf-8") as handle:
        for row in handle:
            card = json.loads(row)
            if card.get("layout") in NON_CARD_LAYOUTS:
                continue
            # Alchemy rebalances are digital-only and shadow their paper
            # originals under names like "A-Lightning Bolt".
            games = card.get("games")
            if games and "paper" not in games:
                continue
            full.setdefault(card["name"].lower(), card)
            # "Fire // Ice" is listed under its full name; people type either
            # half. Kept in a second index so a half-name can never shadow a
            # card that genuinely has that name on its own - which is exactly
            # what put a modal double-faced card in front of Rampant Growth.
            if " // " in card["name"]:
                for half in card["name"].split(" // "):
                    halves.setdefault(half.strip().lower(), card)
    for name, card in halves.items():
        full.setdefault(name, card)
    return full


def load_implemented():
    """Card names already present as fixtures."""
    text = FIXTURES.read_text(encoding="utf-8")
    return {m.lower() for m in re.findall(r'^\s*name: "([^"]+)",', text, re.M)}


def parse_decklist(text):
    """[(count, name)] from a pasted list, ignoring headers, blanks and comments."""
    entries = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("//") or SECTION.match(line):
            continue
        match = ENTRY.match(line)
        if not match:
            # A bare name with no count is common enough to accept.
            entries.append((1, line))
            continue
        entries.append((int(match.group(1)), match.group(2).strip()))
    return entries


# ---------------------------------------------------------------------------
# Classifying
# ---------------------------------------------------------------------------
def oracle_lines(card):
    text = card.get("oracle_text")
    if text is None and card.get("card_faces"):
        text = "\n".join(f.get("oracle_text") or "" for f in card["card_faces"])
    text = gen.strip_reminder(text)
    text = text.replace(card["name"], "~")
    lines, _ = gen.lift_cant_be_countered([l.strip() for l in text.split("\n") if l.strip()])
    return lines


def classify(card):
    """('addable', None) or ('blocked', [(line, title, why), ...])."""
    type_line = card.get("type_line", "")

    # A face-down category the generator never handles: multi-faced cards.
    if card.get("card_faces") and "//" in card.get("name", ""):
        return "blocked", [(type_line, "Multi-faced cards (split, transform, adventure)",
                            "a CardDefinition is one face")]
    if "Planeswalker" in type_line:
        return "blocked", [(type_line, "Planeswalkers", "not a supported card type")]

    if gen.parse_mana_cost(card.get("mana_cost")) is None and "Land" not in type_line:
        return "blocked", [(card.get("mana_cost") or "", "X, hybrid or phyrexian mana in the cost",
                            "parse_mana_cost refuses anything but digits and WUBRG")]

    if "Instant" in type_line or "Sorcery" in type_line:
        if gen.spell_effect(card) is not None:
            return "addable", None
    else:
        if gen.interpret(card) is not None:
            return "addable", None

    lines = oracle_lines(card)
    if not lines:
        # No rules text and still not addable: a land, or a type the generator
        # does not emit. Say so rather than reporting nothing.
        return "blocked", [(type_line, "Card types the generator does not emit",
                            "gen_fixtures emits creatures, instants and sorceries")]

    reasons = []
    for line in lines:
        # Keyword-only lines are not what is blocking this card - something else
        # on it is - so they must not be reported as a gap.
        parts = [p.strip().lower() for p in line.split(",") if p.strip()]
        if parts and all(p in gen.SUPPORTED_KEYWORDS for p in parts):
            continue
        title, why = analyse_line(line)
        reasons.append((line, title, why))
    if not reasons:
        return "blocked", [(type_line, "Card types the generator does not emit",
                            "gen_fixtures emits creatures, instants and sorceries")]
    return "blocked", reasons


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    verbose = "--verbose" in sys.argv
    if not args:
        print(__doc__)
        return 1

    text = Path(args[0]).read_text(encoding="utf-8")
    entries = parse_decklist(text)
    oracle = load_oracle()
    implemented = load_implemented()

    buckets = {"IMPLEMENTED": [], "ADDABLE": [], "BLOCKED": [], "UNKNOWN": []}
    # capability -> [(card name, offending line)]
    work = defaultdict(list)
    whys = {}

    for count, name in entries:
        card = oracle.get(name.lower())
        if card is None:
            buckets["UNKNOWN"].append((count, name))
            continue
        if name.lower() in implemented or card["name"].lower() in implemented:
            buckets["IMPLEMENTED"].append((count, card["name"]))
            continue
        verdict, reasons = classify(card)
        if verdict == "addable":
            buckets["ADDABLE"].append((count, card["name"]))
            continue
        buckets["BLOCKED"].append((count, card["name"], reasons))
        # One card counts once per distinct capability, not once per line.
        seen = set()
        for line, title, why in reasons:
            if title in seen:
                continue
            seen.add(title)
            work[title].append((card["name"], line))
            whys[title] = why

    total = sum(c for c, *_ in entries)
    print("=" * 78)
    print("DECK REPORT  %s" % args[0])
    print("=" * 78)
    print("%d cards, %d distinct entries" % (total, len(entries)))
    for key in ("IMPLEMENTED", "ADDABLE", "BLOCKED", "UNKNOWN"):
        n = sum(row[0] for row in buckets[key])
        print("  %-12s %3d cards" % (key, n))
    print()

    for key, blurb in (
        ("IMPLEMENTED", "Already playable - a fixture exists."),
        ("ADDABLE", "The DSL can express these exactly. Generating them is card work, not engine work."),
        ("UNKNOWN", "No card by this name in the cached bulk data. Check the spelling, or refresh the data."),
    ):
        rows = buckets[key]
        if not rows:
            continue
        print("-" * 78)
        print("%s (%d)" % (key, len(rows)))
        print(blurb)
        for count, name in rows:
            print("  %dx %s" % (count, name))
        print()

    if buckets["BLOCKED"]:
        print("-" * 78)
        print("BLOCKED (%d)" % len(buckets["BLOCKED"]))
        print("Each needs engine work first. The line that blocks it is quoted.")
        for count, name, reasons in buckets["BLOCKED"]:
            titles = []
            for _, title, _why in reasons:
                if title not in titles:
                    titles.append(title)
            print("  %dx %-34s %s" % (count, name, "; ".join(titles)))
            if verbose:
                for line, title, _why in reasons:
                    print("        %-42s -> %s" % (line[:42], title))
        print()

    if work:
        print("=" * 78)
        print("ENGINE WORK QUEUE - what to build, most cards unblocked first")
        print("=" * 78)
        for title, cards in sorted(work.items(), key=lambda kv: -len(kv[1])):
            print()
            print("%s  (%d cards)" % (title, len(cards)))
            print("    why: %s" % whys[title])
            for card_name, line in cards[:8]:
                print("    %-30s %s" % (card_name, line[:60]))
            if len(cards) > 8:
                print("    ... and %d more" % (len(cards) - 8))
    return 0


if __name__ == "__main__":
    sys.exit(main())
