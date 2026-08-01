import { useEffect, useState } from "react";
import type { CardDefinition } from "@mtg-commander-sim/engine";
import { indexByName, searchScryfall, type ScryfallResult } from "./scryfallLookup.js";

/**
 * The "all real Commander cards" half of the browser, as opposed to the pool
 * the engine implements. Every result says plainly which of the two it is,
 * which is the whole point: it stops you building a deck around a card the
 * simulator cannot actually play (CLAUDE.md, Phase 5).
 */

const DEBOUNCE_MS = 350;

export interface ScryfallPanelProps {
  definitions: Record<string, CardDefinition>;
  /** Adds an implemented card to the deck, when the search happened to find one. */
  onAdd: (def: CardDefinition) => void;
  canAdd: (def: CardDefinition) => boolean;
}

export function ScryfallPanel({ definitions, onAdd, canAdd }: ScryfallPanelProps) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ScryfallResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResult(null);
      return;
    }
    // Wait for a pause in typing, then abandon the request outright if the
    // query changes again - otherwise a slow early search can land after a
    // fast later one and show answers to a question no longer being asked.
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      searchScryfall(query, indexByName(definitions), controller.signal)
        .then(setResult)
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResult({ status: "error", message: err instanceof Error ? err.message : String(err) });
        })
        .finally(() => setBusy(false));
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, definitions]);

  return (
    <div className="scryfall">
      <label className="scryfall__label" htmlFor="scryfall-query">
        Look up any real Commander card
      </label>
      <input
        id="scryfall-query"
        className="filters__text"
        type="search"
        placeholder="Sol Ring, t:dragon, o:draw..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="scryfall__hint">
        Searches Scryfall live, so it needs an internet connection. Results are marked with
        whether this simulator can actually play them.
      </p>

      {busy && <p className="scryfall__status">Searching...</p>}

      {!busy && result?.status === "offline" && (
        <p className="scryfall__status">
          Could not reach Scryfall. The implemented card list above still works offline.
        </p>
      )}
      {!busy && result?.status === "error" && (
        <p className="scryfall__status">{result.message}</p>
      )}
      {!busy && result?.status === "empty" && (
        <p className="scryfall__status">No Commander-legal card matches that.</p>
      )}

      {result?.status === "ok" && (
        <>
          <p className="scryfall__status">
            {result.totalCards} matches
            {result.totalCards > result.cards.length ? `, showing the first ${result.cards.length}` : ""}
          </p>
          <ul className="scryfall__list">
            {result.cards.map((card) => (
              <li
                key={card.scryfallId}
                className={`scryfall__card ${card.implementedAs ? "scryfall__card--implemented" : ""}`}
              >
                <div className="scryfall__head">
                  <span className="scryfall__name">{card.name}</span>
                  <span className="scryfall__cost">{card.manaCost}</span>
                </div>
                <div className="scryfall__type">{card.typeLine}</div>
                {card.oracleText && <div className="scryfall__oracle">{card.oracleText}</div>}
                {card.implementedAs ? (
                  <button
                    type="button"
                    className="btn btn--add"
                    disabled={!canAdd(card.implementedAs)}
                    onClick={() => onAdd(card.implementedAs!)}
                  >
                    Implemented - add to deck
                  </button>
                ) : (
                  <span className="scryfall__unimplemented">
                    Real card, not implemented in the engine yet
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
