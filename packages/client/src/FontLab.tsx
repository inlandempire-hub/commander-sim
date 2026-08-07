import { useEffect, useState, type CSSProperties } from "react";
import {
  FONT_FAMILIES,
  familyBySlug,
  hasRealItalic,
  isSynthesised,
  nearestWeight,
  realWeights,
  type FontFamily,
} from "./fontCatalogue.js";
import {
  DEFAULT_PREFS,
  applyPrefs,
  cssVariablesFor,
  loadPrefs,
  savePrefs,
  type FontChoice,
  type FontPrefs,
} from "./fontPrefs.js";

/**
 * A room for choosing the type on the two loudest things on the table.
 *
 * Opened with `?mode=fonts`. It is not a settings screen - it is a place to sit
 * and compare, which is a different thing and wants a different shape:
 *
 * - **The previews are the real controls.** `.action-bar__go` and `.beat` are
 *   the actual classes off styles.css, at their actual sizes, on the actual
 *   felt. A font sample rendered in a neutral box at 32px tells you almost
 *   nothing about whether "CONFIRM ATTACKERS" fits in a 132px column.
 * - **The combat banner holds still.** In a game it arrives, sits for about a
 *   second and leaves, which is long enough to notice and far too short to
 *   judge a typeface by. Here it is simply on, and stays on.
 * - **Faked weights are called out.** A browser asked for bold with no bold
 *   file smears the outlines; asked for italic it shears them. Both look
 *   plausible at display size and wrong at 14px, which is the size being
 *   chosen for - so the lab says which of the two you are looking at.
 *
 * Choices are applied live to this page and saved on "Use this", which is also
 * what the table reads at boot (see main.tsx).
 */

type Target = keyof FontPrefs;

const TARGETS: ReadonlyArray<{ id: Target; title: string; blurb: string }> = [
  {
    id: "buttons",
    title: "Pass and Concede",
    blurb:
      "Hit between fifty and two hundred times a game, at 14-15px in a 132px column. Legible beats characterful here - if a face is charming and you cannot tell PASS from END TURN at a glance, it is the wrong one.",
  },
  {
    id: "beat",
    title: "The Combat banner",
    blurb:
      "One second, across the middle of the table, at 40px. This is where a display face earns its keep - it has room, it has your attention, and it never has to be read twice.",
  },
];

