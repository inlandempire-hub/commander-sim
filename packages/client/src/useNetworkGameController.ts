import { useEffect, useRef, useState } from "react";
import type { GameState } from "@mtg-commander-sim/engine";
import type { ClientMessage, ServerMessage } from "@mtg-commander-sim/protocol";
import type { GameController } from "./gameController.js";

/**
 * Networked mode: the server holds the one real GameState. Actions are sent
 * as messages over the WebSocket; `state` only updates when the server
 * broadcasts back a filtered view (so it's null until the first broadcast -
 * e.g. while waiting for the other player to connect).
 */
export function useNetworkGameController(serverUrl: string, myPlayerId: string): GameController {
  const [state, setState] = useState<GameState | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      switch (message.type) {
        case "state":
          setState(message.state);
          setLastError(null);
          return;
        case "error":
          setLastError(message.message);
          return;
        case "joined":
        case "waitingForOpponent":
          return;
      }
    };
    ws.onerror = () => setLastError("Connection error - is the server running?");
    ws.onclose = () => setLastError((prev) => prev ?? "Disconnected from server");

    return () => ws.close();
  }, [serverUrl]);

  function send(message: ClientMessage) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) {
      setLastError("Not connected to the server yet");
      return;
    }
    ws.send(JSON.stringify(message));
  }

  return {
    state,
    lastError,
    clearError: () => setLastError(null),
    // The server always acts as whichever seat this connection was assigned
    // at join time, so the playerId argument here is accepted (to match
    // useLocalGameController's signature) but intentionally unused.
    playLand: (_playerId, instanceId) => send({ type: "playLand", instanceId }),
    castSpell: (_playerId, instanceId, targets, options) =>
      /*
       * Every announcement travels with the cast. `chosenMode` and `chosenX`
       * used to be dropped here even though the server reads them, so a modal
       * or {X} spell played over the network was refused for not naming what
       * the client had already chosen.
       */
      send({
        type: "castSpell",
        instanceId,
        targets,
        fromCommandZone: options?.fromCommandZone,
        chosenMode: options?.chosenMode,
        chosenX: options?.chosenX,
        sacrificeInstanceId: options?.sacrificeInstanceId,
        useAlternativeCost: options?.useAlternativeCost,
      }),
    activateAbility: (_playerId, instanceId, abilityIndex, targets) =>
      send({ type: "activateAbility", instanceId, abilityIndex, targets: targets ?? [] }),
    declareAttackers: (_playerId, declarations) => send({ type: "declareAttackers", declarations }),
    declareBlockers: (_playerId, declarations) => send({ type: "declareBlockers", declarations }),
    resolveSearch: (_playerId, instanceId) => send({ type: "resolveSearch", instanceId }),
    resolveConfirmation: (_playerId, accept) => send({ type: "resolveConfirmation", accept }),
    chooseTriggerTarget: (_playerId, target) => send({ type: "chooseTriggerTarget", target }),
    resolveDiscard: (_playerId, instanceId) => send({ type: "resolveDiscard", instanceId }),
    resolveSacrificeChoice: (_playerId, instanceId) =>
      send({ type: "resolveSacrificeChoice", instanceId }),
    takeMulligan: () => send({ type: "takeMulligan" }),
    keepHand: () => send({ type: "keepHand" }),
    putOnBottom: (_playerId, instanceIds) => send({ type: "putOnBottom", instanceIds }),
    concede: () => send({ type: "concede" }),
    passPriority: () => send({ type: "passPriority" }),
    canControlPlayer: (playerId) => playerId === myPlayerId,
  };
}
