import {
  applyCommanderTax,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type ManaCost,
  type Player,
  type StackTarget,
} from "@mtg-commander-sim/engine";
import { definitionOf } from "./evaluate.js";
import { couldAfford, nextSourceToTap } from "./mana.js";
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
  return { instance: commander, definition, cost, fromCommandZone: true };
}

/**
 * Turns "I want to cast this" into the next concrete action: tap another
 * source if the pool is short, otherwise actually cast it.
 */
export function castOrTapToward(
  state: GameState,
  me: Player,
  target: Castable,
  targets: StackTarget[] = [],
): BotAction {
  const source = nextSourceToTap(state, me, target.cost);
  if (source) {
    return { kind: "activateAbility", instanceId: source.instanceId, abilityIndex: source.abilityIndex, targets: [] };
  }
  return {
    kind: "castSpell",
    instanceId: target.instance.instanceId,
    targets,
    fromCommandZone: target.fromCommandZone,
  };
}
