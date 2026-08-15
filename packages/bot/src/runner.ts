import WebSocket from "ws";
import type { GameState } from "@mtg-commander-sim/engine";
import type { ClientMessage, ServerMessage } from "@mtg-commander-sim/protocol";
import { decideAction } from "./decide.js";
import { botShouldAct } from "./play.js";
import type { BotAction } from "./types.js";

/**
 * Standalone bot process: joins a running @mtg-commander-sim/server as a
 * regular seat, over the same WebSocket protocol a human browser client uses.
 *
 * This is the form CLAUDE.md specifies - "the bot is just another client, no
 * separate vs-AI code path in the engine/server". The server can't tell this
 * connection from a person's, validates its actions identically, and only
 * ever sends it the filtered view of the game, so the bot physically cannot
 * see the opponent's hand here even by mistake.
 *
 *   npm run play -w @mtg-commander-sim/bot -- --seat=mike --delay=600
 */

interface RunnerOptions {
  serverUrl: string;
  seat: string;
  delayMs: number;
}

function parseArgs(argv: string[]): RunnerOptions {
  const get = (name: string, fallback: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
  return {
    serverUrl: get("server", "ws://localhost:8787"),
    seat: get("seat", "mike"),
    delayMs: Number(get("delay", "600")),
  };
}

function toClientMessage(action: BotAction): ClientMessage | null {
  switch (action.kind) {
    case "playLand":
      return { type: "playLand", instanceId: action.instanceId };
    case "castSpell":
      return {
        type: "castSpell",
        instanceId: action.instanceId,
        targets: action.targets,
        fromCommandZone: action.fromCommandZone,
        chosenX: action.chosenX,
        sacrificeInstanceId: action.sacrificeInstanceId,
        useAlternativeCost: action.useAlternativeCost,
      };
    case "activateAbility":
      return {
        type: "activateAbility",
        instanceId: action.instanceId,
        abilityIndex: action.abilityIndex,
        targets: action.targets,
      };
    case "declareAttackers":
      return { type: "declareAttackers", declarations: action.declarations };
    case "declareBlockers":
      return { type: "declareBlockers", declarations: action.declarations };
    case "resolveSearch":
      return { type: "resolveSearch", instanceId: action.instanceId };
    case "resolveArrange":
      return { type: "resolveArrange", order: action.order, shuffle: action.shuffle };
    case "resolveConfirmation":
      return { type: "resolveConfirmation", accept: action.accept };
    case "chooseTriggerTarget":
      return { type: "chooseTriggerTarget", target: action.target };
    case "resolveDiscard":
      return { type: "resolveDiscard", instanceId: action.instanceId };
    case "resolveSacrificeChoice":
      return { type: "resolveSacrificeChoice", instanceId: action.instanceId };
    case "resolveCardChoice":
      return { type: "resolveCardChoice", instanceIds: action.instanceIds };
    case "resolveAmountChoice":
      return { type: "resolveAmountChoice", amount: action.amount };
    case "takeMulligan":
      return { type: "takeMulligan" };
    case "keepHand":
      return { type: "keepHand" };
    case "putOnBottom":
      return { type: "putOnBottom", instanceIds: action.instanceIds };
    case "passPriority":
      return { type: "passPriority" };
  }
}

export function runBot({ serverUrl, seat, delayMs }: RunnerOptions): void {
  const socket = new WebSocket(`${serverUrl}?seat=${seat}`);
  let playerId: string | null = null;
  let latest: GameState | null = null;

  socket.on("open", () => console.log(`[bot] connected to ${serverUrl} as seat "${seat}"`));

  socket.on("message", (raw) => {
    const message = JSON.parse(String(raw)) as ServerMessage;
    switch (message.type) {
      case "joined":
        playerId = message.playerId;
        console.log(`[bot] seated as ${playerId}`);
        return;
      case "state":
        latest = message.state;
        return;
      case "waitingForOpponent":
        console.log("[bot] waiting for an opponent to join...");
        return;
      case "error":
        // The server rejecting an action means a heuristic proposed something
        // illegal - worth shouting about rather than silently retrying.
        console.error(`[bot] server rejected an action: ${message.message}`);
        return;
    }
  });

  socket.on("close", () => {
    console.log("[bot] disconnected");
    clearInterval(timer);
  });
  socket.on("error", (err) => console.error("[bot] socket error:", err.message));

  // Polled rather than driven off incoming state messages, so a dropped or
  // coalesced broadcast can't leave the bot waiting forever for a nudge.
  const timer = setInterval(() => {
    if (!playerId || !latest) return;
    if (latest.players.some((p) => p.hasLost)) return;
    if (!botShouldAct(latest, playerId)) return;

    // The state the server sent is already filtered for this seat, so it is
    // exactly what decideAction is contracted to receive.
    const action = decideAction(latest, playerId);
    const holdsPriority = latest.players[latest.priorityPlayerIndex]?.id === playerId;
    if (action.kind === "passPriority" && !holdsPriority) return; // declining to block, not acting

    const message = toClientMessage(action);
    if (message) socket.send(JSON.stringify(message));
  }, Math.max(delayMs, 50));
}

runBot(parseArgs(process.argv.slice(2)));
