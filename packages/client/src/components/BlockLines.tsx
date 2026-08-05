import { useEffect, useState } from "react";

/**
 * The blocks that have been declared, drawn and left there.
 *
 * TargetArrow covers the moment of *choosing* - one end on the card you picked,
 * the other on the cursor. This is the other half: once blockers are declared,
 * the pairing is a fact about the game and stays on screen until combat damage
 * has been dealt.
 *
 * It was missing, and the gap was a real one. Declaring blockers deliberately
 * does not pass priority, so the game stops in an instant window straight
 * afterwards - and that window looked exactly like the one before it, with
 * nothing anywhere on the board saying a block had been set up. The only way to
 * check was to read the badge on each creature one at a time.
 *
 * Both ends are re-measured on a timer rather than in a `requestAnimationFrame`
 * loop. A tab that is not compositing issues no animation frames at all, so an
 * overlay that only updates inside one would freeze its lines in place while
 * the cards underneath moved - see the same note in TargetArrow.
 */

const REMEASURE_MS = 100;

export interface BlockLinesProps {
  /** blocker instance id -> the attacker it is blocking. */
  assignments: Record<string, string>;
}

interface Line {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function centreOf(instanceId: string): { x: number; y: number } | null {
  const element = document.querySelector<HTMLElement>(
    `[data-card-instance="${CSS.escape(instanceId)}"]`,
  );
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  // A card that has scrolled out of the layout entirely measures as a zero box;
  // drawing to the top-left corner of the screen is worse than drawing nothing.
  if (rect.width === 0 && rect.height === 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function BlockLines({ assignments }: BlockLinesProps) {
  const [lines, setLines] = useState<Line[]>([]);
  // Serialised so the effect re-runs when the pairs change, not on every render
  // (the object identity changes constantly - the engine mutates in place).
  const key = JSON.stringify(assignments);

  useEffect(() => {
    const measure = () => {
      const next: Line[] = [];
      for (const [blockerId, attackerId] of Object.entries(assignments)) {
        const from = centreOf(blockerId);
        const to = centreOf(attackerId);
        if (!from || !to) continue;
        next.push({ key: `${blockerId}->${attackerId}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y });
      }
      setLines(next);
    };

    measure();
    const timer = window.setInterval(measure, REMEASURE_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (lines.length === 0) return null;

  return (
    <svg className="arrow arrow--block arrow--held" aria-hidden="true">
      {lines.map((line) => {
        // Bowed the same way TargetArrow bows, so a held line and a line being
        // drawn read as the same object rather than two different ideas.
        const midX = (line.x1 + line.x2) / 2;
        const midY = (line.y1 + line.y2) / 2;
        const span = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
        const controlY = midY - Math.min(span * 0.22, 130);
        return (
          <g key={line.key}>
            <path
              className="arrow__line"
              d={`M ${line.x1} ${line.y1} Q ${midX} ${controlY} ${line.x2} ${line.y2}`}
              fill="none"
            />
            <circle className="arrow__from" cx={line.x1} cy={line.y1} r={4} />
            <circle className="arrow__to" cx={line.x2} cy={line.y2} r={7} />
          </g>
        );
      })}
    </svg>
  );
}
