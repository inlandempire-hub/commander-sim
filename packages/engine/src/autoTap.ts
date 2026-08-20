import { ALL_COLORS, type CardInstance, type Color, type GameState, type ManaColor, type ManaCost, type ManaPool, type Player, type StackTarget } from "./types.js";
import { findInstance, requireDefinition, requirePlayer } from "./state.js";
import {
  addMana,
  applyCommanderTax,
  canPayManaCostFromPool,
  couldAfford,
  nextSourceToTap,
} from "./mana.js";
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

/*
 * The pure half of this file lives in mana.js now - see the note there.
 * Re-exported so nothing that imports the auto-tapper has to know it moved, and
 * because these really are part of the auto-tapper's story rather than of the
 * pool maths.
 */
export {
  couldAfford,
  manaSources,
  nextSourceToTap,
  planManaPayment,
  type ManaPlan,
  type ManaSource,
  type PlannedTap,
} from "./mana.js";

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
  /**
   * The permanent about to be tapped as part of the thing being paid for, which
   * therefore cannot also pay for it. See `manaSources`.
   */
  excludeInstanceId?: string,
): { paid: boolean; tappedInstanceIds: string[] } {
  const player = requirePlayer(state, playerId);
  if (canPayManaCostFromPool(player.manaPool, cost)) return { paid: true, tappedInstanceIds: [] };
  if (!couldAfford(state, playerId, cost, excludeInstanceId)) return { paid: false, tappedInstanceIds: [] };

  const tappedInstanceIds: string[] = [];
  // Bounded by the number of permanents that could possibly be tapped, so a
  // source that somehow fails to reduce the shortfall ends the loop instead of
  // spinning forever.
  for (let guard = player.battlefield.length; guard > 0; guard--) {
    const next = nextSourceToTap(state, player, cost, excludeInstanceId);
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
function withAutoTap(
  state: GameState,
  playerId: string,
  cost: ManaCost,
  action: () => void,
  excludeInstanceId?: string,
): void {
  const player = requirePlayer(state, playerId);
  const poolBefore = { ...player.manaPool };
  const { tappedInstanceIds } = tapSourcesFor(state, playerId, cost, excludeInstanceId);
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
  /** "Choose one -" on an ability, carried through untouched. */
  chosenMode?: number,
): void {
  const found = findInstance(state, instanceId);
  const ability = found
    ? requireDefinition(state, found.instance.definitionId).activatedAbilities?.[abilityIndex]
    : undefined;
  const run = () => activateAbility(state, playerId, instanceId, abilityIndex, targets, chosenMode);
  if (!ability?.cost.mana) {
    run();
    return;
  }
  /*
   * An ability that taps its own permanent must not have that permanent spent
   * paying for it. Only excluded when the cost actually says "{T}": a mana
   * ability with a mana cost and no tap - none exist yet - would still be free
   * to use whatever is on the board.
   */
  withAutoTap(state, playerId, ability.cost.mana, run, ability.cost.tap ? instanceId : undefined);
}
