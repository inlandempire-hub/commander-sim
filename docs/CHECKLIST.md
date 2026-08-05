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

- [x ] Seven cards appear in an overlay before the game starts.
- [x ] **Keep** takes that hand. **Mulligan** draws a fresh seven.
- [x ] After a mulligan you are asked to put cards on the bottom - one per
      mulligan taken (London mulligan). The count is right.
- [x ] You cannot mulligan forever; the button stops offering it.
- [ ] Hotseat: both players get their own mulligan, one after the other.
- [x ] Bot: only your hand is offered - the bot answers its own.

**Changed 2026-08-04, so these need re-checking:**

- [x ] (motion) **Nothing moves while you are deciding.** The deal used to play
      out underneath the mulligan overlay - the one flight worth watching,
      hidden behind the dialog covering it, and replayed for every mulligan.
- [x ] (motion) The cards **deal out one after another from the library once the
      last player has kept**, onto an empty table.
- [ ] In hotseat, that happens after **both** players have kept, and deals both
      hands - not one hand and then the other.
- [x ] Mulliganing to nothing goes **straight into the game**. No "choose 7 cards
      to put on the bottom" step, because there is no choice in it.
- [x ] At the bottom of the ladder the button reads **"No mulligans left"**, not
      "Mulligan to -1", and the prompt says you are starting with an empty hand
      rather than promising a bottoming step that no longer happens.
- [x ] Cards during the mulligan are **big enough to read without hovering**.
      (Bigger on a 1920-wide screen and up; on a 1280-wide window seven across
      is the binding constraint and they are the size they always were.)

## 2. Reading a card

- [x ] Hovering any card fills the **top right box** with that card, large.
- [ x] That box contains the card image and nothing else - no repeated rules
      text underneath it.
- [ ] A card with no image falls back to a readable text box: name, type line,
      rules text, power/toughness. *Every card in both decks currently has art,
      so the only way to see this is to disconnect from the internet - and not
      noticing it is the correct outcome. Leave it unticked.*
- [x ] With nothing hovered, the panel shows whatever is on the stack.
- [x ] **Right-click any card** to open it full-screen. Works in hand, on the
      battlefield, in a graveyard, on the stack, in the command zone.
- [x ] Right-click works on a card you **cannot** play - being told no is a
      reason to want to read it.
- [x ] Right-click during the **mulligan** opens the card *above* the overlay,
      not behind it. (This was broken and is fixed; worth confirming.)
- [x ] **Escape** closes it. So does clicking anywhere.
- [x ] Escape while inspecting during a mulligan closes only the inspect, and
      leaves the mulligan up.
- [x ] The browser's own right-click menu never appears over the table.

*Right-click inspect stays, but it is now the third way to read a card rather
than the second: hovering covers the board, and mulligan cards are large enough
to read on sight. What it still uniquely covers is reading a card while a dialog
is open - a tutor showing you your library, mainly - because the hover panel is
behind those. Say the word and it comes out.*

## 3. Playing cards

- [x ] Clicking a land in hand plays it.
- [x ] Only **one land per turn**; a second is refused with a message.
- [x ] Clicking a creature or spell casts it.
- [x ] Cards you can actually play right now are **highlighted** in hand.
- [x ] The highlight only appears while you hold priority, not during the
      opponent's window.
- [x ] Your commander sits in the **command zone** on the right of your rail and
      can be cast from there.
- [x ] Casting your commander a second time costs {2} more, a third time {4}
      more (commander tax).
- [ ] A **modal** card ("choose one") asks which mode before anything else.
- [x ] A **targeted** spell asks for a target, and only legal targets respond.
- [x ] A **tutor** stops mid-resolution and shows you your library to pick from,
      with a search box.
- [x ] Cancel is available on every "choose a target" prompt.

## 4. Mana

- [x ] Hovering a castable card **outlines in gold the exact lands** it will tap.
- [x ] One land lights up for a one-mana spell, two for a two-mana one.
- [x ] Nothing lights up for a card you cannot afford, or one in a graveyard.
- [x ] The lands that light up are the lands that actually turn when you click.
- [ x] Your mana readout in the rail says `Mana: -` when empty, rather than
      disappearing.
- [x ] (motion) Tapped lands **turn one after another**, roughly a tenth of a
      second apart, not all at once.
- [x ] (motion) A **coloured dot flies from each land to your mana readout**,
      one per land.
- [x ] Each dot is the colour of the mana that land makes - white from a Plains,
      green from a Forest.
- [ ] A land tapped for something that is *not* mana throws no dot.
- [x ] Nothing is left stuck: a second or so later the lands are simply tapped,
      with no residue.

