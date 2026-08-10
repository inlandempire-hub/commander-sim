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
    # --- keyword mechanics and whole-card shapes, first: these override
    # anything else on the card, because a card with Suspend on it is not
    # addable however ordinary the rest of its text is.
    (r"^(Suspend|Devour|Bestow|Cascade|Convoke|Delve|Escape|Evoke|Kicker|Madness|Flashback|Dredge|Buyback|Embalm|Eternalize|Unearth|Cycling|Morph|Disturb|Adapt|Mutate)\b|\bgains? infect\b|\binfect\b",
     "Keyword mechanics the engine does not implement",
     "each is its own rules system - Suspend, Devour, Bestow, Infect and friends"),
    (r"would be put into (your|a) graveyard.*instead|it puts twice that many|that many plus one|would (be put|get|create).*instead",
     "Replacement effects",
     "nothing in the engine can intercept an event and change it on the way through"),
    (r"^Skip your |maximum hand size|^You may play an additional land|play lands from your graveyard|^You may play ",
     "Static rules changes",
     "cards that edit the rules of the turn itself have nowhere to live"),
    (r"without paying its mana cost|for its (mana )?cost|As an additional cost",
     "Alternative and additional casting costs",
     "casting.ts pays the printed cost and nothing else"),

    # Plain "{T}: Add {G}", "{T}: Add {C}{C}" and "{T}: Add {B} or {G}" are all
    # supported as of 2026-08-07 and are filtered out before diagnosis - see
    # `supported_permanent_line`. What is left here is the shapes that are not.
    # "Add one mana of any color" on its own has worked since Birds of Paradise
    # - five abilities, one per colour - and so has "in your commander's color
    # identity" (Command Tower) and "that a land an opponent controls could
    # produce" (Exotic Orchard). This heading used to swallow all of those and
    # claimed to be what blocked three cards; none of them was blocked by it.
    # What is left is any-colour narrowed by something nothing can evaluate.
    (r"Add one mana of any type|Add one mana of any color(?!\.| in your commander's color identity\.|"
     r" that a land an opponent controls could produce\.| \. Spend this mana only to cast a legendary spell)",
     "Mana of any colour, narrowed by something the engine cannot ask",
     "colorFrom covers the commander's identity and an opponent's lands; any other qualifier does not exist"),
    (r"\{T\}: Add [^.]*\. (?!This (?:land|creature|permanent|artifact) deals \d+ damage to you\.|Activate only if )",
     "Mana abilities with a rider the generator cannot read",
     "the painland rider and 'activate only if you control ...' both generate; anything else on the end of a mana ability does not"),
    (r"^\{T\}:|^\{\d+\}, \{T\}:",
     "Tap abilities that are not mana abilities",
     "activatedAbilities support a tap cost, but only the pump, mana, regenerate and gain-life shapes are generated"),
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
    (r"put that card on top|on top of (your|their) library",
     "Tutoring to the top of the library",
     "searchLibrary's destinations are hand and battlefield only"),
    # The dash is load-bearing: real modal templating is "Choose one —" followed
    # by bullets. Scheming Symmetry opens "Choose two target players." with no
    # dash and is not modal at all - it was being filed under modal, which would
    # have had somebody build modal spells expecting to get it.
    (r"^Choose (one|two|three)\s*[-—]",
     "Modal spells written as a bullet list",
     "the DSL has a modal effect; gen_fixtures has no pattern for the 'Choose one -' template"),
    (r"counters? on target|put a \+1/\+1 counter on target",
     "Counters placed on a chosen target",
     "addCounter always applies to the card the ability is printed on"),
    (r"\bmill\b|\bmills\b",
     "Mill",
     "nothing can move cards from a library to a graveyard"),
    (r"Activate only as a sorcery|Activate only (?:during|before|after|any time)|Cast this spell only",
     "Timing restrictions on activating or casting",
     "activateOnlyIf asks about the board; nothing asks what step it is or whether the stack is empty"),
    (r"\bpay (any amount of|X) life\b|Pay \d+ life",
     "Paying life as a cost",
     "costs are mana and tapping"),
    (r"^Attacking .* get |you control with .* (have|has|get)|creatures you control get .* and (have|gain)",
     "Statics that are conditional or restricted",
     "staticBuff is an unconditional +N/+N, optionally narrowed by subtype"),
    (r"\bSacrifice\b|\bsacrifices\b|\bsacrificed\b",
     "Sacrificing something other than the card itself",
     "sacrificing *this* permanent works both as a cost (every fetchland) "
     "and as an effect (Riveteers Overlook); choosing which of your "
     "permanents to give up, and watching an opponent sacrifice one, do not"),
    (r"^Equip|^Enchant |^Enchanted |\battach\b|\bAttached\b|\bequipped\b",
     "Attach - Equipment and Auras",
     "no attachment relationship between permanents exists"),
    (r"\bdiscard",
     "Discard",
     "no effect can move a card from a hand to a graveyard"),
    (r"\bequal to\b|\bfor each\b|\btimes\b|-X/-X|\+X/\+X|\bX (creature|1/1|target)",
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
    # Plain "This land enters tapped." is supported. What survives to here is
    # the conditional forms, which are a different problem entirely: a condition
    # on the permanent's own arrival.
    (r"enters tapped unless|As this .* enters|enters the battlefield tapped unless",
     "Permanents that enter tapped only under a condition",
     "entersTapped is a flat yes or no; writing a conditional one as flat makes "
     "the card strictly worse than it is"),
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
    (r"[Rr]egenerate (?:each|all|any number|up to)",
     "Regenerating more than one creature at once",
     "the regenerate effect takes one target; nothing sweeps the battlefield with it"),
    (r"\bshroud\b|\bprotection from\b",
     "Shroud and protection",
     "neither is implemented - regenerate now is, for a single target"),
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
    (r"^When(?:ever)? (?:this creature|this permanent|this artifact|this enchantment|this land|~) enters,\s*(.+)$",
     "enters-battlefield"),
    (r"^When(?:ever)? (?:this creature|this permanent|~) dies,\s*(.+)$", "dies"),
    (r"^When(?:ever)? (?:this creature|~) attacks,\s*(.+)$", "attacks"),
    (r"^When(?:ever)? another creature you control enters,\s*(.+)$", "permanent-enters"),
    (r"^When(?:ever)? a land you control enters(?: the battlefield)?,\s*(.+)$", "landfall"),
]

