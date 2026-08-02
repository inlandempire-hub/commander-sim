import { useEffect, useRef, useState } from "react";
import {
  effectivePower,
  effectiveToughness,
  type CardDefinition,
  type CardInstance,
  type GameState,
} from "@mtg-commander-sim/engine";
import { formatManaCost, typeLine } from "../format.js";
import { cardArtUrl } from "../cardArt.js";
import { useArtOverrides } from "../artContext.js";
import { useIsFlying } from "../flightContext.js";

const COLOR_CLASS: Record<string, string> = {
  W: "card--W",
  U: "card--U",
  B: "card--B",
  R: "card--R",
  G: "card--G",
};

/** How long the flinch lasts when a creature is dealt damage. */
const HIT_MS = 420;

function dominantColorClass(def: CardDefinition): string {
  const colors = Object.entries(def.manaCost?.colors ?? {})
    .filter(([, count]) => (count ?? 0) > 0)
    .map(([color]) => color);
  if (colors.length === 1) return COLOR_CLASS[colors[0]!] ?? "card--C";
  if (colors.length > 1) return "card--multi";
  return "card--C";
}

export interface CardViewProps {
  instance: CardInstance;
  definition: CardDefinition;
  /**
   * Required for anything on the battlefield. Current power/toughness depends
   * on other permanents (anthems), so it cannot be derived from this card
   * alone - passing the state lets the engine's own helpers do it, rather than
   * this component keeping its own copy of the arithmetic in step with them.
   * Omitted for hand/graveyard/stack, where printed values are what you want.
   */
  state?: GameState;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  /**
   * Marks a card in hand or the command zone that can actually be played right
   * now - correct timing, mana available, something legal to target. Purely a
   * hint; the engine still validates the click.
   */
  playable?: boolean;
  /** Leans this creature towards the centre line - it is attacking. */
  attacking?: boolean;
  /** A smaller lean: this creature has stepped up to block. */
  blocking?: boolean;
  /**
   * Called with this card's definition id on hover, and null on leave, to
   * drive the detail panel. The owner comes along so the panel can show that
   * player's chosen printing rather than the default one.
   */
  onHover?: (definitionId: string | null, ownerId?: string) => void;
  /**
   * A short line under the card - "Blocks Craw Wurm", "Blocked by 2". Combat
   * assignments are invisible otherwise: a highlight tells you a creature is
   * involved but never what it's paired with.
   */
  badge?: string;
}

