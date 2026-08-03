import type { AttackerDeclaration, BlockerDeclaration, GameState, StackTarget } from "@mtg-commander-sim/engine";

/**
 * What the UI needs from "the game," regardless of whether it's running
 * locally (hotseat, both seats mutate one in-memory GameState) or over the
 * network (the server holds the real state; actions are sent as messages
 * and `state` updates when a broadcast arrives). App.tsx and its children
 * only ever talk to this interface - see useLocalGameController.ts and
 * useNetworkGameController.ts for the two implementations.
 */
export interface GameController {
  /** null only in network mode before the first state broadcast arrives (e.g. still waiting for the other player). */
  state: GameState | null;
  lastError: string | null;
  clearError(): void;
  playLand(playerId: string, instanceId: string): void;
  castSpell(
    playerId: string,
    instanceId: string,
    targets?: StackTarget[],
    options?: { fromCommandZone?: boolean; chosenMode?: number },
  ): void;
  activateAbility(playerId: string, instanceId: string, abilityIndex: number, targets?: StackTarget[]): void;
  declareAttackers(playerId: string, declarations: AttackerDeclaration[]): void;
  declareBlockers(playerId: string, declarations: BlockerDeclaration[]): void;
  /**
   * Answers a tutor that stopped mid-resolution. `null` takes nothing.
   * Nobody has priority until this is called, so the game cannot continue
   * while a search is pending.
   */
  resolveSearch(playerId: string, instanceId: string | null): void;
  /** Opening hands, before the game starts. See the engine's mulligan.ts. */
  takeMulligan(playerId: string): void;
  keepHand(playerId: string): void;
  putOnBottom(playerId: string, instanceIds: string[]): void;
  passPriority(playerId: string): void;
  /** Whether this client is allowed to act as `playerId` - true for both seats in local hotseat mode, only your own seat over the network. Used to gate auto-passing. */
  canControlPlayer(playerId: string): boolean;
}
