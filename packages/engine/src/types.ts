export type Color = "W" | "U" | "B" | "R" | "G";

export const ALL_COLORS: Color[] = ["W", "U", "B", "R", "G"];

/**
 * What a mana ability can produce: one of the five colours, or `"C"` for
 * colourless.
 *
 * Colourless is deliberately *not* a member of `Color`. Colour identity, deck
 * legality and the colour pips in a cost are all about the five colours, and
 * widening that type would have quietly let "colourless" through every one of
 * those checks. Only production needs the sixth option.
 *
 * Colourless mana lands in the pool's `generic` bucket, which already behaves
 * the way colourless does: it pays the generic part of a cost and can never pay
 * a coloured pip. The one thing that treatment does not model is a cost that
 * demands colourless specifically ({C} in a mana cost, as on Eldrazi) - no card
 * in the pool has one, and when the first does it needs a real distinction here
 * rather than another special case at the call site.
 */
export type ManaColor = Color | "C";

export type CardType =
  | "Land"
  | "Creature"
  | "Artifact"
  | "Enchantment"
  | "Planeswalker"
  | "Instant"
  | "Sorcery"
  | "Battle";

export type Keyword =
  | "Flying"
  | "Trample"
  | "First Strike"
  | "Double Strike"
  | "Deathtouch"
  | "Lifelink"
  | "Haste"
  | "Vigilance"
  | "Menace"
  | "Fear"
  | "Nonbasic Landwalk"
  | "Reach"
  | "Defender"
  | "Hexproof"
  | "Indestructible"
  | "Ward"
  | "Flash"
  /**
   * "It deals damage to creatures in the form of -1/-1 counters and to players
   * in the form of poison counters."
   *
   * Changes what damage *is* rather than how much of it there is, which is why
   * it is checked in damage.ts - the one door every point of damage goes
   * through - and not anywhere combat-specific.
   */
  | "Infect"
  /**
   * "This card is every creature type."
   *
   * Nothing may compare `subtypes` directly for a creature-type question once
   * this exists; ask `hasCreatureType`, the same rule granted keywords carry.
   */
  | "Changeling";

/** Generic mana + colored pips. A card with no mana cost (most lands) omits this entirely. */
export interface ManaCost {
  generic: number;
  colors: Partial<Record<Color, number>>;
  /**
   * Hybrid symbols - "{B/G}" is one entry, `["B", "G"]`, paid with either.
   *
   * Not a coloured pip and not generic, which is why it needs its own field:
   * a hybrid symbol *must* be paid with one of its own colours (so colourless
   * mana can never cover it), but which one is the payer's choice at the time.
   * It counts 1 towards mana value however it is paid.
   */
  hybrid?: Color[][];
  /**
   * How many {X} symbols the cost prints. One for The Meathook Massacre
   * ({X}{B}{B}), two for Pest Infestation ({X}{X}{G}) - where choosing X = 3
   * costs six generic, not three.
   *
   * A count rather than a flag for exactly that reason, and it is *not* part of
   * mana value: a card sitting in a hand or a library has X = 0 (rule 202.3b),
   * which is what `manaValue` reports and what the curve is drawn from. The
   * chosen value only exists from the moment the spell is put on the stack.
   */
  x?: number;
}

/**
 * A number in an effect that is not known until the spell is cast - the -X/-X
 * on The Meathook Massacre.
 *
 * Substituted for the chosen value by `resolveAmounts` (see x.ts) before the
 * effect ever reaches `applyEffect`, so every reader downstream still sees a
 * plain number. That is the whole reason this is a substitution rather than a
 * value the effects layer has to understand: nothing in effects.ts, the bot or
 * the card-text renderer had to learn what X is.
 */
export type Amount =
  | number
  | {
      kind: "x";
      negate?: boolean;
      /**
       * "Create **twice X**" - Pest Infestation, whose {X}{X} cost already
       * charges X twice and whose token count is doubled on top of that. A
       * multiplier rather than a second symbol, because they are two different
       * numbers on one card.
       */
      multiply?: number;
    }
  /**
   * "Whenever this creature is dealt damage, create **that many** tokens" -
   * Hornet Nest. The number the event itself carried.
   *
   * Substituted the same way and at the same moment X is, by `resolveAmounts`
   * as the trigger is put on the stack - which is what keeps both of them out
   * of the effects layer entirely. Zero for any event that carries no number,
   * so a card written with this on the wrong trigger does nothing rather than
   * inventing a figure.
   */
  | { kind: "event-amount" }
  /**
   * "Draw a card **for each creature you control with a +1/+1 counter on it**"
   * - a number read off the board when the effect resolves.
   *
   * Deliberately NOT substituted the way X and `event-amount` are. Those are
   * settled before the effect goes on the stack and never change; this is
   * counted at resolution, which is the rule and is visible in play: kill a
   * creature in response to Inspiring Call and it draws one card fewer.
   *
   * So the effects layer *does* have to understand this one. `evaluateAmount`
   * is the single place that turns it into a number, and every handler that
   * takes an `Amount` goes through it.
   */
  | { kind: "count"; of: Countable }
  /**
   * "...where X is the sacrificed creature's power" - Tend the Pests, and the
   * "if you do" half of Disciple of Freyalise.
   *
   * A third moment again, and the reason it is neither of the two above: the
   * creature is *gone* by the time the effect runs, so nothing downstream could
   * read it off the board even if it wanted to. The power is captured while the
   * creature is still on the battlefield - as the cost is paid, or as the
   * sacrifice is chosen - and substituted the way X is.
   */
  | { kind: "sacrificed-power" };

/**
 * What a `count` amount counts. Each entry is a phrase a real card prints, not
 * a general query language - the day a card needs something else, it gets its
 * own entry rather than this growing a filter DSL.
 */
export type Countable =
  /**
   * "For each creature you control [with a +1/+1 counter on it]" - Inspiring
   * Call. `excludeSubtype` is Return of the Wildspeaker's "non-Human".
   */
  | { what: "creatures"; withCounter?: boolean; excludeSubtype?: string }
  /**
   * "The greatest power among [non-Human] creatures you control" - Return of
   * the Wildspeaker. Zero when you control none, which is what the card does.
   */
  | { what: "greatest-power"; excludeSubtype?: string }
  /**
   * "For each +1/+1 counter you've put on creatures under your control this
   * turn" - Iridescent Hornbeetle. A tally rather than a board reading: the
   * creatures it counted may be long dead by the end step, and the card still
   * pays out for them.
   */
  | { what: "counters-placed-this-turn" }
  /**
   * "Where X is the number of creatures attacking you" - Arachnogenesis. Read
   * off the combat state, so it is only ever nonzero during a combat where
   * this player is being attacked, which is the only time the card is cast.
   */
  | { what: "creatures-attacking-you" }
  /** "equal to the number of creature cards in your graveyard" - Grist. */
  | { what: "creature-cards-in-your-graveyard" }
  /**
   * "half the number of cards in their library ... round up" - Peer into the
   * Abyss. Counts the reference player's library, which for a `who: "target"`
   * effect is the target, so the amount is read against whoever is drawing.
   */
  | { what: "half-library-round-up" }
  /** "loses half their life ... round up" - Peer into the Abyss. */
  | { what: "half-life-round-up" }
  /**
   * "for each counter on this creature" - Twitching Doll, which counts *nest*
   * counters. Reads the +1/+1 pile and `otherCounters` together, because
   * "counters on it" on a real card means all of them.
   */
  | { what: "counters-on-source" }
  /** "the amount of life you gained this turn" - Moseo, Vein's New Dean. */
  | { what: "life-gained-this-turn" }
  /** "For each opponent" - Turn Stones. One in a duel, three in a pod. */
  | { what: "opponents" };

/**
 * How many things an effect points at.
 *
 * Absent means exactly one, which is every card in the pool bar two: Pest
 * Infestation says "up to X target artifacts and/or enchantments" and Scheming
 * Symmetry says "choose two target players". Both are counts the caster
 * announces, so they belong beside the selector rather than being inferred from
 * however many targets a client happened to send.
 *
 * `max: "x"` is Pest Infestation's, read from the announced X at cast time.
 */
export interface TargetCount {
  min: number;
  max: number | "x";
}

export type TargetSelector =
  | { kind: "any-target" }
  /**
   * "Target creature", or - with `subtypes` - "target Insect, Rat, Spider, or
   * Squirrel" (Swarmyard). Any one of the listed subtypes qualifies.
   */
  | { kind: "creature"; subtypes?: string[]; damagedThisTurn?: boolean }
  | { kind: "player"; count?: TargetCount }
  | { kind: "opponent-of-controller" }
  /**
   * "Target spell" - a spell on the stack, as opposed to a triggered or
   * activated ability. `spellType` narrows it to a card type, which is how
   * "target instant spell" (Dispel) and "target noncreature spell" are told
   * apart from a plain "target spell".
   */
  | { kind: "spell"; spellType?: CardType }
  /**
   * "Target land", "Target artifact", "Target noncreature artifact or
   * noncreature enchantment" - a permanent on the battlefield of a named type.
   * Creatures keep their own `creature` selector because nearly every card in
   * the pool uses it; this covers the rest. Hexproof applies here exactly as it
   * does to creatures - it protects any permanent, not just creatures.
   *
   * `cardTypes` is a list because Haywire Mite names two of them, and any one
   * qualifying is what "or" means on the card.
   */
  | {
      kind: "permanent";
      /**
       * The types that qualify. **Omitted means any permanent at all** -
       * Assassin's Trophy says "target permanent", which is every type there
       * is, and listing them out would silently stop working the day the
       * engine learns a new card type.
       */
      cardTypes?: CardType[];
      /** "target Forest" - narrows to permanents with one of these subtypes. */
      subtypes?: string[];
      /**
       * "target permanent **an opponent controls**".
       *
       * A real restriction and not decoration: without it Assassin's Trophy
       * can blow up your own land, which is not a play the card offers. Left
       * off, the selector means any permanent on the table, which is what
       * every other card using it says.
       */
      controlledBy?: "opponent";
      /**
       * "**noncreature** artifact" - excludes anything that is also a creature.
       *
       * A real restriction, not decoration: an Artifact Creature is a legal
       * target for "target artifact" and not for "target noncreature artifact",
       * and Haywire Mite is itself an Artifact Creature, so getting this wrong
       * would let it exile itself in response to its own ability.
       */
      noncreature?: boolean;
      /** "up to X target artifacts and/or enchantments" - Pest Infestation. */
      count?: TargetCount;
    }
  /**
   * "Target creature card in your graveyard", and the other card types the
   * recursion spells name. Omitting `cardType` means "target card", which a
   * few of them genuinely say. Hexproof is irrelevant here - it only protects
   * permanents on the battlefield.
   */
  | {
      kind: "card-in-your-graveyard";
      cardType?: CardType;
      /**
       * "Target card **from a graveyard**" - Feral Appetite, which reaches into
       * anybody's. Off by default, because every other card of this shape says
       * "your graveyard" and reaching into an opponent's would be a different
       * and much better card.
       */
      anyGraveyard?: boolean;
      /**
       * "target creature card with mana value X or less" - Moseo, whose X is
       * the life gained this turn. An `Amount` rather than a number because the
       * cap is read when the trigger is put on the stack, not when the card was
       * written.
       */
      maxManaValue?: Amount;
      /** "return **up to one** target creature card" - Moseo. */
      count?: TargetCount;
    }
  /**
   * "Target card you own in exile" - the return-from-exile effects. Separate
   * from the graveyard selector because the two zones are genuinely different
   * places and a card is only ever in one of them.
   */
  | { kind: "card-in-your-exile"; cardType?: CardType };

/**
 * The effect DSL. Deliberately small for Phase 1 - just enough to script the
 * test cards. Extend as new cards need new effect kinds (see CLAUDE.md's
 * vanilla/scripted/weird tiers).
 */
