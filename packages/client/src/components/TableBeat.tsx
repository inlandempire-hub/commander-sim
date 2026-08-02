import { useEffect, useRef, useState } from "react";
import type { GameState } from "@mtg-commander-sim/engine";

/**
 * The two moments in a turn worth announcing across the table: it becoming
 * someone's turn, and combat starting.
 *
 * Deliberately only those two. The header already reports the current phase
 * and step continuously, and with auto-pass the step can change four times in
 * under a second - banner-ing every one of them would be a strobe, not a beat.
 * These are the points where the game hands control back to a player and the
 * thing they should be thinking about changes.
 */

const BEAT_MS = 1150;

export interface TableBeatProps {
  state: GameState;
}

export function TableBeat({ state }: TableBeatProps) {
  const [beat, setBeat] = useState<{ text: string; key: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  /*
   * The last turn each kind of announcement was made for, kept apart rather
   * than as one "last thing announced".
   *
   * With a single value, combat overwrites the turn - and then the moment
   * combat ends the turn looks unannounced again and the banner replays
   * halfway through the turn it is naming. Seen in the browser as
   * "Turn 1 - Deadly Donny", "Combat", "Turn 1 - Deadly Donny".
   */
  const lastTurn = useRef<string | null>(null);
  const lastCombat = useRef<string | null>(null);

  const activePlayerId = state.players[state.activePlayerIndex]?.id ?? "";
  const turnNumber = state.turnNumber;
  const inCombat = state.step === "declare-attackers";

  useEffect(() => {
    const turnKey = `${turnNumber}:${activePlayerId}`;
    const seen = inCombat ? lastCombat : lastTurn;
    if (seen.current === turnKey) return;
    seen.current = turnKey;

    /*
     * The timer is held in a ref and cancelled here rather than from the
     * effect's cleanup, which is not a style choice. React runs the previous
     * cleanup before the next effect body, so with the timer in the cleanup
     * the early return above would cancel the pending hide without scheduling
     * a replacement - and the banner would sit across the middle of the board
     * indefinitely. That was a real bug, seen in the browser: "Combat" came up
     * during combat and then stayed up.
     */
    window.clearTimeout(timer.current);
    const key = Date.now();
    setBeat({ text: inCombat ? "Combat" : `Turn ${turnNumber} — ${activePlayerId}`, key });
    timer.current = window.setTimeout(
      () => setBeat((current) => (current?.key === key ? null : current)),
      BEAT_MS,
    );
  }, [inCombat, turnNumber, activePlayerId]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!beat) return null;
  return (
    // Keyed so a second beat arriving while the first is still on screen
    // restarts the animation instead of leaving the old text mid-fade.
    <div className="beat" key={beat.key} aria-live="polite">
      <span className="beat__text">{beat.text}</span>
    </div>
  );
}
