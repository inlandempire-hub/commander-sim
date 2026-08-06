import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { CardInstance, GameState } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";
import { allInstances } from "../cardLookup.js";
import { NotFlyingProvider } from "../flightContext.js";
import type { Flight } from "../flight.js";
import { EASINGS } from "../motion.js";
import { spellColor, withAlpha } from "../particles.js";
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
  for (const instance of allInstances(state)) byId.set(instance.instanceId, instance);
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
              /*
               * Where a card came from and where it is going carry meaning, so
               * the journey is coloured by it: a spell leaving the stack has
               * resolved and glows on the way out, and a card on its way to a
               * graveyard is dying and dims as it goes. The alternative is
               * every movement looking identical, which makes a creature dying
               * and a land being played read the same.
               */
              className={[
                "flight",
                flight.from.zone === "stack" ? "flight--resolving" : "",
                flight.to.zone === "graveyard" ? "flight--dying" : "",
                flight.to.zone === "exile" ? "flight--exiled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              /*
               * The glow a resolving spell flares in is its own colour, so a
               * Lightning Bolt and a Counterspell resolving do not look like
               * the same event happening twice. Softened to 80% rather than
               * passed as the flat colour: a solid drop-shadow at full alpha
               * around a card reads as a border, not as light coming off it.
               */
              style={
                {
                  width: flight.to.width,
                  height: flight.to.height,
                  "--spell-glow": withAlpha(spellColor(definition.manaCost), 0.8),
                } as CSSProperties
              }
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
                // The same curve the rest of the table settles on - see
                // motion.ts. A card crossing the table is the clearest case of
                // a thing arriving somewhere, so it decelerates into its zone
                // rather than gliding in at a constant speed.
                ease: [...EASINGS.settle],
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
