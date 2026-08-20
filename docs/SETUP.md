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

Every test should pass and the typecheck should print nothing.

## Playing it

```bash
npm run dev -w @mtg-commander-sim/client
```

That serves the app at <http://localhost:5180>. Which mode you get depends on
the URL:

| URL | What you get |
|---|---|
| `http://localhost:5180/` | You against the bot, demo decks. |
| `?deck=red&vs=blue` | You play red, the bot plays blue. |
| `?mydeck=<id>` | You play a deck you built in the deck builder. |
| `?seat=mike` | Swaps which of the two seats is yours. |
| `?delay=1500` | Slows the bot down (default 800ms between its actions). |
| `?mode=deck` | The deck builder. |
| `?mode=fonts` | The font lab - choose the type on the buttons and the combat banner. |
| `?mode=lab` | The card lab - every card in the Blech and Winota decks on a board built for it, with a checklist. Add `&deck=<slug>&card=<id>` for one board. See TESTING.md. |
| `?mode=network&seat=donny` | Join a networked game as Deadly Donny. |

Deck names are matched loosely, so `deck=white` and `deck=Radiant` both work.

There are two modes and only two: against the bot, or against a person over the
network. Hotseat - two people on one screen - was removed on 2026-08-06. Magic
is a hidden-information game and one screen has one pair of eyes on it, so
either both hands are face up and neither player can play honestly, or the
screen gets handed over and re-hidden every turn.

The card lab (`?mode=lab`) does drive both seats from one screen with every hand
face up, and that is not hotseat coming back: it is not a game. It is one board
per card with no opponent to be honest towards, and it exists so a card's whole
text can be exercised - including the half that needs an opponent to be doing
something. See [TESTING.md](TESTING.md).

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

## Card backs and mana symbols (optional)

The library pile and the opponent's hand show a real card back, and mana costs
are drawn as printed symbols rather than as `{3}{B}{B}`. Both sets of images are
Wizards' artwork and so are not in the repo, for the same reason the Scryfall
data above isn't. The client works without either - it draws a plain blue-grey
card back, and falls back to the braces text for costs - but if you want the
real ones, put them here:

```
packages/client/public/card-backs/light.png   # the near seat, i.e. you
packages/client/public/card-backs/dark.png    # the far seat, i.e. the bot

packages/client/public/mana/w.png             # the five colours, lower case
packages/client/public/mana/u.png
packages/client/public/mana/b.png
packages/client/public/mana/r.png
packages/client/public/mana/g.png
packages/client/public/mana/0.png             # generic, 0 through 20
packages/client/public/mana/1.png
...
packages/client/public/mana/20.png
```

Any size will do. Card backs display about 46px wide, so anything above 300px
across is wasted bytes; `object-fit: cover` crops them to 5:7, so a back with a
printed border loses a pixel or two of it. Mana pips display between 11px and
20px and want to be square.

The costs are all-or-nothing per card: if any one symbol fails to load, that
cost falls back to the braces text in full, because a cost that is half pips and
half text cannot be read.

## Fonts (optional)

`?mode=fonts` opens the font lab, which sets the type on the Pass/Concede
buttons and on the combat banner. It reads `packages/client/public/fonts/`,
which is gitignored for the same reason as everything else above - the fonts
came with a mix of OFL and 1001fonts personal-use terms, and whether a given one
can be committed is a question for the font that actually gets chosen. To
rebuild that folder from a `fonts/` directory of downloads, the layout it
expects is one folder per family with `regular` / `medium` / `semibold` / `bold`
and optional `-italic` variants; `packages/client/src/fontCatalogue.ts` is the
list, and adding a family means adding an entry there.

With the folder missing, every family falls back to the system stack and the
lab still runs - it just has nothing interesting to show.

## Sound

The sound effects **are** committed, unlike everything else on this page. They
are Kenney's Casino Audio pack, CC0 (public domain), which is ours to
redistribute - see `packages/client/public/sfx/LICENSE.txt`. Real card foley:
placing, sliding, shuffling, plus chips for mana and life.

Combat is the gap. The pack has no impacts, so damage borrows a poker-chip
clack and attacking has no cue at all. Kenney's RPG Audio pack (also CC0) would
fill both; the manifest to add them to is `SAMPLES` in
`packages/client/src/sound.ts`.

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