export type Effect =
  | { kind: "damage"; amount: number; target: TargetSelector }
  /**
   * "Draw a card", and the ones that draw a number nobody knows until they
   * resolve - "draw cards equal to the greatest power among non-Human
   * creatures you control".
   */
  | { kind: "draw"; amount: Amount; who?: "target" }
  | { kind: "addMana"; color: ManaColor; amount: number }
  /**
   * One activation producing mana of more than one colour - "Add {B}{G}", the
   * middle option on every filter land.
   *
   * Separate from `addMana` rather than widening it, because `addMana` carries
   * a single colour everywhere it is read: the auto-tapper's source list, the
   * pip that flies to the mana pool, the bot's "can I afford this". Widening it
   * would have touched all of those to serve one shape; a second kind leaves
   * every existing reader alone and simply is not offered to them.
   */
  | { kind: "addManaCombination"; mana: Array<{ color: ManaColor; amount: number }> }
  /**
   * "You gain N life", or "target player gains N life" when a target is handed
   * in - the default reads whatever the effect was pointed at, and falls back
   * to the controller.
   *
   * `who: "controller"` overrides that, and Blood Artist is why it has to
   * exist. Its ability is "**target player** loses 1 life and **you** gain 1
   * life" - one sequence, one target, and two steps that mean different people
   * by it. Left to the default, the life would go to the player who was just
   * drained.
   */
  | {
      kind: "gainLife";
      /**
       * An `Amount` because of Disciple of Freyalise: "you gain X life ...
       * where X is that creature's power". Every other printing in the pool is
       * a plain number and reads exactly as it always did.
       */
      amount: Amount;
      who?: "controller";
    }
  /**
   * "Prevent the next N damage that would be dealt to any target this turn"
   * (Healing Salve's second mode, and the whole prevention family).
   *
   * A shield rather than extra toughness, which is what an earlier version of
   * Healing Salve approximated it with. The two behave differently in ways
   * that come up: a shield stops damage from reaching a player at all, it
   * protects against a deathtouch source rather than merely surviving it, it
   * denies the attacker's lifelink the life it would have gained, and it does
   * nothing at all against destruction or -N/-N.
   */
  | { kind: "preventDamage"; amount: number; target: TargetSelector }
  /**
   * Puts `amount` +1/+1 counters on the target creature, or on the effect's own
   * source if no target is given.
   *
   * `target` is optional for exactly that reason: "{cost}: put a +1/+1 counter
   * on this creature" names nothing, and Duskshell Crawler's "put a +1/+1
   * counter on **target creature**" does. The handler has always honoured a
   * target it was handed; without this field nothing ever asked for one, so
   * the targeted printing could not be written down at all.
   */
  | {
      kind: "addCounter";
      /**
       * An `Amount` rather than a number because of The Ozolith: "put **those**
       * counters on it" means however many the creature that just left was
       * carrying, which the event supplies as `{ kind: "event-amount" }`.
       */
      amount: Amount;
      target?: TargetSelector;
    }
  /**
   * "Move all counters from this permanent onto target creature" - The
   * Ozolith's second ability.
   *
   * A move rather than an add-and-remove pair, because the two halves must not
   * be separable: an ability that added the counters without emptying the
   * source would let The Ozolith pay out every turn from one death.
   */
  | { kind: "moveAllCounters"; target: TargetSelector }
  /**
   * "Mill N cards" - the top N cards of a library into its owner's graveyard.
   *
   * Not a draw and not a loss: milling the last card of a library is legal and
   * does nothing further. Only *drawing* from an empty library loses the game
   * (rule 104.3c), which is why this deliberately does not touch
   * `attemptedDrawFromEmptyLibrary`.
   */
  | { kind: "mill"; amount: Amount }
  /**
   * "Exile the top N cards of your library" - Demonic Bargain. The same move as
   * mill, one zone over: the cards leave the library for exile rather than the
   * graveyard, and like mill it takes whatever is there and stops if the library
   * is shorter than N.
   */
  | { kind: "exileTop"; amount: Amount }
  /**
   * "Target player takes N extra turns after this one." - Time Stretch. Queues
   * the turns onto `GameState.extraTurns`, taken before the turn order rotates
   * on. Player-count-agnostic: the queue is drained in order regardless of how
   * many players there are.
   */
  | { kind: "extraTurn"; count: number; target: TargetSelector }
  /**
   * "You may put a land card from your hand onto the battlefield." - Growth
   * Spiral. An optional extra land that does not use the turn's land drop; the
   * choice reuses the card-choice picker with a to-battlefield mode.
   */
  | { kind: "putLandFromHand" }
  /**
   * "Each player discards their hand, then draws cards equal to the greatest
   * number of cards a player discarded this way." - Windfall. One bespoke step
   * because the draw count is read from the hands as they were before anyone
   * discarded, which no general discard/draw pair records.
   */
  | { kind: "windfall" }
  /** "{T}: Untap target Forest." - Arbor Elf. Untaps one targeted permanent. */
  | { kind: "untap"; target: TargetSelector }
  /**
   * "Destroy all creatures and enchantments" - a wrath. Every permanent of one
   * of `cardTypes`, optionally only nonlands (`nonland`) or up to a mana value
   * (`maxManaValue`), goes through the ordinary destroy path so indestructible,
   * regeneration and dies triggers all apply. `thenDraw` draws one card per
   * permanent actually destroyed (Death Begets Life).
   */
  | {
      kind: "destroyAll";
      cardTypes: CardType[];
      nonland?: boolean;
      maxManaValue?: number;
      thenDraw?: boolean;
    }
  /**
   * "Look at the top N cards of your library, then put them back in any order"
   * - Halimar Depths, and Ponder (which adds `mayShuffle` and a follow-up
   * draw). Distinct from scry: every card goes back on top, none to the bottom,
   * so the only choice is the ordering. Stops resolution and asks, exactly like
   * a search - see `PendingArrange` and `resolveArrange`.
   */
  | { kind: "lookAndArrange"; amount: number; mayShuffle?: boolean }
  /**
   * "Put N cards from your hand on top of your library in any order" -
   * Brainstorm's second half. Stops and asks which cards (and in what order),
   * riding on `PendingCardChoice` with the `to-library-top` mode: the chosen
   * cards go on top in the order named, first-named on top. `count` is a
   * ceiling - a hand shorter than N puts back only what it has.
   */
  | { kind: "putFromHandOnTop"; count: number }
  /**
   * "Look at the top N cards of your library. You may put any of them on the
   * bottom" - scry, as printed on Path of Ancestry.
   *
   * The same interaction as surveil and rides on the same machinery (see
   * `PendingSearch.noShuffle`); only the destination differs, which is exactly
   * the difference between the two keywords.
   */
  | { kind: "scry"; amount: 1 }
  /**
   * "You may sacrifice another creature. **If you do**, ..." - Disciple of
   * Freyalise.
   *
   * Distinct from `AdditionalCost`'s sacrifice, and the difference is not
   * cosmetic: a cost is paid as the spell is cast and is not optional once
   * announced, where this is a choice made *while the ability resolves* and can
   * be declined. Tend the Pests cannot be cast at all without a creature to
   * give up; Disciple of Freyalise is a perfectly good 3/3 with none.
   *
   * Stops the game and asks - see `PendingSacrifice`. `then` runs only if a
   * creature was actually given up, with `sacrificed-power` substituted.
   */
  | {
      kind: "sacrificeChosen";
      /** "You **may** sacrifice" - false would be "sacrifice a creature", which no card here prints. */
      optional?: boolean;
      /** "Another creature" - excludes the permanent whose ability this is. */
      excludeSelf?: boolean;
      /**
       * Which permanent types may be given up. Absent means creatures, which is
       * every printing but one: Braids says "an artifact, creature,
       * enchantment, land, or planeswalker", and offering only creatures would
       * make the card far narrower than it is.
       */
      types?: CardType[];
      /** The "if you do" half. */
      then?: Effect;
    }
  /**
   * "Put `amount` +1/+1 counters on each other creature you control" (The
   * Falcon, Sam Wilson), optionally narrowed to a subtype - "each other Hero
   * you control" (Agent Phil Coulson). Takes no targets: it applies to every
   * matching creature the effect's controller has on the battlefield, always
   * excluding the effect's own source.
   */
  | {
      kind: "addCounterToEachOther";
      amount: number;
      /**
       * Any one of these subtypes will do - "each Pest, Bat, Insect, Snake, and
       * Spider you control" (Blech, Loafing Pest). A single subtype was enough
       * until a card named five.
       */
      subtypes?: string[];
      /**
       * Whether the permanent the effect came from counts as one of them.
       *
       * The default is no, because the wording that needs this effect is
       * usually "each *other* creature you control". Blech says "each Pest ...
       * you control" with no "other", and Blech is a Pest - so it counts
       * itself, and leaving this off would make the card visibly worse than it
       * reads.
       */
      includesSelf?: boolean;
    }
  /**
   * "Double this creature's power until end of turn" (Tifa Lockhart's
   * landfall trigger). Applies to the effect's own source, and stacks: each
   * resolution doubles whatever the power currently is, so two lands in a
   * turn quadruple it. Wears off in the cleanup step (see turn.ts).
   */
  | { kind: "doublePower" }
  /** "Destroy target creature." Indestructible ignores it; the commander replacement effect still applies. */
  | { kind: "destroy"; target: TargetSelector }
  /** "Exile target creature." Bypasses Indestructible, since exile isn't destruction. */
  | { kind: "exile"; target: TargetSelector }
  /**
   * "Regenerate target creature" - a shield, not a prevention effect.
   *
   * The next time the creature would be *destroyed* this turn it is not:
   * instead it taps, leaves combat, and has its marked damage healed. The word
   * destroyed is doing real work there. A creature whose toughness has been
   * reduced to 0 is not destroyed, it is put into the graveyard as a
   * state-based action, so regeneration does nothing at all against -X/-X -
   * which is exactly why this is a shield on the destruction path rather than
   * an extra life the creature carries around.
   */
  | { kind: "regenerate"; target: TargetSelector }
  /**
   * "Regenerate each creature you control" - Golgari Charm's third mode.
   *
   * Untargeted and so a separate effect rather than `regenerate` with a
   * scope: the targeted form has to check hexproof and can fizzle, and this
   * one sweeps the controller's own board where neither applies.
   */
  | { kind: "regenerateAll" }
  /**
   * "Prevent all combat damage that would be dealt this turn by non-Spider
   * creatures" - Arachnogenesis, the second half of a fog.
   *
   * Distinct from `preventDamage`, which is a shield of a fixed size on one
   * target. This is unlimited, lasts the turn, and is a property of the
   * *source* rather than the recipient - so it lives on the game state and is
   * consulted as combat damage is dealt, not spent by it.
   */
  | { kind: "preventCombatDamage"; exceptSubtype?: string }
  /**
   * "Equip {1}" - attach this Equipment to target creature you control.
   *
   * Written as an ordinary targeted activated ability rather than a special
   * action, because that path already works end to end: the client picks a
   * target, the bot can use it, and the cost is paid the same way. What equip
   * adds over a normal ability is the timing, which `sorcerySpeedOnly` carries.
   */
  | { kind: "attach"; target: TargetSelector }
  /**
   * "Create N X tokens." `tokenDefinitionId` must name a definition flagged
   * `isToken`.
   *
   * `count` is an `Amount` because Hornet Nest creates "that many" - one per
   * point of damage it was just dealt. Always a plain number by the time
   * `applyEffect` sees it.
   */
  | { kind: "createToken"; count: Amount; tokenDefinitionId: string }
  /**
   * "Target creature gets +N/+N until end of turn." Both numbers are signed, so
   * the same effect covers Giant Growth and the whole -N/-N removal family - a
   * creature whose toughness hits 0 dies to the existing state-based action, no
   * special "destroy" path needed.
   *
   * `target` is optional: with no target given the pump applies to the effect's
   * own source, which is what "{cost}: This creature gets +N/+N until end of
   * turn" needs (same convention as `addCounter`).
   */
  | {
      kind: "pump";
      power: number;
      toughness: number;
      target?: TargetSelector;
      /**
       * "**It gains indestructible** until end of turn" - Revitalizing Repast.
       * The single-target twin of `pumpAll.grants`, and cleared by the same
       * cleanup step.
       */
      grants?: Keyword[];
    }
  /**
   * The untargeted mass version: "Creatures you control get +N/+N until end of
   * turn" (`scope: "controller"`) or "All creatures get -N/-N until end of
   * turn" (`scope: "all"`) - the latter being how this engine gets a board wipe
   * without a separate effect kind.
   *
   * The two numbers are `Amount` rather than `number` because The Meathook
   * Massacre prints "-X/-X". By the time this reaches `applyEffect` the X has
   * already been substituted, so it is always a plain number there.
   */
  | {
      kind: "pumpAll";
      power: Amount;
      toughness: Amount;
      scope: "controller" | "all";
      /**
       * "Permanents you control **gain hexproof and indestructible** until end
       * of turn" - Heroic Intervention. Granted for the turn and cleared in the
       * cleanup step alongside the P/T bonuses, which is what makes this the
       * right home for it rather than a separate effect.
       */
      grants?: Keyword[];
      /**
       * "...and gain **'Whenever this creature attacks, you gain 1 life'**" -
       * Root Manipulation, which hands out a whole triggered ability rather
       * than a keyword.
       *
       * The same problem granted keywords had, one level up: the moment an
       * ability can be given to a creature that never printed it, no fire site
       * may read `CardDefinition.triggeredAbilities` directly. See
       * `effectiveTriggers`.
       */
      grantsTriggers?: TriggeredAbility[];
      /**
       * Heroic Intervention says **permanents**, not creatures. Everything else
       * in this family says creatures, so that stays the default - widening it
       * silently would give every board pump to lands as well, which is only
       * invisible because lands have no power to show for it.
       */
      appliesTo?: "creatures" | "permanents";
      /**
       * "**Those** creatures gain indestructible" - Inspiring Call, where
       * "those" means the ones it just counted: the creatures with a +1/+1
       * counter. Without it the shield would cover the whole board, which is a
       * much better card.
       */
      restriction?: "with-counter";
      /**
       * "**Non-Human** creatures you control get +3/+3" - Return of the
       * Wildspeaker. An exclusion rather than a filter, because that is how the
       * card is worded and the difference shows up on a board with both.
       */
      excludeSubtype?: string;
    }
  /**
   * "Each opponent loses 1 life", and the family of life *loss* as opposed to
   * damage.
   *
   * A separate effect and not damage with a minus sign, because the two behave
   * differently in ways that come up: loss cannot be prevented by a damage
   * shield, is not dealt by a source, gives lifelink nothing, and does not
   * trigger anything watching for damage. Getting that wrong would make The
   * Meathook Massacre quietly interact with Healing Salve.
   */
  | {
      kind: "loseLife";
      /**
       * An `Amount` because of Grist's ultimate - "each opponent loses life
       * equal to the number of creature cards in your graveyard". Every other
       * printing is a plain number and reads as it always did.
       */
      amount: Amount;
      /**
       * Who loses it. `"each-opponent"` is The Meathook Massacre;
       * `"target"` is Blood Artist's "**target player** loses 1 life", where
       * the player is chosen when the ability goes on the stack and may
       * legally be yourself.
       */
      who: "each-opponent" | "target";
      /** Required when `who` is `"target"`, and meaningless otherwise. */
      target?: TargetSelector;
    }
  /**
   * "Each opponent gets a poison counter" - Prologue to Phyresis. Poison is
   * already tracked per player (Infect deals it, ten of them is a loss via a
   * state-based action); this is the other way a player gets it, an effect
   * rather than damage. Shaped like `loseLife` because the choice of who is the
   * same one - each opponent, or a chosen target.
   */
  | {
      kind: "poison";
      amount: Amount;
      who: "each-opponent" | "target";
      target?: TargetSelector;
    }
  /**
   * "Each opponent discards a card" - Send in the Pest.
   *
   * Which card is the *discarding* player's choice, not the caster's, so this
   * stops the game and asks each of them in turn - see `PendingDiscard`.
   *
   * That is the first choice in this engine aimed at somebody other than the
   * player resolving the spell, and it is the whole difference between a real
   * discard and a strictly better card. Taken at random - which is what this
   * did until 2026-08-13 - "each opponent discards a card" rips answers out of
   * a hand whose owner would have pitched a spare land instead.
   */
  | { kind: "discard"; amount: number; who: "each-opponent" | "self" }
  /**
   * "Surveil 1" - look at the top card of your library, then choose whether to
   * put it into your graveyard.
   *
   * Only 1. Surveil 2 and up let you sort several cards between two zones,
   * which is a genuinely different interaction rather than this one repeated,
   * and `applyEffect` refuses it out loud instead of quietly doing something
   * near enough.
   */
  | { kind: "surveil"; amount: 1 }
  /**
   * "Exile target player's graveyard" - Boggart Trawler.
   *
   * The whole graveyard, not a card from it, so it takes a player rather than
   * a card and has nothing to choose. Worth having as its own effect because
   * "exile" already means something narrower: one permanent, off the
   * battlefield.
   */
  | { kind: "exileGraveyard"; target: TargetSelector }
  /**
   * "**If a creature card is exiled this way**, create a ... token" - Feral
   * Appetite's reflexive half.
   *
   * A sequence step that reads what the step before it actually did, rather
   * than a second effect that hopes. Only ever written after the effect whose
   * target it asks about, and it reads the target's *current* definition -
   * which is right, since exiling does not change what the card is.
   */
  | { kind: "ifTargetWas"; cardType: CardType; then: Effect }
  /**
   * The "yes" half of a shockland's arrival: pay the life, and the land that
   * has just entered tapped untaps.
   *
   * One effect rather than a general "pay life" plus a general "untap this",
   * because no card asks for either on its own and a pair of loose primitives
   * would be two things to get wrong. It is only ever built by
   * `enteredBattlefield`, never written on a fixture.
   *
   * The land really does enter tapped and then untap, where the printed card
   * enters untapped. `entersUntapped`'s posture applies - tapped is the safe
   * direction while the question is unanswered - and nothing in the pool
   * watches for a permanent entering tapped, so the two are indistinguishable
   * in play. The day something does, this has to become a real replacement
   * effect applied before the permanent arrives.
   */
  | { kind: "payLifeToEnterUntapped"; life: number }
  /**
   * "Counter target spell", optionally "...unless its controller pays [cost]".
   * Only spells can be targeted, never triggered or activated abilities - see
   * `isSpellOnStack`.
   */
  | { kind: "counter"; target: TargetSelector; unlessPays?: ManaCost }
  /**
   * "Return target creature card from your graveyard to your hand" - or to the
   * battlefield, for the reanimation spells. Entering the battlefield this way
   * fires enters-the-battlefield triggers exactly as casting it would.
   */
  | { kind: "returnFromGraveyard"; destination: "hand" | "battlefield"; target: TargetSelector }
  /** "Return target card you own from exile to your hand / the battlefield." */
  | { kind: "returnFromExile"; destination: "hand" | "battlefield"; target: TargetSelector }
  /**
   * "Choose one -" and the rest of the modal family.
   *
   * The mode is picked as the spell is *cast*, not as it resolves (rule
   * 601.2b), which is why nothing downstream ever sees this wrapper:
   * `castSpell` swaps it for the chosen mode's effect before the spell goes on
   * the stack. Targeting, resolution, the bot and the client all then deal
   * with an ordinary single effect.
   *
   * `label` is the printed wording of that mode, shown when choosing.
   */
  | { kind: "modal"; modes: Array<{ label: string; effect: Effect }> }
  /**
   * "Search your library for a [card], put it into your hand / onto the
   * battlefield [tapped], then shuffle."
   *
   * Untargeted, and the *engine* picks which card is found - see
   * `chooseSearchResult` in effects.ts for which one and why. The real rules
   * make this the searching player's choice, and there is no mid-resolution
   * decision flow yet.
   */
  | {
      kind: "searchLibrary";
      /** Restricts what may be found. Omitted means any card. */
      cardType?: CardType;
      /** Narrows further to basic lands only, for the ramp spells. */
      basicLandOnly?: boolean;
      /**
       * Any one of these subtypes will do - "a Swamp or Mountain card", which
       * is what every fetchland asks for.
       *
       * Note this is *not* the same as `basicLandOnly`: a fetchland finds any
       * card with the type, so Bayou is a legal find for "a Swamp card" and a
       * fetch that could only take basics would be a materially weaker card.
       */
      subtypes?: string[];
      /**
       * Where the found card goes.
       *
       * `library-top` is the tutor family that finds a card and puts it back
       * where you have to draw it - Sylvan Tutor, Vampiric Tutor. Worth a
       * separate destination rather than "hand" because the two are not close:
       * a card on top costs you your next draw step, which is the whole reason
       * those tutors cost one mana and the ones that find to hand cost more.
       *
       * Note the printed order: "then shuffle and put that card on top". The
       * shuffle happens *first*, so the card is genuinely on top afterwards -
       * see `resolveSearch`, which had to grow a second ordering for this.
       */
      destination: "hand" | "battlefield" | "library-top";
      tapped?: boolean;
      /**
       * Who does the searching. The default is the effect's own controller,
       * which is every tutor ever printed as its own spell.
       *
       * `target-controller` is the rider family, where a spell makes *somebody
       * else* search: Assassin's Trophy hands its victim a basic land. The
       * player is read off the effect's first card target.
       */
      who?: "controller" | "target-controller" | "each-target-player";
      /**
       * Who the spell points at, when the searchers are chosen rather than
       * implied - Scheming Symmetry's "choose two target players".
       *
       * Every other tutor names its searcher ("you", "its controller") and
       * needs none of this.
       */
      target?: TargetSelector;
    }
  /**
   * "Sacrifice it" as an *effect*, as opposed to a cost.
   *
   * Sacrificing has been payable as an activation cost since the fetchlands
   * (`ActivatedAbilityCost.sacrificeSelf`); this is the other half, where the
   * sacrifice is the thing the ability does rather than the price of doing it.
   * Riveteers Overlook sacrifices itself on arrival with nothing paid for it.
   *
   * Only "this permanent" so far. "Sacrifice a creature of your choice" needs
   * the game to stop and ask which, and no card in the pool wants that yet.
   */
  | { kind: "sacrifice"; what: "self" }
  /**
   * Several effects, in order, as one resolution - "sacrifice it, then search
   * your library ... and you gain 1 life".
   *
   * Not the same as putting several abilities on a card: this is one object
   * resolving, so it cannot be responded to part-way through, which is what the
   * card means by writing it as one sentence.
   *
   * A step that stops to ask (a library search) suspends the rest, which
   * `PendingSearch.followUp` carries. Without that the gain-life half would run
   * *before* the search it is written after.
   */
  /**
   * "If you control six or more lands, do this instead" - Scute Swarm.
   *
   * A branch rather than two abilities, because the card is one trigger with
   * one outcome: writing it as two would fire both.
   */
  | { kind: "conditional"; condition: BoardCondition; then: Effect; otherwise?: Effect }
  /**
   * "Create a token that's a copy of this creature" - Scute Swarm, and
   * Springheart Nantuko's copy of whatever it is attached to.
   *
   * A copy is a token of the *same definition*, flagged on the instance rather
   * than the definition - see `CardInstance.isTokenCopy`. That is what lets a
   * real card be copied at all: the definition it copies is a printed card and
   * must not be marked `isToken`, or every real one would cease to exist on
   * leaving the battlefield.
   */
  | { kind: "createCopyToken"; of: "self" | "attached-creature" }
  /**
   * "Mill three cards. Then you may pay {1} and 3 life. If you do, put a card
   * from among those cards into your hand." - Ripples of Undeath.
   *
   * One effect rather than a mill beside a choice, because the choice is over
   * *the cards this milled* - a set that exists only inside this resolution.
   */
  | { kind: "millThenMayTake"; amount: number; cost: { mana?: ManaCost; life?: number } }
  /**
   * "You may cast a spell with mana value 5 or less from your hand without
   * paying its mana cost." - Rishkar's Expertise.
   */
  | { kind: "castFreeFromHand"; maxManaValue: number }
  /**
   * "You may pay any amount of life. If you do, draw that many cards." -
   * Necrodominance. The number is the player's, not the card's, so it is asked
   * for rather than counted.
   */
  | { kind: "payLifeDrawThatMany" }
  /**
   * "Each opponent may sacrifice a permanent of their choice that shares a card
   * type with it. For each opponent who doesn't, that player loses 2 life and
   * you draw a card." - Braids, Arisen Nightmare.
   *
   * The second question in this engine aimed at a player who is not resolving
   * anything (the first was discard), and the first that is *optional* for
   * them - which is the whole card: the punishment is what happens when they
   * decline.
   */
  | {
      kind: "offerSacrificeToOpponents";
      /** Only permanents sharing a type with this one qualify. */
      sharesTypeWith: "the-sacrificed-permanent";
      /** What each opponent who declines suffers. */
      ifDeclined: Effect;
    }
  /**
   * "Put a nest counter on this creature" - the rider on Twitching Doll's mana
   * ability. Not a +1/+1 counter: it changes no stats and only exists to be
   * counted. See `CardInstance.otherCounters`.
   */
  | { kind: "addOtherCounter"; amount: number }
  /**
   * Grist's +1, which is a loop: "create a token, then mill a card. If an
   * Insect card was milled this way, put a loyalty counter on Grist and repeat
   * this process."
   *
   * Deliberately narrow - it is the one card in the pool that repeats itself -
   * and capped, because a library full of Insects would otherwise run until it
   * ran out.
   */
  | {
      kind: "repeatWhileMilledMatches";
      body: Effect;
      /** The creature type the milled card must have for another round. */
      subtype: string;
      /** Also the loyalty this adds each time round, which is what Grist prints. */
      addLoyalty: number;
      max: number;
    }
  /**
   * "You may pay {1}{G}. If you do, ... If you didn't, ..." - Springheart
   * Nantuko.
   *
   * A yes-or-no with a price attached, which is why it is not just an optional
   * trigger: declining and being unable to afford it are the same outcome, and
   * both have to reach the "if you didn't" branch.
   */
  | {
      kind: "mayPay";
      cost: { mana?: ManaCost; life?: number };
      then: Effect;
      otherwise?: Effect;
    }
  /**
   * "This creature becomes prepared." - Eccentric Pestfinder.
   *
   * A flag on the permanent rather than a counter, because that is what it is:
   * while it holds, its controller may cast a copy of the spell on its other
   * face, and doing so clears it.
   */
  | { kind: "becomePrepared" }
  | { kind: "sequence"; effects: Effect[] };

