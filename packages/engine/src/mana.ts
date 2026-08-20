import type {
  ActivatedAbility,
  CardDefinition,
  CardInstance,
  Color,
  Effect,
  GameState,
  ManaColor,
  ManaCost,
  ManaMark,
  ManaPool,
  ManaSpendRestriction,
  Player,
  RestrictedMana,
} from "./types.js";
import { ALL_COLORS } from "./types.js";
import { findInstance, requireDefinition, requirePlayer } from "./state.js";
import { cardColors, controllerMeets } from "./conditions.js";
import { typesOf } from "./counters.js";

export function manaValue(cost: ManaCost): number {
  const pips = ALL_COLORS.reduce((sum, c) => sum + (cost.colors[c] ?? 0), 0);
  // A hybrid symbol counts 1 whichever half of it gets paid, and so does a
  // Phyrexian one - {W/P} is mana value 1 even when it was paid with life.
  return cost.generic + pips + (cost.hybrid?.length ?? 0) + (cost.phyrexian?.length ?? 0);
}

/** The commander tax rule: +{2} generic per previous cast from the command zone this game. */
export function applyCommanderTax(cost: ManaCost, timesPreviouslyCast: number): ManaCost {
  return {
    generic: cost.generic + 2 * timesPreviouslyCast,
    colors: { ...cost.colors },
  };
}

/**
 * Pays the coloured pips and then every hybrid symbol, returning what is left
 * in the pool - or null if some requirement could not be met.
 *
 * Hybrids are taken after the fixed pips, most-constrained first, each from
 * whichever of its own colours the pool holds most of. That ordering matters
 * with more than one hybrid symbol in a cost: paying {B/G} out of the single
 * black mana you were holding for the {B} pip beside it would fail a cost you
 * could actually afford. It is still greedy rather than a real solver, which is
 * exact for one symbol and can only ever be wrong in the safe direction - it
 * reports a cost unpayable, never payable when it is not.
 */
function payColoredPart(pool: ManaPool, cost: ManaCost): ManaPool | null {
  const remaining = { ...pool };
  for (const color of ALL_COLORS) {
    const need = cost.colors[color] ?? 0;
    const have = remaining[color] ?? 0;
    if (have < need) return null;
    remaining[color] = have - need;
  }

  // Fewest ways to pay it first, so a {B/G} is not spent on mana that the
  // {W/U/B/R/G} beside it was the only claimant for.
  const hybrids = [...(cost.hybrid ?? [])].sort((a, b) => a.length - b.length);
  for (const symbol of hybrids) {
    const best = symbol
      .filter((color) => (remaining[color] ?? 0) > 0)
      .sort((a, b) => (remaining[b] ?? 0) - (remaining[a] ?? 0))[0];
    // A hybrid symbol must be paid with one of its own colours. Colourless
    // mana cannot cover it, which is the whole difference from generic.
    if (!best) return null;
    remaining[best] = (remaining[best] ?? 0) - 1;
  }
  return remaining;
}

/**
 * "{W/P}" - paid with its colour when the pool holds it, and with 2 life
 * otherwise.
 *
 * Split out because the two halves live in different places: the colour comes
 * out of the pool this function is walking, and the life comes off the player,
 * which a pool has no access to. So this reports how many symbols the pool
 * could not cover, and the caller settles the rest in life.
 *
 * Taking the mana first is a shortcut over a real choice. It is the same one
 * `unlessPays` takes, and it is right nearly always: the case where you would
 * rather pay life is the case where the pool is empty, which is the case this
 * already handles.
 */
function payPhyrexianFromPool(pool: ManaPool, cost: ManaCost): { pool: ManaPool; unpaidSymbols: number } {
  const remaining = { ...pool };
  let unpaidSymbols = 0;
  for (const color of cost.phyrexian ?? []) {
    if ((remaining[color] ?? 0) > 0) remaining[color] = (remaining[color] ?? 0) - 1;
    else unpaidSymbols += 1;
  }
  return { pool: remaining, unpaidSymbols };
}

/** The life a cost demands once the pool has covered what it can - 2 per symbol. */
export function phyrexianLifeCost(pool: ManaPool, cost: ManaCost): number {
  return payPhyrexianFromPool(pool, cost).unpaidSymbols * 2;
}

/** Whether `cost` is payable out of a given mana pool, without mutating anything. */
export function canPayManaCostFromPool(pool: ManaPool, cost: ManaCost): boolean {
  const colored = payColoredPart(pool, cost);
  if (!colored) return false;
  // Phyrexian symbols after the fixed pips, so a {W} pip beside a {W/P} is not
  // paid out from under it - the same ordering hybrids take, and for the same
  // reason.
  const { pool: remaining } = payPhyrexianFromPool(colored, cost);
  const leftover = ALL_COLORS.reduce((sum, c) => sum + (remaining[c] ?? 0), 0) + (remaining.generic ?? 0);
  return leftover >= cost.generic;
}

