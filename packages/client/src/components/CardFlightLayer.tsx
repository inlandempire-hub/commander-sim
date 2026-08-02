import { motion } from "framer-motion";
import type { CardInstance, GameState } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";
import { NotFlyingProvider } from "../flightContext.js";
import type { Flight } from "../flight.js";
import { FLIGHT_MS } from "../useCardFlight.js";

/**
 * Draws the cards currently travelling between zones, in a fixed layer over
 * the whole table.
 *
 * It has to be an overlay rather than an animation on the card itself: the
 * rows are scroll containers, so a card animating out of one would be clipped
 * at its edge the moment it left. Up here there is nothing to clip against,
 * and a card can cross from one player's hand to the other side of the table.
 *
 * Framer Motion is doing the interpolation, which is safe here in a way it is
 * not for a card's own appearance: this element is temporary and nothing about
 * the game state depends on it finishing (see useCardFlight for how the real
 * card comes back).
 */

export interface CardFlightLayerProps {
  state: GameState;
  flights: Flight[];
}

/** Every card the state knows about, wherever it currently is. */
function indexInstances(state: GameState): Map<string, CardInstance> {
  const byId = new Map<string, CardInstance>();
  for (const player of state.players) {
    for (const zone of [
      player.hand,
      player.battlefield,
      player.graveyard,
      player.exile,
      player.command,
      player.library,
    ]) {
      for (const instance of zone) byId.set(instance.instanceId, instance);
    }
  }
  for (const instance of state.stackCards) byId.set(instance.instanceId, instance);
  return byId;
}

export function CardFlightLayer({ state, flights }: CardFlightLayerProps) {
  if (flights.length === 0) return null;
  const byId = indexInstances(state);

  return (
    <div className="flight-layer" aria-hidden="true">
      <NotFlyingProvider>
        {flights.map((flight) => {
          const instance = byId.get(flight.instanceId);
          const definition = instance ? state.cardDefinitions[instance.definitionId] : undefined;
          if (!instance || !definition) return null;
          return (
            <motion.div
              key={flight.key}
              className="flight"
              style={{ width: flight.to.width, height: flight.to.height }}
              // Position and size are both animated as a transform: the card
              // grows from whatever size its old zone drew it at into the size
              // its new one will. Every card is 5:7, so one scale covers both.
              initial={{
                x: flight.from.left,
                y: flight.from.top,
                scale: flight.from.width / flight.to.width,
              }}
              animate={{ x: flight.to.left, y: flight.to.top, scale: 1 }}
              transition={{
                duration: FLIGHT_MS / 1000,
                delay: flight.delay / 1000,
                ease: [0.22, 0.61, 0.36, 1],
              }}
            >
              <CardView instance={instance} definition={definition} />
            </motion.div>
          );
        })}
      </NotFlyingProvider>
    </div>
  );
}