/**
 * A question about the asking player's board. Deliberately a closed list rather
 * than a general predicate language: four shapes cover every card in the pool,
 * and a fifth can be added the day one needs it.
 *
 * Shared by two features that ask the same question at different moments - a
 * tapland as it arrives, and an activation restriction every time somebody
 * reaches for the ability. See conditions.ts.
 */
export type BoardCondition =
  /** "you control two or more other lands" - Deathcap Glade. */
  | { kind: "controls-other-lands"; count: number }
  /** "you have two or more opponents" - Undergrowth Stadium. */
  | { kind: "opponents"; count: number }
  /**
   * "you control a Swamp or a Forest" - Woodland Cemetery, Wastewood Verge.
   * `count` defaults to 1, and any one of the listed subtypes qualifies.
   */
  | { kind: "controls-subtype"; subtypes: string[]; count?: number }
  /**
   * "you control two or more green permanents" - Sapseep Forest. Colour, not
   * colour identity: a Forest is a colourless permanent. See `cardColors`.
   */
  | { kind: "controls-color"; color: Color; count: number }
  /**
   * "If you control a commander" - Deadly Rollick and the free-spell cycle.
   *
   * On the battlefield only, which is what "control" means: a commander sitting
   * in the command zone is not controlled by anybody in play, and reading the
   * command zone here would make the card free on turn one of every game.
   */
  | { kind: "controls-commander" }
  /**
   * "If you control six or more lands" - Scute Swarm. Counts every land,
   * unlike `controls-other-lands`, which exists to let a land ask about the
   * board *without* counting itself as it arrives.
   */
  | { kind: "controls-lands"; count: number }
  /** "if this permanent is attached to a creature you control" - Springheart Nantuko. */
  | { kind: "attached-to-a-creature" };

