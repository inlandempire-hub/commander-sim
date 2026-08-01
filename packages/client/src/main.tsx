import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ARCHETYPES,
  TEST_CARD_DEFINITIONS,
  validateCommanderDeck,
  type Archetype,
  type DeckList,
} from "@mtg-commander-sim/engine";
import { App } from "./App.js";
import { useLocalGameController } from "./useLocalGameController.js";
import { useNetworkGameController } from "./useNetworkGameController.js";
import { useBotOpponent } from "./useBotOpponent.js";
import { DeckBuilder } from "./deckbuilder/DeckBuilder.js";
import { browserStore, findDeck, loadDecks, toDeckList } from "./deckbuilder/deckStorage.js";
import "./styles.css";
import "./deckbuilder/deckbuilder.css";

const SEAT_LABELS: Record<string, string> = { donny: "Deadly Donny", mike: "Salty Mike" };

/** A deck plus the name to show for it - satisfied by both an Archetype and a saved deck. */
interface NamedDeck {
  name: string;
  deck: DeckList;
}

/**
 * Hotseat mode (default): both seats on one screen, one local GameState.
 * Takes the same ?deck= / &vs= archetype parameters as bot mode, so two people
 * sharing a screen can play the built decks rather than only the demo pair.
 */
function LocalRoot({ decks }: { decks: { human?: NamedDeck; opponent?: NamedDeck } }) {
  // Both seats fall back together: a hotseat game with one real deck and one
  // demo deck would be a confusing half-state, so it's both or neither.
  const controller = useLocalGameController(
    decks.human && decks.opponent
      ? {
          decks: [
            { id: SEAT_LABELS.donny!, deck: decks.human.deck },
            { id: SEAT_LABELS.mike!, deck: decks.opponent.deck },
          ],
        }
      : {},
  );
  return (
    <App
      controller={controller}
      modeNotice={
        decks.human && decks.opponent
          ? `Hotseat: ${SEAT_LABELS.donny} playing ${decks.human.name} against ${SEAT_LABELS.mike} playing ${decks.opponent.name}.`
          : "Hotseat mode, demo decks built from the engine's Scryfall-sourced card pool (see CLAUDE.md)."
      }
    />
  );
}

/**
 * Bot mode: open with ?mode=bot (optionally &seat=mike to play the green deck
 * instead). One local GameState as in hotseat, except the other seat is driven
 * by @mtg-commander-sim/bot through the same GameController the UI uses.
 */
function findArchetype(wanted: string | null): Archetype | undefined {
  if (!wanted) return undefined;
  return ARCHETYPES.find((a) => a.name.toLowerCase().includes(wanted.toLowerCase()));
}

/**
 * Loads a deck saved in the deck builder. Returns a plain message instead of a
 * deck when it can't be played, because silently falling back to a demo deck
 * would look like the deck builder had quietly ignored what you built.
 */
function loadSavedDeck(deckId: string): NamedDeck | { error: string } {
  const saved = findDeck(loadDecks(browserStore()), deckId);
  if (!saved) return { error: `No saved deck with id "${deckId}" - it may have been deleted.` };
  const deck = toDeckList(saved);
  if (!deck) return { error: `"${saved.name}" has no commander yet, so it can't be played.` };
  const validation = validateCommanderDeck(deck, TEST_CARD_DEFINITIONS);
  if (!validation.legal) {
    return { error: `"${saved.name}" is not a legal Commander deck: ${validation.errors[0]}` };
  }
  return { name: saved.name, deck };
}