# Trigger shapes that are perfectly ordinary Magic and that the engine has no
# event for. Kept apart from BLOCKERS so they are named as *events to add*
# rather than as whatever their effect happens to mention - "whenever you gain
# life, put a +1/+1 counter on each Pest" is a missing trigger, not a missing
# counter system, and this deck is built on that one trigger.
UNSUPPORTED_TRIGGERS = [
    (r"^When(?:ever)? you gain life,", "you gain life"),
    (r"^When(?:ever)? .* is dealt damage,", "a permanent is dealt damage"),
    (r"^When(?:ever)? .* leaves the battlefield", "a permanent leaves the battlefield"),
    (r"^When(?:ever)? (a|an|another) .*(you control|a player controls)? dies,", "a permanent other than this one dies"),
    (r"^When(?:ever)? (a|an) .* you control attacks,", "a permanent other than this one attacks"),
    (r"^When(?:ever)? a land enters,", "a land enters under any player's control"),
    (r"^When(?:ever)? (a|an|another) [A-Za-z, ]+ enters,", "another permanent enters, narrowed by type"),
]
# Deliberately no catch-all here. An over-broad "whenever anything happens"
# entry swallowed Arasta of the Endless Web, whose trigger is an opponent
# casting a spell and which belongs under Cast triggers - a named gap that
# other cards in the same list share. A line that reaches the end unmatched is
# reported as unrecognised, which is a worse answer to read and a better one to
# have.


# "Morbid - ", "Landfall - ", "Magecraft - ", "Infusion - ". Ability words are
# italic flavour with no rules meaning at all; leaving them on the front of a
# line stops every pattern below from matching and sends genuinely ordinary
# triggers into "unrecognised".
ABILITY_WORD = re.compile(r"^[A-Z][A-Za-z' ]{2,20}\s*[-—]\s*(?=[A-Z])")
# "Choose one -" opens a modal spell and is rules text, not flavour. It matches
# the shape of an ability word exactly, and stripping it leaves a bullet list
# with nothing to say what the bullets are for.
NOT_AN_ABILITY_WORD = re.compile(r"^Choose (one|two|three)\b", re.I)


