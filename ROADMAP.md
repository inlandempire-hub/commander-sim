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
- ~~Combat is simplified to one blocker per attacker; no first strike/double strike/deathtouch damage-step interactions yet.~~ **Resolved.** Menace (2026-07-30) reworked `dealCombatDamage` for any number of blockers per attacker, and First/Double Strike added a real `first-strike-damage` step to the turn sequence, inserted only when a combatant has it. Deathtouch is handled as a state-based action.
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
- [ ] UI pass so it reads as a real digital card game - **in progress, roughly 9/10** against the agreed scale, which is restated properly under "What 9 and 10 actually mean" below (the old shorthand of "10 = MTG Arena" was never reachable without a game engine and was not what the scale was measuring). Everything listed for 8 and for 9 is done as of 2026-08-06 - see "The push to 8" and "The push to 9". What 10 needs is written out there; it is a short list and none of it is animation.
- [x] Auto-skip priority passes when there's nothing meaningful to do - DONE (2026-07-30). See "Auto-pass + turn-sequence rules fixes" below.

## Ongoing (never "done")
- [ ] Expand the implemented card pool, one card (or small batch) at a time, classified as vanilla/scripted/weird (see CLAUDE.md). **Use `tools/scryfall-report/output/commander_card_report.xlsx` to pick batches** (see below) instead of browsing the card pool ad hoc.
- [x] Target: ~50 basic lands per deck - DONE (2026-07-30), see "Mono-color rebuild" below. Land counts dropped from 84/99 and 93/99 to 44/99 and 47/99. Still above a textbook ~38/99; revisit again once each color's nonland pool grows further.
- [ ] Revisit continuous-effect layers as cards demand more precise handling
- [ ] Decide later whether to support 3-4 player pod Commander (engine core should already be player-count-agnostic per CLAUDE.md)
- [ ] Decide later whether to support additional formats beyond Commander
- [x] **First Strike / Double Strike** - DONE. A real extra `first-strike-damage` step in `turn.ts`'s TURN_SEQUENCE, skipped by `shouldSkipCurrentStep` unless `combatHasFirstStrike` finds a combatant with either keyword, so a combat without one is unchanged.
- [x] **Menace** - DONE (2026-07-30). See "Flash, Menace, Ward" below - `dealCombatDamage` now handles any number of blockers per attacker.
- [x] **Ward** - DONE (2026-07-30), with a documented simplification (auto-pay from floating mana only, no opt-out choice). See "Flash, Menace, Ward" below.
- [x] **MTGA-style opt-in auto-pass preferences** - DONE. `packages/client/src/stops.ts` plus the Stops panel (`StopSettings.tsx`): per-step stops the player chooses, and a Full control switch that stops at every step. The layer on top of the forced auto-pass shipped 2026-07-30, exactly as scoped.

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
source makes the deck's one colour, so greedy is optimal. A cost carrying
several hybrid symbols would need proper solving; one is handled exactly.

It also cannot plan a mana ability that itself costs mana - Twilight Mire, the
filter lands. Those are simply not counted, which undercounts a player's mana
rather than overcounting it, so the failure is a spell not offered rather than
one offered and then unpayable. Activating them by hand works.

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

## Six fixes from the second play session (2026-08-03)

### The mulligan, rebuilt

- **Seven cards, one row, never wrapped.** The size is now derived from the
  space available rather than fixed: cards tall enough to read at 250px are
  178px wide, and seven of those plus gaps came to more than the panel was.
  Taking the width, dividing by seven and letting the height follow the 5:7
  ratio cannot overflow by construction. One subtlety cost a round trip -
  `min(1560px, 100%)` looks equivalent to the viewport-based version and is
  not: the percentage resolves against the containing block, the card width is
  derived from it, and the row is sized by the cards, so the width depended on
  itself. The browser resolved the loop by growing the row to 3476px on a
  1280px screen. `vw` cannot be circular.
- **Real printed faces** (`CardFace`), not the board's cropped-art frame. On
  the table a card must show live power/toughness, damage and counters, which
  is why the board draws its own frame; away from the table the opposite is
  true and what you need is to *read* it. That also retires the hover-to-see-
  text problem entirely - the panel that explained a card was behind the
  overlay, which made it useless exactly when it was most needed.
- **The hover pop is no longer clipped** by the heading. The card area was a
  scroll container, which is the same one-axis-scrolls-so-both-clip trap the
  board rows fell into; nothing scrolls now, so nothing clips.
- **Lighter backdrop** (0.88 from 0.94, and warmer). The cards are the point;
  the backdrop should get out of their way rather than compete.

### The mat

- **Lands moved to the left of the hand.** They are what you count and tap most
  often, and reading left to right they come before the hand you spend them on.
- **Lands are much bigger** - 92px rather than 64px, stepping down through 78,
  64, 54 and 46 as the board fills (`landSize.ts`, 5 tests). Stepped rather
  than continuous on purpose: a size that slid a pixel smaller with every land
  played would have the whole area twitching constantly.

  Worth recording *why* they were 64px: renaming the board rows to zones left
  `.row--lands .card--small { height: 100% }` behind, matching nothing. Lands
  silently fell back to the fixed 46px small-card width and stayed there
  regardless of the height they were given. Nothing broke visibly - they just
  never grew - which is exactly the sort of thing a rename leaves behind.

### A spell you can actually see resolve

Most spells here resolve the instant nobody responds, so the stack showed a
card for a single frame and was empty again: a flicker that told you something
had happened without giving you any chance to see what. The last card is now
held for 1.3 seconds afterwards, dimmed and labelled "Resolved" so it reads as
a record rather than as something you could still respond to. In one six-turn
run seven spells were caught this way that would otherwise have been invisible.

That needed a new escape hatch: `data-flight-ignore`, which keeps an element
out of the card-movement system's measurements. Without it the lingering card
and the real one both claim the same instance id, and a flight would measure
whichever the browser happened to return last. Verified across a full game:
zero duplicate claims.

319 tests, typecheck clean.

## Combat that explains itself, a log worth reading, and a way out (2026-08-03)

### Three combat bugs, one cause

All three were the same shape: the engine knew the rule, the interface never
asked, and the answer arrived too late to be shown.

`attackProblem` and `blockProblem` (combat.ts) now hold those checks, and
`declareAttackers`/`declareBlockers` call them rather than repeating them - so
a click is judged by exactly the rule the declaration would apply, in the same
words.

- **Selecting an illegal attacker** silently did nothing, then the creature
  quietly failed to attack. It now refuses and says why: "Knight Errant came
  into play this turn and cannot attack yet."
- **Blocking a flier with a ground creature** was accepted by the interface and
  rejected by the engine at confirm time, so the block just never happened.
  Now: "Nessian Courser cannot block Kitesail Scout - it has flying, and this
  has neither flying nor reach." Reach still blocks fliers.
- **No instant-speed window after blockers.** `handleConfirmBlockers` passed
  priority immediately after declaring - and since one client drives both seats
  in hotseat, it skipped the attacker's combat-trick window silently. Removed.
  Auto-pass already moves on when nothing is castable, so nothing is lost when
  nobody has a play.

Menace is deliberately *not* checked per click: it restricts the whole
declaration ("not by only one creature"), so rejecting the first blocker would
make a legal double-block impossible to build.

### Conceding

Rule 104.3a - legal at any time, no priority needed. A simulator has no way to
say "this is over, let's shuffle up", so without it a lost position has to be
played to the last point of damage or the tab closed. Confirms first, and
clears anything the game was waiting on that player for.

### The log, and the gap it was filling

Log entries are now `{ turn, text }` rather than bare strings. The turn is
carried rather than inferred from marker lines, so the wording and the
filtering are not the same thing.

Only the last three turns are shown, with the oldest dimmed as it ages out.
That let the log shrink to a corner at the bottom right - and the space it
freed is where the **last card played** now lives permanently. The 1.3-second
"resolved" linger added earlier is gone, replaced by simply keeping the card
until another replaces it: the panel is reserved either way and an empty box
helps nobody.

### The command zone has a home

Moved out of the left rail into the column on the right - which already
existed, as padding the width of the rail so "centred" meant centred on the
board. The commander is the one card that always has somewhere to be: it
starts there, it is castable from there all game, and it returns there when it
dies. Shown as a card rather than a rail thumbnail, with "In play" when it is
on the battlefield.

338 tests, typecheck clean. Every item above verified in the browser.

## The push to 8 (2026-08-06)

Four things, which were the four things the 7/10 note listed as standing
between here and 8. Nothing new was invented for this - it is the list being
worked through.

### The hand fans in a real arc

`fan.ts` / `CardRow.tsx`. Overlapping got a hand most of the way there but it
still read as a stack of cards pushed together rather than as a hand somebody
is holding. A real hand pivots around the fist at the bottom: the cards splay
outwards and the outer ones ride lower than the middle one.

Modelled as exactly that pivot rather than as a tilt-per-card lookup. Each card
sits on the rim of a wheel whose hub is three card heights below the row, and
turning card `i` by its angle drops its centre by `radius * (1 - cos angle)` -
the sagitta of that arc. Anything else needs the lift and the rotation kept in
step by hand, and they drift apart the moment either is adjusted. The step
tightens once a hand is big enough that the fan would exceed its total spread,
so a three-card hand and a twelve-card hand bend by the same amount overall.

Opt-in per row, and only the hand asks for it: a battlefield is a table with
cards laid on it, and tilting those would say "held" about something nobody is
holding. The seat at the top of the screen bends the other way, or both hands
curve the same way and the top one reads as sagging.

Hovering straightens a card out of the fan on its way up, and that needed one
piece of care. The measured angles have to be inline - they are per card - and
an inline custom property beats every rule in the stylesheet, so
`:hover { --fan-angle: 0 }` would have done nothing. The cards read the inline
values into a second pair that only the stylesheet ever sets, which puts the
cascade back in charge.

Verified in both modes: seven cards spanning -12deg to +12deg with drops of
8.65px at the ends and none in the middle, mirrored on the flipped seat; six
cards re-fanning to +/-10deg with no card upright; battlefield rows with no fan
properties at all; and a hovered card computing to the identity transform.

### The flight system, unblocked

That arc was listed as *blocked* on the flight system, and this is why.
`getBoundingClientRect` measures what is drawn, and what is drawn is now often
rotated. The rectangle it returns for a rotated card is the upright box that
*contains* it - for a card leaning 12 degrees, 119.7x148.7 instead of 94x132 -
so a flight aimed at one arrived off centre and scaled itself against a size
the card never actually has.

`offsetWidth`/`offsetHeight` are the layout box and ignore transforms entirely.
The position is recovered from the centre, because every transform on a card is
composed about its centre, and rotating a box about its centre leaves that
centre where it was. Translation deliberately survives: a card that has lunged
into combat really is somewhere else.

This also quietly fixes tapped cards, which have had the same problem since
they started rotating. Verified: a tilted hand card measured 119.7x148.7 the
old way and 94x132 the new way, with its left corrected by 12.8px, while an
upright card in the same row measured identically both ways.

### A tuned motion scale instead of chosen numbers

`motion.ts`, plus custom properties in `styles.css`. Every duration and curve
in the client used to be chosen where it was written - 0.16s here, 0.14s there,
`ease` on almost everything. Individually each was defensible; together they
were not a system, and a card lifting under the cursor eased the same way as a
life total falling.

Five durations, picked by what the motion is for. Perception is the constraint,
not taste: under about 100ms a change is not seen as movement at all, only as a
jump, and over about 250ms a small change starts registering as a wait. So
poses live at 150ms, a control answers a click in 70ms, and the long ones are
long because something has to be *read*.

Four curves, and **every one decelerates**. This is the change that is actually
visible. CSS's default `ease` accelerates and decelerates about equally, which
suits something passing through and suits nothing here: a card arriving in a
zone, a hand lifting, a life total settling are all objects coming to rest.

The scale is duplicated - as numbers in `motion.ts` for the parts that animate
from JavaScript, as custom properties for the stylesheet - because CSS cannot
import a module and writing the stylesheet from JavaScript at boot would be
worse. A test parses `styles.css` and fails the moment the two drift apart,
which is the whole risk the duplication carries. Two things sit outside the
scale on purpose and say so in place: the phase banner, which is an
announcement rather than an object and has to hold long enough to be read; and
the mana pip, the one accelerating curve on the table, because a pip is not
arriving anywhere - it is being pulled into the pool.

### Spells resolve with a flourish of their own

A resolving spell already threw off motes. What was missing was the spell
*going off*: a counterspell, a creature spell and a board wipe all left the
stack identically, and the only place the difference showed was the log.

Three things now happen together, all from the same colour - the card's own,
taken from the pips its controller actually paid. A ring is thrown out from
where the card sat (a new `shockwave` burst: evenly spaced around the circle
rather than scattered, because a shockwave with gaps in it reads as a scatter
that happened to be circular), the motes drift after it, and the card itself
flares white-hot as it leaves and cools on the way. The flare is filter and
opacity only, never transform - that belongs to Framer Motion, which is flying
the card across the table.

Verified by recording what the particle canvas actually drew: 661 arcs for one
resolution, every one in `#f4efd8`, which is the white mana colour and the
colour of the {1}{W} creature that resolved. Before this they would all have
been the same fixed blue.

### Damage prevention is a real shield

Healing Salve's second mode reads "prevent the next 3 damage that would be
dealt to any target this turn" and was implemented as +0/+3 on a creature. That
was an approximation in two directions at once: it could not protect a player
at all, and extra toughness is not prevention - it does not stop deathtouch, it
still feeds the attacker's lifelink, and it stacks with a -N/-N instead of
being irrelevant to one.

The engine now has a shield, on creatures and on players, spent by the next
damage that arrives and cleared in cleanup. The part that made this worth doing
properly is `damage.ts`: **one place damage is actually dealt**. Before it,
damage was applied by whoever happened to be dealing it - `applyEffect` for a
burn spell, `dealCombatDamage` in four more places for unblocked attackers,
blockers, trample and first strike. That was survivable while nothing could
interfere with damage. A shield that stopped burn spells but not an attacking
creature would be worse than no shield at all.

Routing everything through one function also fixed a latent inaccuracy nobody
had hit yet: lifelink and commander damage were computed from the source's
power rather than from the damage actually dealt. Both now key off what landed.

Thirteen tests, covering each path damage can arrive by: a burn spell, an
unblocked attacker, a blocker, trample, commander damage, deathtouch, and the
cleanup step. One of them guards the fixture itself, so it cannot quietly go
back to being +0/+3.

Both shields are shown - "shield 3" under a life total, "(shield 2)" beside a
creature's power and toughness. A prevention effect that is invisible until it
silently eats damage is the worst way for a rules effect to work: you would
only find out it had been there by the number not moving.

### What was left for 9

All four done the same day - see "The push to 9" below. Kept here as the record
of what 8 was missing: the fan not parting around the cursor, the stack not
reading as a pile, thin sound, and a turn that changed hands without saying so.

483 tests, typecheck clean. Every item above verified in the browser, in both
bot mode and hotseat.

## The push to 9 (2026-08-06)

The four things the 8/10 note listed. As with the push to 8, nothing new was
invented - the list was worked through.

### The hand parts around the card you are looking at

`openAround` in fan.ts. Hovering already lifted a card and straightened it out
of the fan, but its neighbours stayed exactly where they were, so in a crowded
hand the card you were trying to read came up still half-buried under the one
next to it. What a person does is push the neighbours aside with their thumb.

The push is largest for the card immediately beside the hovered one and decays
from there - the gap opens locally and closes up again further out, rather than
shoving the whole row sideways.

It decays to **exactly** zero at each end, and that is not a nicety. A crowded
row is precisely as wide as the space it has and clips at its edges, so a card
at the end that moved even a few pixels would have those pixels shaved off it.
Measured before the taper was added: hovering the middle of a seven-card hand
pushed the last card 7.34px past the edge. Each side tapers against its own
end, because the hovered card is rarely in the middle.

The taper applies only when the row is actually crowded - a row that is not
overlapping has slack, cannot be clipped, and is free to spread.

