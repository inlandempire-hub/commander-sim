import { describe, expect, it } from "vitest";
import { advanceStep, createDemoGame } from "@mtg-commander-sim/engine";
import {
  CUE_NAMES,
  CUE_VOICES,
  cueDuration,
  cueForLogLine,
  MAX_CUE_SECONDS,
  MAX_VOICE_GAIN,
  peakGain,
  type Cue,
} from "../sound.js";

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
  shield: "2 damage to Silvercoat Lion prevented",
  // Two cues that are deliberately not log-driven. A refusal never reaches the
  // log because nothing happened, and the turn marker is a heading rather than
  // an event - matching on it would fire the cue again every time the log was
  // re-scanned. App and TableBeat play these two directly.
  turn: "",
  error: "",
};

describe("cueForLogLine", () => {
  it("has a cue for each kind of line the engine writes", () => {
    for (const [cue, line] of Object.entries(EXAMPLES) as Array<[Cue, string]>) {
      if (line === "") continue;
      expect(cueForLogLine(line), `no cue for: ${line}`).toBe(cue);
    }
  });

  it("leaves every cue reachable, so none can sit here unheard", () => {
    const reachable = new Set(
      Object.values(EXAMPLES)
        .map((line) => cueForLogLine(line))
        .filter(Boolean),
    );
    const played = new Set<Cue>(["error", "turn"]); // played directly, not off the log
    const unreachable = CUE_NAMES.filter((cue) => !played.has(cue) && !reachable.has(cue));
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

  it("does not play the impact sound for damage that was prevented", () => {
    // The line contains "damage" but no damage was dealt. Playing the hit for
    // it says the exact opposite of what happened, and the shield is the one
    // thing the player needs to hear working.
    expect(cueForLogLine("3 damage to Deadly Donny prevented")).toBe("shield");
    expect(cueForLogLine("2 damage to Grizzly Bears prevented")).toBe("shield");
  });
});

/**
 * The cues themselves. The synthesis needs a browser, but the specification
 * does not, and the specification is where the dangerous mistakes live: a gain
 * of 0.5 where 0.05 was meant is genuinely painful through headphones, silent
 * in review, and obvious only to whoever is wearing them.
 */
describe("the cue specifications", () => {
  it("gives every cue at least one voice", () => {
    for (const cue of CUE_NAMES) {
      expect(CUE_VOICES[cue].length, cue).toBeGreaterThan(0);
    }
  });

  it("keeps every voice under the level that hurts", () => {
    for (const cue of CUE_NAMES) {
      expect(peakGain(cue), cue).toBeLessThanOrEqual(MAX_VOICE_GAIN);
      for (const voice of CUE_VOICES[cue]) expect(voice.gain, cue).toBeGreaterThan(0);
    }
  });

  it("keeps every cue shorter than the action that caused it", () => {
    for (const cue of CUE_NAMES) {
      expect(cueDuration(cue), cue).toBeLessThanOrEqual(MAX_CUE_SECONDS);
      expect(cueDuration(cue), cue).toBeGreaterThan(0);
    }
  });

  it("gives every voice an attack short enough to be inside its own length", () => {
    // An attack longer than the voice means the envelope's two ramps cross and
    // the sound never reaches its level - it is inaudible, and looks fine here.
    for (const cue of CUE_NAMES) {
      for (const voice of CUE_VOICES[cue]) {
        expect(voice.attack, `${cue}: ${voice.kind}`).toBeLessThan(voice.length);
        expect(voice.attack, `${cue}: ${voice.kind}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("never sweeps a frequency to zero", () => {
    // exponentialRampToValueAtTime cannot reach zero and throws on a target of
    // it, which would take out the whole cue at runtime and nothing here would
    // have caught it.
    for (const cue of CUE_NAMES) {
      for (const voice of CUE_VOICES[cue]) {
        expect(voice.from, cue).toBeGreaterThan(0);
        if (voice.to !== undefined) expect(voice.to, cue).toBeGreaterThan(0);
      }
    }
  });

  it("makes the cues that fire most often the quietest", () => {
    // Card and draw happen dozens of times a game; death and error are rare.
    // A common cue at the level of a rare one is what makes a game grating.
    expect(peakGain("card")).toBeLessThan(peakGain("death"));
    expect(peakGain("draw")).toBeLessThan(peakGain("damage"));
  });

  it("builds a card out of noise rather than a tone", () => {
    // The specific thing that made the old version sound like a toy: a card
    // has no pitch, and a triangle-wave blip is the wrong object entirely.
    expect(CUE_VOICES.card.some((voice) => voice.kind === "noise")).toBe(true);
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