/**
 * "If an effect would X instead" - a replacement effect.
 *
 * Deliberately not a general "intercept any event" mechanism. The real rules
 * let a replacement modify almost anything, and building that would mean every
 * effect in the engine routing through an event bus. Two events cover every
 * card of this shape in the pool, and both are single lines in effects.ts:
 * counters being put on a permanent, and tokens being created.
 *
 * `multiply` and `add` are both allowed on one entry because a card can print
 * either - Doubling Season multiplies, Winding Constrictor adds - and no card
 * prints both at once. Applying order is decided in replacements.ts.
 */
export type ReplacementEffect =
  /**
   * "If an effect would put one or more counters on a permanent you control,
   * it puts twice that many ... instead" (Doubling Season), or "that many plus
   * one" (Winding Constrictor, narrowed to artifacts and creatures).
   */
  | {
      kind: "counters-placed";
      /** Doubling Season. Applied after every `add`, see replacements.ts. */
      multiply?: number;
      /** Winding Constrictor. */
      add?: number;
      /**
       * Which permanents qualify. Omitted means every permanent you control,
       * which is what Doubling Season says; Winding Constrictor names two
       * types and would wrongly pump an enchantment without this.
       */
      cardTypes?: CardType[];
    }
  /** "If an effect would create one or more tokens under your control, it creates twice that many instead." */
  | { kind: "tokens-created"; multiply: number }
  /**
   * "If a card or token would be put into your graveyard from anywhere, exile
   * it instead." - Necrodominance.
   *
   * The third event a replacement can intercept, and the first that is a zone
   * change. It sits in `moveCard`, which is the one door every zone change
   * goes through - the whole reason that was worth keeping as a single door.
   */
  | { kind: "graveyard-to-exile" };

/** The tapland half of `BoardCondition`, named for where it reads. */
export type EntersUntappedCondition = BoardCondition;

/**
 * What sets a triggered ability off.
 *
 * Three families, and knowing which one a card belongs to is the thing that
 * gets written wrong:
 *
 * - **Self**: `enters-battlefield`, `attacks`, `dies` watch the card the
 *   ability is printed on and nothing else.
 * - **Watcher**: `landfall`, `permanent-enters`, `permanent-dies` sit on the
 *   battlefield and watch other permanents come and go. Eight lifegain
 *   creatures ("Whenever another creature you control enters, you gain 1 life")
 *   were once written as `enters-battlefield`, which fires only when the card
 *   itself arrives - so they gained life exactly once, at the one moment their
 *   own text excludes, and never again.
 * - **Turn-based**: `upkeep`, `first-main`, `begin-combat`, `end-step` are
 *   fired by the turn machine as it reaches each step. `watches` decides
 *   whether that means every player's ("At the beginning of each end step") or
 *   only the controller's ("At the beginning of your upkeep").
 */
export type TriggerEvent =
  | "enters-battlefield"
  | "attacks"
  | "dies"
  | "landfall"
  | "permanent-enters"
  /**
   * "Whenever a creature you control dies." The mirror of `permanent-enters`,
   * and it reads the same three narrowing fields, so a card watching for
   * arrivals and one watching for deaths are written the same way.
   */
  | "permanent-dies"
  /**
   * "Whenever a player sacrifices a nontoken creature" - Fumulus, the
   * Infestation.
   *
   * Not the same event as `permanent-dies`, even though every sacrifice is
   * also a death. A creature killed in combat dies and is not sacrificed, so a
   * card written the other way round would pay out on every board stall; and
   * `watches: "any"` here means genuinely any player's sacrifice, which is what
   * "a player" says.
   */
  | "permanent-sacrificed"
  /**
   * "Whenever an Insect, Leech, Slug, or Worm you control attacks" - Fumulus.
   *
   * The watcher twin of `attacks`, which only ever watches the card it is
   * printed on. Fired once per declared attacker, after every attacker is
   * declared, because declaring attackers is one simultaneous action.
   */
  | "permanent-attacks"
  /**
   * "Whenever a creature you control **leaves the battlefield**" - The Ozolith.
   *
   * Wider than `permanent-dies` on purpose: a creature exiled, bounced or
   * tucked has left the battlefield without dying, and The Ozolith catches its
   * counters all the same. The number it was carrying is handed to the effect
   * as `{ kind: "event-amount" }`, captured before the move clears them.
   */
  | "leaves-battlefield"
  /**
   * "Whenever you gain life." Watches the *controller* of the permanent the
   * ability is printed on, so it fires however the life arrived - a spell, a
   * land, lifelink in combat - rather than needing every source to know about
   * it. See gainLife in life.ts, which is the one door all life gain goes
   * through for exactly that reason.
   */
  | "gain-life"
  /**
   * "Whenever an opponent casts an instant or sorcery spell" - Arasta of the
   * Endless Web.
   *
   * A watcher event whose subject is the *spell*, not a permanent, so
   * `watchFor.type` reads the spell's card types and `watchFor.controlledBy`
   * reads who is casting it. Fired as the spell goes on the stack, which is
   * why the trigger resolves first: it goes on top of the spell that set it
   * off, exactly as the rules have it.
   */
  | "spell-cast"
  /**
   * "Whenever this creature is dealt damage" - Hornet Nest.
   *
   * A *self* event: the permanent watches only damage marked on itself, so
   * this needs no `watchFor` at all. Fired from `damageCreature`, the one door
   * every point of damage in the engine goes through, so combat damage,
   * a burn spell and a fight all set it off alike. The amount is carried into
   * the effect as `{ kind: "event-amount" }`.
   */
  | "damaged"
  /**
   * "Whenever a creature you control deals combat damage to a player" -
   * Necropolis Regent, Starwinder. A watcher event whose subject is the
   * creature that dealt the damage; the trigger is pushed with that creature as
   * its source, so "put that many +1/+1 counters on it" lands on the attacker,
   * and the amount dealt is carried as `{ kind: "event-amount" }`. `watches`
   * decides whose creatures count. Fired from `dealCombatDamage`.
   */
  | "combat-damage-to-player"
  | "upkeep"
  /**
   * "At the beginning of your first main phase" - the precombat main only.
   * There are two main phases in a turn and the postcombat one must not fire
   * this a second time, which is why it is not simply "main".
   */
  | "first-main"
  | "begin-combat"
  | "end-step";

/**
 * The "if ..." in "At the beginning of each end step, **if a creature died this
 * turn**, you may draw a card" - rule 603.4's intervening-if.
 *
 * Not the same thing as an ordinary condition, and the difference is visible in
 * play: it is checked twice, once when the trigger would go on the stack and
 * again as it resolves, and the ability does nothing if it has stopped being
 * true in between. A condition checked only once would let a Deathreap Ritual
 * trigger survive its own creature being exiled in response.
 */
export type TriggerCondition =
  /** Deathreap Ritual's morbid. Counts deaths anywhere, not just the controller's. */
  | { kind: "creature-died-this-turn" }
  /**
   * "if The Ozolith has counters on it" - a question about the permanent
   * printing the trigger rather than about the board, which is why it is not a
   * `BoardCondition`.
   *
   * Being an intervening-if matters here more than usual: the counters can be
   * moved away in response, and a condition checked only once would let the
   * ability resolve and put nothing anywhere.
   */
  | { kind: "source-has-counters" }
  /** "if you gained life this turn" - Moseo, and Eccentric Pestfinder's infusion. */
  | { kind: "gained-life-this-turn" }
  /** Ophiomancer: "if you control no Snakes". A `BoardCondition` read as a negation. */
  | { kind: "not"; condition: BoardCondition };