export function canPayManaCost(player: Player, cost: ManaCost): boolean {
  if (!canPayManaCostFromPool(player.manaPool, cost)) return false;
  /*
   * The life half of a Phyrexian symbol the pool could not cover. Checked
   * against the player rather than the pool because that is where life is - and
   * `>` rather than `>=`, since a cost that would take you to exactly 0 is one
   * you may not pay. (Paying *down* to 0 is legal; paying *past* it is not.)
   */
  const life = phyrexianLifeCost(player.manaPool, cost);
  return life === 0 || player.life > life;
}

/** Deducts a mana cost from the player's mana pool. Throws if they can't pay - callers must check canPayManaCost first. */
export function payManaCost(player: Player, cost: ManaCost): void {
  if (!canPayManaCost(player, cost)) {
    throw new Error(`${player.id} cannot pay mana cost`);
  }
  // Same routine that decided this was payable, so the mana actually taken can
  // never disagree with the mana the check counted on.
  const afterColored = payColoredPart(player.manaPool, cost);
  if (!afterColored) throw new Error(`${player.id} cannot pay mana cost`);
  // "{W/P} can be paid with either {W} or 2 life." Whatever the pool could not
  // cover comes off the life total, at the printed rate.
  const phyrexian = payPhyrexianFromPool(afterColored, cost);
  player.manaPool = phyrexian.pool;
  if (phyrexian.unpaidSymbols > 0) {
    player.life -= phyrexian.unpaidSymbols * 2;
  }

  let genericRemaining = cost.generic;
  // Spend leftover colored mana first, then generic-pool mana.
  for (const color of ALL_COLORS) {
    if (genericRemaining <= 0) break;
    const have = player.manaPool[color] ?? 0;
    const spend = Math.min(have, genericRemaining);
    player.manaPool[color] = have - spend;
    genericRemaining -= spend;
  }
  if (genericRemaining > 0) {
    player.manaPool.generic = (player.manaPool.generic ?? 0) - genericRemaining;
  }
}

/**
 * Colourless goes into the `generic` bucket, which is already exactly how
 * colourless mana behaves: it pays the generic part of a cost and never a
 * coloured pip. See ManaColor in types.ts for the one case that does not cover.
 */
export function addMana(pool: ManaPool, color: ManaColor, amount: number): void {
  if (color === "C") {
    pool.generic = (pool.generic ?? 0) + amount;
    return;
  }
  pool[color] = (pool[color] ?? 0) + amount;
}

export function emptyManaPool(player: Player): void {
  player.manaPool = {};
  player.restrictedMana = [];
  // A mark cannot outlive the mana it is on: the pool empties, so it goes too.
  player.manaMarks = [];
}

/**
 * Whether a lump of restricted mana may be spent on this card.
 *
 * Deliberately answers "no" when there is no card, which is what every path
 * other than casting passes: an activated ability's cost is not a spell, so
 * Delighted Halfling's mana can never pay for one.
 */
export function restrictionAllows(
  restriction: ManaSpendRestriction,
  def: CardDefinition | undefined,
): boolean {
  if (!def) return false;
  switch (restriction.kind) {
    case "legendary-spell":
      // A land is not a spell, and nothing else about "legendary spell" needs
      // saying: it is any card with the supertype, cast.
      return (def.supertypes?.includes("Legendary") ?? false) && !def.types.includes("Land");
    case "creature-of-chosen-type": {
      // No type was ever chosen, so nothing is of it. See the field's comment.
      if (!restriction.creatureType) return false;
      if (!def.types.includes("Creature")) return false;
      // A changeling is every creature type, so it qualifies whatever was named.
      if (def.keywords?.includes("Changeling")) return true;
      return def.subtypes?.includes(restriction.creatureType) ?? false;
    }
  }
}

/**
 * What this player could actually spend on this particular card: the ordinary
 * pool, plus any restricted mana this card is allowed to use.
 *
 * Everything that asks "can they afford it" without knowing what is being cast
 * keeps reading `manaPool` alone, and so keeps under-counting rather than
 * over-counting. A spell not offered is a nuisance; a spell offered, half paid
 * for and then refused is a lost turn.
 */
