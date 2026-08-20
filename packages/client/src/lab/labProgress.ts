import type { KeyValueStore } from "../deckbuilder/deckStorage.js";

/**
 * What you found, card by card, kept in the browser.
 *
 * The lab is close to two hundred boards across its decks. Nobody walks that in
 * one sitting, so the verdicts and the notes have to survive closing the tab - and they have to be worth reading
 * back weeks later, which is why a "broken" verdict carries a free-text note
 * rather than only a tick. The note is the bug report.
 *
 * Same posture as saved decks: localStorage, no server. A verdict is a handful
 * of bytes and this is a private tool.
 */

export type LabVerdict = "works" | "partly" | "broken";

export interface LabResult {
  verdict?: LabVerdict;
  /** Indexes into the scenario's `checks`, for the lines you have confirmed. */
  ticked: number[];
  /** What went wrong, in your own words. Only meaningful beside a verdict. */
  note?: string;
  updatedAt: number;
}

/**
 * Keyed by `deckSlug/cardId`, not by card id.
 *
 * Deck-scoped because the lab walks more than one deck and four cards are in
 * both lists - Command Tower, Sol Ring, Marsh Flats, Windswept Heath. They are
 * walked on two different boards, so they are two different verdicts; one key
 * for both would have the second walk silently overwrite the first.
 *
 * See `labProgressKey` in the engine, which is the only thing that should build
 * one of these strings.
 */
export type LabProgress = Record<string, LabResult>;

export const LAB_STORAGE_KEY = "mtg-commander-sim.cardlab.v1";

function isResult(value: unknown): value is LabResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<LabResult>;
  return Array.isArray(result.ticked) && result.ticked.every((n) => typeof n === "number");
}

export function loadProgress(store: KeyValueStore): LabProgress {
  const raw = store.getItem(LAB_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: LabProgress = {};
    for (const [key, result] of Object.entries(parsed)) {
      if (!isResult(result)) continue;
      /*
       * Ticks saved before the lab had a second deck are bare card ids, and
       * every one of them was a Blech board. Migrated on read rather than in a
       * one-off pass because there is no moment to run a one-off pass in: this
       * is somebody's browser, and the alternative is their work quietly
       * vanishing the first time they open the new build.
       */
      out[key.includes("/") ? key : `blech/${key}`] = result;
    }
    return out;
  } catch {
    // A corrupt blob loses your ticks, which is a nuisance. Throwing here would
    // lose the whole lab, which is worse.
    return {};
  }
}

export function saveProgress(store: KeyValueStore, progress: LabProgress): void {
  store.setItem(LAB_STORAGE_KEY, JSON.stringify(progress));
}

export function resultFor(progress: LabProgress, key: string): LabResult {
  return progress[key] ?? { ticked: [], updatedAt: 0 };
}

/** Records a verdict without disturbing the ticks or the note. */
export function setVerdict(progress: LabProgress, key: string, verdict: LabVerdict | undefined): LabProgress {
  const current = resultFor(progress, key);
  return { ...progress, [key]: { ...current, verdict, updatedAt: Date.now() } };
}

export function setNote(progress: LabProgress, key: string, note: string): LabProgress {
  const current = resultFor(progress, key);
  return { ...progress, [key]: { ...current, note, updatedAt: Date.now() } };
}

/** Ticks or un-ticks one line of a checklist. */
export function toggleCheck(progress: LabProgress, key: string, index: number): LabProgress {
  const current = resultFor(progress, key);
  const ticked = current.ticked.includes(index)
    ? current.ticked.filter((n) => n !== index)
    : [...current.ticked, index].sort((a, b) => a - b);
  return { ...progress, [key]: { ...current, ticked, updatedAt: Date.now() } };
}

export interface LabTally {
  works: number;
  partly: number;
  broken: number;
  untouched: number;
}

export function tally(progress: LabProgress, keys: string[]): LabTally {
  const counts: LabTally = { works: 0, partly: 0, broken: 0, untouched: 0 };
  for (const key of keys) {
    const verdict = progress[key]?.verdict;
    if (verdict === "works") counts.works += 1;
    else if (verdict === "partly") counts.partly += 1;
    else if (verdict === "broken") counts.broken += 1;
    else counts.untouched += 1;
  }
  return counts;
}

/**
 * Everything that did not work, as plain text.
 *
 * The point of the lab is the list it produces, and that list is no use locked
 * in a browser tab - it has to be handed to whoever is going to fix it. Cards
 * that worked are left out on purpose: a report of 93 lines, 88 of them saying
 * "fine", buries the five that matter.
 */
export function reportFaults(
  progress: LabProgress,
  cards: Array<{ key: string; name: string }>,
): string {
  const lines: string[] = [];
  for (const { key, name } of cards) {
    const result = progress[key];
    if (!result?.verdict || result.verdict === "works") continue;
    lines.push(`${name} - ${result.verdict === "broken" ? "BROKEN" : "PARTLY WORKING"}`);
    if (result.note?.trim()) lines.push(`  ${result.note.trim().replace(/\n/g, "\n  ")}`);
  }
  if (lines.length === 0) return "Nothing marked broken or partly working.";
  return lines.join("\n");
}
