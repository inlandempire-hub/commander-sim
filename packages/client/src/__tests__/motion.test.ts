import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cssEase, DEAL, DURATIONS, EASINGS, type Easing } from "../motion.js";

/**
 * The motion scale exists twice - as custom properties in styles.css and as
 * numbers in motion.ts - because CSS cannot import a module and writing the
 * stylesheet from JavaScript at boot would be worse than the duplication.
 *
 * That is only safe if the two cannot drift, which is what this checks. It
 * fails the moment somebody tunes one and forgets the other, which is the
 * whole risk the duplication carries.
 *
 * Reading the stylesheet as text rather than through a DOM on purpose: these
 * tests run in node with no browser at all, and the file is the artefact that
 * ships either way.
 */
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function customProperty(name: string): string | undefined {
  return new RegExp(`--${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
}

describe("the motion scale", () => {
  it("declares every duration in styles.css with the same value", () => {
    for (const [name, ms] of Object.entries(DURATIONS)) {
      expect(customProperty(`t-${name}`), `--t-${name}`).toBe(`${ms}ms`);
    }
  });

  it("declares every easing in styles.css with the same control points", () => {
    for (const [name, points] of Object.entries(EASINGS)) {
      expect(customProperty(`ease-${name}`), `--ease-${name}`).toBe(cssEase(points as Easing));
    }
  });

  it("orders the durations from the shortest thing to the longest", () => {
    // Not decoration: the names are meant to be picked by what the motion is
    // for, and that only helps if "press" really is quicker than "pose".
    const ms = [DURATIONS.press, DURATIONS.pose, DURATIONS.travel, DURATIONS.strike, DURATIONS.linger];
    for (let i = 1; i < ms.length; i++) expect(ms[i]!).toBeGreaterThan(ms[i - 1]!);
  });

  it("keeps a pose inside the band where a change reads as movement", () => {
    // Under ~100ms a change is seen as a jump rather than as motion; over
    // ~250ms a small one starts registering as a wait.
    expect(DURATIONS.pose).toBeGreaterThan(100);
    expect(DURATIONS.pose).toBeLessThan(250);
  });

  it("answers a click inside the window where it still feels connected", () => {
    expect(DURATIONS.press).toBeLessThan(100);
  });

  it("decelerates every curve", () => {
    // The point of the whole scale. A cubic-bezier whose second control point
    // sits at or past the end (y2 >= 1) finishes flat, which is what makes it
    // read as something coming to rest rather than something passing through.
    for (const [name, [, , , y2]] of Object.entries(EASINGS)) {
      expect(y2, name).toBeGreaterThanOrEqual(1);
    }
  });

  it("starts every curve moving immediately", () => {
    // The mirror of the rule above: nothing here should wind up before it goes.
    // An easing whose first control point is high on y is already accelerating
    // out of the gate, which is what separates these from CSS's default `ease`.
    for (const [name, [, y1]] of Object.entries(EASINGS)) {
      expect(y1, name).toBeGreaterThan(0.6);
    }
  });

  it("declares the deal timings in styles.css too", () => {
    expect(customProperty("t-deal")).toBe(`${DEAL.card}ms`);
    expect(customProperty("t-deal-step")).toBe(`${DEAL.step}ms`);
  });

  it("deals a whole opening hand in about the time a person would", () => {
    // Seven cards, each starting one step after the last. Long enough to read
    // as dealing rather than as the hand appearing; short enough that nobody
    // sits through it. Both ends matter - the first version of this was a
    // 60ms step, which was a flicker, not a deal.
    const seven = DEAL.step * 6 + DEAL.card;
    expect(seven).toBeGreaterThan(700);
    expect(seven).toBeLessThan(1600);
  });

  it("keeps the gap between cards shorter than a card's own arrival", () => {
    // Otherwise each card lands before the next sets off and the deal reads as
    // seven separate events rather than as one run.
    expect(DEAL.step).toBeLessThan(DEAL.card);
  });

  it("overshoots only where overshoot is the point", () => {
    const overshoots = Object.entries(EASINGS).filter(([, [, , , y2]]) => y2 > 1);
    expect(overshoots.map(([name]) => name)).toEqual(["snap"]);
  });
});