export function spendablePool(player: Player, def?: CardDefinition): ManaPool {
  if (player.restrictedMana.length === 0) return player.manaPool;
  const pool: ManaPool = { ...player.manaPool };
  for (const lump of player.restrictedMana) {
    if (!restrictionAllows(lump.restriction, def)) continue;
    addMana(pool, lump.color, lump.amount);
  }
  return pool;
}

/**
 * Pays a cost for a specific card, spending restricted mana first.
 *
 * Restricted first because it is the only thing that mana can be spent on -
 * holding it back to pay with a general mana instead would waste it for no
 * gain, and no player would ever choose that. Returns the restrictions actually
 * drawn on, because one of them ("that spell can't be countered") changes what
 * the spell does once it is on the stack.
 */
export function payManaCostFor(
  player: Player,
  cost: ManaCost,
  def?: CardDefinition,
): PaymentDrawnOn {
  if (!canPayManaCostFromPool(spendablePool(player, def), cost)) {
    throw new Error(`${player.id} cannot pay mana cost`);
  }
  /*
   * Which colours the ordinary pool held before any of this, so the marks
   * consumed can be worked out by comparison afterwards.
   *
   * A comparison rather than bookkeeping inside the payment routine, because
   * the payment routine is shared with every non-casting cost and marks only
   * matter when casting. It is also exact: a mark is spent precisely when the
   * pool's count of that colour goes down, which is the only thing "that mana
   * was spent" can mean once mana of a colour is interchangeable.
   */
  const before: ManaPool = { ...player.manaPool };

  const usable = player.restrictedMana.filter((lump) => restrictionAllows(lump.restriction, def));
  if (usable.length === 0) {
    payManaCost(player, cost);
    return { restrictions: [], marks: consumeMarks(player, before) };
  }

  /*
   * Spent in two stages: the restricted mana covers whatever part of the cost
   * it can, then the ordinary pool pays what is left through the same
   * `payManaCost` every other cost goes through. A second full payment routine
   * that understood restrictions would be the obvious place for the two to
   * drift apart over something like which colour covered the generic part.
   *
   * Within the restricted stage, coloured pips are covered before hybrids and
   * hybrids before generic - most demanding first, because a mana that can only
   * pay one of the three is wasted if a looser part of the cost takes it.
   */
  const remaining: ManaCost = {
    generic: cost.generic,
    colors: { ...cost.colors },
    hybrid: cost.hybrid?.map((symbol) => [...symbol]),
  };
  const used = new Set<ManaSpendRestriction>();

  const take = (lump: RestrictedMana): boolean => {
    if (lump.amount <= 0) return false;
    lump.amount -= 1;
    used.add(lump.restriction);
    return true;
  };

  for (const color of ALL_COLORS) {
    while ((remaining.colors[color] ?? 0) > 0) {
      const lump = usable.find((l) => l.color === color && l.amount > 0);
      if (!lump || !take(lump)) break;
      remaining.colors[color] = (remaining.colors[color] ?? 0) - 1;
    }
  }
  if (remaining.hybrid) {
    remaining.hybrid = remaining.hybrid.filter((symbol) => {
      const lump = usable.find((l) => l.color !== "C" && symbol.includes(l.color as Color) && l.amount > 0);
      return !(lump && take(lump));
    });
  }
  while (remaining.generic > 0) {
    const lump = usable.find((l) => l.amount > 0);
    if (!lump || !take(lump)) break;
    remaining.generic -= 1;
  }

  player.restrictedMana = player.restrictedMana.filter((lump) => lump.amount > 0);
  payManaCost(player, remaining);
  return { restrictions: [...used], marks: consumeMarks(player, before) };
}

/**
 * What a casting payment actually drew on, beyond the raw numbers.
 *
 * Two lists rather than one because they are opposites: a restriction limited
 * what the mana could be spent on and may change what the spell does, where a
 * mark limited nothing and only says where the mana came from.
 */
export interface PaymentDrawnOn {
  restrictions: ManaSpendRestriction[];
  marks: ManaMark[];
}

/**
 * Spends the marks on whatever mana just left the pool, and reports them.
 *
 * Reads the difference between the pool before and after paying rather than
 * being told, so it cannot disagree with what was actually spent. Marks of a
 * colour are taken in the order they were made, which is the order the lands
 * were tapped - arbitrary between two identical marks, and identical marks are
 * interchangeable anyway.
 */
function consumeMarks(player: Player, before: ManaPool): ManaMark[] {
  if (player.manaMarks.length === 0) return [];
  const spent: ManaMark[] = [];
  for (const mark of player.manaMarks) {
    // Colourless mana lands in the generic bucket - see addMana.
    const key = mark.color === "C" ? "generic" : mark.color;
    const used = (before[key] ?? 0) - (player.manaPool[key] ?? 0);
    if (used <= 0) continue;
    const take = Math.min(mark.amount, used);
    mark.amount -= take;
    // Charged against this mark so a second mark of the same colour is not
    // paid for by the same point of mana.
    before[key] = (before[key] ?? 0) - take;
    spent.push({ ...mark, amount: take });
  }
  player.manaMarks = player.manaMarks.filter((mark) => mark.amount > 0);
  return spent;
}

