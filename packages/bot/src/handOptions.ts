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
}

/** Two costs added together - used to check "can I afford this AND still hold up my counterspell?". */
export function addCosts(a: ManaCost, b: ManaCost): ManaCost {
  const colors: ManaCost["colors"] = { ...a.colors };
  for (const [color, count] of Object.entries(b.colors)) {
    const key = color as keyof ManaCost["colors"];
    colors[key] = (colors[key] ?? 0) + (count ?? 0);
  }
  return { generic: a.generic + b.generic, colors };
}

export function castableFromHand(
  state: GameState,
  me: Player,
  filter: (def: CardDefinition) => boolean,
  /** Mana that must still be payable afterwards - see reserveForCounterspell. */
  reserve: ManaCost = NO_COST,
): Castable[] {
  return me.hand
    .map((instance) => ({ instance, definition: definitionOf(state, instance) }))
    .filter((entry): entry is { instance: CardInstance; definition: CardDefinition } => entry.definition !== undefined)
    .filter((entry) => !entry.definition.types.includes("Land"))
    .filter((entry) => filter(entry.definition))
    .map((entry) => ({
      instance: entry.instance,
      definition: entry.definition,
      cost: entry.definition.manaCost ?? NO_COST,
      fromCommandZone: false,
    }))
    /*
     * A spell whose additional cost cannot be paid cannot be cast at all - the
     * engine throws rather than casting it for less - so it is filtered out
     * here beside the mana rather than left for a decision path to trip over.
     */
    .filter((c) => canPayAdditionalCost(state, me.id, c.definition, 0))
    .filter(
      (c) =>
        // A free alternative cost is affordable whatever the pool holds.
        (c.definition.alternativeCost !== undefined &&
          controllerMeets(state, me.id, c.definition.alternativeCost.condition)) ||
        couldAfford(state, me.id, addCosts(c.cost, reserve)),
    );
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
  return {
    kind: "castSpell",
    instanceId: target.instance.instanceId,
    targets,
    fromCommandZone: target.fromCommandZone,
    chosenX: chooseX(state, me, target),
    sacrificeInstanceId: chooseSacrifice(state, me, def),
    /*
     * Free is free: every printing of this shape is strictly better cast for
     * nothing, because the condition it asks about is one the bot has already
     * met by the time this is offered. Taken rather than weighed.
     */
    useAlternativeCost:
      def.alternativeCost && controllerMeets(state, me.id, def.alternativeCost.condition)
        ? true
        : undefined,
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