## 5. Particle effects (new)

Each is a separate emitter and can fail on its own. All of them are decoration
over something already legible - if one is missing, the game still reads
correctly, which is exactly why they need looking at deliberately.

- [x ] (motion) **Mana arriving in the pool** - a spray of coloured motes at
      your mana readout as each dot lands. The largest of the five.
- [x ] It is the **right colour**: white for a Plains, green for a Forest, and
      so on for blue, black and red if those decks come up.
- [x ] (motion) **Mana leaving a land** - a much smaller puff at the land
      itself, same colour. Should be quieter than the arrival, not equal to it.
- [x ] (motion) **Damage on a creature** - orange sparks off the card, falling.
- [x ] A **bigger hit throws more sparks**. Compare 1 damage against 4.
- [x ] (motion) **A permanent dying** - slow grey ash at the graveyard pile as
      the card lands there.
- [x ] The ash is **dull, not glowing**. If a creature dying looks like a
      firework, that is wrong and I want to know.
- [x ] (motion) **A spell leaving the stack** - blue motes where the card was
      sitting. Fires whether it resolved or was countered.
- [x ] Particles are never drawn **on top of a dialog** asking you something.
- [x ] Particles never **swallow a click** - clicking through a burst works.
- [x ] **Effects on / off** in the top bar turns all of it off; turning it back
      on fires one green burst as confirmation.
- [x ] The setting survives a page reload.
- [x ] If your system is set to reduce motion, the button reads
      "Effects off (system)" and is disabled.
- [x ] Nothing stutters. If a big combat drops frames, say so - the cap is 420
      specks and I can lower it.

## 6. Combat

- [x ] At declare attackers, clicking your creatures selects them; clicking
      again deselects.
- [x ] A creature that **cannot** attack (summoning sick, tapped, Defender) is
      refused **with a reason**, not silently ignored.
- [x ] **Confirm attackers** declares them and moves the game on.
- [x ] At declare blockers, click your blocker, then the attacker it blocks.
- [x ] Clicking a blocker that is already blocking **takes the block back**.
- [ ] Several creatures can gang up on one attacker.
- [x ] Pointing a ground creature at a flier is refused with a reason.
- [ ] **Menace** creatures require two blockers.
- [x ] After blocks are declared you still hold priority - the window for a
      combat trick. The game must **not** skip past it.
- [ ] First strike damage happens in its own step before regular damage.
- [x ] Trample, deathtouch, lifelink all behave.
- [x ] Commander damage is tracked per commander and shown in the rail; 21
      total loses the game.
- [x ] (motion) An attacking creature **leans toward the centre line**.
- [x ] (motion) A blocking creature leans a smaller amount.
- [x ] A creature shows a badge saying **what it is paired with**
      ("Blocks Craw Wurm", "Blocked by 2").
- [ ] (motion) A creature dealt damage **flinches**.
- [x ] (motion) The **damage number floats off** the card.
- [x ] A damaged creature stays visibly marked until damage clears.

## 7. Where the game stops (auto-pass)

- [x ] Out of the box the game only stops when you could actually do something.
- [x ] **Stops** in the top bar opens the panel.
- [x ] Eleven rows, one per step where priority happens, with the two main
      phases listed separately.
- [x ] Each has three settings: **Auto**, **Always**, **Never**. All default to
      Auto.
- [x ] Setting one to **Always** holds the game there every turn.
- [x ] Setting one to **Never** skips it.
- [x ] **Declare attackers and declare blockers carry a note** saying the game
      will still stop you there. Set one to Never and confirm it *still* stops
      you - a preference must never be able to skip your own blocks.
- [x ] **Full control** stops at every step and shows a gold badge in the top
      bar while it is on.
- [x ] The badge is clickable to turn it off.
- [x ] **Reset** returns everything to Auto.
- [x ] Settings survive a page reload.
- [x ] The game does not fast-forward underneath the panel while it is open.

## 8. The board

- [x ] Two halves facing each other; the opponent's is upside-down relative to
      yours.
- [x ] Your seat is always at the bottom and **never swaps** mid-game.
- [x ] Lands and other permanents sit **beside** the hand, smaller.
- [x ] Creatures get the wide row.
- [x ] A full seven-card hand fits with **no card clipped** at either edge.
- [x ] Cards overlap into a fan rather than scrolling.
- [x ] Library shows a card back and a **count of cards left**.
- [x ] Graveyard is a pile you can hover through.
- [ ] Exile only appears once something is exiled.
- [x ] Life total, mana, commander damage, and "Priority"/"Their turn" all
      appear in the rail.
