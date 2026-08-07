import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FONT_FAMILIES,
  allFontFaceCss,
  familyBySlug,
  fontFaceCss,
  hasRealItalic,
  isSynthesised,
  nearestWeight,
  realWeights,
} from "../fontCatalogue.js";
import {
  DEFAULT_PREFS,
  cssVariablesFor,
  parseChoice,
  parsePrefs,
  stackFor,
  type FontChoice,
} from "../fontPrefs.js";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("the font catalogue", () => {
  it("has a unique slug per family", () => {
    const slugs = FONT_FAMILIES.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses slugs that are safe in a CSS font-family name", () => {
    for (const family of FONT_FAMILIES) expect(family.slug, family.name).toMatch(/^[a-z0-9-]+$/);
  });

  it("points every face at a file under /fonts with a real extension", () => {
    for (const family of FONT_FAMILIES) {
      for (const face of family.faces) {
        expect(face.file, family.slug).toMatch(/^\/fonts\/[a-z0-9-]+\/[a-z-]+\.(ttf|otf)$/);
      }
    }
  });

  it("never lists the same weight and style twice in one family", () => {
    for (const family of FONT_FAMILIES) {
      const keys = family.faces.map((f) => `${f.weight}/${f.style}`);
      expect(new Set(keys).size, family.slug).toBe(keys.length);
    }
  });

  it("gives every family at least an upright regular to fall back on", () => {
    for (const family of FONT_FAMILIES) {
      expect(
        family.faces.some((f) => f.style === "normal"),
        family.slug,
      ).toBe(true);
    }
  });

  it("describes every family, so the list is browsable rather than ten names", () => {
    for (const family of FONT_FAMILIES) {
      expect(family.name.length, family.slug).toBeGreaterThan(0);
      expect(family.note.length, family.slug).toBeGreaterThan(20);
    }
  });
});

describe("realWeights / hasRealItalic", () => {
  it("reports weights ascending and without repeats", () => {
    const manuale = familyBySlug("manuale")!;
    expect(realWeights(manuale)).toEqual([400, 500, 600, 700]);
  });

  it("knows which families ship an italic", () => {
    expect(hasRealItalic(familyBySlug("manuale")!)).toBe(true);
    expect(hasRealItalic(familyBySlug("zt-otez")!)).toBe(true);
    expect(hasRealItalic(familyBySlug("allan")!)).toBe(false);
    expect(hasRealItalic(familyBySlug("vibra")!)).toBe(false);
  });
});

describe("nearestWeight", () => {
  it("returns a weight the family actually has", () => {
    for (const family of FONT_FAMILIES) {
      for (let wanted = 100; wanted <= 900; wanted += 100) {
        expect(realWeights(family), `${family.slug} @ ${wanted}`).toContain(nearestWeight(family, wanted));
      }
    }
  });

  it("picks the closest one", () => {
    const manuale = familyBySlug("manuale")!;
    expect(nearestWeight(manuale, 100)).toBe(400);
    expect(nearestWeight(manuale, 480)).toBe(500);
    expect(nearestWeight(manuale, 900)).toBe(700);
  });

  it("breaks a tie towards the heavier, which is the safer miss on a button", () => {
    const allan = familyBySlug("allan")!; // 400 and 700
    expect(nearestWeight(allan, 550)).toBe(700);
  });

  it("has nothing to choose in a single-weight family", () => {
    const vibra = familyBySlug("vibra")!;
    for (let wanted = 100; wanted <= 900; wanted += 100) expect(nearestWeight(vibra, wanted)).toBe(400);
  });
});

describe("isSynthesised", () => {
  it("is false for a face the family really has", () => {
    expect(isSynthesised(familyBySlug("manuale")!, 700, "italic")).toBe(false);
  });

  it("is true when the browser would have to fake the weight", () => {
    expect(isSynthesised(familyBySlug("vibra")!, 800, "normal")).toBe(true);
  });

  it("is true when the browser would have to shear an italic", () => {
    expect(isSynthesised(familyBySlug("allan")!, 400, "italic")).toBe(true);
  });
});

describe("fontFaceCss", () => {
  it("declares one rule per face, named by the slug", () => {
    const rules = fontFaceCss(familyBySlug("allan")!);
    expect(rules.match(/@font-face/g)).toHaveLength(2);
    expect(rules).toContain('font-family: "allan"');
  });

  it("uses the right format keyword for each file type", () => {
    // A wrong `format()` makes some browsers skip the file silently, which
    // looks exactly like the font not existing.
    expect(fontFaceCss(familyBySlug("mississauga")!)).toContain('format("opentype")');
    expect(fontFaceCss(familyBySlug("allan")!)).toContain('format("truetype")');
  });

  it("covers every face of every family in one go", () => {
    const total = FONT_FAMILIES.reduce((sum, f) => sum + f.faces.length, 0);
    expect(allFontFaceCss().match(/@font-face/g)).toHaveLength(total);
  });
});

