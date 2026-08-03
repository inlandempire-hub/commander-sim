import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CardDefinition, CardInstance } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";
import { NotFlyingProvider } from "../flightContext.js";

/**
 * Deciding an opening hand.
 *
 * Full screen and deliberately large. Every other prompt in this game sits in
 * a corner because the board is the thing you are looking at - but here there
 * is no board yet, the seven cards *are* the whole decision, and it is the one
 * moment where you genuinely have to read all of them before choosing. Two
 * people sharing a screen also have to be able to read this from a normal
 * sitting distance.
 *
 * Two stages, because the London mulligan has two (see the engine's
 * mulligan.ts): keep or shuffle back, and then - if you mulliganed - choosing
 * which cards to put on the bottom.
 */

export interface MulliganOverlayProps {
  playerId: string;
  hand: CardInstance[];
  cardDefinitions: Record<string, CardDefinition>;
  /** How many mulligans this player has taken, and so how many cards they owe. */
  mulligansTaken: number;
  /** True once they have kept and are choosing what goes back. */
  bottoming: boolean;
  /** False once mulliganing again would leave nothing to keep. */
  canMulligan: boolean;
  onKeep: () => void;
  onMulligan: () => void;
  onPutOnBottom: (instanceIds: string[]) => void;
  onHover?: (definitionId: string | null, ownerId?: string) => void;
}

export function MulliganOverlay({
  playerId,
  hand,
  cardDefinitions,
  mulligansTaken,
  bottoming,
  canMulligan,
  onKeep,
  onMulligan,
  onPutOnBottom,
  onHover,
}: MulliganOverlayProps) {
  const [chosen, setChosen] = useState<string[]>([]);

  // A fresh seven means any half-made choice from the previous hand is void.
  useEffect(() => {
    setChosen([]);
  }, [bottoming, mulligansTaken, playerId]);

  const keeping = hand.length - mulligansTaken;
  const owed = mulligansTaken;

  function toggle(instanceId: string) {
    setChosen((current) =>
      current.includes(instanceId)
        ? current.filter((id) => id !== instanceId)
        : current.length >= owed
          ? current
          : [...current, instanceId],
    );
  }

  return createPortal(
    <div className="overlay overlay--mulligan">
      <div className="mulligan">
        <div className="mulligan__head">
          <strong className="mulligan__who">{playerId}</strong>
          {bottoming ? (
            <span className="mulligan__prompt">
              Choose {owed} card{owed === 1 ? "" : "s"} to put on the bottom of your library
              {" - "}
              {chosen.length} of {owed} chosen
            </span>
          ) : (
            <span className="mulligan__prompt">
              {mulligansTaken === 0
                ? "Your opening hand. Keep it, or shuffle back for seven new cards."
                : `Mulligan ${mulligansTaken}. Keep these and put ${owed} card${
                    owed === 1 ? "" : "s"
                  } on the bottom, so you start with ${keeping}.`}
            </span>
          )}
        </div>

        {/* Not affected by the flight layer: these cards are being dealt and
            redealt, and a hand that vanished mid-decision because a copy of it
            was animating somewhere would be alarming. */}
        <NotFlyingProvider>
          <div className="mulligan__cards">
            {hand.map((instance) => {
              const order = chosen.indexOf(instance.instanceId);
              return (
                <div
                  key={instance.instanceId}
                  className={`mulligan__slot ${order >= 0 ? "mulligan__slot--chosen" : ""}`}
                >
                  <CardView
                    instance={instance}
                    definition={cardDefinitions[instance.definitionId]!}
                    onHover={onHover}
                    onClick={bottoming ? () => toggle(instance.instanceId) : undefined}
                    disabled={!bottoming}
                  />
                  {order >= 0 && <span className="mulligan__marker">To bottom</span>}
                </div>
              );
            })}
          </div>
        </NotFlyingProvider>

        <div className="mulligan__actions">
          {bottoming ? (
            <button
              type="button"
              className="mulligan__keep"
              disabled={chosen.length !== owed}
              onClick={() => onPutOnBottom(chosen)}
            >
              Put {owed} on the bottom and start
            </button>
          ) : (
            <>
              <button type="button" className="mulligan__keep" onClick={onKeep}>
                Keep {keeping}
              </button>
              <button
                type="button"
                className="mulligan__mull"
                onClick={onMulligan}
                disabled={!canMulligan}
                title={
                  canMulligan
                    ? "Shuffle this hand back and draw seven new cards"
                    : "You cannot mulligan again - there would be nothing left to keep"
                }
              >
                Mulligan to {keeping - 1}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