- [x ] (motion) The life total **flashes green up / red down** when it changes.
- [x ] (motion) A **floating number** shows how much it moved.
- [x ] (motion) A **turn banner** announces each new turn.
- [x ] (motion) A banner announces **Combat** starting.
- [x ] Neither banner sticks around or replays mid-turn.

## 9. The right-hand column

- [x ] Three boxes: hovered card on top, last played in the middle, log at the
      bottom.
- [x ] The three boundaries **never move**, whether the boxes are empty or full.
- [x ] The middle box holds the **last card played** until a new one replaces
      it - it does not blank out, and it does not fade away.
- [x ] While something is genuinely on the stack, that box shows the stack, with
      a count when more than one is waiting.
- [x ] Multiple spells on the stack overlap into a pile.
- [x ] The log covers roughly the last three turns.
- [x ] The log now records **land drops** ("Deadly Donny plays Plains") - this
      was missing entirely until today.

## 10. Buttons and prompts

- [x ] Pass priority, Concede, Confirm attackers and Confirm blocks all live in
      **your rail**, under your life total.
- [x ] Confirm attackers / Confirm blocks only appear when relevant.
- [x ] Pass priority says whose priority it is.
- [x ] Concede ends the game and says who lost and why.
- [x ] Prompts and refusals appear **floating over the middle of the table**.
- [x ] A refusal outranks a prompt when both apply.
- [x ] Clicking a refusal dismisses it.

## 11. Cards moving between zones

- [x ] (motion) Playing a land: hand to the lands row.
- [x ] (motion) Casting a creature: hand to stack, then stack to battlefield.
- [x ] (motion) Drawing: out of the library pile.
- [x ] (motion) Dying: battlefield to graveyard.
- [x ] (motion) Casting your commander: command zone to stack to battlefield.
- [x ] (motion) A spell resolving off the stack **glows blue** on the way out.
- [x ] (motion) A card heading to the graveyard **dims and desaturates**.
- [ ] (motion) A card being exiled goes **pale and purple**.
- [x ] No card ever appears in **two places at once**.
- [x ] No card ever **vanishes and fails to come back**. A timer restores every
      card whether or not the animation ran, so this should be impossible - but
      it is the failure that would matter most.
- [x ] (motion) A **line is drawn** from a spell to wherever you are pointing
      while choosing a target.
- [x ] (motion) The same line appears from a blocker while choosing what it
      blocks.

## 12. Sound

Each cue is a separate sound with its own trigger. Turn sound on and listen for
each one individually.

- [x ] **Sound on / off** in the top bar; clicking it on plays a click.
- [x ] **Card** - a soft click when a spell resolves.
- [x ] **Land** - a low thud when a land is played. *New today: this sound has
      existed since sound was added and had never once been played, because the
      engine wrote no log line for a land drop.*
- [x ] **Attack** - two rising notes when attackers are declared.
- [x ] **Damage** - a falling scrape when damage is dealt.
- [x ] **Death** - a lower, longer version when a creature dies.
- [ ] **Draw** - a short high tick when a card is drawn.
- [x ] **Error** - a low buzz when the game refuses something. *Also new today
      and previously unreachable for the same reason.*
- [x ] A fast bot turn does not play a **chord** of everything at once.
- [ ] The mute setting survives a reload.

## 13. Against the bot

- [x ] The bot plays lands, casts creatures and spells, attacks and blocks.
- [x ] It answers its own mulligan and its own tutors without asking you.
- [x ] It never acts during your priority window.
- [x ] It does not stall - if the game stops advancing with nothing asked of
      you, that is a bug worth reporting immediately.

## 14. Hotseat

- [ ] Both seats are driven from one screen.
- [ ] The board does not flip between turns.
- [ ] Each player gets their own mulligan, prompts, and target choices.
- [ ] Concede concedes for whoever currently holds priority.

## 15. Deck builder

- [x ] Search the card pool; filter it.
- [x ] Build, name, tag, save and delete decks.
- [x ] Add and remove cards; the stats update.
- [ ] Import and export a deck as text.
- [x ] Cards the engine **implements** are distinguished from real cards it does
      not.
- [ ] Illegal decks are refused with the reason.
- [x ] Choose the art (printing) per deck.
- [ ] A saved deck can be played: `?mydeck=<id>&vsdeck=<id>`.

---

## 16. Added 2026-08-05

New since you last went through this list, so nothing here has been ticked yet.
Everything below I have driven in the browser myself except where it says
otherwise; the notes say what I actually saw, so you know what you are
re-checking rather than checking from scratch.

### The Pass button and the command zone

