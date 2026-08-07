import { SYSTEM_STACK, familyBySlug, type FontStyle } from "./fontCatalogue.js";

/**
 * Which font the two loudest bits of type on the table use, and how heavy.
 *
 * Two targets rather than one because they are doing different jobs. The
 * buttons are a control you hit two hundred times a game and have to read in a
 * glance; the combat banner is a one-second announcement across the middle of
 * the screen and can afford to be a display face. A font that is right for one
 * is very often wrong for the other, so they are chosen separately.
 *
 * Stored as a preference and applied as CSS custom properties, which is what
 * lets one choice in the lab reach every button and banner without any
 * component knowing a font exists. `--font-buttons` and friends have fallbacks
 * baked into their `var()` calls in styles.css, so a cleared preference, a
 * corrupt one and a browser with storage blocked all land back on the system
 * stack rather than on nothing.
 */

export interface FontChoice {
  /** A slug from FONT_FAMILIES, or undefined for the system stack. */
  family?: string;
  weight: number;
  style: FontStyle;
  /**
   * Tracking, in em. Display faces set at button sizes often want a touch more
   * and typewriter faces almost always want less, and it is the one other
   * control that changes whether a font works here at all.
   */
  letterSpacing: number;
}

export interface FontPrefs {
  buttons: FontChoice;
  beat: FontChoice;
}

/** What the table looked like before the lab existed, and what Reset returns to. */
export const DEFAULT_PREFS: FontPrefs = {
  buttons: { family: undefined, weight: 800, style: "normal", letterSpacing: 0.06 },
  beat: { family: undefined, weight: 700, style: "normal", letterSpacing: 0.02 },
};

export const FONT_STORAGE_KEY = "mtg-sim.fonts";

const WEIGHT_MIN = 100;
const WEIGHT_MAX = 900;
const SPACING_MIN = -0.05;
const SPACING_MAX = 0.3;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Reads one choice out of whatever was in storage.
 *
 * Deliberately forgiving. This is a preference blob written by an older build
 * of the lab as often as not, and the failure mode for being strict about it is
 * a table with no font at all - so every field falls back on its own, an
 * unknown family slug is dropped rather than thrown on, and the numbers are
 * clamped into a range that still renders.
 */
export function parseChoice(raw: unknown, fallback: FontChoice): FontChoice {
  if (typeof raw !== "object" || raw === null) return fallback;
  const value = raw as Partial<Record<keyof FontChoice, unknown>>;
  const family = typeof value.family === "string" && familyBySlug(value.family) ? value.family : undefined;
  return {
    family,
    weight:
      typeof value.weight === "number" && Number.isFinite(value.weight)
        ? clamp(Math.round(value.weight), WEIGHT_MIN, WEIGHT_MAX)
        : fallback.weight,
    style: value.style === "italic" ? "italic" : "normal",
    letterSpacing:
      typeof value.letterSpacing === "number" && Number.isFinite(value.letterSpacing)
        ? clamp(value.letterSpacing, SPACING_MIN, SPACING_MAX)
        : fallback.letterSpacing,
  };
}

export function parsePrefs(json: string | null): FontPrefs {
  if (!json) return DEFAULT_PREFS;
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFS;
    const value = parsed as Partial<Record<keyof FontPrefs, unknown>>;
    return {
      buttons: parseChoice(value.buttons, DEFAULT_PREFS.buttons),
      beat: parseChoice(value.beat, DEFAULT_PREFS.beat),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** The font-family value for a choice: the chosen face, then the system stack under it. */
export function stackFor(choice: FontChoice): string {
  return choice.family ? `"${choice.family}", ${SYSTEM_STACK}` : SYSTEM_STACK;
}

/**
 * The custom properties one choice contributes. Pure and exported so a test can
 * check the whole mapping without a DOM - this is the join between the lab and
 * every rule in styles.css, and a typo in a property name here fails silently
 * as "the font just did not change".
 */
export function cssVariablesFor(target: keyof FontPrefs, choice: FontChoice): Record<string, string> {
  return {
    [`--font-${target}`]: stackFor(choice),
    [`--font-${target}-weight`]: String(choice.weight),
    [`--font-${target}-style`]: choice.style,
    [`--font-${target}-tracking`]: `${choice.letterSpacing}em`,
  };
}

export function loadPrefs(storage: Storage | undefined = safeStorage()): FontPrefs {
  if (!storage) return DEFAULT_PREFS;
  try {
    return parsePrefs(storage.getItem(FONT_STORAGE_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: FontPrefs, storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(FONT_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Storage blocked. The choice still applies for this session.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Writes a set of preferences onto the document, where the stylesheet reads them. */
export function applyPrefs(prefs: FontPrefs, root: HTMLElement | undefined = documentRoot()): void {
  if (!root) return;
  for (const target of ["buttons", "beat"] as const) {
    for (const [name, value] of Object.entries(cssVariablesFor(target, prefs[target]))) {
      root.style.setProperty(name, value);
    }
  }
}

function documentRoot(): HTMLElement | undefined {
  return typeof document === "undefined" ? undefined : document.documentElement;
}

/**
 * Injects the @font-face rules once.
 *
 * A stylesheet rather than the CSS file because the catalogue is the source of
 * truth for which files exist, and keeping a second hand-written copy of it in
 * styles.css is exactly the kind of duplication that goes stale the first time
 * a font is added.
 */
export function installFontFaces(css: string, doc: Document | undefined = safeDocument()): void {
  if (!doc || doc.getElementById("font-faces")) return;
  const style = doc.createElement("style");
  style.id = "font-faces";
  style.textContent = css;
  doc.head.appendChild(style);
}

function safeDocument(): Document | undefined {
  return typeof document === "undefined" ? undefined : document;
}
