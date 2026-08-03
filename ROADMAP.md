# Roadmap

Status tracker for build phases. See CLAUDE.md for the project's full context, scope, and architecture rationale. Update this file as phases complete or plans change — this is the living backlog, CLAUDE.md is the stable context.

## Phase 1 — Rules engine core (headless, no UI) — DONE (2026-07-30)
- [x] Turn structure (untap/upkeep/draw/main1/combat steps/main2/end/cleanup)
- [x] Priority passing, the stack
- [x] Mana payment, casting costs, commander tax
- [x] State-based actions (checked continuously)
- [x] Triggered-ability queue (permanents' ETB triggers go on the stack on resolution)
- [x] Targeting legality (any-target/creature/player/opponent selectors, validated at cast time)
- [x] Commander-specific rules: command zone, commander replacement effect, 40 starting life, commander damage tracking (21+ from one commander)
- [x] Test harness: 8 hand-picked real cards, 17 headless vitest assertions across turn structure, casting, commander mechanics, and deck validation
- [x] A minimal but fully commander-legal 100-card test deck to validate deckbuilding rules (singleton, color identity)

Lives in `packages/engine` (`@mtg-commander-sim/engine`), no UI or networking dependencies. Run `npm test` (vitest) and `npx tsc -b` (typecheck) from the repo root — both are clean.

**Known Phase 1 simplifications** (intentional, revisit later — see comments in source for exact locations):
- No "skip your first draw step" rule, no discard-to-hand-size in cleanup.
- Mana pools empty once per turn (cleanup) rather than after every step/phase.
- Combat is simplified to one blocker per attacker; no first strike/double strike/deathtouch damage-step interactions yet.
- Continuous-effect layers aren't modeled - fine for the current vanilla/simple-keyword cards, will need real work for cards with layer-dependent effects.
- The commander replacement effect (move to command zone on death) is always taken automatically; the real rule makes it an optional choice for the owner - needs a decision-prompt hook once a client/UI exists.
- No library shuffling - deck setup takes `libraryIds` in the order given; callers should shuffle before calling `setUpCommanderDeck` if randomness matters.
- Test card set (`packages/engine/src/cards/testCards.ts`) is entirely real cards, every one transcribed from the cached Scryfall bulk data and re-checkable with `tools/scryfall-report/audit_fixtures.py`. It originally contained two invented "test commander" placeholders; those were replaced with real legendary creatures on 2026-07-30 (see "Card data correctness audit").

## Phase 2 — Minimal local UI — DONE (2026-07-30)
- [x] Render game state (battlefield, hand, command zone, stack, life, commander damage)
- [x] Hotseat play (one machine, two seats) to validate the engine visually
- [x] Basic zone-to-zone animation (draw, cast, attack) — doesn't need to be polished yet

Lives in `packages/client` (`@mtg-commander-sim/client`), React + TypeScript + Vite + Framer Motion. Run it with `npm run dev -w @mtg-commander-sim/client` from the repo root (or via the `mtg-commander-sim-client` entry in the shared `.claude/launch.json` at the `Code Projects` root), then open http://localhost:5180.

What it does: two hotseat seats ("Deadly Donny" and "Salty Mike") on one screen, built from the engine's Scryfall-sourced test-card fixtures (a full deck builder over the whole card pool is Phase 5). Click a hand card to cast/play it, click a battlefield land/creature to tap it for mana, click your own creatures during declare-attackers to select attackers + confirm, click a defending creature then an attacker during declare-blockers to assign blocks, click a player's life total to target them with a damage spell. Illegal actions (wrong phase, insufficient mana, etc.) surface as a dismissable error banner instead of crashing. Cards share a Framer Motion `layoutId` per card instance, so moving between zones (hand/battlefield/stack/graveyard/command) animates automatically.

**Bugs found and fixed during this phase** (both now covered by engine regression tests):
- Summoning sickness was incorrectly blocking lands from being tapped for mana the turn they were played - that rule only applies to creatures. Fixed in `packages/engine/src/abilities.ts`.
- The Defender keyword wasn't enforced - a creature with Defender could illegally be declared as an attacker. Fixed in `packages/engine/src/combat.ts`.
- **Bigger one:** the client's dev server aliased Vite straight to engine *source* for convenience. Vite doesn't auto-resolve the engine's internal `"./x.js"` relative imports to their `.ts` siblings, and silently fell back to stale compiled `.js`/`.d.ts` files that a broken `tsc -b` run had accidentally dumped into `packages/engine/src` earlier in the session - meaning the client was quietly running 45+ minutes of stale engine code without any error. Fixed by removing the source alias entirely and switching the client to consume the engine via its built dist (`npm run build -w @mtg-commander-sim/engine`), the standard/robust way workspace packages should depend on each other. See the note in CLAUDE.md's Tech Stack section. **Practical consequence: after changing engine code, rebuild the engine before testing in the client, or your changes won't show up.**

**Card pool grown from 9 to 20 cards** (see `packages/engine/src/cards/testCards.ts`): added Elvish Mystic, Runeclaw Bear, Elvish Warrior, Giant Spider, Craw Wurm, Wall of Wood (green), and Shock, Raging Goblin, Hill Giant, Incinerate, Lava Axe (red) - all real, accurately-represented cards using the existing effect DSL. Deadly Donny's and Salty Mike's decks were rebuilt to use every color-identity-legal nonland card as a single, maximizing hand variety given singleton rules (only basics can repeat). Land counts are still forced high (84/99 and 93/99 respectively) because a textbook ~38-land ratio needs ~60 distinct spells per identity - that's ongoing card-pool-growth work, not a Phase 2 task.

**Verified this session:** turn/phase/step progression, priority passing, drawing, playing a land, tapping it for mana, illegal-action error handling, zone movement, and the new cards/decks/dist-based build all interactively through the browser preview after the dist-resolution fix. Not interactively exercised in-browser (opening hands didn't reach a 2-mana turn or a creature to attack with) but covered by the engine test suite using the identical UI handler code: casting a multi-mana spell, ETB triggers, and the attacker/blocker declaration flow. Worth a manual pass before you consider Phase 2 fully battle-tested.

**Known Phase 2 simplifications:**
- No persistence - reloading the page starts a brand new random game.
- Cards aren't keyboard/screen-reader accessible yet (div+onClick, no role/tabIndex) - fine for a personal dev tool, would need fixing before this is anyone else's problem.
- No visual indication of *which* targets are legal while a spell is pending - you just click and the engine validates.
- Mana pool is shown as a flat summary string, not broken out per-color visually.
- Land ratio in both decks is still much higher than a real Commander deck's ~38/99 - see "Card pool grown" note above.

## Phase 3 — Networking (2-player) — DONE (2026-07-30)
- [x] WebSocket server holding authoritative state
- [x] Per-client filtered view (hidden zones redacted)
- [x] Shared action API (play card, declare attacker/blocker, respond to stack, choose target)
- [x] Two real clients playing a full game against each other

Two new packages:
- `packages/protocol` (`@mtg-commander-sim/protocol`) - shared `ClientMessage`/`ServerMessage` types and `filterGameStateForViewer()`, which redacts a player's hand/library into "Hidden Card" placeholders for every other viewer. Depended on by both server and client.
- `packages/server` (`@mtg-commander-sim/server`) - a `ws`-based Node server. One game at a time, two named seats (`?seat=donny` / `?seat=mike` on connection, mapped to Deadly Donny/Salty Mike). Holds the single real `GameState`; every client message is dispatched through the exact same engine functions the local hotseat client already used (`playLand`, `castSpell`, `activateAbility`, `declareAttackers`, `declareBlockers`, `passPriority`), then the resulting state is re-broadcast to both connections, filtered per-viewer. Run with `npm run dev -w @mtg-commander-sim/server` (listens on `ws://localhost:8787`).

Client changes: `App.tsx` no longer talks to the engine directly - it depends on a `GameController` interface (`packages/client/src/gameController.ts`) with two implementations: `useLocalGameController` (today's hotseat mode, mutates one local `GameState`) and `useNetworkGameController` (sends messages over the WebSocket, updates `state` only when the server broadcasts back). Pick the mode via URL: default is hotseat; `?mode=network&seat=donny` or `?mode=network&seat=mike` (each in its own browser tab/window) joins the networked game. The **server** decides who a connection is allowed to act as (from the seat it joined as) - it never trusts a client-supplied player identity, and the engine's own validation (e.g. "does this player have priority") is enforced regardless of transport, so one tab genuinely cannot act on the other seat's behalf.

**Verified this session:** two browser tabs, one per seat, playing through several real turn transitions (untap → upkeep → draw → main) with live sync; confirmed hidden-info filtering both directions (each tab sees its own hand for real, the opponent's hand as 7 "Hidden Card" placeholders); confirmed a public action (playing a land) on one tab immediately shows up on the other tab's view; confirmed the server rejects a tab trying to pass priority when it isn't that seat's turn.

**Known Phase 3 simplifications:**
- One game at a time, no lobby/matchmaking - if you want a second concurrent game you'd need a second server process/port for now.
- No reconnection/resume state beyond "the seat becomes available again when its socket closes" - closing a tab mid-game and rejoining continues the same game, but there's no replay of missed actions if the server restarted (the whole game lives in memory, so a server restart loses the game).
- No spectators, no chat, no lobby UI for picking a seat - you edit the URL by hand.
- The bot (Phase 4) will plug into the exact same server/action-API shape as a third kind of "client" - no rework anticipated there per CLAUDE.md's architecture.

## Phase 4 — Bot
- [x] Heuristic bot (efficient mana use, attack when favorable, block to survive) — no full game-tree search — DONE (2026-07-31), see "Heuristic bot" below
- [x] A handful of pre-built archetype decks, picked at random per game — DONE (2026-07-31), now **five** decks in `packages/engine/src/archetypes.ts`, one per colour. Control (Tidewall, mono-blue) arrived once the engine got counterspells and card draw — see "Spells, counterspells, and a control deck" below.
- [x] Bot connects through the same client action API as a human — DONE (2026-07-31), both in-browser and as a standalone WebSocket process

## Phase 5 — Deck builder — DONE (2026-07-31)
- [x] Search/filter card database (via Scryfall data)
- [x] Build/save/tag multiple decks
- [x] Swap-card-in/out workflow
- [x] Distinguish "implemented in engine" vs. "real card exists" when building

See "Deck builder" below.

## Phase 6 — Polish
- [x] Smoother animations - DONE (2026-08-02). Cards travel between zones, tap, lunge into combat and flinch when damaged; see "Motion: cards that travel" below.
- [x] Card art via Scryfall images - DONE (2026-08-01), see "Card art" below.
- [ ] UI pass so it reads as a real digital card game - **in progress, roughly 5/10** against the agreed scale (0 = where this started, 10 = MTG Arena). Still to come for 5-7: cards fanning/overlapping instead of a scrollbar when a row is crowded, spells resolving with a flourish, and a real damage-prevention shield so Healing Salve's second mode stops being an approximation.
- [x] Auto-skip priority passes when there's nothing meaningful to do - DONE (2026-07-30). See "Auto-pass + turn-sequence rules fixes" below.

## Ongoing (never "done")
- [ ] Expand the implemented card pool, one card (or small batch) at a time, classified as vanilla/scripted/weird (see CLAUDE.md). **Use `tools/scryfall-report/output/commander_card_report.xlsx` to pick batches** (see below) instead of browsing the card pool ad hoc.
- [x] Target: ~50 basic lands per deck - DONE (2026-07-30), see "Mono-color rebuild" below. Land counts dropped from 84/99 and 93/99 to 44/99 and 47/99. Still above a textbook ~38/99; revisit again once each color's nonland pool grows further.
- [ ] Revisit continuous-effect layers as cards demand more precise handling
- [ ] Decide later whether to support 3-4 player pod Commander (engine core should already be player-count-agnostic per CLAUDE.md)
- [ ] Decide later whether to support additional formats beyond Commander
- [ ] **First Strike / Double Strike** - needs a real extra combat-damage sub-step (only inserted into the turn sequence when at least one combatant has it), not just a flag check. Bigger structural change than Menace/Ward/Flash, which are all done (see "Flash, Menace, Ward" below) - deferred until asked for.
- [x] **Menace** - DONE (2026-07-30). See "Flash, Menace, Ward" below - `dealCombatDamage` now handles any number of blockers per attacker.
- [x] **Ward** - DONE (2026-07-30), with a documented simplification (auto-pay from floating mana only, no opt-out choice). See "Flash, Menace, Ward" below.
- [ ] **MTGA-style opt-in auto-pass preferences** ("stop for combat tricks", "never stop unless lethal", etc.) - a player choosing not to be asked even when a real decision exists. Explicitly different from the forced auto-pass shipped 2026-07-30 (that only ever skips when nothing is possible); this is a settings/preference layer on top, deferred until later per the user.

## Keyword mechanics batch (2026-07-30)

Implemented generically in the engine so any card that declares the keyword gets the behavior with zero per-card scripting:
- **Deathtouch** - any nonzero damage from a Deathtouch source is lethal regardless of amount. Tracked via a new `CardInstance.deathtouchDamage` flag (reset on zone change and at cleanup, alongside `damageMarked`), checked in `sba.ts`'s lethal-damage state-based action.
- **Lifelink** - gains the source's controller life equal to any damage it deals. Implemented in both `combat.ts` (combat damage) and `effects.ts`'s generic damage effect (so it also works for a hypothetical damage-dealing spell/ability with Lifelink, not just combat), which needed `applyEffect` to take the source's instance id so it can look up the source's own keywords - updated both call sites (`stack.ts`, `abilities.ts`).
- **Flying / Reach** - `declareBlockers` now rejects a blocker without Flying or Reach against a Flying attacker.
- **Trample** - only the damage needed to be lethal to the blocker gets assigned to it (respecting Deathtouch's "1 damage is lethal" rule); the rest spills to the defending player and still counts toward the commander-damage state-based loss condition if the attacker is a commander.
- **Hexproof** - `targeting.ts` rejects targeting a Hexproof permanent with any spell/ability controlled by anyone other than its own controller (your own spells can still target your own Hexproof things).

4 new real card fixtures added to exercise these in tests: Wind Drake (Flying), Typhoid Rats (Deathtouch), Child of Night (Lifelink), Gladecover Scout (Hexproof) - alongside the existing Giant Spider (Reach) and Hulk, Bruce Banner (Trample). 8 new tests, 26 total, all passing; full workspace typecheck clean. Not yet added to the actual Deadly Donny/Salty Mike decks - that's the "50 lands per deck" item above.

## Auto-pass + turn-sequence rules fixes (2026-07-30)

Two real MTG rules corrections to the turn sequence, plus the general auto-pass UX feature, all built together since they compound:

- **Untap and cleanup never give a player priority** (a real rule, not a heuristic) - `turn.ts`'s `advanceStep` now transparently cascades through both instead of requiring a manual pass-pair for each. A turn with no attacks now needs priority passed only 9 times (upkeep, draw, both mains, begin-combat, end-combat, end, plus one to enter the cascade) instead of marching through all 12 steps individually.
- **Zero declared attackers skips declare-blockers and combat-damage entirely**, landing straight on end-combat - also a real rule, not a "nobody had anything to do" heuristic. Same `advanceStep` cascade mechanism handles both fixes uniformly (`shouldSkipCurrentStep` in `turn.ts`).
- **General auto-pass**: new `packages/engine/src/autoPass.ts` exports `hasAnyLegalAction` (any affordable instant/non-mana ability at any time; sorcery-speed cards, an unplayed land, or a commander cast from the command zone only during the player's own main phase with an empty stack - using a new `potentialAvailableMana` that accounts for untapped mana sources, not just what's floating in the pool, since floating mana is usually zero between actions), `hasEligibleAttacker`, `hasEligibleBlocker`, and `shouldAutoPass` combining them per step. The client's `App.tsx` runs this in a `useEffect` and auto-invokes `passPriority` whenever it's true for a seat this client controls (`GameController.canControlPlayer` - always true in hotseat, only your own seat over the network, so one browser tab can never auto-pass on the other player's behalf).
- Verified live in the hotseat client: a fresh page load auto-cascades through untap/upkeep/draw and lands right at the first real decision (a main phase with cards in hand); a single "Pass Priority" click with nothing to attack with correctly sails through all of combat and lands at the next main phase.
- Explicitly deferred (see "Ongoing" above): the MTGA-style *opt-in* preference to skip a real decision on purpose - this batch only ever skips when nothing is possible.

19 engine tests added/rewritten (12 new in `autoPass.test.ts`, 3 rewritten in `turn.test.ts` to match the new pass-pair counts), 40 total, all passing; full workspace typecheck clean.

## Mono-color deck rebuild + land-ratio fix (2026-07-30)

Deadly Donny and Salty Mike switched from a Gruul/mono-red split to **mono-white (Donny)** and **mono-green (Mike)**, and each color's nonland card pool was grown enough to hit the "~50 lands" target: land counts dropped from 84/99 and 93/99 to **44/99 (white) and 47/99 (green)**.

- **96 new real card fixtures** added to `packages/engine/src/cards/testCards.ts` (42 green, 54 white - see full lists below), plus a new basic **Plains** fixture (only Mountain/Forest existed before). All sourced directly from Scryfall's cached bulk data via two new one-off scripts in `tools/scryfall-report/` (`filter_candidates.py`, `dump_chosen.py`) rather than recalled from memory, so every name/cost/power/toughness/keyword is authoritative, not misremembered. All are vanilla or keyword-only (tier `"vanilla"`), plus 4 simple scripted spells (2 per color) using the existing damage/gainLife effect DSL.
- Two new commanders named by the user: Deadly Donny's **Agent Phil Coulson** and Salty Mike's **Tifa Lockhart**. (These were initially coded from invented abilities on the mistaken assumption they were flavor names rather than real cards - both are real, and both were corrected from their Scryfall entries; see "Card data correctness audit" below.)
- New `demoGame.test.ts`: validates both decks are legal 100-card singleton Commander decks (`validateCommanderDeck`) and that `createDemoGame()` deals a correct 7-card opening hand and full 100-card deck to each player.
- **Verified live in the hotseat client** (after rebuilding the engine dist): played lands, tapped mana, cast new creatures (Yoked Ox, Ankle Biter) from both new pools, confirmed turn/auto-pass cascading still works with the new decks, declared an attacker and a blocker, and confirmed Deathtouch works correctly on a brand-new fixture - Ankle Biter (1/1 Deathtouch) killed Yoked Ox (0/4) in one combat step.
- 3 new tests (`demoGame.test.ts`), 43 total, all passing; full workspace typecheck clean.

**Full list of cards added, by deck:**

*Salty Mike (mono-green), 42 new cards:* Willow Elf, Norwood Ranger, Trained Jackal, Ankle Biter (Deathtouch), Charging Badger (Trample), Balduvian Bears, Bear Cub, Cylian Elf, Forest Bear, Kalonian Tusker, Swordwise Centaur, Terrain Elemental, Jibbirik Omnivore, Moon Sprite (Flying), Pygmy Razorback (Trample), Willow Faerie (Flying), Underdark Basilisk (Deathtouch), Alpine Grizzly, Centaur Courser, Colossodon Yearling, Gorilla Warrior, Harrier Naga, Murasa Brute, Nessian Courser, Spined Karok, Sporecap Spider (Reach), Hitchclaw Recluse (Reach), Mosscoat Goriak (Vigilance), Wary Okapi (Vigilance), Woodland Patrol (Vigilance), Leatherback Baloth, Axebane Beast, Broodhunter Wurm, Golden Bear, Nettle Swine, Wild Elephant (Trample), Order of the Sacred Bell, Rowan Treefolk, Rumbling Baloth, Wild Ceratok, Hornet Sting (instant, 1 damage to any target), Nourish (instant, gain 6 life).

*Deadly Donny (mono-white), 54 new cards:* Devoted Hero, Eager Cadet, Elite Vanguard, Expedition Envoy, Isamaru Hound of Konda (Legendary), Kitesail Scout (Flying), Lantern Kami (Flying), Rustwing Falcon (Flying), Savannah Lions, Staunch Shieldmate, Suntail Hawk (Flying), Tasseled Dromedary, Valiant Guard, Volunteer Militia, Yoked Ox, Ageless Guardian, Alabaster Host Sanctifier (Lifelink), Alaborn Grenadier (Vigilance), Armored Warhorse, Blade of the Sixth Pride, Cliffhaven Sell-Sword, Concordia Pegasus (Flying), Dromoka Warrior, Fortified Rampart (Defender), Fresh Volunteers, Glory Seeker, Knight Errant, Knight of New Benalia, Kyoshi Warrior Guard, Leonin Skyhunter (Flying), Makindi Aeronaut (Flying), Maned Serval (Vigilance), Mistral Charger (Flying), Prowling Caracal, Royal Falcon (Flying), Silvercoat Lion, Skyblade of the Legion (Flying), Squire, Steadfast Paladin (Lifelink), Stormfront Pegasus (Flying), Story Seeker (Lifelink), Territorial Roc (Flying), Thraben Valiant (Vigilance), Traveling Philosopher, Chapel Geist (Flying), Dawn Gryff (Flying), Standing Troops (Vigilance), Wild Griffin (Flying), Assault Griffin (Flying), Ardent Militia (Vigilance), Iron Tusk Elephant (Trample), Venerable Lammasu (Flying), Chaplain's Blessing (sorcery, gain 5 life), Angel's Mercy (instant, gain 7 life).

Plus a new basic **Plains** fixture (`packages/engine/src/cards/testCards.ts`) to support the mono-white deck.

## Commander abilities: Tifa Lockhart + Agent Phil Coulson (2026-07-30)

**This section originally documented invented abilities and has been rewritten.** Both
commanders were given homebrew abilities on the false assumption that they were flavor
names rather than real cards. They are real cards, they were in the cached Scryfall
bulk data the whole time, and the data was never consulted. See "Card data correctness
audit" below for the correction and the process change.

What survives from that batch, because it was a genuine engine/client improvement
independent of the card data:

- **Client fix:** `App.tsx` previously only wired target-selection UI (`pendingTarget`) for *cast spells* with a damage effect - clicking a permanent's activated ability always activated it immediately with zero targets, so a damage-effect activated ability would have silently done nothing (`targets: []`). Generalized `pendingTarget` to carry a `kind: "cast" | "ability"` (+ `abilityIndex`) so activating a damage-effect ability now prompts "Choose a target for X" exactly like casting a spell does, then routes the chosen target to `activateAbility` instead of `castSpell`.

## +1/+1 counters + Landfall (2026-07-30)

Two new generic mechanics. (Requested alongside the commander work above; the specific
abilities they were first attached to were wrong, but the mechanics themselves are
correct and are what the real cards actually need.)

- **+1/+1 counters**: `CardInstance.plusOneCounters` (reset to 0 on any zone change, per the real "new object" rule). New effect kind `{ kind: "addCounter"; amount }` - puts counters on an explicit target, or on the effect's own source if no target is given. New `counters.ts` exports `effectivePower`/`effectiveToughness`; `combat.ts` (attacker/blocker power, Trample's lethal-toughness math) and `sba.ts` (the lethal-damage check) now read through these instead of raw `CardDefinition.power`/`toughness`, so a buffed creature hits harder and survives more damage exactly as it should. `CardView.tsx` shows the effective P/T plus a `(+N)` badge.
- **Landfall**: new `TriggeredAbility` event `"landfall"`. Since lands don't use the stack (a real rules quirk, already true of this engine), it's checked directly in `casting.ts`'s `playLand`: after the land resolves, every permanent the player controls with a `landfall` trigger fires (scoped to "lands entering under **your** control," matching the real rule).
- **Deliberately avoided a second activated ability on either commander**: `App.tsx` only knows how to prompt for a target for a single activated ability per permanent (`activatedAbilities[0]`). If a future card genuinely needs 2+ player-facing activated abilities, an ability chooser is the actual prerequisite.

### Correction on existing keywords (2026-07-30)

The user asked about coding Trample, Flash, Vigilance, and Indestructible. Worth stating plainly: **Trample, Vigilance, and Indestructible are already fully implemented** (Trample/Vigilance since the "Keyword mechanics batch" below; Indestructible was already wired into `sba.ts`'s lethal-damage check from Phase 1 but never had a dedicated fixture/test calling it out). Nothing further to build for those three. **Flash, Ward, and Menace were implemented the same day** - see "Flash, Menace, Ward" below. **First Strike / Double Strike remains the one deferred keyword** - it needs a genuine extra combat-damage sub-step in the turn sequence, a bigger structural change than the other three, left for whenever it's actually asked for.

## Flash, Menace, Ward (2026-07-30)

User picked these three (over First/Double Strike) after being told Trample/Vigilance/Indestructible were already done. All three needed real engine changes, not just a keyword flag:

- **Flash**: `casting.ts`'s sorcery-speed gate (`isSorcerySpeedOnly`) now also passes if the card has the `Flash` keyword (new keyword added to the `Keyword` union - it wasn't there before). `autoPass.ts`'s `hasAnyLegalAction` was updated the same way so a Flash creature in hand correctly stops auto-pass from skipping past a window where it could be cast. Real fixture: **Ambush Viper** ({1}{G}, 2/1, Flash + Deathtouch), added to Salty Mike's deck.
- **Menace** (the ROADMAP item this was explicitly blocked on): `combat.ts` fully reworked for multiple blockers per attacker.
  - `declareBlockers` now validates Menace up front across the whole declaration: a Menace attacker assigned exactly one blocker is rejected outright.
  - `dealCombatDamage` groups blockers per attacker instead of assuming one, and assigns damage in declaration order: each blocker gets at least lethal (Deathtouch-aware) before the next one gets any; without Trample the last blocker absorbs all remaining power (an attacker's full power always lands on its blockers when there's no Trample - it can't just vanish); with Trample, only lethal goes to each blocker and everything left over spills to the defending player, generalizing the existing single-blocker Trample math to N blockers. The attacker takes combined damage from every blocker, and Deathtouch from any one blocker still makes the attacker's damage lethal.
  - Real fixture: **Alley Strangler** ({2}{B}, 2/3, Menace) - mono-black, so it can't legally join either mono-green/mono-white demo deck; kept as a pure engine-test fixture, same reasoning as Healing Salve only implementing one of its two modes.
- **Ward**: new `CardDefinition.wardCost` (a `ManaCost`, only meaningful alongside the `Ward` keyword). Enforced in both `castSpell` and `activateAbility`: after a target is validated, `ward.ts`'s `attemptWardPayments` checks every targeted permanent controlled by someone other than the caster for Ward, and tries to pay its cost out of the caster's **currently floating mana pool**. If it can't, the spell/ability is countered - a cast spell moves straight to the graveyard without resolving, an ability just fizzles - and in both cases whatever was already spent to cast/activate it is not refunded.
  - **Documented simplification** (same spirit as the commander-replacement-effect and no-shuffling notes in Phase 1): real Ward is optional - you could decline to pay even with the mana available - and lets you tap additional lands to cover it. This engine auto-pays whenever the floating pool covers it and only checks the floating pool, with no choice to decline. A real "pay or not" decision prompt is future work if it ever matters for a real card.
  - Real fixture: **Tomakul Honor Guard** ({1}{G}, 3/1, Ward {2}), added to Salty Mike's deck - genuinely vanilla-plus-Ward with no other text, confirmed against Scryfall data (most Ward creatures also carry an unrelated payoff ability, which is why this one specifically was picked).
- 9 new tests (`keywords2.test.ts`): Flash lets Ambush Viper be cast outside a main phase (and confirms a non-Flash creature still can't); Menace rejects a lone blocker and accepts two; multi-blocker damage math both with and without Trample; Ward counters an unpaid-for spell and a targeted activated ability, resolves normally when paid (and the mana pool reflects the ward cost being spent), and doesn't trigger against the controller's own Ward creature. 62 total tests, all passing; full workspace typecheck clean.
- **Verification note**: Menace and Ward don't have a natural path through the current two demo decks (neither Alley Strangler nor a targeted removal spell exists in an opponent's actual hand to trigger them), so those two are proven by the engine test suite rather than live browser play - neither change touches any client code, so there's no new UI wiring left unverified. Flash likewise only changes backend timing logic, not the UI.

## Widening the engine + archetype decks (2026-07-31)

The bot was done but archetype decks weren't buildable: the effect DSL had seven kinds
(damage, draw, addMana, gainLife, and three counter/pump effects), which meant no removal
beyond damage, no tokens, no static effects, and no counterspells. Every deck would have
been the same deck. Chosen approach: widen the engine first, then build.

### Engine

- **`attacks` and `dies` triggers now actually fire.** Both were declared in
  `TriggeredAbility["event"]` and neither was wired to anything, so a card written with one
  would have looked correct and done nothing. Attack triggers fire in `declareAttackers`
  after the whole declaration (it's one simultaneous action, not one per creature); death
  triggers fire from `sba.ts` when a creature leaves the battlefield - including a commander
  redirected to the command zone, which still counts as having died.
- **Destroy and exile.** New `{ kind: "destroy" }` and `{ kind: "exile" }` effects.
  Indestructible stops destroy and not exile; the commander replacement effect applies to
  both. Target validation was generalised at the same time: `targetSelectorOf(effect)` in
  `targeting.ts` is now the single place that says whether an effect targets, so a future
  targeted effect can't silently become castable with no target - which is exactly what
  would have happened here, since `castSpell` previously hardcoded a check for `"damage"`.
- **Anthems** - `CardDefinition.staticBuff`, a deliberately narrow continuous-effect layer.
  "Other creatures you control get +N/+N", optionally filtered by subtype (the "lord"
  pattern). Folded into `effectivePower`/`effectiveToughness`, so combat and state-based
  actions see it for free, and recomputed on every read rather than cached - which is why
  it needs no invalidation when a permanent enters or leaves. It only ever moves P/T;
  granting keywords or changing types still needs the real layer system.
- **Tokens** - `{ kind: "createToken" }`, plus `CardDefinition.isToken`. A token that leaves
  the battlefield ceases to exist rather than moving zones (rule 111.7); since `moveCard`
  already splices it out of its old zone, simply not re-inserting it is the whole
  implementation.

### Cards

15 new hand-transcribed fixtures (removal, anthems, token makers, Darksteel Myr, Swamp and
Island) plus **92 generated** ones - complete mono-black and mono-red creature pools.

New tool: **`tools/scryfall-report/gen_fixtures.py`** emits engine fixtures straight from the
Scryfall bulk data, and *only* for cards it can represent exactly. Any card with a line of
rules text the DSL can't express is skipped rather than approximated. It also refuses First
Strike and Double Strike specifically, because those are in the `Keyword` union but are not
implemented in combat - a card carrying one would look right and play wrong.

Two bugs found in `audit_fixtures.py` itself while checking the results, both false
positives that would have eroded trust in the audit: token printings were shadowing real
cards of the same name in the lookup ("Kobolds of Kher Keep" exists as both, and the token
entry is marked not-Commander-legal), and a genuinely free `{0}` spell was being rendered as
an empty cost. Fixed. **241 fixtures, zero problems.**

### The four decks

`packages/engine/src/archetypes.ts`. All Commander-legal, verified by `validateCommanderDeck`.

| Deck | Commander | Plan | Lands |
| --- | --- | --- | --- |
| Radiant Ranks (mono-white) | Agent Phil Coulson | Go wide with cheap bodies and tokens, then Glorious Anthem | 41/99 |
| Overgrowth (mono-green) | Tifa Lockhart | Bigger creatures, plus Gaea's Anthem | 43/99 |
| Gravebound (mono-black) | Grendel, Spawn of Knull | Unconditional removal, then deathtouch/lifelink attrition | 47/99 |
| Warband (mono-red) | Rorix Bladewing | Cheap aggression behind a hasty 6/5 flier | 53/99 |

Selectable in the client with `?mode=bot&deck=white&vs=black`, and in the watcher with
`--deck=black --vs=green`.

**Stated plainly: these are archetypes of *creature deck*, not of Magic strategy.** Every one
wins by attacking, because attacking is still the only route to victory the pool offers.

**Every matchup, three games each - 36 games: 0 stalls, 0 illegal actions, average 34 turns.**
Wins: red 13, white 10, black 10, green 3. Mono-green is clearly the weakest - it has neither
evasion nor removal, so it loses to fliers and to being picked apart.

**121 tests passing** (17 new engine tests in `widening.test.ts`, 6 new bot tests), typecheck clean.

### What control still needs

Counterspells (there is no way to interact with the stack at all), real card draw beyond a
single "draw a card" on entry, and board wipes. Until then a control deck would just be a
worse creature deck.

**All three landed on 2026-07-31 - see the next section.**

## Spells, counterspells, and a control deck (2026-07-31)

Prompted by the question "should we just increase the card pool in general?". Measured first:
of 31,623 Commander-legal cards the generator could represent **813**, all of them creatures
whose entire text is keywords the engine already had. Adding ten more creature features
(activated pump, evasion, mana dorks, first strike, flash, prowess, ward, ETB damage) would
have raised that to 1,148 - ten features for +335 cards, and every one still a creature that
attacks. Meanwhile **6,840 Commander-legal instants and sorceries** existed that the generator
did not look at *at all*. That is where the work went.

### Engine

- **Signed until-end-of-turn P/T modifiers.** `CardInstance.temporaryToughnessBonus` alongside
  the existing power bonus, both cleared in cleanup and on any zone change. Two effects use it:
  `pump` (targeted, or self-targeting for the `{cost}: this creature gets +N/+N` ability form)
  and `pumpAll` (`scope: "controller" | "all"`).
  Because the numbers are signed, this one primitive covers combat tricks, `-N/-N` removal, mass
  pumps *and* board wipes. A creature reduced to 0 toughness dies to the state-based action that
  already existed - no separate destroy path, and it gets through Indestructible, correctly.
- **Counterspells.** New `TargetSelector` kind `"spell"` and `StackTarget` kind `"spell"`
  (identified by StackObject id, not card instance). The `counter` effect removes the target
  from the stack and puts its card in the graveyard - or the command zone, for a commander.
  `isSpellOnStack` distinguishes spells from triggered/activated abilities by whether the source
  card is in the stack zone, so an ability can never be countered.
  "Counter unless its controller pays {N}" takes the same shortcut Ward does: pay automatically
  from floating mana if able, otherwise countered. No opportunity to decline.
- **`legalTargetsFor`**, closing a documented shortcut in `autoPass.ts`. It used to assume every
  targeted card always had something to target ("in the current card pool every targeted effect
  can at least hit a player"). A counterspell with an empty stack breaks that outright, and
  without the fix `hasAnyLegalAction` would have returned true forever and wedged auto-pass.
- **`castSpell` ordering bug.** It paid mana and moved the card to the stack *before* validating
  targets, so an illegal target threw with the game already half-mutated. Latent since the first
  targeted effect; counterspells make it easy to hit, because targets can vanish in response.
  Validation now happens before anything is paid or moved.

### Cards

`gen_fixtures.py` gained a `--spells` mode. Same rule as before - emit only what the engine
represents *exactly*, skip anything else rather than approximate it - so a spell with two
clauses is refused, since `castEffect` is a single effect.

**153 new fixtures**: 116 instants/sorceries across all five colours, plus the rest of the blue
creature pool. Includes Counterspell, Mana Leak, Cancel, Force Spike, Quench, Convolute,
Mindstatic; Divination, Concentrate, Tidings, Harmonize; Giant Growth, Titanic Growth, Might of
Oaks, Inspired Charge; Last Gasp, Grasp of Darkness, Disfigure, Throttle; Languish and Infest as
sweepers; Lightning Bolt, Searing Spear, Explosive Impact.

**441 fixtures, audited against Scryfall, zero problems.** The 11 spells previously transcribed
by hand were regenerated identically and skipped as duplicates, which is a useful independent
check on both. `audit_fixtures.py` now reads `utf-8-sig`, because PowerShell's `Out-File
-Encoding utf8` writes a BOM that `json.loads` rejects.

### The fifth deck

**Tidewall (mono-blue)** - Caelorna, Coral Tyrant ({1}{U} 0/8) as commander, 8 counterspells,
10 card-draw spells, 8 blockers, 32 fliers, 38 Islands. The other four decks gained the spells
their colours were missing: white mass pumps, green combat tricks and Harmonize, black eight
more removal spells and two sweepers, red twelve burn spells.

### Two bugs the matchups exposed

The first build of Tidewall won **1 game in 24**. Two separate causes, and the deck was the
smaller one:

- **The bot attacked with 0-power creatures.** `chooseAttackers` asks "does this attack turn out
  well?", and for a 0/8 the answer is yes - nothing can kill it. True and completely pointless:
  it deals no damage and taps, so it stops being a blocker for free. Blue was sending its 0/8
  commander in every turn and dying to the swing back. Fixed by refusing to attack with 0 power
  unless the creature has an attacks-trigger. This affected every deck; blue just had the most
  0-power creatures.
- **The deck was 45% walls** - it stabilised every board and then had nothing to win with. Cut
  from 16 blockers to 8, with the freed slots going to real fliers.
- Also, `developTheBoard` ranked creatures by mana value alone, so a 0/8 wall and a 4/4 flier for
  the same cost were interchangeable. Now broken by a small offense tie-breaker.

After both: **60 games, 0 illegal actions, 0 stalls, average 28 turns.** Wins - white 15,
black 14, red 13, blue 12, green 6. Blue went from 1 win in 24 to 12.

Across those 60 games the bots cast 34 counterspells, 6 sweepers, 48 pump spells, 32 hard
removal spells and 46 card-draw spells, so none of the new machinery is dead weight.

### Client

- `CardView` was recomputing power/toughness inline and had already drifted - it missed anthems,
  and would have missed the new toughness bonus too. It now takes the `GameState` for
  battlefield cards and calls the engine's own `effectivePower`/`effectiveToughness`. Hand and
  graveyard cards still show printed values, which is what you want there.
- Spells on the stack are clickable as targets while a counterspell waits for one. Abilities
  stay inert - they can't be countered.
- Hotseat mode now accepts the same `?deck=` / `&vs=` archetype parameters bot mode does, so two
  people on one screen can play the built decks.

**147 tests passing** (16 new engine tests in `control.test.ts`, 10 new bot tests in
`instants.test.ts`, including a regression test for the 0-power attacker), typecheck clean.

### Verified how

Engine and bot behaviour: the test suite and the 60-game matchup run. In the browser: the app
loads both archetype modes, the blue deck renders correctly, and there are no console errors.
The counterspell targeting click-flow and the EOT badge were **not** exercised in the browser -
the preview pane throttles timers when it isn't displayed, so games don't progress far enough to
reach those states. They are covered by tests instead.

### Still missing

- Anything that counters a spell *conditionally* on more than mana.
- First Strike / Double Strike, graveyard recursion and tutors were all listed here and are
  **done as of the next section**. "This spell can't be countered" and land destruction were
  too, in the section after that.

## First/Double Strike, graveyard recursion, and tutors (2026-07-31)

### First Strike and Double Strike

Combat damage now happens in two sub-steps (real rule 510.4), added as a `first-strike-damage`
step in the turn sequence:

- First Strike only: deals damage in the first sub-step, nothing in the second.
- Double Strike: deals damage in *both*.
- Neither: the second only.

State-based actions run between the two, so a creature killed by first-strike damage never deals
its own - which is the entire point of the keyword.

`combatHasFirstStrike` skips the whole sub-step when nothing in combat has either keyword, so a
combat without first strike behaves exactly as before. That is what let this go in without
changing a single existing combat test.

**A rules bug this exposed and fixed:** an attacker whose blockers all die remains *blocked*
(rule 509.1h) and assigns nothing to the defending player. That never came up before, because
without first strike no blocker could die before damage. With a double striker it happens
routinely - its blocker dies to the first hit, and the second hit must not simply hit the player
for full power. Trample still spills over, correctly.

### Graveyard recursion

New `card-in-your-graveyard` target selector (optionally filtered to a card type) and a
`returnFromGraveyard` effect with a `hand` or `battlefield` destination. Reanimation goes through
the same `putOntoBattlefield` a resolving creature spell does, so it fires enters-the-battlefield
triggers - it cannot silently skip them.

That shared helper required moving `pushOntoStack` and `putOntoBattlefield` into a new
`permanents.ts`: `stack.ts` calls `applyEffect`, and `effects.ts` now needs to put cards onto the
battlefield, so leaving either primitive in `stack.ts` would have made the two files import each
other. `playLand` uses it too now, so a land with an ETB trigger would fire it.

### Tutors

A `searchLibrary` effect with a card-type filter, a basic-land-only flag, a hand or battlefield
destination, and a `tapped` option, followed by a shuffle - which happens whether or not anything
was found, since skipping it would leak that the library holds no match.

**The engine picks the card**, taking the highest mana value among legal matches. The real rules
make this the searching player's choice and there is still no mid-resolution decision flow (the
same gap Ward and "unless its controller pays" work around). Documented at `chooseSearchResult`.
Basic lands are interchangeable, so the ramp spells - most of what this covers - are unaffected.

### Cards

The generator stopped refusing First Strike and Double Strike, and gained patterns for both new
spell families. **361 new fixtures, taking the pool from 441 to 801**, all audited clean:

- First and double strikers across every colour - Knight of Meadowgrain, Fencing Ace, Tundra
  Wolves, Youthful Knight, Elvish Archers, Sabretooth Tiger, Twinscroll Shaman, Halberdier.
- Recursion - Raise Dead, Disentomb, Zombify, Resurrection, Breath of Life, Rise Again,
  Regrowth, Recollect, Elven Cache, Wildwood Rebirth.
- Tutors - Demonic Tutor, Diabolic Tutor, Lay of the Land, Natural Connection, Sylvan Scrying.

**Two bugs in the tooling this caught:**

- The audit reported 25 perfectly good first strikers as carrying invented keywords. Scryfall
  writes `First strike`; the engine's Keyword union writes `First Strike`. Now compared
  case-insensitively.
- Dryad Arbor - a *Land Creature* with no mana cost - was emitted as a plain creature costing
  `{0}` with the Land type dropped, which is not the card. The generator now skips land creatures
  rather than misrepresent them, and the bad fixture was deleted.

### Bot

The bot's combat maths assumed every fight was a simultaneous trade, which is wrong the moment
first strike exists. `killsInFight` replaces the old symmetric comparison: a creature that dies in
the first sub-step never swings back, so "will I kill theirs?" and "will I lose mine?" are no
longer mirror images. Double strike counts as two hits' worth of damage. It also values both
keywords when deciding what to keep and what to trade.

It now reanimates the best creature in its own graveyard (ranked ahead of casting from hand -
the best thing in the yard is usually better than what is left in hand, which is why it died),
and casts tutors, with land tutors gated on still being short of mana.

### Decks and results

All five archetypes gained the new cards, swapping out their weakest vanilla creatures rather
than simply growing, to keep the land counts sane. White got eight first strikers and two
reanimation spells, black six recursion/tutor spells, red eight first strikers, green ramp and
recursion.

**60 games: 0 illegal actions, 0 stalls, average 25.6 turns.** Wins - white 18, red 13, black 12,
green 9, blue 8. Across those games the bots cast 43 counterspells, 43 draw spells, 33 pump
spells, 28 recursion spells, 17 removal spells, 9 tutors and 6 sweepers.

Separately instrumented over 8 white-vs-red games: **the first-strike sub-step ran in 24 combats
and 58 creatures died during it**, so the keyword is doing real work rather than just existing.

**176 tests passing** (20 new engine tests in `strikeAndGraveyard.test.ts`, 9 new bot tests in
`strikeAndRecursion.test.ts`), typecheck clean, 801 fixtures audited with zero problems.

### Client

Cards in a graveyard are clickable while a recursion spell is choosing a target, and the zone
being targeted is outlined and labelled. Only the relevant zone lights up - a counterspell
highlights the stack, a recursion spell highlights its own graveyard.

## Land destruction and "can't be countered" (2026-07-31)

The last two items on the "still missing" list from the previous two batches.

### Land destruction

The effect DSL had exactly one way to name a permanent - `{ kind: "creature" }` - so
"Destroy target land" simply could not be written down. Added a second selector,
`{ kind: "permanent", cardType }`, which covers Land, Artifact and Enchantment through one
path. `destroy` itself needed no change at all: Indestructible, the commander replacement
effect and the "already gone, so it fizzles" case were all already type-agnostic. Hexproof
applies here for the same reason - it protects any permanent, not just creatures.

Twelve real cards: Stone Rain, Sinkhole, Rain of Tears, Ice Storm, Winter's Grasp, Craterize,
Volcanic Upheaval, Shatter, Smelt, Verdigris, Demystify, Quiet Purity.

### This spell can't be countered

A flag on `CardDefinition`, not an effect, because it is a static property of the spell rather
than something that happens.

**It is deliberately NOT a targeting restriction.** Under the real rules a counterspell may
still legally target Terra Stomper - it resolves and does nothing. Making it illegal to target
would have been the easier implementation and the wrong one, so `isValidTarget` is untouched
and the check sits in the `counter` effect, which logs and moves on. "Counter unless its
controller pays {N}" cannot extract the payment either.

Five real cards: Terra Stomper, Carnage Tyrant, Last Word, Inescapable Blaze, and (already in
the pool) nothing else - the other 79 Commander-legal cards carrying the line have a second
clause the DSL still cannot express.

### The bug this exposed in the bot

`removeSomething` filtered its hard removal on `castEffect.kind === "destroy"` and then
hardcoded `{ kind: "creature" }` when validating the target. The moment a destroy spell existed
with a different selector, that would have aimed a Stone Rain at a creature and had the engine
reject the cast outright. Fixed by filtering on the selector and validating with the effect's
own target - so a new selector can never again be silently mis-aimed.

### The gap this exposed in the client

`PlayerBoard` rendered the battlefield as two lists, lands and creatures. Anything that was
neither - an anthem enchantment, a non-creature artifact - was **on the battlefield but not
drawn anywhere**, so "destroy target enchantment" had nothing to click. Added a third
"Other permanents" group. The battlefield is now three labelled groups, and the one a spell is
waiting to be pointed at is outlined.

### Bot behaviour

Land destruction is treated as tempo, not removal: it only fires while the opponent still has
five lands or fewer, and it prefers an untapped land so they lose the mana this turn rather
than next. It sits low in the decision chain, because developing our own board beats attacking
theirs for the same mana. Artifacts and enchantments are judged on what they are actually
doing - an anthem is scored by how many creatures it is pumping, so destroying one that pumps
nothing is correctly declined. The bot also no longer aims counterspells at things that can't
be countered.

### Verified how

**197 tests passing** (12 new engine tests in `landAndUncounterable.test.ts`, 9 new bot tests
in the bot package's file of the same name), typecheck clean, all packages build.

**817 fixtures audited against Scryfall with zero problems.** The audit gained a check for the
new flag in both directions - a fixture claiming `cantBeCountered` must have the line in its
real oracle text, and a card that has the line must not silently lose it.

**150 games, 15 per pairing: 0 illegal actions, 0 stalls, average 25.8 turns.** Wins - white 42,
black 33, red 31, green 22, blue 22 (out of 60 each). Across those games the bots cast 39
permanent-destruction spells and 31 uncounterable spells, alongside 114 pump spells, 98
counterspells, 89 draw spells, 68 recursion spells, 59 removal spells, 36 tutors and 15 sweepers.

All five decks took the new cards by swapping out their weakest vanilla creatures, so every
land count is exactly what it was.

Not verified in the browser: the populated "Other permanents" group and the land-targeting
outline. The preview pane throttles timers when it is not displayed, so a hotseat game cannot
be driven far enough to put an anthem on the battlefield. The app loads clean with no console
errors and the three-group battlefield structure renders.

## Card data correctness audit (2026-07-30)

The user pointed out that Tifa Lockhart and Agent Phil Coulson are real printed cards
whose real abilities are exactly what they had described, and asked how the invented
versions had been arrived at. Answer: they were invented, and the cached Scryfall bulk
data was never searched for either name - despite being sitting right there in
`tools/scryfall-report/data/oracle-cards.jsonl.gz` and having been used rigorously for
the 96 other cards added the same day.

**Standing rule, now in effect:** every card added to the simulator must be read out of
the Scryfall bulk data first. No card may exist in the simulator that is not a real
Magic card. Nothing about a card is ever guessed. If a named card is genuinely absent
from the data, that is reported as an error (it means it is not Commander legal) rather
than improvised around.

**New tool:** `tools/scryfall-report/audit_fixtures.py` checks every fixture in the
engine against the bulk data - name exists, mana cost, power/toughness, type line,
keywords, colour identity, Commander legality - and is the thing that turns "these
cards are right" into a claim that can be re-run. Usage is in its docstring. Current
status: **133 fixtures, zero problems.**

**What the audit found and what was fixed:**

| Card | Problem | Fix |
| --- | --- | --- |
| Tifa Lockhart | Invented: {1}{G}{G} 4/4 Haste/Trample, a damage ability, landfall giving +1/+1 counters | Real card: **{1}{G} 1/2, Trample, "Landfall - Whenever a land you control enters, double Tifa Lockhart's power until end of turn."** |
| Agent Phil Coulsen | Invented, and misspelled | Real card: **Agent Phil Coulson, {1}{W} 2/2 Legendary Creature - Human Spy Hero, Vigilance, "{T}: Put a +1/+1 counter on each other Hero you control."** |
| Test Commander, Gruul Prototype | Wholly invented placeholder (predates this work) | Replaced with **Jerrard of the Closed Fist** ({3}{R}{G}{G} 6/5, vanilla) |
| Test Commander, Big Power | Wholly invented placeholder (predates this work) | Replaced with **Yargle and Multani** ({3}{B}{B}{G} 18/6, vanilla); the 21-commander-damage test now takes two swings instead of one |
| Elvish Visionary | Coded 2/1 | Real 1/1 |
| Elvish Warrior | Coded {1}{G} | Real {G}{G} |
| Wall of Wood | Coded {1}{G} 0/5 | Real {G} 0/3 |
| Child of Night | Coded 2/2 | Real 2/1 |
| Slippery Bogle | Coded as a mono-green Human Rogue; really a hybrid {G/U} Beast, so its colour identity is G **and** U - illegal in Salty Mike's mono-green deck | Replaced with **Gladecover Scout** ({G} 1/1 Elf Scout, Hexproof), which is genuinely mono-green |
| Mountain / Forest / Plains | Colour identity coded as `[]` | Basics carry the identity of the mana they make (R/G/W); deck validation would otherwise have allowed a Forest in a mono-white deck |

The other 114 fixtures checked out exactly, including that every implemented ability
matches its card's oracle text.

**Engine work the real cards required** (both abilities needed DSL the engine did not have):

- **Until-end-of-turn power modifier**: new `CardInstance.temporaryPowerBonus`, folded into `effectivePower`, cleared in the cleanup step and on any zone change. New effect kind `{ kind: "doublePower" }` adds however much power the source currently has, so it compounds correctly across two lands in a turn (1 -> 2 -> 4) and doubles counters along with the printed value. This is a deliberate shortcut around a real continuous-effect layer system - good enough for power pumps, not for type- or ability-changing effects.
- **Subtype-filtered mass counters**: new effect kind `{ kind: "addCounterToEachOther"; amount; subtype? }` - untargeted, sweeps the controller's battlefield, always skips the effect's own source. With `subtype: "Hero"` it is Coulson's ability; without a subtype it is **The Falcon, Sam Wilson**'s ETB ("put a +1/+1 counter on each other creature you control"), which was added to prove the general form.

**Deck changes:** five plain white creatures in Deadly Donny's deck (Squire, Traveling
Philosopher, Ardent Militia, Iron Tusk Elephant, Venerable Lammasu) were swapped for five
real mono-white **Heroes** - Ant-Man, Scott Lang ({1}{W} 2/2, "{4}: Put a +1/+1 counter on
Ant-Man"), Amateur Hero ({2}{W} 3/3, ETB gain 2 life), Hawkeye, Clint Barton ({3}{W} 3/5
Vigilance), Valkyrior Skyrider ({4}{W} 3/4 Flying, ETB gain 4 life), and The Falcon, Sam
Wilson ({4}{W} 3/3 Flying, ETB mass counters) - so that Coulson's "each other Hero you
control" ability has something to do. Card count unchanged, so land ratios held at 44/99
and 45/99. Also added **Prodigal Pyromancer** ({2}{R} 1/1, "{T}: deals 1 damage to any
target"), the pool's only permanent with a targeted activated ability, which the Ward test
had been borrowing Tifa's invented punch for.

**Second client bug found while verifying this**: `CardView.tsx` recomputed a creature's
displayed power/toughness inline (`definition.power + instance.plusOneCounters`) instead of
going through the engine's `effectivePower`/`effectiveToughness`, so Tifa's doubling applied
correctly in the engine but never showed on the card. Fixed, with the temporary pump shown as
a separate `(+N EOT)` badge next to the permanent `(+N)` counter badge - a real reminder that
duplicating engine logic in the view is how the two drift apart.

**Verified live in the hotseat client** (not just in tests): played a land with Tifa Lockhart
on the battlefield and watched her go from **1/2** to **2/2 (+1 EOT)**; confirmed she was back
to **1/2** on a later turn, proving the cleanup-step wear-off. Separately, got Agent Phil
Coulson and Amateur Hero onto Deadly Donny's battlefield and tapped Coulson - Amateur Hero went
from **3/3** to **4/4 (+1)** while Coulson stayed **2/2**, confirming "each *other* Hero".

**Tests:** `commanders.test.ts` rewritten from scratch against the real oracle text (9
tests: Tifa's doubling, its compounding, its interaction with counters, its wearing off at
cleanup, its not firing off an opponent's land; Coulson hitting every other Hero and only
Heroes he controls; the Falcon's unfiltered form). `counters.test.ts`, `keywords2.test.ts`,
`combat.test.ts`, `commander.test.ts` and `deck.test.ts` updated for the corrected stats and
the real replacement cards. **65 tests, all passing; full workspace typecheck clean.**

## Heuristic bot (2026-07-31)

New `packages/bot` (`@mtg-commander-sim/bot`). A pure decision library plus two harnesses,
with no engine or server changes to accommodate it - per CLAUDE.md, the bot really is just
another client.

**Shape.** `decideAction(state, botPlayerId)` returns exactly *one* `BotAction`, never a
plan. The caller loops, feeding each action through the engine and asking again, so the bot
re-reads reality after every step instead of committing to a sequence a trigger might have
invalidated. Multi-step sequences fall out of the loop naturally - "tap three lands, then
cast" is just four consecutive calls.

**It cannot cheat.** `nextAction` runs the state through the protocol package's
`filterGameStateForViewer` before deciding, so even the in-browser bot - which shares one
in-memory `GameState` object with the UI - cannot read the human's hand or either library.
A test asserts it holds a burn spell rather than reaching into a hidden zone for a target.

**Heuristics.**
- *Mana*: play a land every turn; tap greedily toward a chosen spell, satisfying coloured
  requirements before generic. Deliberately not a real cost solver - fine for mono-coloured
  decks, would need proper solving for hybrid costs.
- *Development*: commander first (its tax only grows), then the most expensive affordable
  creature, which curves out better than dumping cheap ones and wasting the rest.
- *Removal*: burn the opponent out if it's lethal; otherwise kill the most valuable creature
  the spell can actually finish; otherwise hold it. Never fired just to have fired, and
  never pointed at Hexproof.
- *Attacking*: swing everything if the damage that survives their best blocks is lethal;
  otherwise attack with anything unblockable (including Menace against a lone blocker), that
  survives every possible block, or that trades into something worth at least as much. But
  first: if their board could kill us on the swing back, creatures stay home to block -
  Vigilance exempted, since it costs nothing.
- *Blocking*: survival first - facing lethal, chump-block the biggest attackers with the
  cheapest bodies. Otherwise block only where the exchange is good. Respects Flying/Reach,
  and never single-blocks Menace.
- *Commander damage* is folded into every lethal check: a commander that has already
  connected for 14 is treated as 7 from lethal regardless of the life total.

**Two harnesses, one brain.** `?mode=bot` in the client drives a seat through the same
`GameController` the human UI uses. `packages/bot/src/runner.ts` is a standalone process
that joins the server as a seat over the same WebSocket protocol a browser uses - the
server cannot tell it from a person and validates it identically.

### Engine bug the bot found

`activateAbility` **never paid `ability.cost.mana`** - it handled the tap cost and nothing
else, so every activated ability with a mana cost was free. Ant-Man, Scott Lang's
`{4}: Put a +1/+1 counter on Ant-Man` could therefore be activated without limit, and two
of five bot-vs-bot games locked up with ~10,000 activations on a single creature.

Fixed: both parts of the cost are now validated before either is paid (so a failed
activation can't leave the permanent tapped), then both are paid. Two regression tests added
to `keywords2.test.ts`. This is the clearest argument for the bot-vs-bot test existing at
all - no human clicking through the UI would ever have activated one ability ten thousand
times.

### Client fixes this surfaced

- **The Pass Priority button passed on behalf of whoever held priority**, so in bot mode a
  human could pass the bot's priority out from under it before it acted. Now gated on
  `canControlPlayer`, showing "Waiting for X..." instead. Confirm Attackers/Blockers are
  gated separately and correctly - declaring blocks is not a priority action, so the
  defender must be able to declare while the attacker still holds priority.
- **The bot driver is a polling interval, not a state-keyed effect.** The engine mutates
  `GameState` in place, so the object identity never changes and React can't be relied on to
  re-run an effect at the right moment; an effect-based first version stalled with the bot
  holding priority. This is the same class of trap as the Vite-alias incident in CLAUDE.md.

**Testing.** 31 new tests (`decisions.test.ts`, `fullGame.test.ts`); **98 total, all
passing**, typecheck clean. The headline one plays full bot-vs-bot games on the real 99-card
demo decks and asserts a winner with zero illegal actions. Over 40 games: **0 stalls, average
59 turns, average 1,800 actions.**

**Observed deck imbalance:** Deadly Donny won 31 of 40. Mono-white's many fliers are close to
unblockable for mono-green, which has only three Reach creatures. Worth remembering when the
decks are next rebalanced.

### Hold-back rule rewrite (2026-07-31)

The first version of the attack restraint was all-or-nothing: if the opponent's total board
power exceeded our life total, nothing attacked except Vigilance creatures. Both bots hit that
state permanently once boards grew, so games ground on for 180+ turns and ended by decking
rather than damage - visible immediately in `npm run watch`.

Replaced with a rule sized to the actual threat. `blockersNeededToSurvive` finds the smallest
number of blockers that keeps their next swing under our life total (assuming each blocker
stops their biggest attacker), subtracts what's already covered for free (summoning-sick
creatures, Defenders, and Vigilance attackers all block without costing an attack), and holds
back exactly that many. *Which* creatures stay home is scored separately - high toughness and
low power keeps a wall at home, and a creature the defender has no legal blocker for gets a
large penalty so evasive threats always keep swinging.

Measured over 40 games, before → after:

| | Before | After |
| --- | --- | --- |
| Average turns | 59 | **31** |
| Average actions | 1,800 | **880** |
| Games decided by damage | ~12 of 40 | **39 of 40** |
| Stalls | 0 | 0 |

One outlier still runs to 184 turns. A genuine board stall between two creature decks with no
removal and no card advantage is real Magic, not necessarily a bug - revisit once the card pool
has answers in it.


**Verified live in the browser** (`?mode=bot`): the bot ramped, cast Tifa Lockhart from the
command zone, cast creatures, passed priority correctly and handed control back. Combat is
proven by the test suite rather than browser play - the preview pane throttles background
timers to roughly 1Hz, which makes driving a full game through it impractical, and 40
completed games with real damage and decided winners is the stronger evidence anyway.

**Known limits** (all deliberate): no instant-speed play - the bot acts only at sorcery
speed, so it never holds up a trick or responds on the stack; no attention to card advantage
or to what's left in the library; no bluffing or politics; no lookahead of any kind, so it
can't set up a two-turn plan; damage assignment order across multiple blockers is the
engine's declaration order, not a chosen split.

## UI vision document (written 2026-07-30, not scheduled)

`docs/UI-VISION.md` - a design proposal for taking the client from its current 1,060-line
text-box UI to something that reads as a real card game: Scryfall card art, an arena
layout, and a full animation catalogue (draw, cast, tap, combat, damage, death, counters,
triggers). Nothing in it is built.

Headline finding: **the highest-leverage change is not visual.** The engine needs to emit
a typed `GameEvent[]` stream, and the client needs to render from a queue of those events
rather than straight from state. Without it the client only ever knows what is true *now*,
never what just happened - an entire combat step resolves in one synchronous call - so
there is nothing to animate from. That same stream also gives the game log, network deltas
instead of whole-state broadcasts, and the observation feed the Phase 4 bot needs, so it
is groundwork for the next milestone rather than a detour from it.

Also flagged: auto-pass currently fires the instant state changes and would blow straight
through every animation unless it is gated on the animation queue draining.

## Prep tool: Scryfall card report (built 2026-07-30)

`tools/scryfall-report/` - pulls Scryfall's official `oracle_cards` bulk data (31,623 Commander-legal unique cards as of this run), tags each with a heuristic archetype guess (removal, ramp, card draw, ETB trigger, mana dork, etc.) and an implementation-complexity score/tier (`1 - vanilla` / `2 - simple` / `3 - moderate` / `4 - complex`), cross-references against what's already in `packages/engine/src/cards/testCards.ts`, and writes it all to `output/commander_card_report.xlsx` (formatted: bold header, frozen header row, autofilter, sensible column widths).

Current breakdown: 338 vanilla, 11,976 simple, 12,228 moderate, 7,081 complex. ~12,300 cards are tier 1-2 and not yet implemented - that's the pool to pick the next batches from for the "expand the card pool" and "50 lands per deck" items above.

Re-run any time with `py fetch_bulk_data.py` then `py build_report.py` (from inside `tools/scryfall-report/`) - Scryfall regenerates the bulk file roughly daily. **The archetype tags and complexity score are heuristics (regex over Oracle text), not ground truth** - the `complexity_flags` column names exactly which pattern(s) fired on a given row so a score can be sanity-checked rather than trusted blindly. See `tools/scryfall-report/README.md` for the full column reference and known heuristic limitations.

## Deck builder (2026-07-31)

Phase 5, built on the 817-card implemented pool. Opens at `?mode=deck` (there
is a "Deck builder" link in the game header, a "Back to the game" link the
other way, and a `D` option in the Desktop launcher).

**What it does:**
- **Card browser** over every card the engine implements, searchable by name,
  type line, keyword or rules text - multi-word, order-independent. Filters for
  colour, card type, mana value, commanders-only, hide-basics, and a "only my
  colour identity" toggle that derives itself from the deck's commander.
- **Rules text for every card**, rendered from the effect DSL by
  `deckbuilder/cardText.ts`. The fixtures store *behaviour*, not prose, so this
  is the inverse mapping. It describes what this engine will actually do, which
  is more useful here than Scryfall's oracle text would be.
- **Multiple named, tagged decks** in localStorage (`mtg-commander-sim.decks.v1`),
  with new/duplicate/delete. No server: a deck is a list of card ids, and the
  builder has to work from the launcher with nothing else running.
- **Swap workflow** - "Swap" on a deck row arms a replacement, and the next card
  clicked in the browser takes its place in one step.
- **Live legality** straight from the engine's own `validateCommanderDeck`, so
  the builder can never disagree with what the game will accept. Off-identity
  cards are flagged red in place, and the Play button is disabled until legal.
- **Basic-land stepper and "Fill to 100"**, per colour in the commander's identity.
- **Mana curve** (nonlands, bucketed 0-7+), land count, distinct-card count.
- **Text import/export** in the standard `1 Card Name` format. Import ignores
  headers, comments and set/collector suffixes, cuts non-basics to one copy, and
  **names every card it could not find** rather than dropping it silently.
- **Play this deck against the bot** - navigates to `?mode=bot&mydeck=<id>&vs=<archetype>`.
  `main.tsx` loads the saved deck, re-validates it, and shows a plain message
  rather than falling back to a demo deck if it can't be played.

**"Implemented" vs "real card exists"** (`deckbuilder/scryfallLookup.ts`): a
second search box queries Scryfall's API live for *all* Commander-legal cards.
Every result is labelled either "Implemented - add to deck" or "Real card, not
implemented in the engine yet". Nothing is bundled (CLAUDE.md), so this half
needs an internet connection and degrades to a message when offline; everything
you can actually put in a deck works with no network at all. Requests are
debounced 350ms and superseded ones are aborted, so results can't land out of
order.

**Verified this session:** built a legal mono-white deck end to end in the
browser preview - created a deck, made Agent Phil Coulson its commander (pool
narrowed 810 -> 184 as the identity filter engaged), searched and added Glorious
Anthem, filled to 100 with Plains, watched the status go green and persist to
localStorage; added Giant Growth with the identity filter off and confirmed it
was flagged red with the engine's own wording and the Play button disabled;
swapped it out for Savannah Lions in one step; exported the list as text; ran
the Scryfall lookup and confirmed Sol Ring reported as not-implemented and
Lightning Bolt as implemented-and-addable; then pressed Play and confirmed a
real game started with Agent Phil Coulson in the command zone and Plains in
hand against the bot's mono-green Overgrowth. No console errors at any point.
38 new unit tests (235 total), typecheck clean.

**Known Phase 5 simplifications:**
- Decks live in one browser profile's localStorage. No sync, no export file -
  the text export is the way a deck moves between machines.
- Card art isn't shown (Phase 6). Rows are name/cost/type/rules text only.
- No deck-vs-deck testing harness in the builder itself - to see how a deck
  performs you press Play and watch, or use `packages/bot`'s runner.
- Hotseat and network modes still use archetypes/demo decks; only bot mode
  takes a `?mydeck=` saved deck so far.
- The pool browser renders the first 150 matches; beyond that you filter.

## Playing without the bookkeeping (2026-08-01)

Three quality-of-life changes, all requested after the first real session
against the bot. Grouped because they share machinery.

### Lands tap themselves to pay for a spell

`packages/engine/src/autoTap.ts`. Click a card you can afford and it just gets
cast - the engine works out the cost (commander tax included), taps what it
needs, and pays. It never taps anything speculatively: nothing happens until
you actually cast something, so you keep the ability to hold lands open for an
instant. (Pre-tapping would also actively lose you mana, since pools empty each
step.)

**The logic already existed** - the bot has always had to tap its own lands, so
`manaSources` / `couldAfford` / `nextSourceToTap` moved out of
`packages/bot/src/mana.ts` into the engine and the bot now re-exports them.
One implementation, used by the human client, the bot and the server alike.

`castSpellWithAutoTap` and `activateAbilityWithAutoTap` wrap the strict engine
functions; `useLocalGameController` and the server dispatcher both call the
wrappers. Timing, targets, priority and Ward are untouched - auto-tap never
makes an illegal cast legal.

**Rollback matters more than it looks.** `withAutoTap` untaps everything it
tapped and restores the mana pool if the action then throws. Without it,
clicking an instant at the wrong moment, or a spell whose target had just
become illegal, would leave your lands tapped for an action that never
happened - a whole turn's mana gone to a misclick. Safe to undo because mana
abilities resolve immediately and do nothing but add mana; no trigger observes
the tap. Four of the tests cover exactly this.

Still greedy rather than a real cost solver: with mono-coloured decks every
source makes the deck's one colour, so greedy is optimal. Hybrid or
multi-colour costs would need proper solving.

### Card detail panel

`packages/client/src/components/CardDetail.tsx` - a panel pinned to the right
of the board showing the full name, cost, type line, rules text and printed
power/toughness of whatever you're looking at. Hovering any card anywhere wins;
otherwise it falls back to whatever is on the stack, which is the one moment
you most need to read a card and can't hover it before it resolves.

Rules text comes from `describeCard` (`packages/client/src/cardText.ts`, moved
up out of `deckbuilder/` now that both surfaces use it) - the same renderer the
deck builder uses, which turns the engine's structured effect data into English.
So the panel describes what the engine will actually do rather than being a
second description that could drift from it.

Before this, a card on the table showed only its name, which is useless unless
you already know every card by heart.

### "You can play this" highlight

A green glow on cards in hand and the command zone that are castable right now.
Driven by `canPlayCardNow` in `autoPass.ts`, factored out of the existing
`hasAnyLegalAction` rather than reimplemented - so the highlight can't disagree
with what the engine will accept. It accounts for timing, mana you could still
produce from untapped lands (not just what's floating), the land-drop limit,
commander tax, and whether a targeted spell has anything legal to point at.
Only ever shown for seats this client controls, and only while they hold
priority.

**Verified this session** in a real game against the bot: opening hand showed
exactly the three Islands lit (land drop available, nothing else affordable);
played to two untapped Islands and the commander lit up; one click cast
Caelorna, Coral Tyrant, tapping both Islands with no manual tapping and leaving
nothing floating. With three lands, everything at three mana or less lit up
while both counterspells correctly stayed dark - no spell on the stack to
target. Clicking an unaffordable Divination produced the normal error and
tapped nothing. Casting it once affordable tapped all three lands, showed
"On the stack - Divination, Sorcery, Draw 2 cards" in the detail panel while it
resolved, and drew two. Hovering showed correct full text for an instant, a
sorcery and a creature. No console errors. 18 new engine tests (253 total),
typecheck clean.

**Known simplifications:**
- Auto-tap is greedy, not a solver (see above).
- No way to choose *which* lands get tapped. It prefers sources that match a
  colour the cost actually needs, then anything. Fine while decks are
  mono-coloured; a "tap these instead" flow would be needed otherwise.
- The highlight means "castable", not "a good idea".
- The detail panel shows printed power/toughness, not current - the card on the
  battlefield already shows the live value including anthems and counters.

## Combat clarity and decks everywhere (2026-08-01)

### Any deck, any mode

Hotseat and bot mode now read the same pair of deck parameters, so a deck you
built is playable in either: `?deck=`/`&vs=` name the built-in archetypes,
`?mydeck=`/`&vsdeck=` take ids from the deck builder. Previously only bot mode
accepted `?mydeck=`, so hotseat was stuck with the five archetypes.

The deck builder gained a **Play hotseat** button beside "Play against the
bot", and its opponent dropdown now lists your own saved decks alongside the
archetypes (only ones that are actually legal to play).

### Combat was silently stuck, and blocks were invisible

Two real bugs, both found by trying to play a full combat through the UI.

**1. Confirming attackers or blockers did nothing visible.** `declareAttackers`
and `declareBlockers` record the declaration but leave the player holding
priority - the step advances on the *priority pass*, not the declaration. And
`shouldAutoPass` deliberately refuses to auto-pass while you still have an
untapped creature that could attack, because that's a real decision. Net
effect: you clicked "Confirm Attackers", nothing happened, no error, and the
game sat there until you noticed you also had to click "Pass Priority". With
zero attackers selected it looked completely frozen.

Fixed in the client, not the engine - the engine is right that declaring and
passing are separate actions. `handleConfirmAttackers` / `handleConfirmBlockers`
now pass priority after declaring, since "confirm" is the player saying they're
done. Blockers pass on behalf of whoever actually holds priority (the attacker
during declare-blockers), and only if this client controls that seat.

**2. Block assignments had no visual feedback at all.** The engine has always
supported assigning specific blockers to specific attackers, including several
creatures ganging up on one (`declareBlockers` takes explicit pairs, and
`combat.test.ts` covers multi-blocker damage). But the UI drew an assigned
blocker with exactly the same highlight as a selected one and as an attacker -
so there was no way to tell whether a block had registered, or what was paired
with what. It looked like the feature didn't exist.

Now every creature in combat carries a label: "Attacking", "Blocked by 2",
"Blocks Craw Wurm", or "Pick an attacker to block". The action bar explains the
two-click flow and counts the blocks set so far. Clicking a creature that is
already blocking takes the block back.

**Verified this session** in a hotseat game played through the UI: attacked
with a Grizzly Bears, assigned Elite Vanguard to block it, then ganged Wild
Griffin onto the same attacker - labels read "Blocked by 2" on the attacker and
"Blocks Grizzly Bears" on both blockers. Clicking Wild Griffin took its block
back ("Blocked by 1"), re-assigning restored it. Confirming resolved combat
correctly: the 2/2 attacker died to four damage, Elite Vanguard traded, Wild
Griffin survived, and no damage got through to the player. Also launched a
deck-builder deck into hotseat against an archetype and confirmed both
commanders were correct. 253 tests, typecheck clean, no console errors.

### UI direction agreed for Phase 6

- **Everything must fit one screen.** No vertical scrolling to see your own
  board. This is the main constraint the redesign has to satisfy.
- **The two players face each other**, opponent's board mirrored above yours as
  if sitting across a table - not two identical stacked panels repeating the
  same layout top to bottom.

## Phase 6: the table, and card art (2026-08-01)

The UI overhaul, built to the two constraints agreed above, plus real card
illustrations.

### One screen, two players facing each other

`.table` is a CSS grid exactly `100vh` tall that never scrolls. Four rows down
the left - header, the opponent's half, the centre strip, your half - with the
card detail panel as a full-height column on the right.

The two halves are the *same component*. `PlayerBoard` takes a `flipped` prop,
and the flip is two CSS direction changes rather than a second layout:

- `.side` is `row` / `.side--flipped` is `row-reverse`, putting your rail (life,
  mana, command zone, graveyard) on the left and the opponent's on the right.
- `.side__zones` is `column-reverse` / `column`, so both players' zones run
  hand, lands, others, creatures *outward from the centre*. The two creature
  rows meet in the middle, where combat happens.

Cards take their height from the row they are in (`height: 100%`,
`aspect-ratio: 5/7`, capped at `--card-max-h`), so a full board and an empty one
occupy the same space and no screen size needs its own breakpoint. A row with
more cards than fit scrolls sideways; the page itself never scrolls.

Verified at 1280x720: table exactly 720px tall, both halves 313px, zero
overflowing rows, `document.scrollHeight === innerHeight`. Row positions confirm
the mirror - Salty Mike's hand at y=39 and creatures at y=227, Deadly Donny's
creatures at y=409 and hand at y=596, rails at x=879 and x=13 respectively.

### Card art

Every non-token fixture now carries `scryfallId` - 815 of them, stamped in bulk
by `tools/scryfall-report/add_scryfall_ids.py` from the oracle bulk file. The
two misses are the Soldier and Saproling tokens, which correctly have no card
row.

**No images or image URLs are stored in this repo.** Every Scryfall image URL is
derivable from the id, so `cardArt.ts` builds it and the browser fetches from
Scryfall's CDN - the board uses `art_crop` (we draw our own frame, because it
has to show live P/T, counters and combat state), the detail panel `normal`.
A card with no image, offline or a token, falls back to the text box it was.

Art is chosen **per deck**, not per card: `SavedDeck.artOverrides` maps our card
id to a chosen Scryfall printing id, and an `ArtOverridesByPlayer` context keys
those by seat so both players see their own choices in the same game. The deck
builder's `ArtPicker` fetches `?unique=prints` on demand.

See [docs/CARD-ART.md](docs/CARD-ART.md) for the storage numbers, the
representative-printing question, and why choosing the default clears the
override rather than storing it.

**Verified this session:** all 17 board images loaded from the CDN; hovering
Ankle Biter showed its full card image plus rules in the detail panel; playing a
Plains moved it to the lands row and re-derived the castable highlight; the art
picker listed 63 printings of Lightning Bolt and persisted the LEA one; and a
hotseat game where one deck chose the Alpha Mountain showed `eace2c85...` on
Deadly Donny's side against the default `c49d378e...` on Salty Mike's, same
card, same game. 270 tests, typecheck clean.

## Motion: cards that travel (2026-08-02)

Aiming at the 5 mark on the polish scale (0 = where this started, 10 = MTG
Arena). The gap left after sound and colour was that **cards teleported**: the
game state said a card had moved and it simply appeared somewhere else.

### Cards fly between zones

`flight.ts` / `useCardFlight.ts` / `CardFlightLayer.tsx`.

Measurement, not instrumentation. Every card publishes `data-card-instance`,
`data-card-zone` and `data-card-owner`; after each render every card on screen
is measured, and any card now reporting a different zone from last time is known
to have moved and - crucially - where from and where to. A copy is flown between
those two points in a fixed overlay while the real card stays hidden underneath.

The engine therefore never has to tell the UI that a card moved. Anything that
changes a card's zone animates for free, including effects nobody has written
yet. Three deliberate choices in the diffing (`planFlights`, 11 tests):

- Same-zone moves are ignored, or the whole hand would slide sideways every
  time one card left it.
- A card appearing in **hand** with no previous position came off the top of the
  library, so it flies from the library pile - which is why the rail now draws
  one (a card back and a count; the count is real information anyway).
- A card appearing anywhere else has no honest starting point (a token being
  made, something put onto the battlefield from a library) and just appears.

**The overlay is not decoration.** Rows are horizontal scroll containers, so a
card animating out of one is clipped at its edge the moment it leaves.

The real card is restored by a `setTimeout`, deliberately not by the animation's
completion callback. A tab that isn't compositing issues no animation frames, so
an animation there never finishes and never fires its callback - hanging the
"put the card back" step off it would leave cards permanently invisible in
exactly the case where the animation was invisible anyway. It degrades to "the
card appears without travelling".

### One composed transform per card

Cards can now be tapped, attacking, hovered and flinching at once, and each
wants to move them. Written as separate `transform:` rules the last match wins
and the rest silently vanish - the same class of bug that stopped tapped cards
turning for the project's entire life. They are now four CSS custom properties
(`--tilt`, `--lunge`, `--hover`, `--nudge` plus `--zoom`) composed in one place.

- Attackers lunge 14px towards the centre line, blockers 7px, mirrored for the
  flipped side.
- Hovering lifts 6px and scales 1.09 - reading a card is still the detail
  panel's job, this is for picking one out of a crowded row.
- A creature taking damage flinches. `--nudge` is registered via `@property` so
  it can interpolate; `.card` also declares its own `--nudge: 0px`, because
  without that fallback a browser lacking `@property` support would leave the
  variable empty, invalidate the whole composed transform, and take the tap
  rotation down with it.

Rows gained `padding: 26px 0; margin: -26px 0`. A container that scrolls on one
axis clips on the other, so the padding pushes the clipping edge clear of the
cards while the matching negative margin gives flexbox exactly that much more
height to spend on it - cards stay the size they were. 26px is the worst case
added up: a hovered attacking creature rises just over 24px.

### Table surface, phase beats, life numbers

- The board is a lit surface - radial falloff, inner shadow, a faint crosshatch
  weave, and cards casting a shadow onto it. All gradients: no images, nothing
  fetched, nothing anyone else owns.
- `TableBeat` announces the two moments where control comes back to a player and
  what they should be thinking about changes: the turn, and combat. Not every
  step - with auto-pass the step can change four times in a second.
- A life change floats the amount (`-7`) out of the total, not just a colour.

### Verified this session (both modes, per the standing rule)

Bot mode: flights captured for all four journeys - library to hand (from the
library anchor, scale 0.696), hand to lands, command zone to stack, stack to
battlefield - each with its destination card hidden mid-flight and none left
hidden afterwards.

Hotseat: Isamaru attacking **and** tapped measured at 9 degrees rotation *and*
a -14px lunge simultaneously, which is the composition that was impossible
before; Tifa blocking at +7px on the flipped side; the flinch fired on Isamaru
taking 1 damage; the life total floated `-2`; and Tifa dying flew to the command
zone. Deck builder unaffected (150 art strips, correct 279x46 band).

Two bugs found and fixed in the browser, both in `TableBeat`:
1. "Combat" came up and never left. React runs the previous effect's cleanup
   before the next effect body, so the early-return path was cancelling the
   pending hide without scheduling a replacement. The timer now lives in a ref.
2. The turn banner replayed after every combat, because a single "last
   announced" value meant combat overwrote the turn and the turn then looked
   unannounced again. Tracked separately per kind now.

288 tests, typecheck clean.

## Motion: the two-click decisions, and rows that close up (2026-08-02)

Second half of the push from 5 to 6 on the polish scale.

### Rows never scroll

`fan.ts` / `CardRow.tsx`. When a row runs out of width the cards slide over
each other by exactly enough to fit, the way a real hand does. A row that grew
a scrollbar was the most spreadsheet-like thing left on the table, and it hid
half the board behind a scroll nobody thinks to use mid-game.

`overflow-x: clip` with `overflow-y: visible` is the one pairing that clips one
axis and leaves the other alone - `auto` on either axis silently forces the
other to `auto` too, which is what used to slice the top off a card lifting on
hover. That also retires the padding/negative-margin trick from earlier today;
it is no longer needed.

The card width is deliberately measured **one pixel too wide**. Neither obvious
measurement is both exact and usable: `getBoundingClientRect()` measures after
the transform, so a tapped card reports the box of a rotated card and the row
closes up more than it needs to; `offsetWidth` ignores transforms correctly but
rounds to a whole pixel, and that error is *per card* - eight cards each
under-measured by a quarter-pixel had the row overshooting its own width by two,
which `overflow: clip` then shaved off the last card. Rounding up instead means
the row always closes up very slightly more than strictly needed and can never
be left clipped. Verified: eight cards wanting 540px closed into 322px inside a
330px row, with card height unchanged.

### Targeting arrows

`TargetArrow.tsx`. Two moments ask you to click one card and then another -
choosing a target for a spell, and pairing a blocker with its attacker - and
both were mute once the first click had landed. The prompt in the action bar
explained the mechanic but nothing on the board connected the two halves.

A bowed line now runs from the card you picked to the cursor: gold for
targeting, blue for a block. Both ends are recomputed on every mouse move
including the source, because the board moves under you while you are choosing
and an arrow anchored to where a card used to be looks broken in a way that is
hard to attribute. Deliberately not throttled through requestAnimationFrame - a
tab that is not compositing issues none, and the arrow would simply never
appear.

### Smaller things

- Flights are coloured by what the journey *means*: a spell leaving the stack
  has resolved and glows on the way out, a card heading for a graveyard dims,
  exile goes pale. Otherwise a creature dying and a land being played look
  identical. Verified: casting a creature produces a plain hand-to-stack flight
  followed by a `flight--resolving` stack-to-battlefield one.
- Damage floats the amount off the creature, not just a red flash - 1 damage on
  a 4/4 and 3 on a 3/3 were the same flash before. A creature still carrying
  damage keeps a marked border.
- Cards respond to being pressed, between the hover pose and no pose at all.
- The stack overlaps into a pile rather than sitting in a neat row, so "two
  spells are waiting" reads without checking the count.

### Verified this session

Blocker arrow measured starting exactly at the chosen creature's centre
(515, 294) and ending at the cursor (640, 260), correctly classed
`arrow--block`, blue, `pointer-events: none`, and gone the moment the block was
assigned. The pressed pose composes with the tap rotation (9 degrees kept,
scale 1.03). Six turns of play with no console errors, no cards left hidden,
and the page never scrolling.

295 tests, typecheck clean.

**Not attempted, and worth saying so:** cards in hand do not fan in an arc.
Rotating them would make every card's bounding box wider than the card, and the
flight animation measures those boxes to work out where a card is travelling
from - so the arc would quietly degrade card movement to buy a static flourish.
Worth doing only alongside a transform-independent way to measure a card.

## Opening hands, and a board that stops moving (2026-08-03)

Six things from a real play session.

### The London mulligan

`packages/engine/src/mulligan.ts`, 17 tests. You always draw seven; if you
don't like them you shuffle all seven back and draw seven more, but each time
you do you owe one card from the hand you finally keep to the bottom of your
library. **This is the current rule and not the older one people remember**,
where each mulligan drew one card fewer - the difference is that you now see
seven and then decide which to lose, which is why there is a second "choose
what goes back" step at all.

Players are taken one at a time. The real rule has everyone decide together
each round, which matters in a four-player pod where you might read the table;
in a two-player game it deals identical hands and is far easier to put on one
screen.

It is **opt-in at game creation**. Every headless test and bot-vs-bot run
wants a game already under way, and all of them would otherwise have to answer
a prompt before asserting anything. The client and server turn it on.

The overlay is deliberately the largest thing in the application: there is no
board yet, the seven cards are the whole decision, and two people sharing a
screen have to read them from a normal sitting distance.

The bot decides its own, on land count - below two or above five it ships the
hand back, with the window widening as the hand shrinks, and it stops being
fussy by the time it would be keeping four. Bottoming sheds surplus lands
first, then the most expensive spells.

### Rule 103.7a, uncovered by the above

The player going first now skips their draw on turn one. This was a documented
simplification that had never mattered, because a hand of eight looks much like
a hand of seven when nobody has counted. The mulligan made it glaring: keeping
six and then finding seven cards in hand reads as the mulligan being broken.

### A bot action that nothing performed

`useBotOpponent`'s `perform` switch had no case for `resolveSearch`, and when
the mulligan actions were added it had none for those either. A switch that
just ends drops the action silently, so the bot decided to keep, nothing
carried it out, and the game stopped dead at the first untap step. The same was
already true of tutors: a bot that drew one would have hung identically.

The switch now assigns to `never` in its default branch, so the build fails the
next time a bot action is added without being wired up.

### The board stops moving

- **The centre strip is a fixed 58px.** It used to hold the stack, so every
  spell cast or resolved changed its height and moved both boards - a constant
  flicker through the busy part of a turn. Measured across six turns of play:
  one height, 58, and the lower board's top never moved off 410.
- **The stack moved to the sidebar**, always present, showing "Nothing waiting
  to resolve" when empty. Reserving the space is the point - a panel that comes
  and goes is the same flicker. Cards in it are 110px rather than 76px, because
  reading what is resolving is why it exists.
- **The card detail can no longer be squeezed by the log.** The log was
  `flex: 1 1 auto`, and `auto` bases a flex item on its own content - so every
  line added made it ask for more room and the detail gave it up, until the
  card you were hovering was a sliver. Basing the log at 0 makes it take only
  what is left. Verified by piling 250 lines into the log: the detail held at
  exactly 383px with the card image at 288px.

### The mat

- **Lands and other permanents moved beside the hand**, at 58px, in the space
  that was standing empty there. They each had a full-width row before, which
  squeezed the creature row - the one you actually read during combat - into a
  third of the half. Creatures now get the larger share.
- **Row labels are gone.** Nobody playing Magic needs to be told which of their
  cards are creatures, and CREATURES / LANDS / HAND took horizontal space on
  every row to say it. Each zone is a tinted patch of the mat instead - blue
  for hand, green for lands, purple for other permanents, warm red for
  creatures - which is what a printed playmat does.
- **The weave is roughly three times as visible** (0.055 from 0.016).

314 tests, typecheck clean. Verified in both bot mode and hotseat: a two-card
mulligan left Donny on five with 94 in his library, Mike on seven with 92, and
the starting player correctly did not draw.
