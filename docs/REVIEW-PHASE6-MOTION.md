# Review checklist: the motion pass (2026-08-02)

Everything shipped in commits `0067305`, `3b9e6df` and `1e32058` - the push from
roughly 4 to 6 on the polish scale.

**Why this document exists.** The browser preview I develop against does not
composite frames, which means it cannot run a single animation. I verified every
*destination* - that a card flight is planned with the right start and end
points, that poses compute to the exact degrees and pixels intended, that
elements mount and unmount when they should. **The movement between those points
is the part I have never seen.** That is what most of this list is for.

Play a bot game and a hotseat game. Both are on the launcher menu.

---

## 1. Card movement (the headline change)

Cards used to teleport between zones. They should now travel.

- [ ] **Play a land.** It should fly from your hand to the lands row.
- [ ] **Cast a creature.** Two journeys: hand to the stack, then the stack to
      the battlefield when it resolves.
- [ ] **Draw a card.** It should fly out of the library pile in your rail.
- [ ] **Opening hand.** Seven cards should deal out of the library one after
      another, not all at once and not instantly.
- [ ] **Let a creature die.** It should fly to the graveyard pile.
- [ ] **Cast your commander.** Command zone to stack to battlefield.
- [ ] Watch for a card that **appears in two places at once** - the travelling
      copy and the real one. The real card is meant to stay hidden until the
      copy lands. If you see doubling, the hide/restore timing is off.
- [ ] Watch for a card that **vanishes and never comes back**. There is a timer
      that restores every card whether or not the animation finished, so this
      should be impossible, but it is the failure mode that would matter most.

**Journeys should not all look the same:**

- [ ] A spell **resolving off the stack** glows blue on the way out.
- [ ] A card heading to the **graveyard** dims and desaturates.
- [ ] A card being **exiled** goes pale and purple.

## 2. Cards being tapped, attacking, hovered

The tap rotation has been in the stylesheet since day one and has *never once
worked* - a Framer Motion prop was silently overriding it. This is the first
build where it can.

- [ ] **Tap a land for mana.** It should turn about nine degrees and dim.
- [ ] **Attack.** Attackers should lean towards the centre line *and* be tapped
      and rotated at the same time. Both at once is the thing to check - that
      combination was impossible before.
- [ ] **Block.** Blockers should take a smaller step towards the middle. The
      opponent's side leans the opposite way (down instead of up).
- [ ] **Hover any card.** It should lift and grow about 9%.
- [ ] Hover a card at the **edge of a row**. Nothing should be cut off at the
      top or bottom - that clipping was fixed and then the fix was replaced, so
      it is worth a look.
- [ ] **Press and hold** a card. It should dip slightly - between the hover pose
      and no pose.

## 3. Damage and life

- [ ] **A creature survives combat damage.** It should flinch, flash red, and
      float the amount (`-2`) off itself.
- [ ] It should keep a **red-tinted border** afterwards while damage is marked.
- [ ] **Take damage to the face.** The life total flashes red and floats the
      amount.
- [ ] **Gain life** (lifelink). Green flash, `+N` floats up.

## 4. The two-click decisions (new)

Choosing a target and assigning a blocker both used to be silent after the
first click.

- [ ] **Cast a targeted spell.** A **gold** dashed arrow should run from the
      spell to your cursor and follow it.
- [ ] **Assign a blocker:** click your creature, then the attacker. A **blue**
      arrow should appear on the first click and disappear on the second.
- [ ] The arrow should start **at the card**, not somewhere near it, and stay
      anchored if the board shifts underneath.
- [ ] Cancelling a target should remove the arrow.

**Known concern I could not judge:** the arrow always bows *upward*. When you
are pointing downwards - your own creature targeting something below it - that
may look wrong. Tell me if it does; it is a one-line change to bow away from
the line instead.

## 5. Rows closing up instead of scrolling

Rows no longer scroll at all. When they run out of room the cards slide over
each other.

- [ ] **Get a big hand** (eight or more cards), or just **make the window
      narrower**. The cards should overlap smoothly rather than a scrollbar
      appearing.
- [ ] The **last card should not be cut off** at the right edge.
- [ ] Hovering an overlapped card should **raise it clear** of its neighbours so
      you can read it.
- [ ] Cards should stay the **same size** whether the row is crowded or empty.

**Known limit:** with no scrollbar anywhere, a row with roughly forty-plus cards
in it would run past the edge with no way to reach them. Extremely unlikely in a
real game, but it is a real cliff rather than a graceful one.

## 6. Presentation

- [ ] **The table surface.** Both halves should read as a lit felt surface with
      the light falling off at the edges, and cards should sit on it with a
      shadow. Tell me if it reads as muddy or noisy instead - the weave texture
      is very faint on purpose and easy to get wrong.
- [ ] **Library pile** in each rail, showing a card back and the count.
- [ ] **The stack overlaps into a pile.** Cast two things in response to each
      other and check it reads as a stack rather than a row. The overlap is a
      fixed 38px and may be too much or too little.
- [ ] **Turn banner** at the start of each turn, and a **"Combat"** banner when
      combat starts. Each should appear **once** - I fixed two bugs here (the
      Combat banner never clearing, and the turn banner replaying after every
      combat), so this is worth watching over three or four turns.
- [ ] Is the banner **too big or too intrusive**? It is 40px and covers the
      middle of the board for about a second.
- [ ] **Sound.** Toggle in the header. Cards, lands, attacks, damage, deaths and
      draws each have a cue.

## 7. Regressions to rule out

- [ ] **Both modes.** Everything above should behave identically in bot mode and
      hotseat.
- [ ] **The page never scrolls** and the table stays exactly one screen tall.
- [ ] **Deck builder** still works - the art strips, the art picker, saving.
- [ ] **Graveyard and exile overlays** still open and are still clickable when a
      recursion spell needs a target.
- [ ] **The card picker** (tutors) and **mode picker** ("Choose one") still work.
- [ ] Nothing in the **browser console** (F12) while playing a few turns.

---

## What I would want to know before moving on

1. Does the movement actually look right, or is anything too fast, too slow, or
   arriving in the wrong place?
2. Does the arrow bow the wrong way when pointing downwards?
3. Is the banner welcome or annoying?
4. Where does this land for you on the 0-10 scale? I have called it 6.

## Still on the list for 7-8

- Cards in hand fanning in an arc. Not done deliberately: rotating them widens
  every card's bounding box, and the flight animation measures those boxes to
  work out where a card is travelling from - so the arc would quietly degrade
  card movement to buy a static flourish. Needs a transform-independent way to
  measure a card first.
- Spells resolving with a real flourish rather than a glow on the way out.
- A WebGL layer alongside React for card tilt, foil and particles. This is the
  8 mark and it is additive - not a rewrite, and still not a game engine.
- A real damage-prevention shield, so Healing Salve's second mode stops being an
  approximation.
