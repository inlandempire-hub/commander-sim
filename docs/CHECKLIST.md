# Still to check

**Everything you have already ticked has been deleted.** This list is now only
what has *not* been confirmed working - so a short list is good news, and
anything still here is either new since your last pass or something we agreed
to leave.

One line per thing you can look at and judge on its own. Tick what is right;
tell me what is wrong and I will fix it rather than rebuild it.

## How this list works from now on

- **It only ever shrinks.** When you tick something it comes out permanently,
  and it does not come back unless the code underneath it changes.
- **New work is added at the bottom** in a dated section, so you always know
  which items are fresh.
- **Regression is no longer your job.** From 2026-08-06, every change ships
  with automated tests run against the whole suite before it is committed - so
  "did this break something else" is answered before you see it, and you are
  only ever being asked to judge the new thing. Anything that does slip through
  is a gap in the tests, and the fix is a test as well as a fix.

**Why each item is so specific.** Every animation, cue and highlight is listed
separately rather than grouped as "animations". A group can be ticked while one
of its five members has been broken for a fortnight - which has already
happened here twice: a card panel faded to invisible by a leftover keyframe,
and a sound cue that existed for weeks with nothing able to play it (sound is
gone now, but the lesson stands).

**What I cannot check myself.** The browser preview I develop against does not
composite frames. I can prove a thing exists, is the right size, in the right
place, the right colour, painted on top rather than behind, and that its start
and end points are correct. **I cannot watch anything move.** Items marked
(motion) are geometry I have verified and movement I have never seen.

## How to start

```bash
npm run dev -w @mtg-commander-sim/client
```

`http://localhost:5180/` plays the computer, which is now the default and the
only single-browser mode (`&seat=mike` takes the green deck, `&delay=350`
speeds the bot up, `&delay=1500` slows it down). `?mode=deck` opens the deck
builder. `?mode=network&seat=donny` joins a running server.

Hotseat is gone as of 2026-08-06, so items that said "in hotseat" have been
removed rather than reworded - there is nowhere to check them.

---

## 1. The opening hand

- [ ] You mulligan first, the bot decides for itself, and the game starts only
      once both have kept.

## 2. Reading a card

- [ ] A card with no image falls back to a readable text box: name, type line,
      rules text, power/toughness. *Every card in both decks currently has art,
      so the only way to see this is to disconnect from the internet - and not
      noticing it is the correct outcome. Leave it unticked.*

*Right-click inspect stays, but it is now the third way to read a card rather
than the second: hovering covers the board, and mulligan cards are large enough
to read on sight. What it still uniquely covers is reading a card while a dialog
is open - a tutor showing you your library, mainly - because the hover panel is
behind those. Say the word and it comes out.*

## 3. Playing cards

- [ ] A **modal** card ("choose one") asks which mode before anything else.

## 4. Mana

- [ ] A land tapped for something that is *not* mana throws no dot.

## 5. Combat

- [ ] Several creatures can gang up on one attacker.
- [ ] **Menace** creatures require two blockers.
- [ ] First strike damage happens in its own step before regular damage.
- [ ] (motion) A creature dealt damage **flinches**.

## 6. The board

- [ ] Exile only appears once something is exiled.

## 7. Cards moving between zones

- [ ] (motion) A card being exiled goes **pale and purple**.

## 8. Deck builder

- [ ] Import and export a deck as text.
- [ ] Illegal decks are refused with the reason.
- [ ] A saved deck can be played: `?mydeck=<id>&vsdeck=<id>`.

---

## 11. Added 2026-08-05

New since you last went through this list, so nothing here has been ticked yet.
Everything below I have driven in the browser myself except where it says
otherwise; the notes say what I actually saw, so you know what you are
re-checking rather than checking from scratch.

### The stack

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

### The log

- [ ] The log has a "draws 1 card" line each turn. *(The draw step used to write
      no line at all, which is how the missing draw sound went unnoticed.)*
- [ ] Turn 1 does **not** draw - the player going first skips their draw step.
- [ ] The opening hand and a mulligan redraw do not write "draws 7 cards".

### Cards

