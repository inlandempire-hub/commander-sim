import { motion } from "framer-motion";
import {
  effectivePower,
  effectiveToughness,
  type CardDefinition,
  type CardInstance,
  type GameState,
} from "@mtg-commander-sim/engine";
import { formatManaCost, typeLine } from "../format.js";

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
  /** Called with this card's definition id on hover, and null on leave, to drive the detail panel. */
  onHover?: (definitionId: string | null) => void;
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

  return (
    <motion.div
      layout
      layoutId={instance.instanceId}
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
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onHover ? () => onHover(definition.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      title={typeLine(definition)}
    >
      <div className="card__header">
        <span className="card__name">{definition.name}</span>
        {showCost && <span className="card__cost">{formatManaCost(definition.manaCost)}</span>}
      </div>
      <div className="card__type">{typeLine(definition)}</div>
      {isCreature && (
        <div className="card__pt">
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
        </div>
      )}
      {definition.keywords?.length ? <div className="card__keywords">{definition.keywords.join(", ")}</div> : null}
      {badge && <div className="card__badge">{badge}</div>}
    </motion.div>
  );
}
