import { canPlayCardNow, castRestrictionProblem } from "@mtg-commander-sim/engine";
import {
  affordableXValues,
  applyCommanderTax,
  canPayAdditionalCost,
  controllerMeets,
  effectivePower,
  requireDefinition,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type ManaCost,
  type Player,
  type StackTarget,
} from "@mtg-commander-sim/engine";
import { definitionOf } from "./evaluate.js";
import { couldAfford } from "./mana.js";
import type { BotAction } from "./types.js";

export const NO_COST: ManaCost = { generic: 0, colors: {} };

/** A spell the bot could cast, with the cost it would actually pay (commander tax included). */
export interface Castable {
  instance: CardInstance;
  definition: CardDefinition;
  cost: ManaCost;
  fromCommandZone: boolean;
  /** Whether the cost above is the card's alternative cost rather than its mana cost. */
  useAlternativeCost?: boolean;
}

/**
 * Which cost the bot would actually pay for a card, and whether it is the
 * alternative one.
 *
 * An alternative cost is not always free: Deadly Rollick's is (no mana at all),
 * but Dig Up's cleave and Blasphemous Edict's reduced cost carry a real mana
 * cost. Taking the alternative blindly and then assuming it costs nothing is how
 * the bot proposed a cleave it could not pay for. So: a free alternative (or one
 * paid by a sacrifice) is always taken; a mana alternative is taken only when it
 * is affordable, and otherwise the card is cast for its ordinary cost.
 */
function costToPay(
  state: GameState,
  me: Player,
  def: CardDefinition,
): { cost: ManaCost; useAlternativeCost: boolean } {
  const normal = def.manaCost ?? NO_COST;
  const alt = def.alternativeCost;
  if (!alt || !controllerMeets(state, me.id, alt.condition)) {
    return { cost: normal, useAlternativeCost: false };
  }
  // An alternative paid by a sacrifice is only available if there is a creature
  // that fits it - Flare of Denial wants a nontoken blue one. Without this the
  // bot took the "free" alternative and then had nothing to give up.
  if (alt.sacrifice && alternativeSacrifice(state, me, def) === undefined) {
    return { cost: normal, useAlternativeCost: false };
  }
  if (alt.manaCost === undefined) return { cost: NO_COST, useAlternativeCost: true };
  if (couldAfford(state, me.id, alt.manaCost)) return { cost: alt.manaCost, useAlternativeCost: true };
  return { cost: normal, useAlternativeCost: false };
}

/** Two costs added together - used to check "can I afford this AND still hold up my counterspell?". */
export function addCosts(a: ManaCost, b: ManaCost): ManaCost {
  const colors: ManaCost["colors"] = { ...a.colors };
  for (const [color, count] of Object.entries(b.colors)) {
    const key = color as keyof ManaCost["colors"];
    colors[key] = (colors[key] ?? 0) + (count ?? 0);
  }
  // Hybrid and Phyrexian pips must ride along, or a {3}{U/B} passed through here
  // loses its coloured half and reads as a plain {3} the bot cannot actually pay
  // for - which is exactly how Waterlogged Teachings was proposed unaffordably.
  const hybrid = [...(a.hybrid ?? []), ...(b.hybrid ?? [])];
  const phyrexian = [...(a.phyrexian ?? []), ...(b.phyrexian ?? [])];
  return {
    generic: a.generic + b.generic,
    colors,
    ...(hybrid.length ? { hybrid } : {}),
    ...(phyrexian.length ? { phyrexian } : {}),
  };
}

