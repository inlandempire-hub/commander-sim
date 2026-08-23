import type { GameState } from "@mtg-commander-sim/engine";

/**
 * The turn's phases as a strip across the middle of the table, between the two
 * players' boards, with the one you are in lit up.
 *
 * A game of Magic is a fixed march - untap, upkeep, draw, first main, combat,
 * second main, end - and which step you are in decides what you can do. The old
 * "beginning / upkeep" line in the header said the same thing, but tucked in a
 * corner; here it sits on the line that divides the table, where the turn is
 * actually happening.
 */

const PHASES: Array<{ key: string; label: string }> = [
  { key: "untap", label: "Untap" },
  { key: "upkeep", label: "Upkeep" },
  { key: "draw", label: "Draw" },
  { key: "main1", label: "Main 1" },
  { key: "combat", label: "Combat" },
  { key: "main2", label: "Main 2" },
  { key: "end", label: "End" },
];

/** Which strip segment the engine's phase+step lands on. */
function activeKey(phase: GameState["phase"], step: GameState["step"]): string {
  switch (phase) {
    case "beginning":
      // untap / upkeep / draw are the step names themselves.
      return step;
    case "precombat-main":
      return "main1";
    case "combat":
      return "combat";
    case "postcombat-main":
      return "main2";
    case "ending":
      return "end";
  }
}

/** A readable name for the exact combat step, shown under "Combat" when in it. */
const COMBAT_STEP_LABEL: Record<string, string> = {
  "begin-combat": "Beginning of combat",
  "declare-attackers": "Declare attackers",
  "declare-blockers": "Declare blockers",
  "first-strike-damage": "First-strike damage",
  "combat-damage": "Combat damage",
  "end-combat": "End of combat",
};

export function PhaseBar({
  state,
  activePlayerId,
}: {
  state: GameState;
  activePlayerId: string;
}) {
  const active = activeKey(state.phase, state.step);
  const combatDetail = state.phase === "combat" ? COMBAT_STEP_LABEL[state.step] : undefined;
  return (
    <div className="phasebar" role="status" aria-label={`Turn ${state.turnNumber}, ${state.phase} ${state.step}`}>
      <span className="phasebar__turn">
        <span className="phasebar__turn-num">Turn {state.turnNumber}</span>
        <span className="phasebar__turn-who">{activePlayerId}</span>
      </span>
      <ol className="phasebar__steps">
        {PHASES.map((p) => (
          <li
            key={p.key}
            className={`phasebar__step ${p.key === active ? "phasebar__step--active" : ""}`}
            title={p.key === active && combatDetail ? combatDetail : p.label}
          >
            {p.label}
            {p.key === active && combatDetail && <span className="phasebar__substep">{combatDetail}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
