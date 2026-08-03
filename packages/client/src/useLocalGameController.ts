import { useRef, useState } from "react";
import {
  activateAbilityWithAutoTap,
  castSpellWithAutoTap,
  createDemoGame,
  createGameFromDecks,
  declareAttackers,
  declareBlockers,
  resolveSearch,
  takeMulligan,
  keepHand,
  putOnBottom,
  passPriority,
  playLand,
  type DeckList,
  type GameState,
} from "@mtg-commander-sim/engine";
import type { GameController } from "./gameController.js";

/**
 * Hotseat mode: both seats share one machine, one in-memory GameState. The
 * engine mutates that state in place rather than returning new immutable
 * snapshots, so this hook keeps it in a ref and forces a re-render after
 * each action, surfacing thrown engine errors (illegal actions) as a
 * dismissable message instead of letting them crash the UI.
 */
export interface LocalGameOptions {
  /** Seat id -> deck. Omitted entirely for the default demo game. */
  decks?: [{ id: string; deck: DeckList }, { id: string; deck: DeckList }];
  /**
   * Whether the game opens on the mulligan. On for real play - a game of Magic
   * starts by deciding whether to keep - and left off by anything that just
   * wants a board to poke at.
   */
  mulligan?: boolean;
}

export function useLocalGameController({ decks, mulligan = true }: LocalGameOptions = {}): GameController {
  const stateRef = useRef<GameState>();
  if (!stateRef.current) {
    stateRef.current = decks ? createGameFromDecks(decks, { mulligan }) : createDemoGame({ mulligan });
  }

  const [, setTick] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  function act(fn: (state: GameState) => void) {
    try {
      fn(stateRef.current!);
      setLastError(null);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    }
    setTick((t) => t + 1);
  }

  return {
    state: stateRef.current,
    lastError,
    clearError: () => setLastError(null),
    playLand: (playerId, instanceId) => act((s) => playLand(s, playerId, instanceId)),
    // The auto-tap variants: if the floating mana pool doesn't already cover
    // the cost, lands are tapped for it first, and put back if the action
    // turns out to be illegal. Clicking a card you can afford just plays it.
    castSpell: (playerId, instanceId, targets = [], options = {}) =>
      act((s) => castSpellWithAutoTap(s, playerId, instanceId, targets, options)),
    activateAbility: (playerId, instanceId, abilityIndex, targets = []) =>
      act((s) => activateAbilityWithAutoTap(s, playerId, instanceId, abilityIndex, targets)),
    declareAttackers: (playerId, declarations) => act((s) => declareAttackers(s, playerId, declarations)),
    declareBlockers: (playerId, declarations) => act((s) => declareBlockers(s, playerId, declarations)),
    resolveSearch: (playerId, instanceId) => act((s) => resolveSearch(s, playerId, instanceId)),
    takeMulligan: (playerId) => act((s) => takeMulligan(s, playerId)),
    keepHand: (playerId) => act((s) => keepHand(s, playerId)),
    putOnBottom: (playerId, instanceIds) => act((s) => putOnBottom(s, playerId, instanceIds)),
    passPriority: (playerId) => act((s) => passPriority(s, playerId)),
    canControlPlayer: () => true, // hotseat: one tab, both seats
  };
}
