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

/**
 * What a permanent can have protection *from*.
 *
 * A colour, or colourless - Giver of Runes prints "protection from colorless or
 * from the color of your choice", and colourless is a real answer rather than a
 * sixth colour: it is what stops an artifact creature or an Eldrazi, neither of
 * which any colour choice would touch.
 *
 * Not `ManaColor`, though the members happen to line up. That type is about mana
 * being produced and spent; this is about what a source *is*, and the two would
 * drift the moment either grew - a mana type for snow or a protection from
 * multicolour would belong to one and be nonsense in the other.
 */
export type ProtectionQuality = Color | "colorless";

export type CardType =
  | "Land"
  | "Creature"
  | "Artifact"
  | "Enchantment"
  | "Planeswalker"
  | "Instant"
  | "Sorcery"
  | "Battle";

/**
 * A continuous effect that forbids an action outright - the hate pieces.
 *
 * Every other continuous effect here *changes* something. These decide whether
 * an action may be taken at all, so they are asked at the moment somebody tries
 * to cast, activate or draw rather than folded into a characteristic. See
 * restrictions.ts.
 *
 * A closed list of printed phrases, in the same spirit as `BoardCondition`: a
 * general predicate language would be quicker to write and impossible to check
 * back against a card.
 */
/**
 * "As this permanent enters, choose ..." - Cavern of Souls' creature type,
 * Sanctum Prelate's number, Greymond's two abilities, Windcrag Siege's mode,
 * Multiversal Passage's basic land type.
 *
 * The decision is made once, as the permanent arrives, and every other line on
 * the card reads it back for the rest of the game. Nothing else in this engine
 * records a decision *on a permanent* - modal spells choose as they are cast
 * and throw the wrapper away before anything downstream sees it, which is the
 * opposite shape.
 *
 * The five entries are the five phrases the pool needs, not a general
 * "remember an arbitrary value" facility.
 */
export type EnterChoice =
  /** "choose a creature type" - Cavern of Souls, Cover of Darkness. */
  | { kind: "creature-type" }
  /**
   * "choose a number" - Sanctum Prelate. `max` only bounds what a client should
   * offer; the rules put no ceiling on it.
   */
  | { kind: "number"; max: number }
  /** "choose a basic land type" - Multiversal Passage. */
  | { kind: "basic-land-type" }
  /** "choose two abilities from among first strike, vigilance, and lifelink" - Greymond. */
  | { kind: "keywords"; from: Keyword[]; count: number }
  /** "choose Mardu or Jeskai" - Windcrag Siege. */
  | { kind: "mode"; options: string[] }
  /** "choose a card name" - Disruptor Flute. */
  | { kind: "card-name" };

/**
 * What was chosen, once it has been. Every field optional because one card only
 * ever asks one question - a single union member would be tidier and would make
 * every reader unwrap a discriminant to get at a string.
 */
export interface ChosenOnEntry {
  creatureType?: string;
  number?: number;
  basicLandType?: string;
  keywords?: Keyword[];
  mode?: string;
  /** The named card - Disruptor Flute. */
  cardName?: string;
}

/**
 * The permanent that has just arrived and is waiting for its controller to
 * choose. The game stops here exactly as it does for a search.
 */
export interface PendingEnterChoice {
  instanceId: string;
  /** Its controller - the choice is never anybody else's. */
  playerId: string;
  choice: EnterChoice;
  /** The printed wording, for the client's prompt. */
  prompt: string;
}

export type ActionRestriction =
  /**
   * "Each player can't cast more than one spell each turn" - Archon of Emeria,
   * High Noon. `only` narrows which spells count *and* which are stopped:
   * Deafening Silence's noncreature, Ethersworn Canonist's nonartifact.
   *
   * Symmetrical, and it binds the controller too - Archon of Emeria is a real
   * cost to its own deck, and a version that exempted its controller would be a
   * different and much stronger card.
   */
  | { kind: "cast-limit"; perTurn: number; only?: "noncreature" | "nonartifact" }
  /**
   * "Your opponents can't cast spells" - Silence for the rest of the turn,
   * Grand Abolisher only while it is your turn.
   */
  | { kind: "opponents-cannot-cast"; only?: "noncreature"; duringYourTurnOnly?: boolean }
  /**
   * "Your opponents can't cast spells from anywhere other than their hands" -
   * Drannith Magistrate, which in this format mostly means the command zone.
   */
  | { kind: "opponents-cast-from-hand-only" }
  /**
   * "Activated abilities of artifacts, creatures, and planeswalkers can't be
   * activated" - Clarion Conqueror (`each-player`) and Grand Abolisher
   * (`opponents`, and only during your turn).
   *
   * Mana abilities are activated abilities and are stopped too. That is the
   * rule and it is most of what these cards do.
   */
  | { kind: "cannot-activate"; types: CardType[]; who: "each-player" | "opponents"; duringYourTurnOnly?: boolean }
  /** "Each player can't draw more than one card each turn" - Spirit of the Labyrinth. */
  | { kind: "draw-limit"; perTurn: number }
  /**
   * "Noncreature spells with mana value equal to the chosen number can't be
   * cast" - Sanctum Prelate.
   *
   * The only restriction that reads something off its own permanent rather than
   * off the card, which is why `activeRestrictions` carries the instance's
   * `chosenOnEntry` alongside each entry. A Prelate whose number was never
   * chosen restricts nothing, rather than defaulting to zero and switching off
   * every land-cycler in the format.
   */
  | { kind: "cannot-cast-chosen-mana-value"; only?: "noncreature" }
  /** "Target player can't cast spells this turn." - Orim's Chant. Bound to the target at resolution. */
  | { kind: "player-cannot-cast" }
  /** "Creatures can't attack this turn." - Orim's Chant, kicked. */
  | { kind: "creatures-cannot-attack" };

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
  | "Unblockable"
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

/**
 * "This creature **can't be blocked except by** creatures with flying or reach."
 *
 * A restriction on who may block one attacker, which is a different thing from
 * evasion written as a keyword: Menace restricts *how many* blockers and
 * protection restricts *which* by colour, while this names the ability a blocker
 * has to have. Signal Pest prints it and Gingerbrute grants it to itself for a
 * turn.
 *
 * Flying is the same rule - "can't be blocked except by creatures with flying or
 * reach" is its reminder text almost word for word - so `blockRestrictionsOn`
 * derives one of these from the keyword rather than checking flying separately.
 * That is the whole reason this is a shape rather than two booleans.
 *
 * A closed list of one member, like every other list in this DSL. Skrelv's
 * "can't be blocked by creatures of that color" is the second shape and is not
 * built: see the roadmap.
 */
export type BlockRestriction =
  | {
      kind: "only-with-keyword";
      /**
       * Any one of these will do. Two of them for flying ("flying **or** reach"),
       * one for Gingerbrute's haste.
       */
      keywords: Keyword[];
    }
  /**
   * "It **can't be blocked by creatures of that color** this turn." - Skrelv,
   * whose colour is named as the ability resolves.
   *
   * The second shape, and it is the opposite of the first: that one names an
   * ability a blocker must *have*, this names a quality that disqualifies it.
   * Neither can be written as the other, which is why this is a union rather
   * than a longer first member.
   */
  | { kind: "not-color"; color: Color }
  /**
   * "Your Ring-bearer ... **can't be blocked by creatures with greater
   * power**." - the first level of The Ring.
   *
   * The third shape, and a third kind of test: the first names an ability a
   * blocker must have, the second a colour that disqualifies it, and this
   * compares the two creatures against each other. None of the three can be
   * written as either of the others.
   */
  | { kind: "not-greater-power" };