def strip_ability_word(line):
    return line if NOT_AN_ABILITY_WORD.match(line) else ABILITY_WORD.sub("", line)


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


def tidy(text):
    """A sentence, capitalised and full-stopped, the way SPELL_RULES expects it."""
    sentence = text.strip()
    if not sentence:
        return ""
    sentence = sentence[0].upper() + sentence[1:]
    return sentence if sentence.endswith(".") else sentence + "."


def effect_is_expressible(text):
    """True if this sentence is something SPELL_RULES already builds."""
    # Both forms, because normalising is not free: rewriting "put that card into
    # your hand" to "put it into your hand" broke Profane Tutor, whose exact
    # wording SPELL_RULES already matched. A normalisation that helps one card
    # must not be allowed to hide another.
    for sentence in (tidy(text), tidy(normalise(text))):
        if not sentence:
            continue
        for pattern, build in gen.SPELL_RULES:
            match = re.match(pattern, sentence)
            if match:
                built = build(match)
                if built is not None and "None" not in built:
                    return True
        # The two trigger effects gen_fixtures hard-codes rather than listing in
        # SPELL_RULES, so they count as expressible too.
        if re.match(r"^(You gain \d+ life|Draw a card)\.$", sentence):
            return True
    return False


def supported_permanent_line(line):
    """True if gen_fixtures handles this line on its own."""
    # The enters-triggers go through gen.enters_trigger rather than being listed
    # here, so this cannot drift from the generator's own idea of which shapes
    # it handles - which is the whole reason that family became one function
    # shared by every card-writing path.
    if gen.enters_trigger(line):
        return True
    return any(
        pattern.match(line)
        for pattern in (gen.TAP_ADD, gen.TAP_ADD_EITHER, gen.TAP_ADD_ANY,
                        gen.TAP_ADD_ANY_IN_IDENTITY, gen.ENTERS_TAPPED,
                        gen.FETCH, gen.SAC_FOR_BASIC)
    )


def analyse_line(raw_line):
    """
    Every reason one oracle line is refused, as a list of (title, why).

    A list rather than one answer, because a single line routinely needs two
    separate things and reporting only the first makes the whole work queue lie.
    "At the beginning of your end step, create a 1/1 green Insect token" needs
    a turn-based trigger *and* token creation; counted as one, it says adding
    turn-based triggers would finish the card, and it would not. That
    over-count is what made "9 cards" out of a capability that on its own
    completes none of them.
    """
    line = strip_ability_word(raw_line)

    # A bullet is a *mode*, and what matters is whether its contents can be
    # expressed. Tagging every bullet "modal" and stopping there is what made
    # the report claim modal spells would finish three cards, when checking the
    # three by hand showed it finishes none: Golgari Charm's third mode is
    # Regenerate, both of Return of the Wildspeaker's want dynamic amounts, and
    # Scheming Symmetry is not modal at all. The bullet is never the blocker.
    if re.match(r"^[•*]\s*", line):
        body = re.sub(r"^[•*]\s*", "", line)
        return [] if effect_is_expressible(body) else _analyse_single(body)

    # A trigger the engine does not have, whose effect is also unsupported, is
    # two gaps on one line.
    for pattern, event in UNSUPPORTED_TRIGGERS:
        match = re.match(pattern, line, re.I)
        if not match:
            continue
        reasons = [("Trigger event the engine does not have: %s" % event,
                    "triggeredAbilities know five events; this is a sixth")]
        reasons.extend(effect_reasons(line[match.end():].strip(" ,")))
        return reasons

    if re.match(r"^At the beginning of", line, re.I):
        reasons = [("Turn-based triggers (upkeep, end step, each combat)",
                    "trigger events are only enters-battlefield, attacks, dies, landfall, "
                    "permanent-enters")]
        rest = re.sub(r"^At the beginning of [^,]+,\s*", "", line, flags=re.I)
        reasons.extend(effect_reasons(rest))
        return reasons

    return _analyse_single(line)


