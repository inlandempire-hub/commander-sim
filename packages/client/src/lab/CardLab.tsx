import { useState } from "react";
import {
  LAB_OPPONENT,
  LAB_SCENARIOS,
  LAB_YOU,
  TEST_CARD_DEFINITIONS,
  labScenarioFor,
  type LabScenario,
} from "@mtg-commander-sim/engine";
import { App } from "../App.js";
import { useLocalGameController } from "../useLocalGameController.js";
import { browserStore } from "../deckbuilder/deckStorage.js";
import {
  loadProgress,
  reportFaults,
  resultFor,
  saveProgress,
  setNote,
  setVerdict,
  tally,
  toggleCheck,
  type LabProgress,
  type LabVerdict,
} from "./labProgress.js";

/**
 * The card lab: play every card in the deck, one at a time, on a board built for
 * it.
 *
 * Two screens. The index lists all 93 cards with whatever verdict you have given
 * them; opening one hands you the real client with a board stood up around that
 * card, and a panel down the side saying what to try.
 *
 * Deliberately not a bot game. Salty Mike is yours to drive as well, because
 * half the deck's text can only be tested from the other side of the table -
 * "whenever an opponent casts", "each opponent may sacrifice", and every trigger
 * that wants somebody to be attacking you.
 */

function nameOf(cardId: string): string {
  return TEST_CARD_DEFINITIONS[cardId]?.name ?? cardId;
}

const VERDICT_LABEL: Record<LabVerdict, string> = {
  works: "Works",
  partly: "Partly",
  broken: "Broken",
};

function useProgress(): [LabProgress, (next: LabProgress) => void] {
  const [progress, setProgress] = useState<LabProgress>(() => loadProgress(browserStore()));
  return [
    progress,
    (next) => {
      setProgress(next);
      saveProgress(browserStore(), next);
    },
  ];
}

function labHref(cardId: string): string {
  return `?mode=lab&card=${encodeURIComponent(cardId)}`;
}

/* --- the index ------------------------------------------------------------ */