**A bug this turned up.** Measuring the overhang showed the end cards were
*already* being clipped by 10.3px, and had been since the fan shipped an hour
earlier: a card rotated 12 degrees paints about 13px outside the box it was
laid out in, and the row had no room for it. Fixed with horizontal padding on
fanned rows - `overflow: clip` clips at the padding edge, so padding is space a
card can paint into but not be laid out in - and by subtracting that padding
before computing the overlap, since `clientWidth` includes it. Verified after:
3.7px of clearance on both sides, identical whether or not anything is hovered.

### Sound with a body

`sound.ts`, rewritten. The old version was one oscillator per cue with a fixed
twelve-millisecond fade at each end. That is a *beep*, and a beep is what makes
a game sound cheap however good it looks. A card landing on a table is not a
sine wave.

Still nothing bundled and nothing downloaded - same posture as the card art.
Three things separate this from the old version, none of which need a sample:

- **Cues are layered.** Real sounds have a transient, a body and a tail. A card
  being played is mostly transient and was the worst served by one oscillator.
- **Noise is a first-class voice.** Paper, impact and scrape are noise through a
  moving filter, not a tone. The card cue has no oscillator in it at all now;
  the old triangle-wave blip was the single most toy-like sound in the game.
- **There is a room.** A short feedback delay under everything, sent low, so
  cues have somewhere to decay into rather than stopping dead. A real reverb
  needs an impulse response, which is a file, so this is the cheap version -
  and the cheap version is most of the effect. A compressor sits after it,
  because four creatures taking combat damage is four cues inside a tenth of a
  second and the sum used to clip.

Two new cues. **Shield**, for damage that was prevented: the previous behaviour
was to play the *impact* sound, because the log line contains the word
"damage" - which said the exact opposite of what had happened. It rises where
the damage cue falls. And **turn**, a rising fifth over a low swell, played
directly by TableBeat rather than off the log, because the log's turn marker is
a heading rather than an event.

The cue specifications are now data and are tested: every voice under a gain
ceiling (a typo of 0.5 for 0.05 is genuinely painful through headphones, silent
in review, and obvious only to whoever is wearing them), every cue under a
duration ceiling, no frequency sweeping to zero (which throws at runtime and
would take out the whole cue), and every attack shorter than its own voice.

### The stack reads as depth

Each entry now steps back from the one above it - in from the left, a little
smaller, a little dimmer - and the top one is lit and labelled "resolves next".
A flat column of identical rows is a list, and a list of two spells makes you
read both to work out which happens first; this says which one happens first
before you have read either. Every step is clamped at four, so a deep stack
cannot indent itself off the panel or fade to nothing. A spell you are about to
counter comes back to full size on hover, because by then the depth cue has
done its job.

### The turn changing hands

The turn beat used to read "Turn 3 - Deadly Donny" in the middle of the screen,
which is a caption rather than a handover: it named the state the game had
arrived in, with nothing to say that anything had *passed* from one side of the
table to the other.

Three changes saying the same thing in three registers. The banner arrives from
the side of the table whose turn it now is, so the movement carries the
direction. It leads with *whose* turn rather than with the number - "Your turn"
when the seat is yours, the player's name when it is not, and never "your turn"
in hotseat where both seats are yours and it would be true every turn. And the
half of the table taking the turn lights up once as it arrives, distinct from
the steady edge that says whose turn it is.

**A bug this turned up.** The first version skipped the flash the first time
each board saw itself become active, meaning to skip the game opening. But each
side becomes active for the first time on a different turn, so it swallowed the
opponent's opening turn as well - the near seat lit up on its turns and the far
seat never did. Caught in the browser by sampling the class over twelve turns.
It now skips turn one specifically, which is what was meant.

## What 9 and 10 actually mean

The original shorthand was "0 = where this started, 10 = MTG Arena", and that
was never a usable ceiling: Arena is a game engine with a full-time art team,
and CLAUDE.md says explicitly that this does not need to match it. What the
scale has really been measuring, in retrospect:

- **8 - nothing on the table is *missing*.** Every state change has a visible
  cause and a visible result. Nothing pops into existence or vanishes.
- **9 - nothing on the table is *inert*.** Things react to each other rather
  than only to the game state: the hand parts around your cursor, the stack has
  an order you can see, the turn is handed over rather than merely reassigned,
  and the audio has a body rather than a pitch. Reached today.
- **10 - nothing on the table is *unfinished*.** Not more motion. Consistency:
  every surface holding the same standard, every control being a designed
  object, and the whole thing holding up under conditions that are not the one
  window size it was built in.

### What 10 needs

**Revised 2026-08-07.** Three of the four below were closed by the user, not
because they were done but because they buy nothing here: this is a private tool
for two known people on similar desktop screens, so window-size tuning and
keyboard access are solving for users who do not exist, and reduced motion is
covered well enough by the motion and effects switches that already exist. They
are struck through rather than deleted so nobody re-derives them as gaps.

The fourth, the deck builder, stands - but it is **blocked rather than
outstanding**. The implemented pool has almost nothing a real deck would want,
so the builder currently sees no use at all, and polishing a surface nobody
opens is the wrong order. Growing the card pool comes first; see "Why the pool
has no staples" below.

Four items, and deliberately none of them are animation:

- [ ] **The deck builder brought up to the table's standard.** It is the one
      surface that still looks like a form: native selects and checkboxes,
      default focus rings, no felt, none of the raised controls. **Blocked, not
      deferred** (2026-08-07): the implemented pool has nothing a real deck
      wants, so the builder sees no use at all today. Card pool first.
- [x] ~~**Every window size, not just this one.**~~ **Closed 2026-08-07, not
      done.** Two intended users, both on similar desktop screens. Revisit only
      if that changes.
- [x] ~~**Reduced motion as an equal path, not a stripped one.**~~ **Closed
      2026-08-07, not done.** Judged overkill as customisation: the on/off
      switches for motion and effects are all that is wanted here.
- [x] ~~**Keyboard and focus.**~~ **Closed 2026-08-07, not done.** Both users
      have a mouse or a trackpad.

Everything above is work on surfaces that already exist rather than new
systems, which is what makes it the last stretch rather than another phase.

505 tests, typecheck clean. Every item verified in the browser in both bot mode
and hotseat.

## Printed symbols, a hidden opponent, and one mode fewer (2026-08-06)

Seven things asked for in one pass, plus a bug that fell out of one of them.

### Mana costs are symbols

`manaSymbols.ts` and `ManaCostView.tsx`. `{3}{B}{B}` is how Magic writes a cost
down in prose; it is not how a card shows one, and on a card face it is both
longer and slower to read than the pips it stands for. Three black pips read as
"three black"; the braces version has to be parsed.

The icons live in `packages/client/public/mana/` and are gitignored along with
the card backs, same posture as the Scryfall art. That makes "no icons on disk"
a real state rather than a defensive one, so the fallback matters: if any single
symbol fails to load, the *whole* cost reverts to braces text in one go. Half
pips and half text cannot be read at all, and the flag is per cost rather than
per pip because they either all shipped or none did. Verified by renaming the
folder: eleven costs on the board, eleven fallbacks, no broken images.

**The reported bug this fixes.** Names were being cut off by their costs. The
header is a flex row, and `overflow: hidden` on the name set its automatic
minimum size to zero - so a five-symbol cost was free to squeeze a long name
down to a few characters. The fix is a priority inversion: the cost now holds
its width and the name gives way, because a cost is one to six fixed glyphs and
cannot be abbreviated while a name has a two-line clamp and an ellipsis. The
cost is capped at 46% of the header so it can never be the thing that squeezes
the name out; past that the pips wrap to a second row, which only four or more
of them can reach. Measured after: a three-pip cost sits on one row at 32px
with 46px left for the name, and no name in a seven-card hand truncates.

### Hotseat is gone

It could not work. Magic is a hidden-information game and one screen has one
pair of eyes on it: either both hands are face up, in which case neither player
can play honestly, or the screen is handed over and re-hidden every turn.
Everything hotseat existed for - playing a deck you built, testing something
quickly - bot mode does, against an opponent that cannot read your hand either.

So there are two modes now, bot and network, and bot is the default with no
parameters at all. Every seat that is not yours draws its hand face-down: a fan
of card backs rather than a count in a corner, because how many cards they are
holding is something you read constantly and seven backs in an arc say it
without you counting anything. It carries the same `.card` class as a real one,
so the fan, the overlap and the row's height all work on it unchanged.

**A bug this turned up, and the reason the change was worth more than it
looked.** The flight layer renders the real card for the length of a flight,
and a draw is a flight from a library into a hand. So the hand was face-down and
every card entering it was face-up on the way there - in bot mode, where one tab
holds both seats' state, that showed you the bot's entire hand one card at a
time. Flights into a hand you may not see are now drawn as a back. Caught by
watching every flight over twenty-five seconds of bot play and recording whether
each was face-up and whose it was.

### Dealing the opening hand

The mulligan overlay closed and seven cards were simply *there* - the one moment
in the game where nothing had moved to put them in your hand. They now arrive
one at a time from the left, 130ms apart, about 1.1 seconds for a full hand.

It animates four variables rather than `transform`, because a card's transform
is composed from every pose it is in at once and a keyframe setting `transform`
directly would throw away the fan tilt for the length of the deal and snap it
back at the end. The four are registered with `@property` so they interpolate;
unregistered custom properties jump from one value to the other halfway
through, which would be seven cards blinking into place rather than a deal.

Triggered off the mulligan ending rather than off the hand filling up: hands
fill and empty constantly and only this once is it a deal.

### Everything slower

The motion scale widened by about a fifth (press 70 to 80, pose 150 to 190,
travel 380 to 460, strike 420 to 500, linger 900 to 1050), and the bot's gap
between actions went from 450ms to 800. Every duration was inside its band but
at the fast end of it, and a bot turn is a dozen or more actions - untap, draw,
land, spell, attack, pass, pass - which at 450ms went past faster than you could
see what it had done. `?delay=` overrides it either way.

### Pass and Concede

The player's name came off the pass button: this client only ever acts for one
seat, so "Pass / Deadly Donny" was telling you who you are on every turn of
every game. Both buttons went to caps, 800 weight and 15px/14px from 12px
semibold sentence case. They are not form controls; they are the physical keys
you hit between fifty and two hundred times a game, and at a glance across the
table you should be able to tell PASS from END TURN from CONFIRM ATTACKERS
without reading any of them.

### Sound removed

`sound.ts`, its tests, the cue wiring, the mute button and the log-driven
dispatch are all gone, on the user's call. It was synthesised from oscillators
and filtered noise, and no amount of layering makes that sound like a card
hitting a table; the cues had become sound for its own sake. It is recoverable
from git history if it ever earns its place back - which would mean real
recordings, not more oscillators.

503 tests, typecheck clean. Verified against the bot in the browser: the deal
staggers 0, 130, 260, 390, 520, 650, 780ms across seven cards; the opponent's
hand is seven backs and zero real cards; the bot's draws fly face-down; costs
render as pips everywhere and fall back cleanly to braces with the folder
renamed away; and the page scrolls in neither direction.

## Real foley, a deck you can see, and a font lab (2026-08-07)

### Sound, from recordings

The synthesised version was deleted yesterday because no amount of layering
makes an oscillator sound like card stock. This one is Kenney's **Casino Audio**
pack - CC0, 29 files, 269KB - and it is **committed**, unlike the card art, the
mana symbols and the fonts. That is not an inconsistency: CC0 is public domain
and ours to redistribute, so there is no reason to make a fresh clone go and
find it. The licence sits beside the files.

Three things separate a sample library from a soundboard, and all three are in
`sound.ts`:

- **Variants.** Most cues have several takes and never play the same one twice
  running (`pickIndex`, and the no-immediate-repeat rule is tested exhaustively
  rather than sampled). Dealing fires seven times in a second, and one take
  seven times is a machine gun whatever the recording is.
- **Detune.** Every play is nudged a few percent in speed. Even across eight
  takes, exact repetition is what gives a library away.
- **A voice cap.** Six concurrent at most. Four creatures taking combat damage
  is four cues inside a tenth of a second and the sum used to clip.

Cues are still picked off the log, so anything the engine learns to describe
gets a sound without a call site. The order in `cueForLogLine` is load-bearing
and the test says so: "3 damage to Deadly Donny prevented" contains the word
"damage", and getting that wrong once meant prevented damage played the sound of
a hit.

**What this pack does not cover, stated plainly.** It is card and casino foley.
There is nothing in it for a sword landing, so combat damage borrows a poker
chip clack - an impact of roughly the right length and weight, and not the sound
of a creature being hit - and `attack` has no cue at all rather than a faked
one. Kenney's RPG Audio pack (also CC0, ~940KB) fills both, and the manifest is
one object.

### The rail, and a deck you can see

The library was 46px wide in a 132px column with a stack of dead rail above it,
which was fine when it was a drawn placeholder and absurd once it carried real
artwork. Graveyard and exile moved to a row above it and the deck took the
width: **82x115 rather than 46x64**, about three times the area, with the count
scaled to match.

Sized by measurement, not by preference. The first attempt used the full rail
width, which is 122px and 171px tall, and that ran the rail 24px off the bottom
of a 720px window. The second used flexbox to take whatever was left, which
collapsed - `margin-top: auto` on the piles absorbs the free space *before*
flex-grow gets it, so there was nothing to grow into. The third measured what
is actually spare (134px below the concede button) minus one commander-damage
row (19px), which is 115px of card, which is 82px of width. It holds with a
damage row injected, on both seats.

It is a fixed number rather than a share of the rail on purpose: the concede
button is pinned relative to the piles block, and the whole point of that pin is
that the button which ends the game does not drift down the rail as the game
goes on. A flexible library would unpin it.

### The font lab

`?mode=fonts`. Ten families, two targets, live preview, saved choice.

The two targets are separate because they are different jobs. The buttons are a
control hit two hundred times a game at 14-15px in a 132px column, where legible
beats characterful. The combat banner is one second at 40px across the middle of
the table, which is exactly where a display face earns its keep. A font that is
right for one is very often wrong for the other.

Three decisions worth recording:

- **The previews are the real components.** `.action-bar__go`, `.concede` and
  `.beat` off styles.css, at their real sizes, on their real backgrounds. A
  specimen in a neutral box at 32px tells you nothing about whether "Confirm
  attackers" fits a 132px column.
- **The banner holds still.** In a game it arrives, sits for about a second and
  leaves, which is long enough to notice and nowhere near long enough to judge a
  typeface. `lab__beat-held` changes exactly two things - it un-fixes the
  position and stops the animation - so everything visible is the shipped rule.
- **Faked weights are called out.** A browser asked for bold with no bold file
  smears the outlines and asked for italic it shears them; both look plausible
  at display size and wrong at 14px. So the catalogue records what each family
  genuinely ships, choosing a family snaps the weight onto something real, and
  the lab says which of the two you are looking at.

The join between the lab and the stylesheet is four CSS custom properties per
target, and it fails silently when it breaks - no error, no warning, just a font
that did not change. So a test asserts both ends against each other: every
property the lab writes is consumed by styles.css, and every one has a fallback
so a cleared preference is the old table rather than an unstyled one.

The font files are gitignored. They arrived with a mix of OFL and 1001fonts
personal-use terms, and whether a given one can be committed is a question to
answer for the font that actually gets chosen rather than for all ten.

555 tests, typecheck clean. Verified in the browser: every sample fetches and
decodes to real stereo audio; the deal fires seven slides on the near seat only;
the library measures 82x115 on both seats and survives an injected
commander-damage row without the rail scrolling; and choosing Manuale in the lab
snapped 800 to 700, applied italic live, saved, survived a reload and reached
the Pass and Concede buttons on the table.

### A volume slider (2026-08-07)

Beside the sound switch in the header, and only there when sound is on - a
volume control on a muted game is a control that does nothing, and the first
thing anyone does with one of those is drag it and conclude the audio is broken.

It moves the master bus, not the per-cue balance, so turning it up makes the
whole table louder without a chip clack suddenly drowning a card being played.
The bus tops out at 0.9 rather than 1: every cue already has its own gain tuned
against the others, and the headroom is what lets several landing together
compress instead of clip.

Two details worth the words. The gain is *ramped* (`setTargetAtTime`, 30ms)
rather than assigned, because a gain node jumping mid-sample clicks and dragging
a slider is dozens of jumps a second. And letting go plays a card, since the
only way to judge a level is against the thing it applies to.