export interface TriggeredAbility {
  event: TriggerEvent;
  effect: Effect;
  /**
   * Watcher events: whose permanents this watches - "controller" for "another
   * creature *you control* enters", which is the common case, or "any" for
   * "another creature enters" (Soul Warden, Essence Warden), which watches
   * every player's side of the table.
   *
   * Turn-based events: whose step it is. "controller" is "at the beginning of
   * your upkeep", "any" is "at the beginning of each upkeep". Getting this
   * wrong doubles or halves how often the card does anything, so it is written
   * out on every turn-based ability rather than defaulted.
   *
   * Landfall is a watcher event and honours this too: it used to be hardcoded
   * to the controller, which is right for every card that says "a land *you
   * control* enters" and wrong for Lifegift, which says "a land enters".
   */
  watches?: "controller" | "any";
  /**
   * Watcher events only. Whether the watcher itself counts.
   *
   * Almost every card of this shape says "*another* creature", so this
   * defaults to false. Kor Celebrant is the one that says "this creature or
   * another creature you control", and Blood Artist says "this creature or
   * another creature dies".
   */
  includesSelf?: boolean;
  /**
   * Watcher events only. Which permanents set it off.
   *
   * Most of this family watch creatures, but not all: Tanglespan Lookout is
   * "whenever an Aura you control enters, draw a card", and was written as an
   * `enters-battlefield` draw - so it drew a card on arrival, which the real
   * card does not do, and never drew one for an Aura. Omitting this watches
   * every permanent, which no card in the pool currently wants; write it out.
   */
  watchFor?: {
    /**
     * The card type the subject has to have.
     *
     * A list means any one of them qualifies, which is what Arasta of the
     * Endless Web's "an instant **or sorcery** spell" says. One field rather
     * than two, because it is one question.
     */
    type?: CardType | CardType[];
    /**
     * The creature type the subject has to have. A list means any one of them
     * qualifies - Fumulus watches "an **Insect, Leech, Slug, or Worm** you
     * control", which is one question with four acceptable answers, exactly as
     * `type` above is.
     */
    subtype?: string | string[];
    /**
     * "a creature you control **with a +1/+1 counter on it**" - Meltstrider
     * Eulogist. Read at the moment of the event, which for a death means the
     * counters it had on the battlefield: `moveCard` clears them on the way to
     * the graveyard, so a check made afterwards would never once be true.
     */
    withCounter?: boolean;
    /** "a **nontoken** creature you control dies" - Blight Mound. */
    nontoken?: boolean;
    /**
     * "Whenever **equipped** creature dies" - Skullclamp. Only the one creature
     * this Equipment is currently attached to, so the watcher has to compare
     * against its own `attachedTo` rather than against a class of permanents.
     */
    attachedToThis?: boolean;
    /**
     * Whose permanent it has to be, relative to the watcher's controller.
     *
     * The Meathook Massacre needs both halves and they do opposite things:
     * "whenever a creature **you control** dies, each opponent loses 1 life"
     * and "whenever a creature **an opponent controls** dies, you gain 1 life".
     * Without this the two abilities are indistinguishable and the card drains
     * you every time your own creature dies.
     *
     * Omitted means any creature at all, which is what Soul Warden's family
     * says and why it cannot simply default to "you".
     */
    controlledBy?: "you" | "opponent";
  };
  /**
   * "You may". The trigger still goes on the stack; its controller is asked on
   * resolution and may decline.
   *
   * Not treated as free upside and taken automatically. "You may draw a card"
   * is a real decision when your library is nearly empty, and an engine that
   * drew for you would hand you a loss you never agreed to.
   */
  optional?: boolean;
  /** Rule 603.4's intervening-if. See `TriggerCondition`. */
  onlyIf?: TriggerCondition;
}

export interface ActivatedAbilityCost {
  tap?: boolean;
  mana?: ManaCost;
  /**
   * "Pay N life." A real cost, not an effect: it is paid on activation whether
   * or not the ability resolves, and it cannot be paid with life you do not
   * have. Paying down to exactly 0 is legal and loses the game to the usual
   * state-based action, which is the real rule and not a special case here.
   */
  payLife?: number;
  /**
   * "Sacrifice this creature/land." Sacrifices the permanent the ability is
   * printed on, as part of the cost - so the ability still resolves from a
   * source that is already in the graveyard, which is what makes a fetchland
   * work at all.
   */
  sacrificeSelf?: boolean;
}

/**
 * Where the set of colours an "any colour" ability may produce comes from, when
 * it is not simply free choice.
 *
 * A card producing a free choice of colour is written as one ability per colour
 * - which is what `activatedAbilities` already is, and needs no new concept.
 * These two are that same shape with a filter over it: the five halves are all
 * written out, and the engine refuses whichever ones are not currently
 * available. Without it a Command Tower in a Golgari deck would tap for white,
 * which is not the card.
 */
export type ManaColorSource =
  /** "...of any color in your commander's color identity." - Command Tower. */
  | "commander-identity"
  /** "...of any color that a land an opponent controls could produce." - Exotic Orchard. */
  | "opponent-lands";

/**
 * "Spend this mana only to cast a legendary spell, and that spell can't be
 * countered." - Delighted Halfling.
 *
 * Mana that is not interchangeable with the rest of the pool, which is why it
 * cannot simply be added to it. Kept as a closed list for the same reason every
 * other condition here is: one card needs one shape, and inventing a general
 * restriction language now would mean accepting wordings nothing can evaluate.
 */
export type ManaSpendRestriction = {
  kind: "legendary-spell";
  /** "...and that spell can't be countered." Applies to whatever this mana helped pay for. */
  grantsUncounterable?: boolean;
};

/**
 * A planeswalker's loyalty ability. `cost` is signed exactly as the card prints
 * it: +1 adds a loyalty counter, -2 removes two and cannot be activated with
 * only one.
 */
export interface LoyaltyAbility {
  cost: number;
  effect: Effect;
  /** The printed wording, for the client's button. */
  label?: string;
}

export interface ActivatedAbility {
  /**
   * "Equip only as a sorcery." Activated abilities are instant-speed by
   * default, which is right for all but this one - equipping at the end of an
   * opponent's turn would be a materially better Skullclamp.
   */
  sorcerySpeedOnly?: boolean;
  cost: ActivatedAbilityCost;
  effect: Effect;
  /** Narrows which of an "any colour" ability's five halves are legal right now. */
  colorFrom?: ManaColorSource;
  /**
   * Marks the mana this ability produces as spendable only on certain spells.
   * It goes into `Player.restrictedMana` rather than the ordinary pool, so
   * nothing that counts a player's mana can accidentally spend it on anything
   * else.
   */
  producesRestrictedMana?: ManaSpendRestriction;
  /**
   * "When that mana is spent to cast ..., scry 1" - Path of Ancestry.
   *
   * Marks the mana this ability produces without restricting it. The mana goes
   * into the ordinary pool and can pay for anything; the mark only decides
   * whether a trigger fires when it is spent. See `ManaMark`.
   */
  marksMana?: ManaSpendRider;
  /**
   * "Add one mana of any color. **Put a nest counter on this creature.**" -
   * Twitching Doll. A rider on a mana ability, applied where
   * `damageToController` is and for the same reason: it belongs to the
   * ability, not to adding mana.
   */
  addsOtherCounterToSelf?: number;
  /**
   * "Activate only if you control a Swamp." - Tainted Wood, Wastewood Verge,
   * Sapseep Forest.
   *
   * A restriction on activating, not a cost and not a target requirement: it is
   * re-checked every time somebody reaches for the ability, and nothing is paid
   * when it fails. Everything that counts a player's available mana without
   * spending it has to honour this too, or the game offers you spells you
   * cannot actually pay for and then taps a land to nothing trying.
   */
  activateOnlyIf?: BoardCondition;
  /**
   * "Add {B}. This land deals 1 damage to you." - the painland rider, and the
   * whole reason those lands are playable at all rather than strictly better
   * duals.
   *
   * The damage is dealt by the permanent to the ability's controller, as the
   * ability resolves. This is still a mana ability, so that resolution is
   * immediate and does not use the stack - which is what makes a rider on the
   * ability the honest shape rather than a second effect somebody has to
   * remember to run.
   */
  damageToController?: number;
}

/**
 * "As an additional cost to cast this spell, ..." - a price paid on top of the
 * mana, at the moment of casting (rule 601.2f-h).
 *
 * Additional rather than alternative, and the word is the whole rule: Toxic
 * Deluge costs {2}{B} *and* X life. A cost is also not the same thing as an
 * effect that happens to do the same job - it is paid before the spell is on
 * the stack, it cannot be responded to, and a spell whose additional cost
 * cannot be paid cannot be cast at all. That last part is why Tend the Pests is
 * uncastable with an empty board, where a card that sacrificed on resolution
 * would still be a legal, useless spell.
 */
export type AdditionalCost =
  /**
   * "Pay X life" - Toxic Deluge, where X is announced as the spell is cast and
   * then read by its effect. The `Amount` is `{ kind: "x" }` for that card and
   * a plain number for anything printing a fixed figure.
   */
  | { kind: "pay-life"; amount: Amount }
  /**
   * "Sacrifice a creature" - Tend the Pests. Which creature is the caster's
   * choice, announced with the spell rather than asked for afterwards, because
   * that is when the cost is paid.
   */
  | { kind: "sacrifice-creature" };

/**
 * "If you control a commander, you may cast this spell without paying its mana
 * cost." - Deadly Rollick.
 *
 * An *alternative* cost replaces the mana cost outright, where an
 * `AdditionalCost` is paid beside it. Optional in every printing of this shape,
 * so it is offered rather than applied: casting Deadly Rollick for its mana
 * cost is sometimes right, and always legal.
 */
export interface AlternativeCost {
  /** When the alternative is available at all. */
  condition: BoardCondition;
  /** The printed wording, for the client's offer - "cast without paying its mana cost?". */
  label: string;
  /**
   * "You may sacrifice a nontoken blue creature rather than pay this spell's
   * mana cost" - Flare of Denial. When set, choosing the alternative costs the
   * named creature (via `options.sacrificeInstanceId`) rather than being free.
   */
  sacrifice?: { color?: Color; nontoken?: boolean };
}

/**
 * A rider carried by a specific lump of mana, which fires when that mana is
 * spent on a particular kind of spell - Path of Ancestry.
 *
 * Deliberately not a `ManaSpendRestriction`: this mana may be spent on anything
 * at all, and writing it as a restriction would forbid the very plays the card
 * allows. What it carries is a *marking*, not a limit. See `ManaMark`.
 */
export type ManaSpendRider = {
  kind: "scry-on-creature-sharing-commander-type";
  amount: 1;
};

/**
 * One lump of mana in the ordinary pool that remembers where it came from.
 *
 * Unlike `RestrictedMana` this is *not* held apart from the pool - the mana is
 * fully interchangeable and every affordability check should count it. The mark
 * is an annotation alongside, consumed when the pool's count of that colour
 * actually drops to pay for a spell.
 */
export interface ManaMark {
  color: ManaColor;
  amount: number;
  /** The permanent that made it, so its trigger has a source to fire from. */
  sourceInstanceId: string;
  rider: ManaSpendRider;
}

/**
 * Rules the card changes about the turn itself, rather than about any
 * permanent's characteristics.
 *
 * A separate field rather than another `staticBuff` because these are not
 * continuous effects on objects at all - they are permissions granted to the
 * controller, read by `playLand` rather than by anything that computes stats.
 */
export interface StaticRules {
  /** "You may play an additional land on each of your turns" - Icetill Explorer. */
  extraLandDrops?: number;
  /** "You may play lands from your graveyard" - Icetill Explorer's second line. */
  playLandsFromGraveyard?: boolean;
  /** "Skip your draw step." - Necrodominance. */
  skipDrawStep?: boolean;
  /** "Your maximum hand size is five." - Necrodominance. */
  maxHandSize?: number;
  /** "You have no maximum hand size." - Reliquary Tower. Wins over any maxHandSize while it is in play. */
  noMaxHandSize?: boolean;
  /**
   * "If you would draw a card while your library has no cards in it, you win the
   * game instead." - Laboratory Maniac. Checked when the empty-library draw
   * would otherwise lose the game (see sba.ts); a real replacement on the draw
   * event, modelled at the state-based check because that is where the
   * empty-library loss already lives.
   */
  winInsteadOfEmptyDraw?: boolean;
  /**
   * Felix Five-Boots: "If a creature you control dealing combat damage to a
   * player causes a triggered ability of a permanent you control to trigger,
   * that ability triggers an additional time." Read in `fireCombatDamageToPlayer`
   * - each permanent you control with this flag adds one extra firing.
   */
  extraCombatDamageToPlayerTrigger?: boolean;
}

/**
 * Static card data - the "what a card is/does" side, sourced conceptually
 * from Scryfall (see CLAUDE.md). Distinct from CardInstance, which is a
 * specific physical copy of this definition in a game.
 */
