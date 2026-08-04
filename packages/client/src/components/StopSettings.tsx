import {
  STOP_KEYS,
  STOP_LABELS,
  type StopPreferences,
  type StopSetting,
} from "../stops.js";

/**
 * Where the game should stop and ask you.
 *
 * Presented as one row per step rather than as a list of checkboxes, because
 * there are genuinely three answers and not two: leave it to the game, always
 * ask me, never ask me. A checkbox would have to collapse two of those.
 *
 * Declare attackers and declare blockers are shown, and settable, but the
 * engine will still stop you there whenever you actually have a creature that
 * could attack or block - see mustNotAutoPass. That is said out loud in the
 * panel rather than left for you to discover, since a setting that silently
 * does nothing is worse than one that isn't offered.
 */

const CHOICES: { value: StopSetting; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Stop only when you have something you could do" },
  { value: "always", label: "Always", hint: "Stop here every time" },
  { value: "never", label: "Never", hint: "Skip here even when you could act" },
];

/** The steps where the rules can override 'never', so the panel can say so. */
const RULES_MAY_OVERRIDE = new Set(["declare-attackers", "declare-blockers"]);

export interface StopSettingsProps {
  stops: StopPreferences;
  onChange: (stops: StopPreferences) => void;
  fullControl: boolean;
  onFullControlChange: (on: boolean) => void;
  onClose: () => void;
  onReset: () => void;
}

export function StopSettings({
  stops,
  onChange,
  fullControl,
  onFullControlChange,
  onClose,
  onReset,
}: StopSettingsProps) {
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="overlay__panel overlay__panel--stops" onClick={(e) => e.stopPropagation()}>
        <h2 className="stops__title">When should the game stop and ask you?</h2>
        <p className="stops__intro">
          By default the game passes for you whenever you have nothing you could legally do. These
          settings let you ask for more stops, or fewer.
        </p>

        <label className="stops__full-control">
          <input
            type="checkbox"
            checked={fullControl}
            onChange={(e) => onFullControlChange(e.target.checked)}
          />
          <span>
            <strong>Full control</strong> - stop at every step, ignoring everything below. For
            watching a turn play out, or holding priority through a whole combat.
          </span>
        </label>

        <div className="stops__grid">
          {STOP_KEYS.map((key) => (
            <div className="stops__row" key={key}>
              <span className="stops__label">
                {STOP_LABELS[key]}
                {RULES_MAY_OVERRIDE.has(key) && (
                  <span className="stops__note">
                    the game still stops you here when you have a creature that could
                  </span>
                )}
              </span>
              <span className="stops__choices">
                {CHOICES.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    title={choice.hint}
                    className={`stops__choice ${stops[key] === choice.value ? "stops__choice--on" : ""}`}
                    onClick={() => onChange({ ...stops, [key]: choice.value })}
                  >
                    {choice.label}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="stops__actions">
          <button type="button" className="stops__reset" onClick={onReset}>
            Reset to defaults
          </button>
          <button type="button" className="stops__done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
