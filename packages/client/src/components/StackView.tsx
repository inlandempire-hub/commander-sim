import { useEffect, useRef, useState } from "react";
import type { CardDefinition, CardInstance, GameState } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";

/** How long a spell stays on show after it has finished resolving. */
const LINGER_MS = 1300;

export interface StackViewProps {
  state: GameState;
  cardDefinitions: Record<string, CardDefinition>;
  /**
   * Set while a counterspell is waiting for a target. Only spells are
   * clickable - an ability on the stack has no card and can't be countered,
   * so it stays inert rather than being offered and then rejected.
   */
  selectingSpellTarget?: boolean;
  onStackObjectClick?: (stackObjectId: string) => void;
  /** Reports the card under the cursor so the detail panel can show its full text. */
  onHover?: (definitionId: string | null, ownerId?: string) => void;
}

export function StackView({
  state,
  cardDefinitions,
  selectingSpellTarget,
  onStackObjectClick,
  onHover,
}: StackViewProps) {
  /*
   * What just finished resolving, kept on screen for a moment afterwards.
   *
   * Most spells in this game resolve the instant nobody responds, so the stack
   * would show a card for a single frame and then be empty again - a flicker
   * that tells you something happened without giving you any chance to see
   * what. Holding the last card for a beat turns that into something you can
   * actually read, and is the only way to catch what a bot did on its turn.
   *
   * Shown dimmed and labelled rather than as if it were still waiting, because
   * it is a record of what happened, not a spell you could still respond to.
   */
  const [lingering, setLingering] = useState<CardInstance | null>(null);
  const previousTop = useRef<CardInstance | null>(null);

  const topCard = state.stack.length
    ? (state.stackCards.find(
        (c) => c.instanceId === state.stack[state.stack.length - 1]!.sourceInstanceId,
      ) ?? null)
    : null;

  useEffect(() => {
    const justEmptied = previousTop.current !== null && topCard === null;
    const leaving = previousTop.current;
    previousTop.current = topCard;
    if (!justEmptied || !leaving) return;

    setLingering(leaving);
    const timer = window.setTimeout(() => setLingering(null), LINGER_MS);
    return () => window.clearTimeout(timer);
  }, [topCard]);

  const showingLinger = state.stack.length === 0 && lingering !== null;

  return (
    <div className={`stack ${selectingSpellTarget ? "zone--targeting" : ""}`}>
      <div className="zone__label">Stack ({state.stack.length})</div>
      {state.stack.length === 0 && !showingLinger && (
        <p className="stack__empty">Nothing waiting to resolve</p>
      )}

      {/* Deliberately outside the flight system's view: the card this shows is
          already somewhere else, and letting two elements claim one instance
          would have card movement measuring the wrong one. */}
      {showingLinger && (
        <div className="stack__cards stack__cards--resolved" data-flight-ignore="">
          <CardView
            instance={lingering!}
            definition={cardDefinitions[lingering!.definitionId]!}
            onHover={onHover}
          />
          <span className="stack__resolved-tag">Resolved</span>
        </div>
      )}

      {/* Cards here overlap into a pile rather than sitting in a neat row, so
          the stack looks like the thing it is named after - and so "two spells
          are waiting" reads at a glance instead of needing the count. Topmost,
          which resolves first, is rendered first and sits on top. */}
      {state.stack.length > 0 && (
        <div className="stack__cards">
          {[...state.stack].reverse().map((obj) => {
            const instance = state.stackCards.find((c) => c.instanceId === obj.sourceInstanceId);
            if (!instance) {
              // A triggered/activated ability with no card of its own on the stack.
              return (
                <div key={obj.id} className="card card--ability">
                  <div className="card__name">Ability ({obj.effect.kind})</div>
                </div>
              );
            }
            return (
              <CardView
                key={obj.id}
                instance={instance}
                definition={cardDefinitions[instance.definitionId]!}
                selected={selectingSpellTarget}
                onHover={onHover}
                onClick={selectingSpellTarget ? () => onStackObjectClick?.(obj.id) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
