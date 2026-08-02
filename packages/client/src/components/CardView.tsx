import { useState } from "react";
import { motion } from "framer-motion";
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

const COLOR_CLASS: Record<string, string> = {
  W: "card--W",
  U: "card--U",
  B: "card--B",
  R: "card--R",
  G: "card--G",
};

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

  return (
    <motion.div
      /*
       * No `layout`/`layoutId` here, deliberately.
       *
       * Framer Motion's layout projection owns the element's transform, and it
       * cannot animate `rotate` at the same time - which is why tapped cards
       * have never actually turned, in any version of this UI: the stylesheet
       * said `rotate(9deg)` and the inline transform silently won.
       *
       * The layout animation it bought us was cross-zone morphing, which the
       * rows' own scroll containers were clipping anyway (see .row__cards), so
       * it was paying for something largely invisible. Tapping is visible every
       * single turn. Enter, exit and hover are all still animated below.
       */
      /*
       * Tapping, hovering and the played-card pop are all CSS (see .card in
       * styles.css), not motion values, and that is deliberate.
       *
       * A JS animation only advances while the browser is issuing animation
       * frames. Driving a card's *visibility* through one - fading in from
       * `initial: { opacity: 0 }` - means a tab that isn't compositing renders
       * a board of invisible cards. That was not hypothetical: it is exactly
       * what happened here the first time, with every card at opacity 0.
       *
       * CSS transitions degrade to an instant state change instead, so the
       * worst case is "no animation" rather than "no game".
       */
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 500, damping: 34 }}
      className={[
        "card",
        dominantColorClass(definition),
        instance.tapped ? "card--tapped" : "",
        selected ? "card--selected" : "",
        disabled ? "card--disabled" : "",
        small ? "card--small" : "",
        instance.isCommander ? "card--commander" : "",
        playable ? "card--playable" : "",
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
    </motion.div>
  );
}
