import { useEffect, useState } from "react";
import type { CardDefinition } from "@mtg-commander-sim/engine";
import { scryfallImageUrl } from "../cardArt.js";
import { fetchPrintings, type PrintingsResult } from "./printings.js";

/**
 * Choose which printing of a card this deck shows.
 *
 * The card pool ships one Scryfall id per card, taken from the `oracle_cards`
 * bulk file - one row per unique card, so it is whichever printing Scryfall
 * treats as representative. That is fine as a default and arbitrary as a
 * choice, hence this: ask Scryfall for every printing and let you pick.
 *
 * The choice is stored on the deck, not on the card, so two decks can show the
 * same card differently and nothing about the card's rules changes. Art is
 * cosmetic - the engine never sees a Scryfall id.
 */

export interface ArtPickerProps {
  definition: CardDefinition;
  /** The printing currently chosen, or undefined while the deck uses the default. */
  chosenId?: string;
  onChoose: (scryfallId: string | null) => void;
  onClose: () => void;
}

export function ArtPicker({ definition, chosenId, onChoose, onClose }: ArtPickerProps) {
  const [result, setResult] = useState<PrintingsResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    fetchPrintings(definition, controller.signal)
      .then(setResult)
      // An abort is this effect being cleaned up, not a failure to report.
      .catch(() => {});
    return () => controller.abort();
  }, [definition]);

  const defaultId = definition.scryfallId;
  const effectiveId = chosenId ?? defaultId;

  return (
    <div className="artpicker" role="dialog" aria-label={`Choose art for ${definition.name}`}>
      <div className="artpicker__head">
        <strong>{definition.name}</strong>
        <span className="muted">Pick the printing this deck should show</span>
        <button type="button" className="btn btn--small" onClick={onClose}>
          Close
        </button>
      </div>

      {result === null && <p className="muted">Asking Scryfall for every printing...</p>}
      {result?.status === "offline" && (
        <p className="muted">
          Couldn't reach Scryfall. The list of printings is fetched live, so this one needs a
          connection - your deck itself is unaffected.
        </p>
      )}
      {result?.status === "error" && <p className="muted">{result.message}</p>}
      {result?.status === "empty" && (
        <p className="muted">Scryfall has no printings with artwork for this card.</p>
      )}

      {result?.status === "ok" && (
        <>
          <p className="artpicker__count">
            {result.printings.length} printing{result.printings.length === 1 ? "" : "s"}
            {chosenId ? " - this deck has chosen one" : " - this deck uses the default"}
          </p>
          <ul className="artpicker__grid">
            {result.printings.map((printing) => {
              const url = scryfallImageUrl(printing.scryfallId, "art_crop");
              const isChosen = printing.scryfallId === effectiveId;
              const isDefault = printing.scryfallId === defaultId;
              return (
                <li key={printing.scryfallId}>
                  <button
                    type="button"
                    className={`artpicker__option ${isChosen ? "artpicker__option--on" : ""}`}
                    // Choosing the default printing clears the override rather
                    // than storing it, so the deck records only real changes.
                    onClick={() => onChoose(isDefault ? null : printing.scryfallId)}
                  >
                    {url && <img src={url} alt="" draggable={false} />}
                    <span className="artpicker__set">
                      {printing.setCode} #{printing.collectorNumber}
                      {isDefault ? " (default)" : ""}
                    </span>
                    <span className="artpicker__artist">{printing.artist || "unknown artist"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {chosenId && (
            <button type="button" className="btn btn--small" onClick={() => onChoose(null)}>
              Back to the default printing
            </button>
          )}
        </>
      )}
    </div>
  );
}