/** Generic mana + colored pips. A card with no mana cost (most lands) omits this entirely. */
/**
 * "{W/P}" - a Phyrexian symbol, payable with its colour **or with 2 life**.
 *
 * The same shape as `hybrid` beside it - one entry per printed symbol - and the
 * difference is what the other half is: another colour there, a fixed price in
 * life here. Which is why it cannot simply be folded into `hybrid`, whose halves
 * all come out of the mana pool.
 *
 * The engine pays the colour whenever the pool holds it and the life otherwise.
 * That is a shortcut over a real choice, and it is the same one `unlessPays`
 * takes: a player who has the mana almost always spends it, and the case where
 * they would rather not is exactly the case where the pool is empty.
 */
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
   * Phyrexian pips - "{U/P}" is one entry, `"U"`, payable with that colour or 2
   * life. Modelled as always paid with life (how Gitaxian Probe is played); a
   * client could offer the mana instead. Counts 1 towards mana value.
   */
  phyrexian?: Color[];
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
  /** "for each burden counter on The One Ring" - the source permanent's other-counter count. */
  | { kind: "source-other-counters" }
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
  | {
      kind: "count";
      of: Countable;
      /**
       * "+10/+10 **for each** player who has lost the game" - Rampant Frogantua.
       * The per-thing multiplier, so the count of things is scaled by it. One
       * when omitted, which is every "for each ..." that adds a flat one apiece.
       */
      times?: number;
    }
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
  | { kind: "sacrificed-power" }
  /**
   * "Its controller gains life equal to **its power**" - Swords to Plowshares.
   *
   * The power of the creature this effect's spell is pointed at, read when the
   * effect runs. Distinct from `sacrificed-power` above, which is captured
   * early because the creature is already gone; here it is still on the
   * battlefield, so the board is the honest place to read it - counters,
   * anthems and all.
   */
  | { kind: "target-power" }
  /**
   * "You gain life equal to **its toughness**" - Noxious Gearhulk, whose ETB
   * destroys a creature and pays out its toughness. The twin of `target-power`,
   * reading the first card target's effective toughness at resolution.
   */
  | { kind: "target-toughness" }
  /**
   * "**Eomer deals damage equal to its power** to any target."
   *
   * The power of the permanent the ability is printed on, read when the effect
   * runs - so a pumped Eomer really does deal more. Distinct from `target-power`
   * above, which reads the thing being pointed at rather than the thing doing the
   * pointing.
   */
  | { kind: "source-power" }
  /** "You gain life equal to **that card's mana value**" - Healing Technique. The first card target's mana value. */
  | { kind: "target-mana-value" };

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
  | {
      what: "creatures";
      withCounter?: boolean;
      excludeSubtype?: string;
      /** "for each **Human** you control" - Eomer. */
      subtype?: string;
      /** "for each **other** Human you control" - the source is not one of them. */
      excludeSource?: boolean;
    }
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
  /** "where X is the number of land cards in your graveyard" - Cavalier of Flame. */
  | { what: "land-cards-in-your-graveyard" }
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
  | { what: "opponents" }
  /**
   * "where X is **one plus** the number of instant and sorcery spells you've
   * cast this turn" - Rionya, Fire Dancer.
   *
   * The whole phrase is one entry, including the "one plus", because that is
   * what the card prints and this list is a list of printed phrases. An
   * arithmetic `Amount` that could add one to another amount would be a small
   * expression language, which is exactly what every closed list here exists to
   * avoid.
   *
   * Read off `spellTypesCastThisTurn`, the list of type lines the casting layer
   * already appends to for the hate pieces. No new tally, and so no second place
   * for the answer to go stale.
   */
  | { what: "one-plus-instants-and-sorceries-cast-this-turn" }
  /**
   * "for each card named Rite of Flame in **each** graveyard" - Rite of Flame,
   * the only card in the pool that counts copies of itself.
   *
   * Every graveyard, not just yours, and by *name* rather than by definition id
   * - which are the same thing here and would stop being so the day a token
   * copies a card. The spell itself is still on the stack while this is counted,
   * so it never counts itself.
   */
  | { what: "cards-named-this-in-all-graveyards" }
  /**
   * "+1/+0 until end of turn **for each other attacking Goblin**" - Goblin
   * Rabblemaster.
   *
   * Read off `state.attackers` rather than off a flag on the creature, exactly
   * as the attacking target selector and `pumpAll`'s attacking restriction both
   * do, so a creature removed from combat stops counting mid-combat. Distinct
   * from `creatures` above, which counts the board: Rabblemaster's own tokens
   * sitting at home are not part of its number.
   */
  | { what: "attacking-creatures"; subtype?: string; excludeSource?: boolean }
  /** "for each player who has lost the game" - Rampant Frogantua. Counts every player, not just opponents. */
  | { what: "players-who-have-lost" };

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
  | {
      kind: "creature";
      subtypes?: string[];
      /** "target **non-Elf** creature" - Eyeblight's Ending. Any listed subtype disqualifies. */
      excludeSubtypes?: string[];
      /**
       * "target creature **you control**" - Kiki-Jiki and Rionya; also
       * "**you don't control**" - Infectious Bite names one of each. Omitted
       * means any creature, which is what every other card using the selector says.
       */
      controlledBy?: "you" | "opponent";
      /**
       * "target **nonlegendary** creature you control" - Kiki-Jiki, which may
       * not copy itself or any other legend.
       *
       * The legend rule would put a second Kiki-Jiki in the graveyard
       * immediately, so a card that ignored this would read as a copy effect
       * that sometimes silently does nothing.
       */
      nonlegendary?: boolean;
      /**
       * "**another** target creature you control" - Rionya, which copies
       * something else and never itself.
       *
       * Needs the source to mean anything, so `isValidTarget` throws rather
       * than quietly allowing the source when it is not given one. A selector
       * that silently stopped excluding would let Rionya make X copies of
       * Rionya, which is a combo the card does not have.
       */
      excludeSource?: boolean;
      /** "target creature that was **dealt damage this turn**" - You Are Already Dead. */
      damagedThisTurn?: boolean;
      /** Cap the target's mana value by the mana value of a card in the controller's graveyard - Drown in the Loch. */
      maxMvFromControllerGraveyard?: boolean;
    }
  | { kind: "player"; count?: TargetCount }
  | { kind: "opponent-of-controller" }
  /**
   * "Target spell" - a spell on the stack, as opposed to a triggered or
   * activated ability. `spellType`/`notSpellType` narrow it to a card type, which
   * is how "target instant spell" (Dispel) and "target noncreature spell" are told
   * apart from a plain "target spell".
   */
  | {
      kind: "spell";
      /**
       * "target spell **or ability**" - Deflecting Swat.
       *
       * Both live on the stack and a `StackTarget` of kind "spell" already means
       * "a thing on the stack", so this only relaxes which of them qualify.
       * Left off - every counterspell in the pool - it means spells only, which
       * is what "counter target spell" says and why a counterspell cannot be
       * pointed at a trigger.
       */
      includeAbilities?: boolean;
      /**
       * "Counter target **blue** spell" - Red Elemental Blast.
       *
       * A restriction on what may be *pointed at*, which is the whole difference
       * between this card and Pyroblast beside it: Pyroblast may target any spell
       * and simply does nothing to a red one. Written the other way round, Red
       * Elemental Blast would be castable with no blue spell on the stack.
       */
      color?: Color;
      /** "target **instant** spell" (Dispel), "target **noncreature** spell". */
      spellType?: CardType;
      notSpellType?: CardType;
      /** "Counter target **multicolored** spell" - Null Elemental Blast. Two or more colours. */
      multicolored?: boolean;
      /** Cap the spell's mana value by a card in the controller's graveyard - Drown in the Loch. */
      maxMvFromControllerGraveyard?: boolean;
    }
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
       * "target permanent **an opponent controls**" (Assassin's Trophy), or
       * "target creature or enchantment **you control**" (Alseid of Life's
       * Bounty).
       *
       * A real restriction and not decoration, in both directions: without the
       * first, Assassin's Trophy can blow up your own land, and without the
       * second Alseid can hand protection to an opponent's creature. Left off,
       * the selector means any permanent on the table.
       */
      controlledBy?: "you" | "opponent";
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
      /**
       * "one or two target **attacking** creatures" - Raph & Leo.
       *
       * A real narrowing and not a convenience: the card is an untap effect
       * that would otherwise be pointable at any creature on the table, which
       * is a materially better card than the one printed. Read off
       * `state.attackers` every time it is asked, so a creature removed from
       * combat stops being a legal target.
       */
      attacking?: boolean;
      /**
       * "target **attacking or blocking** creature" - Eiganjo, Seat of the
       * Empire.
       *
       * Wider than `attacking` by exactly one word, and it is the word that makes
       * the card a defensive answer as well as an offensive one: Eiganjo kills the
       * creature that blocked your attacker, on your own turn.
       *
       * Read off `state.attackers` and `state.blockers` every time, so a creature
       * removed from combat stops being a legal target.
       */
      attackingOrBlocking?: boolean;
      /** "Destroy target **blue** permanent" - Red Elemental Blast. */
      color?: Color;
      /**
       * "Destroy target **colorless nonland** permanent." - Goblin Cratermaker,
       * whose second mode is the artifact answer this deck otherwise lacks.
       *
       * Colour, not colour identity: a Sol Ring is colourless and a Forest is
       * too, which is exactly why the card says nonland as well. Both halves are
       * needed and neither implies the other.
       */
      colorless?: boolean;
      nonland?: boolean;
      /** "another target permanent" / "other target nonland permanent" - Flickerwisp, Phelia. */
      excludeSource?: boolean;
      /** "target nonland permanent ... **with mana value 2 or less**" - Portable Hole. */
      maxManaValue?: number;
      /** "target creature an opponent controls **with mana value 3 or greater**" - Elspeth, Storm Slayer. */
      minManaValue?: number;
      /** "Destroy target **multicolored** permanent" - Null Elemental Blast. Two or more colours. */
      multicolored?: boolean;
      /**
       * "target attacking creature **with lesser power**" - mentor, on Legion
       * Warboss.
       *
       * Lesser than the *source's* power, read at the moment the target is
       * checked, which is what makes mentor a rich-get-richer ability rather
       * than a free counter: a Warboss that has already grown can point at
       * things it could not before, and one that has shrunk cannot.
       *
       * Needs the source to mean anything, like `creature.excludeSource`, and
       * excludes the source for free - nothing has lesser power than itself.
       */
      lesserPowerThanSource?: boolean;
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
      /** "target creature **or land** card" - Pulse of Murasa. Any one of these types qualifies. */
      cardTypes?: CardType[];
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
  | {
      kind: "damage";
      amount: number;
      /**
       * Where the number comes from when it is not the one printed beside it.
       *
       * `"source-power"` is Eomer; `"x"` is Shatterskull Smashing, whose whole
       * amount is the X announced as it was cast. A rider rather than widening
       * `amount` to an `Amount`, because every other reader of this effect - the
       * bot's removal evaluation most of all - wants a number it can compare,
       * and a bot that could not tell how much damage a burn spell deals would
       * stop pointing them at anything. With a rider set the printed `amount` is
       * a floor of 0 and the real figure is settled elsewhere.
       */
      /**
       * Where the number comes from when it is not the one printed beside it.
       *
       * `"source-power"` is Eomer, `"x"` is Shatterskull Smashing, and a counted
       * amount is Ajani's "damage equal to the number of creatures you control".
       * One field because it is one question, and `amount` stays a plain number
       * so the bot's removal evaluation still has a figure it can compare - with
       * a rider set, the printed number is a floor of 0.
       */
      amountFrom?: "source-power" | "x" | { kind: "count"; of: Countable };
      target: TargetSelector;
      /**
       * "deals 1 damage to **that player**" - Spiteful Visions. The damaged
       * player is the event's payload (the one who drew), attached to the
       * trigger by `pushTrigger`; with this set the effect selects nothing of
       * its own (`targetSelectorOf` returns undefined) and `target` is an inert
       * placeholder the type still requires.
       */
      toEventPlayer?: boolean;
      /**
       * "X damage **divided as you choose** among up to two target creatures
       * and/or planeswalkers." - Shatterskull Smashing.
       *
       * The split is announced as the spell is cast, not worked out as it
       * resolves - see `CastOptions.damageSplit`. With one target there is
       * nothing to divide and the whole amount lands on it, which is why this is
       * a flag on the effect rather than a required list.
       */
      dividedAmongTargets?: boolean;
      /**
       * "**If X is 6 or more**, it deals twice X damage divided as you choose
       * among them instead." - the kicker half of the same sentence.
       *
       * A threshold and a multiplier rather than a second effect, because it is
       * one sentence and one division: the targets and the split are announced
       * once and only the total changes.
       */
      doubleWhenAmountAtLeast?: number;
      /**
       * How much each target takes, in the order they were named.
       *
       * Written by `castSpell` from the announced split and never by a fixture -
       * the same posture X takes, so that by the time anything downstream sees
       * this effect the division is settled and nothing has to know it was ever
       * a choice.
       */
      splitAmounts?: number[];
    }
  /**
   * "Draw a card", and the ones that draw a number nobody knows until they
   * resolve - "draw cards equal to the greatest power among non-Human
   * creatures you control".
   */
  /**
   * `who: "each-player"` is the symmetric draw a chaos deck runs on - Winter's
   * "each player draws two cards", Howling Mine, Scrawling Crawler. Every player
   * draws the same amount, in turn order starting from the controller.
   */
  | { kind: "draw"; amount: Amount; who?: "target" | "each-player" | "active-player" | "an-opponent" }
  /**
   * "... at the beginning of the next turn's upkeep" - Arcane Denial, Mishra's
   * Bauble. Queues `effect` to run then, for the controller or for each
   * opponent (Arcane Denial's "its controller may draw", which in a two-player
   * game is the one opponent).
   */
  | { kind: "atNextUpkeep"; who: "controller" | "each-opponent"; effect: Effect }
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
      /**
       * Who gains it.
       *
       * `"controller"` is the effect's own controller - "you gain 1 life"
       * beside a target the rest of the card is aimed at. `"target-controller"`
       * is Swords to Plowshares: the life goes to the player whose creature was
       * just exiled, which is what makes the card a fair trade rather than a
       * strict one. Absent means the targeted *player* gains it.
       */
      who?: "controller" | "target-controller";
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
      /** "It gains hexproof until end of turn." - The Duke: a keyword granted to the counter's target. */
      grantKeyword?: Keyword;
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
  /** "Return two target creatures to their owners' hands" - Step Through. Bounces each targeted permanent. */
  | { kind: "returnToHand"; target: TargetSelector }
  /** "you win the game" - Revel in Riches. Every opponent loses. */
  | { kind: "winGame" }
  /** "Look at target player's hand" - Gitaxian Probe. Information only; no game state changes. */
  | { kind: "lookAtHand"; target: TargetSelector }
  /** "This creature becomes a copy of another target creature you control" - Silent Hallcreeper. */
  | { kind: "becomeCopy"; target: TargetSelector }
  /** "Remove up to N counters from target permanent" - Glissa Sunslayer. Takes +1/+1 counters first, then others. */
  | { kind: "removeCounter"; amount: number; target: TargetSelector }
  /**
   * "Counter all spells your opponents control and all abilities your opponents
   * control" - Glen Elendra's Answer. `tokenPerCountered` makes one token for
   * each object actually countered.
   */
  | { kind: "counterAll"; tokenPerCountered?: string }
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
      /** "Destroy all **non-Zombie** creatures" - Liliana, Death's Majesty. Spares creatures of this subtype. */
      excludeSubtype?: string;
      thenDraw?: boolean;
      /** "You gain 1 life for each creature destroyed this way" - Fumigate. */
      thenGainLife?: boolean;
      /**
       * "Add {B} or {G} for each permanent destroyed this way" - Culling Ritual.
       * One mana per permanent destroyed, spread as evenly as possible across
       * these colours. A simplification: the printed card lets the player choose
       * each pip's colour.
       */
      manaPerDestroyed?: Color[];
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
  | { kind: "scry"; amount: number }
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
   * "Untap one or two target attacking creatures" - Raph & Leo. With no target
   * it means the permanent the ability is printed on, which is the form Mana
   * Vault's upkeep payment takes and the same convention `pump` and
   * `addCounter` already follow.
   */
  /**
   * "**They may tap that permanent.**" - Charismatic Conqueror.
   *
   * The mirror of `untap` below, and it arrived much later because until this
   * card nothing in the pool ever tapped a permanent as an *effect* - tapping
   * had only ever been a cost. Goes through `tapPermanent`, so an opponent's
   * City of Brass tapped this way still hurts them.
   */
  | { kind: "tap"; target?: TargetSelector }
  | { kind: "untap"; target?: TargetSelector }
  /**
   * "Untap all other creatures you control" - Combat Celebrant.
   *
   * Its own effect rather than `untap` with a scope, for the reason
   * `regenerateAll` is: the targeted form checks hexproof and can fizzle, and
   * this one sweeps the controller's own board where neither applies.
   */
  | { kind: "untapAll"; excludeSource?: boolean }
  /**
   * "You may **exert** it as it attacks" - Combat Celebrant. An exerted
   * permanent does not untap during its controller's next untap step.
   *
   * An effect rather than a flag on the trigger, because that is what the card
   * says: the exert is the price of an optional ability, and writing it as the
   * first step of the sequence the ability resolves into keeps the "when you
   * do" reading intact without a second mechanism.
   */
  | { kind: "exertSelf" }
  /**
   * "After this phase, there is an additional combat phase." - Combat
   * Celebrant and Raph & Leo.
   *
   * Carries no "and an additional main phase after it", because neither card
   * in this pool grants one. The two are separate clauses on the cards that
   * print both, and inventing the second here would hand these two a phase
   * they do not give you.
   */
  | { kind: "additionalCombatPhase" }
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
  | {
      kind: "createToken";
      count: Amount;
      tokenDefinitionId: string;
      /**
       * "For each opponent, create a token..." - one token per opponent, as
       * opposed to `attacking: "each-opponent"` which also aims each at its own
       * player. Used by Dan's Felix cards for the plain per-opponent count.
       */
      forController?: "each-opponent";
      /**
       * "...that's tapped and attacking" - Ainok Strike Leader, Anim Pakal,
       * Myrel, and every other attack trigger that adds to the combat it fired
       * in.
       *
       * A token put onto the battlefield attacking was never *declared* as an
       * attacker (rule 508.3b), so nothing that watches for a creature
       * attacking sees it. That is the rule and it is also load-bearing here:
       * without it Myrel's own trigger would see the Soldiers it just made and
       * make more, forever.
       */
      /**
       * `"each-opponent"` is Ainok Strike Leader's "for each opponent, create a
       * ... token that's tapped and attacking **that player**".
       *
       * Not the same as `true` with a count of one per opponent: plain
       * `attacking` sends every token at whoever is already being attacked,
       * which in a duel is the same thing and in a pod is a materially
       * different card. The tokens are made one per opponent, each aimed at
       * their own.
       */
      attacking?: boolean | "each-opponent";
      /** "Create a **tapped** Treasure token" - Gala Greeters. Ignored for tokens made attacking, which are tapped anyway. */
      tapped?: boolean;
      /**
       * "That token ... **attacks this combat if able**" - Legion Warboss.
       *
       * A requirement stamped on the token as it is made, not a keyword: the
       * creature is not attacking yet - it is being told it must, in a combat
       * whose attackers have not been declared. See `CardInstance.mustAttackThisCombat`.
       */
      mustAttack?: boolean;
      /**
       * "**Sacrifice them at the beginning of the next end step**" - mobilize,
       * on Voice of Victory.
       *
       * Scheduled over the tokens that were actually made, which is why it lives
       * here rather than on the card: the delayed trigger has to name instances,
       * and by the end step the creature that made them may be dead. Exactly
       * what `createCopyToken.delayedEnd` does for Rionya.
       */
      delayedEnd?: DelayedAction;
      /**
       * "It gains lifelink and haste **until end of turn**" - Windcrag Siege's
       * Goblin.
       *
       * Granted rather than printed on the token definition, and the difference
       * is the whole clause: a token whose *definition* carried haste would
       * still have it next turn, which is a materially better card.
       */
      grants?: Keyword[];
    }
  /**
   * "Look at the top six cards of your library. You may put a Human creature
   * card from among them onto the battlefield tapped and attacking. It gains
   * indestructible until end of turn. Put the rest on the bottom of your
   * library in a random order." - Winota, Joiner of Forces.
   *
   * One effect rather than a look, a choice and a reorder bolted together,
   * because the three are one printed sentence and the middle one stops the
   * game: the cards on offer exist only inside this resolution, exactly as
   * `millThenMayTake`'s do. It rides on `PendingSearch` for the same reason
   * surveil does - one picker, one place to get hidden information wrong.
   */
  | {
      kind: "deployFromTop";
      /** "the top **six** cards". */
      amount: number;
      /** "a **Human creature** card" - the type half. */
      cardType: CardType;
      /** ...and the subtype half. Absent means any card of that type. */
      subtype?: string;
      tapped?: boolean;
      attacking?: boolean;
      /** "It gains **indestructible** until end of turn." */
      grants?: Keyword[];
    }
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
      /**
       * `Amount` rather than a plain number because of Goblin Rabblemaster's
       * "+1/+0 until end of turn **for each other attacking Goblin**" - a number
       * that is only known once attackers have been declared.
       *
       * Every other card in the pool prints a literal, and a literal is a valid
       * `Amount`, so none of them changed. Counted at resolution like every
       * other `count` amount: kill an attacking Goblin in response and
       * Rabblemaster really does end up smaller.
       */
      power: Amount;
      toughness: Amount;
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
       * "Non-Angel creatures you control gain indestructible **until your next
       * turn**." - Emeria's Call.
       *
       * A longer lifetime than everything else in this family, and the extra
       * length is the card: the shield has to survive the opponent's turn, which
       * is the only turn it matters on. Absent means until end of turn, which is
       * every other printing in the pool.
       *
       * Held in its own list on the instance rather than alongside the ordinary
       * grants - see `grantedKeywordsUntilYourNextTurn`. Two lists because they
       * are cleared at two different moments, which is the whole difference
       * between them.
       */
      grantsUntil?: "your-next-turn";
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
      /**
       * `"token"` is Ainok Strike Leader's "**Creature tokens** you control gain
       * indestructible until end of turn" - the sacrifice half of the card,
       * which protects the Goblins it just made and nothing else you own.
       */
      restriction?: "with-counter" | "attacking" | "token";
      /**
       * "each **other** attacking creature gets +1/+0" - battle cry, on Signal
       * Pest.
       *
       * The word is the whole ability: a battle cry that pumped its own source
       * would make a 0/1 into a 1/1 attacker, which is not the card, and on a
       * board of three attackers it would read as one point of power appearing
       * out of nowhere.
       */
      excludeSelf?: boolean;
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
       * legally be yourself. `"each-player"` is Stormfist Crusader's symmetric
       * "each player ... loses 1 life", the controller included.
       */
      who: "each-opponent" | "each-player" | "target" | "self";
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
   * "Target creature you control deals damage equal to its power to target
   * creature you don't control. Each opponent gets a poison counter." -
   * Infectious Bite.
   *
   * The one effect in the pool with two targets that are not the same kind of
   * thing: a creature you control that deals the damage, and one you don't that
   * takes it. They cannot be a `count: 2` on one selector, because "you
   * control" and "you don't control" are opposite requirements - so this
   * carries a selector for each, validated positionally (`dealer` first). The
   * poison is folded in rather than chained through a `sequence`, so the whole
   * card is one effect and needs no target-sharing across steps.
   */
  /**
   * "Proliferate. (Choose any number of permanents and/or players, then give
   * each another counter of each kind already there.)" - Radstorm.
   *
   * The real card is a free choice of any subset. Modelled as the beneficial
   * subset - the controller's own +1/+1, loyalty and other counters, and poison
   * on opponents - since there is no counter-choice UI and this deck only ever
   * wants those. A documented simplification, like Delve's take-from-the-top.
   */
  | { kind: "proliferate" }
  /**
   * "Look at the top four cards of your library. You may reveal a noncreature,
   * nonland card from among them and put it into your hand. Put the rest on the
   * bottom of your library in a random order." - Thundertrap Trainer.
   *
   * Look at `amount`, take up to one that is none of `excludeTypes`, and the
   * rest go to the bottom (in library order rather than a fresh shuffle - a
   * documented simplification, the order of face-down cards nobody sees). Reuses
   * `pendingCardChoices` for the "may take", with `restToBottom` carrying the
   * looked-at set.
   */
  | { kind: "lookTopMayTake"; amount: number; excludeTypes?: CardType[] }
  /**
   * "You may mill that many cards. Put any number of land cards from among them
   * onto the battlefield tapped." - Rampant Frogantua. Mills `amount` (the
   * combat damage dealt, an event-amount), then offers the milled *lands* to put
   * onto the battlefield tapped, any number. Reuses `pendingCardChoices` with
   * the to-battlefield mode.
   */
  | { kind: "millThenPlayLands"; amount: Amount }
  /**
   * "Search your library for up to three monocolored cards with different names
   * and exile them. An opponent chooses one of those cards. Shuffle that card
   * into your library. You may cast the other cards without paying their mana
   * costs. Exile Emergent Ultimatum." - the whole card as one bespoke effect,
   * run across two `pendingCardChoices` (the caster's search, then the
   * opponent's pick). See effects.ts.
   */
  | { kind: "emergentUltimatum" }
  /**
   * "you may transform Emet-Selch" - turns the source over in place to its back
   * face (`backFaceId`), a one-way flip in this deck. The same permanent, so its
   * counters and damage ride along; only its printed characteristics change.
   */
  | { kind: "transform" }
  /**
   * "When you next cast an instant or sorcery spell this turn, copy that spell."
   * - Sword of Wealth and Power's combat trigger. Arms the controller's
   * `copyNextInstantOrSorcery`; the copy is made by `castSpell` when they next
   * cast one. New targets for the copy are a documented simplification - it
   * copies with the same targets.
   */
  | { kind: "copyNextInstantOrSorcery" }
  | {
      kind: "infectiousBite";
      /** "Target creature you control deals damage equal to its power..." - target 0. */
      dealer: TargetSelector;
      /** "...to target creature you don't control." - target 1. */
      recipient: TargetSelector;
      /** "Each opponent gets a poison counter." */
      poisonEachOpponent: number;
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
  /**
   * `"controller"` is The Ring's second ability - "draw a card, then discard a
   * card" - where the player discarding is the one who drew. `"self"` is the
   * same actor, spelled the way Dan's Felix cards name it; the handler treats
   * the two identically.
   */
  | { kind: "discard"; amount: number; who: "each-opponent" | "controller" | "self" }
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
  /**
   * "...**if it's blue**" - Pyroblast, and Feral Appetite's "if it was a
   * creature card".
   *
   * A test on what the effect is aimed at, run after the targets are already
   * chosen. Both halves are optional and a card prints one of them; asking both
   * would be a card that does not exist.
   */
  | { kind: "ifTargetWas"; cardType?: CardType; color?: Color; then: Effect }
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
  | { kind: "counter"; target: TargetSelector; unlessPays?: ManaCost; toHand?: boolean }
  /**
   * "Return target creature card from your graveyard to your hand" - or to the
   * battlefield, for the reanimation spells. Entering the battlefield this way
   * fires enters-the-battlefield triggers exactly as casting it would.
   */
  | {
      kind: "returnFromGraveyard";
      destination: "hand" | "battlefield";
      target: TargetSelector;
      /** "That creature is a black Zombie in addition to its other colors and types" - Liliana, on a battlefield return. */
      alsoType?: { subtypes: string[]; colors: Color[] };
    }
  /**
   * "Return **all** land cards from your graveyard to the battlefield tapped" -
   * Aftermath Analyst. Untargeted mass reanimation of one card type from the
   * controller's own graveyard, so it needs no target and cannot fizzle.
   */
  | { kind: "returnAllFromGraveyard"; cardType: CardType; destination: "battlefield" | "hand"; tapped?: boolean }
  /**
   * "deals N damage to each creature" - Blasphemous Act. Real damage, not a
   * -N/-N: indestructible survives it, deathtouch would be lethal, and it feeds
   * nothing that watches for life loss. Each creature goes through the same
   * `damageCreature` door as a burn spell.
   */
  | { kind: "damageAll"; amount: number }
  /**
   * "Each opponent loses X life. You gain life equal to the life lost this way."
   * - Exsanguinate. One effect rather than a `loseLife`/`gainLife` pair because
   * the gain is the *sum actually lost*, which neither half records on its own:
   * each opponent loses `amount`, and the controller gains that times the number
   * of opponents who were around to lose it.
   */
  | { kind: "drain"; amount: Amount }
  /**
   * "Each creature deals 1 damage to its controller." - Rakdos Charm's third
   * mode. Every creature on the battlefield is the source, dealing to whoever
   * controls it, so it goes through the ordinary damage door per creature.
   */
  | { kind: "eachCreatureDamagesController"; amount: number }
  /**
   * "Discard any number of cards, then draw that many cards [plus one]." - the
   * rummage on Cavalier of Flame and Brass's Tunnel-Grinder. With no UI to value
   * a discard, the engine takes the safe zero (draw only the `plusOne`, if any),
   * the same documented posture `searchLibrary` takes for the card it finds.
   */
  | { kind: "discardAnyNumberDrawThatMany"; plusOne?: boolean }
  /**
   * "Reveal the top card of your library and put it into your hand. Each
   * opponent loses X life and you gain X life, where X is that card's mana
   * value." - Twilight Prophet.
   */
  | { kind: "revealTopDrainByManaValue" }
  /**
   * "Reveal the top N cards of your library. You may put a [creature or land]
   * card from among them into your hand. Put the rest into your graveyard." -
   * Grisly Salvage. The engine takes the first eligible card, its documented
   * search posture.
   */
  | { kind: "revealToHandRestToGraveyard"; amount: number; cardTypes: CardType[] }
  /**
   * "Mill a card. If a land is milled, make a Treasure; a creature, a 1/1
   * Insect; a noncreature nonland, a Blood." - Old Rutstein. One token id per
   * branch.
   */
  | { kind: "millAndBranchToken"; landToken: string; creatureToken: string; otherToken: string }
  /**
   * "Each player may search their library for up to N basic land cards, put
   * them onto the battlefield, then shuffle." - Veteran Explorer. Symmetric ramp
   * the engine resolves for every player, taking up to N basics apiece.
   */
  | { kind: "eachPlayerFetchBasics"; count: number; tapped?: boolean }
  /**
   * "It deals X damage to each opponent and each planeswalker they control." -
   * Cavalier of Flame's death trigger. Real damage, through the ordinary door.
   */
  | { kind: "damageEachOpponentAndPlaneswalkers"; amount: Amount }
  /**
   * "Each opponent may sacrifice a nonland permanent of their choice or discard
   * a card. Then this creature deals damage equal to its power to each opponent
   * who didn't." - Osseous Sticktwister. The engine takes the cheapest avoidance
   * available to each opponent (sacrifice, else discard); one who can do neither
   * takes the damage.
   */
  | { kind: "eachOpponentSacOrDiscardElseDamage"; amount: Amount }
  /**
   * "You and target opponent each reveal the top card of your library. You each
   * lose life equal to the mana value of the card revealed by the other player.
   * You each put the card you revealed into your hand." - Keen Duelist.
   */
  | { kind: "keenDuel" }
  /**
   * "Starting with you, each player may choose an artifact or enchantment you
   * don't control. Destroy each permanent chosen this way." - Druid of
   * Purification. The engine picks, per player, one of `cardTypes` the effect's
   * controller does not control, and destroys the chosen set.
   */
  | { kind: "destroyChosenNotYours"; cardTypes: CardType[] }
  /**
   * "Each opponent may search their library for up to N basic land cards. They
   * each put one onto the battlefield tapped under your control and the rest
   * under their own, then shuffle." - Rootweaver Druid.
   */
  | { kind: "eachOpponentFetchBasicsSplit"; count: number }
  /**
   * "Prevent all damage that would be dealt this turn by creatures your
   * opponents control." - Obscuring Haze. Sets the turn-long fog on the state.
   */
  | { kind: "preventDamageFromOpponentCreatures" }
  /**
   * "Each player reveals a number of cards from the top of their library equal
   * to the number of nonland permanents they control, puts all permanent cards
   * revealed this way onto the battlefield, and puts the rest into their
   * graveyard." - Over the Top.
   */
  | { kind: "revealTopPermanentsToBattlefield" }
  /**
   * "You may discard a card. If you do, draw a card." - Restless Vents. The
   * engine takes the loot (a card-neutral filter), discarding from the back of
   * hand and drawing the same number; a documented auto-yes.
   */
  | { kind: "loot"; amount: number }
  /**
   * "Exile up to one target card from a graveyard." - Restless Cottage. A
   * targeted exile of a single graveyard card, as opposed to `exileGraveyard`
   * which takes a whole graveyard.
   */
  | { kind: "exileGraveyardCard"; target: TargetSelector }
  /**
   * "Search your library for a land and put it onto the battlefield. Each
   * opponent may do the same; for each who does, search again." - Tempt with
   * Discovery. The engine takes every offer (a ramp deck always wants the land).
   */
  | { kind: "temptWithDiscovery" }
  /**
   * "Create a 5/5 Demon, mill two, and if the two milled cards share all their
   * card types, sacrifice this." - Demonic Covenant's end step.
   */
  | { kind: "demonicCovenantEndStep"; tokenDefinitionId: string; millAmount: number }
  /**
   * "Put two descent counters on this. Then each player creates X Treasures and
   * this deals X damage to each player, where X is the descent counters." -
   * Descent into Avernus.
   */
  | { kind: "descentAvernus"; countersPerUpkeep: number; treasureTokenId: string }
  /**
   * "Each player shuffles all permanents they own into their library, then
   * reveals that many, putting all permanent cards onto the battlefield and the
   * rest on the bottom." - Warp World.
   */
  | { kind: "warpWorld" }
  /**
   * "Surveil 2. Then for each card you put on top, draw a card and lose 3 life."
   * - Starving Revenant. The engine takes the safe surveil (both to graveyard),
   * so no forced draw-and-loss; the descend payoff is the card's engine.
   */
  | { kind: "surveilThenDrawLose"; surveil: number; lifePerCard: number }
  /**
   * "Surveil N" for N greater than 1 (Pile On's Surveil 2). The engine keeps the
   * cards on top - the safe surveil - so this looks but changes nothing, the
   * documented shortcut the single-card `surveil` already takes for its choice.
   */
  | { kind: "surveilN"; amount: number }
  /**
   * "Return another target permanent card from your graveyard to your hand" as
   * a kicker rider - Urborg Repossession. Untargeted and engine-picked (the best
   * permanent card in your graveyard that is not the one already taken), so it
   * composes into a spell that already has one target.
   */
  | { kind: "returnFromGraveyardAuto"; cardTypes: CardType[]; destination: "hand" | "battlefield" }
  /** "An opponent gains control of this artifact." - Wishclaw Talisman. Hands the source to the first opponent. */
  | { kind: "giveControlToOpponent" }
  /**
   * "Mill three cards. You may put a land card from among them into your hand." -
   * Six. The engine takes the first milled land.
   */
  | { kind: "millTakeLandToHand"; amount: number }
  /**
   * "Draw a card, then you may put a land from your hand onto the battlefield.
   * This artifact's owner then does the same." - Pendant of Prosperity's
   * symmetric ability, run for the controller and the owner in turn.
   */
  | { kind: "pendantDraw" }
  /** "You may cast a creature spell from your graveyard this turn." - Chainer's discard ability. */
  | { kind: "enableCastCreatureFromGraveyard" }
  /**
   * "Reveal the top N cards. You may put a land card from among them onto the
   * battlefield tapped. Put the rest into your graveyard." - Shigeki's first
   * ability. The engine takes the first revealed land.
   */
  | { kind: "revealPutLandRestGraveyard"; amount: number }
  /**
   * "Return X target nonlegendary cards from your graveyard to your hand." -
   * Shigeki's Channel. The engine takes the X most valuable, its documented
   * search posture.
   */
  | { kind: "returnManyFromGraveyard"; max: Amount; nonlegendaryOnly?: boolean }
  /**
   * "It gains haste until your next turn." granted to the permanent the event was
   * about - Chainer's arrival trigger, aimed at the creature that just entered.
   */
  | { kind: "grantHasteToEventPermanent" }
  /**
   * "If you descended this turn, put a bore counter on this. If there are three
   * or more, remove them and transform it." - Brass's Tunnel-Grinder's end step.
   */
  | { kind: "brassEndStep"; boreToTransform: number }
  /**
   * "Discover X" - exile cards from the top until a nonland card with mana value
   * X or less, then put it into your hand; the rest go on the bottom. The engine
   * takes the hand (rather than a free cast), its documented choice posture.
   */
  | { kind: "discover"; amount: Amount }
  /** "Exile the top card of each player's library." - Share the Spoils, into the shared impulse pile. */
  | { kind: "shareTheSpoilsExile" }
  /**
   * "Exile all nontoken permanents. Starting with you, each player chooses one
   * of the exiled cards and puts it onto the battlefield tapped under their
   * control. Repeat until all have been chosen." - Thieves' Auction. The engine
   * distributes round-robin, each player taking the highest-value card available.
   */
  | { kind: "thievesAuction" }
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
      /**
       * Restricts what may be found. Omitted means any card.
       *
       * A list means any one of them qualifies - Enlightened Tutor's "an
       * artifact **or** enchantment card". One field rather than two, because
       * it is one question, which is the same shape `watchFor.type` takes.
       * (`cardTypes` below is Dan's separate spelling of the same "any one of
       * these" question; the handler accepts either.)
       */
      cardType?: CardType | CardType[];
      /** "a creature or land card" - any one of these types qualifies (Traverse the Ulvenwald). */
      cardTypes?: CardType[];
      /** "an instant card **or a card with flash**" - a card also qualifies if it has this keyword (Waterlogged Teachings). */
      orHasKeyword?: Keyword;
      /**
       * "a creature card with **power 2 or less**" - Imperial Recruiter,
       * "**toughness 2 or less**" - Recruiter of the Guard, "**mana value 1 or
       * less**" - Ranger-Captain of Eos.
       *
       * Plain numbers rather than `Amount`s, because all three are printed on
       * the card and none of them moves. The graveyard selector's
       * `maxManaValue` is an `Amount` for the opposite reason: Moseo's cap is
       * the life you gained this turn, and it changes during the turn.
       *
       * Read off the printed characteristics, so a creature buffed on the
       * battlefield is irrelevant - a card in a library has no bonuses.
       */
      maxPower?: number;
      maxToughness?: number;
      maxManaValue?: number;
      /** Narrows further to basic lands only, for the ramp spells. */
      basicLandOnly?: boolean;
      /** "...**or a creature card with mana value N or less**" - Starfield Shepherd's alternative find. */
      orCreatureMaxManaValue?: number;
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
   * An edict: "Each opponent sacrifices a creature ..." (Flare of Malice) or
   * "Each player sacrifices N creatures". `greatestManaValue` forces the highest
   * mana value among the qualifying permanents (Flare of Malice); otherwise the
   * lowest `count` are given up. The choice is resolved by the engine rather
   * than asked, which is a simplification where more than one option is legal.
   */
  | {
      kind: "eachSacrifices";
      who: "each-player" | "each-opponent";
      count?: number;
      types?: CardType[];
      greatestManaValue?: boolean;
    }
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
   * "Your opponents can't cast spells this turn." - Silence, and
   * Ranger-Captain of Eos's sacrifice ability.
   *
   * The same restrictions the permanents carry, but attached to the turn rather
   * than to a permanent: it survives the spell going to the graveyard, and ends
   * in the cleanup step. `GameState.turnRestrictions` is where it lives.
   */
  | { kind: "restrictThisTurn"; restriction: ActionRestriction }
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
  | {
      kind: "createCopyToken";
      /**
       * What is copied. `target` is Kiki-Jiki's and Rionya's "a copy of target
       * nonlegendary creature you control" - the first copy effect here that
       * points at something rather than reading its own source.
       */
      of: "self" | "attached-creature" | "target";
      /** The selector for `of: "target"`. Ignored, and absent, for the other two. */
      target?: TargetSelector;
      /**
       * "create **X** tokens that are copies" - Rionya, whose X is one plus the
       * instants and sorceries you have cast this turn.
       *
       * An `Amount` rather than a number, and counted at resolution rather than
       * substituted early: cast another instant while the trigger is on the
       * stack and you really do get another copy. Absent means one, which is
       * every other printing.
       */
      count?: Amount;
      /**
       * "...**except it has haste**" (Kiki-Jiki) and "**They gain haste**"
       * (Rionya).
       *
       * Two different rules on paper - a copy modification against a separate
       * continuous effect - and the same field here, which is worth defending
       * rather than glossing. Both tokens are sacrificed or exiled at the
       * beginning of the next end step, which is *before* the cleanup step that
       * takes granted keywords away, so no token of either card ever reaches
       * the moment the two would diverge. The one shape this would not serve is
       * a copy modification on a token meant to outlive the turn, and nothing
       * in the pool prints one.
       */
      grants?: Keyword[];
      /**
       * "**Sacrifice it** at the beginning of the next end step" (Kiki-Jiki)
       * against "**Exile them**" (Rionya).
       *
       * Set up as a `DelayedTrigger` over the tokens this made, not as a
       * property of the tokens: the ability that schedules it has finished
       * resolving, and the tokens are ordinary permanents until the end step
       * comes for them. Sacrifice and exile are genuinely different - a
       * sacrificed token dies, so anything watching for a death sees it.
       */
      delayedEnd?: DelayedAction;
      /** "a 1/1 token copy of it" - Offspring prints the copy's P/T over the original's. */
      ptOverride?: { power: number; toughness: number };
    }
  /**
   * "Mill three cards. Then you may pay {1} and 3 life. If you do, put a card
   * from among those cards into your hand." - Ripples of Undeath.
   *
   * One effect rather than a mill beside a choice, because the choice is over
   * *the cards this milled* - a set that exists only inside this resolution.
   */
  | {
      kind: "millThenMayTake";
      amount: number;
      cost: { mana?: ManaCost; life?: number; energy?: number };
      /** Only milled cards of none of these types may be taken - Fallaji's "noncreature, nonland". */
      excludeTypes?: CardType[];
      /** "If you don't, put a +1/+1 counter on this creature" - Fallaji Archaeologist. */
      ifDeclined?: Effect;
    }
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
   * "Gain control of target permanent until end of turn. Untap that permanent.
   * It gains haste until end of turn." - Zealous Conscripts.
   *
   * Three printed sentences and one effect, because all three act on the same
   * permanent and there is nothing to point them at separately - the same
   * reason `millThenMayTake` is one effect. Splitting them into a `sequence`
   * would need each step to re-find "that permanent", which is the target this
   * one already holds.
   *
   * Control is the interesting part. It moves the permanent between the two
   * players' battlefields and remembers where it came from on the instance, so
   * the cleanup step can hand it back; and it makes the creature summoning-sick
   * for its new controller, which is rule 302.6 and is exactly why the card
   * grants haste in the same breath.
   */
  | {
      kind: "gainControl";
      target: TargetSelector;
      /** "Untap that permanent." */
      untap?: boolean;
      /** "It gains haste until end of turn." */
      grants?: Keyword[];
    }
  /**
   * "Each player gains control of all creatures they own." - Homeward Path.
   *
   * Untargeted and symmetrical: it hands back everything, including creatures
   * whose control was taken by something other than the effect above, which is
   * what makes it the answer to a stolen board rather than a mirror of one
   * card. Reads `ownerId`, which every instance has carried from the start.
   */
  | { kind: "returnControlToOwners" }
  /**
   * "Target creature you control gains protection from the color of your choice
   * until end of turn." - Mother of Runes, Giver of Runes, Alseid of Life's
   * Bounty.
   *
   * The colour is chosen as the ability *resolves*, not as it is activated, and
   * that is not a detail: the point of Mother of Runes is holding the choice
   * open until you see what is being cast at you. So this effect does not carry
   * a colour at all - it parks a `PendingColorChoice` and the protection is
   * granted when that is answered.
   */
  | {
      kind: "grantProtection";
      target: TargetSelector;
      /**
       * "protection from **colorless or** from the color of your choice" - Giver
       * of Runes, the only card in the pool that offers it. Left off, the
       * question is the five colours, which is what the other two print.
       */
      orColorless?: boolean;
      /**
       * What the named colour actually buys.
       *
       * Defaults to protection, which is every printing in the pool but one.
       * Skrelv's names three clauses at once - hexproof from that colour, and
       * unblockable by creatures of it - and they are all keyed to the same
       * answer, so they belong to the same question rather than to three.
       */
      grants?: Array<"protection" | "hexproof-from" | "unblockable-by">;
      /**
       * "gains **toxic 1** and hexproof from that color" - granted alongside,
       * and about no colour at all. It rides here because it is one ability.
       */
      toxic?: number;
    }
  /**
   * "For each token you control that entered this turn, create a token that's
   * a copy of it." - Ocelot Pride's second sentence.
   *
   * Untargeted, and a set that cannot be named any other way: it is every token
   * that arrived this turn, including the Cat the same ability just made, which
   * is the whole reason the card is played. `enteredOnTurn` on the instance is
   * what makes "this turn" answerable - a tally on the player could not say
   * *which* tokens.
   */
  | { kind: "copyTokensThatEnteredThisTurn" }
  /**
   * The body of a delayed trigger: sacrifice or exile the permanents it was set
   * up over.
   *
   * Reads them off the stack object's targets rather than a selector, because a
   * delayed trigger's objects were fixed when the ability that scheduled it
   * resolved. There is no choice left to make and nothing to point at, which is
   * also why this is the one effect with no `TargetSelector` that still expects
   * targets.
   */
  | {
      kind: "delayedRemoval";
      action: DelayedAction;
      /**
       * `"end-of-combat"` makes this the trigger that *schedules* a removal
       * rather than the body of one - The Ring's "sacrifices it at end of
       * combat". Absent, it acts at once, which is what every delayed trigger's
       * own body does when it fires.
       */
      at?: "end-of-combat";
      /**
       * Phelia's rider, carried on the "return-from-exile" body: after the card
       * comes back under its owner's control, if that owner is this ability's
       * controller ("if it entered under your control"), put a +1/+1 counter on
       * the source.
       */
      returnCounterToSource?: boolean;
    }
  /**
   * Flicker: exile one or more permanents, then return them to the battlefield.
   *
   * "Blink" - Cloudshift, Ephemerate, Restoration Angel return at once; Phelia,
   * Flickerwisp, Charming Prince, Touch the Spirit Realm return "at the beginning
   * of the next end step" instead. Returning is `putOntoBattlefield`, so the card
   * comes back as a new object under its owner's control and its enter triggers
   * fire again - which is the whole point of a blink.
   */
  | {
      kind: "flicker";
      target: TargetSelector;
      /** At once, or scheduled for the next end step. */
      timing: "immediate" | "next-end-step";
      /**
       * Phelia: "If it entered under your control, put a +1/+1 counter on Phelia."
       * Applied only when the returned card's owner is the flickerer's controller.
       */
      counterSourceIfYours?: boolean;
    }
  /**
   * The Oblivion Ring pattern: "exile target ... until this leaves the
   * battlefield." The exiled card is linked to the source (`exiledBy`), and the
   * source carries a `leaves-battlefield` trigger whose `returnExiledByThis`
   * body brings everything it exiled back under its owner's control.
   *
   * Banishing Light, Makeshift Binding, Thopter Arrest, Prayer of Binding,
   * Portable Hole, Touch the Spirit Realm and the O-Ring auras all share it.
   */
  | { kind: "exileUntilLeaves"; target: TargetSelector }
  /** The body of the source's own leaves-battlefield trigger. */
  | { kind: "returnExiledByThis" }
  /**
   * "Put target creature into its owner's library **second from the top**" -
   * Oust. `fromTop` is 1-indexed: 1 is the very top, 2 is second from the top.
   */
  | { kind: "tuckToLibrary"; target: TargetSelector; fromTop: number }
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
      cost: { mana?: ManaCost; life?: number; energy?: number };
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
  /**
   * "{1}: This creature **can't be blocked this turn** except by creatures with
   * haste." - Gingerbrute.
   *
   * Applies to the effect's own source and takes no target, because that is
   * what the card says: the ability is on the creature it makes unblockable.
   * Lands on the instance rather than the definition, so it wears off in the
   * cleanup step with the rest of the turn's state - a restriction that stuck
   * would make a one-mana ability permanent.
   */
  | { kind: "restrictBlockersThisTurn"; restriction: BlockRestriction }
  /**
   * "It deals 1 damage to **you**." - City of Brass's rider on becoming tapped.
   *
   * Not a target and not life loss. The source deals it, so it goes through the
   * ordinary damage path and a prevention shield covers it exactly as it would
   * cover a burn spell - which is why this is not written as `loseLife`.
   *
   * The twin of `ActivatedAbility.damageToController`, which is the same rider
   * attached to a mana ability rather than to a trigger.
   */
  | { kind: "damageController"; amount: number }
  /**
   * "{1}: This land becomes a 1/1 Blinkmoth artifact creature with flying until
   * end of turn. It's still a land."
   *
   * Applies to the effect's own source and takes no target - both printings of
   * this in the pool animate the land whose ability it is. See
   * `CardInstance.animation`.
   */
  | {
      kind: "animateSelf";
      power: number;
      toughness: number;
      subtypes: string[];
      keywords: Keyword[];
    }
  /**
   * "discard a card **at random**" - Gamble, and the reason the card is a gamble
   * at all: it finds any card in your deck and then may well throw it away.
   *
   * Deliberately not the `discard` effect above, which stops and asks - the
   * whole difference between the two is who chooses, and a Gamble that let you
   * pick would be an unconditional tutor for one mana.
   */
  | { kind: "discardRandom"; amount: number }
  /**
   * "then add {R} **for each** card named Rite of Flame in each graveyard".
   *
   * Separate from `addMana` because that one is read by the mana-source
   * scanners, which need a fixed number to plan a payment with: a mana *ability*
   * whose output nobody can predict would break the auto-tapper. This is a
   * spell effect and nothing plans around it.
   */
  | { kind: "addManaVariable"; color: ManaColor; amount: Amount }
  /**
   * "Exile the top card of your library. You may play that card this turn." -
   * Professional Face-Breaker, and Ragavan's version aimed at the player who was
   * just hit.
   *
   * One effect rather than an exile plus a permission, because the permission is
   * about the specific card that was just exiled and nothing else could name it.
   */
  | {
      kind: "exileTopAndMayPlay";
      /** Whose library. `"damaged-player"` reads the trigger's player target. */
      from: "you" | "damaged-player";
      /** "play" includes a land drop; "cast" does not. */
      lands: boolean;
    }
  /**
   * "Target player becomes **the monarch**." - Eomer, King of Rohan.
   *
   * The crown is a property of the game rather than of any permanent: exactly one
   * player has it, it survives the card that granted it leaving, and the two
   * rules that come with it - a card at your end step, and losing it to combat
   * damage - are enforced by the turn machine and the combat step rather than by
   * anything on the battlefield.
   */
  | { kind: "becomeMonarch"; who: "target" }
  /**
   * "Draw a card **unless that player pays {X}**, where X is this creature's
   * power." - Esper Sentinel.
   *
   * The player who is taxed is the one the event named - the caster - and the
   * engine pays for them if they can, which is the same shortcut `counter`'s
   * `unlessPays` already takes: nothing in this engine asks whether you would
   * rather let a card through, and a prompt with one sensible answer is noise.
   * The day that becomes a real decision it is a pending question, not a new
   * effect.
   */
  | { kind: "drawUnlessTheyPay"; amount: Amount }
  /**
   * "**They may tap that permanent. If they don't**, you create a 1/1 white
   * Vampire creature token with lifelink." - Charismatic Conqueror.
   *
   * A yes-or-no aimed at somebody other than the ability's controller, which is
   * the second question in this engine of that shape - `PendingDiscard` was the
   * first. It rides on `pendingConfirmation`, whose `playerId` has always been a
   * field rather than an assumption, so asking an opponent needed no new
   * machinery: the bot and the client both answer whichever confirmations belong
   * to a seat they drive.
   *
   * The two halves belong to two different players and that is not decoration:
   * *they* tap their own permanent, and *you* get the Vampire. `then` is
   * therefore run for the asked player and `otherwise` for the controller.
   */
  | { kind: "theyMay"; prompt: string; then: Effect; otherwise: Effect }
  /**
   * "**Imprint** - When this artifact enters, you may exile a nonartifact,
   * nonland card from your hand." - Chrome Mox.
   *
   * The exiled card is remembered on the Mox itself (`imprintedInstanceId`),
   * because everything the card does afterwards is about it: the mana ability
   * reads its colours, and a Mox that imprinted nothing taps for nothing at all.
   * That last part is the card and not an edge case - a turn-one Chrome Mox off
   * a hand with no spare colour is a blank artifact for the rest of the game.
   *
   * Rides on `pendingCardChoice`, the machinery that already asks which card,
   * with `min: 0` because "you may" here really does include declining.
   */
  | { kind: "imprintFromHand"; excludeTypes: CardType[] }
  /**
   * "**You may choose new targets for target spell or ability.**" - Deflecting
   * Swat.
   *
   * The only effect in the pool that reaches back into something already on the
   * stack and edits it. The new targets have to be legal for *that* spell, so
   * they are worked out from its own selector and its own controller - hexproof
   * asks who is casting, and that is still them, not you.
   *
   * "May" is a simplification here: the engine always re-points, and the current
   * target is among the choices - so leaving it where it is means picking it
   * again. Nobody casts this to decline.
   */
  | { kind: "changeTargets"; target: TargetSelector }
  /**
   * "Put a +1/+1 counter and a **double strike counter** on Quicksilver."
   *
   * A keyword held as a counter rather than granted for the turn, which is the
   * whole difference: it does not wear off. See `CardInstance.keywordCounters`.
   */
  | { kind: "addKeywordCounter"; keyword: Keyword; alsoPlusOne?: number; target?: TargetSelector; becomesSubtype?: string }
  /** "you gain 1 life and get {E}" / "get {E}{E}" - Guide of Souls. */
  | { kind: "gainEnergy"; amount: number }
  /** "you gain protection from everything until your next turn" - The One Ring (modeled as preventing all damage to you). */
  | { kind: "gainProtectionFromEverything" }
  /**
   * "You may **exile Ajani, then return him to the battlefield transformed**
   * under his owner's control."
   *
   * Two zone changes and a new object, which is what the card says and is also
   * why this is simpler than an in-place transform: the permanent leaves, its
   * face is turned over while it is away, and what comes back is a fresh
   * permanent with summoning sickness and no counters. Every "when this enters"
   * on the far side fires, because it really is entering.
   */
  | { kind: "exileAndReturnTransformed" }
  /**
   * "Each opponent chooses an artifact, a creature, an enchantment, and a
   * planeswalker from among the nonland permanents they control, **then
   * sacrifices the rest**." - Ajani's -4.
   *
   * One question per opponent, asked in turn, which is what `pendingCardChoices`
   * has been a queue for since "each opponent discards a card". What is new is
   * only the shape of a legal answer: at most one of each named type, and as
   * many of them as they actually have.
   */
  | { kind: "eachOpponentKeepsOnePerType"; types: CardType[] }
  /**
   * "**The Ring tempts you.**" - Boromir's sacrifice.
   *
   * Two things at once, in this order: you get The Ring if you do not have it
   * and it gains its next ability, and then you choose a Ring-bearer. The
   * second is a real choice and stops the game; the first never is.
   *
   * Capped at four, because there are four abilities and being tempted a fifth
   * time does nothing but re-choose the bearer - which the card still lets you
   * do, and which is occasionally the point.
   */
  | { kind: "theRingTemptsYou" }
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
  /** "if there are thirteen or more creatures on the battlefield" - Blasphemous Edict. Counts every player's. */
  | { kind: "creatures-on-battlefield"; count: number }
  /** Delirium: "four or more card types among cards in your graveyard" - Traverse the Ulvenwald. Distinct types. */
  | { kind: "card-types-in-graveyard"; count: number }
  /** "if there are fourteen or more cards in your graveyard" - Emet-Selch. A plain count of your graveyard. */
  | { kind: "cards-in-graveyard"; count: number }
  /** "if there are eight or more permanent cards in your graveyard" - Starving Revenant's Descend 8. */
  | { kind: "permanent-cards-in-graveyard"; count: number }
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
   *
   * `basic` narrows it to basic lands only - "unless you control two or more
   * basic lands", the battle-land tapland condition (Cinder Glade, Smoldering
   * Marsh). Read off the Basic supertype, so a dual land does not count.
   */
  | { kind: "controls-lands"; count: number; basic?: boolean }
  /** "if an opponent controls more lands than you" - Scouting Hawk. */
  | { kind: "opponent-controls-more-lands" }
  /** "if you have exactly seven cards in hand" - Library of Alexandria. */
  | { kind: "cards-in-hand-exactly"; count: number }
  /** "you have a white card in hand" - the evoke availability check (Solitude). */
  | { kind: "card-in-hand-of-color"; color: Color }
  /** Coven - "you control three or more creatures with different powers" - Ambitious Farmhand. */
  | { kind: "coven" }
  /**
   * "unless a player has 13 or less life" - Strangled Cemetery, and the
   * horror-land cycle. Any player at all, the controller included, which is
   * why it is not `life-at-least` negated: that reads only the controller.
   */
  | { kind: "any-player-life-at-most"; life: number }
  /**
   * "if you have four or more creature cards in your graveyard" - Oversold
   * Cemetery. Counts creature cards specifically, unlike `cards-in-graveyard`.
   */
  | { kind: "creature-cards-in-graveyard"; count: number }
  /** "if this permanent is attached to a creature you control" - Springheart Nantuko. */
  | { kind: "attached-to-a-creature" }
  /**
   * "**if you have the city's blessing**" - Ocelot Pride's second sentence.
   *
   * A question about the player and not the board, which is the whole point of
   * Ascend: once you have had ten permanents you keep the blessing for the rest
   * of the game, so this stays true after the board is wiped.
   */
  | { kind: "citys-blessing" }
  /**
   * "unless it's your **first, second, or third turn** of the game" - Starting
   * Town.
   *
   * *Your* turns, not the game's: player two's third turn is the game's sixth,
   * and a condition written against `state.turnNumber` would leave the card
   * untapped for one player and tapped for the other. Counted on the player -
   * see `Player.turnsTaken`.
   */
  | { kind: "within-your-first-turns"; turns: number }
  /**
   * "As long as you have **30 or more life**" - Serra Ascendant.
   *
   * The controller's life total, read every time the buff is asked for like
   * every other condition here, so the creature grows and shrinks as the total
   * crosses the line rather than being latched at the moment it entered.
   */
  | { kind: "life-at-least"; life: number }
  /** "if you gained life this turn" - Mortality Spear's cost reduction. The board twin of the intervening-if of the same name. */
  | { kind: "gained-life-this-turn" };

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
  | { kind: "graveyard-to-exile" }
  /**
   * "If a source **you control** would deal damage to a permanent or player, it
   * deals **double** that damage instead." - Angrath's Marauders.
   *
   * The first replacement in the pool on an event that is not a counter or a
   * token, and it lives here rather than in damage.ts's callers because damage
   * arrives from everywhere: combat, burn spells, a painland, a trigger. Both
   * `damageCreature` and `damagePlayer` ask.
   *
   * "A source you control" is why the doubling needs the source: an opponent's
   * Marauders must not double the burn spell you point at them.
   */
  | { kind: "double-damage-you-deal" };

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
  /** "Whenever this creature attacks or blocks" - Elder Gargaroth. A self event fired from both declarations. */
  | "attacks-or-blocks"
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
  /**
   * "When you **play** another land, sacrifice this land." - City of Traitors.
   *
   * Deliberately not `landfall`, and the difference is the card: landfall fires
   * for a land that *arrives* by any route, including one a fetchland put there,
   * while this only fires for a land actually played for the turn. A City of
   * Traitors written as landfall would sacrifice itself to its owner's own
   * fetchland, which is not what it says.
   */
  | "land-played"
  /**
   * "Whenever this land **becomes tapped**, it deals 1 damage to you." - City of
   * Brass.
   *
   * A self event: the permanent watches only its own tapping, so it needs no
   * `watchFor`. Fired from `tapPermanent`, which exists because of this card -
   * three separate places set `tapped` and a trigger taught to one of them would
   * be a card that hurts you for mana and not for attacking.
   *
   * A permanent that *enters* tapped never becomes tapped: it was never untapped
   * to begin with, so those two sites deliberately do not fire this.
   */
  | "becomes-tapped"
  /**
   * "Whenever **Ragavan** deals combat damage to a player."
   *
   * A self event, fired from the combat damage step for the creature that dealt
   * it - not from `damagePlayer`, because it is combat damage specifically: a
   * Ragavan that pings somebody with a burn spell makes no Treasure.
   *
   * The damaged player is handed to the ability as a target, which is how "that
   * player's library" is answered without inventing a second kind of event
   * payload. See `pushTrigger`.
   */
  | "combat-damage-to-player"
  /**
   * "Whenever **one or more creatures you control** deal combat damage to a
   * player." - Professional Face-Breaker.
   *
   * Fires **once** however many creatures connected, which is what "one or more"
   * means and is the whole difference from the event above: a Face-Breaker that
   * paid out per creature would make three Treasures off a three-creature attack.
   */
  | "creatures-dealt-combat-damage"
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
  /**
   * "Whenever a creature you control deals combat damage during your turn" -
   * Quilled Greatwurm. Wider than `combat-damage-to-player`: it fires for combat
   * damage dealt to anything (a blocker as well as a player), with the total a
   * creature dealt this step carried as `{ kind: "event-amount" }` and the
   * damaging creature as the trigger's source, so "put that many +1/+1 counters
   * on it" lands on it. Only on the damager's own turn; `watches` decides whose
   * creatures count. Fired from `dealCombatDamage`.
   */
  | "combat-damage-dealt"
  /**
   * "Whenever you attack with two or more creatures" - Twenty-Toed Toad.
   *
   * A controller-side event, not a per-attacker one: it asks about the whole
   * declaration at once, so it fires once when its controller declares two or
   * more attackers and not at all for a lone attacker. `watches` reads the
   * controller of the permanent printing it. Fired from `declareAttackers`.
   */
  | "attack-with-two-or-more"
  | "you-attack"
  | "upkeep"
  /**
   * "At the beginning of your first main phase" - the precombat main only.
   * There are two main phases in a turn and the postcombat one must not fire
   * this a second time, which is why it is not simply "main".
   */
  | "first-main"
  | "begin-combat"
  /**
   * "At the beginning of your **draw step**" - Mana Vault.
   *
   * The fourth "at the beginning of" step, and the one that had been missing.
   * Fired from the same table in turn.ts as the other three, so whose step it
   * is decides who it fires for in exactly the same way.
   */
  | "draw-step"
  /**
   * "Whenever a player draws a card" (Spiteful Visions), "whenever an opponent
   * draws a card" (Scrawling Crawler). A watcher event whose subject is the
   * *player* who drew, handed to the ability as its player target. Fired from
   * `drawCard`, once per card, so every route into a draw sets it off.
   * `watchFor.controlledBy` chooses whose draws count.
   */
  | "card-drawn"
  /**
   * "Whenever an opponent discards a card" - Sangromancer. A watcher event whose
   * subject is the discarding player, fired from the one `discardCard` door.
   * `watchFor.controlledBy` chooses whose discards count.
   */
  | "card-discarded"
  /** "Whenever an opponent loses the game" - Share the Spoils. Fired once as a player loses. */
  | "opponent-lost"
  /**
   * "Whenever you attack with **one or more** non-Gnome creatures" - Anim Pakal;
   * "whenever you attack with **this creature and/or your commander**" - Ainok
   * Strike Leader.
   *
   * Fires **once** however many creatures were declared, which is the whole
   * difference from `permanent-attacks` beside it: that one fires per attacker,
   * which is what Winota says and would give Anim Pakal a second batch of Gnomes
   * for every extra creature in the swing.
   *
   * The same "one or more" shape `creatures-dealt-combat-damage` has, and for the
   * same reason - see `fireCreaturesAttack`, which decides membership over the
   * whole declaration rather than one subject at a time.
   */
  | "creatures-attack"
  /**
   * "Whenever **one or more** other Cats you control die" - Ajani.
   *
   * Fires **once** for a batch of simultaneous deaths, which is the same "one or
   * more" shape `creatures-attack` and `creatures-dealt-combat-damage` already
   * have, and the same reason: a board wipe that took three Cats is one event,
   * not three, and three prompts to transform one Ajani is not the card.
   *
   * State-based actions kill one creature at a time and loop, so the sweep
   * collects what died and fires this at the end of it - see
   * `checkStateBasedActions`.
   */
  | "creatures-die"
  /**
   * "Whenever your Ring-bearer **becomes blocked by a creature**" - The Ring's
   * third ability.
   *
   * Fires once per blocker, which is what "by a creature" says: two blockers on
   * one attacker is two triggers and two sacrifices. The blocker rides along as
   * a card target, the way every event's subject does.
   */
  | "becomes-blocked"
  /**
   * "Whenever an opponent **searches their library**" - Archivist of Oghma.
   *
   * Fired as the search is set up rather than as it finishes, because that is
   * when the searching happens: a player who searches and finds nothing has
   * still searched, and Archivist still pays out. Fired from the one place
   * `searchLibrary` puts a pending search on the state, so a tutor added later
   * is covered without knowing this card exists.
   */
  | "library-searched"
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
  | { kind: "not"; condition: BoardCondition }
  /**
   * "**If this creature hasn't been exerted this turn**, you may exert it as
   * it attacks" - Combat Celebrant.
   *
   * A question about the permanent printing the trigger, like
   * `source-has-counters`, so it needs the source instance and answers false
   * without one.
   */
  | { kind: "source-not-exerted" }
  /**
   * "**Jeskai** - At the beginning of your upkeep, ..." - Windcrag Siege, whose
   * two halves are one card and only one of them happens.
   *
   * An intervening-if rather than two card definitions, because it is one
   * permanent: the mode was chosen as it entered and lives on its
   * `CardInstance`, which is exactly what a `TriggerCondition` is given.
   */
  | { kind: "chosen-mode"; mode: string }
  /**
   * "**if it's the first combat phase of the turn**" - Raph & Leo, which is
   * the clause that stops it making combat phases forever.
   *
   * An intervening-if rather than an ordinary condition because that is how it
   * is printed, and the difference is real: it is checked again on resolution,
   * so a Raph & Leo whose trigger somehow waits until a later combat does
   * nothing rather than adding another one.
   */
  | { kind: "first-combat-phase" }
  /**
   * "**Lieutenant** - At the beginning of combat on your turn, **if you control
   * your commander**, ..." - Loyal Apprentice.
   *
   * The positive twin of `not` above, which has carried a `BoardCondition` since
   * Ophiomancer. Both halves being one wrapper means a condition added for a
   * tapland is immediately available to an intervening-if, and there is no
   * second list of board questions to keep level with the first.
   */
  | { kind: "board"; condition: BoardCondition }
  /**
   * "At the beginning of your draw step, **if this artifact is tapped**, it
   * deals 1 damage to you." - Mana Vault.
   *
   * A question about the permanent printing the trigger, like
   * `source-has-counters`, and an intervening-if rather than an ordinary
   * condition because that is how it is printed: untap the Vault in response
   * and the damage never happens.
   */
  | { kind: "source-is-tapped" }
  /** "if this artifact is **untapped**" - Howling Mine. The mirror of `source-is-tapped`. */
  | { kind: "source-untapped" }
  /**
   * "if there are twenty or more counters on it or you have twenty or more
   * cards in hand" - Twenty-Toed Toad's win condition. Two thresholds at once,
   * either of which is enough: the counters on the trigger's own source, and
   * the cards in its controller's hand. An intervening-if, so it is checked
   * again on resolution - the toad does not win if it is bounced in response.
   */
  | { kind: "counters-or-hand-at-least"; count: number };

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
  /**
   * "Whenever an opponent casts their **first** noncreature spell **each
   * turn**." - Esper Sentinel.
   *
   * A narrowing on the *caster's* turn history rather than on the spell, which
   * is why it sits here and not in `watchFor`: the same spell fires this or does
   * not depending on what that player has already cast. Counted off
   * `spellTypesCastThisTurn`, the list the hate pieces already keep, so there is
   * no second tally to go stale.
   */
  onlyFirstNoncreatureEachTurn?: boolean;
  /**
   * "Whenever you attack with **this creature and/or your commander**" - Ainok
   * Strike Leader.
   *
   * `creatures-attack` only. A narrowing on *which* of the declared attackers
   * count, and it names two specific permanents rather than a class of them, so
   * it cannot be written as a `watchFor`: that reads one subject's printed
   * characteristics and neither "this one" nor "your commander" is one of those.
   *
   * The "and/or" is the reason this is a membership test rather than two
   * triggers - both attacking is still one trigger, not two.
   */
  attackersIncludeSelfOrCommander?: boolean;
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
     * "Whenever a **non-Human** creature you control attacks" - Winota.
     *
     * The mirror of `subtype`, and it has to be its own field rather than a
     * flag on that one: a card asking for "a non-Human creature" is asking two
     * questions, and folding them together would make "Human" and "not Human"
     * indistinguishable on the fixture.
     *
     * Read off the printed subtypes, like `subtype` above. The day a changeling
     * enters this pool both need to move to `hasCreatureType` together.
     */
    excludeSubtype?: string | string[];
    /**
     * "a creature you control **with a +1/+1 counter on it**" - Meltstrider
     * Eulogist. Read at the moment of the event, which for a death means the
     * counters it had on the battlefield: `moveCard` clears them on the way to
     * the graveyard, so a check made afterwards would never once be true.
     */
    withCounter?: boolean;
    /** "another creature you control with power 2 or less enters" - Mentor of the Meek. */
    maxPower?: number;
    /** "a **nontoken** creature you control dies" - Blight Mound. */
    nontoken?: boolean;
    /**
     * "Whenever an artifact or creature an opponent controls enters
     * **untapped**" - Charismatic Conqueror.
     *
     * A narrowing on how the permanent arrived rather than on what it is, and it
     * is the whole drawback of the card: against a deck of taplands the
     * Conqueror does nothing. Read at the moment of the event, which for an
     * arrival is after every enters-tapped rule has been applied.
     */
    untapped?: boolean;
    /**
     * "if **no mana was spent** to cast it" - Boromir. `spell-cast` only.
     *
     * Read off the spell on the stack, which knows what was paid for it. The
     * card prints this as an intervening-if and it is answered here instead,
     * because a spell's cost cannot change once it has been cast: checked once
     * or twice, the answer is the same.
     */
    freeSpell?: boolean;
    /**
     * "Whenever **equipped** creature dies" - Skullclamp. Only the one creature
     * this Equipment is currently attached to, so the watcher has to compare
     * against its own `attachedTo` rather than against a class of permanents.
     */
    attachedToThis?: boolean;
    /** "if you didn't cast it from your hand" - Chainer, on a creature that entered another way. */
    notCastFromHand?: boolean;
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
  /**
   * "Alliance - choose one **that hasn't been chosen this turn**" - Gala
   * Greeters. A modal trigger whose engine-picked mode rotates: each firing this
   * turn takes the first mode not yet used on this source, tracked in
   * `CardInstance.modesChosenThisTurn`. Absent, a modal trigger simply takes its
   * first mode every time (Elder Gargaroth).
   */
  modalOncePerTurn?: boolean;
  /** "Whenever you draw your **second** card each turn" - Gixian Puppeteer. `card-drawn` only; fires only on the drawer's Nth draw. */
  nthDrawThisTurn?: number;
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
  /**
   * "**Exile this creature**: ..." - Nyx Weaver's graveyard-recursion ability.
   * Like `sacrificeSelf`, the source pays for the ability by leaving the
   * battlefield - to exile rather than the graveyard - so the ability still
   * resolves from a source that is already gone.
   */
  exileSelf?: boolean;
  /**
   * "**Sacrifice a Treasure**: ..." - Professional Face-Breaker, the first cost
   * in the pool that gives up a permanent other than the source.
   *
   * Named by subtype because that is how every printing of this shape reads. The
   * engine picks the first one it finds: they are identical tokens, and a chooser
   * for "which of your three Treasures" would be a question with one answer.
   */
  sacrificeSubtype?: string;
  /**
   * "**Exile this card from your hand**: Add {R}." - Simian Spirit Guide, and
   * "**Discard this card**" - the Channel lands, Eiganjo and Sokenzan.
   *
   * Two things at once, deliberately: it is the cost paid, and it is what makes
   * the ability activatable from hand at all. A separate `fromHand` flag would be
   * a second place for the same fact, and an ability with the flag and no cost
   * would be a card that can be activated from hand for free.
   *
   * Paid on activation like every other cost, so the ability resolves from a
   * graveyard or an exile zone - the same shape `sacrificeSelf` already has, and
   * the reason a fetchland's search still happens.
   */
  fromHand?: "exile" | "discard";
  /**
   * "Discard a card" as a cost - Psychic Frog's first ability. Which card is
   * the player's choice, announced with the activation the way a spell's
   * sacrifice cost is (`sacrificeInstanceId`), not asked for on resolution.
   */
  discard?: number;
  /**
   * "Exile N cards from your graveyard" as a cost - Psychic Frog's second
   * ability. Taken from the top of the graveyard, the same documented
   * simplification Delve uses: the choice of which cards to exile from a
   * hidden-order zone changes nothing this deck can read.
   */
  exileFromGraveyard?: number;
  /** "Remove a wish counter from this artifact" as a cost - Wishclaw Talisman. */
  removeOtherCounter?: number;
  /** "Remove a +1/+1 counter from this creature" as a cost - The Duke, Rebel Sentry. */
  removePlusOneCounter?: boolean;
  /** "Return Shigeki to its owner's hand" as a cost - Shigeki, Jukai Visionary. */
  returnSelfToHand?: boolean;
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
  | "opponent-lands"
  /**
   * "...of any color among **legendary creatures and planeswalkers you
   * control**." - Mox Amber.
   *
   * A Mox that taps for nothing on an empty board, which is the whole card: it
   * is a fast rock in a deck full of legends and a blank in anything else. The
   * colours come from the permanents themselves rather than from a deck-wide
   * identity, so it changes every time a legend arrives or dies.
   */
  | "your-legendary-permanents"
  /**
   * "...of any of **the exiled card's** colors." - Chrome Mox.
   *
   * The only source in this list that is about one particular permanent rather
   * than about the board, which is why `colorAllowed` had to learn to take the
   * permanent being activated: two Chrome Moxen can imprint different cards and
   * tap for different colours, and nothing about their controller distinguishes
   * them.
   */
  | "imprinted-card";

/**
 * "Spend this mana only to cast a legendary spell, and that spell can't be
 * countered." - Delighted Halfling.
 *
 * Mana that is not interchangeable with the rest of the pool, which is why it
 * cannot simply be added to it. Kept as a closed list for the same reason every
 * other condition here is: one card needs one shape, and inventing a general
 * restriction language now would mean accepting wordings nothing can evaluate.
 */
export type ManaSpendRestriction =
  | {
      kind: "legendary-spell";
      /** "...and that spell can't be countered." Applies to whatever this mana helped pay for. */
      grantsUncounterable?: boolean;
    }
  | {
      /**
       * "Spend this mana only to cast a creature spell of the chosen type" -
       * Cavern of Souls, whose type was named as the land entered.
       */
      kind: "creature-of-chosen-type";
      /**
       * The type actually chosen, stamped onto the mana as it is produced.
       *
       * The restriction on the *card* names no type - it says "the chosen
       * type" - and the choice lives on the land's own `CardInstance`. Copying
       * it onto the mana here means nothing downstream has to find its way back
       * to a permanent that may since have left the battlefield.
       *
       * Absent means the land was never asked, in which case the mana can pay
       * for nothing. That cannot happen in play - the game holds on
       * `pendingEnterChoice` - and a default here would be a Cavern that
       * silently made mana for the wrong deck.
       */
      creatureType?: string;
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
  /**
   * "{T}: Add {C}. **If this land has a luck counter on it**, instead add one
   * mana of any color." - Gemstone Caverns, whose one printed line is six
   * abilities here: the colourless one while it has no counter, and one per
   * colour while it does.
   *
   * Both polarities are needed and that is why it is a boolean rather than a
   * flag: "instead" means the colourless half stops being available the moment
   * the counter is there, and an ability that could be used either way would
   * make the land produce two mana on one tap.
   */
  onlyIfSourceHasCounters?: boolean;
  /**
   * "**Activate each power-up ability only once.**" - Quicksilver.
   *
   * A limit for the whole game rather than the turn, which is the only one of
   * its kind here: `loyaltyUsedThisTurn` and the cast limits all reset. See
   * `CardInstance.abilitiesUsedThisGame`.
   */
  onlyOncePerGame?: boolean;
  /** "Activate only once each turn." - Chainer, Nightmare Adept. Tracked in `CardInstance.abilitiesUsedThisTurn`, cleared each cleanup. */
  onlyOncePerTurn?: boolean;
  /**
   * "**Reduce the cost by his mana cost if he entered this turn.**" -
   * Quicksilver, whose power-up costs {4}{R} and {3}{R} less on the turn he
   * arrived, which is to say {3} for a card that costs {R}.
   *
   * Read through `abilityManaCost`, the one place that answers what an ability
   * costs, so the offer, the payment and the auto-tapper cannot disagree about
   * it.
   */
  costReducedByOwnCostWhenFresh?: boolean;
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
  /**
   * "This ability costs {1} less to activate **for each legendary creature you
   * control**." - the Channel lands.
   *
   * A closed list of one, like every other condition in this DSL. It reduces the
   * generic part only and never below zero, which is what "costs {1} less" means:
   * the coloured pip in {2}{W} survives however many legends are out.
   *
   * Everything that asks what an ability costs has to go through
   * `abilityManaCost` rather than reading `cost.mana`, or the offer and the
   * payment disagree - which shows up as a card the interface refuses to let you
   * activate at a price you can afford.
   */
  costReducedPer?: "legendary-creature-you-control";
  /** "Activate only during your turn." - Wishclaw Talisman. */
  onlyOnYourTurn?: boolean;
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
  /**
   * "Evoke - Exile a white card from your hand." - Solitude and the Incarnations.
   * Choosing the alternative costs exiling a card of this colour from hand (via
   * `options.exileFromHandInstanceId`) in place of the mana cost.
   */
  exileCardFromHand?: { color?: Color };
  /**
   * "You may pay {B} rather than pay this spell's mana cost ..." - Blasphemous
   * Edict. The reduced cost paid when the alternative is chosen; omitted means
   * the alternative is free (paid only by `sacrifice`, or by nothing).
   */
  manaCost?: ManaCost;
  /**
   * "If the {1}{B} cost was paid, **an opponent draws a card**." - Baleful
   * Mastery. An extra effect that runs, before the spell's own, only when the
   * alternative cost was taken - the drawback that pays for the discount.
   */
  riderEffect?: Effect;
}

/**
 * A rider carried by a specific lump of mana, which fires when that mana is
 * spent on a particular kind of spell - Path of Ancestry.
 *
 * Deliberately not a `ManaSpendRestriction`: this mana may be spent on anything
 * at all, and writing it as a restriction would forbid the very plays the card
 * allows. What it carries is a *marking*, not a limit. See `ManaMark`.
 */
export type ManaSpendRider =
  | {
      kind: "scry-on-creature-sharing-commander-type";
      amount: 1;
    }
  /** "Whenever you cast a permanent spell using mana produced by Tecutlan, discover X, where X is that spell's mana value." */
  | { kind: "discover-on-permanent-spell" };

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
  /**
   * "**Nonbasic lands your opponents control enter tapped.**" - Archon of
   * Emeria.
   *
   * The first static in the pool that changes how somebody *else's* permanents
   * arrive. Read at the moment a land enters, like every other enters-tapped
   * question, rather than being applied to lands already in play.
   */
  opponentsNonbasicLandsEnterTapped?: boolean;
  /** "Creatures your opponents control enter tapped." - Authority of the Consuls. */
  opponentsCreaturesEnterTapped?: boolean;
  /** "White spells you cast cost {1} less to cast." - Pearl Medallion. One per matching permanent. */
  reduceControllerSpellsOfColor?: { color: Color; generic: number };
  /** "Players can't untap more than one nonbasic land during their untap steps." - Winter Moon. */
  untapOnlyOneNonbasicLand?: boolean;
  /** "If a nontoken creature would enter and it wasn't cast, exile it instead." - Containment Priest. */
  exileNoncastCreatures?: boolean;
  /** "Noncreature spells cost {N} more to cast." - Thalia, Guardian of Thraben. Symmetric, all players. */
  taxNoncreatureSpells?: number;
  /** "Spells with the chosen name cost {N} more; abilities of that name can't be activated." - Disruptor Flute (reads chosenOnEntry.cardName). */
  disruptorFluteTax?: number;
  /** "If a triggered ability of another creature you control of the chosen type triggers, it triggers an additional time." - Roaming Throne (reads chosenOnEntry.creatureType). */
  roamingThroneChosenTypeDoubler?: boolean;
  /**
   * Elesh Norn, Mother of Machines: a permanent entering makes your permanents'
   * triggered abilities trigger an additional time, and makes your opponents'
   * not trigger at all. Both halves come from this one flag.
   */
  eleshNornEntersDoubler?: boolean;
  /**
   * "If an opponent would search a library, that player searches the **top
   * four cards** of that library instead." - Aven Mindcensor.
   *
   * A number rather than a flag, because the card prints one and a second card
   * with a different number would otherwise need a second rule.
   */
  opponentSearchesTopCards?: number;
  /**
   * "**Spells you control can't be countered.**" - Hexing Squelcher.
   *
   * Distinct from `CardDefinition.cantBeCountered`, which is a property of one
   * card. This protects everything its controller casts for as long as it is on
   * the battlefield, so it is asked at the moment something tries to counter
   * rather than stamped onto the spell.
   */
  /**
   * "**Mardu** - If a creature attacking causes a triggered ability of a
   * permanent you control to trigger, that ability triggers an additional
   * time." - Windcrag Siege.
   *
   * The value is the mode this half belongs to, not a flag: the card prints
   * both halves and only one of them is live, decided by the choice made as it
   * entered. A plain boolean would make a Jeskai Siege double triggers too.
   */
  doublesAttackTriggersWhenMode?: string;
  yourSpellsCantBeCountered?: boolean;
  /** "You may play an additional land on each of your turns" - Icetill Explorer. */
  extraLandDrops?: number;
  /** "**Each player** may play an additional land on each of their turns" - Rites of Flourishing. Symmetric, so read off any player's battlefield. */
  extraLandDropsAllPlayers?: number;
  /** "You may play lands from your graveyard" - Icetill Explorer's second line. */
  playLandsFromGraveyard?: boolean;
  /** "Skip your draw step." - Necrodominance. */
  skipDrawStep?: boolean;
  /** "Your maximum hand size is five." - Necrodominance. */
  maxHandSize?: number;
  /**
   * "Delirium - As long as there are four or more card types among cards in your
   * graveyard, **each opponent's maximum hand size is equal to seven minus the
   * number of those card types.**" - Winter, Misanthropic Guide.
   *
   * A cross-player static: it reads this permanent's *controller's* graveyard
   * and imposes a limit on every *other* player. So unlike the hand-size rules
   * above - which a player reads off their own battlefield - this one is found
   * by scanning opponents' battlefields, and is why the cleanup loop grew a
   * second pass. Off below four card types; at four it is 3, at seven it is 0.
   */
  opponentHandSizeIsSevenMinusControllerGraveyardTypes?: boolean;
  /**
   * "**Other Goblin creatures you control attack each combat if able.**" -
   * Goblin Rabblemaster.
   *
   * The value is the creature type it compels, not a flag, for the same reason
   * `doublesAttackTriggersWhenMode` holds a mode: a second card of this shape
   * naming a different type must not need a second rule.
   *
   * "If able" is the whole of the enforcement: a creature that is tapped,
   * summoning sick or has defender is not able, and is simply not required.
   * See `attackRequirement`, which is the one place that decides.
   */
  othersOfSubtypeMustAttack?: string;
  /** "You have no maximum hand size." - Reliquary Tower. Wins over any maxHandSize while it is in play. */
  noMaxHandSize?: boolean;
  /**
   * "Your maximum hand size is twenty." - Twenty-Toed Toad.
   *
   * Sets the limit to a specific number rather than trimming it: where
   * `maxHandSize` is a reduction (Necrodominance's five, taken as the smaller of
   * it and seven), this is a raise, and it overrides the base seven outright. A
   * later one on the battlefield wins over an earlier, standing in for the
   * timestamp the rules would use; `noMaxHandSize` still trumps it.
   */
  setMaxHandSize?: number;
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
/**
 * One continuous effect of the "anthem"/"lord" pattern.
 *
 * A card may carry more than one - Greymond grants keywords unconditionally
 * and gives +2/+2 only while you control four Humans, which are two effects
 * with different lifetimes and cannot be written as one.
 */
export interface StaticBuff {
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
   * warded creature's own definition carries no ward cost. (Distinct from
   * `grantsWardLife`, which is ward paid in life rather than mana.)
   */
  grantsWardCost?: ManaCost;
  /**
   * "has protection from instants and from sorceries" - Sword of Wealth and
   * Power. The card types the equipped/affected creature cannot be the target
   * of a spell of. Modelled as the can't-be-targeted facet of protection,
   * which is the one this deck turns on; the damage-prevention and
   * can't-be-blocked-by facets are not (a documented simplification - almost
   * every instant or sorcery that touches a creature does so by targeting it).
   */
  grantsProtectionFrom?: CardType[];
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
  /**
   * "As long as you have 30 or more life, **this creature** gets +5/+5 and has
   * flying." - Serra Ascendant.
   *
   * The buff reaches its own source and nothing else. Distinct from
   * `includesSelf`, which *adds* the source to a group: left to the default this
   * buff would be an anthem handing +5/+5 to your whole board, which is not a
   * card anybody printed for one white mana.
   */
  selfOnly?: boolean;
  /**
   * "**As long as you control four or more Humans**, Humans you control get
   * +2/+2" - Greymond. Read on every access like everything else here, so
   * the bonus comes and goes with the board rather than being latched.
   */
  condition?: BoardCondition;
  /**
   * "Humans you control have **each of the chosen abilities**" - Greymond,
   * whose keywords were named as it entered rather than printed on it.
   *
   * Read off the *source* permanent's `chosenOnEntry`, which is why
   * `buffsReaching` carries the source alongside the buff. A permanent that
   * was never asked grants nothing, the same posture Sanctum Prelate takes.
   */
  grantsChosenOnEntry?: boolean;
  /**
   * "Other creatures you control have **'Ward - Pay 2 life.'**" - Hexing
   * Squelcher. Ward is not an activated ability, so `grantsAbilities` cannot
   * carry it and `grants` is a keyword list with no cost attached to it.
   */
  grantsWardLife?: number;
}

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
  /**
   * "This creature gets +10/+10 for each player who has lost the game." -
   * Rampant Frogantua. A buff on the creature *itself* whose size is read off
   * the board every time its stats are, so it grows as players fall. Distinct
   * from `staticBuff`, which is a fixed number a permanent hands to others.
   */
  selfBuff?: { power: Amount; toughness: Amount };
  staticBuff?: StaticBuff | StaticBuff[];
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
   * The face this permanent turns into - Ajani, Nacatl Avenger on the back of
   * Ajani, Nacatl Pariah.
   *
   * **Deliberately not `backFaceId`**, which they superficially resemble. A
   * modal double-faced card is a choice made as you play it and the back face is
   * one of two things it could have been; a transforming one is a permanent that
   * *changes form* on the battlefield, and you never choose which side to cast.
   * Written as `backFaceId` the client would open its face picker every time you
   * cast Ajani and offer you a planeswalker for {1}{W}.
   */
  transformsInto?: string;
  /**
   * True on both halves of a Room - Dollmaker's Shop // Porcelain Gallery.
   *
   * A Room is two doors on one permanent, each castable on its own and each
   * unlockable later by paying its cost as a sorcery. It shares `backFaceId`
   * with the modal double-faced cards, because the question asked as you play it
   * is the same one - "which half?" - and the client's face picker is already
   * the right prompt.
   *
   * What is *not* shared is what happens next. An MDFC becomes the face you
   * chose and only that face is ever live; a Room keeps both halves and the one
   * you paid for is merely the one that starts unlocked. See
   * `CardInstance.unlockedDoors`.
   */
  isRoom?: boolean;
  /**
   * "Creatures you control have **base power and toughness each equal to** the
   * number of creatures you control." - Porcelain Gallery.
   *
   * A *setting* rather than an adjustment, which is the whole reason it cannot
   * be a `StaticBuff`: those add to whatever a creature already has, and this
   * replaces it. Read before counters and anthems - layer 7b, ahead of 7c and
   * 7d - so a Gallery creature with a +1/+1 counter is one bigger than the
   * count rather than the count itself.
   *
   * Invisible until something has a counter on it, which is exactly the sort of
   * ordering bug that ships.
   */
  setsBasePowerToughness?: Amount;
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
  /**
   * "**This land is the chosen type.**" - Multiversal Passage, which names a
   * basic land type as it enters and then is that land.
   *
   * The mana ability is derived from the choice by `effectiveActivated` rather
   * than printed, because there is nothing to print: the card has no mana
   * ability of its own at all.
   *
   * A real simplification, and worth naming: the land gains the *ability*, not
   * the subtype. Nothing in this pool asks whether a permanent on the
   * battlefield is a Plains - the fetchlands read the library - so the two are
   * indistinguishable here, and would stop being so the day a card says
   * "Plains you control".
   */
  becomesChosenBasicType?: boolean;
  /**
   * "**Ascend** (If you control ten or more permanents, you get the city's
   * blessing for the rest of the game.)" - Ocelot Pride.
   *
   * A static ability on a permanent, so it is checked continuously rather than
   * on an event - `checkStateBasedActions` is where, alongside the other things
   * the game notices without being asked. Once the blessing is granted it is
   * never taken away, which is what "for the rest of the game" means and is why
   * the flag lives on the player rather than being derived from the board.
   */
  ascend?: boolean;
  /**
   * "This creature can't be blocked except by creatures with flying or reach."
   * - Signal Pest. The printed half of `BlockRestriction`; the granted half
   * lives on the instance.
   */
  blockRestriction?: BlockRestriction;
  /**
   * "Eomer enters with a +1/+1 counter on it **for each other Human you
   * control**."
   *
   * A replacement on the way in rather than an enters-the-battlefield trigger,
   * which is the rule and is visible in play: the creature is never on the
   * battlefield at its printed size, so nothing can respond to it as a 2/2 and a
   * board wipe in response to the trigger cannot catch it small.
   */
  entersWithCounters?: Amount;
  entersTapped?: boolean;
  /**
   * "**This artifact doesn't untap during your untap step.**" - Mana Vault.
   *
   * The untap step untaps everything its controller owns, and until this there
   * was exactly one way out of it: `CardInstance.exerted`, which is spent as it
   * is skipped. This is the other shape - a permanent that never untaps on its
   * own, every turn, for as long as it is in play - so it belongs on the
   * definition rather than on the instance.
   */
  doesNotUntap?: boolean;
  /**
   * "**If this card is in your opening hand**, you may begin the game with it
   * on the battlefield." - Gemstone Caverns and Quicksilver, Brash Blur.
   *
   * The only decision in this engine taken before the game starts, and the only
   * one that is neither a spell, an ability nor a declaration. It is offered
   * once, as the last thing the mulligan does - which is where the rules put it:
   * after opening hands are settled and before the first turn begins.
   *
   * A permanent that arrives this way was never cast, so nothing that watches
   * for a spell sees it. It *does* enter the battlefield, so everything that
   * watches for an arrival does.
   */
  beginsOnBattlefield?: {
    /**
     * "...**and you're not the starting player**" - Gemstone Caverns, which is
     * a catch-up card and says so. Quicksilver has no such clause.
     */
    notStartingPlayerOnly?: boolean;
    /** "...with a **luck counter** on it" - held as an `otherCounters` pip. */
    withCounter?: boolean;
    /** "If you do, **exile a card from your hand**" - the price, and not optional. */
    thenExileFromHand?: boolean;
  };
  /**
   * "**If this artifact would enter, you may discard a land card instead.** If
   * you do, put this artifact onto the battlefield. If you don't, put it into
   * its owner's graveyard." - Mox Diamond.
   *
   * A replacement on the way in, and the only one in the pool that can stop a
   * permanent arriving at all. It applies however the card would arrive, not
   * only when it is cast, which is what "would enter" means.
   *
   * The card waits on the stack while the question is open rather than arriving
   * and being taken back: a Mox that touched the battlefield first would set off
   * every "whenever an artifact enters" on the table for a permanent that never
   * entered.
   */
  entersOnlyIfYouDiscard?: { cardType: CardType };
  /**
   * "**Toxic 1**" - Skrelv. A player dealt combat damage by this creature also
   * gets that many poison counters.
   *
   * A number rather than a keyword, for the same reason `wardLife` is one: the
   * keyword is always printed with a figure beside it, and a second card with a
   * different figure must not need a second keyword.
   *
   * Deliberately not infect, which it superficially resembles. Infect *changes*
   * what damage is - a player loses no life at all - and toxic adds poison on
   * top of ordinary damage. A Skrelv written as infect would deal no damage to
   * anybody's face for the rest of the game.
   */
  toxic?: number;
  /**
   * "**Skrelv can't block.**"
   *
   * Its own field rather than the absence of something, because it is printed
   * text with no other home: `Defender` is the opposite restriction (cannot
   * attack), and there is no keyword for this one.
   */
  cantBlock?: boolean;
  /**
   * "This land enters tapped **unless** ..." - the drawback most nonbasic duals
   * carry, and the reason those cards were refused until now. Writing one as
   * flatly tapped makes it strictly worse than the printed card, so a condition
   * was the only honest way to have them at all.
   *
   * Checked as the permanent arrives; if the condition holds it enters
   * untapped, otherwise `entersTapped` applies as usual.
   */
  /**
   * "Each player can't cast more than one spell each turn" and the rest of the
   * hate pieces - see `ActionRestriction` and restrictions.ts.
   *
   * A list because Grand Abolisher prints two of them in one sentence, and they
   * are genuinely two: one stops casting and one stops activating, and a card
   * that removed only half would be a different card.
   */
  staticRestrictions?: ActionRestriction[];
  /** "As this permanent enters, choose ..." - see `EnterChoice`. */
  enterChoice?: EnterChoice;
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
  /** "Fading N" - enters with N fade counters (held as other-counters); at your upkeep remove one, and sacrifice it if you can't. Parallax Wave. */
  fading?: number;
  /**
   * A Saga: one effect per chapter (I, II, III...). A lore counter is added as it
   * enters and after each of your draw steps; the chapter at that count fires,
   * and the Saga is sacrificed after the last. The Mountain-king's Return.
   */
  saga?: { chapters: Effect[] };
  /**
   * "Prototype {1}{W}{W} - 3/3 (You may cast this spell with a different mana
   * cost, colour and size. It keeps its abilities and types.)" - Steel Seraph.
   * Cast for the prototype cost and the creature enters with the prototype P/T.
   */
  prototype?: { cost: ManaCost; power: number; toughness: number };
  /** "Impending N - {cost}" - cast for the impending cost, enters with N time counters and isn't a creature until the last is removed. Overlord of the Mistmoors. */
  impending?: { timeCounters: number; cost: ManaCost };
  /**
   * "Warp {2}{U}{U} (You may cast this card from your hand for its warp cost.
   * Exile this creature at the beginning of the next end step, then you may cast
   * it from exile on a later turn.)" - Starwinder.
   *
   * An alternative way to cast, taken with `CastOptions.useWarp`: the spell is
   * cast from hand for `cost` and resolves as normal, but it leaves at the next
   * end step (marked `exileAtNextEndStep` as it is cast) and, once exiled that
   * way (`warpedInExile`), may be cast from exile for its ordinary mana cost on
   * a later turn. Cast for its normal cost, none of that applies - it is simply
   * a creature.
   */
  warp?: { cost: ManaCost };
  /**
   * "You may cast this card from your graveyard by removing six counters from
   * among creatures you control in addition to paying its other costs." -
   * Quilled Greatwurm. The additional cost is `removeCounters` +1/+1 counters
   * spread across the caster's creatures however they like, announced with the
   * cast via `CastOptions.removeCounterFrom`. See casting.ts.
   */
  castFromGraveyard?: { removeCounters: number };
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
  /**
   * An Aura: what it enchants. The spell targets this on cast and attaches to it
   * as it enters (the same shape bestow already uses). An Aura on the battlefield
   * whose host has gone is put into its owner's graveyard by a state-based action.
   */
  enchant?: TargetSelector;
  /** "Enchanted creature can't attack or block." - Pacifism. */
  auraCantAttackOrBlock?: boolean;
  /**
   * Dog Umbra: while ANOTHER player controls the enchanted creature it can't
   * attack or block; while you control it, the Aura has umbra armor (totem armor).
   */
  dogUmbra?: boolean;
  bestowCost?: ManaCost;
  /**
   * "**Dash {1}{R}**" - Ragavan.
   *
   * An alternative cost with two riders attached: the creature gains haste, and
   * it goes back to its owner's hand at the beginning of the next end step. Both
   * are the card, and a Dash that only changed the price would be a strictly
   * better creature.
   *
   * Separate from `alternativeCost`, which is the free-cast family: that one is
   * offered when a board condition holds and changes nothing else about the
   * spell. This one is always available and rewrites what you get.
   */
  dashCost?: ManaCost;
  /**
   * "This spell costs {N} less to cast ..." - the generic cost reduction family.
   *
   * Reduces the generic part only, floored at zero, so a coloured pip always
   * survives (rule 601.2f). Two shapes, and a card prints one:
   *
   * - `per` is "for each ...": {1} less per creature on the battlefield
   *   (Blasphemous Act), or per creature card in your graveyard (Overwhelming
   *   Remorse). `generic` is the per-thing amount.
   * - `onlyIf` is a condition: {2} less if you gained life this turn (Mortality
   *   Spear), or with delirium (Drag to the Roots). `generic` is removed once
   *   when the condition holds.
   *
   * Applied through `castCostReduction`, the one door every cost site goes
   * through, so the offer, the auto-tapper and the payment agree - the same
   * discipline `abilityManaCost` keeps for activated abilities.
   */
  costReduction?: {
    generic: number;
    per?: "creatures-on-battlefield" | "creature-cards-in-your-graveyard";
    onlyIf?: BoardCondition;
  };
  /** "This artifact enters under the control of an opponent of your choice." - Pendant of Prosperity. */
  entersUnderOpponentControl?: boolean;
  /** "Demonstrate (When you cast this spell, you may copy it, and an opponent copies it too.)" - Healing Technique. */
  demonstrate?: boolean;
  /** "Exile [this spell]." - Healing Technique goes to exile instead of the graveyard as it resolves. */
  exileAfterResolving?: boolean;
  /**
   * "Rebound - If you cast this spell from your hand, exile it as it resolves. At
   * the beginning of your next upkeep, you may cast this card from exile without
   * paying its mana cost." - Ephemerate. Modeled as a free playable-from-exile
   * permission for the caster's next turn.
   */
  rebound?: boolean;
  /** "As an additional cost to cast this spell, ..." - paid at cast time. */
  additionalCost?: AdditionalCost;
  /** "Kicker {1}{G} ... If this spell was kicked, ..." - Urborg Repossession. An optional extra cost that runs an extra effect. */
  kicker?: { cost: ManaCost; effect: Effect };
  /**
   * The Adventure half of a card - Locthwain Scorn on Virtue of Persistence.
   * Cast for `cost`, its `effect` resolves, and the card is exiled to be cast
   * later as the creature/enchantment for its ordinary cost.
   */
  adventure?: { name: string; cost: ManaCost; effect: Effect };
  /** "Convoke" - creatures may be tapped to help pay, each for {1} or one mana of its colour (Pile On). */
  convoke?: boolean;
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
  /**
   * "Cycling {2}" / "Islandcycling {1}" - "{cost}, Discard this card: Draw a
   * card" (or, with `search`, tutor the named card to hand). Activated from
   * hand; see `cycleCard`.
   */
  cycling?: { cost: ManaCost; search?: { cardType?: CardType; subtypes?: string[] } };
  /**
   * "Ninjutsu {2}{U}" - pay the cost and return an unblocked attacker you
   * control to hand to put this from hand onto the battlefield tapped and
   * attacking. See `ninjutsu` in casting.ts.
   */
  ninjutsu?: { cost: ManaCost };
  /** Omniscience: "You may cast spells from your hand without paying their mana costs." Read by casting.ts. */
  enablesFreeCastFromHand?: boolean;
  /** "Delve" - each card exiled from your graveyard while casting this pays for {1}. See casting.ts. */
  delve?: boolean;
  /**
   * "Offspring {4} (You may pay an additional {4} as you cast this spell. If you
   * do, when this creature enters, create a 1/1 token copy of it.)" - Thundertrap
   * Trainer. Taken with `CastOptions.payOffspring`. See casting.ts.
   */
  offspring?: { cost: ManaCost };
  /**
   * "Storm (When you cast this spell, copy it for each spell cast before it this
   * turn.)" - Radstorm. On cast, a copy of the spell is put on the stack for
   * each spell already cast this turn (`state.spellsCastThisTurn`, read before
   * this cast bumps it). See casting.ts.
   */
  storm?: boolean;
  /**
   * Cleave: the effect used when the spell is cast for its cleave cost (its
   * `alternativeCost`), with the bracketed words removed - Dig Up's tutor
   * widens from a basic land to any card. Used in place of `castEffect`.
   */
  cleaveEffect?: Effect;
  /** "During your turn, nonland permanent cards in your graveyard have retrace." - Six. */
  grantsRetrace?: boolean;
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
   * What this permanent's controller chose as it entered - see `EnterChoice`.
   * Absent until the choice is answered, and absent forever on the great
   * majority of permanents, which are never asked.
   */
  chosenOnEntry?: ChosenOnEntry;
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
  /** Whether this permanent was cast from its owner's hand - Chainer reads it to decide haste. */
  wasCastFromHand?: boolean;
  /** In exile as an Adventure, castable later as the creature/enchantment - Virtue of Persistence. */
  adventuredInExile?: boolean;
  /**
   * While this card is exiled by an Oblivion Ring effect, the instance id of the
   * permanent that exiled it. When that permanent leaves the battlefield its
   * `returnExiledByThis` trigger brings this card back. Cleared on any zone change.
   */
  exiledBy?: string;
  /** For an Aura being cast: the permanent it will attach to as it enters. Cleared on any zone change. */
  enchantTarget?: string;
  /** Modal-trigger modes already taken on this permanent this turn - Gala Greeters' "hasn't been chosen this turn". Cleared each cleanup. */
  modesChosenThisTurn: string[];
  /** Creature subtypes granted on the battlefield - Liliana's "that creature is a black Zombie". Cleared on any zone change. */
  grantedSubtypes?: string[];
  /** Colors granted on the battlefield - the "black" half of the same reanimation. Cleared on any zone change. */
  grantedColors?: Color[];
  /**
   * The creature this was cast to bestow onto, remembered from the cast until
   * the permanent arrives - the stack object is long gone by then.
   */
  bestowTarget?: string;
  /**
   * Warp (Starwinder). Set when the card is cast for its warp cost: the
   * creature it becomes is exiled at the beginning of the next end step.
   */
  exileAtNextEndStep?: boolean;
  /**
   * Warp again. Set as the creature is exiled by the line above, marking the
   * card in exile as one its owner may cast from there for its ordinary mana
   * cost on a later turn.
   */
  warpedInExile?: boolean;
  /**
   * A power/toughness this instance has in place of its definition's - the 1/1
   * an Offspring token copy is printed as while copying everything else about
   * the creature (Thundertrap Trainer). Undefined for all but such tokens.
   */
  basePowerOverride?: number;
  baseToughnessOverride?: number;
  /** Cast for its prototype cost - it enters with the prototype P/T (Steel Seraph). */
  prototypePaid?: boolean;
  /** Cast for its impending cost - not a creature while time counters remain (Overlord of the Mistmoors). */
  impendingActive?: boolean;
  /**
   * Offspring: this creature was cast for its Offspring cost, so a 1/1 token
   * copy of it is made as it enters. Set at cast, spent (and cleared) in
   * `enteredBattlefield`.
   */
  offspringPaid?: boolean;
  /** Whether this planeswalker has already used a loyalty ability this turn. */
  loyaltyUsedThisTurn: boolean;
  /** Time counters, while this card sits suspended in exile. */
  timeCounters: number;
  /** Lore counters on a Saga. */
  loreCounters?: number;
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
  /**
   * Exerted: this permanent does not untap during its controller's next untap
   * step (Combat Celebrant).
   *
   * One flag doing two jobs, and deliberately so. The untap step reads it to
   * skip the permanent and then clears it, which leaves it set for the whole
   * of the turn it was exerted in - and that is exactly the window "if this
   * creature hasn't been exerted **this turn**" asks about. A second
   * `exertedThisTurn` field would be a second place for the same answer to go
   * stale.
   */
  exerted: boolean;
  /**
   * The turn number this permanent arrived on the battlefield, or -1 if it has
   * never been there.
   *
   * A turn number rather than a boolean, so nothing has to remember to clear
   * it: "did this enter *this* turn" is a comparison against
   * `state.turnNumber`, and it stays right through any number of turns without
   * a reset anywhere. Set by `enteredBattlefield`, the one door every arrival
   * goes through.
   */
  /**
   * Qualities this permanent has protection from - see `ProtectionQuality`.
   *
   * Cleared in the cleanup step and on any zone change, like the granted
   * keywords beside it, because every printing in this pool grants it "until end
   * of turn". A card with protection printed on its face would need this to be
   * read through a layer the way `effectiveKeywords` is; nothing here prints one,
   * and `hasProtectionFrom` is the single door so that day is one function.
   *
   * A list rather than a single quality: Mother of Runes can be activated twice
   * in a turn on the same creature, and the second colour does not replace the
   * first.
   */
  protectionFrom: ProtectionQuality[];
  /**
   * "This creature can't be blocked **this turn** except by creatures with
   * haste." - Gingerbrute's ability, and anything else that hands out a
   * blocking restriction for the turn.
   *
   * A list for the same reason `protectionFrom` is one: the ability can be
   * activated twice, and the restrictions accumulate rather than replacing each
   * other - a Gingerbrute that also gained "only fliers may block" would need a
   * blocker with both. Cleared in the cleanup step and on any zone change.
   */
  blockRestrictionsThisTurn: BlockRestriction[];
  /**
   * "That token ... **attacks this combat if able**" - Legion Warboss.
   *
   * A requirement on one creature for one combat, as opposed to Goblin
   * Rabblemaster's, which is a static on the board and is read off the card that
   * prints it. Cleared in the cleanup step with the rest of the turn's state:
   * a token that kept it would be compelled to attack every turn it lived,
   * which is a different and much worse card.
   */
  mustAttackThisCombat: boolean;
  /**
   * Keywords granted "until your next turn" - Emeria's Call's indestructible.
   *
   * A second list beside `grantedKeywords` because the two end at different
   * moments, and that is the only thing separating them: the ordinary list is
   * swept in the cleanup step at the end of every turn, and this one in the
   * *controller's* untap step, which is exactly when "your next turn" arrives.
   * One list with a deadline per keyword would be the same information written
   * twice as awkwardly; `effectiveKeywords` reads both and nothing else does.
   */
  grantedKeywordsUntilYourNextTurn: Keyword[];
  /**
   * "Another target creature you control **gains toxic 1** ... until end of
   * turn." - Skrelv. Added to whatever the card prints, and swept in the
   * cleanup step with the rest of the turn's grants.
   */
  /**
   * Keywords this permanent carries as **counters** - Quicksilver's "double
   * strike counter".
   *
   * Not the same as a granted keyword, and the difference is that a counter does
   * not wear off: it is on the permanent for as long as the permanent is there.
   * Its own list rather than a third entry in `grantedKeywords` for exactly that
   * reason - the cleanup step sweeps those and must never sweep these.
   */
  keywordCounters: Keyword[];
  /**
   * Which of a Room's doors are unlocked - "front", "back", or both.
   *
   * Empty on every other permanent in the game, and read only for a Room: the
   * front definition is the card's identity, and each unlocked door contributes
   * its own definition's abilities. See `unlockedDefinitions`.
   */
  unlockedDoors: Array<"front" | "back">;
  /**
   * Which of this permanent's abilities have been used, for the ones that may
   * only be used once.
   *
   * "Activate each power-up ability **only once**" - Quicksilver. A per-game
   * limit, which is why it lives on the instance and is not reset anywhere: the
   * turn machine sweeps what belongs to a turn, and this belongs to the object.
   */
  abilitiesUsedThisGame: number[];
  /** Ability indices used this turn - Chainer's "activate only once each turn". Cleared each cleanup. */
  abilitiesUsedThisTurn?: number[];
  toxicThisTurn: number;
  /**
   * "...and **hexproof from that color** until end of turn." - Skrelv.
   *
   * Not the same as protection, and the difference is exactly why it needs its
   * own list: protection stops damage, enchanting, blocking *and* targeting,
   * while hexproof stops only targeting - and only by an opponent. A creature
   * with hexproof from white can still be blocked by a white creature and still
   * takes damage from a white one; it just cannot be pointed at.
   */
  hexproofFrom: ProtectionQuality[];
  /**
   * The card this permanent has imprinted - Chrome Mox's exiled spell.
   *
   * An instance rather than a set of colours, because the card is a real object
   * in the exile zone that a player can look at, and reading its colours when
   * they are wanted keeps one answer rather than a copy that could go stale.
   * Absent means nothing was imprinted, which for Chrome Mox means a permanent
   * that produces no mana ever.
   */
  imprintedInstanceId?: string;
  /**
   * "**You may play that card this turn**" - Professional Face-Breaker, and
   * Ragavan's "until end of turn, you may cast that card".
   *
   * Permission to play one specific card from exile, granted to one player until
   * a turn ends. On the instance because that is what the permission is about -
   * this card, not this zone - and stamped with the turn rather than cleared in
   * cleanup so it cannot outlive its window by one step.
   *
   * `lands` is the difference between the two cards: Face-Breaker says "play",
   * which includes a land drop, and Ragavan says "cast", which does not.
   */
  playableFromExile?: { playerId: string; untilTurn: number; lands: boolean; free?: boolean };
  /** Exiled with Share the Spoils: the active player may play or cast it from exile any turn, and it re-fills the pile when played. */
  shareTheSpoilsExiled?: boolean;
  /**
   * Cast for its dash cost - Ragavan.
   *
   * Recorded on the card rather than on the spell, because both riders land as
   * the permanent *arrives*: the haste and the delayed return are set up in
   * `enteredBattlefield`, long after the stack object has gone. Cleared by the
   * zone change that sends it home, so a Ragavan cast normally next turn is an
   * ordinary Ragavan.
   */
  dashed?: boolean;
  /**
   * "This land **becomes a 1/1 Phyrexian Blinkmoth artifact creature** with
   * flying and infect until end of turn. **It's still a land.**" - Inkmoth Nexus,
   * and Blinkmoth Nexus beside it.
   *
   * The one thing in this engine that changes what a permanent *is* while it sits
   * on the battlefield, which is why it forced five `def.types.includes("Creature")`
   * checks to become `typesOf` calls: a land that is a creature this turn has to
   * be able to attack, to be blocked, to die to damage, and to be targeted by
   * "target Blinkmoth creature".
   *
   * "Still a land" is the easy half - the types are added rather than replaced.
   *
   * Cleared in the cleanup step and on any zone change, like every other
   * until-end-of-turn field. A second animation replaces the first rather than
   * stacking, which is what two activations of the same ability actually do: both
   * set it to a 1/1, and the later one is the one that applies.
   */
  animation?: {
    power: number;
    toughness: number;
    /** "a 1/1 Phyrexian Blinkmoth artifact creature" - the creature types it gains. */
    subtypes: string[];
    /** "with flying and infect". */
    keywords: Keyword[];
  };
  enteredOnTurn: number;
  /**
   * Who controlled this before somebody took it until end of turn, if anybody
   * has.
   *
   * The cleanup step reads this to hand the permanent back. Set only by a
   * temporary control change and only if it is not already set, so two effects
   * stealing the same permanent in one turn still return it to whoever really
   * owns the board position rather than to the first thief.
   *
   * Not the same as `ownerId`, which never changes: control and ownership come
   * apart the moment anything steals a creature, and Homeward Path is the card
   * that reads the difference.
   */
  controlGainedFrom?: string;
  isCommander: boolean;
  summoningSickness: boolean;
}

