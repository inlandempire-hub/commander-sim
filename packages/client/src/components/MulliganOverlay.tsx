import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CardDefinition, CardInstance } from "@mtg-commander-sim/engine";
import { CardFace } from "./CardFace.js";

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
                : keeping <= 0
                  ? // A mulligan to nothing. Saying "put 7 cards on the bottom"
                    // here promised a choosing step that no longer happens, and
                    // described the outcome in the least useful possible way.
                    "Mulligan 7 - there is nothing left to keep. All seven go back and you start the game with an empty hand."
                  : `Mulligan ${mulligansTaken}. Keep these and put ${owed} card${
                      owed === 1 ? "" : "s"
                    } on the bottom, so you start with ${keeping}.`}
            </span>
          )}
        </div>

        {/* Real printed faces, not the board's cropped-art frame. There is no
            board to read live stats against yet, and a card you can read is
            worth more here than one you have to hover to understand - which
            was doubly true while the detail panel that explained it was behind
            this overlay. */}
        <div className="mulligan__cards" data-flight-ignore="">
          {hand.map((instance) => {
            const marked = chosen.includes(instance.instanceId);
            return (
              <div
                key={instance.instanceId}
                className={`mulligan__slot ${marked ? "mulligan__slot--chosen" : ""}`}
              >
                <CardFace
                  instance={instance}
                  definition={cardDefinitions[instance.definitionId]!}
                  onClick={bottoming ? () => toggle(instance.instanceId) : undefined}
                  marked={marked}
                />
                {marked && <span className="mulligan__marker">To bottom</span>}
              </div>
            );
          })}
        </div>

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
                {/* Not "Mulligan to -1", which is what counting down blindly
                    produced at the bottom of the ladder. The button is disabled
                    there, so it should say why rather than name a hand size
                    that cannot exist. */}
                {canMulligan ? `Mulligan to ${keeping - 1}` : "No mulligans left"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
