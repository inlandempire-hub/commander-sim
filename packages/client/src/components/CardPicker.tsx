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
  /**
   * What declining is called. "Take nothing" is right for a tutor and wrong
   * for a surveil, where you are not taking anything either way - the choice
   * is whether the card goes to the graveyard or stays on top.
   */
  declineLabel?: string;
  onHover?: (definitionId: string | null, ownerId?: string, instanceId?: string) => void;
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
  declineLabel,
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
              {declineLabel ?? "Take nothing"}
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
/**
 * Which half of a modal double-faced card you are playing.
 *
 * Its own component rather than a `ModePicker` with two options, because the
 * two are different questions: a mode is chosen *while casting one spell*, and
 * this decides which spell you are casting at all - or whether you are casting
 * one instead of playing a land. Showing each face's full rules text matters
 * for the same reason; the choice is usually "removal now, or a land drop I
 * cannot take back".
 */
export function FacePicker({
  front,
  back,
  onChoose,
  onCancel,
}: {
  front: { name: string; lines: string[] };
  back: { name: string; lines: string[] };
  onChoose: (face: "front" | "back") => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div className="overlay overlay--picker">
      <div className="overlay__panel overlay__panel--narrow">
        <div className="overlay__head">
          <strong>{front.name}</strong>
          <button type="button" className="overlay__close" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <p className="picker__prompt">Which face are you playing?</p>
        <div className="modes">
          {([["front", front], ["back", back]] as const).map(([which, face]) => (
            <button
              key={which}
              type="button"
              className="modes__option"
              onClick={() => onChoose(which)}
            >
              <strong>{face.name}</strong>
              {face.lines.length > 0 && <span className="modes__detail">{face.lines.join(" ")}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

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

/**
 * "Announce a value for X" - chosen as the spell is cast (rule 601.2b), before
 * anything is paid.
 *
 * Only values the player can actually afford are offered, because a chooser
 * that lets you pick a number and then has the cast refused is worse than no
 * chooser at all. Zero is always there: casting The Meathook Massacre for
 * nothing is a real play when what you want is the two death triggers.
 */
export function XPicker({
  cardName,
  values,
  onChoose,
  onCancel,
}: {
  cardName: string;
  values: number[];
  onChoose: (x: number) => void;
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
        <p className="picker__prompt">Choose a value for X</p>
        <div className="x-values">
          {values.map((x) => (
            <button key={x} type="button" className="x-values__option" onClick={() => onChoose(x)}>
              {x}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
