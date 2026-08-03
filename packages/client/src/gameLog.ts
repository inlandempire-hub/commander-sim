import type { LogEntry } from "@mtg-commander-sim/engine";

/**
 * Which log entries are still worth showing, and which are on their way out.
 *
 * A game log that keeps everything is a log nobody reads: by turn twenty the
 * thing you need - what just happened - is a single line at the bottom of
 * hundreds. Three turns is about as far back as a decision ever reaches, so
 * that is what is kept.
 *
 * The oldest of those three is marked rather than cut, so lines dim as they
 * age instead of vanishing between one glance and the next.
 */

/** How many turns of history stay on screen. */
export const TURNS_KEPT = 3;

export interface ShownEntry extends LogEntry {
  /** True for the oldest turn still shown - the one about to drop off. */
  fading: boolean;
}

export function recentLog(entries: readonly LogEntry[], currentTurn: number): ShownEntry[] {
  // The turn a line belongs to, counted back from now: 0 is this turn.
  const oldestKept = currentTurn - (TURNS_KEPT - 1);
  const shown: ShownEntry[] = [];
  for (const entry of entries) {
    if (entry.turn < oldestKept) continue;
    shown.push({ ...entry, fading: entry.turn === oldestKept && currentTurn > oldestKept });
  }
  return shown;
}