Reading the stored level is deliberately forgiving, and the one case worth
naming is the empty string: `Number("")` is 0, which is perfectly finite and
would silently mute the game - a bug nobody thinks to look for, where a game
that is louder than expected is obvious in a second. That path got tested for
real rather than only in a unit test, because a failed experiment in the console
left exactly that value in storage; the next load came back at full volume.

562 tests, typecheck clean.

### A matched pair in the rail, and concede where it cannot move (2026-08-07)

Two asks: the graveyard the same height as the library, and concede fixed in
the top-left corner above the player name.

The second is the third home concede has had, and this one is final. It was at
the end of the action bar, which put it under whichever confirm button happened
to be showing - the button that ends the game moving *to* where the cursor had
just been. Pinning it above the piles fixed that and left one thing still able
to shift it: the rail's own middle grows during a game as commander damage rows
appear. The top of the rail is the only place in the column with nothing above
it, so it is now the same pixel on turn one and turn thirty.

The first ask needed the arrangement to change, not just a number. Stacked, two
piles at the library's 82px width want 264px of rail height; there are about
157px going once the name, life total, mana line, a commander damage row and the
gaps have taken theirs. Side by side, they are 62px each - half a 132px rail -
which 5:7 turns into 87px of card. So the pair went side by side and the library
came *down* from 82px to 62px, which is the honest cost of the two matching. It
is width this column is short of, not height.

`flex: 1 1 0` on both columns is what does it: each card is 100% of its column
and both are 5:7, so one number decides both heights and neither can drift. The
empty graveyard is a card-shaped dashed slot rather than the word "empty", so
the library does not jump the first time a creature trades. The count moved off
the label and onto a badge, because "Graveyard (12)" is two lines at 62px and a
label that wraps in one column and not the other pushes that column's card down.

Exile paid for the room: it is a one-line name-and-count chip above the pair
now, still opening the same look-through overlay. It is the one of the three you
can go a whole game without opening.

One thing found by measuring rather than by looking: the count badge sits 4px
outside the card's corner, which was harmless until the piles became the last
thing in the rail. Four pixels of overflow turns the rail's `overflow-y: auto`
into a real scrollbar, which takes 10px off the rail's width, which shrinks both
piles from 62px to 57px. The badge is tucked inside the corner now.

Verified in the browser by measurement - the preview pane does not composite
frames in this session, so nothing here was checked by eye. Both seats measure
62x87 for graveyard and library, level to the pixel, with the whole worst case
loaded at once (concede, name, life, mana, a commander damage row, the loss
banner, the exile chip and a filled graveyard): rail content 320px in a 320px
rail, no scrollbar. A full bot game was then played with a watcher recording any
tick where the two piles differed in size or position - none, across the game,
including the turn a real card (Valiant Guard) landed in the graveyard.

562 tests, typecheck clean.

## Why the pool has no staples (2026-08-07)

The user's read on the deck builder - "there are basically no really decent
cards that will ever see play in a competitive PvP deck, so the builder is
seeing no use at all" - is correct, and worth writing down properly because the
cause is not card selection.

The pool is **817 cards**: 551 vanilla, 266 scripted. 639 of them are creatures,
92 instants, 68 sorceries, and **five are lands - the five basics**. There is
not one nonbasic land, and barely a handful of artifacts or enchantments.

That shape comes straight from `gen_fixtures.py`, which refuses any card whose
text the effect DSL cannot express *exactly* rather than approximating it. That
rule is right and should stay. The consequence is that the DSL's edges are the
pool's edges - and the DSL is missing precisely the things staples are made of:

- **Colourless mana.** `Color` is `W|U|B|R|G` and `addMana` takes a `Color`, so
  there is no way to write a mana rock at all. No Sol Ring, no signets, no Mind
  Stone - the single most-played card in the format is not expressible.
- **Turn-based triggers.** The five events are `enters-battlefield`, `attacks`,
  `dies`, `landfall` and `permanent-enters`. Nothing fires at upkeep, at end
  step, or on a spell being cast, which rules out most value engines (Phyrexian
  Arena, Rhystic Study, Smothering Tithe).
- **Mass removal.** No "destroy all creatures" of any kind. No Wrath of God, no
  Damnation, no Blasphemous Act - a whole axis of the game is missing, and its
  absence is part of why games here are decided by attacking.
- **Sacrifice**, as a cost or as an effect.
- **Attach** - no Equipment and no Auras.
- **Nonbasic lands** - needs enters-tapped and any-colour mana at minimum.
- **Discard.**
- **Dynamic amounts.** Every number in the DSL is fixed, so "equal to its power"
  or "for each creature you control" cannot be written. This is what blocks
  Swords to Plowshares as much as anything else.
- **Statics beyond +N/+N.** `staticBuff` only touches power and toughness, so
  no keyword granting and no cost reduction.

Against that, a real amount **is** already expressible and simply has not been
picked: targeted destroy and exile, card draw, counterspells, land-search ramp,
ETB value creatures (draw, destroy, return from graveyard), anthems and token
makers. A batch of genuinely playable cards could be added today without
touching the engine - it just would not include a mana rock or a wrath.

So the work splits cleanly in two, and the order is the open question: cards the
engine can already hold, or the engine systems that unlock the rest.

## Growing the pool, deck-list-led (2026-08-07)

The order-of-work question above was answered by the user, and none of the three
options offered were it:

> all these approaches massively delay the capability to add a functional
> competitive deck to the sim, which is its entire purpose. I want to give you a
> deck list, you tell me what cards are supported, then we work to support all
> other cards in the deck list. This will then mean engines are built to support
> more cards in future deck lists, and cards in deck lists may overlap. Once
> that list is done, we can move onto another deck list.

That is the process now. A real decklist is the unit of work, not a colour and
not a system. Engine features get built because a card in the list in front of
us needs them, and the overlap between lists is what makes each one cheaper than
the last. The aim is that all five of the bot's archetype decks end up as
functional archetype decks, so a newly built deck can be tested against each and
its strengths and weaknesses read off. The pool grows in whichever colours the
current list happens to be.

**`tools/scryfall-report/deck_report.py`** is the tool for it - see that
folder's README. A list goes in; out comes IMPLEMENTED / ADDABLE / BLOCKED /
UNKNOWN per card, and then the blockers grouped into a work queue ordered by how
many cards in that list each one unblocks.

The important thing it does is take triggered abilities apart into wrapper and
effect. "When this creature dies, draw a card" is refused today, and it looks
like a missing system until you notice the effect has existed for months and
only the *trigger pattern* is absent from `gen_fixtures` - an afternoon in a
Python file, not engine work. The report calls those **generator gaps** and
keeps them out of the engine queue. On the first list put through it, three
cards that read as three missing systems (Eternal Witness, Ravenous Chupacabra,
Solemn Simulacrum) turned out to need one small engine feature - optional "you
may" triggers - and one target restriction between them.

It reuses `gen_fixtures.interpret` and `gen_fixtures.spell_effect` rather than
reimplementing the rules, so ADDABLE means the generator will genuinely emit the
card. Two indexing bugs were fixed while building it, both of which would have
produced confidently wrong answers: art-series rows in the bulk data are named
"Lightning Bolt // Lightning Bolt" and were shadowing the real cards, and a
modal double-faced card was answering to "Rampant Growth" because half-names
were indexed in the same pass as full names.

## Step 1 of the Blech list: lands and mana rocks (2026-08-07)

The first step of the deck-led loop, chosen because 25 of the list's 100 cards
are lands and the fixture generator had no way to write one. The pool went in
with five lands - the basics, hand-written - and no artifact that produces mana.

**Two engine features, both small, both needed by everything here.**

`ManaColor = Color | "C"`. Colourless is deliberately *not* a member of `Color`:
colour identity, deck legality and the pips in a cost are all about the five
colours, and widening that type would have let "colourless" through every one of
those checks. Only production needed the sixth option. It lands in the pool's
`generic` bucket, which already behaves the way colourless does - pays the
generic part of a cost, never a coloured pip. The one thing that does not model
is a cost demanding colourless specifically ({C} on an Eldrazi); no card in the
pool has one, and the first that does needs a real distinction rather than
another special case.

`CardDefinition.entersTapped`, honoured in `enteredBattlefield` alongside the
existing `options.tapped` so a ramp spell fetching a tapland is not a double
negative. Unconditional only - see below.

**The generator learned to emit noncreature permanents.** Lands get their mana
from their basic land types where they have them (Bayou's printed text is
nothing but reminder text in brackets, so a generator reading only rules text
would have emitted a dual that taps for nothing), and from their text where they
say it out loud. "{T}: Add {B} or {G}" is written as two separate abilities,
which is what `activatedAbilities` already is - no new engine concept.

Reach across the whole cached dataset: **130 lands and 20 mana rocks** are now
representable exactly, against five and zero before. 24 were added to the pool
this pass (17 lands, 7 rocks), taking it to 841 fixtures, all of which
`audit_fixtures.py` re-checks clean against Scryfall.

**What was deliberately refused.** Conditional taplands - Woodland Cemetery,
Deathcap Glade, Overgrown Tomb, Undergrowth Stadium. "Enters tapped unless you
control two or more other lands" written as flatly tapped is a strictly worse
card than the one printed, and this pool does not carry cards that are quietly
wrong. They come back when there is a condition system.

**One bug caught, and it is the same bug this project has had before.** The
loose lifegain pattern the creature path uses - "When...enters, you gain N
life." - also matches Seraph Sanctuary's "whenever an *Angel you control*
enters" and Staff of the Death Magus's "whenever you *cast a black spell* or a
Swamp you control enters". Both would have become enters-battlefield triggers,
so both would have paid out exactly once, at the one moment the real card does
nothing. That is what the note on `TriggeredAbility` in types.ts is about; it
cost eight cards last time. The permanent path uses a strict self-only pattern
and both cards are refused.

**The Blech list went from 10 playable to 15**, and the remaining queue is
honest about it - "mana abilities" dropped out of the top slot and split into
the two shapes that genuinely are not supported (any-colour, and abilities with
a rider). The report also stopped blaming cards for lines it can handle: a card
refused for its conditional tapped line was also being charged for its perfectly
ordinary "{T}: Add {B} or {G}", which inflated a solved problem to the top of
the work queue.

Card text in the client prints the drawback now. Left out, Golgari Guildgate
read as a free dual land, which is worse than saying nothing about a card at
all.

589 tests, typecheck clean, 841 fixtures audited against Scryfall with no
problems found. Sol Ring and Golgari Guildgate both verified rendering in the
deck builder.

## Step 2 of the Blech list: fetchlands and sacrificing for value (2026-08-07)

Two new activated-ability costs, and they carry the rest of the mana base:
`payLife` and `sacrificeSelf`. Both are paid on **activation**, not resolution,
and that ordering is the whole trick of a fetchland - it is already in the
graveyard when its search resolves, and the search still finds the land, because
an ability is independent of its source once it is on the stack. Written the
other way round, as part of the effect, a fetchland would never fetch.

`searchLibrary` gained a `subtypes` filter, because a fetch asks for "a Swamp or
Mountain **card**" - a land type, not "a basic land". Bayou is a legal find, and
a fetch restricted to basics would be materially weaker than the printed card.

Sacrificing routes through the existing death handler rather than doing its own
`moveCard`. That is what makes a sacrificed commander go to the command zone,
and it is the same route any dies trigger will take - a second move here would
have silently skipped both.

Three places count mana without spending it - "could this player afford that",
"which lands should auto-tap", "is there anything worth stopping the turn for" -
and all three treated a tap ability as free. A fetchland taps, so a naive scan
sees a mana source; it produces nothing and costs a land and a life. Now behind
one shared `isFreeManaAbility`, so they cannot drift apart. Life is checked as a
cost too: an ability you cannot pay for is not an action, and offering it stops
the turn for something you cannot do.

