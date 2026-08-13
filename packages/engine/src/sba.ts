import type { GameState } from "./types.js";
import { findInstance, log, moveCard, requireDefinition } from "./state.js";
import { describeSubject, fireWatchers, pushTrigger } from "./permanents.js";
import { effectiveToughness, effectiveTriggers, hasKeyword } from "./counters.js";
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

  if (dyingInstance) {
    for (const trigger of effectiveTriggers(state, dyingInstance)) {
      if (trigger.event === "dies") {
        pushTrigger(state, instanceId, controllerId, trigger);
      }
    }
  }

  // Everything else that was watching for a death. The dying card is handed in
  // separately because it is no longer on the battlefield to be scanned, and
  // some cards of this family ("this creature or another creature dies") watch
  // their own.
  if (subject && dyingInstance) {
    fireWatchers(state, "permanent-dies", subject, dyingInstance);
    // A death is also a departure. The Ozolith catches the counters here and,
    // by way of `leaveBattlefield` below, on every other way out too.
    fireWatchers(state, "leaves-battlefield", subject, dyingInstance);
  }
}

/**
 * A permanent leaving the battlefield without dying - exiled, bounced, tucked.
 *
 * Separate from the death path because the two are genuinely different events
 * and a card may watch either: nothing that says "dies" should fire for an
 * exile, and The Ozolith - which says "leaves the battlefield" - fires for
 * both. The subject is captured before the move for the usual reason: the
 * counters are gone a line later.
 */
export function leaveBattlefield(state: GameState, instanceId: string, destination: "exile" | "hand"): void {
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "battlefield") return;
  const subject = describeSubject(state, found.instance);
  const leavingInstance = found.instance;
  moveCard(state, instanceId, destination);
  fireWatchers(state, "leaves-battlefield", subject, leavingInstance);
}

/**
 * Destroys a permanent, with every consequence a death carries.
 *
 * Exported because `destroy` in effects.ts used to call `moveCard` on its own,
 * which quietly skipped the dies triggers, the death count and the commander
 * replacement effect all at once: a creature killed in combat fired its
 * ability and the same creature killed by Assassin's Trophy did not. Indestructible
 * and regeneration are checked by the caller, which is where the card's own
 * wording decides whether they apply.
 */
export function destroyPermanent(state: GameState, instanceId: string): void {
  const found = findInstance(state, instanceId);
  if (!found || found.instance.zone !== "battlefield") return;
  moveDyingCreatureToItsZone(state, instanceId, found.instance.isCommander === true);
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
  /*
   * Captured before the move, and the watchers fired after it, so a card
   * created by the sacrifice (Fumulus makes an Insect) arrives on a board where
   * the sacrificed permanent has already gone.
   */
  const subject = describeSubject(state, found.instance, def);
  const sacrificedInstance = found.instance;
  moveDyingCreatureToItsZone(state, instanceId, found.instance.isCommander === true);
  /*
   * "Whenever a player sacrifices a nontoken creature" - a separate event from
   * the death, because every sacrifice is a death and almost no death is a
   * sacrifice. Fired after the death handler so both sets of triggers go on the
   * stack, which is what really happens.
   */
  fireWatchers(state, "permanent-sacrificed", subject, sacrificedInstance);
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
        const indestructible = hasKeyword(state, instance, "Indestructible");
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

    /*
     * An Equipment whose creature has gone falls off.
     *
     * Rule 704.5n as it applies here: an Equipment attached to something that
     * is no longer a creature on the battlefield becomes unattached. Without
     * this, Skullclamp would keep buffing a graveyard and its dies trigger
     * would watch a card that can never die again.
     */
    for (const player of state.players) {
      for (const instance of player.battlefield) {
        if (!instance.attachedTo) continue;
        const host = findInstance(state, instance.attachedTo);
        if (!host || host.instance.zone !== "battlefield") {
          instance.attachedTo = undefined;
          changed = true;
        }
      }
    }

    /*
     * A planeswalker with no loyalty left is put into its owner's graveyard
     * (rule 704.5i). Checked with the creatures rather than after them, because
     * a loyalty ability that killed the walker should take effect before
     * anything else reads the board.
     */
    for (const player of state.players) {
      for (const instance of [...player.battlefield]) {
        const def = requireDefinition(state, instance.definitionId);
        if (def.loyalty === undefined) continue;
        if (instance.loyalty > 0) continue;
        moveDyingCreatureToItsZone(state, instance.instanceId, instance.isCommander);
        changed = true;
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
      if (player.poisonCounters >= 10) {
        player.hasLost = true;
        player.lossReason = `had ${player.poisonCounters} poison counters`;
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
