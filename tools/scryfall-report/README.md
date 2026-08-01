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
