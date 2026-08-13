import { WebSocketServer, type WebSocket } from "ws";
import {
  DEADLY_DONNY,
  SALTY_MIKE,
  createDemoGame,
  playLand,
  castSpellWithAutoTap,
  activateAbilityWithAutoTap,
  declareAttackers,
  declareBlockers,
  resolveSearch,
  chooseTriggerTarget,
  resolveDiscard,
  resolveAmountChoice,
  resolveCardChoice,
  resolveSacrificeChoice,
  resolveConfirmation,
  takeMulligan,
  keepHand,
  putOnBottom,
  concede,
  passPriority,
  type GameState,
} from "@mtg-commander-sim/engine";
import { filterGameStateForViewer, type ClientMessage, type ServerMessage } from "@mtg-commander-sim/protocol";

const PORT = Number(process.env.PORT ?? 8787);

const SEAT_BY_QUERY_PARAM: Record<string, string> = {
  donny: DEADLY_DONNY,
  mike: SALTY_MIKE,
};

/**
 * Authoritative 2-player server: one game at a time, two named seats
 * ("donny"/"mike" in the connection URL -> Deadly Donny/Salty Mike). Holds
 * the single real GameState; every action a client sends is applied through
 * the same engine functions the local hotseat client already used, then the
 * resulting state is re-broadcast to both connections, filtered per-viewer
 * so nobody sees the other player's hand/library contents.
 */
let gameState: GameState | null = null;
const seatConnections = new Map<string, WebSocket>();

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
}

function broadcastState(state: GameState): void {
  for (const [playerId, ws] of seatConnections) {
    send(ws, { type: "state", state: filterGameStateForViewer(state, playerId) });
  }
}

function dispatch(state: GameState, playerId: string, message: ClientMessage): void {
  switch (message.type) {
    case "playLand":
      playLand(state, playerId, message.instanceId);
      return;
    case "castSpell":
      castSpellWithAutoTap(state, playerId, message.instanceId, message.targets ?? [], {
        fromCommandZone: message.fromCommandZone,
        // Both were dropped here before now, so a modal spell cast over the
        // network was refused for not naming a mode - the client had chosen
        // one and the message left it behind.
        chosenMode: message.chosenMode,
        chosenX: message.chosenX,
        sacrificeInstanceId: message.sacrificeInstanceId,
        useAlternativeCost: message.useAlternativeCost,
      });
      return;
    case "activateAbility":
      activateAbilityWithAutoTap(state, playerId, message.instanceId, message.abilityIndex, message.targets ?? []);
      return;
    case "declareAttackers":
      declareAttackers(state, playerId, message.declarations);
      return;
    case "declareBlockers":
      declareBlockers(state, playerId, message.declarations);
      return;
    case "takeMulligan":
      takeMulligan(state, playerId);
      return;
    case "keepHand":
      keepHand(state, playerId);
      return;
    case "putOnBottom":
      putOnBottom(state, playerId, message.instanceIds);
      return;
    case "concede":
      concede(state, playerId);
      return;
    case "resolveSearch":
      resolveSearch(state, playerId, message.instanceId);
      return;
    case "resolveConfirmation":
      resolveConfirmation(state, playerId, message.accept);
      break;
    case "chooseTriggerTarget":
      chooseTriggerTarget(state, playerId, message.target);
      break;
    case "resolveDiscard":
      resolveDiscard(state, playerId, message.instanceId);
      break;
    case "resolveSacrificeChoice":
      resolveSacrificeChoice(state, playerId, message.instanceId);
      break;
    case "resolveCardChoice":
      resolveCardChoice(state, playerId, message.instanceIds);
      break;
    case "resolveAmountChoice":
      resolveAmountChoice(state, playerId, message.amount);
      return;
    case "passPriority":
      passPriority(state, playerId);
      return;
  }
}

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "", "http://localhost");
  const seatParam = url.searchParams.get("seat") ?? "";
  const playerId = SEAT_BY_QUERY_PARAM[seatParam];

  if (!playerId) {
    send(ws, { type: "error", message: `Unknown seat "${seatParam}" - connect with ?seat=donny or ?seat=mike` });
    ws.close();
    return;
  }

  const existing = seatConnections.get(playerId);
  if (existing && existing.readyState === existing.OPEN) {
    send(ws, { type: "error", message: `${playerId}'s seat is already connected elsewhere` });
    ws.close();
    return;
  }

  seatConnections.set(playerId, ws);
  send(ws, { type: "joined", playerId });
  console.log(`${playerId} connected`);

  if (seatConnections.size < 2) {
    send(ws, { type: "waitingForOpponent" });
  } else {
    if (!gameState) gameState = createDemoGame({ mulligan: true });
    broadcastState(gameState);
  }

  ws.on("message", (raw) => {
    if (!gameState) {
      send(ws, { type: "error", message: "Game hasn't started - waiting for the other player" });
      return;
    }
    let message: ClientMessage;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", message: "Malformed message" });
      return;
    }
    try {
      dispatch(gameState, playerId, message);
      broadcastState(gameState);
    } catch (err) {
      send(ws, { type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  });

  ws.on("close", () => {
    if (seatConnections.get(playerId) === ws) {
      seatConnections.delete(playerId);
      console.log(`${playerId} disconnected`);
    }
  });
});

console.log(`MTG Commander Sim server listening on ws://localhost:${PORT}`);
