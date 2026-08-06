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
and a sound cue that existed for weeks with nothing able to play it.

**What I cannot check myself.** The browser preview I develop against does not
composite frames. I can prove a thing exists, is the right size, in the right
place, the right colour, painted on top rather than behind, and that its start
and end points are correct. **I cannot watch anything move.** Items marked
(motion) are geometry I have verified and movement I have never seen.

## How to start

```bash
npm run dev -w @mtg-commander-sim/client
```

`http://localhost:5180/` is a hotseat game. `?mode=bot` plays the computer
(`&seat=mike` takes the green deck, `&delay=350` speeds it up). `?mode=deck`
opens the deck builder. `?mode=network&seat=donny` joins a running server.

Play one game against the bot and one hotseat game; some items only occur in
one or the other and are marked.

---

## 1. The opening hand

- [ ] Hotseat: both players get their own mulligan, one after the other.

**Changed 2026-08-04, so these need re-checking:**

- [ ] In hotseat, that happens after **both** players have kept, and deals both
      hands - not one hand and then the other.

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

## 8. Sound

Each cue is a separate sound with its own trigger. Turn sound on and listen for
each one individually.

- [ ] **Draw** - a short high tick when a card is drawn.
- [ ] The mute setting survives a reload.

## 9. Hotseat

- [ ] Both seats are driven from one screen.
- [ ] The board does not flip between turns.
- [ ] Each player gets their own mulligan, prompts, and target choices.
- [ ] Concede concedes for whoever currently holds priority.

## 10. Deck builder

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

### Sound

Turn sound on and listen to each separately. Everything here changed.

- [ ] Playing a card is **paper on cloth**, not a beep. This is the biggest
      single change and the one to judge first.
- [ ] A land is heavier than a spell and lands with a thump.
- [ ] Damage is an impact - a hit, with the pitch dropping.
- [ ] A creature dying is recognisably the same family of sound as damage, but
      slower and lower.
- [ ] Drawing a card is a short riffle, and quiet enough to hear fifty times.
- [ ] Attacking is a call rather than an impact.
- [ ] The turn changing hands makes a sound - a rising pair of notes, once a
      turn. **New.**
- [ ] Damage that gets **prevented** makes a ringing sound, not the impact one.
      **New**, and it used to play the hit, which said the opposite of what had
      happened.
- [ ] Nothing is harsh, and nothing is loud. Say so if any cue makes you reach
      for the mute.
- [ ] Several things happening at once (four creatures in combat) does not
      crackle or distort.
- [ ] Cues sound like they are in a room rather than in a void.

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
- [ ] In hotseat it names both players rather than saying "your turn" for both.
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

---

## Known rough edges

Not bugs to report - already known, and here so you do not spend a line on
them:

- Clicking an opponent's creature outside combat can surface an
  internal-sounding message, along the lines of `Tifa Lockhart has no activated
  ability at index 0`.
- Sound is synthesised rather than sampled. It has body now, but a real
  recording of a card hitting a table would still beat it.
- Particles are simple round specks. No trails, no sprites, no lighting.
- The deck builder still looks like a form rather than part of the game - this
  is the largest item on the list for 10/10.
- Nothing on the table can be reached from the keyboard.
- Everything is tuned for roughly a 1280x720 window. Other sizes work but have
  not been gone through.
