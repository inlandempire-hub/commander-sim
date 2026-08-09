import type {
  ActivatedAbility,
  CardDefinition,
  Color,
  Effect,
  GameState,
  ManaColor,
  ManaCost,
  ManaPool,
  ManaSpendRestriction,
  Player,
  RestrictedMana,
} from "./types.js";
import { ALL_COLORS } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";
import { controllerMeets } from "./conditions.js";

export function manaValue(cost: ManaCost): number {
  const pips = ALL_COLORS.reduce((sum, c) => sum + (cost.colors[c] ?? 0), 0);
  // A hybrid symbol counts 1 whichever half of it gets paid.
  return cost.generic + pips + (cost.hybrid?.length ?? 0);
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

/** Whether `cost` is payable out of a given mana pool, without mutating anything. */
export function canPayManaCostFromPool(pool: ManaPool, cost: ManaCost): boolean {
  const remaining = payColoredPart(pool, cost);
  if (!remaining) return false;
  const leftover = ALL_COLORS.reduce((sum, c) => sum + (remaining[c] ?? 0), 0) + (remaining.generic ?? 0);
  return leftover >= cost.generic;
}

export function canPayManaCost(player: Player, cost: ManaCost): boolean {
  return canPayManaCostFromPool(player.manaPool, cost);
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
  player.manaPool = afterColored;

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
): ManaSpendRestriction[] {
  if (!canPayManaCostFromPool(spendablePool(player, def), cost)) {
    throw new Error(`${player.id} cannot pay mana cost`);
  }
  const usable = player.restrictedMana.filter((lump) => restrictionAllows(lump.restriction, def));
  if (usable.length === 0) {
    payManaCost(player, cost);
    return [];
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
  return [...used];
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
 * Whether this ability may be activated at all right now, as far as the colour
 * it makes is concerned. Only the "any colour, but..." family is ever narrowed.
 */
export function colorAllowed(
  state: GameState,
  playerId: string,
  ability: ActivatedAbility,
): boolean {
  if (!ability.colorFrom) return true;
  if (ability.effect.kind !== "addMana") return true;
  const color = ability.effect.color;
  if (color === "C") return true;
  const available =
    ability.colorFrom === "commander-identity"
      ? commanderColorIdentity(state, playerId)
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
): boolean {
  if (!colorAllowed(state, playerId, ability)) return false;
  return controllerMeets(state, playerId, ability.activateOnlyIf);
}

/**
 * What a player's mana pool WOULD look like if they tapped every untapped
 * mana-producing permanent they control (in addition to whatever's already
 * floating). Used to decide "is there any point asking this player to act" -
 * not a real mutation, and deliberately ignores mana abilities that also
 * require an additional mana cost of their own (none exist in the card pool
 * yet, but a card like that would need real cost-solving, not this
 * approximation).
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
      if (!abilityAvailable(state, playerId, ability)) continue;
      addMana(pool, ability.effect.color, ability.effect.amount);
    }
  }
  return pool;
}
