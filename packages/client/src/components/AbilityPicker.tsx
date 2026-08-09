/**
 * Which ability, for a permanent that has more than one.
 *
 * Clicking a permanent used to activate its *first* ability, always. That was
 * fine while the only multi-ability cards were dual lands, where the auto-tapper
 * picks the right half when paying for a spell and nobody clicks them by hand.
 * It stopped being fine the moment a card's interesting half was not the first
 * one: Swarmyard's regenerate, Twilight Mire's three filter modes, Delighted
 * Halfling's restricted mana. Those cards were in the pool and unreachable.
 *
 * Only abilities that would actually work are listed - see
 * `activatableAbilities` in the engine. A menu offering something that is then
 * refused is worse than no menu, because it teaches you not to trust it.
 */

export interface AbilityOption {
  index: number;
  /** The ability's rules text, as the card detail panel would print it. */
  text: string;
}

export interface AbilityPickerProps {
  cardName: string;
  options: AbilityOption[];
  onChoose: (index: number) => void;
  onCancel: () => void;
}

export function AbilityPicker({ cardName, options, onChoose, onCancel }: AbilityPickerProps) {
  return (
    <div className="overlay" role="dialog" aria-label={`Choose an ability of ${cardName}`}>
      <div className="overlay__panel overlay__panel--narrow">
        <div className="overlay__head">
          <strong>{cardName}</strong>
        </div>
        <p className="picker__prompt">Which ability?</p>
        <div className="ability-picker__list">
          {options.map((option) => (
            <button
              key={option.index}
              type="button"
              className="ability-picker__option"
              onClick={() => onChoose(option.index)}
            >
              {option.text}
            </button>
          ))}
        </div>
        <button type="button" className="ability-picker__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