/**
 * Every creature type printed on this player's commanders.
 *
 * The twin of `commanderColorIdentity`, and read the same way: from the
 * commanders themselves in whatever zone they are in, because the commander is
 * the rule rather than something the deck records.
 */
export function commanderCreatureTypes(state: GameState, playerId: string): string[] {
  const player = requirePlayer(state, playerId);
  const types = new Set<string>();
  for (const zone of [player.command, player.battlefield, player.graveyard, player.hand, player.library, player.exile]) {
    for (const instance of zone) {
      if (!instance.isCommander) continue;
      const def = requireDefinition(state, instance.definitionId);
      if (!def.types.includes("Creature")) continue;
      for (const subtype of def.subtypes ?? []) types.add(subtype);
    }
  }
  return [...types];
}

/**
 * A mana ability whose only cost is tapping the permanent.
 *
 * The distinction matters everywhere mana is counted without being spent -
 * "could this player afford that spell", "which lands should auto-tap turn" -
 * because all of those treat a source as free. A fetchland taps, pays a life
 * and sacrifices itself to produce no mana at all, and counting it would have
 * the game offer you spells you cannot cast, then tap a land to nothing trying
 * to pay for one.
 *
 * A painland is deliberately still free by this test. "Add {B}. This land deals
 * 1 damage to you" hurts, but it is not a *cost*: the mana arrives either way,
 * so a Llanowar Wastes that did not count would leave its coloured halves
 * invisible to auto-tap and the land would only ever make colourless. The
 * damage is handled where it belongs, by preferring a painless source when one
 * would do just as well - see `chooseSource`.
 */
export function isFreeManaAbility(
  ability: ActivatedAbility,
): ability is ActivatedAbility & { effect: Extract<Effect, { kind: "addMana" }> } {
  return (
    ability.cost.tap === true &&
    ability.cost.mana === undefined &&
    ability.cost.payLife === undefined &&
    ability.cost.sacrificeSelf !== true &&
    // Mana that can only be spent on certain spells is not general-purpose
    // mana, and this is the one place where counting it would over-count rather
    // than under-count: the game would believe Delighted Halfling could pay for
    // anything, offer a spell on the strength of it, and then refuse to cast it.
    ability.producesRestrictedMana === undefined &&
    ability.effect.kind === "addMana"
  );
}

/**
 * The colours of every commander this player owns, in any zone.
 *
 * Commander is the only format where a card's legal colours depend on another
 * card, and Command Tower is the card that makes the engine care: it taps for
 * any colour "in your commander's color identity", so the same land produces
 * different mana in different decks. Read from the commanders themselves rather
 * than from the deck, because the commander is the rule.
 */
export function commanderColorIdentity(state: GameState, playerId: string): Color[] {
  const player = requirePlayer(state, playerId);
  const colors = new Set<Color>();
  for (const zone of [player.command, player.battlefield, player.graveyard, player.hand, player.library, player.exile]) {
    for (const instance of zone) {
      if (!instance.isCommander) continue;
      for (const color of requireDefinition(state, instance.definitionId).colorIdentity) {
        colors.add(color);
      }
    }
  }
  return ALL_COLORS.filter((color) => colors.has(color));
}

/**
 * Every colour a land any opponent controls could produce right now.
 *
 * Exotic Orchard reads the table rather than the deck, so this is recomputed on
 * every activation - the answer changes as the opponent plays lands, and an
 * Orchard facing an empty board makes nothing at all.
 *
 * Abilities that are themselves colour-sourced are skipped. Two Exotic Orchards
 * facing each other would otherwise ask each other what they produce forever;
 * skipping them gives the right answer for that corner (neither makes anything
 * unless some other land does) without needing to model the loop.
 */
export function opponentLandColors(state: GameState, playerId: string): Color[] {
  const colors = new Set<Color>();
  for (const player of state.players) {
    if (player.id === playerId) continue;
    for (const instance of player.battlefield) {
      const def = state.cardDefinitions[instance.definitionId];
      if (!def?.types.includes("Land")) continue;
      for (const ability of def.activatedAbilities ?? []) {
        if (ability.colorFrom) continue;
        if (ability.effect.kind !== "addMana") continue;
        // Colourless is not a colour, so a Wastes offers this nothing.
        if (ability.effect.color !== "C") colors.add(ability.effect.color);
      }
    }
  }
  return ALL_COLORS.filter((color) => colors.has(color));
}

