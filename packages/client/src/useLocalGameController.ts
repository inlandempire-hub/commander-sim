import { useRef, useState } from "react";
import {
  activateAbilityWithAutoTap,
  castSpellWithAutoTap,
  createDemoGame,
  createGameFromDecks,
  createLabGame,
  declareAttackers,
  declareBlockers,
  resolveSearch,
  chooseTriggerTargets,
  resolveDiscard,
  activateLoyaltyAbility,
  castPreparedSpell,
  resolveAmountChoice,
  resolveColorChoice,
  resolveEnterChoice,
  suspendCard,
  resolveCardChoice,
  resolveSacrificeChoice,
  resolveConfirmation,
  takeMulligan,
  keepHand,
  putOnBottom,
  concede,
  passPriority,
  playLand,
  type DeckList,
  type GameState,
  type LabScenario,
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
  /**
   * A card lab board instead of a game: one card's scenario, stood up mid-turn.
   * Wins over `decks`, because a scenario names its own board entirely.
   */
  scenario?: LabScenario;
}

export function useLocalGameController({
  decks,
  mulligan = true,
  scenario,
}: LocalGameOptions = {}): GameController {
  const stateRef = useRef<GameState>();
  if (!stateRef.current) {
    stateRef.current = scenario
      ? createLabGame(scenario)
      : decks
        ? createGameFromDecks(decks, { mulligan })
        : createDemoGame({ mulligan });
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
    resolveConfirmation: (playerId, accept) => act((s) => resolveConfirmation(s, playerId, accept)),
    chooseTriggerTargets: (playerId, targets) => act((s) => chooseTriggerTargets(s, playerId, targets)),
    resolveDiscard: (playerId, instanceId) => act((s) => resolveDiscard(s, playerId, instanceId)),
    resolveSacrificeChoice: (playerId, instanceId) =>
      act((s) => resolveSacrificeChoice(s, playerId, instanceId)),
    resolveCardChoice: (playerId, instanceIds) => act((s) => resolveCardChoice(s, playerId, instanceIds)),
    resolveAmountChoice: (playerId, amount) => act((s) => resolveAmountChoice(s, playerId, amount)),
    resolveColorChoice: (playerId, quality) => act((s) => resolveColorChoice(s, playerId, quality)),
    resolveEnterChoice: (playerId, answer) => act((s) => resolveEnterChoice(s, playerId, answer)),
    suspendCard: (playerId, instanceId) => act((s) => suspendCard(s, playerId, instanceId)),
    castPreparedSpell: (playerId, instanceId) => act((s) => castPreparedSpell(s, playerId, instanceId)),
    activateLoyaltyAbility: (playerId, instanceId, abilityIndex) =>
      act((s) => activateLoyaltyAbility(s, playerId, instanceId, abilityIndex)),
    takeMulligan: (playerId) => act((s) => takeMulligan(s, playerId)),
    keepHand: (playerId) => act((s) => keepHand(s, playerId)),
    putOnBottom: (playerId, instanceIds) => act((s) => putOnBottom(s, playerId, instanceIds)),
    concede: (playerId) => act((s) => concede(s, playerId)),
    passPriority: (playerId) => act((s) => passPriority(s, playerId)),
    canControlPlayer: () => true, // hotseat: one tab, both seats
  };
}