- [ ] **Tanglespan Lookout** ("whenever an Aura you control enters, draw a
      card") no longer draws a card when it enters. It is a plain 2/3 until
      Auras exist in the pool. *(Found by the trigger audit; it was the only
      card in 817 with a trigger of the wrong shape.)*
- [ ] Nothing else changed about any card. The eight lifegain creatures fixed
      yesterday still behave the same.

---

## 12. Added 2026-08-06 - the push to 8/10

The four things the roadmap listed as standing between 7 and 8.

### The hand fans in an arc

- [ ] Your hand leans. The middle card is upright, the outer ones tilt away
      from it, and the ones at the ends sit slightly lower than the middle.
- [ ] It looks like a hand somebody is holding rather than cards pushed
      together.
- [ ] The opponent's hand at the top of the screen curves the *other* way -
      away from the middle of the table, not towards it.
- [ ] The bend stays about the same overall whether you hold four cards or
      eleven. A big hand tightens its spacing instead of curving further.
- [ ] Hovering a card straightens it upright as it lifts. It does not grow
      while still leaning.
- [ ] Nothing on the battlefield leans. Lands and creatures lie flat.
- [ ] Playing a card re-fans the rest smoothly rather than snapping.

### Cards still fly to the right places

- [ ] A card leaving your hand flies from where it actually was, including
      when it was one of the leaning ones at the end of the row.
- [ ] It arrives centred on its new home, not a few pixels off.
- [ ] Drawing a card still flies it from the library pile into the hand.
- [ ] A tapped creature dying flies from where it is sitting, not from beside
      itself. *(This was wrong before today too - tapped cards rotate, and the
      old measurement had the same problem the fan would have had.)*

### Motion generally

- [ ] Everything that moves slows down as it arrives rather than gliding at a
      constant speed. Hardest to name, easiest to feel - if the table reads as
      calmer, that is this.
- [ ] Buttons still answer a click instantly.
- [ ] Nothing feels slower than it did. Durations barely moved; the curves did.
- [ ] The phase banner still holds long enough to read.

### Spells resolving

- [ ] A spell resolving throws out a ring from where it was sitting, not just
      a scatter of specks.
- [ ] The ring is the spell's own colour. A white spell flashes white, a green
      one green, a gold one gold.
- [ ] The card flares bright as it leaves the stack and cools on the way to
      wherever it is going.
- [ ] A counterspell resolving looks different from a creature spell resolving,
      because the two are different colours - they used to be identical.
- [ ] It is a flourish and not a firework. If it is distracting, say so.

### Healing Salve, and prevention

- [ ] Healing Salve's second mode now reads "Prevent the next 3 damage to any
      target this turn". It used to be "+0/+3 on a creature", which was a
      different card.
- [ ] Cast on yourself, the next 3 damage that would hit you does not.
- [ ] Cast on a creature, the next 3 damage marked on it does not get marked.
- [ ] A shield shows while it lasts: "shield 3" under a life total, or
      "(shield 2)" beside a creature's power and toughness.
- [ ] A shielded creature blocking a deathtouch attacker survives - prevented
      damage was never dealt, so deathtouch never touched it.
- [ ] An attacker with lifelink gains no life from damage that was prevented.
- [ ] A trampler blocked by a shielded creature does *not* get to send the
      prevented damage through to you.
- [ ] Any unused shield is gone by your next turn.
- [ ] The log says when damage was prevented and how much.

### Nothing else moved

- [ ] Combat, blocking, the stack, mana, the bot and the deck builder all
      behave exactly as they did yesterday.
- [ ] Lifelink still gains the right amount when nothing is preventing
      anything. *(Damage now goes through one shared path; this is the check
      that the rewrite did not change ordinary combat.)*
- [ ] Commander damage still accumulates correctly.

## 13. Added 2026-08-06 - the push to 9/10

The four things the 8/10 note listed. Everything here is new since the section
above, which is itself unticked - go through both in one sitting if you can.

### The hand parts around your cursor

- [ ] Hovering a card in a crowded hand pushes its neighbours aside, so the
      card you are looking at is no longer half-buried under the next one.
- [ ] The cards right beside it move most; the ones further along barely move.
- [ ] The cards at each end of the hand do not move at all. **Nothing is ever
      cut off at the left or right edge of the hand, at any point.**
- [ ] The hand closes back up when you move the cursor off it.
- [ ] Moving along the hand from card to card is smooth - it does not slam shut
      and reopen between cards.
- [ ] The end cards of the fan are not clipped even when nothing is hovered.
      *(They were, by 10px, in the build before this one.)*

### The stack

- [ ] With two or more things waiting, each one sits slightly further back than
      the one above: stepped in from the left, smaller, dimmer.
- [ ] The top one is lit blue and labelled "resolves next".
- [ ] You can tell which spell happens first without reading either of them.
- [ ] A deep stack (four or more) does not fade to nothing or indent off the
      edge of the panel.
- [ ] While choosing a target for a counterspell, hovering a buried spell brings
      it back to full size so you can read it.

### The turn changing hands

- [ ] The banner slides in **from the side of the table whose turn it now is** -
      up from the bottom for yours, down from the top for theirs.
- [ ] Against the bot it says "Your turn" on yours and "Salty Mike" on theirs.
- [ ] The turn number is underneath, smaller.
- [ ] The half of the table taking the turn lights up briefly as it does, then
      settles back to the steady blue edge.
- [ ] Turn 1 does **not** flash - the game opening is not a handover.
- [ ] The combat banner still says "Combat" with no turn number, and does not
      pick a side.

### Nothing else moved

- [ ] The arc, the flights, the resolution flourish and the shield display from
      the section above all still behave as they did.
- [ ] The board, combat, mana, the bot and the deck builder are unchanged.

## 14. Added 2026-08-06 - coloured felts

- [ ] The four zones are now beds of coloured cloth: **green** for lands,
      **Honolulu blue** for the hand, **burgundy** for creatures, **lemon** for
      the command zone.
- [ ] Each one stands off the table with a cushion under it and a shadow under
      that, the same build-up the Pass and Concede buttons have.
- [ ] They read as separate mats laid on the table rather than as tinted
      regions drawn on one surface.
- [ ] The weave still shows over each of them - they are cloth, not paint.
- [ ] The colours are darkened well below the named ones, because a large field
      at full saturation glares. **Say if any of them wants to be brighter or
      duller** - they are four variables at the top of the stylesheet and cost
      nothing to change.
- [ ] The lemon command zone in particular: it is the lightest and the one most
      likely to be wrong.
- [ ] Artifacts and enchantments got a fifth, deliberately quiet slate colour
      rather than a fifth loud one. Say if you would rather it had a real one.
- [ ] The "Command" label and the "In play" text on the lemon bed are dark
      rather than pale, and readable.

### Highlights still read on the new colours

This is where saturated cloth costs something - every highlight used to sit on
a near-black table.

- [ ] A **playable** card in hand (green glow) still stands out against the
      blue felt.
- [ ] A **castable commander** still stands out against the lemon felt. *(Every
      highlight measured between 1.0 and 1.9 to one on lemon before the ring
      was added - invisible.)*
- [ ] **Eligible** (blue) and **chosen** (orange) attackers both still read
      against burgundy.
- [ ] A **damaged** creature's red border still reads.
- [ ] A card being **targeted** (gold) still reads wherever it is.
- [ ] Each of those now has a thin dark-then-light ring around its colour. It
      should read as the edge of the highlight, not as a second highlight - say
      if it looks like a sticker.

## 15. Added 2026-08-06 - bare felt, and real card backs

### Where the weave is now

- [ ] The four coloured beds are plain cloth. No crosshatch on the green, the
      blue, the burgundy or the lemon.
- [ ] The grey table around and between them still has it.
- [ ] The beds still stand off the table - the raised edge and the cushion
      under each one are unchanged. Say if losing the texture flattened them.

### The card backs

- [ ] The library pile on **your** side of the table shows the light card back.
- [ ] The one on the **far** side shows the dark one.
- [ ] Neither is stretched or squashed.
- [ ] The number of cards left sits at the foot of the card on a black
      lozenge, and is readable on both backs at a glance.
- [ ] It counts down as cards are drawn - it should drop by one every draw
      step, both seats.
- [ ] Drawing still works: the card flies out of the pile rather than appearing
      in hand.

### Nothing else moved

- [ ] The felt colours, the highlights and the rings from section 14 are all as
      they were.
- [ ] The graveyard and exile piles beside the library are unchanged.

## 16. Added 2026-08-06 - symbols, backs, and one mode fewer

### Mana costs are printed symbols

- [ ] Cards in hand show real mana symbols instead of `{3}{B}{B}`.
- [ ] The generic number and the coloured pips are in the printed order -
      generic first, then white, blue, black, red, green.
- [ ] The command zone, the stack, the deck builder's card list and its pool
      all show them too.
- [ ] **No card name is cut short by its cost.** This was the reported bug; the
      cost now holds its width and the name gives way, with a two-line clamp
      and an ellipsis when it has to.
- [ ] A long name still reads - say if any card is now unidentifiable.
- [ ] Pips are big enough to tell apart at a glance, and not so big they
      dominate the card.

### The opponent is an opponent

- [ ] The far half of the table shows a **fan of dark card backs** where its
      hand used to be. You cannot see what the bot is holding.
- [ ] You can still tell how many cards it has by counting them.
- [ ] When the bot draws, the card **flies face-down** into its hand. *(It flew
      face-up before this build, which showed you its whole hand one card at a
      time.)*
- [ ] Your own hand is unchanged and still fans, lifts and parts.
- [ ] Hotseat is gone. `http://localhost:5180/` with no parameters now starts a
      game against the bot, and there is no "Play hotseat" button in the deck
      builder.

### Dealing

- [ ] After the mulligan, cards **deal one at a time, left to right**, rather
      than the hand appearing all at once.
- [ ] Both hands deal, yours face-up and theirs face-down.
- [ ] It takes about a second - long enough to read as dealing, short enough
      not to wait through. Say if it is too slow or too fast.

### Speed

- [ ] The bot takes noticeably longer between actions than it did, so you can
      follow what it is doing. *(800ms, up from 450. `?delay=1200` if you want
      it slower still, `?delay=400` for the old pace.)*
- [ ] Everything else moves slightly slower too - card flights, hover, the
      combat clash. It should read as more deliberate, not as sluggish.

### Sound is gone

- [ ] The game is silent and there is no sound button in the header.
- [ ] Nothing else broke with it: the turn banner still arrives, the log still
      records damage being prevented, and refusals still show in the middle of
      the table.

## 17. Added 2026-08-07 - real foley, a bigger deck, and the font lab

### Sound is recordings now

Turn it on with the header button. Everything here is a real recording rather
than a synthesiser - Kenney's Casino Audio, CC0.

- [ ] Playing a card is **a card going down on a table**. This is the whole
      point of the change and the first thing to judge.
- [ ] A land sounds heavier than a spell. *(Same recording, pitched down - say
      if that reads as a trick rather than as weight.)*
- [ ] Drawing is a card sliding off the top of the deck.
- [ ] Dealing the opening hand is seven of those in a row, and sounds like
      dealing rather than like a machine gun.
- [ ] A mulligan is a shuffle. *(It runs about three seconds, which is how long
      a shuffle takes - say if that is too long to sit through.)*
- [ ] Tapping lands for mana lays a chip down, once per payment rather than
      once per land.
- [ ] Gaining life is chips stacking up.
- [ ] Something dying, destroyed or exiled is a card being swept aside.
- [ ] The game refusing something is low and blunt, and clearly not one of the
      above.
- [ ] Nothing is harsh and nothing is loud. Say so if any cue makes you reach
      for the mute.
- [ ] Four creatures in combat at once does not turn to mush.
- [ ] **Damage is a poker chip clack, and it is the one honest compromise.**
      The pack is card and casino foley; there is nothing in it for a sword
      landing. Say whether it reads as an impact or as a stray chip - Kenney's
      RPG pack has real ones and is another 940KB.
- [ ] **Attacking has no sound at all**, for the same reason. Deliberate, not
      missing.

### Volume

- [ ] There is a slider beside the sound button, and it starts at full.
- [ ] Dragging it changes the level **as you drag**, not on release.
- [ ] Letting go plays a card, so you can hear what you have just set.
- [ ] Dragging it does not click or crackle.
- [ ] All the way down is silent.
- [ ] The level survives a reload.
- [ ] Muting with the button hides the slider; turning sound back on brings it
      back at the level you left it.

### The rail

- [ ] The library is roughly three times the size it was, and you can actually
      see the card back on it.
- [ ] The graveyard (and exile, when there is one) sit **above** it.
- [ ] The count on the deck is bigger to match.
- [ ] Nothing runs off the bottom of the screen, and the rail does not grow a
      scroll bar - including late in a game when commander damage rows appear.
- [ ] The concede button has not moved.

### The font lab

Open it at `?mode=fonts`.

- [ ] Ten families to cycle through, each shown set in itself.
- [ ] Picking one changes the previews immediately.
- [ ] The previews are the **real** buttons and the real banner, at their real
      sizes, on their real backgrounds - not mock-ups.
- [ ] The combat banner holds still instead of playing once and vanishing.
- [ ] The weight slider works, and "Snap to nearest" jumps to a weight the
      family actually has.
- [ ] Italic works, and the lab warns you when a family has no real italic and
      the browser is shearing one instead.
- [ ] It warns the same way for a weight the family does not have.
- [ ] "Use this" saves; the choice survives a reload and shows up on the table.
- [ ] The buttons and the banner are chosen **separately** - setting one does
      not change the other.
- [ ] "Reset to default" puts that one back to the system font.
- [ ] Judge the buttons at the size they are actually used: can you tell PASS
      from END TURN from CONFIRM ATTACKERS at a glance, without reading them?
- [ ] Does "Confirm attackers" still fit the column in the face you picked?

### Nothing else moved

- [ ] Mana symbols, the face-down opponent hand, the deal and the bot's speed
      are all as they were yesterday.

---

## Known rough edges

Not bugs to report - already known, and here so you do not spend a line on
them:

- Clicking an opponent's creature outside combat can surface an
  internal-sounding message, along the lines of `Tifa Lockhart has no activated
  ability at index 0`.
- Particles are simple round specks. No trails, no sprites, no lighting.
- The deck builder still looks like a form rather than part of the game - this
  is the largest item on the list for 10/10.
- Combat has no foley: damage borrows a chip clack and attacking is silent.
  Needs a second CC0 pack.
- The library is sized for a 1280x720 window and does not grow on a larger one,
  which is part of the "every window size" item rather than its own bug.
- Nothing on the table can be reached from the keyboard.
- Everything is tuned for roughly a 1280x720 window. Other sizes work but have
  not been gone through.
