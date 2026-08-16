import type { GameState, StackTarget } from "./types.js";
import { findInstance, log, requirePlayer, requireDefinition } from "./state.js";
import { canPayManaCost, payManaCost } from "./mana.js";
import { effectiveWard } from "./counters.js";

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
    /*
     * The ward this permanent has *right now*, which is not always the one
     * printed on it: Hexing Squelcher hands "Ward - Pay 2 life" to every other
     * creature its controller has. Reading the card here would have protected
     * the Squelcher and nothing else.
     */
    const ward = effectiveWard(state, found.instance);
    if (!ward) continue;
    /*
     * "Ward-Pay 3 life" - Sedgemoor Witch. Ward's cost is not always mana, and
     * the same auto-pay shortcut applies: paid without asking if it can be
     * afforded, and the spell countered if it cannot.
     *
     * Strictly more life than the cost, never exactly enough. The shortcut pays
     * without asking, so a player who could pay down to 0 would be conceded on
     * their behalf by a spell they chose to cast - which is the one place this
     * simplification would do real damage rather than merely remove a choice.
     */
    if (ward.life !== undefined) {
      if (caster.life <= ward.life) return false;
      caster.life -= ward.life;
      log(state, `${casterId} pays ${ward.life} life for ward`);
      continue;
    }
    const cost = ward.mana ?? { generic: 0, colors: {} };
    if (!canPayManaCost(caster, cost)) return false;
    payManaCost(caster, cost);
  }
  return true;
}