export interface CardDefinition {
  id: string;
  name: string;
  /**
   * Scryfall's id for this card, used only to build an image URL - see
   * packages/client/src/cardArt.ts. Every Scryfall image URL is derivable from
   * it, so no artwork or image URL is stored in this repo; the browser fetches
   * from Scryfall's CDN at runtime. Absent on tokens, which have no card row.
   *
   * This is the id of Scryfall's *representative* printing, which is what the
   * oracle_cards bulk file holds. A deck can override it per card - see
   * docs/CARD-ART.md.
   */
  scryfallId?: string;
  types: CardType[];
  subtypes?: string[];
  supertypes?: Array<"Legendary" | "Basic" | "Snow">;
  manaCost?: ManaCost;
  /** Color identity per the Commander rule: colors in cost + rules text, including reminder text. */
  colorIdentity: Color[];
  power?: number;
  toughness?: number;
  keywords?: Keyword[];
  /** Only meaningful when `keywords` includes "Ward" - the mana cost an opponent must pay when targeting this permanent, or their spell/ability is countered. */
  wardCost?: ManaCost;
  /**
   * "Ward-Pay 3 life" - Sedgemoor Witch. Ward's cost is not always mana, and a
   * life ward written as a mana ward would be both easier and harder to pay
   * than the card at once.
   *
   * Set instead of `wardCost`, not beside it: no printing asks for both.
   */
  wardLifeCost?: number;
  /**
   * A continuous "other creatures you control get +N/+N" effect, optionally
   * narrowed to a subtype (the "lord" pattern - "other Elves you control get
   * +1/+1"). Always excludes the source itself, which is also what makes it
   * work unchanged on a non-creature anthem.
   *
   * This is a deliberately narrow stand-in for a real continuous-effect layer
   * system: it only ever adjusts power/toughness, and it is applied at the
   * point stats are read (see counters.ts) rather than being layered properly.
   * Anything that grants keywords, changes types, or depends on timestamps
   * still needs the real thing. See ROADMAP.md.
   */
  staticBuff?: {
    power: number;
    toughness: number;
    subtype?: string;
    /**
     * "Attacking Pests you control get +1/+0 **and have menace**" - Blight
     * Mound. Keywords granted for as long as this permanent is on the
     * battlefield and the restriction below holds.
     *
     * Granted rather than printed, which is why nothing may read
     * `CardDefinition.keywords` directly any more: see `effectiveKeywords`.
     */
    grants?: Keyword[];
    /**
     * The ward cost handed to whatever this is attached to - Lavaspur Boots'
     * "ward {1}", Winged Boots' "ward {4}". Meaningful only when `grants`
     * includes "Ward"; ward.ts reads it off the attached Equipment because the
     * warded creature's own definition carries no ward cost.
     */
    grantsWardCost?: ManaCost;
    /**
     * Which of the controller's permanents it reaches, beyond the subtype.
     *
     * `"attacking"` is Blight Mound's "**Attacking** Pests you control", which
     * is not decoration - the menace is only there in combat, and a card that
     * granted it permanently would be a different card. `"with-counter"` is
     * Duskshell Crawler's "each creature you control **with a +1/+1 counter on
     * it**", which turns on and off as counters come and go.
     */
    restriction?: "attacking" | "with-counter";
    /**
     * Whether the permanent printing this counts as one of the things it
     * affects.
     *
     * Defaults to false, because every "lord" says "**other** creatures you
     * control". Duskshell Crawler says "each creature you control with a +1/+1
     * counter on it" with no "other", and is itself a creature that can carry
     * one - so leaving this off would make it the one creature its own ability
     * skips.
     */
    includesSelf?: boolean;
    /**
     * "Creature tokens you control have '{T}: Add one mana of any color.'" -
     * Springleaf Parade, which hands out a whole activated ability.
     *
     * The same problem granted keywords and granted triggers had, a third
     * time: nothing may read `CardDefinition.activatedAbilities` directly.
     * See `effectiveActivated`.
     */
    grantsAbilities?: ActivatedAbility[];
    /** "Creature **tokens** you control" - narrows to tokens only. */
    tokensOnly?: boolean;
  };
  /**
   * "If an effect would ... instead" - the replacement-effect family. See
   * replacements.ts for how they combine and why the order is what it is.
   *
   * Only on the battlefield, and only ever the controller's own things: every
   * card of this shape in the pool says "you control" or "under your control".
   */
  replacementEffects?: ReplacementEffect[];
  /** Tokens cease to exist the moment they leave the battlefield, rather than moving zones. */
  isToken?: boolean;
  /**
   * The other half of a modal double-faced card - the land on the back of Bala
   * Ged Recovery, and its three cousins in this deck.
   *
   * The two faces are two `CardDefinition`s, and a card played as its back face
   * simply *becomes* that definition: `playLand` swaps `definitionId` on the
   * way to the battlefield, and `moveCard` swaps it back when the card leaves.
   *
   * That is deliberately not "one definition with two faces". Every read site
   * in the engine, the bot and the client asks `requireDefinition` for what a
   * card is right now, and a face-aware definition would mean teaching all of
   * them which face to look at - the same sprawl that made granted keywords
   * expensive. Swapping the id keeps every one of them correct without knowing
   * MDFCs exist. The card really is one physical object with two sets of
   * characteristics, and only one of them applies at a time.
   */
  backFaceId?: string;
  /**
   * "Equip {1}" - the cost of attaching this Equipment to a creature you
   * control, at sorcery speed.
   *
   * Its presence is what makes a permanent an Equipment as far as the engine is
   * concerned; `staticBuff` on the same card then applies to whatever it is
   * attached to rather than to a class of creatures. That reuse is deliberate -
   * "equipped creature gets +1/-1" is the same kind of continuous effect the
   * anthems already are, narrowed to exactly one permanent.
   */
  equipCost?: ManaCost;
  /**
   * True on the *back* definition, so the deck builder and the card pool do not
   * offer it as a card of its own. You cannot put Bala Ged Sanctuary in a deck;
   * you put Bala Ged Recovery in and choose a face when you play it.
   */
  isBackFace?: boolean;
  /**
   * "This permanent enters tapped." True for most nonbasic lands that produce
   * more than one colour - the drawback that pays for the fixing.
   *
   * Only the unconditional printing. "Enters tapped unless you control two or
   * more other lands" is a condition on the permanent's own arrival, which
   * nothing here can express, and a card like that must not be written as
   * flatly tapped - it would be strictly worse than the card really is.
   */
  entersTapped?: boolean;
  /**
   * "This land enters tapped **unless** ..." - the drawback most nonbasic duals
   * carry, and the reason those cards were refused until now. Writing one as
   * flatly tapped makes it strictly worse than the printed card, so a condition
   * was the only honest way to have them at all.
   *
   * Checked as the permanent arrives; if the condition holds it enters
   * untapped, otherwise `entersTapped` applies as usual.
   */
  entersTappedUnless?: EntersUntappedCondition;
  /**
   * "As this land enters, you may pay N life. If you don't, it enters tapped"
   * - the shockland cycle, of which Overgrown Tomb is this deck's.
   *
   * A number rather than a boolean because the cycle is not uniform: the
   * ten-card shockland cycle is 2, and the newer "surveil land unless you pay
   * 3 life" printings are 3.
   *
   * Asked as the permanent arrives, so the answer is a mid-arrival choice
   * rather than something the caster decided in advance - which matters,
   * because whether 2 life is worth an untapped land depends on the board in
   * front of you at the time. Distinct from `entersTappedUnless`, which the
   * engine answers on its own from the board.
   */
  entersTappedUnlessPayLife?: number;
  /**
   * Rules this permanent changes about its controller's turn - extra land
   * drops, and where lands may be played from. Battlefield only.
   */
  staticRules?: StaticRules;
  /**
   * Starting loyalty. Its presence is what makes a card a planeswalker as far
   * as the engine is concerned, the same way `equipCost` marks an Equipment.
   */
  loyalty?: number;
  /**
   * "+1:", "-2:", "-5:" - the abilities a planeswalker activates by moving its
   * own loyalty. One a turn, at sorcery speed, and the cost is signed: a
   * negative one cannot be activated for more loyalty than the card has.
   */
  loyaltyAbilities?: LoyaltyAbility[];
  /**
   * "As long as Grist isn't on the battlefield, it's a 1/1 Insect creature in
   * addition to its other types."
   *
   * A characteristic-defining ability that applies in every zone *except* the
   * battlefield, which is the opposite of everything else here - so it is read
   * by `typesOf` rather than by anything that looks at permanents.
   */
  alsoCreatureOffBattlefield?: { power: number; toughness: number; subtypes: string[] };
  /**
   * "Suspend 2-{1}{B}" - pay the cost, exile it with that many time counters,
   * remove one each of your upkeeps, and cast it free when the last is gone.
   */
  suspend?: { timeCounters: number; cost: ManaCost };
  /**
   * "Devour 1" - as this enters, you may sacrifice any number of creatures; it
   * enters with that many times this number of +1/+1 counters on it.
   */
  devour?: number;
  /**
   * "Bestow {1}{G}" - cast it as an Aura for this cost instead, attached to a
   * creature. It is still a creature card; it simply is not a creature while
   * it is attached to one.
   */
  bestowCost?: ManaCost;
  /** "As an additional cost to cast this spell, ..." - paid at cast time. */
  additionalCost?: AdditionalCost;
  /** "You may cast this spell without paying its mana cost" - offered at cast time. */
  alternativeCost?: AlternativeCost;
  triggeredAbilities?: TriggeredAbility[];
  activatedAbilities?: ActivatedAbility[];
  /** What resolving this spell does, for instants/sorceries. */
  castEffect?: Effect;
  /**
   * "This spell can't be countered." Note that this is NOT a targeting
   * restriction: a counterspell may still legally target this spell, it just
   * does nothing when it resolves. See the `counter` effect in effects.ts.
   */
  cantBeCountered?: boolean;
  /**
   * Propaganda: "Creatures can't attack you unless their controller pays {2}
   * for each creature they control that's attacking you." The generic mana an
   * attacking player owes per attacker aimed at this permanent's controller;
   * charged in `declareAttackers`.
   */
  attackTax?: number;
  /** Whether this card can legally be someone's commander (legendary creature, or explicitly says so). */
  canBeCommander?: boolean;
  tier: "vanilla" | "scripted" | "weird";
}

export type PublicZoneId = "library" | "hand" | "battlefield" | "graveyard" | "exile" | "command";
/** Every zone a card instance can sit in, including the stack (which isn't a per-player zone array). */
export type ZoneId = PublicZoneId | "stack";

