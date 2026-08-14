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
    const progress = setVerdict(toggleCheck({}, "sol-ring", 1), "sol-ring", "works");
    saveProgress(store, progress);
    expect(loadProgress(store)["sol-ring"]).toMatchObject({ verdict: "works", ticked: [1] });
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
      { cardId: "sol-ring", name: "Sol Ring" },
      { cardId: "skullclamp", name: "Skullclamp" },
      { cardId: "the-ozolith", name: "The Ozolith" },
    ]);
    expect(report).toBe("Skullclamp - BROKEN\n  equip did nothing\nThe Ozolith - PARTLY WORKING");
    expect(report).not.toContain("Sol Ring");
  });

  it("says so when there is nothing wrong", () => {
    expect(reportFaults({}, [{ cardId: "sol-ring", name: "Sol Ring" }])).toBe(
      "Nothing marked broken or partly working.",
    );
  });
});
