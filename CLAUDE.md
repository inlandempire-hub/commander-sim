# MTG Commander Simulator

## Vision
An MTG Arena-style digital Magic: The Gathering client, for personal use by a small group of friends only — never published or distributed. Two ways to play: against a friend over the network, or against a computer opponent piloting a randomly-selected archetype deck.

**Non-negotiable requirement:** this is a real digital implementation of the rules, not a Tabletop-Simulator-style board where players talk to each other and manually resolve effects. The engine enforces turn structure, the stack, priority, triggered abilities, replacement effects, and state-based actions automatically. Players are only ever prompted for choices the engine can't make for them (targets, attacker/blocker declarations, ordering simultaneous triggers, modal choices).

It doesn't need Arena's visual polish (that's a full game-engine product) but it should look and feel like a real digital card game — smooth card movement/animations between zones, not a static spreadsheet.

## Scope & non-goals
- Personal/private use only. Never bundle or redistribute Wizards of the Coast IP (see "Card data & art" below) — same posture as the MonsterBox project's copyright stance: ship empty of copyrighted content, fetch/cache under the source's terms instead.
- The full real-world Magic card pool is enormous and will never be fully implemented. Treat card support as an ongoing, long-term backlog — start with a curated set of simple/common cards and expand card-by-card. See ROADMAP.md.
- Format-specific rules for formats other than Commander are explicitly out of scope for now (no Standard/Modern/etc. legality checks, no separate turn-order variants for other formats). Revisit only if we decide to add another format later.

## Format: Commander
Commander is the priority (really, only) supported format initially. Key rules the engine must implement:
- **Deck construction:** 100 cards total including the commander, singleton (no duplicates except basic lands), all nonland/non-basic cards must match the commander's **color identity** (mana symbols in cost *and* rules text, including reminder text on the card itself).
- **Commander card:** starts in the Command Zone, not the library. Can be cast from the Command Zone as though it were in hand.
- **Commander tax:** each time a commander is cast from the Command Zone, its cost increases by {2} generic mana for each previous time it was cast from the Command Zone this game.
- **Commander replacement effect:** if a commander would go to any zone other than the battlefield or command zone (e.g. it dies or is countered), its owner may choose to move it to the Command Zone instead.
- **Starting life total:** 40 (not 20).
- **Commander damage:** a player who has been dealt 21+ combat damage by the *same* commander (cumulative across the game) loses the game, independent of life total.

### Player count
Build for **2-player games first** (a "Duel Commander" shape — you vs. a friend, or you vs. a bot). Traditional Commander is a 3-4 player pod format with politics (alliances, "attack the biggest threat," multiple simultaneous losses to adjudicate), and we may want that later — so **design the engine's core state (turn order, priority, state-based actions) to be player-count-agnostic (N players) even though the initial UI, matchmaking, and bot count only target N=2.** Don't hardcode assumptions like "the opponent" (singular) into core engine types if it's easy to avoid; do feel free to keep the UI, networking, and bot logic 2-player-only for now.

## Architecture
- **Rules engine** (`packages/engine`, `@mtg-commander-sim/engine`) — a standalone TypeScript library, no UI or networking dependencies. Pure game-state machine: turn structure, the stack, priority passing, mana payment, triggered-ability queue, targeting legality, state-based actions (checked continuously), continuous-effect layers (can start simplified, revisit as cards demand it). Testable headlessly (e.g. "cast Lightning Bolt at a 3/3, assert it dies"). Also exports the test card fixtures (`cards/testCards.ts`) and the shared demo two-player game (`demoGame.ts`, `createDemoGame()`) that both the client and server build on until real decks (Phase 5) exist.
- **Protocol** (`packages/protocol`, `@mtg-commander-sim/protocol`) — the shared action API: `ClientMessage`/`ServerMessage` types and `filterGameStateForViewer()`, which redacts a player's hand/library into hidden-card placeholders for every other viewer. Both server and client depend on this so they agree on the wire format.
- **Server** (`packages/server`, `@mtg-commander-sim/server`) — authoritative game state over a `ws` WebSocket (`ws://localhost:8787`, seat chosen via `?seat=donny`/`?seat=mike` on connection). Validates every action by running it through the same engine functions as local play, and always acts as whichever seat a connection joined as - it never trusts a client-supplied identity, so a client genuinely cannot act on the other player's behalf. Broadcasts the filtered view to each connection after every action. One game at a time (no lobby yet - see ROADMAP.md).
- **Client (human)** (`packages/client`, `@mtg-commander-sim/client`) — React + TypeScript UI. Talks to either a local in-memory `GameState` (hotseat mode, default) or the networked server (`?mode=network&seat=donny`/`&seat=mike` in the URL), through a `GameController` interface (`gameController.ts`) so the UI components don't need to know which mode they're in.
- **Bot** (`packages/bot`, `@mtg-commander-sim/bot`) — just another client, built 2026-07-31. A pure `decideAction(state, playerId) -> BotAction` decision library with two harnesses: the client's `?mode=bot` drives a seat through the same `GameController` the UI uses, and `src/runner.ts` joins the server as a seat over the same WebSocket protocol a browser does. There is no "vs AI" code path in the engine or server. It always decides from a `filterGameStateForViewer` view, so it cannot read hidden zones even when sharing one in-memory `GameState` with the UI.
- **Deck builder** — separate UI surface: search/filter the card database, build/save/tag multiple decks, swap cards in and out. Should distinguish "cards the engine currently implements" from "all real Commander-legal cards" so decks aren't built around unimplemented cards.

## Tech stack
TypeScript everywhere (engine, server, client, bot) so types can be shared across the boundary. React + Framer Motion (or CSS transitions) for zone-to-zone animations, tapping, combat, damage — no game-engine (Unity/Godot) needed; MTG's "game feel" is 2D card movement, not physics. Lightweight WebSocket server for authoritative multiplayer state.

**Consuming the engine from other packages:** always via its built dist (`npm run build -w @mtg-commander-sim/engine`, resolved through the npm workspace symlink), never via a bundler alias straight to engine source. An earlier version of the client aliased Vite directly to `engine/src/index.ts` for dev convenience; Vite doesn't auto-resolve the engine's internal `"./x.js"` relative imports to their `.ts` siblings, and it silently fell back to stale compiled files that happened to be sitting in `src/` from a broken build, rather than erroring - costing a real debugging session before it was caught (2026-07-30). After changing engine code, rebuild it, then reload whichever client/server is consuming it.

## Card data & art
Use **Scryfall's** API / bulk data as the source of truth for card text, mana costs, types, color identity, and images — it's free, comprehensive, and explicitly permits non-commercial personal use like this project. This means growing the card pool is purely an *engine-scripting* task (giving a card behavior), not a data-entry task — the raw data and art are already available. Fetch/cache under Scryfall's terms; don't bundle a redistributed copy of their data or images into the repo.

## Card implementation tiers
When adding a new card to the engine, classify it:
1. **Vanilla/simple** — stats + known keywords (flying, trample, etc.) — pure declarative data, no custom code.
2. **Scripted** — ETB effects, triggered abilities, targeted effects — expressed via a small effect DSL (trigger condition, target selector, effect).
3. **Weird** — heavy layer interactions, unusual replacement effects, bespoke text — hand-written code hooks, added one at a time as needed.

## Roadmap
See [ROADMAP.md](ROADMAP.md) for build phases and current status.

## Other docs
- [README.md](README.md) — what the project is and what currently works.
- [docs/SETUP.md](docs/SETUP.md) — running it from a fresh clone. **Note the engine must be built (`npm run build -w @mtg-commander-sim/engine`) before the client/server/bot can resolve it** — a fresh clone has no `dist/`.
- [docs/TESTING.md](docs/TESTING.md) — running and writing tests, plus the four things that reliably trip people up (priority, mana pools, bot player order, resolving the stack).
- [docs/ADDING-CARDS.md](docs/ADDING-CARDS.md) — **read before touching `testCards.ts`.** Every card must be looked up in the Scryfall data first and represented exactly; never write a fixture from memory, and never approximate a card the effect DSL can't express.

## Collaboration note
This repo may be worked on simultaneously by multiple people. This file is meant to give any Claude Code session (yours or a collaborator's) full context on the project's intent and constraints without re-deriving them from scratch — keep it up to date as decisions change.

## Working rules for Claude sessions
These apply to anyone's session on this repo, not just one machine.

**Batch tool calls.** Every tool call re-sends the entire prior transcript, so
cost scales with the *number* of calls multiplied by how long the conversation
has got — not with how much each call does. A long push of small sequential
calls is the expensive shape. Chain related shell work into one call with `&&`
(build, test, commit and push together; an audit and the report it feeds
together), gather reference data in one pass and read it once rather than one
item per call, and put independent calls in the same message so they run in
parallel. This is not a licence to skip verification — the full suite and
typecheck still run before every commit, just chained into the same call.

**Work on a branch.** Cut a branch per unit of work (a decklist, a feature) off
current `main`, push it as work lands, and merge to `main` only once its scope
is finished *and* tested. Two people push here; straight-to-main means either
can be mid-edit on a file the other just rewrote, and the first sign is a
conflict.

**Fetch before starting.** `git fetch --all --prune` and read anything upstream
before doing any work — including before reading code to answer a question. Read
the incoming diff rather than trusting the commit message.

**Read Scryfall before any claim about a card.** What it does, whether it is
implemented, whether it is even a real card. Code comments are not a source. See
docs/ADDING-CARDS.md.

**A decklist gets a legality sweep first.** This sim exists to test *paper*
decks, so before any engine work is scoped, check every card for
`legalities.commander != "legal"` and for cards whose `games` array is
`["arena"]` only. The `A-` name prefix is not a reliable filter — some
Arena-only cards carry no prefix. Report those as a decklist problem to fix
rather than as work to do.
