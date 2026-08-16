import { ALL_COLORS, type CardInstance, type Color, type GameState, type ManaColor, type ManaCost, type ManaPool, type Player, type StackTarget } from "./types.js";
import { findInstance, requireDefinition, requirePlayer } from "./state.js";
import { abilityAvailable, addMana, applyCommanderTax, canPayManaCostFromPool, isFreeManaAbility, potentialAvailableMana } from "./mana.js";
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
export function couldAfford(state: GameState, playerId: string, cost: ManaCost): boolean {
  return canPayManaCostFromPool(potentialAvailableMana(state, playerId), cost);
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
): ManaCost {
  const player = requirePlayer(state, playerId);
  const found = findInstance(state, instanceId);
  if (!found) throw new Error(`Unknown card instance: ${instanceId}`);
  const printed = requireDefinition(state, found.instance.definitionId).manaCost ?? EMPTY_COST;
  const cost = costWithX(printed, chosenX);
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
  const cost = castingCostOf(state, playerId, instanceId, options.fromCommandZone, options.chosenX ?? 0);
  withAutoTap(state, playerId, cost, () => castSpell(state, playerId, instanceId, targets, options));
}

/** The same convenience for an activated ability that costs mana (not just a tap). */
export function activateAbilityWithAutoTap(
  state: GameState,
  playerId: string,
  instanceId: string,
  abilityIndex: number,
  targets: StackTarget[] = [],
): void {
  const found = findInstance(state, instanceId);
  const ability = found
    ? requireDefinition(state, found.instance.definitionId).activatedAbilities?.[abilityIndex]
    : undefined;
  const run = () => activateAbility(state, playerId, instanceId, abilityIndex, targets);
  if (!ability?.cost.mana) {
    run();
    return;
  }
  withAutoTap(state, playerId, ability.cost.mana, run);
}
