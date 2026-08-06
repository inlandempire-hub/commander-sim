# MTG Commander Sim

A real, rules-enforcing digital Magic: The Gathering client for the Commander
format. Not a virtual tabletop where players agree on what happened - the
engine runs the turn structure, the stack, priority, triggered abilities,
replacement effects and state-based actions itself, and only asks a human for
choices it genuinely cannot make for them.

Private project, for a small group of friends. Not published, not distributed,
and it never ships anyone else's card data or art - see
[Copyright and card data](#copyright-and-card-data).

## What works today

- **Full Commander rules**: 100-card singleton decks, colour identity, command
  zone, commander tax, commander damage, 40 life, the commander replacement
  effect.
- **817 real cards**, every one transcribed from Scryfall and re-checkable
  against it by an audit script. Nothing in the pool is invented.
- **Two ways to play**: against a heuristic bot, or over a WebSocket against a
  friend on another machine. Your opponent's hand is face-down either way.
- **Five pre-built archetype decks**, one per colour.
- **A deck builder** with search, filters, live legality checking, saved decks
  and text import/export.
- **503 tests** covering the engine, the bot and the deck builder.

See [ROADMAP.md](ROADMAP.md) for the full phase-by-phase history and the
current backlog.

## Quick start

```bash
npm install
npm run build -w @mtg-commander-sim/engine
npm run dev -w @mtg-commander-sim/client
```

Then open <http://localhost:5180>. Full details, including the Python tooling,
are in [docs/SETUP.md](docs/SETUP.md).

## Running the tests

```bash
npm test
npm run typecheck
```

Both should be completely clean. [docs/TESTING.md](docs/TESTING.md) explains
what each suite covers, how to add tests, and the gotchas that bite first-time
contributors.

## Layout

| Path | What it is |
|---|---|
| `packages/engine` | The rules engine. No UI, no networking - a pure game-state machine. Also holds the card pool and the archetype decks. |
| `packages/protocol` | Shared client/server message types, plus the per-viewer state filter that redacts hidden zones. |
| `packages/server` | Authoritative WebSocket server for two-player networked games. |
| `packages/client` | React UI. Bot and network modes, plus the deck builder. |
| `packages/bot` | The computer opponent - a pure `decideAction(state, playerId)` library with two harnesses. |
| `tools/scryfall-report` | Python tooling for picking, generating and auditing card fixtures against Scryfall's bulk data. |
| `docs/` | Setup, testing, and card-pool guides. |

## Documents worth reading first

- **[CLAUDE.md](CLAUDE.md)** - project intent, constraints and architecture.
  Claude Code reads this automatically when you open the repo.
- **[docs/SETUP.md](docs/SETUP.md)** - getting it running from a fresh clone.
- **[docs/TESTING.md](docs/TESTING.md)** - running, writing and debugging tests.
- **[docs/ADDING-CARDS.md](docs/ADDING-CARDS.md)** - how to add a card without
  inventing one. Read this before touching `testCards.ts`.
- **[ROADMAP.md](ROADMAP.md)** - long. Every phase, every known simplification.

## Copyright and card data

Magic: The Gathering is Wizards of the Coast's intellectual property. This
project is a private, non-commercial tool for a handful of people and is
deliberately built so that it never redistributes anyone else's content:

- Card text, costs, types and legality come from
  [Scryfall's](https://scryfall.com/docs/api) public API and bulk data, which
  explicitly permits this kind of personal, non-commercial use.
- The Scryfall bulk file and the report generated from it are **gitignored**.
  They are regenerable in one command; they are not source, and they do not
  belong in this repo.
- `packages/engine/src/cards/testCards.ts` holds our own machine-readable
  transcription of the small subset of cards the engine can actually play -
  the data needed to *run the rules*, not a copy of the card database.
- No card art is bundled. If art is ever displayed it will be fetched from
  Scryfall at runtime under their terms.

Keep it that way. If a change would mean committing bulk card data or images,
that is the wrong change.

No open-source licence is offered - this is a private repo, all rights
reserved, shared directly with specific people.