- [ ] The **command zone is the same height as the creature row**, not the whole
      board, on both seats. *(Measured: both line up on the edge nearest the
      centre line.)*
- [ ] The **Pass button sits in the gap under the command zone**, level with
      your hand, on the right.
- [ ] It reads **"Pass"** for the whole turn.
- [ ] It reads **"End Turn"**, in a warmer colour, at your end step - and its
      tooltip says "Pass here and your turn is over". *(Seen; note the game
      normally auto-passes through the end step, so you may only meet this with
      a stop set or Full control on.)*
- [ ] If an opponent responds at your end step it goes back to "Pass", because
      that click now resolves their spell instead.
- [ ] Nothing else moved: Confirm attackers / Confirm blocks still appear above
      it, and "Waiting for ..." still replaces it when it is not your priority.

### Concede

- [ ] **Concede is directly above the library and graveyard**, in the left rail.
- [ ] It is **filled red with white text**.
- [ ] It **does not move for the whole game** - in particular it stays put when
      Confirm attackers/blocks appear, and when commander-damage lines appear in
      the rail above it. *(That was the actual bug: it used to sit at the end of
      the button strip and shift under your cursor.)*
- [ ] It still asks before conceding.

### The stack

- [ ] Each thing on the stack is a **row with its art, name, mana cost, type
      line and rules text** - readable, rather than a cropped illustration.
- [ ] Topmost (resolving first) is at the top.
- [ ] Several spells deep, the list scrolls rather than shrinking them.
- [ ] A **triggered or activated ability** on the stack says what it does, not
      `Ability (gainLife)`. *(Not seen live - the pool's triggers resolve too
      fast to catch without a stop. Worth a look if you set one.)*
- [ ] The "Last played" card underneath is unchanged - still the full printed
      face, still dimmed.
- [ ] While a counterspell is choosing, stack rows highlight and are clickable.
      *(Not seen live - needs a counterspell in hand.)*

### Combat

- [ ] At declare attackers, **every creature that could legally attack is
      outlined blue**.
- [ ] A creature that **cannot** attack - summoning sick, tapped, Defender - is
      **not** outlined. *(Seen: a creature cast that turn correctly stayed
      plain.)*
- [ ] Clicking one turns it **orange**; the others stay blue.
- [ ] (motion) When combat damage is dealt, **every attacker and blocker drives
      forward and recoils** - both boards towards the middle. *(Class verified
      on all nine creatures in a fight; the movement itself I cannot watch.)*
- [ ] The clash and the damage flinch happen together on a creature that is hit,
      rather than one cancelling the other.

### Blocks that stay visible

- [ ] Declaring a block draws a **line from blocker to attacker**.
- [ ] That line **stays there after you confirm blocks** - through the whole
      instant window, and through combat damage.
- [ ] It is **solid and quieter** than the dashed line that follows your cursor
      while you are choosing.
- [ ] The badges stay too: "Blocks X" on the blocker, "Blocked by 1" on the
      attacker.
- [ ] All of it **clears at end of combat**, not before.
- [ ] Several blockers on one attacker draw several lines.

### Damage to a player

- [ ] (motion) A **burst of particles off the life total** when a player's life
      goes *down*. *(Verified by measuring the canvas: 245 lit pixels at the
      life total on a 2-point drop.)*
- [ ] Gaining life does **not** spark - it already has the green flash and the
      floating number.
- [ ] The size of the burst scales with the size of the hit.

### The bot

- [ ] The bot **casts spells straight away** instead of tapping its lands one at
      a time first. *(Seen: two spells cast back to back in one turn with no
      tapping steps between them. It was one visible pause per mana before.)*
- [ ] It still cannot cast what it cannot pay for.
- [ ] Its lands still visibly tap when it pays.

### Sound

- [ ] There is a **sound on every draw**, including the one at the start of each
      turn. *(This was the reported bug: the draw step wrote no log line at all,
      and the client's sound is driven off the log, so the most common draw in
      the game was silent.)*
- [ ] The log now has a "draws 1 card" line each turn to match.
- [ ] Turn 1 does **not** draw - the player going first skips their draw step -
      so no sound then either.
- [ ] The opening hand and a mulligan redraw are **silent**, and do not write
      "draws 7 cards" into the log.

### Cards

- [ ] **Tanglespan Lookout** ("whenever an Aura you control enters, draw a
      card") no longer draws a card when it enters. It is a plain 2/3 until
      Auras exist in the pool. *(Found by the trigger audit; it was the only
      card in 817 with a trigger of the wrong shape.)*
- [ ] Nothing else changed about any card. The eight lifegain creatures fixed
      yesterday still behave the same.

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
