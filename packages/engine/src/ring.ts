import type { BlockRestriction, CardInstance, GameState, TriggeredAbility } from "./types.js";

/**
 * The Ring - an emblem with four cumulative abilities and a creature that bears
 * them.
 *
 * None of the four belong to the emblem. Every one is an ability *your
 * Ring-bearer has*, which is why they are computed here from the player's level
 * and handed to the two functions that already answer what a permanent can do -
 * `effectiveTriggers` and `blockRestrictionsOn` - rather than stamped onto a
 * creature when it becomes the bearer.
 *
 * The difference is not academic: stamped abilities would stay on a creature
 * that stopped being the bearer, and would have to be taken off by hand every
 * time somebody was tempted again.
 */

/** The most abilities The Ring has. Being tempted past this only re-chooses the bearer. */
export const MAX_RING_LEVEL = 4;

/** Whether this permanent is its controller's Ring-bearer right now. */
export function isRingBearer(state: GameState, instance: CardInstance): boolean {
  const controller = state.players.find((p) => p.id === instance.controllerId);
  return controller?.ringBearerInstanceId === instance.instanceId;
}

/**
 * The triggered abilities The Ring gives its bearer at the current level.
 *
 * Levels two, three and four; the first is a restriction rather than a trigger
 * and lives in `ringBlockRestrictions` below.
 */
export function ringTriggers(state: GameState, instance: CardInstance): TriggeredAbility[] {
  if (!isRingBearer(state, instance)) return [];
  const level = state.players.find((p) => p.id === instance.controllerId)?.ringLevel ?? 0;
  const abilities: TriggeredAbility[] = [];
  if (level >= 2) {
    // "Whenever your Ring-bearer attacks, draw a card, then discard a card."
    abilities.push({
      event: "attacks",
      effect: {
        kind: "sequence",
        effects: [
          { kind: "draw", amount: 1 },
          { kind: "discard", amount: 1, who: "controller" },
        ],
      },
    });
  }
  if (level >= 3) {
    /*
     * "Whenever your Ring-bearer becomes blocked by a creature, that creature's
     * controller sacrifices it at end of combat."
     *
     * At end of combat rather than end of turn, which matters in a deck that
     * makes extra combat phases: the blocker is gone before the second one.
     */
    abilities.push({
      event: "becomes-blocked",
      effect: { kind: "delayedRemoval", action: "sacrifice", at: "end-of-combat" },
    });
  }
  if (level >= 4) {
    // "Whenever your Ring-bearer deals combat damage to a player, each opponent
    // loses 3 life."
    abilities.push({
      event: "combat-damage-to-player",
      effect: { kind: "loseLife", amount: 3, who: "each-opponent" },
    });
  }
  return abilities;
}

/**
 * "Your Ring-bearer ... can't be blocked by creatures with greater power." -
 * the first ability, and the only one that is not a trigger.
 */
export function ringBlockRestrictions(state: GameState, attacker: CardInstance): BlockRestriction[] {
  if (!isRingBearer(state, attacker)) return [];
  const level = state.players.find((p) => p.id === attacker.controllerId)?.ringLevel ?? 0;
  return level >= 1 ? [{ kind: "not-greater-power" }] : [];
}
