import { ALL_COLORS, type CardInstance, type Color, type GameState, type ManaColor, type ManaCost, type ManaPool, type Player, type StackTarget } from "./types.js";
import { findInstance, requireDefinition, requirePlayer } from "./state.js";
import { abilityAvailable, addMana, applyCommanderTax, canPayManaCostFromPool, isFreeManaAbility, payColoredPart, potentialAvailableMana } from "./mana.js";
import { activateAbility } from "./abilities.js";
import { castSpell, type CastOptions } from "./casting.js";
import { costWithX } from "./x.js";

/**
 * Tapping lands to pay for a spell.
 *
 * Nobody wants to click five Islands before every spell - that's bookkeeping,
 * not a decision. So the engine offers to do it: work out what a card costs,
 * tap what's needed, cast it.
 *
 * Deliberately only ever triggered by *casting something*. It never taps
 * anything speculatively, so mana is only committed when it's being spent, and
 * you keep the ability to hold lands open for an instant. (In real Magic,
 * mana left floating empties at the end of each step anyway, so pre-tapping
 * would actively lose you mana.)
 *
 * This logic started life in the bot, which has always had to tap its own
 * lands. Moved here so the human's client, the bot and the server all pay for
 * spells exactly the same way rather than keeping three copies in step.
 */

const EMPTY_COST: ManaCost = { generic: 0, colors: {} };

/** A permanent that taps for mana with no additional cost, plus which colour it makes. */
export interface ManaSource {
  instance: CardInstance;
  abilityIndex: number;
  color: ManaColor;
  amount: number;
  /** A painland's coloured halves: usable, but not for free. See `chooseSource`. */
  damageToController: number;
}