/**
 * What a delayed trigger does when its end step arrives. A closed list of the
 * phrases the pool prints, like every other list in this DSL.
 */
export type DelayedAction = "sacrifice" | "exile" | "return-to-hand" | "return-from-exile";

/**
 * "Sacrifice it at the beginning of the next end step." - a one-shot ability
 * that is set up now and fires later, over permanents that are already known.
 *
 * The first thing in this engine that is scheduled rather than watched. It is
 * not a `TriggeredAbility`: those are printed on a card and fire whenever their
 * event happens, while this exists once, belongs to no permanent, and is gone
 * after it goes on the stack. The source that set it up may well be dead by
 * then - Kiki-Jiki can be killed and its token is still sacrificed - which is
 * why the permanents are held here by id rather than looked up from the card.
 */
export interface DelayedTrigger {
  /**
   * When this fires - the next end step by default, or the end of the current
   * combat for The Ring's third ability ("sacrifices it at end of combat").
   *
   * Two moments rather than one because the cards say two, and the difference
   * is a whole extra combat phase in a deck that makes them.
   */
  at?: "end-step" | "end-of-combat";
  /** The permanents this was set up over. Ones that have already left are simply not there any more. */
  instanceIds: string[];
  /** Who controls the ability, and so who the sacrifice is made by. */
  controllerId: string;
  /** The card that scheduled it, for the log and the stack panel. Need not still exist. */
  sourceInstanceId: string;
  action: DelayedAction;
  /**
   * Phelia's rider: on a "return-from-exile" trigger, put a +1/+1 counter on the
   * source if the returned card came back under this ability's controller.
   */
  returnCounterToSource?: boolean;
  /**
   * The earliest turn whose end step this may fire in.
   *
   * "The **next** end step" is the current turn's when the ability resolved
   * before it, and the next turn's when it resolved during it - activate
   * Kiki-Jiki in your own end step and the token lives until the following one.
   * Storing the turn rather than a "seen one already" flag means an end step
   * that is somehow reached twice cannot fire it twice.
   */
  readyOnTurn: number;
}