function BotRoot({
  humanSeat,
  delayMs,
  humanDeck,
  botDeck,
}: {
  humanSeat: string;
  delayMs: number;
  humanDeck: NamedDeck | undefined;
  botDeck: NamedDeck | undefined;
}) {
  const humanLabel = SEAT_LABELS[humanSeat] ?? humanSeat;
  const botLabel = humanLabel === SEAT_LABELS.donny ? SEAT_LABELS.mike! : SEAT_LABELS.donny!;
  const controller = useLocalGameController(
    humanDeck && botDeck
      ? { decks: [{ id: humanLabel, deck: humanDeck.deck }, { id: botLabel, deck: botDeck.deck }] }
      : {},
  );

  useBotOpponent(controller, botLabel, { delayMs });

  // Gate the UI's auto-pass to the human's seat only, so the two never race
  // each other for the same priority window.
  const humanOnly = { ...controller, canControlPlayer: (playerId: string) => playerId === humanLabel };

  return (
    <App
      controller={humanOnly}
      modeNotice={
        humanDeck && botDeck
          ? `You are ${humanLabel} playing ${humanDeck.name}. The bot is ${botLabel} playing ${botDeck.name}.`
          : `You are ${humanLabel}. ${botLabel} is played by the bot.`
      }
    />
  );
}

/**
 * Networked mode: open with ?mode=network&seat=donny (or &seat=mike), each
 * in its own browser tab/window, against a running @mtg-commander-sim/server.
 */
function NetworkRoot({ seat, serverUrl }: { seat: string; serverUrl: string }) {
  const seatLabel = SEAT_LABELS[seat] ?? seat;
  const controller = useNetworkGameController(`${serverUrl}?seat=${seat}`, seatLabel);
  return (
    <App controller={controller} modeNotice={`Networked as ${seatLabel} (${serverUrl}) — demo decks.`} />
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="app">
      <h1 className="app__title">MTG Commander Sim</h1>
      <p className="app__notice">{message}</p>
      <p>
        <a className="btn" href="?mode=deck">
          Open the deck builder
        </a>
      </p>
    </div>
  );
}

/**
 * Resolves one seat's deck from the URL. A saved deck id wins over an
 * archetype name when both are given, since naming a specific deck you built
 * is the more deliberate instruction of the two.
 *
 * Used for every seat in every mode, so "play the deck I built" works in
 * hotseat exactly as it does against the bot.
 */
function resolveDeck(
  savedId: string | null,
  archetypeName: string | null,
): NamedDeck | { error: string } | undefined {
  if (savedId) return loadSavedDeck(savedId);
  return findArchetype(archetypeName);
}

function isError(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value;
}

function Root() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");

  if (mode === "deck") return <DeckBuilder />;

  // Both seats read the same pair of parameters everywhere: ?deck=/&vs= name
  // the built-in archetypes, ?mydeck=/&vsdeck= take ids from the deck builder.
  const myDeck = resolveDeck(params.get("mydeck"), params.get("deck"));
  const theirDeck = resolveDeck(params.get("vsdeck"), params.get("vs"));
  if (isError(myDeck)) return <Notice message={myDeck.error} />;
  if (isError(theirDeck)) return <Notice message={theirDeck.error} />;

  if (mode === "bot") {
    const humanSeat = params.get("seat") === "mike" ? "mike" : "donny";
    const delayMs = Number(params.get("delay") ?? 450);
    return (
      <BotRoot
        humanSeat={humanSeat}
        delayMs={Number.isFinite(delayMs) ? delayMs : 450}
        humanDeck={myDeck}
        botDeck={theirDeck}
      />
    );
  }

  if (mode === "network") {
    const seat = params.get("seat") ?? "";
    const serverUrl = params.get("server") ?? "ws://localhost:8787";
    if (seat !== "donny" && seat !== "mike") {
      return (
        <div className="app">
          <h1 className="app__title">MTG Commander Sim</h1>
          <p className="app__notice">
            Add <code>&seat=donny</code> or <code>&seat=mike</code> to the URL to join a seat over the network.
          </p>
        </div>
      );
    }
    return <NetworkRoot seat={seat} serverUrl={serverUrl} />;
  }

  return <LocalRoot decks={{ human: myDeck, opponent: theirDeck }} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
