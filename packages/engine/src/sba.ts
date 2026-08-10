import type { GameState } from "./types.js";
import { findInstance, log, moveCard, requireDefinition } from "./state.js";
import { describeSubject, fireWatchers, pushTrigger } from "./permanents.js";
import { effectiveToughness } from "./counters.js";
import { useRegenerationShield } from "./regeneration.js";

const COMMANDER_DAMAGE_THRESHOLD = 21;

/**
 * The commander replacement effect: a commander that would go anywhere other
 * than the battlefield or command zone instead goes to the command zone.
 * Phase 1 always takes this replacement (the real rule makes it optional for
 * the owner - a "may" choice UI hook is future work once a client exists).
 */
function moveDyingCreatureToItsZone(state: GameState, instanceId: string, isCommander: boolean): void {
  const found = findInstance(state, instanceId);
  const diedFromBattlefield = found?.instance.zone === "battlefield";
  const controllerId = found?.instance.controllerId;
  const def = found ? state.cardDefinitions[found.instance.definitionId] : undefined;

  if (diedFromBattlefield) {
    log(state, `${def?.name ?? "A creature"} dies${isCommander ? " (returned to the command zone)" : ""}`);
  }

  /*
   * What the dying permanent looked like, captured while it is still on the
   * battlefield.
   *
   * `moveCard` clears its +1/+1 counters on the way out, so a watcher asking
   * "did a creature *with a counter on it* die" cannot be answered after the
   * move - it would be false every single time, and Meltstrider Eulogist would
   * simply never draw a card.
   */
  const subject =
    diedFromBattlefield && found ? describeSubject(state, found.instance, def) : null;
  const dyingInstance = found?.instance;

  moveCard(state, instanceId, isCommander ? "command" : "graveyard");

  // "Dies" means specifically "was put into a graveyard from the battlefield",
  // so a commander redirected to the command zone still counts as having died.
  if (!diedFromBattlefield || !controllerId) return;

  if (def?.types.includes("Creature")) state.creatureDeathsThisTurn += 1;

  for (const trigger of def?.triggeredAbilities ?? []) {
    if (trigger.event === "dies") {
      pushTrigger(state, instanceId, controllerId, trigger);
    }
  }

  // Everything else that was watching for a death. The dying card is handed in
  // separately because it is no longer on the battlefield to be scanned, and
  // some cards of this family ("this creature or another creature dies") watch
  // their own.
  if (subject && dyingInstance) fireWatchers(state, "permanent-dies", subject, dyingInstance);
}

/**
 * Sacrifices a permanent its controller owns.
 *
 * Sacrificing is not destruction - it cannot be prevented, and Indestructible
 * does not stop it - but it *is* a permanent being put into a graveyard from
 * the battlefield, so it dies in the rules sense and anything watching for that
 * fires. Reusing the death handler rather than writing a second move is what
 * guarantees that: a separate `moveCard` here would silently skip every dies
 * trigger and the commander replacement effect at once.
 */
export function sacrificePermanent(state: GameState, instanceId: string): void {
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "battlefield") return;
  const def = state.cardDefinitions[found.instance.definitionId];
  log(state, `${found.instance.controllerId} sacrifices ${def?.name ?? "a permanent"}`);
  moveDyingCreatureToItsZone(state, instanceId, found.instance.isCommander === true);
}

/**
 * Checks and applies state-based actions until the game state is stable:
 * lethal damage/toughness<=0 destroys creatures (respecting the commander
 * replacement effect and indestructible), the legend rule, and loss
 * conditions (life <= 0, drawing from an empty library, 21+ commander damage).
 */
export function checkStateBasedActions(state: GameState): void {
  let changed = true;
  while (changed) {
    changed = false;

    for (const player of state.players) {
      for (const instance of [...player.battlefield]) {
        const def = requireDefinition(state, instance.definitionId);
        if (!def.types.includes("Creature")) continue;
        const toughness = effectiveToughness(state, instance);
        const indestructible = def.keywords?.includes("Indestructible") ?? false;
        const lethalNormalDamage = instance.damageMarked >= toughness && toughness > 0;
        // Deathtouch: any nonzero damage from a deathtouch source is lethal regardless of amount.
        const lethalDeathtouchDamage = instance.deathtouchDamage && instance.damageMarked > 0;
        const lethalDamage = !indestructible && (lethalNormalDamage || lethalDeathtouchDamage);
        /*
         * Toughness 0 or less is checked first and is not destruction - the
         * creature is simply put into its graveyard (rule 704.5a), so
         * regeneration cannot save it. That is the whole reason -N/-N is the
         * removal of choice against a regenerating deck, and writing the shield
         * check above this line would have quietly turned Swarmyard into
         * protection from a board wipe it does nothing against.
         */
        if (toughness <= 0) {
          moveDyingCreatureToItsZone(state, instance.instanceId, instance.isCommander);
          changed = true;
          continue;
        }
        if (lethalDamage) {
          if (useRegenerationShield(state, instance)) {
            changed = true;
            continue;
          }
          moveDyingCreatureToItsZone(state, instance.instanceId, instance.isCommander);
          changed = true;
        }
      }
    }

    // Legend rule: a player controlling 2+ legendary permanents with the same name keeps only one.
    for (const player of state.players) {
      const legendaryByName = new Map<string, string[]>();
      for (const instance of player.battlefield) {
        const def = requireDefinition(state, instance.definitionId);
        if (!def.supertypes?.includes("Legendary")) continue;
        const list = legendaryByName.get(def.name) ?? [];
        list.push(instance.instanceId);
        legendaryByName.set(def.name, list);
      }
      for (const [, instanceIds] of legendaryByName) {
        if (instanceIds.length <= 1) continue;
        const [keep, ...rest] = instanceIds;
        void keep;
        for (const id of rest) {
          const instance = player.battlefield.find((c) => c.instanceId === id);
          moveDyingCreatureToItsZone(state, id, instance?.isCommander ?? false);
          changed = true;
        }
      }
    }

    for (const player of state.players) {
      if (player.hasLost) continue;
      if (player.life <= 0) {
        player.hasLost = true;
        player.lossReason = "life total dropped to 0 or less";
        changed = true;
        continue;
      }
      if (player.attemptedDrawFromEmptyLibrary) {
        player.hasLost = true;
        player.lossReason = "attempted to draw from an empty library";
        changed = true;
        continue;
      }
      for (const [commanderInstanceId, damage] of Object.entries(player.commanderDamageTaken)) {
        if (damage >= COMMANDER_DAMAGE_THRESHOLD) {
          player.hasLost = true;
          player.lossReason = `took ${damage} combat damage from commander ${commanderInstanceId}`;
          changed = true;
          break;
        }
      }
    }
  }
}
