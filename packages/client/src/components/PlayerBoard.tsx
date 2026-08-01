import type { CardDefinition, CardType, GameState, Player } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";

/**
 * One player's half of the table.
 *
 * The two halves face each other rather than repeating: the opponent's is
 * rendered upside-down in the sense that matters, with their hand at the far
 * edge of the screen and their creatures nearest the middle, so the two
 * creature rows meet in the centre where combat happens. That is one `flipped`
 * prop and two CSS direction flips, not a second component - the zones and
 * their behaviour are identical, only their order on screen differs.
 *
 * Layout, screen top to bottom:
 *
 *     opponent hand / lands / other permanents / creatures
 *     ------------------- centre: stack, actions -------------------
 *     your creatures / other permanents / lands / hand
 *
 * Life, mana, command zone and graveyard live in a narrow rail down the outer
 * edge - the opponent's on the right, yours on the left - which keeps the
 * middle of the screen for the cards that are actually in play.
 */

export interface PlayerBoardProps {
  player: Player;
  /** Needed so battlefield creatures can show their *current* stats, anthems included. */
  state: GameState;
  cardDefinitions: Record<string, CardDefinition>;
  /** True for the seat across the table, whose zones run in the opposite direction. */
  flipped?: boolean;
  isActivePlayer: boolean;
  hasPriority: boolean;
  selectedAttackerIds: Set<string>;
  attackingIds: Set<string>;
  selectedBlockerSourceId: string | null;
  blockerAssignments: Record<string, string>;
  onHandCardClick: (instanceId: string) => void;
  onCommandCardClick: (instanceId: string) => void;
  onBattlefieldCardClick: (instanceId: string) => void;
  /** Only meaningful while a recursion spell is choosing a target. */
  onGraveyardCardClick: (instanceId: string) => void;
  /** Highlights the graveyard when a spell is waiting to be pointed at a card in it. */
  selectingGraveyardTarget?: boolean;
  /** Set while a "destroy target land/artifact/enchantment" spell is choosing - highlights that group. */
  selectingPermanentType?: CardType;
  /**
   * Whether a card in hand or the command zone can be played right now, for the
   * highlight. Omitted for seats this client doesn't control - the opponent's
   * options are none of your business, and their hand is redacted anyway.
   */
  canPlay?: (instanceId: string) => boolean;
  /** Reports the card under the cursor so the detail panel can show its full text. */
  onHover?: (definitionId: string | null, ownerId?: string) => void;
  onLifeClick: () => void;
}