export type StackTarget =
  | { kind: "player"; playerId: string }
  | { kind: "card"; instanceId: string }
  /** A spell already on the stack, identified by its StackObject id rather than a card instance. */
  | { kind: "spell"; stackObjectId: string };

export interface StackObject {
  /**
   * Which half of a Room was cast - the door that will be unlocked when it
   * arrives.
   *
   * On the stack object rather than on the card, because the card passes through
   * `moveCard` on its way here and that clears the instance's own door list. The
   * choice is settled at cast time, like a mode, and carried until the permanent
   * exists to hold it.
   */
  roomDoor?: "front" | "back";
  /**
   * Whether any mana was actually spent casting this spell.
   *
   * "Whenever an opponent casts a spell, **if no mana was spent to cast it**,
   * counter that spell." - Boromir, whose whole job is punishing the free
   * spells: Deflecting Swat, Force of Will, and a suspended card coming off its
   * last time counter.
   *
   * Recorded as the spell is cast, because that is when it is knowable and it
   * never changes afterwards - which is also why the trigger reads it as a
   * narrowing rather than as an intervening-if. A condition that cannot become
   * false gives the same answer checked once or twice.
   */
  noManaSpent?: boolean;
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
  /**
   * A copy of a spell (Storm, Sword of Wealth and Power), not a real card on the
   * stack. It resolves like the spell it copies but ceases to exist afterwards
   * rather than going to a graveyard - so `finishResolution` must not move the
   * card `sourceInstanceId` still points at, which for a Storm copy is the
   * original spell sitting lower on the same stack.
   */
  isCopy?: boolean;
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
  cost?: { mana?: ManaCost; life?: number; energy?: number };
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
  /**
   * `"exile-imprint"` is Chrome Mox: the chosen card is exiled and remembered on
   * the permanent that asked, which is what makes imprint different from any
   * other exile - the card goes on doing something from over there.
   */
  /**
   * `"discard-to-enter"` is Mox Diamond: the chosen card is discarded and the
   * permanent that asked arrives. Declining puts *it* in the graveyard instead,
   * which is the half that makes this a replacement rather than an ability.
   */
  /**
   * `"begin-on-battlefield"` and `"exile"` are the two halves of Gemstone
   * Caverns: the offer, and the price paid for taking it.
   */
  mode:
    | "sacrifice"
    | "cast-free"
    | "to-hand"
    /** `"to-library-top"` (Brainstorm) and `"to-battlefield"` (Emergent Ultimatum's free-cast siblings) - Dan's Felix cards. */
    | "to-library-top"
    | "to-battlefield"
    | "exile-imprint"
    | "discard-to-enter"
    | "begin-on-battlefield"
    | "exile"
    /**
     * `"keep-one-per-type"` is Ajani's -4: the cards chosen are the ones kept,
     * and every other candidate is sacrificed. The inverse of every other mode
     * here, where the chosen cards are the ones something happens to.
     */
    | "keep-one-per-type"
    /** `"ring-bearer"` is The Ring: the creature named is the one that bears it. */
    | "ring-bearer";
  /**
   * The types a "keep-one-per-type" answer may hold at most one of each of -
   * "an artifact, a creature, an enchantment, and a planeswalker".
   *
   * Carried on the question because it is what makes an answer legal, and the
   * player answering has to be told the rule as well as bound by it.
   */
  keepTypes?: CardType[];
  /** A price paid only if something is chosen - Ripples of Undeath. */
  cost?: { mana?: ManaCost; life?: number; energy?: number };
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
   * Cards to move to the bottom of the library once the choice is made -
   * everything looked at but not taken (Thundertrap Trainer's "put the rest on
   * the bottom"). The taken card is filtered out when this is applied.
   */
  restToBottom?: string[];
  /** The to-battlefield chosen cards arrive tapped - Rampant Frogantua's lands. */
  toBattlefieldTapped?: boolean;
  /** "up to three ... with different names" - the chosen must have distinct names (Emergent Ultimatum). */
  distinctNames?: boolean;
  /**
   * Which half of Emergent Ultimatum this choice is: "search" is the caster
   * exiling up to three cards, "opponent-pick" is the opponent choosing one of
   * them to shuffle back (the rest are then cast for free). Drives the bespoke
   * follow-on in `resolveCardChoice`.
   */
  emergentStep?: "search" | "opponent-pick";
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

/**
 * A colour waiting to be named, and the permanent the answer lands on.
 *
 * Parked during a resolution rather than before one, like `PendingSearch` and
 * unlike `PendingTargetChoice`: the target was chosen when the ability went on
 * the stack, and only the colour is still open. That ordering is the card -
 * Mother of Runes is played by pointing at a creature early and naming the
 * colour late.
 *
 * While this is set nobody holds priority and no step advances, the same as
 * every other pending question here.
 */
export interface PendingColorChoice {
  playerId: string;
  /** The card that asked, so the client can show it beside the question. */
  sourceInstanceId: string;
  prompt: string;
  /** The permanent that gains the protection once a colour is named. */
  targetInstanceId: string;
  /** Whether "colorless" is one of the answers. Giver of Runes is the only card that offers it. */
  allowColorless: boolean;
  /**
   * What the named colour buys, once it is named.
   *
   * Carried on the question rather than looked up from the card, for the same
   * reason a "you may" holds its whole stack object: the permanent that asked
   * may be dead by the time the answer comes, and the ability still resolves.
   */
  grants?: Array<"protection" | "hexproof-from" | "unblockable-by">;
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
   * How many of the candidates the ability wants - "**one or two** target
   * attacking creatures".
   *
   * Carried on the pending choice rather than re-derived by whoever is
   * answering, because the client, the bot and the server all have to agree on
   * it and the selector is the only thing that knows. Every trigger before
   * Raph & Leo wanted exactly one, which is what both fields say for them.
   */
  min: number;
  max: number;
  /**
   * The ability itself, built and ready, needing only its `targets` filled in.
   *
   * Held whole for the same reason `PendingConfirmation` does: by the time it
   * is answered the permanent that printed it may be dead, and an ability on
   * the stack is independent of its source.
   */
  object: StackObject;
  /**
   * True when the object is **already on the stack** and only its targets are
   * being replaced - Deflecting Swat.
   *
   * Every other pending choice holds an ability that has not been put on the
   * stack yet and is pushed once answered. Pushing this one would put the same
   * spell on the stack twice.
   */
  retarget?: boolean;
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
  /**
   * "...onto the battlefield **tapped and attacking**" - Winota. Carried here
   * rather than applied when the search is set up, because the card is not on
   * the battlefield until somebody answers the picker.
   */
  attacking?: boolean;
  /** "It gains indestructible until end of turn" - Winota, again. */
  grants?: Keyword[];
  /**
   * "Put **the rest** on the bottom of your library in a random order."
   *
   * Every card this effect looked at, chosen or not. Whichever one is taken is
   * removed from this list before the rest go to the bottom, so a card cannot
   * be both deployed and buried.
   *
   * Distinct from the candidates: Winota looks at six and may only take a
   * Human, so five of the six are never offered and all five still go to the
   * bottom.
   */
  bottomInstanceIds?: string[];
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
/**
 * A modal triggered/activated ability shown to its controller, waiting on which
 * mode to take. The chosen mode's effect is applied by `resolveModal`, which
 * auto-targets it (a simplification of the player's target choice).
 */
export interface PendingModal {
  playerId: string;
  controllerId: string;
  sourceInstanceId: string;
  modes: Array<{ label: string; effect: Effect }>;
}

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
   * How many turns this player has begun, counting the one in progress.
   *
   * Not derivable from `state.turnNumber` for anything but a two-player game
   * with no extra turns, and the card that reads it - Starting Town - says "your
   * first, second, or third turn of the game". 1 for the starting player from
   * the moment the game begins, because their first turn is already under way.
   */
  turnsTaken: number;
  /**
   * Every spell this player has cast this turn, as that spell's card types.
   *
   * The types rather than a count, because the cards ask three different
   * questions of the same tally - "more than one spell", "more than one
   * noncreature spell", "additional nonartifact spells" - and three counters
   * would be three things to keep in step.
   */
  spellTypesCastThisTurn: CardType[][];
  /** Cards drawn this turn - Spirit of the Labyrinth's limit is checked against it. */
  cardsDrawnThisTurn: number;
  /** "You may cast a creature spell from your graveyard this turn." - Chainer. Cleared each cleanup. */
  mayCastCreatureFromGraveyardThisTurn?: boolean;
  /** "You descended if a permanent card was put into your graveyard from anywhere." - Brass's Tunnel-Grinder. Cleared each cleanup. */
  descendedThisTurn?: boolean;
  /**
   * Poison counters. Ten of them loses the game, checked as a state-based
   * action beside the life total.
   */
  poisonCounters: number;
  /** Energy counters (Guide of Souls). Gained with {E}, spent to pay {E} costs. */
  energy: number;
  /** "protection from everything until your next turn" - The One Ring. Prevents all damage to you; cleared at your untap. */
  protectionFromEverything?: boolean;
  /**
   * How many of The Ring's four abilities this player has - 0 while they have
   * never been tempted.
   *
   * On the player because The Ring is an emblem: it is not a permanent, nothing
   * can remove it, and it survives its bearer dying and every board wipe. The
   * abilities themselves belong to the *bearer* and are read off this - see
   * `ringAbilities`.
   */
  ringLevel: number;
  /**
   * The creature this player has named as their Ring-bearer, or null.
   *
   * Named each time they are tempted - and they may keep the one they have,
   * which is why this is remembered rather than re-chosen from scratch. A
   * bearer that dies leaves this pointing at nothing, and the abilities simply
   * stop applying until a new one is named.
   */
  ringBearerInstanceId: string | null;
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
  /**
   * The city's blessing - "you get the city's blessing **for the rest of the
   * game**".
   *
   * Never cleared, by the cleanup step or anything else. Granted by
   * `checkStateBasedActions` the moment a player with an Ascend permanent
   * controls ten or more, and true from then on however the board changes,
   * which is the whole difference between Ascend and an ordinary "as long as
   * you control ten permanents".
   */
  hasCitysBlessing: boolean;
  /**
   * "When you next cast an instant or sorcery spell this turn, copy that spell."
   * - Sword of Wealth and Power. A count of pending next-cast copies, each
   * spent (as a copy on the stack) by the next instant or sorcery this player
   * casts. Reset in cleanup - "this turn" is its whole life.
   */
  copyNextInstantOrSorcery: number;
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
  /**
   * Restrictions that belong to the turn rather than to a permanent - Silence.
   * Cleared in the cleanup step, so they outlive the spell that made them and
   * nothing else.
   */
  turnRestrictions: { restriction: ActionRestriction; controllerId: string; boundPlayerId?: string }[];
  /**
   * A permanent that has just entered and is waiting on its controller's
   * choice. Like `pendingSearch`, the game holds here until it is answered.
   */
  pendingEnterChoice: PendingEnterChoice | null;
  activePlayerIndex: number;
  priorityPlayerIndex: number;
  turnNumber: number;
  phase: Phase;
  step: Step;
  stack: StackObject[];
  /** How many players in a row have passed priority without a new action. Resets on any action; hitting players.length means the stack resolves or the step advances. */
  passesInSuccession: number;
  /**
   * Combat phases still owed this turn - "after this phase, there is an
   * additional combat phase".
   *
   * A count rather than a flag: two Combat Celebrants attacking together give
   * two extra phases, and the turn machine spends one each time it would
   * otherwise leave combat. Reset with the turn, so an extra phase granted and
   * never reached (the game ended, or something removed combat) does not turn
   * up on somebody else's turn.
   */
  extraCombatPhases: number;
  /**
   * Which combat phase of this turn is happening - 1 during the ordinary one,
   * 2 in the first extra, and so on.
   *
   * Only "if it's the first combat phase of the turn" reads it today, and that
   * clause is the whole reason Raph & Leo is not an infinite loop.
   */
  combatPhasesThisTurn: number;
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
   * A modal ability waiting on its controller to choose a mode - Glissa
   * Sunslayer. Only from triggered/activated abilities: a modal spell has its
   * mode chosen as it is cast. Gated like `pendingSearch`. Cleared by
   * `resolveModal`.
   */
  pendingModal: PendingModal | null;
  /**
   * Extra turns queued to happen before the turn order rotates on - Time
   * Stretch. Each entry is the id of the player who takes that turn, drained
   * front-first in `startNextTurn`.
   */
  extraTurns: string[];
  /**
   * Effects queued for "the beginning of the next turn's upkeep" - Arcane
   * Denial, Mishra's Bauble. Each fires (as `controllerId`) at the first upkeep
   * whose turn number is at least `fireAtTurn`, then is removed.
   */
  delayedUpkeepEffects: Array<{ controllerId: string; effect: Effect; fireAtTurn: number }>;
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
  /** A colour waiting to be named - Mother of Runes and the other protection granters. */
  pendingColorChoice: PendingColorChoice | null;
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
   * How many spells have been cast so far this turn, by anyone - Storm counts
   * "each spell cast before it this turn". Incremented as each spell goes on the
   * stack and reset in cleanup; the Storm spell reads it *before* its own cast
   * bumps the count, so "before it" falls out for free.
   */
  spellsCastThisTurn: number;
  /**
   * A fog in force for the rest of this turn - Arachnogenesis. Null when there
   * is none, which is almost always. Cleared in the cleanup step.
   */
  combatDamagePrevention: { exceptSubtype?: string } | null;
  /** Obscuring Haze: the id of the player who prevented all damage from their opponents' creatures this turn, or null. */
  preventCreatureDamageFromOpponentsOf: string | null;
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
  /**
   * Delayed triggers waiting for an end step - see `DelayedTrigger`.
   *
   * On the state rather than on the permanents they act over, because that is
   * where they live in the rules: the ability exists whether or not its
   * creatures do, and it belongs to nobody once the source that made it is
   * gone.
   */
  delayedTriggers: DelayedTrigger[];
  /**
   * Who is the monarch, or null while nobody is.
   *
   * On the game rather than on a player because exactly one player has it: two
   * booleans could disagree, and this cannot. Nothing takes it away - it only
   * ever moves - which is what "becomes the monarch" means.
   */
  monarchPlayerId: string | null;
  cardDefinitions: Record<string, CardDefinition>;
  nextInstanceId: number;
  nextStackObjectId: number;
  log: LogEntry[];
}

/**
 * Every continuous effect a card carries, however it was written.
 *
 * One field that takes either a buff or a list of them, rather than two fields
 * or a rename of eleven fixtures - the same shape `watchFor.type` and
 * `searchLibrary.cardType` already use, for the same reason: it is one
 * question, and every reader has to go through here anyway.
 */
export function staticBuffsOf(def: CardDefinition | undefined): StaticBuff[] {
  if (!def?.staticBuff) return [];
  return Array.isArray(def.staticBuff) ? def.staticBuff : [def.staticBuff];
}
