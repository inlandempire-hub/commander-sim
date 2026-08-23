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
    options?: {
      fromCommandZone?: boolean;
      chosenMode?: number;
      chosenX?: number;
      /** The creature given up for "as an additional cost, sacrifice a creature". */
      sacrificeInstanceId?: string;
      /** "You may cast this spell without paying its mana cost." */
      useAlternativeCost?: boolean;
      /** Cast for free via an Omniscience-style permanent you control. */
      omniscienceFree?: boolean;
      /** Cast for the Warp cost (Starwinder); the creature leaves at the next end step. */
      useWarp?: boolean;
      /** Pay the Offspring cost (Thundertrap Trainer); a 1/1 token copy is made on ETB. */
      payOffspring?: boolean;
      /** Creatures the +1/+1 counters come off to cast this from the graveyard (Quilled Greatwurm). */
      removeCounterFrom?: string[];
    },
  ): void;
  activateAbility(
    playerId: string,
    instanceId: string,
    abilityIndex: number,
    targets?: StackTarget[],
    options?: { discardInstanceIds?: string[] },
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
   * Puts the cards a `lookAndArrange` showed back on top in the named order, or
   * shuffles instead when the card allowed it (Ponder). Gated like
   * `resolveSearch` - the game is stopped mid-spell until it is answered.
   */
  resolveArrange(playerId: string, order: string[], shuffle?: boolean): void;
  /** Cycle a card from hand: pay its cycling cost, discard it, then draw or tutor. */
  cycleCard(playerId: string, instanceId: string): void;
  /** Ninjutsu: return an unblocked attacker to hand and put a Ninja in tapped and attacking. */
  ninjutsu(playerId: string, ninjaInstanceId: string, returnedAttackerInstanceId: string): void;
  /** Choose a mode for a modal triggered/activated ability. */
  resolveModal(playerId: string, modeIndex: number): void;
  /**
   * Answers a "you may" trigger. Gated exactly like `resolveSearch` - the game
   * is mid-resolution and nobody has priority until this comes back.
   */
  resolveConfirmation(playerId: string, accept: boolean): void;
  /** Points a triggered ability the engine parked at one of the targets it offered. */
  chooseTriggerTarget(playerId: string, target: StackTarget): void;
  /** Discards one named card from this player's own hand, when a spell has demanded it. */
  resolveDiscard(playerId: string, instanceId: string): void;
  /** Answers a "you may sacrifice a creature" - `null` declines. */
  resolveSacrificeChoice(playerId: string, instanceId: string | null): void;
  /** Answers a "choose some cards" - an empty array declines. */
  resolveCardChoice(playerId: string, instanceIds: string[]): void;
  /** Answers "pay any amount of life". */
  resolveAmountChoice(playerId: string, amount: number): void;
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
