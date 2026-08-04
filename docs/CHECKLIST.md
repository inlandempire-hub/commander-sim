# Everything to check (2026-08-04)

The full inventory of what this client does, itemised so nothing can quietly
not work. One line per thing you can look at and judge on its own. Tick what is
right; tell me what is wrong and I will fix it rather than rebuild it.

**Why it is this long.** Every animation, cue and highlight is listed
separately, not grouped as "animations". A group can be ticked while one of its
five members has been broken for a fortnight - which has already happened here
twice: a card panel that was faded to invisible by a leftover keyframe, and a
sound cue that existed for weeks with nothing on earth able to play it.

**What I could and could not verify myself.** The browser preview I develop
against does not composite frames - measured this session, zero animation
frames in 1.2 seconds. So I can prove that a thing exists, is the right size,
is in the right place, holds the right colour, is painted on top rather than
behind, and that its start and end points are correct. **I cannot watch
anything move.** Everything below marked (motion) is geometry I have checked
and movement I have never seen.

Play one game against the bot and one hotseat game; some items only occur in
one or the other and are marked.

---

## How to start

```bash
npm run dev -w @mtg-commander-sim/client
```

- [ ] `http://localhost:5180/` opens a hotseat game (you play both seats).
- [ ] `?mode=bot` plays you against the computer. `&seat=mike` takes the green
      deck instead of the white one. `&delay=350` speeds the bot up.
- [ ] `?mode=deck` opens the deck builder.
- [ ] `?mode=network&seat=donny` joins a running server; the other player opens
      the same URL with `&seat=mike`.
- [ ] The page **never scrolls**, in either direction, at any window size.

---

## 1. The opening hand

- [ ] Seven cards appear in an overlay before the game starts.
- [ ] **Keep** takes that hand. **Mulligan** draws a fresh seven.
- [ ] After a mulligan you are asked to put cards on the bottom - one per
      mulligan taken (London mulligan). The count is right.
- [ ] You cannot mulligan forever; the button stops offering it.
- [ ] Hotseat: both players get their own mulligan, one after the other.
- [ ] Bot: only your hand is offered - the bot answers its own.
- [ ] (motion) The seven cards **deal out one after another** from the library
      pile, not all at once.

## 2. Reading a card

- [ ] Hovering any card fills the **top right box** with that card, large.
- [ ] That box contains the card image and nothing else - no repeated rules
      text underneath it.
- [ ] A card with no image falls back to a readable text box: name, type line,
      rules text, power/toughness.
- [ ] With nothing hovered, the panel shows whatever is on the stack.
- [ ] **Right-click any card** to open it full-screen. Works in hand, on the
      battlefield, in a graveyard, on the stack, in the command zone.
- [ ] Right-click works on a card you **cannot** play - being told no is a
      reason to want to read it.
- [ ] Right-click during the **mulligan** opens the card *above* the overlay,
      not behind it. (This was broken and is fixed; worth confirming.)
- [ ] **Escape** closes it. So does clicking anywhere.
- [ ] Escape while inspecting during a mulligan closes only the inspect, and
      leaves the mulligan up.
- [ ] The browser's own right-click menu never appears over the table.

## 3. Playing cards

- [ ] Clicking a land in hand plays it.
- [ ] Only **one land per turn**; a second is refused with a message.
- [ ] Clicking a creature or spell casts it.
- [ ] Cards you can actually play right now are **highlighted** in hand.
- [ ] The highlight only appears while you hold priority, not during the
      opponent's window.
- [ ] Your commander sits in the **command zone** on the right of your rail and
      can be cast from there.
- [ ] Casting your commander a second time costs {2} more, a third time {4}
      more (commander tax).
- [ ] A **modal** card ("choose one") asks which mode before anything else.
- [ ] A **targeted** spell asks for a target, and only legal targets respond.
- [ ] A **tutor** stops mid-resolution and shows you your library to pick from,
      with a search box.
- [ ] Cancel is available on every "choose a target" prompt.

## 4. Mana

- [ ] Hovering a castable card **outlines in gold the exact lands** it will tap.
- [ ] One land lights up for a one-mana spell, two for a two-mana one.
- [ ] Nothing lights up for a card you cannot afford, or one in a graveyard.
- [ ] The lands that light up are the lands that actually turn when you click.
- [ ] Your mana readout in the rail says `Mana: -` when empty, rather than
      disappearing.
- [ ] (motion) Tapped lands **turn one after another**, roughly a tenth of a
      second apart, not all at once.
- [ ] (motion) A **coloured dot flies from each land to your mana readout**,
      one per land.
- [ ] Each dot is the colour of the mana that land makes - white from a Plains,
      green from a Forest.
- [ ] A land tapped for something that is *not* mana throws no dot.
- [ ] Nothing is left stuck: a second or so later the lands are simply tapped,
      with no residue.

