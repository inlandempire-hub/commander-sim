import { describe, expect, it } from "vitest";
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
  draw: "Salty Mike draws a card",
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