/** A specific physical card in a game, as opposed to its static CardDefinition. */
export interface CardInstance {
  instanceId: string;
  definitionId: string;
  ownerId: string;
  controllerId: string;
  zone: ZoneId;
  tapped: boolean;
  damageMarked: number;
  /** "was dealt damage this turn" - set whenever damage lands, cleared in cleanup. For You Are Already Dead. */
  damagedThisTurn?: boolean;
  /** True if any damage currently marked on this creature came from a Deathtouch source - makes it lethal regardless of amount. */
  deathtouchDamage: boolean;
  /** +1/+1 counters currently on this permanent. Reset to 0 on any zone change (a "new object" per the real rules). */
  plusOneCounters: number;
  /**
   * The value announced for {X} when this card was cast, for a card whose own
   * abilities refer to it.
   *
   * Deliberately *not* cleared by `moveCard`, unlike counters and pumps. For a
   * permanent spell, X stays defined for the permanent's abilities after it
   * resolves (rule 608.2g) - The Meathook Massacre's "each creature gets -X/-X"
   * is an enters-the-battlefield trigger, so it fires after the spell has left
   * the stack and would see nothing at all if this were reset on the way in.
   *
   * 0 for everything else, which is also the right answer: a card with no {X}
   * in its cost has X = 0.
   */
  chosenX: number;
  /**
   * The permanent this Equipment is attached to, if any.
   *
   * On the *Equipment*, not on the creature, because that is the direction the
   * rules run: an Aura or Equipment is attached to a permanent, and moving it
   * is a change to the Equipment. A creature can carry any number of them, so
   * the reverse mapping would have to be a list that is only ever derived.
   *
   * Cleared on any zone change - by the Equipment moving, and by the creature
   * it was on leaving, which `checkStateBasedActions` notices.
   */
  attachedTo?: string;
  /**
   * Extra power from "until end of turn" effects, on top of the printed value
   * and any +1/+1 counters. Cleared in the cleanup step and on any zone
   * change. This is a deliberate shortcut around a full continuous-effect
   * layer system - enough for power-pumping effects, not for type/ability
   * changing ones. See ROADMAP.md.
   */
  temporaryPowerBonus: number;
  /** Extra toughness from "until end of turn" effects. Cleared alongside temporaryPowerBonus; goes negative for -N/-N effects. */
  temporaryToughnessBonus: number;
  /**
   * Keywords handed to this permanent until end of turn - Heroic
   * Intervention's hexproof and indestructible.
   *
   * Cleared in the cleanup step and on any zone change, exactly like the P/T
   * bonuses above and for the same reason: it is a property of this object
   * this turn, not of the card. Nothing reads this directly; ask
   * `effectiveKeywords`, which also folds in what other permanents are
   * granting.
   */
  grantedKeywords: Keyword[];
  /**
   * Whole triggered abilities handed to this permanent until end of turn -
   * Root Manipulation's "Whenever this creature attacks, you gain 1 life".
   *
   * The exact twin of `grantedKeywords`, cleared at the same two moments, and
   * carrying the same rule: nothing may read `CardDefinition.triggeredAbilities`
   * directly any more. Ask `effectiveTriggers`.
   */
  grantedTriggers: TriggeredAbility[];
  /**
   * -1/-1 counters, which are not negative +1/+1 counters: they are a separate
   * kind, they do not annihilate here, and infect damage is the only thing in
   * the pool that makes them.
   */
  minusOneCounters: number;
  /**
   * Counters that are neither +1/+1 nor -1/-1 - Twitching Doll's nest
   * counters. One number rather than a map because one card needs one kind;
   * the day a second arrives this becomes `Record<string, number>`.
   */
  otherCounters: number;
  /** Loyalty on a planeswalker. Zero on everything else. */
  loyalty: number;
  /**
   * The creature this was cast to bestow onto, remembered from the cast until
   * the permanent arrives - the stack object is long gone by then.
   */
  bestowTarget?: string;
  /** Whether this planeswalker has already used a loyalty ability this turn. */
  loyaltyUsedThisTurn: boolean;
  /** Time counters, while this card sits suspended in exile. */
  timeCounters: number;
  /**
   * "While it's prepared, you may cast a copy of its spell." - Eccentric
   * Pestfinder.
   *
   * A flag rather than a counter, because that is what the card prints: it is
   * either prepared or it is not, and casting the copy clears it.
   */
  prepared: boolean;
  /**
   * True on a token that is a *copy* of a real card.
   *
   * Flagged on the instance and not the definition, because the definition it
   * copies is a printed card: marking that `isToken` would make every real one
   * cease to exist the moment it left the battlefield.
   */
  isTokenCopy: boolean;
  /**
   * True while this creature card is attached to another as a bestowed Aura.
   * It is not a creature while this holds - see `typesOf`.
   */
  bestowed: boolean;
  /**
   * A shield of damage yet to be prevented - "prevent the next N damage that
   * would be dealt to this creature this turn". Consumed by the next damage
   * that arrives, whatever the source, and cleared in the cleanup step along
   * with the rest of the until-end-of-turn state.
   *
   * Genuinely different from toughness, which is why it is not modelled as
   * one: a prevented point of damage never happens, so it feeds no lifelink,
   * marks no deathtouch, and counts towards no commander damage.
   */
  damagePrevention: number;
  /**
   * Regeneration shields waiting to be used - "the next time this creature
   * would be destroyed this turn, instead...".
   *
   * A count rather than a flag, because two regenerations really do save a
   * creature twice. Cleared in the cleanup step with the rest of the
   * until-end-of-turn state, and on any zone change like every other instance
   * field. See the `regenerate` effect in types.ts for what it does and does
   * not save a creature from.
   */
  regenerationShields: number;
  /**
   * Taken out of combat mid-combat, which today only regeneration does.
   *
   * A flag rather than deleting the creature out of `attackers`/`blockers`,
   * because those maps are the record of what was *declared* and combat leans
   * on that: an attacker stays blocked even after every blocker has left, and
   * assigns nothing to the defending player (rule 509.1h). Erasing the entry
   * would quietly turn a regenerated blocker into a free hit on its controller
   * in the second damage step. Cleared at end of combat.
   */
  removedFromCombat: boolean;
  isCommander: boolean;
  summoningSickness: boolean;
}

export type StackTarget =
  | { kind: "player"; playerId: string }
  | { kind: "card"; instanceId: string }
  /** A spell already on the stack, identified by its StackObject id rather than a card instance. */
  | { kind: "spell"; stackObjectId: string };

export interface StackObject {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  effect: Effect;
  targets: StackTarget[];
  /** True for permanent spells resolving onto the battlefield rather than triggered/instant/sorcery effects. */
  isPermanentSpell: boolean;
  /**
   * "This spell can't be countered" for *this* casting.
   *
   * Set from the card's own `cantBeCountered`, and also by the mana that paid
   * for it - Delighted Halfling's "that spell can't be countered". That second
   * source is why this lives on the stack object rather than being read off the
   * card at resolution: the same commander cast with ordinary mana is
   * counterable as normal, so it is a property of the cast, not of the card.
   */
  cantBeCountered?: boolean;
  /**
   * A "you may" trigger, copied off the ability when it went on the stack.
   *
   * Read at resolution rather than looked up again on the card, for the same
   * reason as `cantBeCountered`: by the time this resolves the permanent that
   * made it may be in a graveyard, and the trigger still resolves.
   */
  optional?: boolean;
  /**
   * The intervening-if, likewise copied. Rule 603.4 checks it a second time on
   * resolution, and a trigger whose condition has stopped being true simply
   * does nothing.
   */
  onlyIf?: TriggerCondition;
  /** What to put in the yes/no prompt for an `optional` trigger. */
  prompt?: string;
}

/**
 * A "you may" waiting on a yes or no.
 *
 * Modelled on `PendingSearch` rather than resolved by guessing, and gated in
 * the same places: while this is set nobody gets priority and no step advances,
 * because the game is genuinely part-way through resolving something.
 */
export interface PendingConfirmation {
  playerId: string;
  /** The card that asked, so the client can show it beside the question. */
  sourceInstanceId: string;
  /** The question in the card's own words - "You may gain 1 life". */
  prompt: string;
  /**
   * The trigger itself, already off the stack.
   *
   * Held whole rather than re-read from the card, because a "may" that is
   * answered later must do exactly what the object on the stack said - the
   * permanent that printed it may have died in the meantime, and abilities on
   * the stack are independent of their source.
   */
  object: StackObject;
  /**
   * A price the yes costs - Springheart Nantuko's {1}{G}. Absent on every
   * ordinary "you may", which is free to accept.
   */
  cost?: { mana?: ManaCost; life?: number };
  /**
   * What happens on a no. Absent on every ordinary "you may", where declining
   * simply means nothing happens - and present on Springheart Nantuko, where
   * "if you didn't" is half the card.
   */
  otherwise?: Effect;
}

/**
 * A player who has been told to discard and has not chosen which card yet.
 *
 * The first choice in this engine aimed at somebody other than the player
 * resolving the spell. Everything else that stops the game - a search, a "you
 * may", a trigger's target - belongs to whoever is resolving; this belongs to
 * their opponent, which is why it is a queue: "each opponent discards a card"
 * asks every one of them, one at a time, and in a pod that is three questions
 * before the spell finishes.
 *
 * `sourceInstanceId` is the spell that demanded it, so the client can show what
 * is doing this to you. There is nothing to decline - discarding is not
 * optional, and a player with an empty hand is simply never asked.
 */
/**
 * A resolving ability that has stopped to ask which of your creatures you are
 * giving up - Disciple of Freyalise's "you may sacrifice another creature".
 *
 * Distinct from `AdditionalCost`'s sacrifice, which is announced as the spell
 * is cast and never reaches this state. The difference shows in the two things
 * this carries and a cost does not: it can be declined, and the "if you do"
 * half is held here until the answer is known.
 *
 * A single slot rather than a queue, like `pendingSearch` and for the same
 * reason: it interrupts one resolution, and nothing can start another while the
 * game is holding priority for it.
 */
export interface PendingSacrifice {
  playerId: string;
  /** The permanent whose ability this is, so the client can show it beside the question. */
  sourceInstanceId: string;
  /** The creatures that may be given up, worked out by the engine. */
  candidateInstanceIds: string[];
  /** "You **may** sacrifice" - whether declining is allowed. */
  optional: boolean;
  prompt: string;
  /**
   * The "if you do" half, run only if a creature was actually sacrificed, with
   * `sacrificed-power` substituted for the creature's power at the moment it
   * was still on the battlefield.
   */
  then?: Effect;
  /** Whose ability it is, which is who the follow-up belongs to. */
  effectControllerId: string;
  /**
   * The rest of a `sequence` this choice interrupted, held for the same reason
   * `PendingSearch.followUp` is: anything printed after the sacrifice has to
   * wait until it is answered, or it happens in the wrong order.
   */
  followUp?: Effect[];
}

/**
 * A resolution stopped on "choose some cards", with an optional price.
 *
 * One state rather than the five this batch would otherwise have needed. Devour
 * picks any number of creatures, Braids offers an opponent one permanent,
 * Rishkar's Expertise picks a spell to cast for free, and Ripples of Undeath
 * picks one of three milled cards for {1} and 3 life - four questions with the
 * same shape and four different answers, which is exactly what `mode` is for.
 */
export interface PendingCardChoice {
  /** Who chooses. Not always the player resolving - see Braids. */
  playerId: string;
  sourceInstanceId: string;
  prompt: string;
  /** Every card that may be chosen, worked out by the engine. */
  candidateInstanceIds: string[];
  /** How many must be taken, and how many may be. `min: 0` means declinable. */
  min: number;
  max: number;
  /** What happens to the chosen cards. */
  mode: "sacrifice" | "cast-free" | "to-hand" | "to-library-top" | "to-battlefield";
  /** A price paid only if something is chosen - Ripples of Undeath. */
  cost?: { mana?: ManaCost; life?: number };
  /**
   * Run after the choice, whatever it was. Braids' punishment lives here, and
   * fires only when the opponent declined.
   */
  ifDeclined?: Effect;
  /** Whose ability this is, which is who a follow-up belongs to. */
  effectControllerId: string;
  /** The rest of a `sequence` this interrupted - see `PendingSearch.followUp`. */
  followUp?: Effect[];
  /**
   * Devour and Braids both count the chosen cards afterwards - one to place
   * counters, one to decide who was punished - so the source is carried rather
   * than looked up from a battlefield the sacrifice may have emptied.
   */
  multiplier?: number;
}

/**
 * "You may pay any amount of life" - Necrodominance, the one choice in the
 * game that is a number rather than a card or a yes.
 */
export interface PendingAmount {
  playerId: string;
  sourceInstanceId: string;
  prompt: string;
  /** The largest legal answer, so a client cannot offer a lethal one by accident. */
  max: number;
  /** What the chosen number feeds. */
  mode: "pay-life-draw";
}

export interface PendingDiscard {
  /** Whose hand it comes out of, and who chooses. Not the caster. */
  playerId: string;
  sourceInstanceId: string;
  /** How many more cards this player still owes. */
  remaining: number;
  prompt: string;
}

/**
 * A triggered ability waiting for its controller to point it at something.
 *
 * Targets for a trigger are chosen as it is put on the stack (rule 603.3d),
 * not as it resolves - which is why this parks the ability *before* it reaches
 * the stack rather than interrupting its resolution the way a search does. The
 * difference is visible: an opponent gets to respond knowing what Blood Artist
 * is aimed at.
 *
 * A queue rather than a single slot, because one event can set several of
 * these off at once - a board wipe with two Blood Artists out asks twice per
 * creature. They are answered from the front, and each goes on the stack as it
 * is answered. Ordering simultaneous triggers is the controller's choice under
 * the real rules and is not modelled; they go on in the order they fired.
 */
export interface PendingTargetChoice {
  playerId: string;
  /** The permanent whose ability this is, so the client can show it beside the question. */
  sourceInstanceId: string;
  /**
   * Every legal target, worked out by the engine from the effect's own
   * selector - so a client can only ever offer a legal answer, and
   * `chooseTriggerTarget` checks again rather than trusting what comes back.
   */
  candidates: StackTarget[];
  /** The question in the card's own words - "Blood Artist: choose a player". */
  prompt: string;
  /**
   * The ability itself, built and ready, needing only its `targets` filled in.
   *
   * Held whole for the same reason `PendingConfirmation` does: by the time it
   * is answered the permanent that printed it may be dead, and an ability on
   * the stack is independent of its source.
   */
  object: StackObject;
}

