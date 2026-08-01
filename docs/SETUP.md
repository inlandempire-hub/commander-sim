# Setup

Getting the simulator running from a fresh clone.

## What you need

| Tool | Version | Needed for |
|---|---|---|
| Node.js | 20 or newer | Everything. Includes npm. |
| Git | any recent | Cloning. |
| Python | 3.10 or newer | Only the card-pool tooling in `tools/scryfall-report`. Skip it if you're not adding cards. |

Check what you have:

```bash
node --version
npm --version
```

## First run

```bash
git clone <this repo>
cd mtg-commander-sim
npm install
```

`npm install` at the root installs every workspace at once - do not run it
inside `packages/*`.

Then build the engine before anything else:

```bash
npm run build -w @mtg-commander-sim/engine
```

**This step is not optional, and it is the single most common thing to get
wrong.** The client, server and bot all consume the engine through its compiled
output in `packages/engine/dist`, not its TypeScript source. A fresh clone has
no `dist/`, so without this the client fails to resolve the engine at all.
Whenever you change engine code, build it again before reloading whatever is
consuming it. See the "Tech stack" section of [CLAUDE.md](../CLAUDE.md) for why
it works this way - an earlier version aliased straight to source and silently
ran stale code for 45 minutes.

Now confirm everything is sound:

```bash
npm test
npm run typecheck
```

235 tests should pass and the typecheck should print nothing.

## Playing it

```bash
npm run dev -w @mtg-commander-sim/client
```

That serves the app at <http://localhost:5180>. Which mode you get depends on
the URL:

| URL | What you get |
|---|---|
| `http://localhost:5180/` | Hotseat with the demo decks - both seats on one screen. |
| `?deck=white&vs=green` | Hotseat with two of the five archetype decks. |
| `?mode=bot&deck=red&vs=blue` | You play red, the bot plays blue. |
| `?mode=bot&mydeck=<id>` | You play a deck you built in the deck builder. |
| `?mode=deck` | The deck builder. |
| `?mode=network&seat=donny` | Join a networked game as Deadly Donny. |

Deck names are matched loosely, so `deck=white` and `deck=Radiant` both work.

### Networked play

Two terminals. First:

```bash
npm run dev -w @mtg-commander-sim/server
```

That listens on `ws://localhost:8787`. Then start the client as above, and open
`?mode=network&seat=donny` in one browser window and `?mode=network&seat=mike`
in another. One game at a time, no lobby.

The server is authoritative: it decides who a connection is allowed to act as
based on the seat it joined as, and never trusts a client-supplied identity.

### Watching the bot play itself

```bash
npm run watch -w @mtg-commander-sim/bot
```

Runs headless games and prints what happened - the fastest way to see whether
an engine change broke something subtle.

## The Python tooling (optional)

Only needed if you're adding cards. See
[ADDING-CARDS.md](ADDING-CARDS.md) for what these scripts actually do.

```bash
pip install pandas openpyxl
cd tools/scryfall-report
py fetch_bulk_data.py     # downloads Scryfall's bulk file to ./data/ (~24MB, gitignored)
py build_report.py        # writes ./output/commander_card_report.xlsx
```

On Windows, run Python as `py -X utf8 script.py`. Without `-X utf8` the scripts
crash on card names containing accented characters, because the default Windows
console encoding cannot represent them.

`data/` and `output/` are gitignored on purpose - that's Scryfall's data, not
ours to redistribute, and it regenerates in one command.

## Common problems

**The client shows a blank page or fails to resolve `@mtg-commander-sim/engine`.**
You skipped `npm run build -w @mtg-commander-sim/engine`, or you changed engine
code and didn't rebuild.

**Engine changes don't show up in the browser.** Same thing. Rebuild the engine,
then reload the page.

**`npm run build` at the root says "Missing script: build".** There isn't one.
The root only has `test` and `typecheck`; builds are per-workspace
(`npm run build -w @mtg-commander-sim/engine`).

**Port 5180 is already in use.** Another copy is already running - just open the
browser at it. Change the port in `packages/client/vite.config.ts` if you really
need two.

**A script that checks whether the dev server is up says it isn't, but the
browser works fine.** Vite binds to the IPv6 loopback `[::1]` only. A check
against `127.0.0.1` will never see it. Request the page over `localhost` rather
than poking the port.
