/**
 * The fonts available to the font lab, and what each family actually has.
 *
 * The distinction that matters here is **real weights and italics versus faked
 * ones.** A browser asked for bold when only a regular file exists will smear
 * the outlines outwards, and asked for italic it will shear them - both look
 * approximately right at 40px and wrong at 14px, which is the size these are
 * being chosen for. So each family declares what it genuinely ships, the lab
 * shows it, and `nearestWeight` snaps a request onto something real rather than
 * letting the browser invent it.
 *
 * The files live in `packages/client/public/fonts/<slug>/` and are gitignored,
 * like the card art and the mana symbols - they came with their own licences
 * (a mix of OFL and 1001fonts personal-use terms) and the copies here carry
 * those licence files alongside them. Once a font is actually chosen, whether
 * it can be committed is a question to answer for that one font rather than
 * for all ten.
 */

export type FontStyle = "normal" | "italic";

export interface FontFace {
  weight: number;
  style: FontStyle;
  /** Relative to the client's public root. */
  file: string;
}

export interface FontFamily {
  /** Used in CSS and as the stored value. */
  slug: string;
  /** What the lab calls it. */
  name: string;
  /** A word about what it is, so the list is browsable rather than ten names. */
  note: string;
  faces: readonly FontFace[];
}

const face = (weight: number, style: FontStyle, file: string): FontFace => ({ weight, style, file });

export const FONT_FAMILIES: readonly FontFamily[] = [
  {
    slug: "allan",
    name: "Allan",
    note: "Heavy slab serif with a hand-cut edge. Reads loud at small sizes.",
    faces: [face(400, "normal", "/fonts/allan/regular.ttf"), face(700, "normal", "/fonts/allan/bold.ttf")],
  },
  {
    slug: "another-typewriter",
    name: "Another Typewriter",
    note: "Struck typewriter face. One weight only - bold and italic are faked.",
    faces: [face(400, "normal", "/fonts/another-typewriter/regular.ttf")],
  },
  {
    slug: "manuale",
    name: "Manuale",
    note: "Book serif, the fullest family here: four real weights and an italic for each.",
    faces: [
      face(400, "normal", "/fonts/manuale/regular.ttf"),
      face(500, "normal", "/fonts/manuale/medium.ttf"),
      face(600, "normal", "/fonts/manuale/semibold.ttf"),
      face(700, "normal", "/fonts/manuale/bold.ttf"),
      face(400, "italic", "/fonts/manuale/regular-italic.ttf"),
      face(500, "italic", "/fonts/manuale/medium-italic.ttf"),
      face(600, "italic", "/fonts/manuale/semibold-italic.ttf"),
      face(700, "italic", "/fonts/manuale/bold-italic.ttf"),
    ],
  },
  {
    slug: "mississauga",
    name: "Mississauga",
    note: "Condensed display face. One weight, and narrow enough to fit long labels.",
    faces: [face(400, "normal", "/fonts/mississauga/regular.otf")],
  },
  {
    slug: "splendid",
    name: "Splendid 66",
    note: "Geometric, wide. Two real weights.",
    faces: [face(400, "normal", "/fonts/splendid/regular.ttf"), face(700, "normal", "/fonts/splendid/bold.ttf")],
  },
  {
    slug: "square-antiqua",
    name: "Square Antiqua",
    note: "Squared-off serif with real obliques as well as a real bold.",
    faces: [
      face(400, "normal", "/fonts/square-antiqua/regular.ttf"),
      face(700, "normal", "/fonts/square-antiqua/bold.ttf"),
      face(400, "italic", "/fonts/square-antiqua/regular-italic.ttf"),
      face(700, "italic", "/fonts/square-antiqua/bold-italic.ttf"),
    ],
  },
  {
    slug: "thyssen",
    name: "Thyssen J",
    note: "Upright with a real italic but no bold.",
    faces: [
      face(400, "normal", "/fonts/thyssen/regular.ttf"),
      face(400, "italic", "/fonts/thyssen/regular-italic.ttf"),
    ],
  },
  {
    slug: "vibra",
    name: "Vibra",
    note: "Display face, single weight. Loud by design.",
    faces: [face(400, "normal", "/fonts/vibra/regular.ttf")],
  },
  {
    slug: "x-typewriter",
    name: "X Typewriter",
    note: "Cleaner typewriter than Another Typewriter, and it has a real bold.",
    faces: [
      face(400, "normal", "/fonts/x-typewriter/regular.otf"),
      face(700, "normal", "/fonts/x-typewriter/bold.otf"),
    ],
  },
  {
    slug: "zt-otez",
    name: "ZT Otez",
    note: "Angular display serif with a real italic, no bold.",
    faces: [
      face(400, "normal", "/fonts/zt-otez/regular.otf"),
      face(400, "italic", "/fonts/zt-otez/regular-italic.otf"),
    ],
  },
] as const;

/** The stack's last resort, and what everything looked like before any of this. */
export const SYSTEM_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export function familyBySlug(slug: string | undefined): FontFamily | undefined {
  return FONT_FAMILIES.find((f) => f.slug === slug);
}

/** Every weight a family genuinely ships, ascending, without repeats. */
export function realWeights(family: FontFamily): number[] {
  return [...new Set(family.faces.map((f) => f.weight))].sort((a, b) => a - b);
}

/** Whether the family has a drawn italic, as opposed to one the browser shears. */
export function hasRealItalic(family: FontFamily): boolean {
  return family.faces.some((f) => f.style === "italic");
}

/**
 * The closest weight the family actually has to the one asked for.
 *
 * Ties go to the heavier of the two, matching CSS's own font-matching rule for
 * requests at or above 400 - and these are buttons, where heavier is the safer
 * miss.
 */
export function nearestWeight(family: FontFamily, wanted: number): number {
  const weights = realWeights(family);
  let best = weights[0]!;
  for (const weight of weights) {
    const closer = Math.abs(weight - wanted) < Math.abs(best - wanted);
    const tie = Math.abs(weight - wanted) === Math.abs(best - wanted) && weight > best;
    if (closer || tie) best = weight;
  }
  return best;
}

/**
 * Whether asking this family for this combination makes the browser invent
 * something. The lab says so out loud, because a faux bold at 14px is the kind
 * of thing you notice a week later and cannot explain.
 */
export function isSynthesised(family: FontFamily, weight: number, style: FontStyle): boolean {
  return !family.faces.some((f) => f.weight === weight && f.style === style);
}

/** The @font-face rules for one family, as CSS text. */
export function fontFaceCss(family: FontFamily): string {
  return family.faces
    .map(
      (f) => `@font-face {
  font-family: "${family.slug}";
  src: url("${f.file}") format("${f.file.endsWith(".otf") ? "opentype" : "truetype"}");
  font-weight: ${f.weight};
  font-style: ${f.style};
  font-display: swap;
}`,
    )
    .join("\n");
}

/** Every family's rules, for injecting once at boot. */
export function allFontFaceCss(): string {
  return FONT_FAMILIES.map(fontFaceCss).join("\n");
}