def effect_reasons(text):
    """What is wrong with the effect half of a trigger, if anything."""
    if not text or effect_is_expressible(re.sub(r"^you may\s+", "", text, flags=re.I)):
        return []
    reasons = _analyse_single(text)
    # An effect that is only unrecognised adds nothing useful beside a named
    # trigger gap - the trigger is the finding.
    return [r for r in reasons if r[0] != UNRECOGNISED[0]]


def _analyse_single(line):
    """One line's reasons, when it is not one of the two multi-reason shapes."""
    for pattern, event in TRIGGER_WRAPPERS:
        match = re.match(pattern, line, re.I)
        if not match:
            continue
        effect = match.group(1).strip()
        optional = bool(re.match(r"^you may\s+", effect, re.I))
        core = re.sub(r"^you may\s+", "", effect, flags=re.I)
        if effect_is_expressible(core):
            if optional:
                return [("Optional triggers (\"you may\")",
                         "triggered abilities always resolve; making one mandatory would change "
                         "the card, so these are refused rather than approximated")]
            return [("Generator gap - %s triggers whose effect the DSL already has" % event,
                     "the engine can do this today; gen_fixtures only has patterns for ETB "
                     "gain-life and ETB draw, so everything else is skipped")]
        # The wrapper is a trigger the engine has; only the effect is missing.
        return [blocker_for(core)]

    # Before blaming the effect, check whether the whole card shape is the
    # problem - a keyword mechanic or a replacement effect overrides everything
    # else about the card.
    for pattern, title, why in BLOCKERS[:4]:
        if re.search(pattern, line, re.I):
            return [(title, why)]

    # If the line only failed because of how it is worded, that is a pattern to
    # add to gen_fixtures rather than anything to build.
    if effect_is_expressible(line):
        return [("Generator gap - wording variant of an effect the DSL already has",
                 "the engine can do this today; gen_fixtures matches one templating of it "
                 "and refuses the others")]
    return [blocker_for(line)]


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
            # Alchemy rebalances are digital-only cards that shadow their paper
            # originals, and Scryfall names them "A-Lightning Bolt".
            #
            # Filtering these by `games` instead was the obvious move and was
            # wrong: oracle-cards picks one *representative printing* per card,
            # and for Bayou that is Vintage Masters and for Sylvan Tutor it is
            # Masters Edition IV - both MTGO-only sets. Both cards are perfectly
            # legal in paper, and both came back from the first run of a real
            # decklist as "no such card", which is the worst possible way for
            # this tool to be wrong.
            if card["name"].startswith("A-"):
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


def face_reasons(face):
    """Everything blocking one face of a multi-faced card, beyond being a face."""
    text = gen.strip_reminder(face.get("oracle_text"))
    text = text.replace(face.get("name", ""), "this permanent")
    out = []
    for line in [l.strip() for l in text.split("\n") if l.strip()]:
        parts = [p.strip().lower() for p in line.split(",") if p.strip()]
        if parts and all(p in gen.SUPPORTED_KEYWORDS for p in parts):
            continue
        if supported_permanent_line(line) or effect_is_expressible(line):
            continue
        for title, why in analyse_line(line):
            out.append((line, title, why))
    return out


