# Testing

Everything here assumes you've done the first-run steps in [SETUP.md](SETUP.md).

## Running the suite

```bash
npm test
```

Runs all 1,061 tests through Vitest. Takes about 4 seconds. Then:

```bash
npm run typecheck
```

`tsc -b` across every workspace. It prints nothing when it's happy. **Both must
be clean before any change is considered done** - the engine is a rules engine,
and a type error in it usually means a rule is wrong, not that a compiler is
being fussy.

Narrowing while you work:

```bash
npx vitest run packages/engine                 # one package
npx vitest run combat                          # files matching "combat"
npx vitest run -t "Trample"                    # tests whose name matches
npx vitest                                     # watch mode
```

## What each suite covers

Vitest only picks up `packages/*/src/**/*.test.ts` - note **`.ts`, not
`.tsx`**. Keep logic in plain `.ts` modules if you want it tested; the React
components deliberately hold almost none.

### Engine (`packages/engine/src/__tests__/`)

| File | Covers |
|---|---|
| `turn.test.ts` | Turn/phase/step progression, priority passing. |
| `casting.test.ts` | Paying mana, the stack, commander tax. |
| `combat.test.ts` | Attackers, blockers, damage, trample. |
| `keywords2.test.ts` | Deathtouch, lifelink, flying/reach, hexproof, menace, ward, flash. |
| `strikeAndGraveyard.test.ts` | First/double strike's extra damage step, graveyard recursion, tutors. |
| `counters.test.ts` | +1/+1 counters and landfall. |
| `commander.test.ts`, `commanders.test.ts` | Commander-format rules, and the two scripted commanders. |
| `deck.test.ts` | Deck validation - 100 cards, singleton, colour identity. |
| `control.test.ts` | Counterspells, card draw, temporary pump/shrink effects. |
| `widening.test.ts` | Destroy/exile, anthems, tokens, the attacks/dies triggers. |
| `landAndUncounterable.test.ts` | Land and permanent destruction, "can't be countered". |
| `autoPass.test.ts` | When the UI is allowed to pass priority for you. |
| `demoGame.test.ts` | The shipped demo decks actually build and are legal. |
| `cardLab.test.ts` | Every card lab scenario stands up and its card is playable from it. |

### Bot (`packages/bot/src/__tests__/`)

`decisions.test.ts` is the big one - each test puts the bot in a specific board
state and asserts the exact action it returns. `fullGame.test.ts` runs complete
bot-vs-bot games and asserts they terminate cleanly with no illegal actions and
no stalls; it's the slowest test in the suite (~3s) and the one most likely to
catch a subtle engine regression.

### Deck builder (`packages/client/src/deckbuilder/__tests__/`)

Covers the pure logic only: rules-text rendering, pool search and filtering,
deck edit operations, storage, legality, and text import/export. The React
components aren't tested directly - they're verified in the browser instead
(see below).

## Writing a test

The engine mutates `GameState` in place. So the pattern is: build a state, put
cards where you want them, run the thing, assert on the state afterwards.

```ts
import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance } from "../state.js";
import { castSpell } from "../casting.js";
import { resolveTopOfStack } from "../stack.js";

describe("Lightning Bolt", () => {
  it("kills a 3/3", () => {
    const state = makeTestGame();          // two players: alice, bob
    state.phase = "precombat-main";
    state.step = "main";
    const alice = state.players[0]!;
    const bob = state.players[1]!;

    const bears = createCardInstance(state, "grizzly-bears", bob.id, "battlefield");
    const bolt = createCardInstance(state, "lightning-bolt", alice.id, "hand");
    alice.manaPool = { R: 1 };

    castSpell(state, alice.id, bolt.instanceId, [
      { kind: "card", instanceId: bears.instanceId },
    ]);
    resolveTopOfStack(state);

    expect(bob.graveyard.some((c) => c.instanceId === bears.instanceId)).toBe(true);
  });
});
```

`createCardInstance` puts a real card from the pool into any zone directly, so
you never have to play a game up to the state you want to test.

### Four things that will trip you up

**1. Priority.** `castSpell` refuses to run if the caster doesn't hold priority.
If you get `"bob does not have priority"`, set `state.priorityPlayerIndex` to
that player's index first. When testing a response to a spell, set it to the
caster, cast, then move it to the responder.

**2. Mana.** Setting `manaPool` is exact, and generic costs eat coloured mana.
A `{1}{U}` spell paid from `{ U: 2 }` consumes both blue, and a later `{U}{U}`
spell then fails with "cannot afford". Reset `manaPool` explicitly before each
cast rather than assuming what's left.

**3. Player order in bot tests.** The bot's own test helpers build the player
list as `[bot, human]`, so the bot is index 0 - the opposite of the engine
tests' `[alice, bob]`. Read the helper at the top of the file before assuming.

**4. Nothing happens until the stack resolves.** `castSpell` only puts the spell
on the stack. Call `resolveTopOfStack` to make it do anything, and
`checkStateBasedActions` if you're asserting that something died.