export function manaSources(state: GameState, player: Player): ManaSource[] {
  const sources: ManaSource[] = [];
  for (const instance of player.battlefield) {
    if (instance.tapped) continue;
    const def = state.cardDefinitions[instance.definitionId];
    if (!def) continue;
    // Summoning-sick creatures can't use tap abilities, but lands always can.
    if (def.types.includes("Creature") && instance.summoningSickness) continue;
    def.activatedAbilities?.forEach((ability, abilityIndex) => {
      // Anything with a further cost - mana, life, sacrificing itself - is
      // not a source auto-tap may spend on your behalf. Tapping a fetchland to
      // "make mana" would cost a land and a life and produce nothing.
      if (!isFreeManaAbility(ability)) return;
      // Command Tower's five halves: only the ones the commander's colours
      // allow are real sources. Tapping it for white in a Golgari deck is not
      // the card. Same gate covers "activate only if you control a Swamp" -
      // Tainted Wood makes no coloured mana at all until a Swamp is out.
      if (!abilityAvailable(state, player.id, ability)) return;
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

/** Whether the player could pay `cost` if they tapped everything available, floating mana included. */
/**
 * Whether this player could pay `cost` by tapping what they have untapped.
 *
 * Not a flattened potential-mana pool, which double-counts a dual: a Hinterland
 * Harbor lists a "{T}: add G" and a "{T}: add U" ability, and summing both said
 * the land could make G *and* U from one tap. On a mono-colour manabase that
 * never mattered; a two-colour deck full of duals over-promised its coloured
 * pips, and the bot would propose a {4}{G}{G} it could not actually pay.
 *
 * So each source is one tap that makes one of its colours, and the coloured
 * pips are matched to sources (a small bipartite matching) before the generic
 * pips are covered from whatever is left. Colourless-only sources and floating
 * generic pay the generic part only. Under-counting is safe here - the bot
 * simply holds a spell - so an odd unsatisfiable matching errs that way.
 */
export function couldAfford(state: GameState, playerId: string, cost: ManaCost): boolean {
  const player = requirePlayer(state, playerId);

  // Every mana we could make, each usable once. A unit's `colors` are the
  // colours it can pay; empty means it pays only the generic part.
  const units: Array<{ colors: Color[] }> = [];
  for (const color of ALL_COLORS) {
    for (let i = 0; i < (player.manaPool[color] ?? 0); i++) units.push({ colors: [color] });
  }
  for (let i = 0; i < (player.manaPool.generic ?? 0); i++) units.push({ colors: [] });
  // Tap sources grouped by permanent - a dual's two abilities are one tap.
  const byInstance = new Map<string, { amount: number; colors: Set<Color> }>();
  for (const source of manaSources(state, player)) {
    const group = byInstance.get(source.instance.instanceId) ?? { amount: source.amount, colors: new Set<Color>() };
    if (source.color !== "C") group.colors.add(source.color);
    group.amount = source.amount;
    byInstance.set(source.instance.instanceId, group);
  }
  for (const group of byInstance.values()) {
    for (let i = 0; i < group.amount; i++) units.push({ colors: [...group.colors] });
  }

  // The coloured pips (each one colour) and hybrid pips (any of a set).
  const pips: Color[][] = [];
  for (const color of ALL_COLORS) {
    for (let i = 0; i < (cost.colors[color] ?? 0); i++) pips.push([color]);
  }
  for (const symbol of cost.hybrid ?? []) {
    pips.push([...symbol]);
  }

  // Match coloured pips to units. Kuhn's algorithm: each pip claims a unit,
  // bumping an earlier pip to another of its options where it can.
  const unitForPip: number[] = new Array(pips.length).fill(-1);
  const pipForUnit: number[] = new Array(units.length).fill(-1);
  const canPay = (pip: Color[], unit: { colors: Color[] }) => unit.colors.some((c) => pip.includes(c));
  const tryAssign = (pipIndex: number, seen: boolean[]): boolean => {
    for (let u = 0; u < units.length; u++) {
      if (seen[u] || !canPay(pips[pipIndex]!, units[u]!)) continue;
      seen[u] = true;
      if (pipForUnit[u] === -1 || tryAssign(pipForUnit[u]!, seen)) {
        pipForUnit[u] = pipIndex;
        unitForPip[pipIndex] = u;
        return true;
      }
    }
    return false;
  };
  for (let p = 0; p < pips.length; p++) {
    if (!tryAssign(p, new Array(units.length).fill(false))) return false;
  }

  // Every coloured pip is covered; the rest of the units pay the generic part.
  const unitsLeft = units.length - pips.length;
  return unitsLeft >= cost.generic;
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
 * more useful than one that only helps with the generic portion. With the
 * current mono-coloured pools every source produces the deck's one colour, so
 * greedy is optimal; a cost with several hybrid symbols in it would still need
 * proper solving (see the limitations note in ROADMAP.md).
 *
 * Within equally useful sources it takes the painless one. A painland is a real
 * source and has to stay one - excluding it would leave Llanowar Wastes tapping
 * for nothing but colourless - but shooting yourself for mana a Forest could
 * have made is a decision no player would take, and this is making the decision
 * on their behalf.
 */
function chooseSource(sources: ManaSource[], pool: ManaPool, cost: ManaCost): ManaSource | null {
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
   *
   * But only while the hybrid is *not yet* coverable: once the pool can pay the
   * whole coloured-and-hybrid part (payColoredPart succeeds), the shortfall is
   * purely generic, and demanding a hybrid colour anyway would tap U/B sources
   * to nothing and starve a {3}{U/B} of its three generic - the pool has the
   * one U it needs and just wants three more lands of any kind.
   */
  if (shortfallColors.length === 0 && cost.hybrid?.length && payColoredPart(pool, cost) === null) {
    for (const symbol of cost.hybrid) {
      for (const color of symbol) {
        if (!shortfallColors.includes(color)) shortfallColors.push(color);
      }
    }
  }

  // Only the generic part is left: any untapped source helps, painless first.
  if (shortfallColors.length === 0) {
    return sources.find((s) => s.damageToController === 0) ?? sources[0] ?? null;
  }

  /*
   * Pay the scarcest colour first, from the least flexible source that makes it.
   *
   * Tapping a dual (Temple of Deceit makes U or B) for a colour a basic could
   * have made instead is how {1}{U}{B} failed with U from an Island still
   * available: the dual got spent on U and there was nothing left for B. So
   * count how many untapped permanents can make each needed colour, take the
   * rarest, and pay it from a single-colour source before a dual - which keeps
   * the flexible sources for the colours that have no other provider.
   */
  const instances = new Map<string, ManaSource[]>();
  for (const source of sources) {
    const list = instances.get(source.instance.instanceId) ?? [];
    list.push(source);
    instances.set(source.instance.instanceId, list);
  }
  const providerCount = (color: ManaColor): number =>
    [...instances.values()].filter((entries) => entries.some((e) => e.color === color)).length;
  // Only colours something untapped can actually make. A hybrid puts both of its
  // colours in the shortfall, but only one of them needs a source - and if one
  // half (say U) has no provider at all, targeting it makes no progress and
  // there is nothing to tap. Nothing payable here means this source can't help.
  const payable = shortfallColors.filter((color) => providerCount(color) > 0);
  if (payable.length === 0) return null;
  const targetColor = payable.sort((a, b) => providerCount(a) - providerCount(b))[0]!;

  const makers = [...instances.values()].filter((entries) => entries.some((e) => e.color === targetColor));
  makers.sort((a, b) => {
    // A single-colour source before a dual, so duals are held for scarce colours.
    const flexA = new Set(a.map((e) => e.color)).size;
    const flexB = new Set(b.map((e) => e.color)).size;
    if (flexA !== flexB) return flexA - flexB;
    // Then a painless source before a painland.
    const painA = a.some((e) => e.color === targetColor && e.damageToController === 0) ? 0 : 1;
    const painB = b.some((e) => e.color === targetColor && e.damageToController === 0) ? 0 : 1;
    return painA - painB;
  });
  const chosen = makers[0]!;
  return (
    chosen.find((e) => e.color === targetColor && e.damageToController === 0) ??
    chosen.find((e) => e.color === targetColor) ??
    null
  );
}

/**
 * Picks the next land (or mana creature) to tap toward paying `cost`. Returns
 * null when the pool already covers the cost or nothing left can help.
 */
export function nextSourceToTap(
  state: GameState,
  player: Player,
  cost: ManaCost,
): { instanceId: string; abilityIndex: number } | null {
  const chosen = chooseSource(manaSources(state, player), player.manaPool, cost);
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
export function planManaPayment(state: GameState, playerId: string, cost: ManaCost): ManaPlan {
  const player = requirePlayer(state, playerId);
  const pool: ManaPool = { ...player.manaPool };
  let available = manaSources(state, player);
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

/**
 * What it actually costs this player to cast this card right now, commander
 * tax included and {X} filled in. The tax is only charged from the command
 * zone, which is why this needs to know where the card is being cast from.
 *
 * `chosenX` matters because this is what the auto-tapper taps for: without it,
 * The Meathook Massacre cast for X = 3 would have three lands tapped for its
 * {B}{B} and then be refused for not affording {3}{B}{B}.
 */
export function castingCostOf(
  state: GameState,
  playerId: string,
  instanceId: string,
  fromCommandZone = false,
  chosenX = 0,
  useWarp = false,
  payOffspring = false,
): ManaCost {
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const def = requireDefinition(state, found.instance.definitionId);
  // Warp pays its own cost, so that is what auto-tap must reach for - the
  // printed cost would tap far too much and refuse an affordable warp.
  if (useWarp && def.warp) return def.warp.cost;
  const printed = def.manaCost ?? EMPTY_COST;
  let cost = costWithX(printed, chosenX);
  // Offspring stacks its cost on top, so auto-tap has to reach for both.
  if (payOffspring && def.offspring) {
    const colors = { ...cost.colors };
    for (const [color, count] of Object.entries(def.offspring.cost.colors ?? {})) {
      colors[color as keyof typeof colors] = (colors[color as keyof typeof colors] ?? 0) + (count ?? 0);
    }
    cost = { ...cost, generic: cost.generic + (def.offspring.cost.generic ?? 0), colors };
  }
  if (!fromCommandZone) return cost;
  return applyCommanderTax(cost, player.commanderCastCount[instanceId] ?? 0);
}

/**
 * Taps mana sources until `cost` is payable from the floating pool. Returns
 * whether it succeeded.
 *
 * Nothing is tapped at all when the cost can't be met, so a spell you cannot
 * afford never costs you a land. That matters because tapping is irreversible
 * - a half-paid cost would leave you strictly worse off than not having tried.
 */
export function autoTapForCost(state: GameState, playerId: string, cost: ManaCost): boolean {
  return tapSourcesFor(state, playerId, cost).paid;
}

/**
 * The undoable form. Also reports which permanents it tapped, so a caller
 * whose action then turns out to be illegal can put them back - see
 * `withAutoTap`.
 */
function tapSourcesFor(
  state: GameState,
  playerId: string,
  cost: ManaCost,
): { paid: boolean; tappedInstanceIds: string[] } {
  const player = requirePlayer(state, playerId);
  if (canPayManaCostFromPool(player.manaPool, cost)) return { paid: true, tappedInstanceIds: [] };
  if (!couldAfford(state, playerId, cost)) return { paid: false, tappedInstanceIds: [] };

  const tappedInstanceIds: string[] = [];
  // Bounded by the number of permanents that could possibly be tapped, so a
  // source that somehow fails to reduce the shortfall ends the loop instead of
  // spinning forever.
  for (let guard = player.battlefield.length; guard > 0; guard--) {
    const next = nextSourceToTap(state, player, cost);
    if (!next) break;
    activateAbility(state, playerId, next.instanceId, next.abilityIndex);
    tappedInstanceIds.push(next.instanceId);
  }
  return { paid: canPayManaCostFromPool(player.manaPool, cost), tappedInstanceIds };
}

/**
 * Taps for `cost`, runs `action`, and puts every tapped permanent back if the
 * action throws.
 *
 * Without this, clicking a card that turns out to be illegal - an instant at
 * the wrong time, a spell whose target just died - would leave the lands
 * tapped and the mana floating, costing a whole turn's mana for an action that
 * never happened. Tapping is irreversible in the real game precisely because
 * you chose to do it; doing it automatically means the engine has to be able
 * to take it back.
 *
 * Safe to undo because mana abilities resolve immediately and do nothing but
 * add mana - no triggers fire, nothing else observes the tap.
 */
function withAutoTap(state: GameState, playerId: string, cost: ManaCost, action: () => void): void {
  const player = requirePlayer(state, playerId);
  const poolBefore = { ...player.manaPool };
  const { tappedInstanceIds } = tapSourcesFor(state, playerId, cost);
  try {
    action();
  } catch (err) {
    for (const instanceId of tappedInstanceIds) {
      const found = findInstance(state, instanceId);
      if (found) found.instance.tapped = false;
    }
    player.manaPool = poolBefore;
    throw err;
  }
}

/**
 * Casts a spell, tapping lands for it first if the floating pool doesn't
 * already cover the cost.
 *
 * Everything else - timing, targets, priority, commander tax, Ward - is left
 * entirely to `castSpell`. This only removes the manual tapping step; it never
 * makes an otherwise illegal cast legal.
 */
export function castSpellWithAutoTap(
  state: GameState,
  playerId: string,
  instanceId: string,
  targets: StackTarget[] = [],
  options: CastOptions = {},
): void {
  const cost = castingCostOf(
    state,
    playerId,
    instanceId,
    options.fromCommandZone,
    options.chosenX ?? 0,
    options.useWarp,
    options.payOffspring,
  );
  withAutoTap(state, playerId, cost, () => castSpell(state, playerId, instanceId, targets, options));
}

/** The same convenience for an activated ability that costs mana (not just a tap). */
export function activateAbilityWithAutoTap(
  state: GameState,
  playerId: string,
  instanceId: string,
  abilityIndex: number,
  targets: StackTarget[] = [],
  options: { discardInstanceIds?: string[] } = {},
): void {
  const found = findInstance(state, instanceId);
  const ability = found
    ? requireDefinition(state, found.instance.definitionId).activatedAbilities?.[abilityIndex]
    : undefined;
  const run = () => activateAbility(state, playerId, instanceId, abilityIndex, targets, options);
  if (!ability?.cost.mana) {
    run();
    return;
  }
  withAutoTap(state, playerId, ability.cost.mana, run);
}
