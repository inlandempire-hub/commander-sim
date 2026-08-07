import { describe, expect, it } from "vitest";
import { SAMPLES, cueForLogLine, pickIndex, type Cue } from "../sound.js";

/**
 * The audio itself cannot be tested here - there is no Web Audio in node, and
 * "does a card sound like a card" is not a thing an assertion can answer.
 *
 * What can be pinned down is everything around it: that every cue has takes to
 * choose from, that nothing is loud enough to hurt, that the log maps to the
 * right cue, and that a cue never plays the same take twice running. The last
 * two are both real bugs that shipped once each.
 */

const cues = Object.keys(SAMPLES) as Cue[];

describe("the sample manifest", () => {
  it("gives every cue at least one file", () => {
    for (const cue of cues) expect(SAMPLES[cue].files.length, cue).toBeGreaterThan(0);
  });

  it("points every file at the committed sfx folder", () => {
    for (const cue of cues) {
      for (const file of SAMPLES[cue].files) expect(file, cue).toMatch(/^\/sfx\/[\w-]+\.ogg$/);
    }
  });

  it("keeps every cue under a gain ceiling", () => {
    // A typo of 5 for 0.5 is silent in review and genuinely painful through
    // headphones, which is exactly the kind of mistake worth a test.
    for (const cue of cues) {
      expect(SAMPLES[cue].gain, cue).toBeGreaterThan(0);
      expect(SAMPLES[cue].gain, cue).toBeLessThanOrEqual(0.7);
    }
  });

  it("keeps playback rates inside the range where a sample still sounds like itself", () => {
    for (const cue of cues) {
      const rate = SAMPLES[cue].rate ?? 1;
      expect(rate, cue).toBeGreaterThanOrEqual(0.7);
      expect(rate, cue).toBeLessThanOrEqual(1.4);
    }
  });

  it("gives the cues that fire in bursts more than one take", () => {
    // Drawing and dealing fire seven times in a second. One take repeated seven
    // times is a machine gun, whatever the sample is.
    for (const cue of ["draw", "card", "damage"] as const) {
      expect(SAMPLES[cue].files.length, cue).toBeGreaterThan(1);
    }
  });

  it("plays a land heavier than a spell", () => {
    // The only thing separating the two, since it is the same physical action.
    expect(SAMPLES.land.rate ?? 1).toBeLessThan(SAMPLES.card.rate ?? 1);
  });
});

describe("cueForLogLine", () => {
  it("hears a spell being cast", () => {
    expect(cueForLogLine("Deadly Donny casts Glory Seeker")).toBe("card");
  });

  it("hears a land being played", () => {
    expect(cueForLogLine("Salty Mike plays Forest")).toBe("land");
  });

  it("hears a draw", () => {
    expect(cueForLogLine("Salty Mike draws 1 card")).toBe("draw");
    expect(cueForLogLine("Deadly Donny draws 3 cards")).toBe("draw");
  });

  it("hears a mulligan as a shuffle", () => {
    expect(cueForLogLine("Deadly Donny takes a mulligan to 6")).toBe("shuffle");
  });

  it("hears damage", () => {
    expect(cueForLogLine("Craw Wurm deals 6 damage")).toBe("damage");
  });

  it("hears prevented damage as the shield, NOT as damage", () => {
    // The line contains the word "damage", so a naive order gets this wrong -
    // and it did, which meant a prevented hit played the sound of a hit.
    expect(cueForLogLine("3 damage to Deadly Donny prevented")).toBe("shield");
    expect(cueForLogLine("2 damage to Yoked Ox prevented")).toBe("shield");
  });

  it("hears lifegain", () => {
    expect(cueForLogLine("Deadly Donny gains 3 life (lifelink)")).toBe("gain");
  });

  it("hears anything leaving the board as a sweep", () => {
    expect(cueForLogLine("Yoked Ox dies")).toBe("sweep");
    expect(cueForLogLine("Forest is destroyed")).toBe("sweep");
    expect(cueForLogLine("Glory Seeker is exiled")).toBe("sweep");
  });

  it("stays quiet for lines that are bookkeeping rather than events", () => {
    for (const line of [
      "Deadly Donny keeps 7",
      "Salty Mike resolves Tifa Lockhart",
      "Deadly Donny concedes",
      "Lightning Bolt can't be countered",
    ]) {
      expect(cueForLogLine(line), line).toBeUndefined();
    }
  });
});

describe("pickIndex", () => {
  it("has nothing to choose when there is one take", () => {
    expect(pickIndex(1, undefined)).toBe(0);
    expect(pickIndex(1, 0)).toBe(0);
  });

  it("never repeats the take that just played", () => {
    // Exhaustive rather than sampled: for every previous take and every point
    // in the random range, the answer must differ from the previous.
    for (let count = 2; count <= 8; count++) {
      for (let previous = 0; previous < count; previous++) {
        for (let r = 0; r < 1; r += 0.05) {
          expect(pickIndex(count, previous, () => r)).not.toBe(previous);
        }
      }
    }
  });

  it("can still reach every other take", () => {
    const reached = new Set<number>();
    for (let r = 0; r < 1; r += 0.001) reached.add(pickIndex(4, 2, () => r));
    expect([...reached].sort()).toEqual([0, 1, 3]);
  });

  it("is free to pick anything when nothing has played yet", () => {
    const reached = new Set<number>();
    for (let r = 0; r < 1; r += 0.001) reached.add(pickIndex(4, undefined, () => r));
    expect([...reached].sort()).toEqual([0, 1, 2, 3]);
  });

  it("always returns a real index", () => {
    for (let count = 1; count <= 8; count++) {
      for (let r = 0; r < 1; r += 0.01) {
        const index = pickIndex(count, count - 1, () => r);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(count);
      }
    }
  });
});
