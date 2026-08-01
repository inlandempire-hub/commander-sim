# Adding cards

Read this before touching `packages/engine/src/cards/testCards.ts`.

## The one rule that matters

**Every card in this simulator must be a real Magic card, represented exactly.
Never write a fixture from memory.**

Magic has tens of thousands of cards with very similar names, and a card you're
sure is a 2/2 for `{1}{G}` is often a 2/1 for `{G}{G}`. A wrong fixture doesn't
announce itself - it just quietly makes the game wrong, and it's nearly
impossible to spot later among 817 entries.

So, for every card, before writing anything:

1. Look up its actual entry in the cached Scryfall bulk data.
2. Copy the name, mana cost, type line, subtypes, power/toughness, keywords and
   colour identity from that entry.
3. If the card isn't in the data, **stop**. It either doesn't exist or isn't
   Commander-legal, and either way it doesn't go in.

If someone names a card, assume it's real and go look it up. If it isn't there,
say so rather than inventing something plausible.

## The other rule: exact or not at all

If the engine's effect DSL cannot express a card's rules text *exactly*, the
card doesn't go in. Not a close approximation, not "the important half".

A fixture that silently drops part of a card is worse than not having the card:
the game will let you cast it and then do the wrong thing, and every test you
write around it bakes in the mistake. The card pool is deliberately small and
correct rather than large and approximate.

## Tiers

From [CLAUDE.md](../CLAUDE.md):

1. **Vanilla/simple** - stats plus known keywords. Pure data, no code.
2. **Scripted** - ETB triggers, targeted effects, activated abilities. Expressed
   through the effect DSL in `packages/engine/src/types.ts`.
3. **Weird** - layer interactions, unusual replacement effects, bespoke text.
   Hand-written hooks, one at a time, only when actually needed.

Tiers 1 and 2 are the routine work. Tier 3 is a decision, not a chore - if a
card needs it, that's a conversation about whether the engine should grow that
capability at all.

## The generator does the transcription for you

`tools/scryfall-report/gen_fixtures.py` reads the Scryfall bulk data and emits
ready-to-paste TypeScript fixtures. It refuses any card carrying text the DSL
can't express, rather than approximating it - which is exactly the rule above,
enforced mechanically instead of by hand.

```bash
cd tools/scryfall-report
py -X utf8 gen_fixtures.py B 45          # 45 mono-black creatures
py -X utf8 gen_fixtures.py --spells U 20 # 20 mono-blue instants/sorceries
py -X utf8 gen_fixtures.py --commanders R
```

Prefer this over writing fixtures by hand. Hand-writing is for the handful of
cards the generator can't emit but that are worth the bespoke effort - and those
still get looked up first.

If the generator skips a card you wanted, that's information: it means the
engine can't do something. Widening the DSL is a deliberate change to
`types.ts`, `effects.ts` and the generator together, plus tests - see how the
existing effect kinds are handled and follow the same shape.

## Then audit

After any change to the pool, re-check everything against Scryfall:

```bash
# from the repo root
npm run build -w @mtg-commander-sim/engine
node -e "import('./packages/engine/dist/cards/testCards.js').then(m=>console.log(JSON.stringify(m.TEST_CARD_DEFINITIONS)))" > fixtures.json
cd tools/scryfall-report
py -X utf8 audit_fixtures.py ../../fixtures.json
```

It re-verifies every fixture's name, cost, power/toughness, type line, keywords,
colour identity and Commander legality. A name that isn't in Scryfall's data is
a hard error - the card isn't real.

**Expect zero problems.** If it reports any, fix the fixture, not the audit.

Delete `fixtures.json` afterwards; it's a scratch file.

## Checklist

- [ ] Every card looked up in the Scryfall data first.
- [ ] Nothing approximated - exact, or left out.
- [ ] Fixture added to `testCards.ts` **and** to the `TEST_CARD_DEFINITIONS`
      registry array at the bottom of that file. Missing the registry is the
      classic mistake; the card simply won't exist.
- [ ] `npm test` and `npm run typecheck` clean.
- [ ] `audit_fixtures.py` reports no problems.
- [ ] If the card went into an archetype deck in `archetypes.ts`, the deck still
      totals 99 non-commander cards.
- [ ] `ROADMAP.md` updated with what was added and why.
