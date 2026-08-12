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