export function FontLab() {
  const [prefs, setPrefs] = useState<FontPrefs>(() => loadPrefs());
  const [saved, setSaved] = useState<FontPrefs>(() => loadPrefs());
  const [target, setTarget] = useState<Target>("buttons");

  // Live, so picking a family in the list changes the previews under it
  // immediately rather than on a button press.
  useEffect(() => {
    applyPrefs(prefs);
  }, [prefs]);

  const choice = prefs[target];
  const family = familyBySlug(choice.family);
  const dirty = JSON.stringify(prefs[target]) !== JSON.stringify(saved[target]);

  function update(patch: Partial<FontChoice>) {
    setPrefs((current) => ({ ...current, [target]: { ...current[target], ...patch } }));
  }

  function chooseFamily(next: FontFamily | undefined) {
    if (!next) {
      update({ family: undefined });
      return;
    }
    // Snap onto a weight the family really has, and drop italic if it has none.
    // Carrying a request for 800 italic onto a family with one upright file is
    // how you end up looking at a fake and thinking it is the font.
    update({
      family: next.slug,
      weight: nearestWeight(next, choice.weight),
      style: hasRealItalic(next) ? choice.style : "normal",
    });
  }

  function keep() {
    const next = { ...saved, [target]: prefs[target] };
    savePrefs(next);
    setSaved(next);
  }

  function reset() {
    const next = { ...prefs, [target]: DEFAULT_PREFS[target] };
    setPrefs(next);
    savePrefs({ ...saved, [target]: DEFAULT_PREFS[target] });
    setSaved({ ...saved, [target]: DEFAULT_PREFS[target] });
  }

  const faked = family ? isSynthesised(family, choice.weight, choice.style) : false;

  return (
    <div className="lab">
      <header className="lab__top">
        <span className="lab__title">Font lab</span>
        <span className="lab__note">
          Everything below is the real component at its real size. Choices apply as you make them and
          are remembered on this browser.
        </span>
        <a className="table__link" href="?">
          Back to the game
        </a>
      </header>

      <div className="lab__targets">
        {TARGETS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`lab__target ${target === t.id ? "lab__target--on" : ""}`}
            onClick={() => setTarget(t.id)}
          >
            <strong>{t.title}</strong>
            <span>
              {prefs[t.id].family ? (familyBySlug(prefs[t.id].family)?.name ?? "?") : "System default"}
              {saved[t.id].family !== prefs[t.id].family ||
              saved[t.id].weight !== prefs[t.id].weight ||
              saved[t.id].style !== prefs[t.id].style ||
              saved[t.id].letterSpacing !== prefs[t.id].letterSpacing
                ? " (unsaved)"
                : ""}
            </span>
          </button>
        ))}
      </div>

      <p className="lab__blurb">{TARGETS.find((t) => t.id === target)!.blurb}</p>

      <div className="lab__body">
        <div className="lab__families">
          <button
            type="button"
            className={`lab__family ${choice.family === undefined ? "lab__family--on" : ""}`}
            onClick={() => chooseFamily(undefined)}
          >
            <strong>System default</strong>
            <span className="lab__family-note">What the table uses today. The safe answer.</span>
          </button>
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.slug}
              type="button"
              className={`lab__family ${choice.family === f.slug ? "lab__family--on" : ""}`}
              onClick={() => chooseFamily(f)}
            >
              {/* The family's own name, set in the family, which is the fastest
                  way to skim ten of them. */}
              <strong style={{ fontFamily: `"${f.slug}"` }}>{f.name}</strong>
              <span className="lab__family-note">{f.note}</span>
              <span className="lab__family-faces">
                {realWeights(f).join(" / ")}
                {hasRealItalic(f) ? " + italic" : ""}
              </span>
            </button>
          ))}
        </div>

        <div className="lab__controls">
          <label className="lab__control">
            <span>
              Weight <strong>{choice.weight}</strong>
            </span>
            <input
              type="range"
              min={100}
              max={900}
              step={100}
              value={choice.weight}
              onChange={(e) => update({ weight: Number(e.target.value) })}
            />
            {family && (
              <span className="lab__hint">
                Real weights: {realWeights(family).join(", ")}.{" "}
                <button type="button" className="lab__snap" onClick={() => update({ weight: nearestWeight(family, choice.weight) })}>
                  Snap to nearest
                </button>
              </span>
            )}
          </label>

          <label className="lab__control lab__control--row">
            <input
              type="checkbox"
              checked={choice.style === "italic"}
              onChange={(e) => update({ style: e.target.checked ? "italic" : "normal" })}
            />
            <span>
              Italic
              {family && !hasRealItalic(family) && (
                <em className="lab__warn"> - this family has none, so the browser will shear it</em>
              )}
            </span>
          </label>

          <label className="lab__control">
            <span>
              Letter spacing <strong>{choice.letterSpacing.toFixed(3)}em</strong>
            </span>
            <input
              type="range"
              min={-0.05}
              max={0.3}
              step={0.005}
              value={choice.letterSpacing}
              onChange={(e) => update({ letterSpacing: Number(e.target.value) })}
            />
          </label>

          {faked && (
            <p className="lab__warn lab__warn--block">
              This combination is not in the family. The browser is faking it - smearing the outlines
              for weight, shearing them for italic. It will look worse at 14px than it does here.
            </p>
          )}

          <div className="lab__actions">
            <button type="button" className="lab__keep" disabled={!dirty} onClick={keep}>
              {dirty ? "Use this" : "Saved"}
            </button>
            <button type="button" className="lab__reset" onClick={reset}>
              Reset to default
            </button>
          </div>
        </div>

        <div className="lab__previews">
          <div className="lab__preview lab__preview--felt">
            <span className="lab__preview-label">In the rail, at size</span>
            {/* The real classes, so this is not a mock-up of the buttons - it is
                the buttons. */}
            <div className="lab__rail">
              <div className="action-bar">
                <button type="button" className="action-bar__go">
                  Pass
                </button>
                <button type="button" className="action-bar__go action-bar__go--end-turn">
                  End Turn
                </button>
                <button type="button" className="action-bar__go">
                  Confirm attackers
                </button>
                <button type="button" className="action-bar__go">
                  Confirm blocks
                </button>
              </div>
              <button type="button" className="concede">
                Concede
              </button>
            </div>
          </div>

          <div className="lab__preview lab__preview--table">
            <span className="lab__preview-label">
              Across the table. Held still - in a game this is on screen for about a second.
            </span>
            {/* Exactly TableBeat's markup, so this is the banner rather than a
                drawing of it. `lab__beat-held` only takes the animation off and
                un-fixes the position - everything visible is the shipped rule. */}
            {[
              { from: "near", text: "Combat", detail: "" },
              { from: "near", text: "Your turn", detail: "Turn 7" },
              { from: "far", text: "Salty Mike", detail: "Turn 8" },
            ].map((b) => (
              <div className="lab__beat-stage" key={b.text}>
                <div className={`beat beat--${b.from} lab__beat-held`}>
                  <span className="beat__text">{b.text}</span>
                  {b.detail && <span className="beat__detail">{b.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What the choice actually is, in the terms the stylesheet uses. Here
          because "it looks different but I cannot tell you how" is not a thing
          you can act on a week later. */}
      <pre className="lab__css">
        {Object.entries(cssVariablesFor(target, choice))
          .map(([name, value]) => `${name}: ${value};`)
          .join("\n")}
      </pre>
    </div>
  );
}

/** The style object the previews need so they inherit the live choice. */
export function previewStyle(target: Target, choice: FontChoice): CSSProperties {
  return cssVariablesFor(target, choice) as CSSProperties;
}
