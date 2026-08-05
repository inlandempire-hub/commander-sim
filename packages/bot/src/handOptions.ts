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
  return {
    kind: "castSpell",
    instanceId: target.instance.instanceId,
    targets,
    fromCommandZone: target.fromCommandZone,
  };
}
