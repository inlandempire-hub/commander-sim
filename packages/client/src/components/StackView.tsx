import { useEffect, useRef, useState } from "react";
import type { CardDefinition, CardInstance, GameState } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";
import { CardFace } from "./CardFace.js";

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
   * The last card played, held here for good.
   *
   * Most spells in this game resolve the instant nobody responds, so the stack
   * showed a card for a single frame and was empty again - a flicker that told
   * you something had happened without any chance to see what. Rather than
   * holding it for a second and then going blank, the panel simply keeps the
   * last card until a new one replaces it: the space is reserved either way,
   * and an empty box helps nobody.
   *
   * Shown dimmed and labelled rather than as if it were still waiting, because
   * it is a record of what happened, not a spell you could still respond to.
   */
  const [lastPlayed, setLastPlayed] = useState<CardInstance | null>(null);
  const previousTop = useRef<CardInstance | null>(null);

  const topCard = state.stack.length
    ? (state.stackCards.find(
        (c) => c.instanceId === state.stack[state.stack.length - 1]!.sourceInstanceId,
      ) ?? null)
    : null;

  useEffect(() => {
    // Remember whatever was on top as it leaves, so an empty stack still has
    // something to show.
    if (topCard) setLastPlayed(topCard);
    previousTop.current = topCard;
  }, [topCard]);

  const showingLastPlayed = state.stack.length === 0 && lastPlayed !== null;

  return (
    <div className={`stack ${selectingSpellTarget ? "zone--targeting" : ""}`}>
      <div className="zone__label">
        {state.stack.length > 0 ? `Stack (${state.stack.length})` : "Last played"}
      </div>
      {state.stack.length === 0 && !showingLastPlayed && (
        <p className="stack__empty">Nothing played yet</p>
      )}

      {/* Deliberately outside the flight system's view: the card this shows is
          already somewhere else, and letting two elements claim one instance
          would have card movement measuring the wrong one. */}
      {/* The printed face, matching the hover panel above it. This one can
          afford it where the live stack below cannot: it is already outside
          the flight system, so it has no measured position to lose. */}
      {showingLastPlayed && (
        <div className="stack__cards stack__cards--resolved" data-flight-ignore="">
          <CardFace
            instance={lastPlayed!}
            definition={cardDefinitions[lastPlayed!.definitionId]!}
          />
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
