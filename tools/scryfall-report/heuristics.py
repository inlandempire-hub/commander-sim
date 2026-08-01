"""
Archetype tagging and complexity scoring for Commander-legal cards.

Both are heuristics (regex over Oracle text), not authoritative. See the
README for why: they're meant to sort a few thousand cards into roughly
the right piles for triage, not to be trusted as a verdict on any single
card. `complexity_flags` names what fired, specifically so it can be
spot-checked.
"""

import re
from dataclasses import dataclass, field

# (label, pattern) - a card can match any number of these; all matches are kept.
ARCHETYPE_PATTERNS: list[tuple[str, str]] = [
    ("Counterspell", r"counter target spell|counter that spell|counter target activated"),
    ("Removal - creature", r"\b(destroy|exile) target creature\b"),
    ("Removal - other permanent", r"\b(destroy|exile) target (artifact|enchantment|planeswalker|permanent)\b"),
    ("Board wipe", r"destroy all creatures|each creature gets -\d|all creatures get -\d"),
    ("Burn/damage", r"deals? \d+ damage to (target|any target|each|that)"),
    ("Ramp", r"search your library for a( basic)? land card|search your library for an? .*land"),
    ("Mana ability", r"\{t\}\s*[:,]\s*add \{"),
    ("Card draw", r"draws? (a|two|three|four|\d+) cards?"),
    ("Tutor", r"search your library for a card"),
    ("ETB trigger", r"when(ever)? [^.]* enters(?! the battlefield under)"),
    ("Dies/LTB trigger", r"when(ever)? [^.]* dies\b|leaves the battlefield"),
    ("Attack trigger", r"whenever [^.]* attacks\b"),
    ("Lifegain", r"gains? \d+ life|you gain \d+ life|lifelink"),
    ("Token generator", r"creates? [^.]*token"),
    ("Combat trick/pump", r"gets? \+\d+/\+\d+ until end of turn"),
    ("+1/+1 counters", r"\+1/\+1 counter"),
    ("Sacrifice synergy", r"sacrifice (a|another) creature|as an additional cost.*sacrifice"),
    ("Discard", r"discards? a card|discards? (two|three|\d+) cards?"),
    ("Reanimation", r"return[s]? .* from (your|a) graveyard to the battlefield"),
    ("Protection", r"hexproof|indestructible|protection from|can't be countered|can't be the target"),
]

# (label, pattern, weight) - each match adds `weight` to the complexity score.
COMPLEXITY_PATTERNS: list[tuple[str, str, int]] = [
    (r"choose one[^.]*[-—]", 3, "modal (choose one)"),
    (r"choose (two|three) ?[-—]", 4, "modal (choose multiple)"),
    (r"\{x\}", 3, "X cost"),
    (r"for each", 2, "scales with a count"),
    (r"as long as", 2, "conditional static ability"),
    (r"\bwould\b[^.]*\binstead\b", 4, "replacement effect"),
    (r"\bcopy\b", 3, "copy effect"),
    (r"exile [^.]* return", 2, "exile-and-return"),
    (r"can't be countered", 1, "uncounterable clause"),
    (r"hexproof from|protection from", 2, "protection/hexproof-from"),
    (r"proliferate", 2, "proliferate"),
    (r"populate", 2, "populate"),
    (r"flashback|kicker|buyback|madness|cascade|convoke|delve|escape", 3, "alternative/additional cost mechanic"),
    (r"at the beginning of (your|each|the)", 2, "delayed/recurring triggered ability"),
    (r"sacrifice[^.]*unless", 2, "conditional sacrifice"),
    (r"you may [^.]*\brather than\b", 2, "alternative cost choice"),
    (r"link(ed)?\b", 1, "linked-ability reference"),
    (r"annihilator|infect|wither", 2, "damage-replacement combat keyword"),
]

MULTI_FACED_LAYOUTS = {"transform", "modal_dfc", "split", "adventure", "flip", "meld"}


@dataclass
class ComplexityResult:
    score: int
    tier: str
    flags: list[str] = field(default_factory=list)


def tag_archetypes(oracle_text: str) -> list[str]:
    text = (oracle_text or "").lower()
    return [label for label, pattern in ARCHETYPE_PATTERNS if re.search(pattern, text)]


def score_complexity(oracle_text: str, type_line: str, is_multi_faced: bool, keywords: list[str]) -> ComplexityResult:
    text = oracle_text or ""
    flags: list[str] = []
    score = 0

    if not text.strip():
        return ComplexityResult(score=0, tier="1 - vanilla", flags=["no rules text"])

    length_contribution = min(len(text) // 40, 6)
    score += length_contribution
    if length_contribution >= 2:
        flags.append(f"text length ~{len(text)} chars")

    clauses = [c for c in re.split(r"[.\n]", text) if c.strip()]
    if len(clauses) >= 3:
        clause_contribution = min(len(clauses) - 2, 6)
        score += clause_contribution
        flags.append(f"{len(clauses)} clauses")

    lowered = text.lower()
    for pattern, weight, label in COMPLEXITY_PATTERNS:
        if re.search(pattern, lowered):
            score += weight
            flags.append(label)

    if is_multi_faced:
        score += 4
        flags.append("multi-faced card")

    if "Planeswalker" in type_line:
        score += 5
        flags.append("planeswalker (loyalty system not yet built)")

    if "Saga" in type_line:
        score += 3
        flags.append("saga (chapter triggers)")

    if keywords and length_contribution <= 1 and len(clauses) <= 1:
        flags.append("mostly/only keyword abilities")

    # Any actual rules text means there's at least one ability to script -
    # "vanilla" is reserved for cards with no oracle text at all (stats/
    # keywords only), never for "the text just happens to be short." (We
    # only reach here when text is non-empty - see the early return above.)
    if score <= 0:
        score = 1
        flags.append("has rules text (kept out of vanilla despite short length)")

    if score <= 3:
        tier = "2 - simple"
    elif score <= 8:
        tier = "3 - moderate"
    else:
        tier = "4 - complex"

    return ComplexityResult(score=score, tier=tier, flags=flags)