/**
 * "any color among legendary creatures and planeswalkers you control" - Mox
 * Amber.
 *
 * Read off the board on every activation, like `opponentLandColors` beside it and
 * for the same reason: the answer changes as legends arrive and die, and a Mox
 * that remembered yesterday's board would make mana out of a creature in the
 * graveyard.
 *
 * The colours are the permanents' own, so a colourless legend (an artifact
 * creature with no coloured pips) contributes nothing - which is right, and is
 * why this cannot be written as a colour identity.
 */
export function yourLegendaryPermanentColors(state: GameState, playerId: string): Color[] {
  const colors = new Set<Color>();
  for (const instance of requirePlayer(state, playerId).battlefield) {
    const def = state.cardDefinitions[instance.definitionId];
    if (!def) continue;
    if (!def.supertypes?.includes("Legendary")) continue;
    if (!def.types.includes("Creature") && !def.types.includes("Planeswalker")) continue;
    for (const color of cardColors(def)) colors.add(color);
  }
  return ALL_COLORS.filter((color) => colors.has(color));
}

/**
 * Whether this ability may be activated at all right now, as far as the colour
 * it makes is concerned. Only the "any colour, but..." family is ever narrowed.
 */
/**
 * "...of any of **the exiled card's** colors." - Chrome Mox.
 *
 * The colours of the card this particular permanent imprinted, read off the
 * card in exile every time rather than copied onto the Mox. A Mox that
 * imprinted nothing produces nothing, which is not an edge case: it is what
 * happens whenever the card is played off a hand with nothing spare, and it is
 * why the card is a gamble rather than a Sol Ring.
 */
function imprintedCardColors(state: GameState, source: CardInstance | undefined): Color[] {
  const imprinted = source?.imprintedInstanceId;
  if (!imprinted) return [];
  const found = findInstance(state, imprinted);
  if (!found) return [];
  return cardColors(requireDefinition(state, found.instance.definitionId));
}

export function colorAllowed(
  state: GameState,
  playerId: string,
  ability: ActivatedAbility,
  /**
   * The permanent whose ability this is.
   *
   * Every other colour source is a question about the board or about the deck,
   * and needs no such thing. Chrome Mox's is a question about *this* Mox, and
   * two of them side by side can tap for different colours - so an answer given
   * without the permanent would have to be the same for both, and would be
   * wrong for at least one.
   */
  source?: CardInstance,
): boolean {
  if (!ability.colorFrom) return true;
  if (ability.effect.kind !== "addMana") return true;
  const color = ability.effect.color;
  if (color === "C") return true;
  const available =
    ability.colorFrom === "commander-identity"
      ? commanderColorIdentity(state, playerId)
      : ability.colorFrom === "your-legendary-permanents"
        ? yourLegendaryPermanentColors(state, playerId)
        : ability.colorFrom === "imprinted-card"
          ? imprintedCardColors(state, source)
          : opponentLandColors(state, playerId);
  return available.includes(color);
}

/**
 * Every reason an ability might not be activatable that has nothing to do with
 * paying for it: the colour identity restriction, and "activate only if you
 * control a Swamp".
 *
 * Kept in one function because it has to give the same answer in three places
 * that would otherwise drift - the activation itself, the auto-tapper's list of
 * sources, and the count of mana a player could theoretically produce. A
 * restriction the counter does not know about is worse than one nothing
 * enforces: the game offers you a spell, taps your lands towards it, and then
 * refuses the land that was supposed to pay for it.
 */
export function abilityAvailable(
  state: GameState,
  playerId: string,
  ability: ActivatedAbility,
  /** The permanent asking - only Chrome Mox's colour source needs it. */
  source?: CardInstance,
): boolean {
  if (!colorAllowed(state, playerId, ability, source)) return false;
  /*
   * "If this land has a luck counter on it, instead ..." - Gemstone Caverns,
   * whose one printed line is six abilities, and only some of them are usable at
   * any moment.
   *
   * Here rather than only in `activatableAbilities`, because this is the
   * function whose whole job is "every reason an ability might not be
   * activatable that has nothing to do with paying for it" - and the auto-tapper
   * asks it too. Taught to one caller and not the others, the bot tapped a
   * Gemstone Caverns for a colour it could not make and the engine refused.
   */
  if (source && ability.onlyIfSourceHasCounters !== undefined) {
    const has = source.plusOneCounters + source.otherCounters > 0;
    if (has !== ability.onlyIfSourceHasCounters) return false;
  }
  return controllerMeets(state, playerId, ability.activateOnlyIf);
}

