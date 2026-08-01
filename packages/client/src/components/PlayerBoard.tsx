import type { CardDefinition, CardType, GameState, Player } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";

export interface PlayerBoardProps {
  player: Player;
  /** Needed so battlefield creatures can show their *current* stats, anthems included. */
  state: GameState;
  cardDefinitions: Record<string, CardDefinition>;
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
  onLifeClick: () => void;
}

export function PlayerBoard({
  player,
  state,
  cardDefinitions,
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
  const manaPoolSummary = Object.entries(player.manaPool)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([color, amount]) => `${amount}${color === "generic" ? "" : color}`)
    .join(" ");

  return (
    <section className={`board ${isActivePlayer ? "board--active" : ""}`}>
      <header className="board__header">
        <span className="board__name">{player.id}</span>
        <span className="board__life" onClick={onLifeClick} title="Click to target this player">
          Life: {player.life}
        </span>
        {manaPoolSummary && <span className="board__mana">Mana: {manaPoolSummary}</span>}
        {Object.entries(player.commanderDamageTaken).map(([cmdId, dmg]) => (
          <span key={cmdId} className="board__commander-damage">
            Commander dmg: {dmg}/21
          </span>
        ))}
        {hasPriority && <span className="board__priority-badge">Priority</span>}
        {player.hasLost && <span className="board__lost-badge">LOST: {player.lossReason}</span>}
      </header>

      <div className="zone zone--command">
        <div className="zone__label">Command Zone</div>
        <div className="zone__cards">
          {player.command.map((instance) => (
            <CardView
              key={instance.instanceId}
              instance={instance}
              definition={cardDefinitions[instance.definitionId]!}
              onClick={() => onCommandCardClick(instance.instanceId)}
            />
          ))}
        </div>
      </div>

      <div className="zone zone--battlefield">
        <div className={`zone__group ${targetingClass("Land")}`}>
          <div className="zone__label">Lands</div>
          <div className="zone__cards">
            {lands.map((instance) => (
              <CardView
                key={instance.instanceId}
                instance={instance}
                definition={cardDefinitions[instance.definitionId]!}
                onClick={() => onBattlefieldCardClick(instance.instanceId)}
              />
            ))}
          </div>
        </div>
        <div className="zone__group">
          <div className="zone__label">Creatures</div>
          <div className="zone__cards">
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
                onClick={() => onBattlefieldCardClick(instance.instanceId)}
              />
            ))}
          </div>
        </div>
        {otherPermanents.length > 0 && (
          <div
            className={`zone__group ${targetingClass("Artifact")} ${targetingClass("Enchantment")}`.trim()}
          >
            <div className="zone__label">Other permanents</div>
            <div className="zone__cards">
              {otherPermanents.map((instance) => (
                <CardView
                  key={instance.instanceId}
                  instance={instance}
                  definition={cardDefinitions[instance.definitionId]!}
                  onClick={() => onBattlefieldCardClick(instance.instanceId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="zone zone--hand">
        <div className="zone__label">Hand ({player.hand.length})</div>
        <div className="zone__cards">
          {player.hand.map((instance) => (
            <CardView
              key={instance.instanceId}
              instance={instance}
              definition={cardDefinitions[instance.definitionId]!}
              onClick={() => onHandCardClick(instance.instanceId)}
            />
          ))}
        </div>
      </div>

      <div className={`zone zone--graveyard ${selectingGraveyardTarget ? "zone--targeting" : ""}`}>
        <div className="zone__label">Graveyard ({player.graveyard.length})</div>
        <div className="zone__cards">
          {player.graveyard.map((instance) => (
            <CardView
              key={instance.instanceId}
              instance={instance}
              definition={cardDefinitions[instance.definitionId]!}
              selected={selectingGraveyardTarget}
              onClick={selectingGraveyardTarget ? () => onGraveyardCardClick(instance.instanceId) : undefined}
              small
            />
          ))}
        </div>
      </div>
    </section>
  );
}
