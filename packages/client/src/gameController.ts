import type { ChosenOnEntry,
  ProtectionQuality,
} from "@mtg-commander-sim/engine";
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
  playLand(playerId: string, instanceId: string, face?: "front" | "back"): void;
  castSpell(
    playerId: string,
    instanceId: string,
    targets?: StackTarget[],
    options?: {
      fromCommandZone?: boolean;
      chosenMode?: number;
      chosenX?: number;
      /** The creature given up for "as an additional cost, sacrifice a creature". */
      sacrificeInstanceId?: string;
      /** "You may cast this spell without paying its mana cost." */
      useAlternativeCost?: boolean;
    },
  ): void;
  activateAbility(
    playerId: string,
    instanceId: string,
    abilityIndex: number,
    targets?: StackTarget[],
    chosenMode?: number,
  ): void;
  declareAttackers(playerId: string, declarations: AttackerDeclaration[]): void;
  declareBlockers(playerId: string, declarations: BlockerDeclaration[]): void;
  /**
   * Answers a tutor that stopped mid-resolution. `null` takes nothing.
   * Nobody has priority until this is called, so the game cannot continue
   * while a search is pending.
   */
  resolveSearch(playerId: string, instanceId: string | null): void;
  /**
   * Answers a "you may" trigger. Gated exactly like `resolveSearch` - the game
   * is mid-resolution and nobody has priority until this comes back.
   */
  resolveConfirmation(playerId: string, accept: boolean): void;
  /** Points a triggered ability the engine parked at one of the targets it offered. */
  /**
   * "One or two target attacking creatures" - a list, because a trigger may
   * point at more than one thing. Every card in the pool but Raph & Leo sends
   * exactly one.
   */
  chooseTriggerTargets(playerId: string, targets: StackTarget[]): void;
  /** Discards one named card from this player's own hand, when a spell has demanded it. */
  resolveDiscard(playerId: string, instanceId: string): void;
  /** Answers a "you may sacrifice a creature" - `null` declines. */
  resolveSacrificeChoice(playerId: string, instanceId: string | null): void;
  /** Answers a "choose some cards" - an empty array declines. */
  resolveCardChoice(playerId: string, instanceIds: string[]): void;
  /** Answers "pay any amount of life". */
  resolveAmountChoice(playerId: string, amount: number): void;
  /** Naming the colour a protection ability is waiting on - Mother of Runes. */
  resolveColorChoice(playerId: string, quality: ProtectionQuality): void;
  /**
   * Answers "as this permanent enters, choose ..." - see the engine's
   * `EnterChoice`. The game holds until this is answered, so every controller
   * has to be able to carry it even when only the bot is currently producing
   * one.
   */
  resolveEnterChoice(playerId: string, answer: ChosenOnEntry): void;
  /** Suspends a card out of hand - not a cast. */
  suspendCard(playerId: string, instanceId: string): void;
  /** Casts a copy of a prepared permanent's other face. */
  castPreparedSpell(playerId: string, instanceId: string): void;
  /** Activates a planeswalker's loyalty ability. */
  activateLoyaltyAbility(playerId: string, instanceId: string, abilityIndex: number): void;
  /** Opening hands, before the game starts. See the engine's mulligan.ts. */
  takeMulligan(playerId: string): void;
  keepHand(playerId: string): void;
  putOnBottom(playerId: string, instanceIds: string[]): void;
  /** Give up. Legal at any time and needs no priority (rule 104.3a). */
  concede(playerId: string): void;
  passPriority(playerId: string): void;
  /** Whether this client is allowed to act as `playerId` - true for both seats in local hotseat mode, only your own seat over the network. Used to gate auto-passing. */
  canControlPlayer(playerId: string): boolean;
}
