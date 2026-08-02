import { useEffect, useState } from "react";

/**
 * A line from the card that is doing something to whatever the cursor is
 * pointing at.
 *
 * Two moments in this game ask you to click one card and then another, and
 * until now both were mute: choosing a target for a spell, and pairing a
 * blocker with the attacker it blocks. The prompt in the action bar explains
 * the mechanic, but nothing on the board connected the two halves - having
 * clicked the first card, there was no sign anything was waiting on you.
 *
 * The arrow is the whole of the feedback: it starts at the card you picked and
 * follows the cursor, so the pending decision is attached to the thing making
 * it rather than described in a corner of the screen.
 */

/** Which card the arrow leaves from. */
export interface TargetArrowProps {
  sourceInstanceId: string;
  /** Colours it - a hostile arrow for a target, a defensive one for a block. */
  intent: "target" | "block";
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function TargetArrow({ sourceInstanceId, intent }: TargetArrowProps) {
  const [line, setLine] = useState<Line | null>(null);

  useEffect(() => {
    /*
     * Both ends are recomputed on every mouse move, including the source. It
     * would be cheaper to measure the source once, but the board moves under
     * you while you are choosing - a card hovered on the way past lifts and
     * grows, rows re-centre as things resolve - and an arrow anchored to where
     * a card used to be looks broken in a way that is hard to attribute.
     *
     * This is also deliberately not throttled through requestAnimationFrame.
     * A tab that is not compositing issues no animation frames at all, and an
     * arrow that only exists inside one would simply never appear.
     */
    const follow = (event: MouseEvent) => {
      const source = document.querySelector<HTMLElement>(
        `[data-card-instance="${CSS.escape(sourceInstanceId)}"]`,
      );
      if (!source) {
        setLine(null);
        return;
      }
      const rect = source.getBoundingClientRect();
      setLine({
        x1: rect.left + rect.width / 2,
        y1: rect.top + rect.height / 2,
        x2: event.clientX,
        y2: event.clientY,
      });
    };

    window.addEventListener("mousemove", follow);
    return () => window.removeEventListener("mousemove", follow);
  }, [sourceInstanceId]);

  // Nothing is drawn until the mouse moves, which is the honest state: we do
  // not know where the far end is yet.
  if (!line) return null;

  // Bowed rather than straight, away from the midpoint, so the arrow reads as
  // thrown across the table instead of as a rule someone drew on the screen.
  const midX = (line.x1 + line.x2) / 2;
  const midY = (line.y1 + line.y2) / 2;
  const span = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
  const bow = Math.min(span * 0.22, 130);
  const controlY = midY - bow;

  return (
    <svg className={`arrow arrow--${intent}`} aria-hidden="true">
      <path
        className="arrow__line"
        d={`M ${line.x1} ${line.y1} Q ${midX} ${controlY} ${line.x2} ${line.y2}`}
        fill="none"
      />
      <circle className="arrow__from" cx={line.x1} cy={line.y1} r={5} />
      <circle className="arrow__to" cx={line.x2} cy={line.y2} r={9} />
    </svg>
  );
}
