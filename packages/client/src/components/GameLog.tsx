import { useEffect, useRef } from "react";

/**
 * What just happened, in words.
 *
 * The board shows the current position but never the events that produced it:
 * a spell resolved, a life total moved, a creature died. Without this you cast
 * a card, something invisible happens, and you're left guessing whether it
 * worked - which is exactly how a correctly-resolving Healing Salve got
 * reported as doing nothing.
 *
 * The engine writes the lines (`GameState.log`); this only shows them, newest
 * at the bottom, scrolled to follow.
 */
export function GameLog({ lines }: { lines: string[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the tail, so the newest line is the one you're looking at.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <div className="log">
      <div className="zone__label">Game log</div>
      <div className="log__lines">
        {lines.length === 0 ? (
          <p className="log__empty">Nothing has happened yet.</p>
        ) : (
          lines.map((line, i) => (
            // Index keys are correct here: the log is append-only and lines are
            // never reordered, only trimmed from the front.
            <p key={i} className="log__line">
              {line}
            </p>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