export function PlayerBoard({
  player,
  state,
  cardDefinitions,
  flipped,
  isActivePlayer,
  hasPriority,
  selectedAttackerIds,
  attackingIds,
  selectedBlockerSourceId,
  blockerAssignments,
  onHandCardClick,
  onCommandCardClick,
  onBattlefieldCardClick,
  onGraveyardCardClick,
  selectingGraveyardTarget,
  selectingPermanentType,
  canPlay,
  onHover,
  onLifeClick,
}: PlayerBoardProps) {
  const lands = player.battlefield.filter((c) => cardDefinitions[c.definitionId]?.types.includes("Land"));
  const creatures = player.battlefield.filter((c) => cardDefinitions[c.definitionId]?.types.includes("Creature"));
  // Anything that is neither - an anthem enchantment, a non-creature artifact.
  // Without this group they sit on the battlefield invisibly, which stopped
  // "destroy target enchantment" from having anything to click.
  const otherPermanents = player.battlefield.filter((c) => {
    const types = cardDefinitions[c.definitionId]?.types ?? [];
    return !types.includes("Land") && !types.includes("Creature");
  });
  const targetingClass = (group: CardType): string =>
    selectingPermanentType === group ? "zone--targeting" : "";
  const assignedBlockerIds = new Set(Object.keys(blockerAssignments));

  /**
   * What this creature is doing in combat, in words. Without it an attacker,
   * a selected blocker and an assigned blocker all look the same - a highlight
   * with no indication of what is paired with what.
   */
  const combatBadge = (instanceId: string): string | undefined => {
    const blocking = blockerAssignments[instanceId];
    if (blocking) {
      const attacker = state.players
        .flatMap((p) => p.battlefield)
        .find((c) => c.instanceId === blocking);
      const name = attacker ? cardDefinitions[attacker.definitionId]?.name : undefined;
      return `Blocks ${name ?? "attacker"}`;
    }
    if (attackingIds.has(instanceId)) {
      const blockers = Object.values(blockerAssignments).filter((id) => id === instanceId).length;
      return blockers > 0 ? `Blocked by ${blockers}` : "Attacking";
    }
    if (selectedBlockerSourceId === instanceId) return "Pick an attacker to block";
    return undefined;
  };
  const manaPoolSummary = Object.entries(player.manaPool)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([color, amount]) => `${amount}${color === "generic" ? "" : color}`)
    .join(" ");

  return (
    <section
      className={[
        "side",
        flipped ? "side--flipped" : "",
        isActivePlayer ? "side--active" : "",
        player.hasLost ? "side--lost" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="rail">
        <div className="rail__identity">
          <span className="rail__name">{player.id}</span>
          {hasPriority && <span className="rail__priority">Priority</span>}
          {isActivePlayer && <span className="rail__turn">Their turn</span>}
        </div>
        <button className="rail__life" onClick={onLifeClick} title="Click to target this player">
          {player.life}
          <span className="rail__life-label">life</span>
        </button>
        {manaPoolSummary && <div className="rail__mana">Mana: {manaPoolSummary}</div>}
        {Object.entries(player.commanderDamageTaken).map(([cmdId, dmg]) => (
          <div key={cmdId} className="rail__cmd-damage">
            Cmd dmg {dmg}/21
          </div>
        ))}
        {player.hasLost && <div className="rail__lost">LOST: {player.lossReason}</div>}

        <div className="rail__zone">
          <div className="zone__label">Command</div>
          <div className="rail__cards">
            {player.command.map((instance) => (
              <CardView
                key={instance.instanceId}
                instance={instance}
                definition={cardDefinitions[instance.definitionId]!}
                playable={canPlay?.(instance.instanceId)}
                onHover={onHover}
                onClick={() => onCommandCardClick(instance.instanceId)}
                small
              />
            ))}
          </div>
        </div>

        <div className={`rail__zone ${selectingGraveyardTarget ? "zone--targeting" : ""}`}>
          <div className="zone__label">Graveyard ({player.graveyard.length})</div>
          <div className="rail__cards">
            {player.graveyard.map((instance) => (
              <CardView
                key={instance.instanceId}
                instance={instance}
                definition={cardDefinitions[instance.definitionId]!}
                selected={selectingGraveyardTarget}
                onHover={onHover}
                onClick={
                  selectingGraveyardTarget ? () => onGraveyardCardClick(instance.instanceId) : undefined
                }
                small
              />
            ))}
          </div>
        </div>
      </div>

      {/* DOM order is always hand, lands, others, creatures. The CSS reverses
          it for your own side so creatures end up nearest the centre line for
          both players - see .side__zones in styles.css. */}
      <div className="side__zones">
        <div className="row row--hand">
          <div className="zone__label">Hand ({player.hand.length})</div>
          <div className="row__cards">
            {player.hand.map((instance) => (
              <CardView
                key={instance.instanceId}
                instance={instance}
                definition={cardDefinitions[instance.definitionId]!}
                playable={canPlay?.(instance.instanceId)}
                onHover={onHover}
                onClick={() => onHandCardClick(instance.instanceId)}
              />
            ))}
          </div>
        </div>

        <div className={`row row--lands ${targetingClass("Land")}`}>
          <div className="zone__label">Lands ({lands.length})</div>
          <div className="row__cards">
            {lands.map((instance) => (
              <CardView
                key={instance.instanceId}
                instance={instance}
                definition={cardDefinitions[instance.definitionId]!}
                onHover={onHover}
                onClick={() => onBattlefieldCardClick(instance.instanceId)}
                small
              />
            ))}
          </div>
        </div>

        {otherPermanents.length > 0 && (
          <div
            className={`row row--other ${targetingClass("Artifact")} ${targetingClass("Enchantment")}`.trim()}
          >
            <div className="zone__label">Other permanents</div>
            <div className="row__cards">
              {otherPermanents.map((instance) => (
                <CardView
                  key={instance.instanceId}
                  instance={instance}
                  definition={cardDefinitions[instance.definitionId]!}
                  onHover={onHover}
                  onClick={() => onBattlefieldCardClick(instance.instanceId)}
                  small
                />
              ))}
            </div>
          </div>
        )}

        <div className="row row--creatures">
          <div className="zone__label">Creatures ({creatures.length})</div>
          <div className="row__cards">
            {creatures.map((instance) => (
              <CardView
                key={instance.instanceId}
                instance={instance}
                state={state}
                definition={cardDefinitions[instance.definitionId]!}
                selected={
                  selectedAttackerIds.has(instance.instanceId) ||
                  attackingIds.has(instance.instanceId) ||
                  selectedBlockerSourceId === instance.instanceId ||
                  assignedBlockerIds.has(instance.instanceId)
                }
                badge={combatBadge(instance.instanceId)}
                onHover={onHover}
                onClick={() => onBattlefieldCardClick(instance.instanceId)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
