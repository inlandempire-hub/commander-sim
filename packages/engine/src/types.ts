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
  | "Reach"
  | "Defender"
  | "Hexproof"
  | "Indestructible"
  | "Ward"
  | "Flash";

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
}

export type TargetSelector =
  | { kind: "any-target" }
  /**
   * "Target creature", or - with `subtypes` - "target Insect, Rat, Spider, or
   * Squirrel" (Swarmyard). Any one of the listed subtypes qualifies.
   */
  | { kind: "creature"; subtypes?: string[] }
  | { kind: "player" }
  | { kind: "opponent-of-controller" }
  /** "Target spell" - a spell on the stack, as opposed to a triggered or activated ability. */
  | { kind: "spell" }
  /**
   * "Target land", "Target artifact", "Target enchantment" - a permanent on the
   * battlefield of a named type. Creatures keep their own `creature` selector
   * because nearly every card in the pool uses it; this covers the rest.
   * Hexproof applies here exactly as it does to creatures - it protects any
   * permanent, not just creatures.
   */
  | { kind: "permanent"; cardType: CardType }
  /**
   * "Target creature card in your graveyard", and the other card types the
   * recursion spells name. Omitting `cardType` means "target card", which a
   * few of them genuinely say. Hexproof is irrelevant here - it only protects
   * permanents on the battlefield.
   */
  | { kind: "card-in-your-graveyard"; cardType?: CardType }
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
  | { kind: "draw"; amount: number }
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
  | { kind: "gainLife"; amount: number }
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
  /** Puts `amount` +1/+1 counters on the target creature, or on the effect's own source if no target is given. */
  | { kind: "addCounter"; amount: number }
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
  /** "Create N X tokens." `tokenDefinitionId` must name a definition flagged `isToken`. */
  | { kind: "createToken"; count: number; tokenDefinitionId: string }
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
  | { kind: "pump"; power: number; toughness: number; target?: TargetSelector }
  /**
   * The untargeted mass version: "Creatures you control get +N/+N until end of
   * turn" (`scope: "controller"`) or "All creatures get -N/-N until end of
   * turn" (`scope: "all"`) - the latter being how this engine gets a board wipe
   * without a separate effect kind.
   */
  | { kind: "pumpAll"; power: number; toughness: number; scope: "controller" | "all" }
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
      destination: "hand" | "battlefield";
      tapped?: boolean;
    };

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
  | { kind: "controls-color"; color: Color; count: number };

/** The tapland half of `BoardCondition`, named for where it reads. */
export type EntersUntappedCondition = BoardCondition;

export interface TriggeredAbility {
  /**
   * `enters-battlefield`, `attacks` and `dies` all watch the card the ability
   * is printed on. `landfall` and `permanent-enters` watch the battlefield.
   *
   * The distinction matters and was got wrong: eight lifegain creatures
   * ("Whenever another creature you control enters, you gain 1 life") were
   * written as `enters-battlefield`, which fires only when the card itself
   * arrives - so they gained life exactly once, at the one moment their own
   * text excludes, and never again.
   */
  event:
    | "enters-battlefield"
    | "attacks"
    | "dies"
    | "landfall"
    | "permanent-enters"
    /**
     * "Whenever you gain life." Watches the *controller* of the permanent the
     * ability is printed on, so it fires however the life arrived - a spell, a
     * land, lifelink in combat - rather than needing every source to know about
     * it. See gainLife in life.ts, which is the one door all life gain goes
     * through for exactly that reason.
     */
    | "gain-life";
  effect: Effect;
  /**
   * `permanent-enters` only. Whose permanents this watches: "controller" for
   * "another creature *you control* enters", which is the common case, or
   * "any" for "another creature enters" (Soul Warden, Essence Warden), which
   * watches every player's side of the table.
   */
  watches?: "controller" | "any";
  /**
   * `permanent-enters` only. Whether the watcher's own arrival counts.
   *
   * Almost every card of this shape says "*another* creature", so this
   * defaults to false. Kor Celebrant is the one that says "this creature or
   * another creature you control", and needs it true.
   */
  includesSelf?: boolean;
  /**
   * `permanent-enters` only. Which permanents set it off.
   *
   * Most of this family watch creatures, but not all: Tanglespan Lookout is
   * "whenever an Aura you control enters, draw a card", and was written as an
   * `enters-battlefield` draw - so it drew a card on arrival, which the real
   * card does not do, and never drew one for an Aura. Omitting this watches
   * every permanent, which no card in the pool currently wants; write it out.
   */
  watchFor?: { type?: CardType; subtype?: string };
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

export interface ActivatedAbility {
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
  staticBuff?: { power: number; toughness: number; subtype?: string };
  /** Tokens cease to exist the moment they leave the battlefield, rather than moving zones. */
  isToken?: boolean;
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
  /** True if any damage currently marked on this creature came from a Deathtouch source - makes it lethal regardless of amount. */
  deathtouchDamage: boolean;
  /** +1/+1 counters currently on this permanent. Reset to 0 on any zone change (a "new object" per the real rules). */
  plusOneCounters: number;
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
  /** Card instances in that player's library that match the search restriction. */
  candidateInstanceIds: string[];
  destination: "hand" | "battlefield";
  tapped?: boolean;
  /** Printed wording of what's being searched for, for the picker's heading. */
  prompt: string;
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
  /** How many times each of this player's commanders has been cast from the command zone this game (for commander tax). */
  commanderCastCount: Record<string, number>;
  hasLost: boolean;
  lossReason?: string;
  /** The player's own shield - see `damagePrevention` on CardInstance. */
  damagePrevention: number;
  /** Set when this player tried to draw from an empty library; checked as a state-based action. */
  attemptedDrawFromEmptyLibrary: boolean;
  landsPlayedThisTurn: number;
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
