import type { GameState, StackTarget } from "./types.js";
import { findInstance, requirePlayer, requireDefinition } from "./state.js";
import { canPayManaCost, payManaCost } from "./mana.js";

/**
 * Ward: "Whenever this creature becomes the target of a spell or ability an
 * opponent controls, counter that spell/ability unless they pay [cost]."
 * Real Ward is an opt-in choice (you could decline to pay even if you could
 * afford it) resolved via its own triggered ability on the stack. This
 * engine has no mid-resolution player-decision flow yet, so it's simplified
 * to "auto-pay if the caster's floating mana pool can cover it, otherwise
 * counter" - no opportunity to decline, and no tapping additional sources
 * to cover it (only mana already floating counts). Document this alongside
 * Ward cards, same spirit as the other Phase-1 simplifications in ROADMAP.md.
 *
 * Returns true if the spell/ability should proceed (no Ward triggered, or
 * every Ward cost was paid), false if it must be countered.
 */
export function attemptWardPayments(state: GameState, casterId: string, targets: StackTarget[]): boolean {
  const caster = requirePlayer(state, casterId);
  for (const target of targets) {
    if (target.kind !== "card") continue;
    const found = findInstance(state, target.instanceId);
    if (!found) continue;
    if (found.instance.controllerId === casterId) continue; // Ward only triggers against opponents' spells/abilities
    const def = requireDefinition(state, found.instance.definitionId);
    if (!def.keywords?.includes("Ward")) continue;
    const cost = def.wardCost ?? { generic: 0, colors: {} };
    if (!canPayManaCost(caster, cost)) return false;
    payManaCost(caster, cost);
  }
  return true;
}
