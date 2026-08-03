import { useEffect, useRef } from "react";
import type { LogEntry } from "@mtg-commander-sim/engine";
import { TURNS_KEPT, recentLog } from "../gameLog.js";

/**
 * What just happened, in words.
 *
 * The board shows the current position but never the events that produced it:
 * a spell resolved, a life total moved, a creature died. Without this you cast
 * a card, something invisible happens, and you're left guessing whether it
 * worked - which is exactly how a correctly-resolving Healing Salve got
 * reported as doing nothing.
 *
 * Only the last few turns are shown. A log that keeps everything is a log
 * nobody reads: by turn twenty the thing you need is one line at the bottom of
 * hundreds, and the panel had grown tall enough to squeeze everything else in
 * the sidebar. The engine still keeps its full history - this is a view of it.
 */
export function GameLog({ entries, currentTurn }: { entries: LogEntry[]; currentTurn: number }) {
  const endRef = useRef<HTMLDivElement>(null);
  const shown = recentLog(entries, currentTurn);

  // Follow the tail, so the newest line is the one you're looking at.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [shown.length]);

  return (
    <div className="log">
      <div className="zone__label">
        Game log <span className="log__scope">last {TURNS_KEPT} turns</span>
      </div>
      <div className="log__lines">
        {shown.length === 0 ? (
          <p className="log__empty">Nothing has happened yet.</p>
        ) : (
          shown.map((entry, i) => (
            // Index keys are correct here: the log is append-only and lines are
            // never reordered, only trimmed from the front.
            <p key={i} className={`log__line ${entry.fading ? "log__line--fading" : ""}`}>
              {entry.text}
            </p>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
