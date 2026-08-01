import type { CardDefinition, GameState } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";

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
}

export function StackView({ state, cardDefinitions, selectingSpellTarget, onStackObjectClick }: StackViewProps) {
  return (
    <div className={`zone zone--stack ${selectingSpellTarget ? "zone--targeting" : ""}`}>
      <div className="zone__label">Stack ({state.stack.length})</div>
      <div className="zone__cards">
        {[...state.stack].reverse().map((obj) => {
          const instance = state.stackCards.find((c) => c.instanceId === obj.sourceInstanceId);
          if (!instance) {
            // A triggered/activated ability with no card of its own on the stack.
            return (
              <div key={obj.id} className="card card--ability">
                <div className="card__name">Ability ({obj.effect.kind})</div>
              </div>
            );
          }
          return (
            <CardView
              key={obj.id}
              instance={instance}
              definition={cardDefinitions[instance.definitionId]!}
              selected={selectingSpellTarget}
              onClick={selectingSpellTarget ? () => onStackObjectClick?.(obj.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