/**
 * What a player's mana pool WOULD look like if they tapped every untapped
 * mana-producing permanent they control (in addition to whatever's already
 * floating).
 *
 * **This over-counts, and cannot not.** A permanent with two mana abilities is
 * added twice, because a pool has no way to say "one or the other" - a land
 * reading "{T}: Add {B}" and "{T}: Add {G}" appears here as both. So this is an
 * upper bound on what could be produced and never an amount that could be
 * produced at once.
 *
 * Do not ask it whether a cost can be paid. `couldAfford` in autoTap.ts is that
 * question, and it plans the payment instead - which is the only way to answer
 * it, since whether a dual land helps depends on what is being paid for. This
 * function once backed `couldAfford`, and the difference showed up as the bot
 * proposing a spell the engine refused, on a deck whose mana base had duals in
 * it.
 *
 * What it is still good for is a quick "could this player conceivably do
 * anything" gate, where erring high is the safe direction: the worst case is
 * being offered a choice you turn out not to be able to make.
 *
 * Deliberately ignores mana abilities that require an additional mana cost of
 * their own (none exist in the card pool yet).
 */
export function potentialAvailableMana(state: GameState, playerId: string): ManaPool {
  const player = requirePlayer(state, playerId);
  const pool: ManaPool = { ...player.manaPool };
  for (const instance of player.battlefield) {
    if (instance.tapped) continue;
    const def = requireDefinition(state, instance.definitionId);
    if (def.types.includes("Creature") && instance.summoningSickness) continue;
    for (const ability of def.activatedAbilities ?? []) {
      if (!isFreeManaAbility(ability)) continue;
      if (!abilityAvailable(state, playerId, ability, instance)) continue;
      addMana(pool, ability.effect.color, ability.effect.amount);
    }
  }
  return pool;
}

/*
 * Working out what a payment *would* tap, without tapping anything.
 *
 * Moved here from autoTap.ts on 2026-08-17. It is the pure half - it reads the
 * board and returns a list - and it had to come down here because the two
 * callers that most need `couldAfford` (the activated-ability list and the
 * auto-pass check) already import this file, while autoTap.ts imports
 * abilities.ts and casting.ts and so cannot be imported back from either.
 *
 * autoTap.ts keeps the half that mutates, and re-exports all of this.
 */

/** A permanent that taps for mana with no additional cost, plus which colour it makes. */
export interface ManaSource {
  instance: CardInstance;
  abilityIndex: number;
  color: ManaColor;
  amount: number;
  /** A painland's coloured halves: usable, but not for free. See `chooseSource`. */
  damageToController: number;
}

export function manaSources(
  state: GameState,
  player: Player,
  /**
   * A permanent that must not be spent, because it is about to be tapped for
   * something else - an ability whose own cost includes "{T}".
   *
   * Sapseep Forest is the card: its second ability costs "{G}, {T}", and the
   * Forest is a green source. With no other green on the board the tapper spent
   * the Forest paying the {G} and then found it already tapped, which reads as
   * the ability being broken rather than as the mana being spent on it.
   */
  excludeInstanceId?: string,
): ManaSource[] {
  const sources: ManaSource[] = [];
  for (const instance of player.battlefield) {
    if (instance.tapped) continue;
    if (instance.instanceId === excludeInstanceId) continue;
    const def = state.cardDefinitions[instance.definitionId];
    if (!def) continue;
    /*
     * Summoning-sick creatures can't use tap abilities, but lands always can.
     *
     * `typesOf`, not `def.types` - an animated Inkmoth Nexus *is* a creature
     * this turn and its printed type line says only "Land". Read off the card,
     * this offered a sick Nexus as a mana source and the engine then refused it,
     * which in a bot game is a dead game rather than a misplay.
     */
    if (typesOf(state, instance).includes("Creature") && instance.summoningSickness) continue;
    def.activatedAbilities?.forEach((ability, abilityIndex) => {
      // Anything with a further cost - mana, life, sacrificing itself - is
      // not a source auto-tap may spend on your behalf. Tapping a fetchland to
      // "make mana" would cost a land and a life and produce nothing.
      if (!isFreeManaAbility(ability)) return;
      // Command Tower's five halves: only the ones the commander's colours
      // allow are real sources. Tapping it for white in a Golgari deck is not
      // the card. Same gate covers "activate only if you control a Swamp" -
      // Tainted Wood makes no coloured mana at all until a Swamp is out.
      if (!abilityAvailable(state, player.id, ability, instance)) return;
      sources.push({
        instance,
        abilityIndex,
        color: ability.effect.color,
        amount: ability.effect.amount,
        damageToController: ability.damageToController ?? 0,
      });
    });
  }
  return sources;
}

