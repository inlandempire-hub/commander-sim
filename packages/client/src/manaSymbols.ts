import type { ManaCost } from "@mtg-commander-sim/engine";

/**
 * A mana cost broken into the symbols that get drawn for it.
 *
 * Pure, and separate from the component that renders it, so the ordering and
 * the "what happens to a cost bigger than the icons we have" question can be
 * tested without a DOM.
 */

export interface ManaSymbol {
  /** Stable within one cost, since a cost can repeat the same pip. */
  key: string;
  /** What the pip is: "3", "W". Used as the alt text and as the fallback if no icon loads. */
  label: string;
  /** Where the icon lives, or undefined when there isn't one for this label. */
  src?: string;
}

/**
 * Magic's own printed order: generic first, then WUBRG. Not alphabetical and
 * not the order the colours happen to appear in the object - a cost is read as
 * a fixed sequence and reordering it makes a familiar card look wrong.
 */
const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;

/**
 * The generic icons that exist. Costs above this are drawn as text rather than
 * as an icon - there is no {21} symbol to fall back on, and inventing one by
 * stacking {2}{1} would be a different cost.
 */
export const MAX_GENERIC_ICON = 20;

const ICON_BASE = "/mana";

export function manaSymbols(cost: ManaCost | undefined): ManaSymbol[] {
  if (!cost) return [];
  const symbols: ManaSymbol[] = [];

  // {0} is a real printed cost and has its own symbol, but only when there is
  // nothing else - "{0}{W}" is not a thing anyone has ever printed.
  //
  // Hybrid counts as "something else". Blade Historian costs {R/W}{R/W}{R/W}{R/W}
  // and no generic at all, and without this it drew a {0} pip and read as free.
  const colored =
    COLOR_ORDER.reduce((sum, color) => sum + (cost.colors[color] ?? 0), 0) + (cost.hybrid?.length ?? 0);
  if (cost.generic > 0 || colored === 0) {
    const label = String(cost.generic);
    symbols.push({
      key: `generic`,
      label,
      src: cost.generic <= MAX_GENERIC_ICON ? `${ICON_BASE}/${cost.generic}.png` : undefined,
    });
  }

  for (const color of COLOR_ORDER) {
    const count = cost.colors[color] ?? 0;
    for (let i = 0; i < count; i++) {
      symbols.push({
        key: `${color}${i}`,
        label: color,
        src: `${ICON_BASE}/${color.toLowerCase()}.png`,
      });
    }
  }

  /*
   * A hybrid symbol, in the order the card prints its halves.
   *
   * Deliberately with no `src`: there is no hybrid icon on disk, and
   * `ManaCostView` already falls back to the braces text for the whole cost
   * the moment any symbol lacks one. Half a cost in pips and half in letters
   * is worse than all of it in letters, which is exactly why that rule exists.
   */
  for (const [index, symbol] of (cost.hybrid ?? []).entries()) {
    symbols.push({ key: `hybrid${index}`, label: symbol.join("/") });
  }

  return symbols;
}
