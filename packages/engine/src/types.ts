export type Color = "W" | "U" | "B" | "R" | "G";

export const ALL_COLORS: Color[] = ["W", "U", "B", "R", "G"];

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
}

export type TargetSelector =
  | { kind: "any-target" }
  | { kind: "creature" }
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
  | { kind: "addMana"; color: Color; amount: number }
  | { kind: "gainLife"; amount: number }
  /** Puts `amount` +1/+1 counters on the target creature, or on the effect's own source if no target is given. */
  | { kind: "addCounter"; amount: number }
  /**
   * "Put `amount` +1/+1 counters on each other creature you control" (The
   * Falcon, Sam Wilson), optionally narrowed to a subtype - "each other Hero
   * you control" (Agent Phil Coulson). Takes no targets: it applies to every
   * matching creature the effect's controller has on the battlefield, always
   * excluding the effect's own source.
   */
  | { kind: "addCounterToEachOther"; amount: number; subtype?: string }
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
      destination: "hand" | "battlefield";
      tapped?: boolean;
    };

export interface TriggeredAbility {
  event: "enters-battlefield" | "attacks" | "dies" | "landfall";
  effect: Effect;
}

export interface ActivatedAbilityCost {
  tap?: boolean;
  mana?: ManaCost;
}

export interface ActivatedAbility {
  cost: ActivatedAbilityCost;
  effect: Effect;
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

export type ManaPool = Partial<Record<Color, number>> & { generic?: number };

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
  /** How many times each of this player's commanders has been cast from the command zone this game (for commander tax). */
  commanderCastCount: Record<string, number>;
  hasLost: boolean;
  lossReason?: string;
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
  log: string[];
}