/**
 * Whether the player could pay `cost` if they tapped everything available,
 * floating mana included.
 *
 * Answered by planning the payment rather than by summing a pool, because a
 * pool cannot represent a dual land: "{T}: Add {B}" and "{T}: Add {G}" on one
 * permanent are alternatives, and adding both counted one land as two mana.
 * That is how the bot came to propose a spell the engine then refused - a dead
 * game rather than a misplay - and it went unseen for as long as both demo decks
 * were a commander plus forty basics, each with exactly one mana ability.
 *
 * `planManaPayment` drops every entry for a permanent it taps, and is the same
 * walk `autoTapForCost` makes, so this answer and the attempt to pay cannot
 * disagree. It costs more than a sum did; it is called per candidate spell or
 * ability rather than per turn, which is nowhere near hot enough to matter.
 */
export function couldAfford(
  state: GameState,
  playerId: string,
  cost: ManaCost,
  /** See `manaSources` - the permanent about to be tapped for something else. */
  excludeInstanceId?: string,
): boolean {
  return planManaPayment(state, playerId, cost, excludeInstanceId).paid;
}

/**
 * The choice itself, made against an explicit pool and list of sources.
 *
 * Kept separate from the state so that both the real tapping and the preview
 * of it can call the same function. A preview that reimplemented this - even
 * carefully - would eventually disagree with what actually happens, and a
 * preview you cannot trust is worse than no preview.
 *
 * Deliberately greedy rather than a real cost solver: colour requirements
 * first, since a source producing a colour the cost actually needs is strictly
 * more useful than one that only helps with the generic portion. A cost with
 * several hybrid symbols in it would still need proper solving (see the
 * limitations note in ROADMAP.md).
 *
 * **Within equally useful sources it spends the one that costs the least
 * future flexibility**, which is the whole of `flexibilityRank` below. Taking
 * the first source in board order - which is what this did until 2026-08-16 -
 * is the behaviour that makes a two-spell turn impossible without tapping by
 * hand: paying the generic part of the first spell with a coloured land eats a
 * pip the second spell needed, and the player is left doing the engine's job
 * for it. The Blight Mound into Tend the Pests line is exactly that, and it is
 * the case that prompted this.
 *
 * The order within a tier is: a painless source before a painful one - a
 * painland is a real source and has to stay one, but shooting yourself for
 * mana a basic could have made is a decision no player would take, and this is
 * making it on their behalf.
 */
export function chooseSource(sources: ManaSource[], pool: ManaPool, cost: ManaCost): ManaSource | null {
  if (canPayManaCostFromPool(pool, cost)) return null;
  if (sources.length === 0) return null;

  const shortfallColors: ManaColor[] = ALL_COLORS.filter(
    (color) => (pool[color] ?? 0) < (cost.colors[color] ?? 0),
  );
  /*
   * A hybrid symbol never shows up as a pip shortfall, because it is not a pip.
   * Without this, a cost of "{B/G}, {T}" that the pool cannot cover would fall
   * through to "anything untapped helps with the generic part" and start
   * tapping colourless rocks that can never pay it. Any colour named by a
   * hybrid symbol is worth having when the cost is still unpayable.
   */
  if (shortfallColors.length === 0 && cost.hybrid?.length) {
    for (const symbol of cost.hybrid) {
      for (const color of symbol) {
        if (!shortfallColors.includes(color)) shortfallColors.push(color);
      }
    }
  }

  // A colourless source is never in shortfallColors, which is exactly right:
  // it can only ever help with the generic part of a cost.
  const useful =
    shortfallColors.length > 0 ? sources.filter((s) => shortfallColors.includes(s.color)) : sources;

  const pool2 = useful.length > 0 ? useful : sources;
  if (pool2.length === 0) return null;

  /*
   * Cheapest first, where "cheap" means least flexibility given up. Sorted on a
   * copy: `sources` is the caller's list and `planManaPayment` walks it again.
   */
  return [...pool2].sort((a, b) => {
    /*
     * Ranked against *every* source, not just the useful ones. Measuring a
     * land's flexibility inside the filtered list made a Bayou look
     * mono-coloured while paying {B} - its green half had been filtered out -
     * so the dual was spent ahead of the basic, which is the exact mistake
     * this is here to stop.
     */
    const rank = flexibilityRank(a, sources) - flexibilityRank(b, sources);
    if (rank !== 0) return rank;
    // A painless source before a painful one, always.
    return a.damageToController - b.damageToController;
  })[0]!;
}

