import type { KeyValueStore } from "../deckbuilder/deckStorage.js";

/**
 * What you found, card by card, kept in the browser.
 *
 * The lab is 93 boards. Nobody walks that in one sitting, so the verdicts and
 * the notes have to survive closing the tab - and they have to be worth reading
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
    for (const [cardId, result] of Object.entries(parsed)) {
      if (isResult(result)) out[cardId] = result;
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

export function resultFor(progress: LabProgress, cardId: string): LabResult {
  return progress[cardId] ?? { ticked: [], updatedAt: 0 };
}

/** Records a verdict without disturbing the ticks or the note. */
export function setVerdict(progress: LabProgress, cardId: string, verdict: LabVerdict | undefined): LabProgress {
  const current = resultFor(progress, cardId);
  return { ...progress, [cardId]: { ...current, verdict, updatedAt: Date.now() } };
}

export function setNote(progress: LabProgress, cardId: string, note: string): LabProgress {
  const current = resultFor(progress, cardId);
  return { ...progress, [cardId]: { ...current, note, updatedAt: Date.now() } };
}

/** Ticks or un-ticks one line of a checklist. */
export function toggleCheck(progress: LabProgress, cardId: string, index: number): LabProgress {
  const current = resultFor(progress, cardId);
  const ticked = current.ticked.includes(index)
    ? current.ticked.filter((n) => n !== index)
    : [...current.ticked, index].sort((a, b) => a - b);
  return { ...progress, [cardId]: { ...current, ticked, updatedAt: Date.now() } };
}

export interface LabTally {
  works: number;
  partly: number;
  broken: number;
  untouched: number;
}

export function tally(progress: LabProgress, cardIds: string[]): LabTally {
  const counts: LabTally = { works: 0, partly: 0, broken: 0, untouched: 0 };
  for (const cardId of cardIds) {
    const verdict = progress[cardId]?.verdict;
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
  cards: Array<{ cardId: string; name: string }>,
): string {
  const lines: string[] = [];
  for (const { cardId, name } of cards) {
    const result = progress[cardId];
    if (!result?.verdict || result.verdict === "works") continue;
    lines.push(`${name} - ${result.verdict === "broken" ? "BROKEN" : "PARTLY WORKING"}`);
    if (result.note?.trim()) lines.push(`  ${result.note.trim().replace(/\n/g, "\n  ")}`);
  }
  if (lines.length === 0) return "Nothing marked broken or partly working.";
  return lines.join("\n");
}
