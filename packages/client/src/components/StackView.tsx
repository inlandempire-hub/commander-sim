import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  CardDefinition,
  CardInstance,
  GameState,
  StackObject,
} from "@mtg-commander-sim/engine";
import { CardFace } from "./CardFace.js";
import { cardArtUrl } from "../cardArt.js";
import { useArtOverrides } from "../artContext.js";
import { describeCard, describeEffect } from "../cardText.js";
import { typeLine } from "../format.js";
import { ManaCostView } from "./ManaCostView.js";

export interface StackViewProps {
  state: GameState;
  cardDefinitions: Record<string, CardDefinition>;
  /**
   * Set while a counterspell is waiting for a target. Only spells are
   * clickable - an ability on the stack has no card and can't be countered,
   * so it stays inert rather than being offered and then rejected.
   */
  selectingSpellTarget?: boolean;
  onStackObjectClick?: (stackObjectId: string) => void;
  /** Reports the card under the cursor so the detail panel can show its full text. */
  onHover?: (definitionId: string | null, ownerId?: string, instanceId?: string) => void;
}

export function StackView({
  state,
  cardDefinitions,
  selectingSpellTarget,
  onStackObjectClick,
  onHover,
}: StackViewProps) {
  /*
   * The last card played, held here for good.
   *
   * Most spells in this game resolve the instant nobody responds, so the stack
   * showed a card for a single frame and was empty again - a flicker that told
   * you something had happened without any chance to see what. Rather than
   * holding it for a second and then going blank, the panel simply keeps the
   * last card until a new one replaces it: the space is reserved either way,
   * and an empty box helps nobody.
   *
   * Shown dimmed and labelled rather than as if it were still waiting, because
   * it is a record of what happened, not a spell you could still respond to.
   */
  const [lastPlayed, setLastPlayed] = useState<CardInstance | null>(null);
  const previousTop = useRef<CardInstance | null>(null);

  const topCard = state.stack.length
    ? (state.stackCards.find(
        (c) => c.instanceId === state.stack[state.stack.length - 1]!.sourceInstanceId,
      ) ?? null)
    : null;

  useEffect(() => {
    // Remember whatever was on top as it leaves, so an empty stack still has
    // something to show.
    if (topCard) setLastPlayed(topCard);
    previousTop.current = topCard;
  }, [topCard]);

  const showingLastPlayed = state.stack.length === 0 && lastPlayed !== null;

  return (
    <div className={`stack ${selectingSpellTarget ? "zone--targeting" : ""}`}>
      <div className="zone__label">
        {state.stack.length > 0 ? `Stack (${state.stack.length})` : "Last played"}
      </div>
      {state.stack.length === 0 && !showingLastPlayed && (
        <p className="stack__empty">Nothing played yet</p>
      )}

      {/* Deliberately outside the flight system's view: the card this shows is
          already somewhere else, and letting two elements claim one instance
          would have card movement measuring the wrong one. */}
      {/* The printed face, matching the hover panel above it. This one can
          afford it where the live stack below cannot: it is already outside
          the flight system, so it has no measured position to lose. */}
      {showingLastPlayed && (
        <div className="stack__cards stack__cards--resolved" data-flight-ignore="">
          <CardFace
            instance={lastPlayed!}
            definition={cardDefinitions[lastPlayed!.definitionId]!}
          />
        </div>
      )}

      {/*
          One row per thing waiting, topmost first - which is also the order
          they will resolve in, so the list reads top to bottom as "this, then
          this".

          They used to be art crops overlapping into a pile, which looked like
          a stack of cards and told you nothing: deciding whether to respond
          means knowing what the spell does, and a cropped illustration with a
          name on it does not say. Each row now carries its own rules text.
      */}
      {state.stack.length > 0 && (
        <div className="stack__list">
          {[...state.stack].reverse().map((obj, depth) => (
            <StackEntry
              key={obj.id}
              obj={obj}
              depth={depth}
              instance={state.stackCards.find((c) => c.instanceId === obj.sourceInstanceId)}
              cardDefinitions={cardDefinitions}
              selectable={selectingSpellTarget}
              onHover={onHover}
              onClick={selectingSpellTarget ? () => onStackObjectClick?.(obj.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * One thing on the stack: a thumbnail of its art, and what it will do.
 *
 * The text comes from `describeCard`/`describeEffect` rather than from the
 * printed face, for two reasons. The printed face's own text would be about
 * four pixels tall in this column and unreadable, and - more importantly - what
 * you want to know here is what *this engine* is about to do, which is exactly
 * what those renderers describe.
 */
function StackEntry({
  obj,
  depth,
  instance,
  cardDefinitions,
  selectable,
  onHover,
  onClick,
}: {
  obj: StackObject;
  /** 0 is the top of the stack - the one that resolves next. */
  depth: number;
  instance?: CardInstance;
  cardDefinitions: Record<string, CardDefinition>;
  selectable?: boolean;
  onHover?: (definitionId: string | null, ownerId?: string, instanceId?: string) => void;
  onClick?: () => void;
}) {
  const overrides = useArtOverrides(instance?.ownerId);
  const definition = instance ? cardDefinitions[instance.definitionId] : undefined;
  const [failed, setFailed] = useState(false);
  const artUrl = definition ? cardArtUrl(definition, "art_crop", overrides) : undefined;

  /*
   * A triggered or activated ability has no card of its own on the stack, so
   * there is no definition to describe - only the effect it is carrying. It
   * used to render as "Ability (gainLife)", the name of an internal effect
   * kind, which is no help at all when the question is whether to respond.
   */
  const lines = definition
    ? describeCard(definition, cardDefinitions)
    : [describeEffect(obj.effect, cardDefinitions)];

  return (
    <div
      /*
       * The pile reads as a pile because each entry sits a little further back
       * than the one above it - stepped in from the left, scaled down and
       * dimmed. A flat list of identical rows says "here are two spells" and
       * makes you read both to find out which one happens first; this says
       * which one happens first before you have read either.
       *
       * The depth is arithmetic on a number React already has, so it goes out
       * as an ordinary style prop - unlike the fan, where the value depends on
       * a measurement and has to be written from the DOM side.
       */
      className={[
        "stack-entry",
        depth === 0 ? "stack-entry--next" : "",
        selectable ? "stack-entry--selectable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--depth": depth } as CSSProperties}
      onClick={onClick}
      onMouseEnter={() =>
        definition && onHover?.(definition.id, instance?.ownerId, obj.sourceInstanceId)
      }
      onMouseLeave={() => onHover?.(null)}
    >
      {artUrl && !failed ? (
        <img
          className="stack-entry__art"
          src={artUrl}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="stack-entry__art stack-entry__art--none" />
      )}
      <div className="stack-entry__body">
        <div className="stack-entry__head">
          <span className="stack-entry__name">{definition?.name ?? "Ability"}</span>
          {/* Only on the top one. Depth alone tells you the order once you know
              to look for it; this tells you the first time. */}
          {depth === 0 && <span className="stack-entry__next">resolves next</span>}
          {definition?.manaCost && (
            <ManaCostView cost={definition.manaCost} size={12} className="stack-entry__cost" />
          )}
        </div>
        <div className="stack-entry__type">
          {definition ? typeLine(definition) : `Ability - ${obj.controllerId}`}
        </div>
        {lines.length > 0 ? (
          lines.map((line, i) => (
            <p key={i} className="stack-entry__rules">
              {line}
            </p>
          ))
        ) : (
          <p className="stack-entry__rules stack-entry__rules--none">No rules text.</p>
        )}
      </div>
    </div>
  );
}
