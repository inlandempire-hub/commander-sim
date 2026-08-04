import type { Phase, Step } from "@mtg-commander-sim/engine";

/**
 * Which steps to stop at.
 *
 * The engine already answers "does this player have anything worth doing here"
 * and skips the step if not, which is what stops a game of Magic being forty
 * clicks of "pass" per turn. What it cannot answer is what *you* want. Two
 * examples the engine gets wrong for opposite reasons:
 *
 *  - you are holding a counterspell and want the game to stop on your
 *    opponent's turn so you can decide, even though it would happily pass for
 *    you when you decline;
 *  - you never bluff, and being asked at every upkeep is just friction.
 *
 * So each step gets a setting, and the engine's answer is the default.
 *
 * The arithmetic lives here rather than in the component for the usual reason
 * in this project: the test runner only picks up `.ts`, so logic in a `.tsx`
 * file cannot be tested.
 */

/**
 * The points where a stop is meaningful. Untap and cleanup are absent because
 * nobody receives priority in them at all (rule 502.4, 514.2) - offering a
 * setting for a step that cannot stop would be a switch wired to nothing.
 *
 * The two main phases are separate entries even though they are the same
 * `Step`, because wanting to act before combat and wanting to act after it are
 * genuinely different decisions.
 */
export const STOP_KEYS = [
  "upkeep",
  "draw",
  "precombat-main",
  "begin-combat",
  "declare-attackers",
  "declare-blockers",
  "first-strike-damage",
  "combat-damage",
  "end-combat",
  "postcombat-main",
  "end",
] as const;

export type StopKey = (typeof STOP_KEYS)[number];

/** Human wording for the settings panel, in the order a turn happens. */
export const STOP_LABELS: Record<StopKey, string> = {
  upkeep: "Upkeep",
  draw: "Draw",
  "precombat-main": "Main phase (before combat)",
  "begin-combat": "Beginning of combat",
  "declare-attackers": "Declare attackers",
  "declare-blockers": "Declare blockers",
  "first-strike-damage": "First-strike damage",
  "combat-damage": "Combat damage",
  "end-combat": "End of combat",
  "postcombat-main": "Main phase (after combat)",
  end: "End step",
};

/**
 * `auto` leaves it to the engine: stop when you have something you could
 * legally do, otherwise skip. `always` stops whether or not you can act, which
 * is how you get a chance to bluff or to think. `never` skips even when you
 * could act - the setting for a step you have decided you never use.
 */
export type StopSetting = "auto" | "always" | "never";

export type StopPreferences = Record<StopKey, StopSetting>;

/**
 * Everything on `auto`, which is exactly what the game did before any of this
 * existed. A preferences feature whose defaults change how the game plays is a
 * preferences feature that broke something for everyone who never opens it.
 */
export function defaultStops(): StopPreferences {
  return Object.fromEntries(STOP_KEYS.map((key) => [key, "auto"])) as StopPreferences;
}

/** Which setting governs the position the game is currently in, if any. */
export function stopKeyFor(phase: Phase, step: Step): StopKey | null {
  if (step === "main") {
    if (phase === "precombat-main") return "precombat-main";
    if (phase === "postcombat-main") return "postcombat-main";
    return null;
  }
  if (step === "untap" || step === "cleanup") return null;
  return STOP_KEYS.includes(step as StopKey) ? (step as StopKey) : null;
}

export interface AutoPassInputs {
  /**
   * The engine's structural answer: a decision the rules require of this
   * player here, or a window that cannot be reopened. Checked first and
   * unconditionally - see mustNotAutoPass in the engine. No preference may
   * switch off the step where you declare your blockers.
   */
  mustNotAutoPass: boolean;
  /** The engine's ordinary answer: nothing worth doing here. */
  engineWouldAutoPass: boolean;
  /** The setting for this step, or null where no setting applies. */
  setting: StopSetting | null;
  /** The override that stops everything, for when you want to watch a turn happen. */
  fullControl: boolean;
}

/**
 * Whether to pass priority without asking.
 *
 * Ordered so that the things which protect the player come first: full control
 * beats every setting, and the engine's structural stops beat both. Only once
 * nothing is at stake does the preference get a say.
 */
export function resolveAutoPass({
  mustNotAutoPass,
  engineWouldAutoPass,
  setting,
  fullControl,
}: AutoPassInputs): boolean {
  if (fullControl) return false;
  if (mustNotAutoPass) return false;
  if (setting === "always") return false;
  if (setting === "never") return true;
  return engineWouldAutoPass;
}

const STORAGE_KEY = "mtg-sim:stops";

/**
 * Reads back what was saved, ignoring anything it does not recognise.
 *
 * Deliberately forgiving: a stored file from an older version with a step that
 * no longer exists, or a hand-edited value, should cost you that one setting
 * rather than throwing away the rest or refusing to start the game.
 */
export function loadStops(storage: Pick<Storage, "getItem"> | undefined): StopPreferences {
  const stops = defaultStops();
  let raw: string | null = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return stops; // private browsing, or storage disabled
  }
  if (!raw) return stops;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return stops;
    for (const key of STOP_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (value === "auto" || value === "always" || value === "never") stops[key] = value;
    }
  } catch {
    // Corrupt JSON: the defaults are a perfectly good game.
  }
  return stops;
}

export function saveStops(
  storage: Pick<Storage, "setItem"> | undefined,
  stops: StopPreferences,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(stops));
  } catch {
    // Not being able to remember the setting is not a reason to interrupt a game.
  }
}
