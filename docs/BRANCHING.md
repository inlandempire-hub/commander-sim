# Branching and collaboration workflow

This repo is worked on by more than one person (and more than one Claude
session) at once. This file is the rule that keeps two people's work from
colliding. **Read it before starting a new deck or any branch.**

## Why this exists

The `felix-five-boots` merge (2026-08-24) collided on **32 files across the core
engine** — `effects.ts`, `casting.ts`, `combat.ts`, `types.ts`, `targeting.ts`,
and more — because two people grew the *engine* in parallel on long-lived
branches. Some of those collisions were silent: git auto-merged two versions of
the same function into two copies, which compiled but was wrong (a duplicated
combat-damage trigger, a doubled Phyrexian life payment). Merging it back took a
very long, careful pass.

Almost none of that had to happen. The fix is a rule about **which files a
branch is allowed to touch.**

## The rule

**A new-deck branch changes card *data* only. Engine changes go to `main`.**

Concretely, a deck branch (e.g. `deck/winter-chaos`) should touch only:

- `packages/engine/src/cards/testCards.ts` — **adding** new card fixtures
  (append new `export const`s; do not rewrite existing ones).
- `packages/engine/src/archetypes.ts` — registering the new deck.
- The deck's own new files: a lab-scenarios file, a `__tests__/*.test.ts` for
  the new cards, a decklist under `tools/scryfall-report/decks/`.
- `ROADMAP.md` — a section describing the deck.

It should **not** touch the shared engine core. Those files are:

```
types.ts   effects.ts   casting.ts   combat.ts   targeting.ts   counters.ts
mana.ts    abilities.ts amounts.ts   conditions.ts  turn.ts     stack.ts
state.ts   permanents.ts sba.ts      damage.ts    ward.ts       autoTap.ts
autoPass.ts  x.ts        demoGame.ts  (plus everything in packages/protocol,
packages/server, packages/bot, and the client's controllers/App/cardText)
```

If a deck only uses cards the engine already supports, this is easy: the whole
deck is data, and two people's data branches append to different card lists and
merge with no conflict.

## When a deck needs new engine capability

Real decks do surface engine gaps — a keyword, an effect, a trigger the DSL
can't yet express. When that happens:

1. **Land the engine change on `main` first**, as its own small, focused commit
   or PR — one capability at a time, with its test. Get it onto `main` and let
   the other person pull it.
2. **Then** build the deck on a branch on top of that, using the capability that
   is now already in `main`.

Do **not** bundle new engine features into the deck branch and carry both for
weeks. That is exactly what produced the 32-file collision: the engine work and
the deck work travelled together on a branch while `main`'s engine moved
underneath them.

If you are unsure whether a card needs new engine work, ask the report:

```bash
py -X utf8 tools/scryfall-report/deck_report.py tools/scryfall-report/decks/<deck>.txt
```

`IMPLEMENTED`/`ADDABLE` cards are pure data — safe on a deck branch. `BLOCKED`
cards whose reason is a real missing capability need the two-step above.

## Keep a deck branch short-lived

- **Rebase (or merge `main` in) often** — at least whenever `main` gains engine
  work you depend on. A branch that is a day behind merges cleanly; a branch
  that is three weeks behind is the hard case.
- **Append, don't reflow.** New card fixtures go at the end of `testCards.ts`,
  and new archetypes at the end of the `ARCHETYPES` array. Editing the middle of
  a file both people are appending to is what turns a clean append into a
  conflict.
- **Merge to `main` as soon as the deck is done and tested**, rather than
  letting it live on.

## One owner for the engine at a time

When two people genuinely need engine work in the same stretch, coordinate so
only one person is changing a given engine file at a time, and push those
changes to `main` in small pieces the other pulls promptly. The engine is the
shared foundation; the decks are the things built on top of it.

## Before any merge to `main`

The standard gate still applies (see [TESTING.md](TESTING.md)):

```bash
npx tsc -b                 # typecheck clean
npx vitest run             # full suite green
```

And after a large merge, do the two checks git will not do for you:

- **Scan for duplicate top-level declarations and duplicate `switch` cases** —
  git can auto-merge two versions of the same function or the same `case` into
  two copies without a conflict marker. They compile; they are still bugs.
- **Diff the card counts** the way the regression note describes, so a deck's
  cards did not silently drop in the merge.