## Verifying UI changes in the browser

The React components have no unit tests, so anything visible gets checked by
actually looking at it:

1. `npm run build -w @mtg-commander-sim/engine` if you touched engine code.
2. `npm run dev -w @mtg-commander-sim/client`, open the relevant URL from
   [SETUP.md](SETUP.md).
3. Check the browser console for errors, click through the change, confirm the
   DOM shows what you expect.

If you're doing this through Claude Code, its browser tools can drive the
preview directly - read the page, click things, read the console - which is
usually faster than describing what to look at.

## Card-pool regression testing

Changing anything about how cards are represented means re-auditing the whole
pool against Scryfall:

```bash
cd tools/scryfall-report
py -X utf8 audit_fixtures.py
```

That re-checks all 817 fixtures - name, cost, power/toughness, type line,
keywords, colour identity, Commander legality - against Scryfall's bulk data
and reports any that have drifted. It needs the bulk file, so run
`py fetch_bulk_data.py` first if `data/` is empty. Expect **zero** problems.

See [ADDING-CARDS.md](ADDING-CARDS.md) before changing the card pool itself.

## The card lab: playing every card by hand

```
http://localhost:5180/?mode=lab
```

93 boards, one per card in the Blech, Loafing Pest deck. Each one puts that card
in your hand with exactly the board its text needs around it - a creature with
counters to move, a graveyard to exile, an artifact to destroy, an opponent with
something worth sacrificing - and a checklist down the side saying what to try
and what should happen.

**It exists because the engine suite cannot answer the question it answers.** A
test proves an effect handler works when called, on a board the test placed
itself. It says nothing about whether the card can be found in a hand, paid for,
aimed, resolved, and *seen* to have happened. Every bug of that second kind
found in this project so far was found by hand: a targeted ability that went on
the stack with no targets, an anthem that rendered as an empty sentence, a
removal spell that skipped dies triggers. All three passed their unit tests.

Three things about it are deliberate:

- **You drive both seats.** Salty Mike is not a bot, and every hand is face up
  (see `revealAllHands` in App.tsx - the one caller that turns them over). Half
  this deck's text can only be exercised from the other side of the table:
  "whenever an opponent casts", "each opponent may sacrifice", anything that
  wants somebody to be attacking you.
- **Reset is part of the method.** Several cards have two branches that cannot
  both be reached in one turn - a land that enters tapped unless a condition
  holds, a modal spell, a "you may pay" with an "if you didn't" half. Those
  checklists say to reset and take the other line.
- **Nothing is random.** No shuffle, no mulligan, the same board every time you
  open the same card. A lab you cannot reproduce is not a lab.

Verdicts and notes are kept in localStorage, so you can stop and come back. The
index's **Show everything broken** button prints just the faults and their
notes - that list is the point of the whole exercise, and it is what to hand
over to get things fixed.

The scenarios live in `packages/engine/src/cardLabScenarios.ts` and the board
builder in `cardLab.ts`. `cardLab.test.ts` is what keeps them honest: it builds
every scenario, checks every card id it names exists, and asserts the card under
test is genuinely playable from the board it was handed - a land base written
before a fixture's cost was corrected would otherwise leave the card uncastable
and make the *engine* look broken.

## What good looks like before you call something done

- `npm test` - all green.
- `npm run typecheck` - silent.
- New behaviour has a test that fails without the change.
- Anything user-visible has actually been looked at in a browser.
- If the card pool changed, `audit_fixtures.py` reports no problems.
- `ROADMAP.md` updated if a phase or backlog item moved.

## The three audits

Each reads a different half of a card, and a card is only checked when all three
have run. Dump the fixtures first:

```
node -e "import('./packages/engine/dist/cards/testCards.js').then(m=>console.log(JSON.stringify(m.TEST_CARD_DEFINITIONS)))" > fixtures.json
```

| Tool | What it reads |
|---|---|
| `audit_fixtures.py` | Printed data - cost, power/toughness, type line, keywords, colour identity, legality |
| `audit_triggers.py` | Trigger events - is this the trigger the card actually has, watching the right thing |
| `audit_text.py` | Everything else the oracle text says |

`audit_text.py` takes each fixture's Oracle text, strips reminder text and every
sentence the engine demonstrably models, and reports what is left. Pass
`--deck mydeck.txt` to scope it to one decklist.

**It goes stale in one direction and that is the point.** Every new effect kind
in the engine is a sentence it cannot account for until it is taught, so a batch
of new engine work shows up as a pile of false positives on cards that are
perfectly correct - which is annoying but safe. The dangerous direction is a
pattern that is too loose: it silently swallows the sentence it was meant to
catch. Keep the patterns specific and tie each to the effect kind that actually
implements it, never to a word that happens to appear nearby.

When it reports something, read the card against Scryfall before believing
either answer. On 2026-08-12 it reported 27 cards in one deck; 26 were its own
blind spots from effects added since it was last taught, and one was real.
