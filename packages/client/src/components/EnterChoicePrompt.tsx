import { useState } from "react";
import type { ChosenOnEntry, EnterChoice, Keyword } from "@mtg-commander-sim/engine";

/**
 * "As this permanent enters, choose ..." - Cavern of Souls' creature type,
 * Sanctum Prelate's number, Greymond's two abilities.
 *
 * The game is genuinely stopped while this is up: nothing else can happen until
 * it is answered, so there is deliberately no way to dismiss it. That is the
 * same posture as the search picker and the confirmation prompt, and for the
 * same reason - an overlay you can close on a question the engine still needs
 * answered leaves a game nobody can continue.
 *
 * All five shapes are handled even though only `number` has a card in the pool
 * today, because the other four are the next cards in that batch and a prompt
 * that renders nothing for them would be a hung game rather than a missing
 * feature.
 */
export function EnterChoicePrompt({
  prompt,
  choice,
  cardName,
  onAnswer,
}: {
  prompt: string;
  choice: EnterChoice;
  cardName: string;
  onAnswer: (answer: ChosenOnEntry) => void;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`${cardName}: ${prompt}`}>
      <div className="overlay__panel enter-choice">
        <h2 className="enter-choice__title">{cardName}</h2>
        <p className="enter-choice__prompt">As it enters, {prompt}.</p>
        <ChoiceBody choice={choice} onAnswer={onAnswer} />
      </div>
    </div>
  );
}

/** The five printed shapes, each answered in the way its card asks. */
function ChoiceBody({
  choice,
  onAnswer,
}: {
  choice: EnterChoice;
  onAnswer: (answer: ChosenOnEntry) => void;
}) {
  switch (choice.kind) {
    case "number":
      return <NumberChoice max={choice.max} onAnswer={(n) => onAnswer({ number: n })} />;
    case "basic-land-type":
      return (
        <OptionRow
          options={BASIC_LAND_TYPES}
          onChoose={(type) => onAnswer({ basicLandType: type })}
        />
      );
    case "mode":
      return <OptionRow options={choice.options} onChoose={(mode) => onAnswer({ mode })} />;
    case "creature-type":
      return <CreatureTypeChoice onAnswer={(type) => onAnswer({ creatureType: type })} />;
    case "keywords":
      return (
        <KeywordChoice
          from={choice.from}
          count={choice.count}
          onAnswer={(keywords) => onAnswer({ keywords })}
        />
      );
  }
}

const BASIC_LAND_TYPES = ["Plains", "Island", "Swamp", "Mountain", "Forest"];

/**
 * The creature types worth offering as buttons. Not a complete list - Magic has
 * some three hundred - so the text field stays as the way to name anything
 * else. These are the ones this pool's tribal cards actually care about.
 */
const COMMON_CREATURE_TYPES = [
  "Human",
  "Ninja",
  "Goblin",
  "Soldier",
  "Warrior",
  "Cat",
  "Pest",
  "Elf",
  "Zombie",
  "Dragon",
];

function OptionRow({ options, onChoose }: { options: string[]; onChoose: (value: string) => void }) {
  return (
    <div className="enter-choice__options">
      {options.map((option) => (
        <button key={option} type="button" className="enter-choice__option" onClick={() => onChoose(option)}>
          {option}
        </button>
      ))}
    </div>
  );
}

/**
 * Sanctum Prelate's number.
 *
 * Offered as buttons rather than a free field, because the answer that matters
 * is always small - a number nothing in the deck costs is a legal choice and a
 * wasted card, and making it take two clicks is the right friction.
 */
function NumberChoice({ max, onAnswer }: { max: number; onAnswer: (n: number) => void }) {
  const quick = Array.from({ length: Math.min(max, 8) + 1 }, (_, i) => i);
  const [typed, setTyped] = useState("");
  return (
    <>
      <div className="enter-choice__options">
        {quick.map((n) => (
          <button key={n} type="button" className="enter-choice__option" onClick={() => onAnswer(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="enter-choice__other">
        <input
          type="number"
          min={0}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="or a higher number"
          aria-label="Choose a number"
        />
        <button
          type="button"
          disabled={typed === "" || Number(typed) < 0 || !Number.isInteger(Number(typed))}
          onClick={() => onAnswer(Number(typed))}
        >
          Choose
        </button>
      </div>
    </>
  );
}

function CreatureTypeChoice({ onAnswer }: { onAnswer: (type: string) => void }) {
  const [typed, setTyped] = useState("");
  return (
    <>
      <OptionRow options={COMMON_CREATURE_TYPES} onChoose={onAnswer} />
      <div className="enter-choice__other">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="or type a creature type"
          aria-label="Choose a creature type"
        />
        <button type="button" disabled={typed.trim() === ""} onClick={() => onAnswer(typed.trim())}>
          Choose
        </button>
      </div>
    </>
  );
}

/**
 * Greymond's "choose two abilities from among first strike, vigilance, and
 * lifelink" - a fixed number out of a printed list, so the button only unlocks
 * on exactly that many. The engine refuses a wrong count anyway; this stops the
 * player finding that out by being told no.
 */
function KeywordChoice({
  from,
  count,
  onAnswer,
}: {
  from: Keyword[];
  count: number;
  onAnswer: (keywords: Keyword[]) => void;
}) {
  const [picked, setPicked] = useState<Keyword[]>([]);
  const toggle = (keyword: Keyword) =>
    setPicked((current) =>
      current.includes(keyword) ? current.filter((k) => k !== keyword) : [...current, keyword],
    );
  return (
    <>
      <div className="enter-choice__options">
        {from.map((keyword) => (
          <button
            key={keyword}
            type="button"
            className={`enter-choice__option${picked.includes(keyword) ? " is-picked" : ""}`}
            aria-pressed={picked.includes(keyword)}
            onClick={() => toggle(keyword)}
          >
            {keyword}
          </button>
        ))}
      </div>
      <div className="enter-choice__other">
        <button type="button" disabled={picked.length !== count} onClick={() => onAnswer(picked)}>
          {picked.length === count ? "Choose" : `Pick ${count - picked.length} more`}
        </button>
      </div>
    </>
  );
}