export function castableFromHand(
  state: GameState,
  me: Player,
  filter: (def: CardDefinition) => boolean,
  /** Mana that must still be payable afterwards - see reserveForCounterspell. */
  reserve: ManaCost = NO_COST,
  /**
   * Whether the card has to be castable *right now*.
   *
   * True for every caller that is about to cast something. False for
   * `reserveForCounterspell`, which is the opposite question: how much mana to
   * hold back for a spell it explicitly cannot cast yet. Filtering that by "can
   * I cast it this instant" reserved nothing, ever.
   */
  nowOnly = true,
): Castable[] {
  return me.hand
    .map((instance) => ({ instance, definition: definitionOf(state, instance) }))
    .filter((entry): entry is { instance: CardInstance; definition: CardDefinition } => entry.definition !== undefined)
    .filter((entry) => !entry.definition.types.includes("Land"))
    .filter((entry) => filter(entry.definition))
    .map((entry) => {
      const plan = costToPay(state, me, entry.definition);
      return {
        instance: entry.instance,
        definition: entry.definition,
        cost: plan.cost,
        useAlternativeCost: plan.useAlternativeCost,
        fromCommandZone: false,
      };
    })
    /*
     * A spell whose additional cost cannot be paid cannot be cast at all - the
     * engine throws rather than casting it for less - so it is filtered out
     * here beside the mana rather than left for a decision path to trip over.
     */
    .filter((c) => canPayAdditionalCost(state, me.id, c.definition, 0))
    /*
     * The hate pieces. An Archon of Emeria on the table makes the second spell
     * of the turn uncastable, and the engine throws rather than declining - so
     * a bot that did not ask would propose an illegal action the moment either
     * deck ran one. Filtered here beside the additional cost for the same
     * reason: it is a question about whether the spell can be cast at all.
     */
    .filter((c) => castRestrictionProblem(state, me.id, c.definition, "hand") === undefined)
    /*
     * **Timing.** A creature cannot be cast in a combat step, and the engine
     * throws rather than declining - so a bot that did not ask would propose an
     * illegal action every time it held an instant window open with a creature
     * in hand.
     *
     * `canPlayCardNow` is the engine's own answer, and the same one the client
     * lights cards up with, so the bot cannot come to a different view of what
     * is playable than the game will accept.
     */
    .filter((c) => !nowOnly || canPlayCardNow(state, me.id, c.instance.instanceId))
    // `cost` already reflects which cost will be paid (alternative or ordinary),
    // so a plain affordability check covers both - the alternative is no longer
    // assumed to be free.
    .filter((c) => couldAfford(state, me.id, addCosts(c.cost, reserve)));
}

/** The commander, if it's sitting in the command zone and we can pay the tax. */
export function castableCommander(state: GameState, me: Player, reserve: ManaCost = NO_COST): Castable | null {
  const commander = me.command[0];
  if (!commander) return null;
  const definition = definitionOf(state, commander);
  if (!definition) return null;
  const cost = applyCommanderTax(
    definition.manaCost ?? NO_COST,
    me.commanderCastCount[commander.instanceId] ?? 0,
  );
  if (!couldAfford(state, me.id, addCosts(cost, reserve))) return null;
  // Drannith Magistrate turns the command zone off, which in this format is
  // most of what the card does - and the commander is exactly the spell a bot
  // reaches for first.
  if (castRestrictionProblem(state, me.id, definition, "command") !== undefined) return null;
  /*
   * And the timing, which the command zone needs as much as the hand does: a
   * commander is a creature spell in this format and cannot be cast in a combat
   * step. Same question, same answer, same function.
   */
  if (!canPlayCardNow(state, me.id, commander.instanceId)) return null;
  return { instance: commander, definition, cost, fromCommandZone: true };
}

/**
 * Turns "I want to cast this" into the action that casts it.
 *
 * It used to return one tap-a-land action at a time and only cast once the
 * pool covered the cost. That was right when it was written - the bot was the
 * only thing that had to pay for its own spells - but the engine gained
 * auto-tap (`castSpellWithAutoTap`) and every path the bot's actions travel
 * now taps for it: the client's controller, the server, and the test harness.
 * So the tapping loop had become pure ceremony, and an expensive kind: the bot
 * acts on a timer, so a four-mana spell meant four visible pauses tapping
 * lands one at a time before anything happened - while a human casting the
 * same card just clicks it.
 *
 * `couldAfford` already checks untapped sources rather than the floating pool,
 * so this only ever returns a cast the bot can actually pay for.
 */
