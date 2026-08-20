import { describe, expect, it } from "vitest";
import { memoryStore } from "../deckbuilder/deckStorage.js";
import {
  LAB_STORAGE_KEY,
  loadProgress,
  reportFaults,
  resultFor,
  saveProgress,
  setNote,
  setVerdict,
  tally,
  toggleCheck,
} from "../lab/labProgress.js";

describe("lab progress", () => {
  it("round-trips through a store", () => {
    const store = memoryStore();
    const key = "winota/sol-ring";
    const progress = setVerdict(toggleCheck({}, key, 1), key, "works");
    saveProgress(store, progress);
    expect(loadProgress(store)[key]).toMatchObject({ verdict: "works", ticked: [1] });
  });

  it("files ticks saved before the second deck under the deck that had them", () => {
    /*
     * Every bare key in a saved blob is a Blech board, because Blech was the
     * only deck the lab had. Migrated on read: this is somebody's browser, and
     * there is no moment to run a one-off pass in.
     */
    const saved = JSON.stringify({ "sol-ring": { verdict: "broken", ticked: [0], updatedAt: 1 } });
    const loaded = loadProgress(memoryStore({ [LAB_STORAGE_KEY]: saved }));
    expect(loaded["blech/sol-ring"]).toMatchObject({ verdict: "broken" });
    expect(loaded["sol-ring"]).toBeUndefined();
    // And a key that is already scoped is left exactly as it is.
    const scoped = JSON.stringify({ "winota/sol-ring": { verdict: "works", ticked: [], updatedAt: 1 } });
    expect(loadProgress(memoryStore({ [LAB_STORAGE_KEY]: scoped }))["winota/sol-ring"]).toBeDefined();
  });

  it("starts empty and survives a corrupt blob", () => {
    expect(loadProgress(memoryStore())).toEqual({});
    // Losing your ticks is a nuisance; losing the whole lab because one key is
    // malformed would be worse.
    expect(loadProgress(memoryStore({ [LAB_STORAGE_KEY]: "{not json" }))).toEqual({});
    expect(loadProgress(memoryStore({ [LAB_STORAGE_KEY]: '{"sol-ring":42}' }))).toEqual({});
  });

  it("keeps the ticks in order and toggles them off again", () => {
    let progress = toggleCheck({}, "sol-ring", 2);
    progress = toggleCheck(progress, "sol-ring", 0);
    expect(resultFor(progress, "sol-ring").ticked).toEqual([0, 2]);
    progress = toggleCheck(progress, "sol-ring", 2);
    expect(resultFor(progress, "sol-ring").ticked).toEqual([0]);
  });

  it("records a verdict and a note without disturbing each other", () => {
    let progress = setNote({}, "sol-ring", "taps for one, not two");
    progress = setVerdict(progress, "sol-ring", "broken");
    progress = toggleCheck(progress, "sol-ring", 0);
    expect(resultFor(progress, "sol-ring")).toMatchObject({
      verdict: "broken",
      note: "taps for one, not two",
      ticked: [0],
    });
  });

  it("counts what is left to do", () => {
    let progress = setVerdict({}, "a", "works");
    progress = setVerdict(progress, "b", "broken");
    expect(tally(progress, ["a", "b", "c", "d"])).toEqual({
      works: 1,
      partly: 0,
      broken: 1,
      untouched: 2,
    });
  });

  it("reports only the faults, with their notes", () => {
    let progress = setVerdict({}, "sol-ring", "works");
    progress = setVerdict(progress, "skullclamp", "broken");
    progress = setNote(progress, "skullclamp", "equip did nothing");
    progress = setVerdict(progress, "the-ozolith", "partly");
    const report = reportFaults(progress, [
      { key: "sol-ring", name: "Sol Ring" },
      { key: "skullclamp", name: "Skullclamp" },
      { key: "the-ozolith", name: "The Ozolith" },
    ]);
    expect(report).toBe("Skullclamp - BROKEN\n  equip did nothing\nThe Ozolith - PARTLY WORKING");
    expect(report).not.toContain("Sol Ring");
  });

  it("says so when there is nothing wrong", () => {
    expect(reportFaults({}, [{ key: "sol-ring", name: "Sol Ring" }])).toBe(
      "Nothing marked broken or partly working.",
    );
  });
});
