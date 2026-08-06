import { useEffect, useMemo, useState } from "react";
import {
  ARCHETYPES,
  TEST_CARD_DEFINITIONS,
  type CardDefinition,
  type CardType,
} from "@mtg-commander-sim/engine";
import { ManaCostView } from "../components/ManaCostView.js";
import {
  buildPool,
  filterPool,
  isBasicLand,
  typesInPool,
  BASIC_LAND_BY_COLOR,
  EMPTY_FILTERS,
  MAX_CURVE,
  type ColorFilter,
  type PoolCard,
  type PoolFilters,
} from "./cardPool.js";
import {
  addCard,
  artChoiceCount,
  canAdd,
  cardCounts,
  clearCommander,
  countOf,
  deckStatus,
  fillWithBasics,
  groupByType,
  manaCurve,
  removeCard,
  setCardArt,
  setCommander,
  setCount,
  swapCard,
  totalCards,
  COMMANDER_DECK_SIZE,
} from "./deckOps.js";
import {
  createDeck,
  deleteDeck,
  duplicateDeck,
  loadDecks,
  memoryStore,
  parseTags,
  saveDecks,
  upsertDeck,
  type KeyValueStore,
  type SavedDeck,
} from "./deckStorage.js";
import { deckSummary, exportDeckText, importDeckText, type ImportResult } from "./deckText.js";
import { ScryfallPanel } from "./ScryfallPanel.js";
import { ArtPicker } from "./ArtPicker.js";
import { CardArtStrip } from "./CardArtStrip.js";

/** How many pool results to render at once. Beyond this you should be filtering, not scrolling. */
const MAX_RESULTS = 150;

const COLOR_FILTERS: Array<{ value: ColorFilter; label: string }> = [
  { value: "W", label: "White" },
  { value: "U", label: "Blue" },
  { value: "B", label: "Black" },
  { value: "R", label: "Red" },
  { value: "G", label: "Green" },
  { value: "C", label: "Colourless" },
];

/**
 * localStorage can throw outright in a locked-down browser profile. Falling
 * back to memory means the builder still opens and works for the session,
 * rather than a white screen - it just won't remember anything afterwards.
 */