export function castOrTapToward(
  state: GameState,
  me: Player,
  target: Castable,
  targets: StackTarget[] = [],
): BotAction {
  const def = target.definition;
  /*
   * Whether to take the alternative cost was decided in `costToPay` when this
   * Castable was built - and it is the same decision the affordability filter
   * used, so the bot never announces an alternative it cannot pay for. Falls
   * back to recomputing it for a Castable built elsewhere (the commander).
   */
  const useAlt = target.useAlternativeCost ?? costToPay(state, me, def).useAlternativeCost;
  return {
    kind: "castSpell",
    instanceId: target.instance.instanceId,
    targets,
    fromCommandZone: target.fromCommandZone,
    chosenX: chooseX(state, me, target),
    // The alternative cost's sacrifice when taking it (Flare of Denial),
    // otherwise the additional-cost sacrifice (Tend the Pests).
    sacrificeInstanceId: useAlt ? alternativeSacrifice(state, me, def) : chooseSacrifice(state, me, def),
    useAlternativeCost: useAlt ? true : undefined,
  };
}

/**
 * What to announce for {X}.
 *
 * Two different questions wearing the same symbol. A *negative* X is a board
 * wipe - Toxic Deluge - and the right answer is the smallest number that kills
 * everything the opponent has, because every point beyond that is life paid for
 * nothing and toughness taken off the bot's own creatures. Everything else
 * wants the largest X it can pay for.
 *
 * `affordableXValues` is the engine's own list, so the bot can never announce a
 * figure the cast is about to refuse.
 */
function chooseX(state: GameState, me: Player, target: Castable): number | undefined {
  const options = affordableXValues(state, me.id, target.instance.instanceId);
  if (options.length === 0) return undefined;
  const effect = target.definition.castEffect;
  const negative =
    effect?.kind === "pumpAll" &&
    typeof effect.power !== "number" &&
    effect.power.kind === "x" &&
    effect.power.negate === true;
  if (negative) {
    const theirs = state.players
      .filter((p) => p.id !== me.id)
      .flatMap((p) => p.battlefield)
      .filter((c) => requireDefinition(state, c.definitionId).types.includes("Creature"))
      .map((c) => effectivePower(state, c));
    // Nothing to kill: cast it for nothing rather than paying life to wipe an
    // empty board. The decision to cast at all was made further up.
    const needed = theirs.length === 0 ? 0 : Math.max(...theirs);
    return options.filter((x) => x >= needed).at(0) ?? options[options.length - 1];
  }
  return options[options.length - 1];
}

/**
 * Which creature to give up for "as an additional cost, sacrifice a creature".
 *
 * The weakest one by power, which is the safe default and *not* the greedy one:
 * Tend the Pests makes a Pest per point of power, so feeding it the best
 * creature makes the most tokens and is usually still the wrong trade. A bot
 * that hands over its bomb to make four 1/1s would be worse than one that does
 * not cast the card at all.
 */
function chooseSacrifice(state: GameState, me: Player, def: CardDefinition): string | undefined {
  if (def.additionalCost?.kind !== "sacrifice-creature") return undefined;
  const creatures = me.battlefield.filter((c) =>
    requireDefinition(state, c.definitionId).types.includes("Creature"),
  );
  if (creatures.length === 0) return undefined;
  return creatures.reduce((worst, c) =>
    effectivePower(state, c) < effectivePower(state, worst) ? c : worst,
  ).instanceId;
}

/**
 * The creature given up for an alternative cost that is paid by a sacrifice -
 * Flare of Denial's "sacrifice a nontoken blue creature". The weakest one that
 * fits, so the counter costs the least board.
 */
function alternativeSacrifice(state: GameState, me: Player, def: CardDefinition): string | undefined {
  const sac = def.alternativeCost?.sacrifice;
  if (!sac) return undefined;
  const fits = me.battlefield.filter((c) => {
    const cdef = requireDefinition(state, c.definitionId);
    if (!cdef.types.includes("Creature")) return false;
    if (sac.nontoken && cdef.isToken) return false;
    if (sac.color && (cdef.manaCost?.colors?.[sac.color] ?? 0) <= 0) return false;
    return true;
  });
  if (fits.length === 0) return undefined;
  return fits.reduce((worst, c) => (effectivePower(state, c) < effectivePower(state, worst) ? c : worst)).instanceId;
}
