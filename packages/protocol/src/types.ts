import type { AttackerDeclaration, BlockerDeclaration, GameState, StackTarget } from "@mtg-commander-sim/engine";

/**
 * Messages a client sends to the server. Deliberately do NOT carry a
 * playerId - the server already knows which seat a connection is (assigned
 * at join time) and always acts as that player, never trusting a
 * client-supplied identity for "who is doing this."
 */
export type ClientMessage =
  | { type: "playLand"; instanceId: string }
  | { type: "castSpell"; instanceId: string; targets?: StackTarget[]; fromCommandZone?: boolean }
  | { type: "activateAbility"; instanceId: string; abilityIndex: number; targets?: StackTarget[] }
  | { type: "declareAttackers"; declarations: AttackerDeclaration[] }
  | { type: "declareBlockers"; declarations: BlockerDeclaration[] }
  /** Answering a tutor that stopped mid-resolution. Null takes nothing. */
  | { type: "resolveSearch"; instanceId: string | null }
  | { type: "passPriority" };

/** Messages the server sends to a client. `state` is always filtered for that specific viewer. */
export type ServerMessage =
  | { type: "joined"; playerId: string }
  | { type: "waitingForOpponent" }
  | { type: "state"; state: GameState }
  | { type: "error"; message: string };