function openStore(): KeyValueStore {
  try {
    const probe = "mtg-commander-sim.probe";
    window.localStorage.setItem(probe, "1");
    return window.localStorage;
  } catch {
    return memoryStore();
  }
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function DeckBuilder() {
  const definitions = TEST_CARD_DEFINITIONS;
  const store = useMemo(openStore, []);
  const pool = useMemo(() => buildPool(definitions), [definitions]);
  const poolTypes = useMemo(() => typesInPool(pool), [pool]);

  const [decks, setDecks] = useState<SavedDeck[]>(() => loadDecks(store));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PoolFilters>(EMPTY_FILTERS);
  const [restrictToIdentity, setRestrictToIdentity] = useState(true);
  const [swapOutId, setSwapOutId] = useState<string | null>(null);
  const [textPanel, setTextPanel] = useState<"none" | "export" | "import">("none");
  const [importText, setImportText] = useState("");
  const [importReport, setImportReport] = useState<ImportResult | null>(null);
  const [opponent, setOpponent] = useState("random");
  /** The card whose art picker is open, if any. */
  const [artCardId, setArtCardId] = useState<string | null>(null);

  useEffect(() => {
    saveDecks(store, decks);
  }, [store, decks]);

  const deck = decks.find((d) => d.id === activeId) ?? null;
  const commanderDef = deck?.commanderId ? definitions[deck.commanderId] : undefined;
  const artCardDef = artCardId ? definitions[artCardId] : undefined;

  // The commander's colour identity is a filter you almost always want on, so
  // it's derived rather than something you have to keep in step by hand.
  const identity = restrictToIdentity ? commanderDef?.colorIdentity : undefined;
  const results = useMemo(
    () => filterPool(pool, { ...filters, identity }),
    [pool, filters, identity],
  );
  const status = deck ? deckStatus(deck, definitions) : null;

  function update(change: (current: SavedDeck) => SavedDeck) {
    if (!deck) return;
    setDecks((current) => upsertDeck(current, change(deck)));
  }

  function handleNewDeck() {
    const fresh = createDeck(`New deck ${decks.length + 1}`);
    setDecks((current) => [...current, fresh]);
    setActiveId(fresh.id);
  }

  function handlePoolClick(def: CardDefinition) {
    if (!deck) return;
    if (swapOutId) {
      update((current) => swapCard(current, swapOutId, def));
      setSwapOutId(null);
      return;
    }
    update((current) => addCard(current, def));
  }

  function handleImport() {
    const report = importDeckText(importText, definitions, "Imported deck");
    setImportReport(report);
    setDecks((current) => [...current, report.deck]);
    setActiveId(report.deck.id);
    setImportText("");
  }

  /**
   * Launches a game with this deck. The opponent is either one of the built-in
   * archetypes or another deck you saved - a saved opponent is passed by id as
   * `vsdeck`, an archetype by name as `vs`.
   *
   * Against the bot, which is the only single-browser mode there is - the
   * hotseat button that used to sit beside this one was removed with hotseat
   * itself (see main.tsx). To play a person, both of you open the client in
   * ?mode=network against a running server.
   */
  function handlePlay() {
    if (!deck) return;
    const params = new URLSearchParams({ mydeck: deck.id, mode: "bot" });

    const savedOpponent = decks.find((d) => d.id === opponent);
    if (savedOpponent) {
      params.set("vsdeck", savedOpponent.id);
    } else {
      params.set(
        "vs",
        opponent === "random"
          ? ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]!.name
          : opponent,
      );
    }
    window.location.search = `?${params.toString()}`;
  }

  /** A saved deck can only be an opponent once it's actually legal to play. */
  const playableOpponents = decks.filter((d) => d.id !== activeId && deckStatus(d, definitions).playable);

  return (
    <div className="builder">
      <header className="builder__bar">
        <h1 className="builder__title">Deck builder</h1>
        <select
          className="builder__select"
          value={activeId ?? ""}
          onChange={(e) => {
            setActiveId(e.target.value || null);
            setSwapOutId(null);
          }}
        >
          <option value="">- pick a deck -</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={handleNewDeck}>
          New
        </button>
        <button
          type="button"
          className="btn"
          disabled={!deck}
          onClick={() => {
            if (!deck) return;
            const copy = duplicateDeck(deck);
            setDecks((current) => [...current, copy]);
            setActiveId(copy.id);
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={!deck}
          onClick={() => {
            if (!deck) return;
            setDecks((current) => deleteDeck(current, deck.id));
            setActiveId(null);
          }}
        >
          Delete
        </button>
        <span className="builder__spacer" />
        <a className="btn" href="?">
          Back to the game
        </a>
      </header>

      {!deck && (
        <p className="builder__empty">
          {decks.length === 0
            ? "No decks yet. Press New to start one - the card browser and the text importer both appear once a deck is open."
            : "Pick a deck above, or press New."}
        </p>
      )}

      {deck && (
        <div className="builder__body">
          <section className="builder__browser">
            <div className="filters">
              <input
                className="filters__text"
                type="search"
                placeholder="Search implemented cards by name, type or rules text"
                value={filters.text}
                onChange={(e) => setFilters({ ...filters, text: e.target.value })}
              />
              <div className="filters__row">
                {COLOR_FILTERS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`chip ${filters.colors.includes(color.value) ? "chip--on" : ""}`}
                    onClick={() => setFilters({ ...filters, colors: toggle(filters.colors, color.value) })}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
              <div className="filters__row">
                {poolTypes.map((type: CardType) => (
                  <button
                    key={type}
                    type="button"
                    className={`chip ${filters.types.includes(type) ? "chip--on" : ""}`}
                    onClick={() => setFilters({ ...filters, types: toggle(filters.types, type) })}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="filters__row">
                <label className="filters__inline">
                  Mana value up to
                  <select
                    value={filters.manaValueMax ?? MAX_CURVE}
                    onChange={(e) => setFilters({ ...filters, manaValueMax: Number(e.target.value) })}
                  >
                    {Array.from({ length: MAX_CURVE + 1 }, (_, mv) => (
                      <option key={mv} value={mv}>
                        {mv === MAX_CURVE ? "any" : mv}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="filters__inline">
                  Sort
                  <select
                    value={filters.sort}
                    onChange={(e) =>
                      setFilters({ ...filters, sort: e.target.value as PoolFilters["sort"] })
                    }
                  >
                    <option value="name">Name</option>
                    <option value="mana-value">Mana value</option>
                  </select>
                </label>
                <label className="filters__inline">
                  <input
                    type="checkbox"
                    checked={filters.commandersOnly}
                    onChange={(e) => setFilters({ ...filters, commandersOnly: e.target.checked })}
                  />
                  Commanders only
                </label>
                <label className="filters__inline">
                  <input
                    type="checkbox"
                    checked={restrictToIdentity}
                    onChange={(e) => setRestrictToIdentity(e.target.checked)}
                  />
                  Only my colour identity
                </label>
                <label className="filters__inline">
                  <input
                    type="checkbox"
                    checked={filters.hideBasicLands}
                    onChange={(e) => setFilters({ ...filters, hideBasicLands: e.target.checked })}
                  />
                  Hide basic lands
                </label>
              </div>
            </div>

            {swapOutId && (
              <p className="builder__swap">
                Swapping out {definitions[swapOutId]?.name ?? swapOutId} - pick its replacement.{" "}
                <button type="button" className="btn btn--small" onClick={() => setSwapOutId(null)}>
                  Cancel
                </button>
              </p>
            )}

            <p className="builder__count">
              {results.length} of {pool.length} implemented cards
              {results.length > MAX_RESULTS ? `, showing the first ${MAX_RESULTS}` : ""}
            </p>

            <ul className="pool">
              {results.slice(0, MAX_RESULTS).map((card) => (
                <PoolRow
                  key={card.def.id}
                  card={card}
                  inDeck={countOf(deck, card.def.id)}
                  isCommander={deck.commanderId === card.def.id}
                  canAdd={canAdd(deck, card.def)}
                  onAdd={() => handlePoolClick(card.def)}
                  onMakeCommander={
                    card.def.canBeCommander
                      ? () => update((current) => setCommander(current, card.def, definitions))
                      : undefined
                  }
                />
              ))}
            </ul>

            <ScryfallPanel
              definitions={definitions}
              onAdd={handlePoolClick}
              canAdd={(def) => canAdd(deck, def)}
            />
          </section>

          <section className="builder__deck">
            <input
              className="builder__name"
              value={deck.name}
              onChange={(e) => update((current) => ({ ...current, name: e.target.value }))}
            />
            <input
              className="builder__tags"
              placeholder="Tags, comma separated"
              value={deck.tags.join(", ")}
              onChange={(e) => update((current) => ({ ...current, tags: parseTags(e.target.value) }))}
            />
            <p className="builder__summary">{deckSummary(deck, definitions)}</p>

            <div className={`status ${status?.playable ? "status--ok" : "status--bad"}`}>
              <strong>
                {totalCards(deck)}/{COMMANDER_DECK_SIZE} cards
                {status?.playable ? " - legal, ready to play" : " - not playable yet"}
              </strong>
              {status && status.errors.length > 0 && (
                <ul className="status__errors">
                  {status.errors.slice(0, 8).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {status.errors.length > 8 && <li>...and {status.errors.length - 8} more</li>}
                </ul>
              )}
            </div>

            <div className="builder__play">
              <label className="filters__inline">
                Opponent
                <select value={opponent} onChange={(e) => setOpponent(e.target.value)}>
                  <option value="random">Random</option>
                  {ARCHETYPES.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                  {playableOpponents.length > 0 && (
                    <optgroup label="Your decks">
                      {playableOpponents.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <button
                type="button"
                className="btn btn--play"
                disabled={!status?.playable}
                onClick={() => handlePlay()}
              >
                Play against the bot
              </button>
            </div>

            <div className="commander-slot">
              <h2>Commander</h2>
              {commanderDef ? (
                <p>
                  <strong>{commanderDef.name}</strong> <ManaCostView cost={commanderDef.manaCost} size={13} />
                  <br />
                  <span className="muted">
                    Colour identity: {commanderDef.colorIdentity.join("") || "colourless"}
                  </span>
                  <br />
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => update(clearCommander)}
                  >
                    Clear
                  </button>{" "}
                  <button
                    type="button"
                    className={`btn btn--small ${
                      deck.artOverrides?.[commanderDef.id] ? "btn--on" : ""
                    }`}
                    title="Choose which printing's artwork this deck shows"
                    onClick={() =>
                      setArtCardId((current) => (current === commanderDef.id ? null : commanderDef.id))
                    }
                  >
                    Art
                  </button>
                </p>
              ) : (
                <p className="muted">
                  None yet. Tick "Commanders only" in the filters and press "Make commander" on one.
                </p>
              )}
            </div>

            <Curve curve={manaCurve(deck, definitions)} />

            {commanderDef && commanderDef.colorIdentity.length > 0 && (
              <div className="basics">
                <h2>Basic lands</h2>
                {commanderDef.colorIdentity.map((color) => {
                  const basicId = BASIC_LAND_BY_COLOR[color];
                  const basicDef = definitions[basicId]!;
                  return (
                    <div key={color} className="basics__row">
                      <span>{basicDef.name}</span>
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => update((current) => removeCard(current, basicId))}
                      >
                        -
                      </button>
                      <input
                        className="basics__count"
                        type="number"
                        min={0}
                        value={countOf(deck, basicId)}
                        onChange={(e) =>
                          update((current) => setCount(current, basicDef, Number(e.target.value)))
                        }
                      />
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => update((current) => addCard(current, basicDef))}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={() => update((current) => fillWithBasics(current, basicId))}
                      >
                        Fill to {COMMANDER_DECK_SIZE}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="decklist">
              {groupByType(deck, definitions).map((section) => (
                <div key={section.type} className="decklist__section">
                  <h3>
                    {section.type} ({section.count})
                  </h3>
                  <ul>
                    {section.entries.map((entry) => (
                      <li
                        key={entry.def.id}
                        className={
                          status?.offIdentityIds.includes(entry.def.id) ? "decklist__row decklist__row--illegal" : "decklist__row"
                        }
                      >
                        <span className="decklist__count">{entry.count}</span>
                        <span className="decklist__name">{entry.def.name}</span>
                        <ManaCostView cost={entry.def.manaCost} size={12} className="decklist__cost" />
                        <button
                          type="button"
                          className="btn btn--small"
                          title="Remove one copy"
                          onClick={() => update((current) => removeCard(current, entry.def.id))}
                        >
                          -
                        </button>
                        {!isBasicLand(entry.def) && (
                          <button
                            type="button"
                            className={`btn btn--small ${swapOutId === entry.def.id ? "btn--on" : ""}`}
                            title="Replace this card with another"
                            onClick={() =>
                              setSwapOutId((current) => (current === entry.def.id ? null : entry.def.id))
                            }
                          >
                            Swap
                          </button>
                        )}
                        <button
                          type="button"
                          className={`btn btn--small ${
                            deck.artOverrides?.[entry.def.id] ? "btn--on" : ""
                          }`}
                          title="Choose which printing's artwork this deck shows"
                          onClick={() =>
                            setArtCardId((current) => (current === entry.def.id ? null : entry.def.id))
                          }
                        >
                          Art
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {cardCounts(deck).size === 0 && (
                <p className="muted">Nothing in the deck yet. Click a card on the left to add it.</p>
              )}
            </div>

            {artCardDef && (
              <ArtPicker
                definition={artCardDef}
                chosenId={deck.artOverrides?.[artCardDef.id]}
                onChoose={(scryfallId) =>
                  update((current) => setCardArt(current, artCardDef.id, scryfallId))
                }
                onClose={() => setArtCardId(null)}
              />
            )}

            {artChoiceCount(deck) > 0 && (
              <p className="muted">
                {artChoiceCount(deck) === 1
                  ? "1 card in this deck uses"
                  : `${artChoiceCount(deck)} cards in this deck use`}{" "}
                a printing other than the default. Art is cosmetic - it never changes what a card does.
              </p>
            )}

            <div className="builder__text">
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setTextPanel(textPanel === "export" ? "none" : "export")}
              >
                Export as text
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={() => setTextPanel(textPanel === "import" ? "none" : "import")}
              >
                Import from text
              </button>

              {textPanel === "export" && (
                <textarea
                  className="builder__textarea"
                  readOnly
                  rows={12}
                  value={exportDeckText(deck, definitions)}
                />
              )}

              {textPanel === "import" && (
                <>
                  <textarea
                    className="builder__textarea"
                    rows={12}
                    placeholder={"Commander\n1 Rorix Bladewing\n\nDeck\n1 Lightning Bolt\n37 Mountain"}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  />
                  <button type="button" className="btn" onClick={handleImport}>
                    Import as a new deck
                  </button>
                  {importReport && (
                    <div className="status status--bad">
                      {importReport.unknownNames.length > 0 && (
                        <p>
                          Not implemented in this engine, so left out:{" "}
                          {importReport.unknownNames.join(", ")}
                        </p>
                      )}
                      {importReport.overCopies.length > 0 && (
                        <p>
                          Cut to one copy each, since Commander is singleton:{" "}
                          {importReport.overCopies.join(", ")}
                        </p>
                      )}
                      {importReport.unknownNames.length === 0 &&
                        importReport.overCopies.length === 0 && <p>Imported cleanly.</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

interface PoolRowProps {
  card: PoolCard;
  inDeck: number;
  isCommander: boolean;
  canAdd: boolean;
  onAdd: () => void;
  onMakeCommander?: () => void;
}

function PoolRow({ card, inDeck, isCommander, canAdd, onAdd, onMakeCommander }: PoolRowProps) {
  return (
    <li className={`pool__card ${inDeck > 0 || isCommander ? "pool__card--in-deck" : ""}`}>
      <CardArtStrip definition={card.def} />
      <div className="pool__head">
        <span className="pool__name">{card.def.name}</span>
        <ManaCostView cost={card.def.manaCost} size={12} className="pool__cost" />
      </div>
      <div className="pool__type">
        {card.typeLine}
        {card.def.power !== undefined && ` ${card.def.power}/${card.def.toughness}`}
      </div>
      {card.rules.map((line, i) => (
        <div key={i} className="pool__rules">
          {line}
        </div>
      ))}
      <div className="pool__actions">
        <button type="button" className="btn btn--add" disabled={!canAdd} onClick={onAdd}>
          {isCommander ? "Commander" : inDeck > 0 ? `In deck (${inDeck})` : "Add"}
        </button>
        {onMakeCommander && !isCommander && (
          <button type="button" className="btn btn--small" onClick={onMakeCommander}>
            Make commander
          </button>
        )}
      </div>
    </li>
  );
}

function Curve({ curve }: { curve: number[] }) {
  const peak = Math.max(1, ...curve);
  return (
    <div className="curve">
      <h2>Mana curve</h2>
      <div className="curve__bars">
        {curve.map((count, mv) => (
          <div key={mv} className="curve__col" title={`${count} cards at mana value ${mv}`}>
            <div className="curve__bar" style={{ height: `${(count / peak) * 60}px` }} />
            <span className="curve__count">{count}</span>
            <span className="curve__label">{mv === MAX_CURVE ? `${MAX_CURVE}+` : mv}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