/**
 * A library search that has stopped to ask its controller which card to take.
 *
 * The candidate list is computed by the engine from the effect's restrictions,
 * so a client can only ever offer legal answers - and `resolveSearch` checks
 * again rather than trusting what comes back.
 */
export interface PendingSearch {
  playerId: string;
  /**
   * What is doing the searching. Only needed by `followUp`, which has to know
   * whose ability it is finishing - a "sacrifice it" left over after a search
   * would otherwise have no idea what "it" was.
   */
  sourceInstanceId: string;
  /** Card instances in that player's library that match the search restriction. */
  candidateInstanceIds: string[];
  destination: "hand" | "battlefield" | "library-top" | "graveyard" | "library-bottom";
  tapped?: boolean;
  /**
   * "Then shuffle" is on every tutor and on no surveil, so the shuffle is
   * skipped when this is set.
   *
   * Surveil rides on this state rather than getting one of its own because it
   * is the same interaction: the game stops, a player is shown cards from
   * their own library, and chooses where one of them goes. A parallel
   * mechanism would be a second place to remember to hold priority, a second
   * picker in the client, and - the reason that matters most - a second way to
   * get hidden information wrong. The card is identified here by instance id,
   * so an opponent's view of it is already the hidden-card placeholder.
   */
  noShuffle?: boolean;
  /**
   * Whose ability set this search off, which is not always the searcher.
   *
   * Assassin's Trophy is cast by one player and searched by another, and the
   * follow-up belongs to the caster. Without this the "then shuffle" half of
   * the card would be attributed to whoever happened to be answering.
   */
  effectControllerId: string;
  /** Printed wording of what's being searched for, for the picker's heading. */
  prompt: string;
  /**
   * The rest of a `sequence` that this search interrupted.
   *
   * A search is the one effect that stops the game mid-resolution, so anything
   * written after it on the card has to wait. Riveteers Overlook's "and you
   * gain 1 life" is on the far side of a shuffle; without this it would happen
   * first, which is both the wrong order and visible to the player.
   */
  followUp?: Effect[];
  /**
   * Targets to hand the follow-up, when it is not the ones this search had.
   *
   * Scheming Symmetry asks two players to search, one after the other, and the
   * second question has to be aimed at the player who has not answered yet.
   */
  followUpTargets?: StackTarget[];
}

/**
 * The top N cards of a library, shown to one player, waiting on the order they
 * go back on top - Halimar Depths and Ponder.
 *
 * Like `PendingSearch` this stops resolution: while it is set nobody gets
 * priority and no step advances, because the game is mid-spell showing a player
 * hidden information. The cards never leave the library, so putting them back is
 * a reorder, not a zone change - no triggers, no counters cleared. Identified by
 * instance id, so an opponent's view of them is already the hidden-card
 * placeholder. Cleared by `resolveArrange`.
 */
export interface PendingArrange {
  playerId: string;
  sourceInstanceId: string;
  /** The top cards, in their current top-to-bottom order. */
  cardInstanceIds: string[];
  /** Ponder's "You may shuffle your library" - offered only when set. */
  mayShuffle: boolean;
  /** Printed wording, for the picker's heading. */
  prompt: string;
  /** The rest of a `sequence` this interrupted - Ponder's "Then draw a card". */
  followUp?: Effect[];
}

/**
 * Whose opening hand is being decided, and how far into it they are.
 *
 * Players are taken one at a time. The real rule has everyone decide together
 * each round and put cards back afterwards, which matters in a pod where you
 * might read the table before committing; in a two-player game it deals
 * identical hands and is far easier to put on one screen. See mulligan.ts.
 */
export interface MulliganState {
  /** Whose decision it is right now. */
  playerId: string;
  /** Every player, in the order they are asked. */
  order: string[];
  /** How many times this player has shuffled back so far - also how many cards they will owe. */
  mulligansTaken: number;
  /** True once they have kept and are choosing which cards go to the bottom. */
  bottoming: boolean;
}

/**
 * One thing that happened, and when.
 *
 * The turn number is here rather than being inferred from marker lines because
 * the interface only ever wants to show the last few turns - working that out
 * by scanning for "Turn 4" headers would mean the log's format and its
 * filtering were the same thing, and changing the wording would silently
 * change what is shown.
 */
export interface LogEntry {
  turn: number;
  text: string;
}

export type ManaPool = Partial<Record<Color, number>> & { generic?: number };

/** One lump of mana in the pool that carries a condition on what it may pay for. */
export interface RestrictedMana {
  color: ManaColor;
  amount: number;
  restriction: ManaSpendRestriction;
}

export interface Player {
  id: string;
  life: number;
  /** Cumulative combat damage taken from each specific commander instance, keyed by that commander's instanceId. */
  commanderDamageTaken: Record<string, number>;
  library: CardInstance[];
  hand: CardInstance[];
  battlefield: CardInstance[];
  graveyard: CardInstance[];
  exile: CardInstance[];
  command: CardInstance[];
  manaPool: ManaPool;
  /**
   * Mana that may only be spent on certain spells - see `ManaSpendRestriction`.
   *
   * Deliberately beside the pool rather than inside it. `ManaPool` is a count
   * per colour and every affordability check in the engine reads it as
   * interchangeable; a restricted mana added there would be spent on the first
   * thing that fitted, which is the one thing the card says it cannot do.
   * Emptied with the pool at end of turn.
   */
  restrictedMana: RestrictedMana[];
  /**
   * Marks on mana sitting in the ordinary pool - see `ManaMark`. Emptied with
   * the pool, because a mark cannot outlive the mana it is on.
   */
  manaMarks: ManaMark[];
  /** How many times each of this player's commanders has been cast from the command zone this game (for commander tax). */
  commanderCastCount: Record<string, number>;
  hasLost: boolean;
  lossReason?: string;
  /** The player's own shield - see `damagePrevention` on CardInstance. */
  damagePrevention: number;
  /** Set when this player tried to draw from an empty library; checked as a state-based action. */
  attemptedDrawFromEmptyLibrary: boolean;
  landsPlayedThisTurn: number;
  /**
   * Poison counters. Ten of them loses the game, checked as a state-based
   * action beside the life total.
   */
  poisonCounters: number;
  /**
   * Life gained this turn - Moseo's infusion, and Eccentric Pestfinder's. A
   * tally rather than a comparison against a remembered total, because life
   * lost in between must not cancel it: gaining 4 and losing 4 still counts as
   * having gained life this turn.
   */
  lifeGainedThisTurn: number;
  /**
   * +1/+1 counters this player has put on creatures they control this turn -
   * Iridescent Hornbeetle's "for each +1/+1 counter you've put on creatures
   * under your control this turn".
   *
   * A tally rather than a board reading, and the difference is the card: the
   * creatures counted may be dead by the end step, and it still pays for them.
   * Reset in the cleanup step with the rest of the turn's state.
   */
  plusOneCountersPlacedThisTurn: number;
}

export type Phase = "beginning" | "precombat-main" | "combat" | "postcombat-main" | "ending";

export type Step =
  | "untap"
  | "upkeep"
  | "draw"
  | "main"
  | "begin-combat"
  | "declare-attackers"
  | "declare-blockers"
  /**
   * Only happens at all when something in combat has First Strike or Double
   * Strike (real rule 510.4) - otherwise the turn skips straight past it, which
   * is why it can be added without changing any existing combat.
   */
  | "first-strike-damage"
  | "combat-damage"
  | "end-combat"
  | "end"
  | "cleanup";

export interface GameState {
  /** Turn order. Deliberately a list, not a fixed pair - keeps the core engine N-player-agnostic per CLAUDE.md, even though Phase 1-4 only exercise N=2. */
  players: Player[];
  /** Card instances currently on the stack as spells (as opposed to abilities, which reference a source elsewhere). */
  stackCards: CardInstance[];
  activePlayerIndex: number;
  priorityPlayerIndex: number;
  turnNumber: number;
  phase: Phase;
  step: Step;
  stack: StackObject[];
  /** How many players in a row have passed priority without a new action. Resets on any action; hitting players.length means the stack resolves or the step advances. */
  passesInSuccession: number;
  /** attacker instanceId -> defending player id */
  attackers: Record<string, string>;
  /** blocker instanceId -> attacker instanceId */
  blockers: Record<string, string>;
  /**
   * Whether the defending player has finished declaring blocks this combat.
   *
   * An empty `blockers` map is ambiguous - it means both "hasn't decided yet"
   * and "decided to block with nothing" - and the difference matters, because
   * declaring blockers is a turn-based action at the *start* of the
   * declare-blockers step (rule 509.1) and priority only happens afterwards.
   * Without this flag the attacker was handed priority the instant the step
   * began, before any blocks existed, so auto-pass spent their one window to
   * respond to blocks they hadn't seen yet. Reset at end of combat.
   */
  blockersDeclared: boolean;
  /**
   * A library search waiting on the searching player to name a card.
   *
   * Unlike a mode, a search genuinely happens *during* resolution, so the
   * engine has to stop and ask. While this is set nobody receives priority
   * and no step advances - the game is mid-spell. Cleared by `resolveSearch`.
   */
  pendingSearch: PendingSearch | null;
  /**
   * Extra turns queued to happen before the turn order rotates on - Time
   * Stretch. Each entry is the id of the player who takes that turn, drained
   * front-first in `startNextTurn`.
   */
  extraTurns: string[];
  /**
   * The top N cards of a library shown to a player, waiting on the order they
   * go back. Gated exactly like `pendingSearch`: no priority, no step advance.
   * Cleared by `resolveArrange`. See `PendingArrange`.
   */
  pendingArrange: PendingArrange | null;
  /**
   * A "you may" trigger waiting on a yes or no. Gated exactly like
   * `pendingSearch`: no priority, no step advance. Cleared by
   * `resolveConfirmation`.
   */
  pendingConfirmation: PendingConfirmation | null;
  /**
   * Triggered abilities waiting to be pointed at something, front first. Gated
   * exactly like `pendingSearch`: while this is non-empty nobody gets priority
   * and no step advances. See `PendingTargetChoice`.
   */
  pendingTargetChoices: PendingTargetChoice[];
  /**
   * Opponents who owe a discard, front first. Gated exactly like the others:
   * while this is non-empty nobody gets priority and no step advances.
   */
  pendingDiscards: PendingDiscard[];
  /**
   * A resolution waiting on "which creature do you sacrifice?". Gates priority
   * and step advance exactly like `pendingSearch`. See `PendingSacrifice`.
   */
  pendingSacrifice: PendingSacrifice | null;
  /**
   * Cards waiting to be chosen. A queue because Braids asks every opponent in
   * turn. Gates priority exactly like the rest.
   */
  pendingCardChoices: PendingCardChoice[];
  /** A number waiting to be named - Necrodominance. */
  pendingAmount: PendingAmount | null;
  /**
   * How many creatures have died this turn, for morbid ("if a creature died
   * this turn"). Reset in cleanup with everything else that lasts a turn.
   *
   * A count rather than a flag because it costs nothing and the next card of
   * this family that wants "if two or more creatures died" would otherwise
   * need the whole thing rewritten.
   */
  creatureDeathsThisTurn: number;
  /**
   * A fog in force for the rest of this turn - Arachnogenesis. Null when there
   * is none, which is almost always. Cleared in the cleanup step.
   */
  combatDamagePrevention: { exceptSubtype?: string } | null;
  /**
   * Opening hands still being decided. Null for the whole of a normal game -
   * it is only ever set between dealing and the first untap step, and clearing
   * it leaves the state exactly as if every player had simply been dealt a
   * hand, so nothing downstream has to know this happened.
   *
   * Games created without mulligans (every headless test, bot-vs-bot runs)
   * never set it at all.
   */
  mulligan: MulliganState | null;
  cardDefinitions: Record<string, CardDefinition>;
  nextInstanceId: number;
  nextStackObjectId: number;
  log: LogEntry[];
}