/**
 * What spending this source costs you in options, lower being cheaper.
 *
 * Three things, in order of how much they matter:
 *
 * 1. **Colourless mana can only ever pay generic**, so spending it costs
 *    nothing at all. A Sol Ring tapped for the generic part of a cost is free;
 *    a Swamp tapped for the same is a black pip you no longer have.
 * 2. **A permanent that makes fewer colours is spent first.** A basic Swamp and
 *    a Watery Grave both pay {B}, but the Watery Grave is also the only blue
 *    source you might have - so the basic goes first and the dual stays on the
 *    table. This is the half that fixes casting two coloured spells in a turn.
 * 3. **Spend from the colour you have most of.** With four Forests and one
 *    Swamp, the generic part of a cost comes off a Forest, because the Swamp is
 *    the scarce thing.
 *
 * A heuristic, not a solver: it knows nothing about what is still in hand, so
 * it optimises for keeping options rather than for a particular next spell.
 * That is the right bias when the alternative is the player tapping by hand.
 */
function flexibilityRank(source: ManaSource, among: ManaSource[]): number {
  if (source.color === "C") return 0;

  // How many colours the *permanent* can make - a dual land appears in the list
  // once per ability, and tapping it uses up all of them.
  const coloursThisPermanentMakes = new Set(
    among.filter((s) => s.instance.instanceId === source.instance.instanceId).map((s) => s.color),
  ).size;

  // How many other permanents could still make this colour afterwards. More
  // means this one is less precious.
  const othersWithThisColour = new Set(
    among.filter((s) => s.color === source.color).map((s) => s.instance.instanceId),
  ).size;

  // Scaled so the two never trade against each other by accident: flexibility
  // dominates, depth breaks its ties.
  return 1 + coloursThisPermanentMakes * 100 - Math.min(othersWithThisColour, 99);
}

/**
 * Picks the next land (or mana creature) to tap toward paying `cost`. Returns
 * null when the pool already covers the cost or nothing left can help.
 */
export function nextSourceToTap(
  state: GameState,
  player: Player,
  cost: ManaCost,
  /** See `manaSources`. */
  excludeInstanceId?: string,
): { instanceId: string; abilityIndex: number } | null {
  const chosen = chooseSource(manaSources(state, player, excludeInstanceId), player.manaPool, cost);
  if (!chosen) return null;
  return { instanceId: chosen.instance.instanceId, abilityIndex: chosen.abilityIndex };
}

/** One permanent the payment would tap, and what it would produce. */
export interface PlannedTap {
  instanceId: string;
  abilityIndex: number;
  color: ManaColor;
  amount: number;
}

export interface ManaPlan {
  /** False when the cost cannot be met at all - in which case nothing would be tapped. */
  paid: boolean;
  /** In the order they would be tapped. Empty when the floating pool already covers it. */
  taps: PlannedTap[];
}

/**
 * What `autoTapForCost` *would* do, worked out without touching anything.
 *
 * This exists so the interface can show you which of your lands a spell is
 * about to turn before you commit to it. Tapping is irreversible and the
 * engine does it on your behalf, which is a fine trade only as long as you can
 * see what you are agreeing to.
 *
 * It walks the same greedy choice in the same order as the real thing, against
 * a copy of the pool. The one subtlety is that a permanent with two mana
 * abilities appears twice in `manaSources`, and tapping it once uses up both -
 * so every entry for a chosen permanent is dropped, matching the real loop,
 * which recomputes its sources each pass and skips anything already tapped.
 */
export function planManaPayment(
  state: GameState,
  playerId: string,
  cost: ManaCost,
  /** See `manaSources`. */
  excludeInstanceId?: string,
): ManaPlan {
  const player = requirePlayer(state, playerId);
  const pool: ManaPool = { ...player.manaPool };
  let available = manaSources(state, player, excludeInstanceId);
  const taps: PlannedTap[] = [];

  for (let guard = available.length; guard > 0; guard--) {
    const chosen = chooseSource(available, pool, cost);
    if (!chosen) break;
    available = available.filter((s) => s.instance.instanceId !== chosen.instance.instanceId);
    addMana(pool, chosen.color, chosen.amount);
    taps.push({
      instanceId: chosen.instance.instanceId,
      abilityIndex: chosen.abilityIndex,
      color: chosen.color,
      amount: chosen.amount,
    });
  }

  const paid = canPayManaCostFromPool(pool, cost);
  // Nothing is tapped for a cost that cannot be met, so an unaffordable spell
  // must not light up half your board as if it were about to be paid.
  return paid ? { paid, taps } : { paid: false, taps: [] };
}
