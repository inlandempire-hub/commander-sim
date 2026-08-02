import type { GameState } from "./types.js";
import { cardName, findInstance, log, moveCard } from "./state.js";
import { applyEffect } from "./effects.js";
import { putOntoBattlefield } from "./permanents.js";

// pushOntoStack and putOntoBattlefield live in permanents.ts so that effects.ts
// can use them without importing this module (which imports effects.ts).
// Import them from there, not from here - re-exporting would give the package
// index two paths to the same symbol.

/**
 * Resolves the top object of the stack.
 * Permanent spells (creatures/artifacts/etc) move to the battlefield and fire
 * their enters-the-battlefield triggers instead of applying `effect` directly.
 * Triggered/activated abilities have no card of their own on the stack - only
 * spells (instants, sorceries, permanents) do - so only those get moved afterward.
 */
export function resolveTopOfStack(state: GameState): void {
  const obj = state.stack.pop();
  if (!obj) return;

  if (obj.isPermanentSpell) {
    log(state, `${obj.controllerId} resolves ${cardName(state, obj.sourceInstanceId)}`);
    putOntoBattlefield(state, obj.sourceInstanceId);
    return;
  }

  log(state, `${obj.controllerId} resolves ${cardName(state, obj.sourceInstanceId)}`);
  applyEffect(state, obj.controllerId, obj.sourceInstanceId, obj.effect, obj.targets);

  const source = findInstance(state, obj.sourceInstanceId);
  if (source && source.instance.zone === "stack") {
    moveCard(state, obj.sourceInstanceId, "graveyard");
  }
}
