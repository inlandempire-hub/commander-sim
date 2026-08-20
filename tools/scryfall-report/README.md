# Scryfall Commander card report

Prep work for Phase 5 (deck builder) and the ongoing "expand the card pool"
backlog item in ROADMAP.md. Pulls Scryfall's official `oracle_cards` bulk
data (one row per unique card, not per printing), filters to everything
legal in Commander, and tags each card with a rough archetype guess and an
implementation-difficulty score, so we can pick "next easiest batch to
script" instead of scrolling the entire card pool by hand.

## Running it

```bash
py fetch_bulk_data.py      # downloads the current oracle_cards bulk file to ./data/ (gitignored - it's ~24MB compressed, regenerable, not source)
py build_report.py         # reads ./data/oracle-cards.jsonl.gz, writes ./output/commander_card_report.xlsx
```

Re-run both whenever you want a fresh pass (Scryfall updates this bulk file roughly daily as new cards get added/errata'd).

## What the categorization actually is

The **data columns** (name, type, mana cost, colors, color identity, oracle
text, keywords, power/toughness, rarity) come straight from Scryfall - no
guessing there.

The **archetype tags** and **complexity score are heuristics**, built from
regex pattern-matching over the oracle text (see `heuristics.py`). They're
good enough for *triage* - sorting a few thousand cards into roughly right
piles - but they will get things wrong at the edges: a one-line static
ability can be secretly nasty to implement (e.g. anything with "instead" -
a replacement effect), and a long block of reminder text on a
keyword-heavy vanilla creature can look scarier than it is. The
`complexity_flags` column names exactly which heuristic(s) fired on a given
row, specifically so this can be spot-checked and corrected rather than
trusted blindly. Treat the score as a sort order to start from, not a
verdict.

## Columns

| Column | Source |
|---|---|
| `name`, `type_line`, `mana_cost`, `cmc`, `colors`, `color_identity`, `oracle_text`, `keywords`, `power`, `toughness`, `rarity` | Scryfall, verbatim (multi-faced cards have their faces joined with " // ") |
| `is_multi_faced` | Derived from `layout` (transform/modal_dfc/split/adventure/flip/meld) |
| `archetype_tags` | Heuristic, semicolon-separated, a card can match several |
| `complexity_score` | Heuristic, numeric, higher = harder |
| `complexity_tier` | Heuristic, `1 - vanilla` / `2 - simple` / `3 - moderate` / `4 - complex` |
| `complexity_flags` | Which specific heuristic(s) drove the score, for auditing |
| `already_implemented` | `True` if this card's engine id already exists in `packages/engine/src/cards/testCards.ts` |

## `deck_report.py` - what a decklist needs before it can be played

    py -X utf8 tools/scryfall-report/deck_report.py mydeck.txt
    py -X utf8 tools/scryfall-report/deck_report.py mydeck.txt --verbose

The tool for the deck-led way of growing the pool, agreed 2026-08-07: a real
decklist goes in, and out comes what the engine can already play, what it could
play if someone generated the fixture, and what is actually blocked - with the
blockers grouped into an engine work queue ordered by how many cards in *this
list* each one unblocks.

Takes the same "N Card Name" text every Magic tool writes, and the same text the
client's own importer reads (`packages/client/src/deckbuilder/deckText.ts`).
Section headers, blank lines, comments and set/collector suffixes are ignored.

Four verdicts per card:

| Verdict | Meaning |
|---|---|
| `IMPLEMENTED` | a fixture already exists in `testCards.ts` |
| `ADDABLE` | the DSL expresses it exactly; generating it is card work, not engine work |
| `BLOCKED` | something is missing, and the report names what and quotes the line |
| `UNKNOWN` | no such card in the cached bulk data - a typo, or stale data |

**The three-way split is not a judgement call.** It imports `gen_fixtures` and
runs the card through the same `interpret` / `spell_effect` the generator uses,
so a card this calls ADDABLE is a card the generator will actually emit. If the
two ever disagree that is a bug here.

The *reason* a blocked card is blocked is the heuristic part, and it is the
reason the tool is worth having. It takes triggered abilities apart into their
wrapper and their effect, because those fail for completely different reasons
and cost completely different amounts to fix - "when this dies, draw a card"
uses an effect the DSL has had for months and is refused only because
`gen_fixtures` has no pattern for it. Those are reported as **generator gaps**,
separately from real missing systems. On the first list run through it, three
cards that looked like missing systems were one small engine feature and one
Python pattern between them.

Every diagnosis prints the oracle line that caused it, so the call can be
checked rather than trusted, and anything it cannot place is reported as
unrecognised rather than guessed at.

## Decklists

`decks/` holds the raw lists the deck-led loop is working through, so
`deck_report.py` can be re-run against them as the engine grows rather than
having the list re-typed each time. Card names only - no rules text, no images.

```bash
py -X utf8 deck_report.py decks/winter-chaos.txt
py -X utf8 pool_report.py                          # the same question, whole pool
```