describe("font preferences", () => {
  const choice = (over: Partial<FontChoice> = {}): FontChoice => ({
    family: "manuale",
    weight: 600,
    style: "normal",
    letterSpacing: 0.05,
    ...over,
  });

  it("falls back to the defaults on nothing, on rubbish, and on broken JSON", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("not json at all")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("[1,2,3]")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('"a string"')).toEqual(DEFAULT_PREFS);
  });

  it("drops a family slug that no longer exists rather than setting a font that isn't there", () => {
    // The realistic case: a preference written when the catalogue had a family
    // that has since been removed.
    expect(parseChoice({ family: "deleted-font", weight: 400 }, DEFAULT_PREFS.buttons).family).toBeUndefined();
  });

  it("keeps a family slug that does exist", () => {
    expect(parseChoice({ family: "zt-otez" }, DEFAULT_PREFS.buttons).family).toBe("zt-otez");
  });

  it("clamps a weight into a range that renders", () => {
    expect(parseChoice({ weight: 5000 }, DEFAULT_PREFS.buttons).weight).toBe(900);
    expect(parseChoice({ weight: -20 }, DEFAULT_PREFS.buttons).weight).toBe(100);
    expect(parseChoice({ weight: Number.NaN }, DEFAULT_PREFS.buttons).weight).toBe(DEFAULT_PREFS.buttons.weight);
  });

  it("clamps letter spacing too", () => {
    expect(parseChoice({ letterSpacing: 9 }, DEFAULT_PREFS.buttons).letterSpacing).toBe(0.3);
    expect(parseChoice({ letterSpacing: -9 }, DEFAULT_PREFS.buttons).letterSpacing).toBe(-0.05);
  });

  it("treats anything that is not the word italic as upright", () => {
    expect(parseChoice({ style: "oblique" }, DEFAULT_PREFS.buttons).style).toBe("normal");
    expect(parseChoice({ style: "italic" }, DEFAULT_PREFS.buttons).style).toBe("italic");
  });

  it("survives a round trip", () => {
    const prefs = { buttons: choice(), beat: choice({ family: "vibra", style: "italic" }) };
    expect(parsePrefs(JSON.stringify(prefs))).toEqual(prefs);
  });

  it("defaults to the system stack, so a fresh browser is the table as it was", () => {
    expect(DEFAULT_PREFS.buttons.family).toBeUndefined();
    expect(DEFAULT_PREFS.beat.family).toBeUndefined();
  });
});

describe("stackFor", () => {
  it("puts the chosen family first and keeps the system stack under it", () => {
    const stack = stackFor(choiceOf("manuale"));
    expect(stack.startsWith('"manuale",')).toBe(true);
    expect(stack).toContain("sans-serif");
  });

  it("is the system stack alone when nothing is chosen", () => {
    expect(stackFor(choiceOf(undefined)).startsWith('"')).toBe(false);
  });

  function choiceOf(family: string | undefined): FontChoice {
    return { family, weight: 400, style: "normal", letterSpacing: 0 };
  }
});

describe("the variables the lab writes and the stylesheet reads", () => {
  /*
   * This is the join between the two, and a typo on either side fails silently
   * as "the font just did not change" - no error, no warning, nothing in the
   * console. So both ends are checked against each other.
   */
  const targets = ["buttons", "beat"] as const;

  it("names four properties per target", () => {
    for (const target of targets) {
      expect(Object.keys(cssVariablesFor(target, DEFAULT_PREFS[target])).sort()).toEqual([
        `--font-${target}`,
        `--font-${target}-style`,
        `--font-${target}-tracking`,
        `--font-${target}-weight`,
      ]);
    }
  });

  it("has styles.css actually consuming every one of them", () => {
    for (const target of targets) {
      for (const name of Object.keys(cssVariablesFor(target, DEFAULT_PREFS[target]))) {
        expect(css, name).toContain(`var(${name}`);
      }
    }
  });

  it("gives every one of them a fallback, so a cleared preference is the old table", () => {
    for (const target of targets) {
      for (const name of Object.keys(cssVariablesFor(target, DEFAULT_PREFS[target]))) {
        expect(new RegExp(`var\\(${name},\\s*[^)]`).test(css), name).toBe(true);
      }
    }
  });

  it("writes a tracking value in em", () => {
    expect(cssVariablesFor("buttons", DEFAULT_PREFS.buttons)["--font-buttons-tracking"]).toMatch(/em$/);
  });
});