## 5. Particle effects (new)

Each is a separate emitter and can fail on its own. All of them are decoration
over something already legible - if one is missing, the game still reads
correctly, which is exactly why they need looking at deliberately.

- [ ] (motion) **Mana arriving in the pool** - a spray of coloured motes at
      your mana readout as each dot lands. The largest of the five.
- [ ] It is the **right colour**: white for a Plains, green for a Forest, and
      so on for blue, black and red if those decks come up.
- [ ] (motion) **Mana leaving a land** - a much smaller puff at the land
      itself, same colour. Should be quieter than the arrival, not equal to it.
- [ ] (motion) **Damage on a creature** - orange sparks off the card, falling.
- [ ] A **bigger hit throws more sparks**. Compare 1 damage against 4.
- [ ] (motion) **A permanent dying** - slow grey ash at the graveyard pile as
      the card lands there.
- [ ] The ash is **dull, not glowing**. If a creature dying looks like a
      firework, that is wrong and I want to know.
- [ ] (motion) **A spell leaving the stack** - blue motes where the card was
      sitting. Fires whether it resolved or was countered.
- [ ] Particles are never drawn **on top of a dialog** asking you something.
- [ ] Particles never **swallow a click** - clicking through a burst works.
- [ ] **Effects on / off** in the top bar turns all of it off; turning it back
      on fires one green burst as confirmation.
- [ ] The setting survives a page reload.
- [ ] If your system is set to reduce motion, the button reads
      "Effects off (system)" and is disabled.
- [ ] Nothing stutters. If a big combat drops frames, say so - the cap is 420
      specks and I can lower it.

## 6. Combat

- [ ] At declare attackers, clicking your creatures selects them; clicking
      again deselects.
- [ ] A creature that **cannot** attack (summoning sick, tapped, Defender) is
      refused **with a reason**, not silently ignored.
- [ ] **Confirm attackers** declares them and moves the game on.
- [ ] At declare blockers, click your blocker, then the attacker it blocks.
- [ ] Clicking a blocker that is already blocking **takes the block back**.
- [ ] Several creatures can gang up on one attacker.
- [ ] Pointing a ground creature at a flier is refused with a reason.
- [ ] **Menace** creatures require two blockers.
- [ ] After blocks are declared you still hold priority - the window for a
      combat trick. The game must **not** skip past it.
- [ ] First strike damage happens in its own step before regular damage.
- [ ] Trample, deathtouch, lifelink all behave.
- [ ] Commander damage is tracked per commander and shown in the rail; 21
      total loses the game.
- [ ] (motion) An attacking creature **leans toward the centre line**.
- [ ] (motion) A blocking creature leans a smaller amount.
- [ ] A creature shows a badge saying **what it is paired with**
      ("Blocks Craw Wurm", "Blocked by 2").
- [ ] (motion) A creature dealt damage **flinches**.
- [ ] (motion) The **damage number floats off** the card.
- [ ] A damaged creature stays visibly marked until damage clears.

## 7. Where the game stops (auto-pass)

- [ ] Out of the box the game only stops when you could actually do something.
- [ ] **Stops** in the top bar opens the panel.
- [ ] Eleven rows, one per step where priority happens, with the two main
      phases listed separately.
- [ ] Each has three settings: **Auto**, **Always**, **Never**. All default to
      Auto.
- [ ] Setting one to **Always** holds the game there every turn.
- [ ] Setting one to **Never** skips it.
- [ ] **Declare attackers and declare blockers carry a note** saying the game
      will still stop you there. Set one to Never and confirm it *still* stops
      you - a preference must never be able to skip your own blocks.
- [ ] **Full control** stops at every step and shows a gold badge in the top
      bar while it is on.
- [ ] The badge is clickable to turn it off.
- [ ] **Reset** returns everything to Auto.
- [ ] Settings survive a page reload.
- [ ] The game does not fast-forward underneath the panel while it is open.

## 8. The board

- [ ] Two halves facing each other; the opponent's is upside-down relative to
      yours.
- [ ] Your seat is always at the bottom and **never swaps** mid-game.
- [ ] Lands and other permanents sit **beside** the hand, smaller.
- [ ] Creatures get the wide row.
- [ ] A full seven-card hand fits with **no card clipped** at either edge.
- [ ] Cards overlap into a fan rather than scrolling.
- [ ] Library shows a card back and a **count of cards left**.
- [ ] Graveyard is a pile you can hover through.
- [ ] Exile only appears once something is exiled.
- [ ] Life total, mana, commander damage, and "Priority"/"Their turn" all
      appear in the rail.
