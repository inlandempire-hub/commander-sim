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
import { CardLab } from "./lab/CardLab.js";
import { FontLab } from "./FontLab.js";
import { allFontFaceCss } from "./fontCatalogue.js";
import { applyPrefs, installFontFaces, loadPrefs } from "./fontPrefs.js";
import { browserStore, findDeck, loadDecks, toDeckList } from "./deckbuilder/deckStorage.js";
import type { ArtOverrides } from "./cardArt.js";
import type { ArtOverridesByPlayer } from "./artContext.js";
import "./styles.css";
import "./deckbuilder/deckbuilder.css";
import "./lab/lab.css";

const SEAT_LABELS: Record<string, string> = { donny: "Deadly Donny", mike: "Salty Mike" };

/**
 * How long the bot waits between its own actions.
 *
 * Raised from 450ms on 2026-08-06. The bot's turn is a dozen or more actions -
 * untap, draw, land, a spell, attack, pass, pass - and at 450ms the whole thing
 * went by faster than you could see what it had done, which made the game feel
 * like it was resolving itself rather than being played at you. Overridable
 * with ?delay= for anyone who disagrees.
 */
const DEFAULT_BOT_DELAY_MS = 800;

/** A deck plus the name to show for it - satisfied by both an Archetype and a saved deck. */
interface NamedDeck {
  name: string;
  deck: DeckList;
  /** Only saved decks can carry these; the built-in archetypes use default printings. */
  artOverrides?: ArtOverrides;
}

/**
 * Art is chosen per deck, so the same card can legitimately look different on
 * the two sides of the table. This keys each seat's choices by the seat label
 * the game was created with.
 */
function artBySeat(entries: Array<[string, NamedDeck | undefined]>): ArtOverridesByPlayer {
  const byPlayer: ArtOverridesByPlayer = {};
  for (const [seatLabel, named] of entries) {
    if (named?.artOverrides) byPlayer[seatLabel] = named.artOverrides;
  }
  return byPlayer;
}

/**
 * Two ways to play, and deliberately only two.
 *
 * **Bot** - the default, and what you get with no ?mode at all. One local
 * GameState with the other seat driven by @mtg-commander-sim/bot through the
 * same GameController the UI uses.
 *
 * **Network** - ?mode=network&seat=..., one browser per person, against a
 * running @mtg-commander-sim/server.
 *
 * There used to be a third, "hotseat": both seats driven from one screen. It
 * was removed on 2026-08-06 because it cannot work. Magic is a hidden-
 * information game and one screen has one set of eyes on it - either both hands
 * are face up, in which case neither player can play honestly, or the screen
 * has to be handed over and re-hidden every turn. Everything it existed for
 * (playing a deck you built, testing quickly) bot mode does, against an
 * opponent that cannot see your hand either.
 */

/**
 * Bot mode: the default. Add ?seat=mike to play the green deck instead.
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
  return { name: saved.name, deck, artOverrides: saved.artOverrides };
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
      artOverrides={artBySeat([
        [humanLabel, humanDeck],
        [botLabel, botDeck],
      ])}
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
 * Used for every seat in both modes, so "play the deck I built" works over the
 * network exactly as it does against the bot.
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
  if (mode === "fonts") return <FontLab />;
  // The card lab: every card in the Blech deck, one at a time, on a board built
  // for it. ?mode=lab for the index, &card=<id> for one board.
  if (mode === "lab") return <CardLab />;

  // Both seats read the same pair of parameters everywhere: ?deck=/&vs= name
  // the built-in archetypes, ?mydeck=/&vsdeck= take ids from the deck builder.
  const myDeck = resolveDeck(params.get("mydeck"), params.get("deck"));
  const theirDeck = resolveDeck(params.get("vsdeck"), params.get("vs"));
  if (isError(myDeck)) return <Notice message={myDeck.error} />;
  if (isError(theirDeck)) return <Notice message={theirDeck.error} />;

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

  // No mode, or an unrecognised one, is bot mode - the default and the only
  // one that works from a single browser with nobody else involved.
  const humanSeat = params.get("seat") === "mike" ? "mike" : "donny";
  const delayMs = Number(params.get("delay") ?? DEFAULT_BOT_DELAY_MS);
  return (
    <BotRoot
      humanSeat={humanSeat}
      delayMs={Number.isFinite(delayMs) ? delayMs : DEFAULT_BOT_DELAY_MS}
      humanDeck={myDeck}
      botDeck={theirDeck}
    />
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

/*
 * Type, before anything renders.
 *
 * The @font-face rules come from the catalogue rather than from styles.css so
 * there is one list of which files exist, and the saved choice goes on as
 * custom properties so no component ever has to know a font was picked. Both
 * before render: applying them afterwards means a frame of the old font, which
 * on the combat banner is a visible flash.
 */
installFontFaces(allFontFaceCss());
applyPrefs(loadPrefs());

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
