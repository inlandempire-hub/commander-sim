# UI vision: from spreadsheet to card game

Status: **proposal, not scheduled.** Written 2026-07-30 at the user's request, while the
actual next milestone is the bot opponent (Phase 4). Nothing here has been built.

The goal set by CLAUDE.md is "significantly above where it is now, well below MTG Arena."
Arena is a full game-engine product with bespoke per-card VFX and voice acting. What is
realistically reachable here is the layer *below* that: a board that reads as a card game
rather than a form, real card art, and motion that carries meaning rather than decoration.

---

## 1. Where the UI actually is today

Worth being blunt, because it sets the size of the gap.

| | Current |
| --- | --- |
| Total client code | 1,060 lines, of which 297 are CSS |
| Layout | Both players' boards stacked vertically in one scrolling column |
| Card | A 120px text box: name, cost, type line, P/T, keywords. No art. |
| Tapped state | `transform: rotate(8deg)` |
| Motion | Framer Motion `layoutId` per card instance - cards tween when they change zone. That is the entire animation system. |
| Combat | Selected creatures get a yellow outline. No arrows, no movement, no damage feedback. |
| Feedback | An error banner. No log, no sound, no particles, no life-change animation. |

The `layoutId` work is genuinely a good foundation - it means every card already has a
stable identity across zones, which is the hard part of card-game animation. Everything
below builds on it rather than replacing it.

---

## 2. The one architectural change that unlocks everything

**The engine must emit an event stream, and the UI must render from a queue of those
events rather than directly from state.**

This is the single highest-leverage change in this entire document and it is not a
visual one. Right now the engine mutates `GameState` in place and the client force-renders
the result. The client therefore knows *what is true now* but never *what just happened*.
That is fatal for animation:

- A whole combat step resolves in one synchronous call. Blockers are declared, damage is
  dealt, creatures die, life changes, and state-based actions fire - and the client sees
  a single new state. There is nothing to animate *from*.
- I hit this live while verifying Tifa Lockhart: by the time the DOM could be inspected,
  the landfall trigger had been pushed to the stack, resolved, and cleared. The stack read
  `STACK (0)` and the only evidence anything happened was the changed power.

### The shape

```ts
// packages/engine/src/events.ts
export type GameEvent =
  | { kind: "card-drawn"; playerId: string; instanceId: string }
  | { kind: "card-moved"; instanceId: string; from: ZoneId; to: ZoneId }
  | { kind: "permanent-tapped"; instanceId: string }
  | { kind: "mana-added"; playerId: string; color: Color; amount: number }
  | { kind: "spell-cast"; instanceId: string; targets: StackTarget[] }
  | { kind: "stack-resolved"; instanceId: string }
  | { kind: "attackers-declared"; declarations: AttackerDeclaration[] }
  | { kind: "blockers-declared"; declarations: BlockerDeclaration[] }
  | { kind: "damage-dealt"; sourceInstanceId: string; target: StackTarget; amount: number; isCombat: boolean }
  | { kind: "life-changed"; playerId: string; from: number; to: number }
  | { kind: "counters-changed"; instanceId: string; from: number; to: number }
  | { kind: "power-pumped"; instanceId: string; amount: number; untilEndOfTurn: boolean }
  | { kind: "permanent-died"; instanceId: string }
  | { kind: "step-changed"; phase: Phase; step: Step }
  | { kind: "player-lost"; playerId: string; reason: string };

// on GameState
events: GameEvent[];   // append-only within a turn; the client drains it
```

Every engine mutation site that already exists (`moveCard`, `dealCombatDamage`,
`applyEffect`, `checkStateBasedActions`, `advanceStep`) gets one `push` added. This is
mechanical work, maybe a day, and it pays for itself four times over:

1. **Animation** gets an ordered, typed script of what to play.
2. **The game log** ("Salty Mike played Forest. Landfall triggered. Tifa Lockhart's power
   was doubled until end of turn.") is a pure function of the same stream - no second
   implementation.
3. **The network layer** can send deltas instead of the whole filtered `GameState` on
   every action, which is what it does today.
4. **The bot** (the actual next milestone) wants an observation stream anyway, and this
   is it. Building the event stream now is not a detour from Phase 4 - it is groundwork
   for it.

### The animation queue / choreographer

Events arrive far faster than they can be shown. The client needs a presentation layer
that lags the truth:

```
engine state (truth, instant)
      |
      v
  event queue  --->  choreographer  --->  presentation state (what the DOM renders)
                     - plays events in order
                     - batches simultaneous ones (all combat damage together)
                     - awaits each animation's completion
                     - can fast-forward / hard-snap to truth
```

Three rules that matter:

- **Batching.** Combat damage is simultaneous in the rules and must look simultaneous.
  The choreographer groups adjacent events by a `batchId` the engine stamps, so eight
  creatures trade at once rather than in a queue.
- **Skippable.** Any click during a batch fast-forwards it. Experienced players will
  want 2x or instant; see the settings section.
- **Snappable.** In networked play the server is authoritative. If a state arrives that
  the queue can't reconcile, it must be able to discard pending animations and hard-cut
  to truth. Never let the animation layer become a second source of truth.

### The auto-pass trap

`shouldAutoPass` currently fires from a `useEffect` the instant state changes. With
animations added, **it will blow straight through every one of them** - the player will
see a static board jump from "before combat" to "after combat" because the client passed
priority six times before the first tween started.

Auto-pass must be gated on the queue being drained. Concretely:
`if (animationQueue.isIdle && shouldAutoPass(...))`. Cheap to write, invisible until you
forget it, and then it silently destroys the entire feature.

---

## 3. Card art

Scryfall's data already carries everything needed. From the live entry for Tifa Lockhart:

```
image_uris.png         full card, transparent rounded corners, ~745x1040
image_uris.art_crop    artwork only, no frame or text box
image_uris.normal      full card jpg, 488x680
image_uris.small       146x204 - a good instant placeholder
artist, flavor_text, rarity, frame_effects, set, collector_number
```

### Three rendering fidelities, used in different places

**A. Full card image (`png` / `normal`)** - authentic, zero frame-drawing work, and the
transparent corners composite cleanly. Downside: state can only be drawn *on top* of it,
and the text is baked in at a fixed size.
→ Use for: the hand, the zoom overlay, the stack, the graveyard.

**B. `art_crop` inside a custom HTML/CSS frame** - the art fills the card, and the name
bar, mana pips, P/T box, counters, damage, keyword icons and highlight states are all
live DOM you control and can animate independently.
→ Use for: **the battlefield**, where state changes constantly and needs to be legible
at a glance and animatable. This is the right default for permanents.

**C. Text-only (today's card)** - the fallback when art hasn't loaded, when offline, and
as a permanent accessibility/low-bandwidth option in settings.

The hybrid is what makes this feel like a game rather than a gallery: you get real art
where it sells the fantasy, and full control where the rules live.

### Asset pipeline

Copyright posture is fixed by CLAUDE.md and MonsterBox precedent: **never commit images
to the repo.** Fetch and cache at runtime under Scryfall's terms.

- **Cache API, not IndexedDB.** `caches.open("scryfall-art-v1")` stores `Response` objects
  natively, survives reloads, and `caches.match()` is one line. IndexedDB blobs are more
  code for the same result.
- **Prefetch the deck at game start.** You legitimately know your own 100 cards. 100
  `art_crop` at ~90KB is ~9MB - a one-time cost behind a "Loading deck art" bar, and
  free on every subsequent game. Rate-limit to Scryfall's requested ~100ms between
  requests; the whole deck warms in ~10s and only once, ever.
- **Blur-up.** Show `small` (or a solid colour sampled from the card's identity)
  immediately, swap to the full image on `decode()`. No layout shift, no pop-in.
- **Hidden-information hazard.** Do **not** lazily fetch art the moment a card enters a
  hidden zone, and do not prefetch the opponent's library. In networked play the server
  already redacts hidden cards; the art layer must respect the same boundary or the
  network tab becomes a cheat. Own deck up front, opponent's cards on reveal.
- **Optional shared cache in `packages/server`.** A `/art/:scryfallId` route that proxies
  and disk-caches means two clients on one LAN hit Scryfall once between them. Kinder to
  a free service, and removes any CORS ambiguity.
- `.gitignore` the cache directory, and say so in CLAUDE.md.

### The cheap trick that punches far above its weight

Rare and mythic cards get a **CSS holographic foil** - a `repeating-linear-gradient` with
`mix-blend-mode: color-dodge`, its angle driven by the pointer position over the card (or
by device tilt). It is about 30 lines of CSS, costs nothing at runtime, and is the single
most "expensive-looking" effect available. Gate it on `rarity` from Scryfall, which is
already in the data.

---

## 4. Layout: an arena, not a list

Today both players are stacked in one scrolling column. That is the biggest single reason
it reads as a form. The replacement:

```
┌──────────────────────────────────────────────────────────────────────┐
│  [opp avatar] [40♥] [cmd dmg 0/21]      opponent hand: ▮▮▮▮▮▮▮ (7)   │  opponent
│  ┌ command ┐  creatures ──────────────────────────  lands ────────   │
│  │  Tifa   │  [ ][ ][ ]                            [▮][▮][▮][▮]      │
└──────────────────────────────────────────────────────────────────────┘
┌═══════════════════ COMBAT LANE (attackers step into here) ══════════┐
│         ╭─ arrows drawn here during declare-blockers ─╮      STACK   │
└══════════════════════════════════════════════════════════════════════┘
┌──────────────────────────────────────────────────────────────────────┐
│  ┌ command ┐  creatures ──────────────────────────  lands ────────   │  you
│  │ Coulson │  [ ][ ][ ]                            [▮][▮][▮][▮]      │
│  [you avatar] [40♥]  mana: ●●●○○         ┌ phase rail ──────────┐    │
│                                                                      │
│              ╱ ▮ ▮ ▮ ▮ ▮ ▮ ▮ ╲   ← hand, fanned in an arc           │
└──────────────────────────────────────────────────────────────────────┘
```

Specific decisions worth making:

- **Opposed boards, no scrolling.** The whole game state fits one viewport. Zones size
  down as they fill rather than overflowing. This is non-negotiable for a card game -
  scrolling to find your own creatures kills it.
- **A shared combat lane between the boards.** Attackers physically move into it. This
  single change does more for "it feels like a game" than any particle effect.
- **Fanned hand.** Cards in an arc with a slight rotation per card (`rotate(i * 3deg -
  offset)`) and a raise-on-hover. Free, and instantly reads as cards rather than a list.
- **Piles are piles.** Library, graveyard and exile render as a stack of card backs with
  a count badge and a physical thickness (a few offset shadows), not a flex-wrapped list
  of 40 tiny cards. Click to open a scrollable overlay.
- **Subtle perspective.** `perspective(1400px) rotateX(6deg)` on the battlefield rows
  gives depth without becoming a 3D game. Keep the hand flat and unrotated so it stays
  readable.
- **Board texture themed by colour identity.** A dark felt that tints green for Mike,
  white-gold for Donny. Cheap, and it makes the two seats instantly distinguishable.
- **Custom card back.** Wizards' actual card back is their IP - design a plain one.

---

## 5. The animation catalogue

Each of these is one handler in the choreographer, keyed off one event kind. Listed
roughly in build order; the first five carry most of the value.

### Core (build first)

1. **Draw** - card flips face-up out of the library pile, arcs to the hand on a spring
   with slight overshoot, hand re-fans to make room. Opponent's draws show a card back.
   Opening hand deals 7 with an 80ms stagger.
2. **Play a land** - flies from hand to the land row, lands with a small impact ring and
   a dust puff. Satisfying because it happens every single turn.
3. **Tap** - a real 90° rotation on a spring (not today's 8°), and a **mana pip flies
   off the land into the mana pool counter**. The flying pip is what makes tapping feel
   like it produced something.
4. **Cast** - card lifts from hand, scales to ~1.6x at screen centre with a colour-keyed
   glow, **holds for ~500ms so the opponent can read it**, then settles onto the stack.
   The hold is a rules-comprehension feature, not decoration.
5. **Damage + death** - see combat below.

### Combat choreography

6. **Attack declaration** - attackers step forward into the combat lane, tilt toward the
   defender, gain a red rim light. Vigilance creatures visibly *don't* rotate, which
   teaches the keyword better than tooltip text.
7. **Blocking** - blocker slides to intercept; a curved line connects them with a crossed-
   swords glyph at the midpoint.
8. **Combat damage** - both creatures lunge at each other, impact flash at the meeting
   point, then snap back. Floating damage numbers rise and fade. Screen shake scaled to
   damage (clamped - 18 power from Yargle should not induce nausea).
9. **Trample overflow** - the excess continues *past* the dying blocker as a streak into
   the defending player's life orb. Makes a confusing rule self-evident.
10. **Death** - desaturate, crack, dissolve into ash that falls toward the graveyard pile,
    which bumps its counter. ~500ms, skippable.
11. **Life change** - the number rolls rather than jumping, the orb flashes red or green,
    and a ring gauge around the avatar animates. Commander damage gets its own 21-segment
    pip track that fills - a rule that is currently invisible in the UI.

### Ability and state feedback

12. **Targeting arrows** - a bezier from source to cursor while choosing, snapping to
    legal targets. Colour and *shape* coded (barbed for damage, rounded for buffs) so it
    survives colourblindness. Illegal targets dim to 40%.
13. **+1/+1 counters** - a physical token drops onto the card and bounces; the P/T ticks
    up digit by digit.
14. **Until-end-of-turn pump** - this project already has `temporaryPowerBonus` and the
    perfect showcase card. Tifa's landfall should send a green ripple from the land that
    entered, across the battlefield, into her - and her power should visibly *tick back
    down* during the cleanup step, with the temporary portion drawn in a distinct colour
    the whole time. This is the difference between the player understanding "until end of
    turn" and not.
15. **Landfall / triggers generally** - the permanent whose trigger fired pulses and
    briefly raises above its neighbours before the trigger object appears on the stack, so
    you can see *what* triggered, not just that something did.
16. **Keyword idles** - flying creatures bob and cast an offset shadow; deathtouch gets a
    venom-green outline; lifelink pulses pink when it deals damage; indestructible flashes
    a shield when lethal damage is marked and it survives.
17. **Stack resolution** - the top object scales, fires its effect, then the card slides
    to the graveyard. Stack objects render as overlapping cards, newest on top, with a
    clear "resolves next" marker.
18. **Ward** - a shield ripple on the warded permanent, and if the cost goes unpaid the
    incoming spell visibly shatters. Currently Ward firing is completely invisible.

### Framing

19. **Phase rail** - a persistent horizontal track of the turn's steps with a marker that
    slides. Removes the "what phase am I in" question permanently.
20. **Turn banner** - a full-width wipe: "Salty Mike's Turn". Also the natural place to
    hang a "your turn" attention grab.
21. **Priority** - a soft pulse on the active seat's border. If a chess clock is ever
    added, a depleting ring.
22. **Victory / defeat** - slow the queue to 0.3x, desaturate the board, banner in.

---

## 6. Interaction upgrades (the part players actually feel)

Motion is what it looks like; these are what it feels like. Several are higher value per
hour than any animation.

- **Auto-tap.** Today you click each land individually, then the card. The engine already
  exports `potentialAvailableMana(state, playerId)` - so clicking an affordable card can
  tap the right lands for you. This is the single most tedious thing in the current UI and
  the fix is mostly already written. Hold a modifier to tap manually when it matters.
- **Castability highlighting.** Same helper: hand cards you cannot afford dim; ones you
  can get a subtle glow. Recomputed on every mana change.
- **Drag and drop** to play cards, with drop zones highlighting on drag-start and a ghost
  following the pointer. Keep click-to-play working alongside it - drag alone is an
  accessibility regression.
- **Hover preview in a fixed slot.** Arena's approach: hovering a card shows it large in a
  *fixed corner position*, rather than scaling in place and shoving its neighbours around.
- **Right-click / long-press zoom** to a full-resolution card with oracle text, flavour
  text, artist credit, and a link to its Scryfall page.
- **Combat math preview.** Hovering a potential blocker over an attacker shows the
  outcome: both die / attacker survives / no damage. Reading eight P/T pairs by hand is
  the worst part of blocking.
- **Keyboard.** Space = pass priority, A = declare all, Enter = confirm, Esc = cancel,
  1-9 = play the nth hand card. A player who learns these will move three times faster.
- **Hold priority** modifier, for responding to your own spell.
- **Undo** in local hotseat only. The engine mutates in place, so this needs either a
  state snapshot per action (cheap enough at this scale - structured-clone the state into
  a ring buffer of 20) or event-sourced replay. Do not offer it in networked play.
- **Game log panel**, scrollable, generated from the event stream, with each line
  hoverable to highlight the cards involved.

---

## 7. Sound

Genuinely the cheapest large win, and completely absent today. Web Audio, a handful of
CC0 samples (freesound / kenney.nl - **not** ripped from Arena), maybe 25 files totalling
under 1MB:

- card draw whoosh · card place thud · land thud (lower)
- one cast chord per colour identity - white choral, green woody, red percussive
- combat clash · creature death · life loss thud · life gain chime
- counter placement click · trigger shimmer · your-turn stinger
- a low ambient bed under the board that ducks during animations

Pitch-vary each sample ±5% on playback so repeats don't grate. Master volume plus separate
SFX/ambient sliders. Muted by default until the user opts in, so it can never be a nasty
surprise.

---

## 8. Technology choices

| Option | Verdict |
| --- | --- |
| **DOM + Framer Motion** (current) | **Keep as the core.** Best text rendering, hit-testing, accessibility, and devtools. `layoutId` already solves cross-zone identity. Everything in sections 4-6 is reachable this way. |
| **Canvas/PixiJS overlay** | **Add, narrowly.** One full-screen transparent canvas above the DOM for particles, damage numbers, targeting arrows and screen shake. Keeps hundreds of short-lived sprites off the DOM without giving up DOM for the cards themselves. |
| **CSS holo/foil shaders** | **Add.** Blend-mode gradients tracking the pointer. Enormous perceived quality for ~30 lines. |
| **react-three-fiber / full 3D** | **No.** Real 3D cards look great in demos and destroy accessibility, text legibility, and build complexity. The tilt/perspective in section 4 gets 80% of the impression for 2% of the cost. |
| **Rive / Lottie** | **No.** Designed for authored animation assets; there is no designer on this project. |
| **A game engine (Unity/Godot)** | **No** - CLAUDE.md already rules this out, correctly. |

### Performance notes

- Animate `transform` and `opacity` only. Never `width`/`top`/`margin`.
- Framer Motion `layout` across 100+ elements will jank; use `layoutId` on cards only, and
  keep zone containers as plain CSS grid.
- Virtualize the graveyard and library overlays - render 12 cards, not 40.
- `decoding="async"` on every card image, and `await img.decode()` before swapping off the
  blur-up placeholder.
- Budget: 60fps with ~20 permanents in play on a mid-range laptop. Profile the combat
  damage batch specifically - it is the worst case.

---

## 9. Settings and accessibility

Not an afterthought; several of these are what make the animations *tolerable* on the
hundredth game.

- **Animation speed: instant / 0.5x / 1x / 2x.** Non-negotiable. The fastest way to make
  players hate beautiful animations is to make them unskippable.
- **`prefers-reduced-motion`** honoured automatically - cross-fades instead of flights,
  no shake, no particles.
- **Card fidelity toggle**: full art / art + custom frame / text only. The text mode is
  both an accessibility feature and the offline fallback.
- Colourblind-safe targeting (shape as well as colour), and a high-contrast board theme.
- Full keyboard operability, focus rings, and `aria-live` announcements of the game log so
  a screen reader can follow the game.
- Card text scaling independent of card size.

---

## 10. Suggested order of work

Each phase is independently shippable and leaves the app better than it found it.

| Phase | Work | Why here |
| --- | --- | --- |
| **A** | Engine event stream + choreographer + auto-pass gating | Nothing visual ships, but nothing else is possible without it - and the bot needs it anyway |
| **B** | Art pipeline (fetch, cache, blur-up) + the three-fidelity card component | The single biggest perceived-quality jump, and independent of animation |
| **C** | Arena layout: opposed boards, combat lane, fanned hand, real piles | Turns a form into a board |
| **D** | Core animations: draw, play, tap + mana pip, cast-and-hold, death | Covers ~80% of the actions in a typical turn |
| **E** | Combat choreography, targeting arrows, damage numbers, life orbs | The most-watched moment of any turn |
| **F** | QoL: auto-tap, castability highlighting, hover preview, combat preview, game log | Highest value per hour of anything in this document |
| **G** | Juice: sound, particles, screen shake, holo foil | Pure polish, safe to defer, big payoff |
| **H** | Settings, accessibility, reduced motion, speed control | Must land before anyone plays a hundred games |

A defensible smaller cut, if this ever needs to be squeezed: **A + B + C + F**. That is
real art, a real board, and a UI that stops being tedious - without a single new
animation. D, E and G are the game-feel layer on top.

---

## 11. Risks and things that will bite

- **Animation as a second source of truth.** The presentation state must always be
  derivable from, and forcibly replaceable by, the authoritative state. The moment the
  animation layer starts *deciding* things, networked play desyncs.
- **Auto-pass racing the queue** (section 2). Will silently eat every animation.
- **Hidden information leaking through the art cache** (section 3). A network request for
  a card in a hidden zone is a tell.
- **Scryfall rate limits and goodwill.** This is a free service being used for a personal
  project. Cache hard, prefetch once, back off on 429, set a descriptive User-Agent.
- **Animation length compounding.** Eight triggers at 500ms each is a four-second stall.
  Batch aggressively and make everything skippable.
- **The engine mutates in place.** Undo, replay, and any "show the past" feature all need
  either snapshots or full event sourcing. Decide which before building undo, not after.
- **Scope.** Every item here is optional except A. The temptation will be to start with
  the fun parts (particles, foil) on top of the current architecture, and then rewrite
  them when the event stream lands. Do A first even though it is invisible.