export function CardView({
  instance,
  definition,
  state,
  onClick,
  selected,
  disabled,
  small,
  playable,
  attacking,
  blocking,
  onHover,
  badge,
}: CardViewProps) {
  const isCreature = definition.types.includes("Creature");
  const showCost = instance.zone === "hand" || instance.zone === "command" || instance.zone === "stack";

  const onBattlefield = state !== undefined && instance.zone === "battlefield";
  const power = onBattlefield ? effectivePower(state, instance) : (definition.power ?? 0);
  const toughness = onBattlefield ? effectiveToughness(state, instance) : (definition.toughness ?? 0);
  const temporary = instance.temporaryPowerBonus !== 0 || instance.temporaryToughnessBonus !== 0;
  const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

  // The card renders as a name-and-text box until the illustration arrives,
  // and stays that way permanently if it never does - offline, a token with no
  // printing, a URL Scryfall has retired. The text card is the one that has to
  // work; the art is decoration on top of it.
  const overrides = useArtOverrides(instance.ownerId);
  const artUrl = cardArtUrl(definition, "art_crop", overrides);
  const [artFailed, setArtFailed] = useState(false);
  const showArt = artUrl !== undefined && !artFailed;

  // Hidden while a copy of this card is flying towards this zone, so the card
  // arrives when the animation lands rather than the instant the game state
  // says it moved. It keeps its space in the layout, which is what lets the
  // flight measure where it is going.
  const flying = useIsFlying(instance.instanceId);

  // Damage landing on a creature is currently just a number changing in the
  // corner of the card, which is easy to miss in the middle of combat.
  const [hit, setHit] = useState(false);
  const lastDamage = useRef(instance.damageMarked);
  useEffect(() => {
    const took = instance.damageMarked > lastDamage.current;
    lastDamage.current = instance.damageMarked;
    if (!took) return;
    setHit(true);
    const timer = window.setTimeout(() => setHit(false), HIT_MS);
    return () => window.clearTimeout(timer);
  }, [instance.damageMarked]);

  return (
    <div
      /*
       * No Framer Motion on the card itself, deliberately, in either direction.
       *
       * Motion's `layout` prop used to be here and owned the element's inline
       * transform, which silently beat the stylesheet's `rotate(9deg)` - which
       * is why tapped cards never actually turned, in any version of this UI.
       * Layout projection cannot animate `rotate` at all, so there was no
       * arrangement in which both worked.
       *
       * The second reason is more important. A JS animation only advances
       * while the browser is issuing animation frames, so driving a card's
       * *visibility* through one means a tab that isn't compositing renders a
       * board of invisible cards. That is not hypothetical - it happened here.
       * Everything visible about a card is CSS, which degrades to an instant
       * state change rather than to nothing. Cards do still fly between zones,
       * but that is a separate throwaway copy in an overlay (CardFlightLayer),
       * and the real card is restored on a timer that runs either way.
       *
       * The data attributes are how the flight finds this card and works out
       * where it has moved from and to.
       */
      data-card-instance={instance.instanceId}
      data-card-zone={instance.zone}
      data-card-owner={instance.ownerId}
      className={[
        "card",
        dominantColorClass(definition),
        instance.tapped ? "card--tapped" : "",
        selected ? "card--selected" : "",
        disabled ? "card--disabled" : "",
        small ? "card--small" : "",
        instance.isCommander ? "card--commander" : "",
        playable ? "card--playable" : "",
        attacking ? "card--attacking" : "",
        blocking ? "card--blocking" : "",
        hit ? "card--hit" : "",
        flying ? "card--in-transit" : "",
        showArt ? "card--art" : "card--noart",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onHover ? () => onHover(definition.id, instance.ownerId) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      title={`${definition.name} - ${typeLine(definition)}`}
    >
      {showArt && (
        <img
          className="card__image"
          src={artUrl}
          alt=""
          // Deliberately not lazy: only the cards actually in play are
          // rendered at all, so every one of these is on screen already, and
          // deferring them just means a board that fills in late.
          draggable={false}
          onError={() => setArtFailed(true)}
        />
      )}
      <div className="card__body">
        <div className="card__header">
          <span className="card__name">{definition.name}</span>
          {showCost && <span className="card__cost">{formatManaCost(definition.manaCost)}</span>}
        </div>
        {/* With art there is no room for a type line or keyword list, and no
            need - the detail panel reads out the whole card on hover. */}
        {!showArt && <div className="card__type">{typeLine(definition)}</div>}
        <div className="card__footer">
          {isCreature && (
            <span className="card__pt">
              {power}/{toughness}
              {instance.plusOneCounters > 0 && <span className="card__counters"> (+{instance.plusOneCounters})</span>}
              {temporary && (
                // Until-end-of-turn pumps, shown separately from permanent counters.
                <span className="card__counters">
                  {" "}
                  ({signed(instance.temporaryPowerBonus)}/{signed(instance.temporaryToughnessBonus)} EOT)
                </span>
              )}
              {instance.damageMarked > 0 && <span className="card__damage"> (-{instance.damageMarked})</span>}
            </span>
          )}
          {!showArt && definition.keywords?.length ? (
            <span className="card__keywords">{definition.keywords.join(", ")}</span>
          ) : null}
        </div>
      </div>
      {badge && <div className="card__badge">{badge}</div>}
    </div>
  );
}
