import { describe, expect, it } from "vitest";
import type { LogEntry } from "@mtg-commander-sim/engine";
import { TURNS_KEPT, recentLog } from "../gameLog.js";

function entriesFor(turns: number[]): LogEntry[] {
  return turns.map((turn, i) => ({ turn, text: `event ${i} on turn ${turn}` }));
}

describe("recentLog", () => {
  it("keeps the current turn and the two before it", () => {
    const entries = entriesFor([1, 2, 3, 4, 5, 6]);

    const shown = recentLog(entries, 6);

    expect(shown.map((e) => e.turn)).toEqual([4, 5, 6]);
  });

  it("keeps everything early on, when there is not three turns of history", () => {
    const entries = entriesFor([1, 1, 2]);

    expect(recentLog(entries, 2)).toHaveLength(3);
  });

  it("marks only the oldest turn shown as fading", () => {
    const shown = recentLog(entriesFor([4, 5, 6]), 6);

    expect(shown.map((e) => e.fading)).toEqual([true, false, false]);
  });

  it("does not fade the current turn when it is the only one", () => {
    // Turn one with nothing before it: dimming the only lines there are would
    // say "this is old" about the thing that just happened.
    const shown = recentLog(entriesFor([1, 1]), 1);

    expect(shown.every((e) => e.fading)).toBe(false);
  });

  it("keeps several entries from the same turn together", () => {
    const entries = entriesFor([3, 4, 4, 4, 5]);

    const shown = recentLog(entries, 5);

    expect(shown).toHaveLength(5);
    expect(shown.filter((e) => e.turn === 4)).toHaveLength(3);
  });

  it("preserves order - the log is read newest at the bottom", () => {
    const shown = recentLog(entriesFor([5, 5, 6, 7]), 7);

    expect(shown.map((e) => e.text)).toEqual([
      "event 0 on turn 5",
      "event 1 on turn 5",
      "event 2 on turn 6",
      "event 3 on turn 7",
    ]);
  });

  it("shows nothing from long ago even if the engine still has it", () => {
    // The engine keeps a much longer history on purpose; this is only a view.
    const entries = entriesFor(Array.from({ length: 60 }, (_, i) => i + 1));

    const shown = recentLog(entries, 60);

    expect(shown).toHaveLength(TURNS_KEPT);
    expect(shown.every((e) => e.turn >= 58)).toBe(true);
  });

  it("copes with an empty log", () => {
    expect(recentLog([], 1)).toEqual([]);
  });
});