function LabIndex() {
  const [progress, save] = useProgress();
  const counts = tally(
    progress,
    LAB_SCENARIOS.map((s) => s.cardId),
  );
  const [report, setReport] = useState<string | null>(null);

  return (
    <div className="lab-index">
      <h1 className="lab-index__title">Card lab</h1>
      <p className="lab-index__blurb">
        Every card in Blech, Loafing Pest, one at a time, on a board built so its whole text can be put to
        work. You drive both seats - that is the only way to test the half of this deck that needs an opponent
        to be doing something. Open a card, work down its list, and mark it.
      </p>
      <p className="lab-index__tally">
        <span className="lab-chip lab-chip--works">{counts.works} work</span>
        <span className="lab-chip lab-chip--partly">{counts.partly} partly</span>
        <span className="lab-chip lab-chip--broken">{counts.broken} broken</span>
        <span className="lab-chip">{counts.untouched} not yet tried</span>
      </p>
      <p className="lab-index__actions">
        <a className="btn" href={labHref(LAB_SCENARIOS[0]!.cardId)}>
          Start at the top
        </a>
        <button
          type="button"
          className="btn"
          onClick={() =>
            setReport(
              reportFaults(
                progress,
                LAB_SCENARIOS.map((s) => ({ cardId: s.cardId, name: nameOf(s.cardId) })),
              ),
            )
          }
        >
          Show everything broken
        </button>
        <a className="btn" href="?">
          Back to the game
        </a>
      </p>
      {report !== null && <textarea className="lab-report" readOnly value={report} rows={12} />}
      <ol className="lab-list">
        {LAB_SCENARIOS.map((scenario, index) => {
          const result = resultFor(progress, scenario.cardId);
          return (
            <li key={scenario.cardId} className="lab-list__row">
              <span className="lab-list__num">{index + 1}</span>
              <a className="lab-list__name" href={labHref(scenario.cardId)}>
                {nameOf(scenario.cardId)}
              </a>
              <span className="lab-list__ticks">
                {result.ticked.length}/{scenario.checks.length}
              </span>
              {result.verdict ? (
                <span className={`lab-chip lab-chip--${result.verdict}`}>{VERDICT_LABEL[result.verdict]}</span>
              ) : (
                <span className="lab-chip">-</span>
              )}
              <button
                type="button"
                className="lab-list__clear"
                title="Forget what I recorded for this card"
                onClick={() => save(setVerdict(progress, scenario.cardId, undefined))}
              >
                clear
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* --- the panel beside the board ------------------------------------------- */

function LabPanel({
  scenario,
  index,
  onReset,
}: {
  scenario: LabScenario;
  index: number;
  onReset: () => void;
}) {
  const [progress, save] = useProgress();
  const [collapsed, setCollapsed] = useState(false);
  const result = resultFor(progress, scenario.cardId);
  const previous = LAB_SCENARIOS[index - 1];
  const next = LAB_SCENARIOS[index + 1];

  if (collapsed) {
    return (
      <aside className="lab-panel lab-panel--collapsed">
        <button type="button" className="lab-panel__toggle" onClick={() => setCollapsed(false)}>
          Show the checklist
        </button>
      </aside>
    );
  }

  return (
    <aside className="lab-panel">
      <header className="lab-panel__head">
        <span className="lab-panel__count">
          {index + 1} of {LAB_SCENARIOS.length}
        </span>
        <h2 className="lab-panel__name">{nameOf(scenario.cardId)}</h2>
        <nav className="lab-panel__nav">
          {previous ? (
            <a className="btn btn--small" href={labHref(previous.cardId)}>
              Previous
            </a>
          ) : (
            <span className="btn btn--small btn--disabled">Previous</span>
          )}
          {next ? (
            <a className="btn btn--small" href={labHref(next.cardId)}>
              Next
            </a>
          ) : (
            <span className="btn btn--small btn--disabled">Next</span>
          )}
          <a className="btn btn--small" href="?mode=lab">
            All cards
          </a>
        </nav>
      </header>

      <p className="lab-panel__setup">{scenario.setup}</p>

      <ol className="lab-checks">
        {scenario.checks.map((check, i) => (
          <li key={i} className={result.ticked.includes(i) ? "lab-checks__item is-done" : "lab-checks__item"}>
            <label>
              <input
                type="checkbox"
                checked={result.ticked.includes(i)}
                onChange={() => save(toggleCheck(progress, scenario.cardId, i))}
              />
              <span>{check}</span>
            </label>
          </li>
        ))}
      </ol>

      {scenario.gaps && scenario.gaps.length > 0 && (
        <div className="lab-gaps">
          <h3>Known not modelled</h3>
          <ul>
            {scenario.gaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="lab-verdict">
        {(["works", "partly", "broken"] as LabVerdict[]).map((verdict) => (
          <button
            key={verdict}
            type="button"
            className={
              result.verdict === verdict ? `btn lab-verdict__btn is-${verdict}` : "btn lab-verdict__btn"
            }
            onClick={() =>
              save(setVerdict(progress, scenario.cardId, result.verdict === verdict ? undefined : verdict))
            }
          >
            {VERDICT_LABEL[verdict]}
          </button>
        ))}
      </div>
      <textarea
        className="lab-note"
        placeholder="What went wrong - this is the bug report, so say what you did and what happened."
        value={result.note ?? ""}
        rows={4}
        onChange={(event) => save(setNote(progress, scenario.cardId, event.target.value))}
      />

      <footer className="lab-panel__foot">
        <button type="button" className="btn btn--small" onClick={onReset}>
          Reset the board
        </button>
        <button type="button" className="btn btn--small" onClick={() => setCollapsed(true)}>
          Hide
        </button>
      </footer>
    </aside>
  );
}

/* --- the board ------------------------------------------------------------ */

/**
 * One scenario's board. Remounted with a new `key` to reset it - the controller
 * holds its GameState in a ref, so a fresh mount is a fresh board, and there is
 * no "undo the game" code to get wrong.
 */
function LabBoard({ scenario }: { scenario: LabScenario }) {
  const controller = useLocalGameController({ scenario, mulligan: false });
  return (
    <App
      controller={controller}
      revealAllHands
      modeNotice={`Card lab: ${nameOf(scenario.cardId)}. You drive both ${LAB_YOU} and ${LAB_OPPONENT}.`}
    />
  );
}

export function CardLab() {
  const params = new URLSearchParams(window.location.search);
  const cardId = params.get("card");
  const [resets, setResets] = useState(0);

  if (!cardId) return <LabIndex />;

  const scenario = labScenarioFor(cardId);
  const index = LAB_SCENARIOS.findIndex((s) => s.cardId === cardId);
  if (!scenario) {
    return (
      <div className="lab-index">
        <h1 className="lab-index__title">Card lab</h1>
        <p className="app__notice">There is no scenario for a card called &quot;{cardId}&quot;.</p>
        <p>
          <a className="btn" href="?mode=lab">
            All cards
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="lab-shell">
      <LabPanel scenario={scenario} index={index} onReset={() => setResets((n) => n + 1)} />
      <div className="lab-shell__board">
        <LabBoard key={`${cardId}-${resets}`} scenario={scenario} />
      </div>
    </div>
  );
}
