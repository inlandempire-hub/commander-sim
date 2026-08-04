import { describe, expect, it } from "vitest";
import {
  STOP_KEYS,
  defaultStops,
  loadStops,
  resolveAutoPass,
  saveStops,
  stopKeyFor,
  type StopPreferences,
} from "../stops.js";

function inputs(overrides: Partial<Parameters<typeof resolveAutoPass>[0]> = {}) {
  return {
    mustNotAutoPass: false,
    engineWouldAutoPass: true,
    setting: "auto" as const,
    fullControl: false,
    ...overrides,
  };
}

describe("resolveAutoPass", () => {
  it("follows the engine when the setting is auto", () => {
    expect(resolveAutoPass(inputs({ engineWouldAutoPass: true }))).toBe(true);
    expect(resolveAutoPass(inputs({ engineWouldAutoPass: false }))).toBe(false);
  });

  it("stops on 'always' even with nothing to do", () => {
    expect(resolveAutoPass(inputs({ setting: "always", engineWouldAutoPass: true }))).toBe(false);
  });

  it("skips on 'never' even with something to do", () => {
    expect(resolveAutoPass(inputs({ setting: "never", engineWouldAutoPass: false }))).toBe(true);
  });

  it("never lets a preference override a stop the rules require", () => {
    // The whole reason mustNotAutoPass exists: a setting that quietly stopped
    // you declaring blockers would be a bug you chose.
    expect(
      resolveAutoPass(inputs({ setting: "never", mustNotAutoPass: true, engineWouldAutoPass: false })),
    ).toBe(false);
  });

  it("stops everywhere under full control, whatever the settings say", () => {
    expect(
      resolveAutoPass(inputs({ setting: "never", fullControl: true, engineWouldAutoPass: true })),
    ).toBe(false);
  });

  it("falls back to the engine where no setting applies", () => {
    expect(resolveAutoPass(inputs({ setting: null, engineWouldAutoPass: true }))).toBe(true);
    expect(resolveAutoPass(inputs({ setting: null, engineWouldAutoPass: false }))).toBe(false);
  });
});

describe("stopKeyFor", () => {
  it("tells the two main phases apart", () => {
    expect(stopKeyFor("precombat-main", "main")).toBe("precombat-main");
    expect(stopKeyFor("postcombat-main", "main")).toBe("postcombat-main");
  });

  it("has no setting for steps where nobody gets priority", () => {
    expect(stopKeyFor("beginning", "untap")).toBeNull();
    expect(stopKeyFor("ending", "cleanup")).toBeNull();
  });

  it("maps the combat steps to themselves", () => {
    expect(stopKeyFor("combat", "declare-attackers")).toBe("declare-attackers");
    expect(stopKeyFor("combat", "declare-blockers")).toBe("declare-blockers");
    expect(stopKeyFor("combat", "first-strike-damage")).toBe("first-strike-damage");
  });

  it("maps the beginning and ending steps", () => {
    expect(stopKeyFor("beginning", "upkeep")).toBe("upkeep");
    expect(stopKeyFor("beginning", "draw")).toBe("draw");
    expect(stopKeyFor("ending", "end")).toBe("end");
  });
});

describe("defaults", () => {
  it("leaves every step on auto, so installing this changes nothing", () => {
    const stops = defaultStops();
    expect(Object.keys(stops).sort()).toEqual([...STOP_KEYS].sort());
    expect(Object.values(stops).every((s) => s === "auto")).toBe(true);
  });
});

describe("saving and loading", () => {
  function fakeStorage(initial: Record<string, string> = {}) {
    const data = { ...initial };
    return {
      data,
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => {
        data[k] = v;
      },
    };
  }

  it("round-trips a changed setting", () => {
    const storage = fakeStorage();
    const stops: StopPreferences = { ...defaultStops(), upkeep: "always", draw: "never" };

    saveStops(storage, stops);

    expect(loadStops(storage)).toEqual(stops);
  });

  it("returns the defaults when nothing was ever saved", () => {
    expect(loadStops(fakeStorage())).toEqual(defaultStops());
  });

  it("returns the defaults rather than throwing on corrupt data", () => {
    expect(loadStops(fakeStorage({ "mtg-sim:stops": "not json{" }))).toEqual(defaultStops());
  });

  it("keeps the settings it recognises and ignores the rest", () => {
    // A file from a version with different steps should cost you that one
    // setting, not the whole set.
    const storage = fakeStorage({
      "mtg-sim:stops": JSON.stringify({ upkeep: "always", "some-old-step": "never", draw: "sideways" }),
    });

    const stops = loadStops(storage);

    expect(stops.upkeep).toBe("always");
    expect(stops.draw).toBe("auto");
    expect(Object.keys(stops).sort()).toEqual([...STOP_KEYS].sort());
  });

  it("survives storage being unavailable entirely", () => {
    // Private browsing throws on access rather than returning null.
    const hostile = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };

    expect(loadStops(hostile)).toEqual(defaultStops());
    expect(() => saveStops(hostile, defaultStops())).not.toThrow();
    expect(loadStops(undefined)).toEqual(defaultStops());
  });
});
