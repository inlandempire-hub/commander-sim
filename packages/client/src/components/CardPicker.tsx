import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CardDefinition, CardInstance } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";
import { describeCard } from "../cardText.js";

/**
 * "Pick a card" - the one overlay used for every zone the game ever asks you
 * to choose from: your library on a tutor, your graveyard on a recursion
 * spell, exile on a return effect.
 *
 * The search box is the point. A library is ninety-nine cards, and scrolling
 * to find the one you already know you want is the worst part of every digital
 * Magic client. It matches on name, type line and rules text, word by word and
 * order-independent, the same as the deck builder's browser.
 *
 * Optional means "you may decline" - searching and taking nothing is a legal
 * play, and one you sometimes want, so it is always offered when the rules
 * allow it.
 */

export interface CardPickerProps {
  title: string;
  /** The printed wording of what's being asked, shown under the title. */
  prompt: string;
  cards: CardInstance[];
  cardDefinitions: Record<string, CardDefinition>;
  onChoose: (instanceId: string) => void;
  /** Provided when declining is legal - a tutor may always find nothing. */
  onDecline?: () => void;
  onHover?: (definitionId: string | null, ownerId?: string) => void;
}

/** Everything about a card that a search should look at. */
function searchableText(definition: CardDefinition, cardDefinitions: Record<string, CardDefinition>): string {
  return [
    definition.name,
    ...definition.types,
    ...(definition.subtypes ?? []),
    ...(definition.keywords ?? []),
    ...describeCard(definition, cardDefinitions),
  ]
    .join(" ")
    .toLowerCase();
}

export function CardPicker({
  title,
  prompt,
  cards,
  cardDefinitions,
  onChoose,
  onDecline,
  onHover,
}: CardPickerProps) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return cards;
    return cards.filter((card) => {
      const definition = cardDefinitions[card.definitionId];
      if (!definition) return false;
      const haystack = searchableText(definition, cardDefinitions);
      // Every term must appear, in any order - "bear green" finds a green bear.
      return terms.every((term) => haystack.includes(term));
    });
  }, [cards, cardDefinitions, query]);

  return createPortal(
    <div className="overlay overlay--picker">
      <div className="overlay__panel">
        <div className="overlay__head">
          <strong>{title}</strong>
          <span className="overlay__count">
            {matches.length} of {cards.length}
          </span>
          {onDecline && (
            <button type="button" className="overlay__close" onClick={onDecline}>
              Take nothing
            </button>
          )}
        </div>
        <p className="picker__prompt">{prompt}</p>

        <input
          className="picker__search"
          type="search"
          autoFocus
          placeholder="Search by name, type or rules text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {matches.length === 0 ? (
          <p className="picker__none">
            {cards.length === 0 ? "There is nothing here to choose." : "Nothing matches that search."}
          </p>
        ) : (
          <div className="overlay__grid">
            {matches.map((instance) => (
              <CardView
                key={instance.instanceId}
                instance={instance}
                definition={cardDefinitions[instance.definitionId]!}
                onHover={onHover}
                onClick={() => onChoose(instance.instanceId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * "Choose one -": the mode of a modal spell, picked as it is cast (rule
 * 601.2b). Small enough to be a list of sentences rather than a card grid -
 * you are choosing between wordings, not between cards.
 */
export function ModePicker({
  cardName,
  modes,
  onChoose,
  onCancel,
}: {
  cardName: string;
  modes: Array<{ label: string }>;
  onChoose: (index: number) => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="overlay overlay--picker">
      <div className="overlay__panel overlay__panel--narrow">
        <div className="overlay__head">
          <strong>{cardName}</strong>
          <button type="button" className="overlay__close" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <p className="picker__prompt">Choose one</p>
        <div className="modes">
          {modes.map((mode, index) => (
            <button key={index} type="button" className="modes__option" onClick={() => onChoose(index)}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