def classify(card):
    """('addable', None) or ('blocked', [(line, title, why), ...])."""
    type_line = card.get("type_line", "")

    # Multi-faced cards. Being two-faced is one blocker; each face then has its
    # own text, and reporting only the first made this the top line of the
    # report claiming six completions when five of the six also want sacrifice,
    # or dynamic amounts, or a mechanic that does not exist. Only Bala Ged
    # Recovery is otherwise ready.
    if card.get("card_faces") and "//" in card.get("name", ""):
        reasons = [(type_line, "Multi-faced cards (split, transform, adventure)",
                    "a CardDefinition is one face")]
        for face in card["card_faces"]:
            reasons.extend(face_reasons(face))
        return "blocked", reasons
    if "Planeswalker" in type_line:
        return "blocked", [(type_line, "Planeswalkers", "not a supported card type")]

    if gen.parse_mana_cost(card.get("mana_cost")) is None and "Land" not in type_line:
        return "blocked", [(card.get("mana_cost") or "", "X, hybrid or phyrexian mana in the cost",
                            "parse_mana_cost refuses anything but digits and WUBRG")]

    # ADDABLE has to mean "the generator will emit this", so each type goes to
    # the function that actually decides it. Routing everything through
    # `interpret` was wrong and said so loudly: Bayou has no rules text at all,
    # so `interpret` was perfectly happy with it while `emit` would have written
    # it out as a creature with no power or toughness.
    if "Instant" in type_line or "Sorcery" in type_line:
        if gen.spell_effect(card) is not None:
            return "addable", None
    elif "Creature" in type_line:
        # An artifact creature is still a creature: it has power and toughness
        # and belongs on the creature path, not the permanent one.
        if gen.interpret(card) is not None:
            return "addable", None
    elif any(t in type_line for t in ("Land", "Artifact", "Enchantment")):
        if gen.interpret_permanent(card) is not None:
            return "addable", None
    else:
        kind = type_line.split("—")[0].strip() or type_line
        return "blocked", [(type_line,
                            "Card types the generator does not emit: %s" % kind,
                            "gen_fixtures writes creatures, instants, sorceries, lands, "
                            "artifacts and enchantments - this is none of them")]

    lines = oracle_lines(card)
    if not lines:
        # No rules text and still not addable: a land, or a type the generator
        # does not emit. Say so rather than reporting nothing.
        return "blocked", [(type_line, "Card types the generator does not emit",
                            "gen_fixtures emits creatures, instants and sorceries")]

    reasons = []
    for line in lines:
        # Lines that are individually fine are not what is blocking this card -
        # something else on it is - so they must not be reported as a gap.
        # Without this, Deathcap Glade is refused for its conditional tapped
        # line and then *also* blamed for its perfectly ordinary "{T}: Add {B}
        # or {G}", which inflates a capability the engine already has into the
        # top of the work queue.
        parts = [p.strip().lower() for p in line.split(",") if p.strip()]
        if parts and all(p in gen.SUPPORTED_KEYWORDS for p in parts):
            continue
        if supported_permanent_line(line):
            continue
        for title, why in analyse_line(line):
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
        # What building one thing would actually *finish*, as against how many
        # cards merely mention it.
        #
        # These two numbers are wildly different and the second one is a trap.
        # Turn-based triggers were named by 9 cards and would have completed
        # none of them on their own: every one of the nine also wants tokens, or
        # a condition, or a dynamic amount. Sorting a work queue by mentions
        # picks the item that looks biggest rather than the one that pays.
        completions = defaultdict(list)
        for count, name, reasons in buckets["BLOCKED"]:
            titles = {title for _, title, _why in reasons}
            if len(titles) == 1:
                completions[titles.pop()].append(name)

        print("=" * 78)
        print("WHAT WOULD ACTUALLY FINISH A CARD")
        print("=" * 78)
        print("Cards whose remaining blockers all carry this one name. Necessary, not")
        print("sufficient: one *name* can still hide more than one job, and a heading")
        print("names a shape rather than the work. 'Any colour mana' claimed three cards")
        print("and blocked none of them - two wanted something else entirely and the")
        print("third, Path of Ancestry, wants a scry trigger tied to how its mana is")
        print("spent. Read every card against Scryfall before promising the number.")
        if not completions:
            print("  Nothing on this list is one capability away.")
        for title, cards in sorted(completions.items(), key=lambda kv: -len(kv[1])):
            print()
            print("%s  -> finishes %d" % (title, len(cards)))
            print("    " + ", ".join(cards))

        print()
        print("=" * 78)
        print("EVERYTHING MENTIONED - not the same thing, see above")
        print("=" * 78)
        for title, cards in sorted(work.items(), key=lambda kv: -len(kv[1])):
            finishes = len(completions.get(title, []))
            print()
            print("%s  (%d cards mention it, finishes %d)" % (title, len(cards), finishes))
            print("    why: %s" % whys[title])
            for card_name, line in cards[:8]:
                print("    %-30s %s" % (card_name, line[:60]))
            if len(cards) > 8:
                print("    ... and %d more" % (len(cards) - 8))
    return 0


if __name__ == "__main__":
    sys.exit(main())
