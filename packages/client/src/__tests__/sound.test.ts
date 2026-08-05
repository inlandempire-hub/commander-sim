import { describe, expect, it } from "vitest";
import { advanceStep, createDemoGame } from "@mtg-commander-sim/engine";
import { CUE_NAMES, cueForLogLine, type Cue } from "../sound.js";

/**
 * Sound is driven off the game log: anything the engine learns to describe gets
 * a cue for free. The cost of that is a cue can quietly become unreachable when
 * the wording of a log line changes, or - as actually happened with the land
 * cue - never be reachable in the first place, and there is nothing on screen
 * to notice it by.
 */

/** One real log line, worded as the engine words it, per cue. */
const EXAMPLES: Record<Cue, string> = {
  card: "Deadly Donny resolves Expedition Envoy",
  land: "Deadly Donny plays Plains",
  attack: "Salty Mike attacks with Axebane Beast",
  damage: "Silvercoat Lion is dealt 3 damage",
  death: "Silvercoat Lion dies",
  draw: "Salty Mike draws 1 card",
  // Deliberately not log-driven: a refusal never reaches the log, because
  // nothing happened. App plays this one directly when the prompt shows.
  error: "",
};

describe("cueForLogLine", () => {
  it("has a cue for each kind of line the engine writes", () => {
    for (const [cue, line] of Object.entries(EXAMPLES) as Array<[Cue, string]>) {
      if (cue === "error") continue;
      expect(cueForLogLine(line), `no cue for: ${line}`).toBe(cue);
    }
  });

  it("leaves every cue reachable, so none can sit here unheard", () => {
    const reachable = new Set(
      Object.values(EXAMPLES)
        .map((line) => cueForLogLine(line))
        .filter(Boolean),
    );
    const unreachable = CUE_NAMES.filter((cue) => cue !== "error" && !reachable.has(cue));
    expect(unreachable).toEqual([]);
  });

  it("does not mistake a spell being cast for a land being played", () => {
    // "plays" is only ever a land; "casts" must not fall through to it.
    expect(cueForLogLine("Deadly Donny casts Expedition Envoy")).toBeUndefined();
  });

  it("says nothing for a line that is not an event", () => {
    expect(cueForLogLine("Turn 4 - Salty Mike")).toBeUndefined();
    expect(cueForLogLine("Deadly Donny declares no blockers")).toBeUndefined();
  });

  it("prefers the more specific cue when a line could match two", () => {
    // A creature dying to damage is a death, not another damage thump.
    expect(cueForLogLine("Silvercoat Lion is dealt 3 damage and dies")).toBe("death");
  });
});

/**
 * The examples above are written by hand, which is exactly how the draw cue
 * went missing: the engine's draw step logged nothing at all, and the hand
 * written example ("draws a card") happened to contain the word the matcher
 * looks for, so the table above stayed green while a real game was silent.
 *
 * This runs a real game instead and reads the real log, so the two can no
 * longer drift apart without something failing.
 */
describe("the log a real game actually writes", () => {
  function logUpTo(steps: number): string[] {
    const state = createDemoGame();
    const seen: string[] = [];
    for (let i = 0; i < steps; i++) {
      advanceStep(state);
      // Not state.log.slice(): the log is capped and spliced, so read it whole
      // each time and take what is new.
      for (const entry of state.log.slice(seen.length)) seen.push(entry.text);
    }
    return seen;
  }

  it("gives the draw step a line that maps to the draw cue", () => {
    const lines = logUpTo(40);
    const drawLines = lines.filter((line) => cueForLogLine(line) === "draw");
    expect(drawLines.length).toBeGreaterThan(0);
  });

  it("does not announce the opening hand as a seven-card draw", () => {
    // Setup draws are silent; the first draw line should be a single card.
    const lines = logUpTo(40);
    const first = lines.find((line) => cueForLogLine(line) === "draw");
    expect(first).toMatch(/draws 1 card$/);
  });
});