**A second bug of the kind that cost eight cards before.** The creature path
still used the loose lifegain pattern - `^When(?:ever)? .*enters, you gain N
life\.$` - and Bogwater Lumaret reads "whenever this creature **or another
creature you control** enters". It was emitted as a plain enters-battlefield
trigger, which fires once, on the one occasion the card's own text excludes. The
fix writes the family out one shape at a time (self, others-you-control,
self-or-others, any-player's) with a guard that refuses anything close but not
exact, rather than guessing. `audit_triggers.py` confirms the existing pool was
already clean, so this was a trap waiting for the next card rather than damage
already done - which is exactly when it is cheapest to fix.

New: `gen_fixtures.py --named`, which emits fixtures for an explicit list of
cards and reports any it cannot represent on stderr. The mode the deck-led loop
actually wants - deck_report says which cards are addable, this emits exactly
those - rather than generating a colour spread and picking wanted cards out of
it. Creature fixtures are also stamped with their Scryfall id now instead of
leaving that to a second script somebody has to remember to run.

**The Blech list is at 23 of 100**, from 15. 849 fixtures, both audits clean.
608 tests, typecheck clean.

### The work queue was measuring the wrong thing (2026-08-07)

After step 2 the queue said turn-based triggers were the biggest item, named by
9 cards. Building them would have completed **none** of those 9: every one also
wants tokens, or a condition, or a dynamic amount. The queue was counting how
many cards *mention* a capability, which is not the same as how many it would
finish, and sorting by it picks the item that looks biggest rather than the one
that pays.

Two fixes, both about not over-claiming:

- **One line can need two things.** "At the beginning of your end step, create a
  1/1 green Insect token" is a missing trigger *and* missing tokens. The
  analysis returns every reason for a line now rather than the first.
- **A multi-faced card has faces.** The report stopped at "this is two-faced"
  and so claimed six completions; five of those six also need sacrifice, or
  dynamic amounts, or a mechanic that does not exist. Only Bala Ged Recovery was
  ever one feature away. Each face is read now, and the six dropped off the
  completions list entirely.

The report leads with **what would actually finish a card** and keeps the
mention counts below it, labelled as the different thing they are. Even the
completion list is honest about its own limit: one *name* can hide more than one
job - Path of Ancestry's single line wants any-colour mana and a scry trigger,
and both land under the same heading.

What it says now, for this list: any-colour mana finishes 5, conditional
taplands 3, mana abilities with a rider 3, modal spells 3, X costs 3, non-mana
tap abilities 3. Nothing else finishes more than 2. **The remaining 77 cards are
mostly blocked by two or three things each**, so progress from here is slower
per card than the first two steps were, and any queue that suggests otherwise is
miscounting.

## Step 3: mana of any colour, and the trigger bug removed from every path (2026-08-07)

### One parser for enters-triggers, shared by every path that writes a card

The user's call after Bogwater Lumaret: fix it everywhere rather than patching
the path it turned up in. There were two copies of the rule - a full family on
the creature path and a narrower self-only pair on the permanent path - which is
one copy too many for a rule this easy to get wrong.

Now there is one `enters_trigger`, used by creatures, lands, artifacts and
enchantments alike, with one guard (`ENTERS_TRIGGERISH`) that refuses anything
resembling the family without matching it exactly. The self patterns cover every
permanent type, so "When this **land** enters, you gain 2 life" and "When this
**creature** enters..." are the same shape to the same code. Instants and
sorceries have no triggers at all, so all three writing paths are covered.

`deck_report.py` asks `gen_fixtures.enters_trigger` rather than keeping its own
list, so the report cannot drift from what the generator will actually do.

Verified on both paths at once: Seraph Sanctuary ("whenever an *Angel you
control* enters") and Staff of the Death Magus ("whenever you *cast a black
spell*...") are refused; Adventurer's Inn, Radiant Fountain and Jungle Hollow
still work; Bogwater Lumaret and Kor Celebrant come out as controller-watchers
with `includesSelf`, Soul Warden and Essence Warden as any-player watchers.
`audit_triggers.py` is clean across all 851 fixtures.

`docs/ADDING-CARDS.md` now requires `audit_triggers.py` in the checklist, with
the reason spelled out: `audit_fixtures.py` compares printed characteristics and
a wrong trigger is not a characteristic, so it passes that audit cleanly.

### Mana of any colour

A choice of five colours is written as five abilities - which is what
`activatedAbilities` already is, the same trick "{T}: Add {B} or {G}" uses, and
no new engine concept. Auto-tap then picks whichever colour a spell needs for
free, because it already chooses among sources by colour.

Command Tower is that shape with a restriction, and it is the only place in the
engine where one card's legality depends on another: it taps for any colour "in
your commander's color identity", so the same land makes different mana in
different decks. `ActivatedAbility.requiresCommanderIdentity` marks the five
halves and `identityAllows` refuses the ones the commander's colours do not
cover - checked at activation, and in both places that count mana without
spending it, so a Golgari deck is never told it has white available. Identity is
read from the commander cards themselves in whatever zone they are in, because
the commander is the rule rather than the deck list.

**Birds of Paradise and Command Tower are in. The list is at 25 of 100.** 851
fixtures, both audits clean. 620 tests, typecheck clean.

Nothing left on this list finishes more than three cards at a time, and most of
the remaining 75 are blocked by two or three separate things. The cheap
structural wins are done; from here it is closer to card-by-card work, which is
what the user expected.

## Step 4: conditional taplands, and "whenever you gain life" (2026-08-07)

Three features were asked for; two were built and one was refused after reading
the cards, which is written out below because the refusal is the more useful
half.

### Conditional taplands - Deathcap Glade, Undergrowth Stadium, Woodland Cemetery

`entersTappedUnless` beside the existing `entersTapped`: the permanent enters
tapped by default and the condition is the exception, which is the way the cards
are worded and priced. A closed list of three shapes rather than a predicate
language - "two or more other lands", "two or more opponents", "a Swamp or a
Forest" - because those three cover every dual in the format and a fourth costs
nothing to add the day one needs it.

The condition is checked with the permanent already on the battlefield, which is
why "other lands" says *other*: counting itself would have Deathcap Glade enter
untapped off a single land, one turn early. The subtype check reads the type
line, so Bayou satisfies "a Swamp or a Forest" without naming a single dual.

### "Whenever you gain life" - Blech, Loafing Pest and Pest Mascot

A sixth trigger event, and one new function: `gainLife` in life.ts. Six places
used to do `player.life += n` directly - the gainLife effect, lifelink on a
damage effect, and four separate paths through combat damage - and a trigger
wired into only some of them would be worse than none: it would work when you
cast a lifegain spell and silently do nothing when a lifelinker connected, which
is the harder case to notice and the commoner one in play. All six go through
the one door now.

It fires once per life-gain *event*, not per point: gaining 7 life puts one
counter on Pest Mascot.

`addCounterToEachOther` grew `subtypes` (plural) and `includesSelf`. Blech reads
"each Pest, Bat, Insect, Snake, and Spider you control" - five subtypes, and no
"other", and Blech is a Pest, so it counts itself. The Oxford comma is a genuine
trap there: splitting that list on commas alone leaves "and Spider" as a
subtype, which matches nothing on any card, and Blech would quietly have covered
four types instead of five.

### Modal spells: refused, and why

Asked for, and the honest answer is that building it finishes **none** of the
three cards the report attributed to it. Read against Scryfall: Golgari Charm's
third mode is Regenerate; both of Return of the Wildspeaker's modes want dynamic
amounts ("the greatest power among non-Human creatures you control"); and
Scheming Symmetry is not modal at all - "Choose two target players" has no dash
and no bullets, and was being filed under modal by a pattern that only looked at
the first two words.

So the report was fixed instead. A bullet is a *mode*, and what matters is
whether its contents can be expressed - it now diagnoses each bullet by its
body, and the modal heading is reserved for the real "Choose one -" templating.
Golgari Charm now correctly reports Regenerate as its blocker, and Scheming
Symmetry stopped claiming to be a modal spell.

`audit_triggers.py` learned the new event; without that it reported both new
cards as missing a trigger *and* having invented one - contradicting itself
about the same card, which is how an audit gets ignored.

**The list is at 30 of 100.** 856 fixtures, both audits clean. 639 tests,
typecheck clean.

## Step 5 - the mana base: riders, restrictions, filters and regeneration

Six cards asked for, four features delivered, and a seventh card fell out free.

**Painlands and Elves of Deep Shadow** - "{T}: Add {B}. This land deals 1 damage
to you." The damage is a rider on the *ability*, not part of the effect: the
same `addMana` on a Forest must not hurt anybody. It goes through the ordinary
damage path, so a prevention shield covers it exactly as it covers a burn spell.

A painland stays a *free* mana source, deliberately. The damage is not a cost -
the mana arrives either way - and excluding it would have left Llanowar Wastes
tapping for nothing but colourless. It is handled where it belongs instead:
`chooseSource` takes a painless source when one would do just as well, so
auto-tap only shoots you when it has to.

**Activation restrictions** - "Activate only if you control a Swamp." The
important half is not the refusal; it is that `potentialAvailableMana`,
`manaSources` and `hasAnyLegalAction` all honour it. A restriction only the
activation knew about is *worse* than one nothing enforces: the game offers you
a black spell, taps lands towards it, then refuses the land meant to pay for it.

That question - "does this player control a Swamp?" - is the same one a tapland
asks as it arrives, so both now go through one `meetsBoardCondition`
(`conditions.ts`). Two answers to one question is a bug waiting for the day they
disagree.

**Sapseep Forest** came free with the restriction, and carries the trap in it:
"two or more **green permanents**" is about colour, and a Forest is a
*colourless* permanent whose colour *identity* is green. Reading identity would
switch the card on a turn or two early in a deck that plays nothing but green.

**Twilight Mire** needed two things nothing had: a hybrid symbol in a cost, and
one activation producing two different colours. Hybrid is its own field on
`ManaCost` because it is neither a pip nor generic - it must be paid with one of
its own colours, so colourless can never cover it. Hybrids are taken
most-constrained-first, or a {B/G} would eat the black mana the {B} beside it
was the only claimant for.

It is the first card in the pool whose mana ability costs mana, so
`potentialAvailableMana` cannot count it. Undercounting is the safe direction
and it is left there rather than guessed at - a real cost solver is the fix, not
another special case.

**Regeneration** - a shield on the *destruction* path, which is the whole
subtlety. A creature whose toughness has been reduced to 0 is not destroyed, it
is put into the graveyard as a state-based action (704.5a), so regeneration does
nothing against -N/-N. Writing that check the other way round would quietly have
made Swarmyard protection from a board wipe it does nothing against.

Removal from combat is a flag, not a deletion from `state.blockers`. That map is
the record of what was *declared*, and an attacker stays blocked once blocked
even after every blocker has left (509.1h) - erasing the entry would have handed
the attacking player a free hit for the defender having regenerated.

Also fixed: the card panel never rendered the "unless" on a conditional tapland,
so Deathcap Glade read as flatly "This land enters tapped" - understating three
cards in exactly the panel you use to decide whether to play them.

**The list is at 37 of 100.** 863 fixtures, both audits clean. 691 tests,
typecheck clean.

## Step 6 - "any colour mana", which was not the blocker at all

Asked for as three cards. Read against Scryfall, **none of the three was blocked
by any-colour mana**, which the engine has had since Birds of Paradise:

- **Exotic Orchard** asks the *opponent's* board which colours it may make.
- **Delighted Halfling** makes mana that is not interchangeable with the rest of
  the pool - "spend this mana only to cast a legendary spell".
- **Path of Ancestry**'s mana half *is* Command Tower and already worked; what
  blocks it is the rest of the line, a scry trigger fired by how its mana was
  spent. Refused, and the report now says so.

That is the fourth time a heading has named a shape rather than the work. The
report's own preamble now says it in those words, with this as the example.

**Exotic Orchard** extends the Command Tower pattern rather than adding a
concept: still five abilities, one per colour, filtered at activation - only the
source of the filter changed, so `requiresCommanderIdentity` became
`colorFrom: "commander-identity" | "opponent-lands"`. Two Orchards facing each
other would ask each other forever, so colour-sourced abilities are skipped when
answering; that gives the right board answer (neither makes anything) without
modelling the loop.

**Delighted Halfling** needed mana with a spend restriction, which is a change
to the most-used structure in the engine. It is deliberately *beside* the pool
rather than in it: `ManaPool` is a count per colour and every affordability
check reads it as interchangeable, so a restricted mana added there would be
spent on the first thing that fitted - the one thing the card forbids. Only
`castSpell` can see it, because casting is the only place that knows what is
being cast.

`isFreeManaAbility` had to learn about it too, and this is the one place in the
whole mana system where the failure would have been *over*-counting rather than
under: the game would have believed the Halfling could pay for anything, offered
a spell on the strength of it, and then refused the cast.

"...and that spell can't be countered" lives on the stack object, not the card.
It is a property of the casting: the same commander cast with ordinary mana is
counterable as normal.

**The ability picker.** Clicking a permanent activated its *first* ability,
always. Survivable while the only multi-ability cards were dual lands, since the
auto-tapper picks the right half when paying for a spell and nobody clicks them.
It stopped being survivable the moment a card's interesting half was not its
first - Swarmyard's regenerate, Twilight Mire's three filter modes, Delighted
Halfling's restricted mana were all in the pool and unreachable by hand.

Only abilities that would actually work are listed, from one shared
`activatableAbilities` in the engine. A menu that offers something then refused
is worse than no menu, and a test asserts every index it offers activates
without throwing.

**The list is at 39 of 100.** 865 fixtures, both audits clean. 717 tests,
typecheck clean.

## Deck-led pool growth, batches 5 to 8 (2026-08-10)

The four batches after Delighted Halfling went out without a roadmap entry
between them. Written up together here, briefly for the first three and in full
for the fourth.

**Triggers that are not about entering the battlefield.** Three families now
exist rather than one: self (`enters-battlefield`, `attacks`, `dies`), watcher
(`landfall`, `permanent-enters`, `permanent-dies`) and turn-based (`upkeep`,
`first-main`, `begin-combat`, `end-step`). With them came optional triggers
("you may", answered through a new `PendingConfirmation`) and the
intervening-if, checked twice as rule 603.4 requires. `pushTrigger` is the one
door every fire site goes through, so no event can quietly skip the condition.
It also fixed a shipped bug: landfall never fired for a land put onto the
battlefield by a fetch or a ramp spell, only for one played for the turn.

**Sacrifice, which turned out to be half-built already.** Sacrificing as a
*cost* had worked since the fetchlands; what was missing was sacrificing as an
*effect*, and `sequence` - several effects as one resolution, so Riveteers
Overlook's "and you gain 1 life" happens after its shuffle rather than before.
Two shipped defects fell out: every fetchland's panel omitted its cost and its
search restriction, so each read as a free unrestricted tutor.

**Tokens were never the missing feature - the definitions were.**
`createToken` had worked for months; every token in existence had been typed
out by hand, so a card naming any other one had nothing to point at. The
generator now mints a definition from the printed phrase, with the token's id
spelling out colour, stats, subtype and keywords so two differently-worded
tokens cannot collapse into one. A token carrying quoted rules text is refused
rather than flattened.

### Mana from a spell, a library with a top, and a search somebody else makes

**Dark Ritual** needed no engine work at all. `addMana` has existed since the
first Forest was written and nothing about it had to change - only a
permanent's tap ability could ever *reach* it, so the generator had no pattern
for "Add {B}{B}{B}." on a spell and filed the card as unrepresentable.

**Sylvan Tutor** needed `searchLibrary` to have a third destination. The
ordering is the whole card: "then shuffle and put that card on top" shuffles
*first*, so the card genuinely ends on top and you draw it. Placing then
shuffling would scatter it back to a random position, which is not a tutor at
all - so `resolveSearch` grew a second ordering rather than reusing the
zone-change path, and the card never leaves the library.

**Assassin's Trophy** needed two things. The `permanent` selector's type list
became optional, because "target permanent" is every type there is and listing
them out would break the day the engine learns a new one; and it gained
`controlledBy: "opponent"`, without which the card can blow up your own land.
Then `searchLibrary` gained `who: "target-controller"` - a spell one player
casts and a *different* player answers. The searcher is read off the effect's
card target; by then the permanent is in a graveyard, where control always sits
with the owner (rule 108.4), and nothing in this engine changes control of a
permanent anyway.

**The bot deadlocked on it, and the hole was already there.** `botShouldAct`
woke the bot for the mulligan and for priority, and nothing else. Nobody holds
priority part-way through a resolution, so a search the bot owed was found only
because the bot happened to still be holding priority from before its own spell
resolved. Assassin's Trophy broke that - the human casts it, the bot searches,
the human holds priority - and the game stopped dead with a picker nobody could
see. The same hole was already reachable with an optional trigger of the bot's
firing on the human's turn. Both pending questions now wake it.

**`add_scryfall_ids.py` was stamping every card twice.** Its "already stamped?"
check read the matched text, and the match stopped one line above where the
stamp is written - so the answer was always no. A second run wrote 875 duplicate
lines into the fixtures.

**The deck report lost two more stale headings.** Top-of-library tutoring is
gone entirely, and "targets restricted by who controls them" is narrowed to the
selectors that still cannot do it. That is the sixth and seventh time a heading
has outlived the gap it named.

**The list is at 51 of 100.** 878 fixtures, both audits clean. 805 tests,
typecheck clean.

### Replacement effects, and {X}

Two clusters the deck report offered as "finishes 2" and "finishes 3". The
first delivered both cards. The second finished one, and the heading was wrong
again - for the eighth time.

**Replacement effects, for the two events any card here replaces.** Not a
general event bus: the real rules let a replacement modify almost anything, and
building that faithfully would mean routing every effect in the engine through
an interception point. Counters going onto a permanent and tokens being created
are the only two events any card in this pool replaces, and each is a single
line in effects.ts.

The interesting part is not that Doubling Season doubles. It is that rule 616.1
gives the *player* the choice when two replacements apply to one event, and the
answers differ: Doubling Season plus Winding Constrictor turn one counter into
three or four depending on order. With no way to ask, every `add` is applied
before every `multiply` - always the larger result, and therefore always the
order the player would pick. That equivalence holds only because the engine
models one kind of counter, +1/+1, and more is never worse; the shortcut is
written down in replacements.ts so the day -1/-1 counters arrive it is visible
rather than inherited.

Winding Constrictor's second line concerns counters put on a *player*, and this
engine has none of any kind. No reachable game state makes it do anything, so it
is left unmodelled deliberately, with a note on the fixture saying so rather
than approximating it onto something else.

**{X} is a substitution, not a value the effects layer understands.** X is
settled once, as the spell is cast, and never changes - so `resolveAmounts`
replaces every X with the announced number before the effect goes anywhere near
`applyEffect`. Nothing in effects.ts, the bot, or the card-text renderer had to
learn what X is. Carrying it on the stack object instead would have meant every
reader of every numeric field asking "is this a number or is it X?" forever.

`ManaCost.x` counts the symbols rather than being a flag, because Pest
Infestation is {X}{X}{G} and X = 3 costs six generic. It is deliberately not
part of mana value: a card in hand has X = 0 (rule 202.3b), which is what the
curve is drawn from.

**The Meathook Massacre needed three more things**, none large and none
optional. The announced X has to survive from the cast into an
enters-the-battlefield trigger that fires *after* the spell has left the stack,
so `chosenX` lives on the card instance and is the one field `moveCard`
deliberately does not reset (rule 608.2g). `watchFor.controlledBy` exists
because the card has two death triggers pointed in opposite directions - without
it they are the same ability twice, and the card drains you when your own
creature dies. And life *loss* is its own effect rather than damage with a minus
sign: loss cannot be prevented by a shield, gives lifelink nothing, and fires
nothing watching for damage.

**The card-text renderer printed both death triggers identically** until a test
was written for them - it knew about `watches` and not about `controlledBy`, so
the panel read "Whenever a creature dies" twice.

**The heading was wrong again.** "X, hybrid or phyrexian mana in the cost ->
finishes 3" finished exactly one. Pest Infestation also needs a token carrying
its own rules text and a dynamic count; Springleaf Parade needs changeling and a
static ability granting an activated ability to a class of permanents. With the
generator now parsing {X}, the report names those instead - which is the whole
point of the `blockers_for` fix.

**Two things fixed in passing.** `parse_mana_cost` and the fixture audit both
had to learn {X}. And the network protocol was dropping `chosenMode` on the way
over the wire, so a modal spell cast against a networked opponent was refused
for not naming a mode the client had already chosen; `chosenX` now travels
beside it.

**The list is at 54 of 100.** 882 fixtures, both audits clean. 838 tests,
typecheck clean. Verified in a real game: Hornet Queen made eight Insects under
Doubling Season, and The Meathook Massacre cast for X = 2 off six Swamps offered
0-4, killed both 2/2s, drained Salty Mike for 1 and gained Deadly Donny 1.

### Ten cards, and the keyword layer they needed (2026-08-12)

**Nothing may read `CardDefinition.keywords` any more.** That was safe only
while keywords were a fixed property of the card. The moment Heroic
Intervention can hand out indestructible and Blight Mound can hand out menace,
a read of the printed list is a read of a stale answer - and the failure is
silent and one-sided: the card looks right in the panel and simply does not work
in combat. So `effectiveKeywords` joined `effectivePower` in counters.ts, and
all thirty-odd read sites across the engine, the bot and the client now go
through it. Granted keywords come from three places: printed on the card,
handed to the permanent until end of turn, and handed out by something else on
the battlefield.

**Statics learned two restrictions and a verb.** `staticBuff` was an
unconditional +N/+N optionally narrowed by subtype. It now grants keywords, and
narrows to attacking creatures (Blight Mound's "Attacking Pests you control") or
to creatures carrying a +1/+1 counter (Duskshell Crawler's "each creature you
control with a +1/+1 counter on it"). Both are reread on every access, so the
menace comes and goes with the attack and the trample with the counter.

**Triggers can target now.** Targets for a triggered ability are chosen as it
goes on the stack (rule 603.3d), not as it resolves - so `pushTrigger` parks the
ability in `pendingTargetChoices` *before* it reaches the stack, and
`chooseTriggerTarget` puts it there once answered. That ordering is visible in
play: an opponent responds to Blood Artist already knowing who it is aimed at.
With no legal target the ability is removed and never happens; with exactly one
it is taken without asking, because there is no decision to make. A queue rather
than a single slot, because a board wipe with two Blood Artists out asks twice
per creature.

**Surveil rides on the search machinery, deliberately.** It is the same
interaction - the game stops, a player is shown cards from their own library,
and chooses where one goes - and a parallel mechanism would have been a second
place to remember to hold priority, a second picker, and a second way to get
hidden information wrong. The card is identified by instance id, so an opponent
already sees the hidden-card placeholder.

**Two new trigger events.** `spell-cast` fires as a spell goes on the stack, so
Arasta's Spider arrives before the removal spell that provoked it resolves.
`damaged` fires from `damageCreature`, the one door all damage goes through, and
carries the amount - so Hornet Nest makes one Insect per point that actually
landed, and nothing at all behind a prevention shield.

**"Tokens that carry their own rules text" was never an engine gap.** A token
definition is an ordinary `CardDefinition` and `triggeredAbilities` on one has
always worked; only the generator refused them. The two Pests are the proof, and
the reason they are two definitions rather than one: same body, same colours,
and one pays out when it dies while the other pays out when it attacks.

**Four defects found on the way.** The card panel dropped every granted keyword,
so "Attacking Pests you control get +1/+0" read as a complete card. It printed
nothing at all for a shockland, so Overgrown Tomb read as an unconditional
untapped dual. It could not tell two tokens apart - and the test that was
supposed to guard that built its own key out of stats and colours rather than
rendering anything, so it passed on a renderer that had never been able to. And
"Each creature ... have trample" needed a singular verb.

**One shortcut, written down rather than discovered.** Send in the Pest's
discard is at random, because the engine has no way to ask a player who is not
the one resolving the spell. Against a human that is strictly harsher than the
printed card.

**The list is at 64 of 100.** 895 fixtures, both audits clean. 873 tests,
typecheck clean. Verified in a real game: Overgrown Tomb asked for 2 life and
entered untapped at 38, Duskshell Crawler parked its counter until a creature
was named, Blood Artist drained Salty Mike to 39 and took Deadly Donny to 39,
Underground Mortuary offered its top card and put Arasta in the graveyard, and
Send in the Pest made Salty Mike discard a Swamp and left a Pest behind.

### Ten more, and the number that is not settled until it resolves (2026-08-13)

**Modal double-faced cards are two definitions, and playing the back face swaps
the id.** A card played for its land half genuinely *becomes* that land:
`playLand` swaps `definitionId` on the way to the battlefield and `moveCard`
swaps it back on the way out. That is deliberately not "one definition with two
faces" - every read site in the engine, the bot and the client asks
`requireDefinition` what a card is right now, and a face-aware definition would
have meant teaching all of them which face to look at, the same sprawl that made
granted keywords expensive. Swapping the id keeps every one of them correct
without knowing MDFCs exist. Four cards, and three of their four front faces
needed nothing that was not already built last week.

**A counted amount is not a substitution.** X and `event-amount` are settled
before an effect reaches the stack and never change, which is what lets
`resolveAmounts` replace them and keep the effects layer ignorant. A count is
different: "draw a card for each creature you control with a +1/+1 counter on
it" reads the board *when it resolves*, so killing a creature in response really
does take a card away. `evaluateAmount` is the one place that turns one into a
number, and every handler taking an `Amount` goes through it. Three flavours,
each lifted from a printed card rather than invented: a filtered count, the
greatest power among them, and a per-turn tally.

**Iridescent Hornbeetle's tally is not a board reading.** "For each +1/+1
counter you've put on creatures under your control this turn" keeps paying for
creatures that are already dead by the end step, which is why it is counted at
`countersPlaced` - the single door every counter goes through - rather than read
off the battlefield.

**Equipment reuses the targeted-activated-ability path.** Equip is written as an
ordinary ability with a target, because that path already works end to end: the
client picks a target, the bot can use it, the cost is paid the same way. The
only thing equip adds is timing, which is one flag. An Equipment's `staticBuff`
reaches exactly what it is attached to, and state-based actions drop it when
that creature leaves.

**A real bug found by writing the test.** `exile` only ever worked on the
battlefield, so Feral Appetite - which exiles a card *from a graveyard* - paid
its mana, targeted legally, and did nothing at all.

**And three tools taught what they did not know.** All three audits index a
Scryfall card's *faces*, in a second pass so a face called "Regrowth" cannot
shadow the real Regrowth - a one-pass version reported a dozen good fixtures as
broken. `audit_fixtures` learned hybrid mana in a cost; `audit_text` learned to
find granted keywords anywhere in an effect tree rather than at the three places
it used to look, and that "draw cards equal to" has no quantity word.

**The list is at 74 of 100.** 910 fixtures, all three audits clean bar the two
known gaps. 890 tests, typecheck clean. Verified in a real game: Fell the
Profane offered both faces with their rules text, the land half went down as
Fell Mire, and the shockland question fired on top of it.

## The Winota list: the roadmap (2026-08-15)

The second decklist through the deck-led loop, on branch `deck/winota-hatred`.
Nothing is built yet; this section is the plan, written before any code so the
shape of the work is arguable while it is still cheap.

Two earlier lists were put through this process and withdrawn before any work
started - a Yuriko list with eight Alchemy and Arena-only cards, then a paper
replacement for it. Both are gone from this document; what survives from them is
the legality sweep that now runs on every list first, and the note that
`deck_report.py` cannot resolve reskinned card names.

### The list is clean

**100 cards, every one real, Commander-legal, and inside Winota's `{R}{W}`.**
No bans, no Alchemy, no Arena-only printings, nothing outside the colour
identity, nothing the bulk data cannot find. That is a first, and it means the
whole of the work below is engine work rather than list work.

One note on transcription: `Dollmaker's Shop/Porcelain Gallery` was written with
a single slash and Scryfall names it `Dollmaker's Shop // Porcelain Gallery`.
Normalised rather than flagged, because it resolves unambiguously.

### 6 implemented, and the reason is the colour pair

**6 IMPLEMENTED, 11 ADDABLE, 83 BLOCKED, 0 UNKNOWN** - and the six are Command
Tower, Marsh Flats, Mountain, Plains, Sol Ring and Windswept Heath. **Five lands
and a rock. Not one creature, not one spell.**

That is not a regression; it is the first list in a colour pair the pool has
barely grown into. Blech was Golgari and the Yuriko lists were Dimir, so every
list so far shared black with the pool. Boros shares nothing with it. The white
cards added back in the mono-colour push were vanilla commons, and this deck
contains none of that kind. Expect the ADDABLE column to move quickly once
generation runs, and expect the IMPLEMENTED figure to stay low until it does.

### The report is stale again, and this time in a new way

Every previously-recorded staleness still applies - mill, scry, surveil,
discard, paying life as a cost and conditional taplands are all named as missing
and all shipped weeks ago. Two further families show up here.

**Twelve cards are charged with "sacrificing something other than the card
itself", and every one of them sacrifices itself.** `ActivatedAbilityCost.sacrificeSelf`
has carried that since the fetchlands landed in step 2. The twelve: Lotus Petal,
City of Traitors, Sunbaked Canyon, Cathar Commando, Alseid of Life's Bounty,
Goblin Cratermaker, Ranger-Captain of Eos, Gingerbrute, High Noon, Professional
Face-Breaker, Ainok Strike Leader and Boromir.

**Five cards are filed as conditional taplands and none of them is a land with a
condition.** The `As this .* enters` pattern is matching the *choice* template -
Cavern of Souls choosing a creature type, Sanctum Prelate choosing a number,
Greymond choosing two abilities, Windcrag Siege choosing a mode, Multiversal
Passage choosing a basic land type. That misfire was hiding a real and coherent
capability, which is now batch 3 below: **a choice made as a permanent enters,
which the permanent then remembers for the rest of the game.** Nothing in the
engine records a decision on a permanent.

Writable **today** with no engine work, checked against `types.ts`: **Lotus
Petal**, **Mana Confluence**, **Sacred Foundry** (`entersTappedUnlessPayLife: 2`),
**Sunbillow Verge** (already ADDABLE), and **Clifftop Retreat**, whose
`entersTappedUnless: { kind: "controls-subtype", subtypes: ["Mountain", "Plains"] }`
is exactly Woodland Cemetery's shape.

**Batch 0 is the report** - refresh the heuristics, teach it flavour names.

### Batch 1 - creatures that arrive already attacking

This is the deck, the way ninjutsu was the Yuriko deck, and it is the same
underlying gap: **nothing can add a permanent to combat after attackers are
declared.** Six cards want it, and the commander is one of them.

- **Winota, Joiner of Forces** - whenever a non-Human creature you control
  attacks, look at the top six, you may put a Human creature card from among
  them onto the battlefield **tapped and attacking**, and it gains
  indestructible until end of turn.
- **Ainok Strike Leader** - a 1/1 Goblin per opponent, tapped and attacking.
- **Anim Pakal** - X Gnome tokens, tapped and attacking.
- **Myrel, Shield of Argive** - X Soldier tokens on attack.
- **Voice of Victory** - Mobilize 2, two tokens tapped and attacking, sacrificed
  at the next end step.
- **Dollmaker's Shop** - a Toy token whenever non-Toy creatures attack a player.

**What Winota needs beyond that**, piece by piece:

- The `permanent-attacks` watcher event **already exists** (Fumulus), but it
  narrows *by* subtype and Winota narrows by the absence of one - "a **non-Human**
  creature you control". `watchFor` needs a negated subtype.
- "Look at the top six and choose one of a kind" is close to the existing
  `PendingSearch` machinery but is not a library search; the rest go to the
  **bottom in a random order**, which nothing does.
- Indestructible until end of turn is a temporary granted keyword.

Several of these count something as they go - Anim Pakal counts its own
counters, Myrel counts Soldiers - so the `count` Amount grows a couple of
entries alongside.

### Batch 2 - the hate pieces, which are over a sixth of the deck

Sixteen cards, and the engine has no concept for any of them. Nothing today can
forbid an action; every restriction that exists is a targeting or timing check
written into the one function that does the thing.

| What it forbids | Cards |
| --- | --- |
| more than one spell a turn | Archon of Emeria, High Noon |
| more than one *noncreature* spell a turn | Deafening Silence |
| a second nonartifact spell | Ethersworn Canonist |
| opponents casting during your turn | Grand Abolisher, Myrel, Voice of Victory |
| opponents casting at all this turn | Silence, Ranger-Captain of Eos |
| opponents casting from anywhere but hand | Drannith Magistrate |
| noncreature spells of a chosen mana value | Sanctum Prelate |
| drawing more than one card a turn | Spirit of the Labyrinth |
| activated abilities of artifacts, creatures, planeswalkers | Clarion Conqueror |
| countering your spells | Hexing Squelcher |
| an opponent searching more than four cards | Aven Mindcensor |

They want one thing built once: **a continuous effect that answers "may this
action be taken", asked at the point the action is attempted** - casting,
activating, drawing, searching. Get that right and sixteen cards follow from it,
which makes this the highest-value batch on the list after batch 1.

Boromir is the odd one: he counters an opponent's spell if no mana was spent on
it, which is a cast trigger with a condition rather than a static prohibition.

### Batch 3 - a choice remembered on a permanent

Five cards choose something as they enter and read it back for the rest of the
game: **Cavern of Souls** (a creature type, which then gates its mana and makes
those spells uncounterable), **Sanctum Prelate** (a number), **Greymond** (two
abilities from a list of three), **Windcrag Siege** (Mardu or Jeskai), and
**Multiversal Passage** (a basic land type, which it then *becomes*).

The modal machinery exists but chooses as a spell is cast and throws the wrapper
away. This needs the answer stored on the `CardInstance` and read by whatever
the card's other lines ask.

### Batch 4 - extra combat phases

**Combat Celebrant** exerts as it attacks to untap your other creatures and add
a combat phase; **Raph & Leo, Sibling Rivals** untap one or two attackers and
add one on their first-combat trigger. The turn machine has exactly one combat
phase and no way to insert another.

Worth naming what this unlocks: with **Kiki-Jiki** or **Zealous Conscripts** on
the board these are the deck's combo kills, so the phase machinery and the copy
work in batch 5 are what turn this from a beatdown deck into what it is.

### Batch 5 - copying and borrowing

`createCopyToken` exists but copies only `self` or `attached-creature`:

- **Kiki-Jiki, Mirror Breaker** - a hasty copy of a target nonlegendary creature
  you control, sacrificed at the next end step.
- **Rionya, Fire Dancer** - X copies, where X counts the instants and sorceries
  cast this turn.
- **Ocelot Pride** - a copy of each token that entered this turn.
- **Zealous Conscripts** - gain control of a permanent until end of turn, untap
  it, give it haste. Not copying, but the same "permanents are not fixed to
  their controller" family, along with **Homeward Path**, which hands everything
  back.

### Batch 6 - protection, and the evasion family

**Protection** is a real rules system - it stops damage, enchanting, blocking
and targeting - and four cards here are built on it: **Mother of Runes**,
**Giver of Runes** (which also grants protection from colourless), **Alseid of
Life's Bounty** and **Skrelv, Defector Mite** (hexproof from a colour, plus
toxic). Nothing today implements protection or shroud.

Alongside it the blocking rules want: **can't be blocked except by creatures
with flying or reach** (Signal Pest), **except by creatures with haste**
(Gingerbrute), **can't block** (Skrelv), and **infect/toxic** (Inkmoth Nexus,
Skrelv) - poison counters exist in `sba.ts`, the keyword does not.

### Batch 7 - the mana base

Twenty-odd lands and rocks, several writable after batch 0. What is new:

- **A "becomes tapped" trigger** - City of Brass. Not the painland rider, which
  belongs to a mana ability; this fires however the land is tapped.
- **Lands that become creatures** - Blinkmoth Nexus and Inkmoth Nexus.
- **Mox Diamond** - a replacement on entering, paid by discarding a land.
  **Chrome Mox** - imprint. **Mox Amber** - mana coloured by the board.
- **Gemstone Caverns** and **Quicksilver, Brash Blur** both begin the game on
  the battlefield from your opening hand, which is mulligan-time and touches
  `mulligan.ts`.
- **Mana Vault** - does not untap normally, an upkeep payment to untap it, and a
  draw-step damage trigger. The draw step has no event.
- **Channel** - Eiganjo and Sokenzan: an ability activated by discarding the
  card from hand, cheaper per legendary creature.
- **Simian Spirit Guide** - exile from hand for mana, which is a cost paid from
  a zone nothing pays from.
- **City of Traitors** sacrifices itself when you play another land - a
  land-drop watcher, which `landfall` nearly is.
- **Starting Town** wants a turn-number condition; **Multiversal Passage** is in
  batch 3.

The three modal double-faced cards - Emeria's Call, Shatterskull Smashing,
Needleverge Pathway - use arrival shapes that already exist, and MDFCs are
supported since Fell the Profane. Their front faces are the work.

### Batch 8 - the singles, and the cheap sweeps

**Angrath's Marauders** doubles all damage you deal, a replacement effect on an
event `replacements.ts` does not cover. **Ajani, Nacatl Pariah** is a creature
that transforms into a planeswalker, so it needs both halves of a card type the
engine does not have. **Éomer** brings the monarch. **Esper Sentinel** taxes an
opponent's first noncreature spell by its own power. **Professional Face-Breaker**
and **Ragavan** both read combat damage to a player and then play cards from
exile. **Pyroblast** and **Red Elemental Blast** are modal and colour-conditional.
**Rite of Flame** counts copies of itself across all graveyards.

Cheap enough to sweep up whenever a batch has room: **Swords to Plowshares**
(exile, controller gains life equal to its power), **Path to Exile**,
**Imperial Recruiter** and **Recruiter of the Guard** (an enters-battlefield
tutor narrowed by power or toughness - `searchLibrary` already does the rest),
**Enlightened Tutor**, and **Gamble** (tutor plus a random discard).

### Where the list stands before any work

17 of 100 by the report, and low for a reason that is about the pool rather than
the deck: Boros is new ground.

**The honest headline is that this list is more tractable than the Yuriko one
even though fewer cards start playable.** The Yuriko list needed a win effect
the engine has no concept of, and a keyword that moves cards out of hand
mid-combat, before it did anything at all. This deck needs one combat capability
- putting a creature onto the battlefield tapped and attacking - and then a
single well-built "may this action be taken" layer that sixteen cards share. Two
things, both general, both useful to every list after this one. That is exactly
what the deck-led loop is supposed to produce.

## Step 1 of the Winota list: the mana base (2026-08-15)

Chosen first because 37 of the list's 100 cards are lands or mana sources, and
because the pool held five Boros lands and Sol Ring — there was no legal board
to test anything else on.

**The list went from 6 playable to 21. The pool went from 941 fixtures to 956.**

### A generator bug that had gone unnoticed for five days

`gen_fixtures.py --named` crashed on the first run, and the traceback is worth
recording because of how quiet the failure was.

`parse_mana_cost` grew a third return member when `{X}` costs shipped on
2026-08-10. `ts_mana_cost` was updated to unpack three; `emit` — the creature
and artifact path — was not, and still read `generic, colors = parsed`. So every
creature or artifact routed through `emit_named` raised `ValueError: too many
values to unpack` and **took the whole run down with it**, discarding the lands
that had already been built successfully in the same pass.

The tell was that the first run emitted *nothing at all* while reporting
twenty-one skips. A generator that quietly emits fewer cards than asked for is
the failure this mode's docstring was written to prevent; this was the same
failure one level up, and it had been sitting there since the day X costs
landed. `emit` now formats through `ts_mana_cost` like `emit_spell` does — one
formatter, one place to change — and returns `None` for a cost it cannot
represent, which `emit_named` already knew how to report.

Ornithopter, Ornithopter of Paradise and Phyrexian Walker only exist in the pool
because of that fix.

### What the generator wrote

Eleven, untouched by hand: **Ancient Tomb**, **Arid Mesa**, **Battlefield
Forge**, **Clifftop Retreat**, **Plateau**, **Scalding Tarn**, **Sunbillow
Verge**, **Arcane Signet**, **Ornithopter**, **Ornithopter of Paradise** and
**Phyrexian Walker**.

Clifftop Retreat is the one worth pointing at: `entersTappedUnless: { kind:
"controls-subtype", subtypes: ["Mountain", "Plains"] }` is Woodland Cemetery's
shape exactly, so the card the report filed as blocked was a straight
application of something built for the Blech list. That is the deck-led loop
paying out, which is the whole premise of it.

### What was written by hand, and why that was the point

Four cards the generator refuses for want of a *pattern*, not for want of an
engine feature. Each was named in this list's roadmap as writable today, and
writing them is a better test of that claim than re-reading the heuristics
table:

- **Lotus Petal** — tap, `sacrificeSelf`, five abilities one per colour.
- **Mana Confluence** — tap, `payLife: 1`, the same five.
- **Sacred Foundry** — `entersTappedUnlessPayLife: 2`, mana from its printed
  basic land types. Overgrown Tomb's cycle in Boros.
- **Sunbaked Canyon** — `payLife` on the mana halves, and mana plus tap plus
  `sacrificeSelf` on the draw.

All four were in the report's BLOCKED column, three of them charged to
"sacrificing something other than the card itself" while sacrificing themselves.
**The staleness is now demonstrated rather than asserted**, which is what batch 0
has to fix.

### What is still refused, and where each one goes

The generator's remaining refusals are honest, and each maps to a named batch:

- **Cavern of Souls**, **Multiversal Passage** — a choice remembered on a
  permanent (batch 3).
- **City of Brass** — a "becomes tapped" trigger. **City of Traitors** — a
  land-drop watcher. **Mana Vault** — an untap payment and a draw-step trigger.
  **Gemstone Caverns** — opening-hand placement. **Chrome Mox**, **Mox Amber**,
  **Mox Diamond** — imprint, board-read mana, a discard replacement.
  **Simian Spirit Guide** — a cost paid from hand. **Eiganjo**, **Sokenzan** —
  Channel. **Starting Town** — a turn-number condition. All batch 7.
- **Blinkmoth Nexus**, **Inkmoth Nexus** — lands that become creatures, also
  batch 7.
- **Homeward Path** — handing every creature back to its owner, batch 5.

### One more tool gap, not fixed

`gen_fixtures.emit_named` indexes cards by full name only, so **Emeria's Call**,
**Needleverge Pathway** and **Shatterskull Smashing** came back as "no such card
in the bulk data" — they are the front halves of modal double-faced cards whose
Scryfall names carry both faces. `deck_report.py` has a half-name index for
exactly this and the generator does not.

Left alone deliberately: all three want their front faces built regardless, so
resolving the name would only move them from one refusal to another. Worth
fixing alongside the flavour-name lookup in batch 0, so the two name-resolution
gaps are closed together.

956 fixtures, `audit_fixtures` and `audit_triggers` clean, `audit_text` clean bar
the two long-known gaps (Incinerate's regeneration clause, Winding Constrictor's
counters-on-a-player line). 1,087 tests, typecheck clean.

## Steps 0 and 1 of the Winota list: the report, and creatures that arrive attacking (2026-08-15)

Taken together because the first makes the second's numbers mean anything.

**The list is at 22 of 100. The pool is at 957 fixtures.**

### Batch 0: the report told the truth about itself

Six `BLOCKERS` entries in `deck_report.py` were describing an engine from
several batches ago. Each is now either gone or narrowed to the shape that is
genuinely absent, with a comment saying when and why:

- **Mill** — removed outright. `{ kind: "mill"; amount: Amount }` is in types.ts.
- **Paying life as a cost** — narrowed to *an unfixed amount*. A flat "Pay N
  life" is an `ActivatedAbilityCost.payLife`, an `AdditionalCost`, or
  `entersTappedUnlessPayLife`, and has been for weeks. This one heading was
  putting four already-writable cards in the engine queue.
- **Library manipulation** — narrowed to scry/surveil of 2 or more and to
  hand-to-library-top. scry 1, surveil 1 and a `library-top` search destination
  all exist; the heading claimed the library was untouchable.
- **Discard** — narrowed to discard-as-a-cost and to the caster choosing from a
  revealed hand. The printed each-opponent discard, where the *discarding*
  player chooses, was the hard half and shipped in August.
- **Sacrificing something other than the card itself** — now carries a negative
  lookahead. Oracle text has the card's own name replaced with `~` before it
  gets here, so `Sacrifice this` and `Sacrifice ~` are the two ways a card gives
  itself up, which `sacrificeSelf` has done since the fetchlands. It was
  charging twelve cards on the Winota list for a capability none of them needs.
- **Permanents that enter tapped only under a condition** — split in two, and
  **the split is the finding**. `As this ... enters` was filed here as a
  conditional tapland. On this list it matched five cards and not one was a
  land: Cavern of Souls choosing a creature type, Sanctum Prelate a number,
  Greymond two abilities, Windcrag Siege a mode, Multiversal Passage a basic
  land type. **A choice made as a permanent enters, and remembered** is now its
  own heading, because it is a real capability that was hiding behind a solved
  one.

**`gen_fixtures` learned half-names.** A modal double-faced card is stored under
"Emeria's Call // Emeria, Shattered Skyclave" and everybody types the front
face, so three real cards were reported as "no such card in the bulk data" —
the same wrong answer `deck_report.py` grew a halves index to stop giving. The
first attempt at this did nothing at all, because the index was being filled
*after* an early `continue` that skips every card whose full name nobody asked
for, which is exactly the case it exists for. All three now resolve and are
refused for their actual content, which is the right answer.

**Two audit bugs, both surfaced by the new cards rather than by reading.**

`audit_fixtures` compared mana costs as *rendered strings* in WUBRG order.
Winota is the first Boros spell in the pool and prints `{2}{R}{W}`, because a
card's pips follow the colour wheel rather than the WUBRG canon — so a correct
fixture was reported as broken. A fixture stores `colors` as a map and a map has
no order, so the fixture could not have been "fixed"; the comparison is now
between bags of symbols. Left alone it would have rejected every gold card whose
printed order is not WUBRG.

`audit_text` needed the two shapes the pool had just gained: a mana ability
whose cost includes life (the horizon lands), and Winota's three sentences,
which name one feature between them because they are one printed ability.

### Batch 1: a permanent can now join a combat already under way

Nothing in this engine could add to combat after attackers were declared, and
six cards on this list do exactly that. The primitive is one option on the
arrival path — `enteredBattlefield` and `putOntoBattlefield` take an
`attackingPlayerId`, and write straight into `state.attackers`.

**Deliberately not routed through `declareAttackers`.** A creature *put* onto
the battlefield attacking was never *declared* as an attacker (rule 508.3b), so
no attack trigger fires for it — not its own, and not another permanent
watching. That is the rule, and here it is also load-bearing: it is what stops
Winota's own output from setting Winota off again, and what stops Myrel's
Soldiers from making more Soldiers forever. Writing into the map rather than
calling the declaration path gets it for free.

Three smaller pieces around it:

- **`createToken.attacking`** — "create a 1/1 red Goblin token that's tapped and
  attacking", which five cards on this list print.
- **`watchFor.excludeSubtype`** — Winota watches "a **non-Human** creature you
  control". Its own field rather than a flag on `subtype`, because a card asking
  for a non-Human is asking two questions and folding them together would make
  "Human" and "not Human" indistinguishable on the fixture.
- **`deployFromTop`** — Winota's whole ability as one effect: look at the top
  six, optionally take a Human creature card onto the battlefield tapped and
  attacking with indestructible until end of turn, and put the rest on the
  bottom in a random order. It rides on `PendingSearch` for the reason surveil
  does — one picker, one place to get hidden information wrong. The cards it
  looks at never leave the library unless one is taken, so nothing triggers for
  the five it buries.

**Winota, Joiner of Forces is in the pool**, with eight tests: that a non-Human
attacking fires her and a Human does not, that only Humans among the top six are
offered while a seventh below them is not, that the chosen card arrives tapped,
attacking the right player and indestructible, that declining still buries the
six, and — the one that matters — that the deployed Human does not set her off
again.

**One renderer bug, caught by reading the output rather than by a test.** The
card panel described Winota as "whenever a creature you control attacks",
silently dropping the "non-Human". That is every attacker rather than half of
them, and the difference is the entire deck the card is built for. `watchedNoun`
now prints the excluded subtype.

**What this batch does *not* finish, and the report now says so.** The
token-attacking half completes no card on this list by itself: Ainok Strike
Leader also wants a per-opponent count and a sacrifice, Anim Pakal a dynamic
amount, Myrel a hate static, Voice of Victory the same. The primitive is
necessary for all four and sufficient for none, which is exactly the distinction
the report's two columns exist to draw.

957 fixtures. `audit_fixtures` and `audit_triggers` clean, `audit_text` clean bar
the two long-known gaps. 1,095 tests, typecheck clean.

**Next by value:** the hate statics — "may this action be taken" — which the
refreshed report now shows as the largest single group on the list.

## Batch 2 of the Winota list: the hate pieces (2026-08-15)

**The list is at 30 of 100. The pool is at 965 fixtures.**

### A layer that answers whether an action may be taken at all

Every continuous effect the engine had before this one *changes* something - a
power, a keyword, whether a permanent enters tapped. These decide whether an
action happens, which is a different question and has to be asked somewhere
else: at the moment a player tries to cast, activate or draw.

`restrictions.ts` is that layer. `ActionRestriction` is a closed list of the
phrases real cards print, in the same spirit as `BoardCondition` - a general
"forbid any action matching a predicate" language would have been quicker to
write and impossible to read back against a card, which is the opposite of what
this pool is for.

Five shapes cover everything on this list:

- **`cast-limit`** - "Each player can't cast more than one spell each turn",
  narrowed by `only` to Deafening Silence's noncreature and Ethersworn
  Canonist's nonartifact.
- **`opponents-cannot-cast`** - Silence for the rest of the turn, Grand
  Abolisher only while it is your turn.
- **`opponents-cast-from-hand-only`** - Drannith Magistrate, which in Commander
  mostly means switching off the command zone.
- **`cannot-activate`** - Clarion Conqueror (everyone) and Grand Abolisher
  (opponents, during your turn).
- **`draw-limit`** - Spirit of the Labyrinth.

Checked in three places, each *before* anything is announced or paid, because
"can't" in Magic means the action is never taken rather than taken and undone:
`castSpell`, `activateAbility`, and `drawCard`.

**Four decisions worth writing down, because each is a way to get the cards
quietly wrong:**

**The tally is taken when a spell goes on the stack, not when it resolves.**
"Cast" happens on announcement, so a countered spell still counts against Archon
of Emeria. Counting on resolution would have made every card here materially
weaker than printed, and it is the sort of error that never announces itself.

**A limit binds its own controller.** These cards say "each player", and a
version that exempted the controller would be a different and much stronger
card. Archon of Emeria is a real cost to its own deck.

**A forbidden draw is not a draw from an empty library.** Spirit of the
Labyrinth simply stops the draw happening. Routing it through the empty-library
path would lose the game to a card that only says you cannot draw - and the
state-based action would have made it look like a rules-correct death.

**Mana abilities are activated abilities.** Clarion Conqueror switches off Sol
Ring exactly as it switches off a creature's tap ability. Exempting mana would
have made the card far weaker than it reads. Lands are not on its list, which is
what keeps it playable in its own deck, and there is a test for both halves.

**Silence needed one more piece**: `restrictThisTurn`, which puts a restriction
on `GameState.turnRestrictions` rather than on a permanent. It outlives the
spell that made it and ends in the cleanup step, which is exactly what "this
turn" means and what a permanent's static could not express.

### Eight cards, and the highlight agrees with the engine

**Deafening Silence, Ethersworn Canonist, Grand Abolisher, Drannith Magistrate,
Spirit of the Labyrinth, Clarion Conqueror, High Noon and Silence.**

Every one was transcribed by a script that **asserts the oracle text it expects**
before writing the fixture, so a card whose printed wording differs from what is
being modelled fails loudly instead of shipping a near-miss. All eight
assertions passed first time.

`canPlayCardNow` consults the same function `castSpell` does. Without that the
client would light a card up, the player would click it, and the engine would
throw - and there is a test asserting the two agree.

### What the renderer would have dropped

Left to itself the card panel described Grand Abolisher as a vanilla 2/2 for
`{W}{W}` and Deafening Silence as an enchantment with no text at all: a
restriction is not an effect, a trigger or a keyword, and `describeCard` walked
straight past it. It prints them now.

One wording bug on the way: `countWord(1)` returns the article "a", which is
right in front of a token's name ("create a 1/1 Soldier") and wrong after "more
than", where the cards print the numeral. "Each player can't cast more than a
spell each turn" is now "more than one".

`audit_text` learned `staticRestrictions` too, per restriction rather than per
card - Grand Abolisher's one printed sentence is two restrictions, and a card
that accounted for only half of it would pass while modelling half a card.

### What is still blocked in this group, and why

Eight of the sixteen. The rest each want something from another batch, and the
report says so rather than crediting this one:

- **Archon of Emeria** - also makes an opponent's nonbasic lands enter tapped,
  which is a static reaching *their* permanents as they arrive.
- **Myrel** and **Voice of Victory** carry the Grand Abolisher line already, but
  also an attack trigger with a counted amount and Mobilize's delayed sacrifice.
- **Ranger-Captain of Eos** is one step away: its sacrifice ability is exactly
  `restrictThisTurn`, and it is held up by an enters-battlefield tutor narrowed
  by mana value.
- **Sanctum Prelate** wants batch 3 - a number chosen as it enters and
  remembered.
- **Hexing Squelcher** wants ward paid in life and "spells you control can't be
  countered" as a granted static.
- **Aven Mindcensor** does not forbid a search, it *shortens* one.

965 fixtures. `audit_fixtures` and `audit_triggers` clean, `audit_text` clean bar
the two long-known gaps. 1,105 tests, typecheck clean.

## Batch 3 of the Winota list: a choice remembered, and a bot that could hang the game (2026-08-16)

**The list is at 31 of 100. The pool is at 966 fixtures.**

### The defect batch 2 introduced

The hate pieces gave the engine a whole new class of refusal, and **the bot knew
nothing about them**. `castableFromHand` filtered on mana and additional costs;
nothing asked whether the spell could be cast at all. So a bot facing an Archon
of Emeria would propose its second spell of the turn and the engine would throw.

The existing full-game tests passed the entire time, because neither archetype
deck happens to contain a hate piece. That is the shape of bug this project
keeps meeting: a test that is green for a reason unrelated to what it claims to
cover.

Both bot paths now consult the same functions the engine does -
`castRestrictionProblem` for hand and command zone, `activateRestrictionProblem`
before an ability's cost is even weighed - and there is a test that stands
Clarion Conqueror and High Noon in front of the bot and asserts that **whatever
it decides, applying it does not throw**. That is what "the bot is just another
client" has to mean.

### A choice made as a permanent enters, and remembered

Five cards on this list choose something as they arrive and read it back for the
rest of the game. Nothing in the engine recorded a decision *on a permanent*:
modal spells choose as they are cast and throw the wrapper away before anything
downstream sees it, which is the opposite shape.

`EnterChoice` is the question, `ChosenOnEntry` is the answer, and it lives on the
`CardInstance`. `enteredBattlefield` sets `pendingEnterChoice` and the game holds
there exactly as it does for a search, until `resolveEnterChoice` answers.

**Asked after the permanent is on the battlefield**, where the rules make it a
replacement applied on the way in. Indistinguishable in play for every card in
this pool, because nothing here reads the choice during the arrival itself - and
the same shortcut is already taken by `payLifeToEnterUntapped`, which enters
tapped and then untaps.

The answer is checked against what was actually asked, so a client cannot name a
keyword Greymond never offered or a mode Windcrag Siege does not print.

### Sanctum Prelate

The first restriction that reads something off **its own permanent** rather than
off the card, which is why `activeRestrictions` now carries each entry's
`chosenOnEntry` alongside it.

**A Prelate whose number was never chosen restricts nothing.** Defaulting to zero
would switch off every zero-cost spell in the format on the strength of a
question nobody answered - and it would look exactly like a working card. There
is a test for it.

### A game that cannot answer is a hung game

A permanent that stops the game and asks is only safe if something can reply.
The bot now has an opinion about all five shapes, and `chooseOnEntry` says out
loud that its answers are defensible defaults rather than considered plays -
Sanctum Prelate naming 3 is guesswork without seeing a hand, and the comment
names it as the thing to improve when the bot learns to read a board.

TypeScript found the rest of the wiring by itself: `useBotOpponent`'s switch over
bot actions is exhaustive, so adding the action forced the answer through
`GameController`, which forced an implementation in the local controller. The
network controller and the bot's WebSocket runner **throw a named error**,
because the protocol carries no message for this yet and a silently swallowed
answer hangs the game with nothing to debug.

**Still missing, and it is the one thing to know before playing a deck with
Sanctum Prelate in it: there is no overlay for a *human* to answer the prompt.**
Bot-controlled permanents are fine. A human casting Sanctum Prelate in the client
would stop the game. The engine, the controller interface and the local
controller are all ready for it; what is absent is the React overlay, alongside
the ones that already exist for searches, confirmations and amounts.

### The renderer, for the third batch running

Left alone, the card panel showed Sanctum Prelate's restriction with no hint of
where the number comes from - a card that stops a mana value nobody picked. It
prints the choice now, and takes the noun off the type line, because the cards
say "As this **creature** enters" and "As this **land** enters" rather than a
flat "permanent".

That is three batches in a row where `describeCard` silently dropped a whole new
kind of text. The pattern is clear enough to name: **anything added to
`CardDefinition` needs a line in the renderer and a rule in `audit_text` in the
same change**, or the panel quietly misdescribes every card that uses it.

### What batch 3 did not finish

One of the five. The other four each want something beyond the choice itself,
and the report says so rather than crediting this batch:

- **Cavern of Souls** needs mana whose spend restriction reads the chosen type;
  `ManaSpendRestriction` currently has one member, for Delighted Halfling.
- **Greymond** needs `buffsReaching` to carry its source instance so the granted
  keywords can be the chosen ones. That file has a documented recursion hazard
  and is worth a careful pass of its own.
- **Multiversal Passage** *becomes* the chosen basic type, so its mana ability
  has to be derived from a choice rather than printed.
- **Windcrag Siege**'s Mardu half doubles a triggered ability, which is a
  replacement effect on triggering and nothing to do with this batch.

966 fixtures. `audit_fixtures` and `audit_triggers` clean, `audit_text` clean bar
the two long-known gaps. 1,114 tests, typecheck clean.

## Four things that made the client do the player's job for it (2026-08-16)

Three reported, one found on the way. Every one is the same failure in a
different place: the engine knew the answer and asked anyway.

### Auto-tap now spends the mana that costs the least flexibility

The reported case, and the worst of the four. `chooseSource` took the first
useful source in board order, so the *generic* part of a cost would happily eat
the only land producing a colour the next spell needed. Blight Mound into Tend
the Pests is exactly that: five mana off five lands, and a left-to-right chooser
spends both Forests on Blight Mound's generic and leaves three Swamps that can
never make the `{G}`.

`flexibilityRank` decides it now, and the order is the whole of it:

1. **Colourless costs nothing** - a Sol Ring tapped for generic is free, where a
   Swamp tapped for the same is a black pip gone.
2. **A permanent that makes fewer colours goes first** - a basic Swamp before a
   Watery Grave, because the dual is also the only blue source you might have.
3. **Spend from the colour you have most of** - with four Forests and one Swamp,
   generic comes off a Forest.

**One bug in the first attempt, worth recording**: flexibility was measured
against the *filtered* list of useful sources, so while paying `{B}` a Bayou had
its green half filtered out and looked mono-coloured - and got spent ahead of
the basic, which is the exact mistake the change exists to prevent. It ranks
against every source now.

Verified in the client, on the lab's Blight Mound board: casting it taps Forest,
Swamp, Swamp and leaves a Forest and a Swamp untapped, and Tend the Pests is
then lit as playable with no manual tapping.

### The blocker step no longer stops you when there is nothing to decide

`hasEligibleBlocker` asked "does this player have an untapped creature". That is
not the question - "could any of their creatures block something that is
actually attacking" is. A lone flyer against a board of ground creatures still
stopped the game and asked the defender to confirm a decision the rules never
offered them.

It asks `blockProblem` now, once, against the real attackers. The evasion rules
stay in the one place that owns them rather than being approximated in a second,
and anything added later is picked up for free. The instants half of this needs
no work: `hasAnyLegalAction` already decides whether the priority window is worth
stopping at, and with nobody eligible to block it simply carries.

### "Target opponent" is not a choice in a two-player game

`soleLegalTarget` names the one legal answer when a selector names a player and
there is exactly one, and the client skips straight past the picker in all three
places it opens one - casting, activating, and casting after announcing X.

**Format-coded, not card-coded**, as asked: the same card in a three-player pod
has two legal answers and is still asked for. "Target player" is still asked for
even in a duel, because you are a legal answer too.

Deliberately limited to selectors that name a *player*. A creature selector with
one legal creature looks like the same situation and is not: the board changes
constantly, players routinely mean to aim at their own thing, and silently
pointing a removal spell at the only legal target is how a game gets lost to an
interface.

### The entry-choice overlay

Batch 3 left the engine able to stop the game and ask "as this permanent enters,
choose ..." with nothing in the client able to answer - a human casting Sanctum
Prelate would have stopped the game dead. `EnterChoicePrompt` handles all five
shapes, though only `number` has a card in the pool today: a prompt that rendered
nothing for the other four would be a hung game rather than a missing feature.

It cannot be dismissed, which is the same posture as the search picker and for
the same reason. `mustNotAutoPass` also holds on `pendingEnterChoice` now - the
omission that would have let auto-pass run straight past the question.

**Not visually exercised**: no card in the lab's ninety-three has an entry
choice, so the overlay has been compiled, wired and type-checked but not clicked
through. It is the one thing in this batch resting on construction rather than on
having been seen to work.

### One test contract genuinely changed

Three `autoPass` tests asserted that any untapped creature makes an eligible
blocker, with nothing attacking. That was the old, too-loose contract; they set
up an attacker now, and there is a new test for the flyer case - Serra Angel
against Grizzly Bears leaves nobody eligible, and adding a Giant Spider brings
the decision back.

1,124 tests, typecheck clean.

## Batch 4 of the Winota list: a turn with two combat phases (2026-08-16)

**The list is at 34 of 100. The pool is at 969 fixtures.**

Three cards, and the reason the roadmap called this batch the one that turns the
deck into what it is: with a copy effect on the board these are the combo kills,
and until today the turn machine had exactly one combat phase and no way to
insert another.

### The extra phase loops back into a fixed sequence

`TURN_SEQUENCE` stays a fixed list of steps, and leaving `end-combat` with
`extraCombatPhases` owed sets the phase back to `begin-combat` instead of moving
on. The alternative - rewriting the sequence mid-turn - would have made
`currentIndex` unanswerable, and everything that asks where the game is asks
through it.

Taken on the way *out* of end-combat rather than on the way in, because that is
where the phase genuinely ends: after damage, after the last priority window,
and after `attackers` has been cleared, so the new phase opens with nothing
declared and creatures that were untapped in the meantime free to attack again.

`combatPhasesThisTurn` counts them, and it exists for one clause: **"if it's the
first combat phase of the turn" is the whole of what stops Raph & Leo giving
itself a third phase, and a fourth.** Both counters reset with the turn, so a
phase promised and never reached is not owed to anybody else.

### Exert is one flag doing two jobs, deliberately

`CardInstance.exerted` is read by the untap step, which skips the permanent and
clears the flag. That leaves it set for the whole of the turn it was exerted in,
which is exactly the window "if this creature hasn't been exerted **this turn**"
asks about. A separate `exertedThisTurn` would have been a second place for the
same answer to go stale.

Summoning sickness still wears off: an exerted creature is not a new arrival, it
is simply still tapped.

Combat Celebrant's ability is an optional `attacks` trigger whose effect is a
sequence beginning with the exert. Real exert is chosen as attackers are
declared; an attack trigger goes on the stack in that same step and resolves
before blockers, so the difference is invisible in play - and writing it this way
kept the "when you do" reading intact without a second mechanism.

### A trigger that points at more than one thing

`chooseTriggerTarget` pushed the ability onto the stack the instant it was handed
anything, so every trigger in the pool before Raph & Leo took exactly one target.
"Untap one or two target attacking creatures" needed the plural.

The pending choice carries `min` and `max` now, `chooseTriggerTargets` is the
real entry point with the singular kept as a wrapper, and the transport went
plural everywhere rather than growing a second message beside the old one - two
ways to answer one question is two things to keep in step. The client collects
clicks and offers a Confirm, because **stopping at one is a legal answer and
nothing else can tell that it was meant.**

Everything is re-checked in the engine: how many were named, that each was
offered, and that none was named twice.

### The bot action the headless harness has been dropping

Found by a test that should have passed and did not. **`applyBotAction` has never
had a case for pointing a trigger at something.** The bot decided the action, the
switch fell through, the function returned, and the parked choice sat there until
the turn cap ended the game. Silently, in every bot-vs-bot run that met a
targeted trigger, since triggers learned to target.

Four other cases were missing with it - discard, sacrifice, card choice, amount.

The fix that matters is not the five cases. It is the `never` guard now at the
bottom of that switch: a missing case is a compile error, and an action that
somehow arrives unhandled says so out loud. The same guard on `useBotOpponent`'s
switch is what forced batch 3's entry choice through the whole controller stack,
which is why that one could not have gone wrong this way.

### Four things wrong with the renderer, found by reading its output

The lesson written down after batch 3 was: anything added to `CardDefinition`
needs a line in the renderer and a rule in `audit_text` in the same change. That
was done - and dumping the actual rendered text still found four faults, three of
them nothing to do with the new fields.

- **`{W/R}`.** `formatManaCost` sorted a hybrid symbol's halves into WUBRG order,
  producing a symbol that appears on no card. Hybrid pairs print in colour-wheel
  order; the fixtures carry Scryfall's, so it prints what is stored now.
- **Blade Historian read as free.** `manaSymbols` ignored `hybrid` entirely, so a
  cost with no generic and no plain pips drew the `{0}` icon. Only reachable
  today, because these are the first cards whose *own* cost is hybrid - every
  hybrid before them sat in an activated ability.
- **"untap a or two target attacking creatures."** `countWord(1)` is "a", the
  right article in front of a noun and the wrong word here. The same trap the
  "up to one" branch beside it already spelled out.
- **"you may exert it. Untap all other creatures you control."** Two sentences,
  reading as though the untap happens regardless - a materially better card than
  the one printed. It says "When you do," now, and the reminder text sits at the
  end of the ability where the card puts it.

All four are now asserted, and there are pool-wide checks so a later card
carrying any of the new fields cannot render without the sentence that explains
it. One of those checks reported Winota as a fault on its first run: a blunt
search for `"attacking":true` matched `deployFromTop.attacking`, a different
field with the same name saying a creature *arrives* attacking rather than that
it must already be.

### The generator had been refusing hybrid for six days

`parse_mana_cost` returned None for any hybrid symbol, on the stated grounds that
"the engine still cannot pay" it. `ManaCost.hybrid` shipped on 2026-08-10.
Blade Historian needed no engine work at all - the conditional keyword-granting
static has existed since the anthem layer learned `restriction: "attacking"` for
Blight Mound - and was blocked by nothing but this.

Two-colour hybrid only. Phyrexian and monocoloured hybrid ({2/W}) genuinely have
no representation and are still refused, rather than flattened into something
payable that the card does not print.

The deck report's "Untap effects" heading went the same way: untapping a creature
is not a blocker any more, and what is left of that heading is the permanent that
refuses to untap on its own.

### What is verified, and what is not

969 fixtures. `audit_fixtures`, `audit_triggers` and `audit_text` all clean, bar
the two long-known gaps in the last. 1,154 tests, typecheck clean.

**Checked in the browser:** all three cards in the deck builder's pool - text as
printed, `{1}{R/W}{R/W}` and `{R/W}{R/W}{R/W}{R/W}` rendering as the fallback
text they should, and Raph & Leo offered as a commander.

**Not walked by a human:** an actual second combat phase in the client. The card
lab is built around the Blech deck - its commander, its colour identity, its
land-base helper - so there is no Boros board to stand these on, and neither
archetype deck contains them. The behaviour has seventeen engine tests and three
bot tests behind it, including the bot playing on into the phase it just bought.
That is construction plus coverage rather than having been seen, and it is the
same caveat the entry-choice overlay carries from the batch before.

## Batch 5: the free ones, and everything batches 2 and 3 left behind (2026-08-16)

**The list is at 47 of 100. The pool is at 983 fixtures.**

Thirteen cards. Six were blocked by the *generator* rather than the engine, six
were the leftovers from the two previous batches, and one - Windcrag Siege - was
the hardest card on the list that is not a planeswalker.

### Seventeen cards read by hand, six of them nearly free

The deck report's "unrecognised - needs reading by hand" heading means the
generator cannot parse the card. It does **not** mean the engine cannot play it,
and the difference is worth a lot: Blade Historian yesterday needed no engine
work at all.

Reading all seventeen against Scryfall found six within reach, and five of them
wanted the same small thing - **a library search narrowed by what a card is, not
just what type it is**:

- `maxPower`, `maxToughness`, `maxManaValue` for the three recruiters.
- `cardType` taking a list, for Enlightened Tutor's "an artifact **or**
  enchantment card". One field rather than two, the same shape `watchFor.type`
  already uses.

**Cathar Commando needed nothing at all** - flash, a sacrifice cost and a
destroy effect have all existed for weeks.

**Path to Exile needed nothing either**, and the reason is worth writing down:
"its controller **may** search" is not a flag. Declining a search is always
legal - you search, take nothing, and shuffle - so the optional wording and the
compulsory one land in the same place. Imperial Recruiter prints no "may" and
behaves identically, which is the real rule rather than a shortcut.

### A card with two continuous effects

Greymond grants keywords unconditionally and gives +2/+2 only while you control
four Humans. Two effects with different lifetimes, and `staticBuff` held one.

It takes either a buff or a list of them now - no existing fixture changed - and
`StaticBuff` grew three fields: a `condition` for the second half, and two ways
to grant something that is not a plain keyword. `buffsReaching` carries the
*source permanent* alongside each buff, because one of them cannot be read
without it: "each of the **chosen** abilities" lives on Greymond's own
`CardInstance`, not on the card.

### Mana that knows what it may pay for

Cavern of Souls names a creature type as it enters and then makes mana only for
that type. `ManaSpendRestriction` had one member, written for Delighted
Halfling's "a legendary spell".

The chosen type is **stamped onto the mana as it is produced** rather than looked
up later. The restriction on the card names no type - it says "the chosen type" -
and copying it onto the lump in the pool means nothing downstream has to find its
way back to a land that may since have left the battlefield.

**The test for this found that the code was never written.** The comment
explaining the stamping went in; the stamping did not. A Cavern that made mana
for nothing at all typechecks perfectly.

### Three rules that reach across the table

Every hate piece before these narrowed what somebody could *do*. These three
change how the game works for somebody else:

- **Archon of Emeria** - "nonbasic lands your opponents control enter tapped",
  asked at the moment a land arrives.
- **Aven Mindcensor** - an opponent's search sees the top four cards and no
  more, applied to the library *before* the card filter, which is the order the
  card describes.
- **Hexing Squelcher** - "spells you control can't be countered", asked of the
  board when somebody tries rather than stamped on the spell, so a Squelcher
  arriving after the spell protects it too. Its ward is handed to your other
  creatures through a field of its own: ward carries a cost and `grants` is a
  list of keywords with none.

### Windcrag Siege, which is two cards on one permanent

The Mardu half doubles every attack-caused trigger you control. Done inside
`pushTrigger`, because that is the single door every fire site goes through, so
anything added later is covered without knowing the card exists. Each copy runs
the whole path including its own targeting - two instances of an ability really
are two abilities, pointed separately.

The mode is a `TriggerCondition` on the Jeskai half and a `staticRules` entry
**keyed to its own mode** on the Mardu half, rather than a flag. Both halves are
printed on the card and only one is live; a boolean would have made a Jeskai
Siege double triggers as well.

Its Goblin gains lifelink and haste **until end of turn**, granted to the token
rather than printed on the token definition, so cleanup takes them off. A token
whose definition carried haste would be a different card every turn after the
first.

### The renderer, for the fifth batch running

Reading the real output found six faults, and four of them were a whole line
rendering as nothing: Archon's second sentence, Aven Mindcensor's only sentence,
Hexing Squelcher's third, and Windcrag Siege's entire Mardu half.

**The worst was not a missing line but a wrong one.** The restricted-mana wording
was hardcoded to "a legendary spell", so Cavern of Souls' panel described
Delighted Halfling. A player reading it would have been told the wrong card.

There are now pool-wide checks for all ten fields this batch added, so the next
card to use one cannot render without the sentence that explains it. Two of those
checks were themselves too blunt on their first run and reported cards that were
perfectly correct - `grants` sits on a staticBuff as well as on a token, and
`maxManaValue` on the graveyard selector as well as on a search. Both walk the
fixture properly now, which is the same fix the `attacking` check needed
yesterday.

### What is left, and the one card that cannot be built

**983 fixtures.** `audit_fixtures` and `audit_triggers` clean, `audit_text` clean
bar the two long-known gaps. 1,189 tests, typecheck clean.

**Boromir, Warden of the Tower is the one leftover not built, and it is not a
matter of effort.** Its second ability ends "**The Ring tempts you**", which is a
whole subsystem - a Ring emblem with four escalating levels and a chosen Ring-bearer
- and nothing else in this pool touches it. Building the rest of Boromir and
leaving that clause off would be writing a card that is not printed, which is the
one thing `docs/ADDING-CARDS.md` forbids outright. It stays blocked until the
Ring exists or the deck drops it.

Also worth flagging, because the report will keep saying otherwise: "Granting
keywords finishes 2: Serra Ascendant, **Zealous Conscripts**". Zealous Conscripts
also gains control of a permanent, which nothing does. The heading is necessary
and not sufficient, as it always is.

## Batch 6: copying and borrowing, which is the plan's batch 5 (2026-08-17)

**The list is at 52 of 100. The pool is at 989 fixtures.**

Numbered 6 because the batch shipped yesterday took the name 5 for a different
set of cards. The plan's batch 5 is this one, and it is five cards: Kiki-Jiki,
Rionya, Ocelot Pride, Zealous Conscripts and Homeward Path.

Two capabilities, and they are the two the plan predicted would turn this deck
from a beatdown pile into what it is. Copying something you point at, with an
ending scheduled for it; and control coming apart from ownership.

### An ability that exists once and fires later

`createCopyToken` copied only `self` or `attached-creature` - it read its own
source and pointed at nothing. It takes a target now, a count, keywords for the
copy, and the thing none of the four cards works without: **a delayed trigger**.

"Sacrifice it at the beginning of the next end step" is the first ability in this
engine that is *scheduled* rather than *watched*. It is not a `TriggeredAbility`:
those are printed on a card and fire whenever their event happens, while this
exists once, belongs to no permanent, and is gone after it goes on the stack.
Kiki-Jiki can be killed and its token is still sacrificed, which is why the
tokens are held by id on `GameState.delayedTriggers` rather than looked up from
the card that made them.

The awkward part is what "the **next** end step" means, and it is a whole turn
wide: an ability that resolves *during* an end step waits for the following
turn's. Activate Kiki-Jiki in your own end step and the token lives an extra
turn, which is the sort of thing that is invisible until somebody does it. So the
turn it becomes due is worked out once, when the trigger is scheduled, rather
than being asked again at each end step.

**Sacrifice and exile are not interchangeable.** Kiki-Jiki's token dies, so
anything watching for a death sees it; Rionya's is exiled and nothing does. Both
tests assert the death count rather than the zone, because a token that leaves
the battlefield ceases to exist (rule 111.7) and is in no zone to be found.

### The three narrowings a copy effect needs

- **nonlegendary** - Kiki-Jiki. Not decoration: the legend rule would bin a copy
  of a legend immediately, so a card that ignored this would be offering a play
  that silently does nothing.
- **you control** - both. A Kiki-Jiki that could copy an opponent's creature is a
  materially better card than the one printed.
- **another** - Rionya, which copies something else and never itself.

The third one needs the *source* to mean anything, and `isValidTarget` had never
been told which permanent was asking. It takes one now, and **throws rather than
going without**: a fire site that forgot to hand it over would quietly turn
"another target creature you control" into "any", which is a combo Rionya does
not have. Every engine site that resolves a selector passes it.

### Control, which is not ownership

`CardInstance` has carried `ownerId` and `controllerId` since the first day and
nothing had ever made them differ. Zealous Conscripts does.

A control change **moves the instance between the two players' battlefield
arrays**, not only rewriting the id: nearly everything here reads a board by
walking `player.battlefield`, so a creature whose id said one thing and whose
array said another would attack for one player and block for the other.

It also comes back on summoning sickness, which is rule 302.6 and is the whole
reason the card grants haste in the same sentence. That is what makes Conscripts
a combo piece rather than a Threaten - and pointed at your own untapped Kiki-Jiki
it is a second activation, which is exactly the kill the plan named.

Homeward Path hands **everything** back, not only what this turn's effects took,
because that is what the card answers: a board that has been stolen by anything
at all.

Zealous Conscripts' three printed sentences are one effect. They act on one
permanent and there is nothing to point them at separately, so splitting them
into a `sequence` would need each step to re-find "that permanent" - which the
one effect already holds. The panel still prints three sentences.

### Ascend, and a question no permanent could answer

Ocelot Pride needed two things nothing else here has.

**The city's blessing** is a flag on the player, not a reading of the board, and
that is the entire mechanic: "for the rest of the game" means it survives a wipe
that takes you back below ten permanents. Granted in `checkStateBasedActions`,
which is where the game notices things without being asked - play the tenth
permanent and the blessing arrives at once, with nothing on the stack and no
window to respond in. The function only ever sets the flag and never clears it.

**"For each token you control that entered this turn"** needed the instances to
remember when they arrived. `enteredOnTurn` is a turn number rather than a
boolean, so nothing has to remember to clear it: "this turn" is a comparison
against `state.turnNumber` and it stays right through any number of turns with no
reset anywhere. Stamped in `enteredBattlefield`, the single door every arrival
goes through.

The card's two sentences are a `sequence`, and the Cat the first one makes is one
of the tokens the second one copies. That is the card rather than a coincidence,
and it is why the second sentence is printed with its connective - see below.

### Rionya's X is a printed phrase, not arithmetic

"where X is **one plus** the number of instant and sorcery spells you've cast
this turn" is one entry in `Countable`, including the "one plus". An arithmetic
`Amount` that could add one to another amount would be a small expression
language, which is what every closed list in this DSL exists to avoid.

It needed no new tally: `spellTypesCastThisTurn` has been kept for the hate
pieces since batch 2, so there is no second place for the answer to go stale.
Counted at resolution rather than substituted early, so casting an instant while
the trigger is on the stack really does add a copy.

### The renderer, and the batch it did not fail

**Four of the switches this touched are exhaustive over a union, so the compiler
asked before the panel could go quiet.** That is the first time in six batches
the renderer's missing lines were found by anything other than reading the
output, and it is worth naming why: the previous silent failures were all
*optional fields* on an existing effect, which no compiler can notice.

Reading the output still found one thing. Ocelot Pride's second sentence was
missing its "**Then**", and the connective is load-bearing here - without it the
sentence reads as a separate ability that might have happened first, when the
whole point is that the Cat was made before the copying. Every card in the pool
that prints a conditional after another step in one ability was checked; Ocelot
Pride is the only one, and it now reads exactly as printed.

There are pool-wide checks for all ten fields this batch added.

### The bot

`chooseTriggerTarget` warned in its own comment that the day a trigger arrived
whose target was not a gift, it would have to read the effect rather than assume
the bot's own best creature. Zealous Conscripts is that day, and a Conscripts
pointed at your own board is a five-mana 3/3 that untapped something.

Rionya is also the first **mandatory** targeted trigger in the pool that fires
every single turn, which is the exact shape of the bug batch 4 found: a parked
target choice nobody answers stops the game dead. No archetype deck contains any
of these five cards, so the full-game tests would have stayed green while a real
game hung. Both cards have a bot test standing them in front of it deliberately.

### Where the list stands

**52 of 100, up from 47.** 989 fixtures. 1,227 tests, typecheck clean,
`audit_fixtures` and `audit_triggers` clean, `audit_text` clean bar the two
long-known gaps (Incinerate's "can't be regenerated", Winding Constrictor).

The report's remaining queue, and what has actually changed in it: "copying" and
"gaining control" are gone from the blocked reasons entirely. What is left at the
top is **"unrecognised - needs reading by hand"** at 28 cards and **"dynamic
amounts"** at 12 - and the first of those is the heading batch 5 proved is worth
reading rather than trusting, since six of the seventeen it named then needed
almost no engine work.

Still not walked by a human: a real second combat phase in the client, the
entry-choice overlay, and now a stolen permanent moving across the table. All
three are blocked on the same thing - the card lab has no Boros board.

## The Blech deck becomes a deck you can play, and what that found (2026-08-17)

The Blech list has existed as a card pool and as the thing the card lab walks
since 2026-08-14. It is now one of the pre-built decks: it replaces
**Overgrowth (mono-green)** in the deck picker, and it is what Salty Mike plays
in `createDemoGame`, so it is on the table the moment the client loads.

Named after its commander, because that is what people call it.

One copy of the 99 ids, in `archetypes.ts`, read by the picker, by the demo game
and by the lab. (There were briefly two: I transcribed the list from the decklist
file without checking that `cardLab.ts` had held exactly the same ids since the
lab was built. They were byte-identical, which is luck rather than process.)

The mono-green cards are all still in the pool and still buildable in the deck
builder. What is gone is the two curated lists that made them a deck.

### What a real decklist found in an hour

Both demo decks were, until today, a commander and forty-odd basic lands. That
is the whole reason the following had never been seen: **every basic has exactly
one mana ability, and every one of these bugs needs a card with two.**

**A dual land counted as two mana.** `potentialAvailableMana` walks every mana
ability on every permanent and adds them up, so a land reading "{T}: Add {B}" and
"{T}: Add {G}" was one of each. Three lands read as four mana.

That number was answering "can I pay for this" in five places - the bot's cast
decision, the client's list of usable abilities, the client's highlight of
playable cards, the X picker, and the auto-pass check. The fix is not a better
sum, because there is no honest sum: whether a dual land helps depends on the cost
being paid. So every one of those questions now goes through `planManaPayment`,
which is the same walk the auto-tapper makes when it really pays. **The answer to
"can I" and the attempt to do it now come from one function**, and cannot
disagree.

`potentialAvailableMana` still exists and still over-counts on purpose. Its
docstring now says so, and says not to ask it this question.

**A permanent was paying for its own tap ability.** Sapseep Forest's second
ability costs "{G}, {T}" and the Forest is a green source, so with no other green
out the auto-tapper spent the Forest on the {G} and then found it already tapped.
A human clicking that ability hit exactly the same wall. Every affordability
question now excludes the permanent about to be tapped, at all three sites that
ask.

**The test harness had been casting the bot's spells wrong for months.**
`localHarness.ts` built the engine's cast options by hand and passed one of the
four fields, dropping `useAlternativeCost`, `sacrificeInstanceId` and `chosenX`.
The client's own applier passed all four - so games in the browser were right and
only the bot-vs-bot test was wrong, which is the worse direction: Deadly Rollick
was charged its printed cost rather than being free, and Tend the Pests cast with
no creature named to sacrifice. Both are refused by the engine, which in a bot
game is a dead game.

This is the twin of the bug batch 4 found in the same file, with the same root
cause: two places translating one action. The `never` guard added then catches a
missing *case*; nothing caught a missing *field*. There is one shared
`castOptionsFor` now, and a test that names each field rather than comparing a
spread, so a field added without being mapped fails.

**The bot cast a two-target tutor with no targets.** Scheming Symmetry is the one
tutor in the pool that targets, and the tutor branch had always cast with none.
It reads the selector now.

**The bot passed priority while somebody else owed an answer.** Scheming Symmetry
makes *both* players search; the engine refuses a pass with a search outstanding,
so the bot holding priority proposed one and the game stopped. Reachable before
now, but only from a card that makes an opponent search, and neither demo deck
had one.

### Where this leaves the bot

**1,235 tests**, typecheck clean, all three audits clean bar the two long-known
gaps. About thirty randomised bot-vs-bot games with the Blech deck ran clean, and
the full-game test - which plays this exact pair - passed on four consecutive
runs of the whole suite.

Worth saying plainly, because it is the honest shape of it: **"the bot proposes an
action the engine refuses" is a class of bug, not a bug**, and a real decklist
exercises it far harder than forty basics ever did. Five instances were fixed
today. There may be more in the tail; the full-game test is the net that catches
them, and it is a much better net now that it plays a deck with a mana base, an
alternative cost, a sacrifice cost and a symmetrical tutor in it.
