import { useEffect, useRef, useState } from "react";
import type { GameState } from "@mtg-commander-sim/engine";
import { play } from "../sound.js";

/**
 * The two moments in a turn worth announcing across the table: it becoming
 * someone's turn, and combat starting.
 *
 * Deliberately only those two. The header already reports the current phase
 * and step continuously, and with auto-pass the step can change four times in
 * under a second - banner-ing every one of them would be a strobe, not a beat.
 * These are the points where the game hands control back to a player and the
 * thing they should be thinking about changes.
 *
 * ## Handover (2026-08-06)
 *
 * The turn beat used to read "Turn 3 - Deadly Donny" in the middle of the
 * screen, which is a caption rather than a handover: it named the state the
 * game had already arrived in, with nothing to say that anything had *passed*
 * from one side of the table to the other.
 *
 * Three changes, all saying the same thing in different registers. The banner
 * arrives from the side of the table whose turn it now is, so the movement
 * itself carries the direction. It leads with *whose* turn rather than with
 * the number, because that is the part you need. And it makes a sound - a
 * rising fifth, once a turn, the only cue in the game that is a pure tone.
 *
 * The sound is played from here rather than off the log, unlike almost
 * everything else. The log's turn marker is a heading rather than an event,
 * and matching on it would fire the cue again every time the log was
 * re-scanned rather than once when the turn actually changed.
 */

const BEAT_MS = 1150;

export interface TableBeatProps {
  state: GameState;
  /** Whoever is drawn at the near edge, so the banner knows which way to come from. */
  nearPlayerId: string;
  /**
   * The seat this client actually plays, when there is exactly one. Undefined
   * in hotseat, where both seats are yours and "your turn" would be true of
   * every turn and therefore useless.
   */
  youId?: string;
}

export function TableBeat({ state, nearPlayerId, youId }: TableBeatProps) {
  const [beat, setBeat] = useState<{
    text: string;
    detail: string;
    from: "near" | "far";
    key: number;
  } | null>(null);
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

    // Whose half of the table the turn now belongs to. Combat is neither
    // side's - it is the thing happening between them - so it keeps coming
    // from the near edge rather than picking a side.
    const from: "near" | "far" =
      inCombat || activePlayerId === nearPlayerId ? "near" : "far";
    const yours = youId !== undefined && activePlayerId === youId;
    setBeat({
      text: inCombat ? "Combat" : yours ? "Your turn" : activePlayerId,
      detail: inCombat ? "" : `Turn ${turnNumber}`,
      from,
      key,
    });
    // Only the handover. Combat already has an entire board leaning towards
    // the centre line to announce it.
    if (!inCombat) play("turn");

    timer.current = window.setTimeout(
      () => setBeat((current) => (current?.key === key ? null : current)),
      BEAT_MS,
    );
  }, [inCombat, turnNumber, activePlayerId, nearPlayerId, youId]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!beat) return null;
  return (
    // Keyed so a second beat arriving while the first is still on screen
    // restarts the animation instead of leaving the old text mid-fade.
    <div className={`beat beat--${beat.from}`} key={beat.key} aria-live="polite">
      <span className="beat__text">{beat.text}</span>
      {beat.detail && <span className="beat__detail">{beat.detail}</span>}
    </div>
  );
}
