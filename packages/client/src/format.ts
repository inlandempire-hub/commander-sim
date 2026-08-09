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
  // "{B/G}" - printed as one symbol with its halves in the usual colour order,
  // which is what makes a filter land's cost read as the single symbol it is.
  for (const symbol of cost.hybrid ?? []) {
    symbols.push(COLOR_ORDER.filter((c) => symbol.includes(c)).join("/"));
  }
  if (symbols.length === 0) return "{0}";
  return symbols.map((s) => `{${s}}`).join("");
}

export function typeLine(def: CardDefinition): string {
  const supertypes = def.supertypes?.length ? def.supertypes.join(" ") + " " : "";
  const subtypes = def.subtypes?.length ? " — " + def.subtypes.join(" ") : "";
  return `${supertypes}${def.types.join(" ")}${subtypes}`;
}
