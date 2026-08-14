import type { AttackerDeclaration, BlockerDeclaration, GameState, StackTarget } from "@mtg-commander-sim/engine";

/**
 * Messages a client sends to the server. Deliberately do NOT carry a
 * playerId - the server already knows which seat a connection is (assigned
 * at join time) and always acts as that player, never trusting a
 * client-supplied identity for "who is doing this."
 */
export type ClientMessage =
  | { type: "playLand"; instanceId: string }
  /**
   * `chosenMode` and `chosenX` are both settled as the spell is cast (rule
   * 601.2b), so they travel with the cast rather than being asked for
   * afterwards. Both were dropped on the way over the wire before now, which
   * meant a modal spell played over the network was refused outright.
   */
  | {
      type: "castSpell";
      instanceId: string;
      targets?: StackTarget[];
      fromCommandZone?: boolean;
      chosenMode?: number;
      chosenX?: number;
      /**
       * The creature given up for "as an additional cost, sacrifice a
       * creature", and whether the card's alternative cost is being taken.
       * Both are announced with the spell for the same reason the two above
       * are: they are part of casting it, not of resolving it.
       */
      sacrificeInstanceId?: string;
      useAlternativeCost?: boolean;
    }
  | { type: "activateAbility"; instanceId: string; abilityIndex: number; targets?: StackTarget[] }
  | { type: "declareAttackers"; declarations: AttackerDeclaration[] }
  | { type: "declareBlockers"; declarations: BlockerDeclaration[] }
  /** Answering a tutor that stopped mid-resolution. Null takes nothing. */
  | { type: "resolveSearch"; instanceId: string | null }
  /** Answering a "you may" trigger that stopped mid-resolution. */
  | { type: "resolveConfirmation"; accept: boolean }
  /** Pointing a parked triggered ability at one of the targets the engine offered. */
  | { type: "chooseTriggerTarget"; target: StackTarget }
  /** Choosing which card to discard, from your own hand, when a spell demands it. */
  | { type: "resolveDiscard"; instanceId: string }
  /**
   * Which creature is being given up for a "you may sacrifice a creature"
   * that has stopped mid-resolution. `null` declines, which the engine
   * refuses unless the card said "may".
   */
  | { type: "resolveSacrificeChoice"; instanceId: string | null }
  /**
   * Which cards were chosen for a "choose some cards" - devour, Braids' offer,
   * Rishkar's free spell, Ripples of Undeath's milled card. An empty array
   * declines, which the engine refuses when the card demanded a minimum.
   */
  | { type: "resolveCardChoice"; instanceIds: string[] }
  /** The number named for "pay any amount of life" - Necrodominance. */
  | { type: "resolveAmountChoice"; amount: number }
  /**
   * Playing a card by suspending it, which is not casting it - nothing goes on
   * the stack and no cast trigger fires.
   */
  | { type: "suspendCard"; instanceId: string }
  /** Casting a copy of a prepared permanent's other face. */
  | { type: "castPreparedSpell"; instanceId: string }
  /** Activating a planeswalker's loyalty ability, whose cost is loyalty. */
  | { type: "activateLoyaltyAbility"; instanceId: string; abilityIndex: number }
  | { type: "takeMulligan" }
  | { type: "keepHand" }
  | { type: "putOnBottom"; instanceIds: string[] }
  | { type: "concede" }
  | { type: "passPriority" };

/** Messages the server sends to a client. `state` is always filtered for that specific viewer. */
export type ServerMessage =
  | { type: "joined"; playerId: string }
  | { type: "waitingForOpponent" }
  | { type: "state"; state: GameState }
  | { type: "error"; message: string };
