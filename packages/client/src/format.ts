import type { CardDefinition, ManaCost } from "@mtg-commander-sim/engine";

const COLOR_ORDER = ["W", "U", "B", "R", "G"] as const;

export function formatManaCost(cost: ManaCost | undefined): string {
  if (!cost) return "";
  const symbols: string[] = [];
  if (cost.generic > 0) symbols.push(String(cost.generic));
  for (const color of COLOR_ORDER) {
    const count = cost.colors[color] ?? 0;
    for (let i = 0; i < count; i++) symbols.push(color);
  }
  /*
   * "{B/G}", "{R/W}" - one symbol, its halves in the order the card prints
   * them.
   *
   * Not sorted into WUBRG order, which is what this did until Raph & Leo
   * arrived: hybrid pairs are printed in colour-wheel order, so {R/W} really
   * is red-then-white and sorting it produced a symbol - {W/R} - that appears
   * on no card. The fixtures carry Scryfall's order, so the honest thing is to
   * print what is stored.
   */
  for (const symbol of cost.hybrid ?? []) {
    symbols.push(symbol.join("/"));
  }
  if (symbols.length === 0) return "{0}";
  return symbols.map((s) => `{${s}}`).join("");
}

export function typeLine(def: CardDefinition): string {
  const supertypes = def.supertypes?.length ? def.supertypes.join(" ") + " " : "";
  const subtypes = def.subtypes?.length ? " — " + def.subtypes.join(" ") : "";
  return `${supertypes}${def.types.join(" ")}${subtypes}`;
}