- [ ] (motion) The life total **flashes green up / red down** when it changes.
- [ ] (motion) A **floating number** shows how much it moved.
- [ ] (motion) A **turn banner** announces each new turn.
- [ ] (motion) A banner announces **Combat** starting.
- [ ] Neither banner sticks around or replays mid-turn.

## 9. The right-hand column

- [ ] Three boxes: hovered card on top, last played in the middle, log at the
      bottom.
- [ ] The three boundaries **never move**, whether the boxes are empty or full.
- [ ] The middle box holds the **last card played** until a new one replaces
      it - it does not blank out, and it does not fade away.
- [ ] While something is genuinely on the stack, that box shows the stack, with
      a count when more than one is waiting.
- [ ] Multiple spells on the stack overlap into a pile.
- [ ] The log covers roughly the last three turns.
- [ ] The log now records **land drops** ("Deadly Donny plays Plains") - this
      was missing entirely until today.

## 10. Buttons and prompts

- [ ] Pass priority, Concede, Confirm attackers and Confirm blocks all live in
      **your rail**, under your life total.
- [ ] Confirm attackers / Confirm blocks only appear when relevant.
- [ ] Pass priority says whose priority it is.
- [ ] Concede ends the game and says who lost and why.
- [ ] Prompts and refusals appear **floating over the middle of the table**.
- [ ] A refusal outranks a prompt when both apply.
- [ ] Clicking a refusal dismisses it.

## 11. Cards moving between zones

- [ ] (motion) Playing a land: hand to the lands row.
- [ ] (motion) Casting a creature: hand to stack, then stack to battlefield.
- [ ] (motion) Drawing: out of the library pile.
- [ ] (motion) Dying: battlefield to graveyard.
- [ ] (motion) Casting your commander: command zone to stack to battlefield.
- [ ] (motion) A spell resolving off the stack **glows blue** on the way out.
- [ ] (motion) A card heading to the graveyard **dims and desaturates**.
- [ ] (motion) A card being exiled goes **pale and purple**.
- [ ] No card ever appears in **two places at once**.
- [ ] No card ever **vanishes and fails to come back**. A timer restores every
      card whether or not the animation ran, so this should be impossible - but
      it is the failure that would matter most.
- [ ] (motion) A **line is drawn** from a spell to wherever you are pointing
      while choosing a target.
- [ ] (motion) The same line appears from a blocker while choosing what it
      blocks.

## 12. Sound

Each cue is a separate sound with its own trigger. Turn sound on and listen for
each one individually.

- [ ] **Sound on / off** in the top bar; clicking it on plays a click.
- [ ] **Card** - a soft click when a spell resolves.
- [ ] **Land** - a low thud when a land is played. *New today: this sound has
      existed since sound was added and had never once been played, because the
      engine wrote no log line for a land drop.*
- [ ] **Attack** - two rising notes when attackers are declared.
- [ ] **Damage** - a falling scrape when damage is dealt.
- [ ] **Death** - a lower, longer version when a creature dies.
- [ ] **Draw** - a short high tick when a card is drawn.
- [ ] **Error** - a low buzz when the game refuses something. *Also new today
      and previously unreachable for the same reason.*
- [ ] A fast bot turn does not play a **chord** of everything at once.
- [ ] The mute setting survives a reload.

## 13. Against the bot

- [ ] The bot plays lands, casts creatures and spells, attacks and blocks.
- [ ] It answers its own mulligan and its own tutors without asking you.
- [ ] It never acts during your priority window.
- [ ] It does not stall - if the game stops advancing with nothing asked of
      you, that is a bug worth reporting immediately.

## 14. Hotseat

- [ ] Both seats are driven from one screen.
- [ ] The board does not flip between turns.
- [ ] Each player gets their own mulligan, prompts, and target choices.
- [ ] Concede concedes for whoever currently holds priority.

## 15. Deck builder

- [ ] Search the card pool; filter it.
- [ ] Build, name, tag, save and delete decks.
- [ ] Add and remove cards; the stats update.
- [ ] Import and export a deck as text.
- [ ] Cards the engine **implements** are distinguished from real cards it does
      not.
- [ ] Illegal decks are refused with the reason.
- [ ] Choose the art (printing) per deck.
- [ ] A saved deck can be played: `?mydeck=<id>&vsdeck=<id>`.

---

## Known rough edges

Not bugs to report - I already know:

- Clicking an opponent's creature outside combat can surface an internal-sounding
  message, along the lines of `Tifa Lockhart has no activated ability at index 0`.
- Hand cards fan by overlapping, not by rotating into an arc. Rotating widens
  each card's bounding box, which the card-movement system measures, so it is a
  real piece of work rather than one CSS line.
- Easing curves are chosen, not tuned. If something moves in a way that feels
  cheap rather than wrong, that is this.
- Particles are simple round specks. No trails, no sprites, no lighting.
