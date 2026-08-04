import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CardDefinition, CardInstance } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";

/**
 * A face-up pile - graveyard or exile - shown the way it sits on a real table:
 * the most recent card on top, with a count, rather than every card spread out
 * in a scrolling strip.
 *
 * Clicking the pile opens the whole thing as a grid of card images. A scroll
 * bar in a 40px-tall rail was never actually readable, and a graveyard with
 * thirty cards in it is exactly when you most need to look through it
 * properly.
 *
 * While a spell is waiting to be pointed at a card in here (a recursion
 * spell), the overlay opens by itself - the pile can't be the thing standing
 * between you and the only legal target.
 */

export interface ZonePileProps {
  label: string;
  cards: CardInstance[];
  cardDefinitions: Record<string, CardDefinition>;
  /** Set while a spell is choosing a target from this zone. */
  selecting?: boolean;
  /** Only provided when a card in here can legally be chosen right now. */
  onCardClick?: (instanceId: string) => void;
  onHover?: (definitionId: string | null, ownerId?: string, instanceId?: string) => void;
  /** Whose pile this is, so the overlay can say so. */
  ownerLabel: string;
}

export function ZonePile({
  label,
  cards,
  cardDefinitions,
  selecting,
  onCardClick,
  onHover,
  ownerLabel,
}: ZonePileProps) {
  const [open, setOpen] = useState(false);

  // Opening on its own when a spell needs a target here, and closing again the
  // moment that choice is over, so it never lingers over the board.
  useEffect(() => {
    if (selecting) setOpen(true);
  }, [selecting]);
  useEffect(() => {
    if (!selecting && !cards.length) setOpen(false);
  }, [selecting, cards.length]);

  const top = cards[cards.length - 1];

  return (
    <div className={`pile ${selecting ? "zone--targeting" : ""}`}>
      <div className="zone__label">
        {label} ({cards.length})
      </div>
      {top ? (
        <button
          type="button"
          className="pile__top"
          onClick={() => setOpen(true)}
          title={`${cards.length} card${cards.length === 1 ? "" : "s"} - click to look through`}
        >
          {/* The card is hidden while the overlay is up: the same instance can't
              be rendered twice at once, since Framer Motion tracks it by id. */}
          {!open && (
            <CardView
              instance={top}
              definition={cardDefinitions[top.definitionId]!}
              onHover={onHover}
              small
            />
          )}
          {cards.length > 1 && <span className="pile__count">{cards.length}</span>}
        </button>
      ) : (
        <div className="pile__empty">empty</div>
      )}

      {open &&
        createPortal(
          <div className="overlay" onClick={() => !selecting && setOpen(false)}>
            <div className="overlay__panel" onClick={(e) => e.stopPropagation()}>
              <div className="overlay__head">
                <strong>
                  {ownerLabel}'s {label.toLowerCase()}
                </strong>
                <span className="overlay__count">
                  {cards.length} card{cards.length === 1 ? "" : "s"}
                  {selecting ? " - click one to choose it" : ""}
                </span>
                {!selecting && (
                  <button type="button" className="overlay__close" onClick={() => setOpen(false)}>
                    Close
                  </button>
                )}
              </div>
              <div className="overlay__grid">
                {/* Most recent first - the order you'd flip through them. */}
                {[...cards].reverse().map((instance) => (
                  <CardView
                    key={instance.instanceId}
                    instance={instance}
                    definition={cardDefinitions[instance.definitionId]!}
                    selected={selecting}
                    onHover={onHover}
                    onClick={
                      onCardClick
                        ? () => {
                            onCardClick(instance.instanceId);
                            setOpen(false);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
