import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CardDefinition, CardType, GameState, Player } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";
import { ZonePile } from "./ZonePile.js";
import { CardRow } from "./CardRow.js";
import { libraryAnchorKey } from "../flight.js";
import { landCardHeight } from "../landSize.js";
import { DEAL } from "../motion.js";
import { CARD_BACK_FAR, CARD_BACK_NEAR } from "../cardBacks.js";
import { play, primeSounds } from "../sound.js";
import { emitParticles } from "../particleBus.js";

/** How long a life change stays flagged up before fading. */
const LIFE_FLASH_MS = 1000;

/** How long this half of the table stays lit after taking the turn. */
const TAKE_TURN_MS = 700;

/**
 * One player's half of the table.
 *
 * The two halves face each other rather than repeating: the opponent's is
 * rendered upside-down in the sense that matters, with their hand at the far
 * edge of the screen and their creatures nearest the middle, so the two
 * creature rows meet in the centre where combat happens. That is one `flipped`
 * prop and a CSS direction flip, not a second component - the zones and their
 * behaviour are identical, only their order on screen differs.
 *
 * Layout, screen top to bottom:
 *
 *     opponent hand / lands / other permanents / creatures
 *     ------------------- centre: stack, actions -------------------
 *     your creatures / other permanents / lands / hand
 *
 * Life, mana, command zone, graveyard and exile live in a narrow rail down the
 * left for *both* players. Mirroring the rail as well as the rows was tried
 * and reverted: it pushed each player's cards to a different side of the
 * screen, so the two boards no longer lined up with each other.
 */

export interface PlayerBoardProps {
  player: Player;
  /** Needed so battlefield creatures can show their *current* stats, anthems included. */
  state: GameState;
  cardDefinitions: Record<string, CardDefinition>;
  /** True for the seat across the table, whose zones run in the opposite direction. */
  flipped?: boolean;
  /**
   * Draw this player's hand face-down. True for every seat but yours, always -
   * there is no mode left in which you are entitled to see another hand. Over
   * the network the cards arrive redacted anyway and this is what makes that
   * look deliberate rather than broken; against the bot the state is shared in
   * one tab, and this is the only thing between you and its hand.
   */
  hideHand?: boolean;
  isActivePlayer: boolean;
  hasPriority: boolean;
  selectedAttackerIds: Set<string>;
  /**
   * Creatures that *could* be declared as attackers right now, for the blue
   * "you may pick this" outline. Choosing one turns it orange - see
   * `attackChoice` on CardView.
   */
  eligibleAttackerIds: Set<string>;
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
  onHover?: (definitionId: string | null, ownerId?: string, instanceId?: string) => void;
  onLifeClick: () => void;
  /**
   * Permanents that would be tapped to pay for whatever card is currently
   * under the cursor. Shown before you commit, because the engine taps for you
   * and tapping cannot be taken back - see planManaPayment.
   */
  willTapIds?: Set<string>;
  /**
   * The game's controls, slotted into the gap under this board's command zone.
   * Only the bottom seat is given any - see ActionBar for why they live in one
   * fixed place rather than following whoever is being asked.
   */
  actions?: ReactNode;
  /** Concede, pinned above the piles in the rail. Bottom seat only, like `actions`. */
  concede?: ReactNode;
}

export function PlayerBoard({
  player,
  state,
  cardDefinitions,
  flipped,
  hideHand,
  isActivePlayer,
  hasPriority,
  selectedAttackerIds,
  eligibleAttackerIds,
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
  actions,
  concede,
  willTapIds,
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
  const [backArtFailed, setBackArtFailed] = useState(false);
  const backArt = backArtFailed ? null : flipped ? CARD_BACK_FAR : CARD_BACK_NEAR;

  /*
   * Dealing the opening hand.
   *
   * The mulligan overlay closes and seven cards were simply *there*, which is
   * the one moment in the game where nothing had moved to put them in your
   * hand - every other card arrives by flying out of the library. They now
   * arrive one at a time from the left, on a stagger.
   *
   * Triggered off the mulligan ending rather than off the hand filling up,
   * because the hand fills and empties constantly and only this once is it a
   * deal. `state.mulligan` is non-null for the whole of the mulligan, for both
   * seats, and null the instant both have kept - see the engine's mulligan.ts.
   */
  const [dealing, setDealing] = useState(false);
  const wasMulliganing = useRef(state.mulligan != null);
  useEffect(() => {
    const mulliganing = state.mulligan != null;
    const finished = wasMulliganing.current && !mulliganing;
    wasMulliganing.current = mulliganing;
    if (!finished) return;
    setDealing(true);

    /*
     * One card slide per card, on the same stagger the animation uses, so the
     * sound and the movement are the same event rather than two.
     *
     * Near seat only. Both hands deal at once and fourteen slides inside a
     * second is a riffle rather than a deal - and it is your hand you are
     * watching. Priming here as well because keeping an opening hand is a
     * click, which is what a browser needs before it will start any audio.
     */
    const cues: number[] = [];
    if (!flipped) {
      primeSounds();
      for (let i = 0; i < player.hand.length; i++) {
        cues.push(window.setTimeout(() => play("draw"), DEAL.step * i));
      }
    }

    const timer = window.setTimeout(
      () => setDealing(false),
      DEAL.step * Math.max(player.hand.length - 1, 0) + DEAL.card + 60,
    );
    return () => {
      window.clearTimeout(timer);
      for (const id of cues) window.clearTimeout(id);
    };
  }, [state.mulligan, player.hand.length, flipped]);
  const inDamageStep = state.step === "combat-damage" || state.step === "first-strike-damage";

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
  /*
   * A life total changing is the single easiest thing on the board to miss -
   * it is a small number in a corner, and it is also the number the whole game
   * is about. So the change is announced twice: the box flashes green or red,
   * and the amount floats up out of it.
   *
   * The size of the change has to be worked out here rather than during
   * render, because by the time React re-renders after the effect the old
   * total is gone.
   */
  const lastLife = useRef(player.life);
  const flashCount = useRef(0);
  const lifeElement = useRef<HTMLButtonElement | null>(null);
  const [lifeFlash, setLifeFlash] = useState<{ delta: number; key: number } | null>(null);
  useEffect(() => {
    const delta = player.life - lastLife.current;
    lastLife.current = player.life;
    if (delta === 0) return;
    const key = ++flashCount.current;
    setLifeFlash({ delta, key });

    /*
     * A burst off the life total when it goes down.
     *
     * Creatures taking damage already spark (see CardView), but the damage that
     * actually decides the game - the damage that gets through to a player -
     * had nothing but a number changing quietly in the corner. Scaled by the
     * size of the hit, so a 12-point swing does not look like a 1-point one.
     *
     * Gaining life is deliberately left alone: it is already announced by the
     * green flash and the floating number, and lifegain is common enough in
     * this pool that sparking for it would be constant.
     */
    if (delta < 0) {
      const rect = lifeElement.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        emitParticles({
          kind: "impact",
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          strength: Math.abs(delta),
        });
      }
    }

    const timer = window.setTimeout(
      () => setLifeFlash((current) => (current?.key === key ? null : current)),
      LIFE_FLASH_MS,
    );
    return () => window.clearTimeout(timer);
  }, [player.life]);

  const manaPoolSummary = Object.entries(player.manaPool)
    .filter(([, amount]) => (amount ?? 0) > 0)
    .map(([color, amount]) => `${amount}${color === "generic" ? "" : color}`)
    .join(" ");

  /*
   * The moment this half of the table takes the turn, as distinct from holding
   * it. The steady blue edge says whose turn it is and is on for the whole
   * turn; this fires once as it arrives and is gone in under a second.
   *
   * Keyed off the turn number rather than off `isActivePlayer` alone, because
   * in a two-player game the flag is true for exactly one whole turn and a
   * plain transition would have nothing to re-trigger on.
   */
  const [taking, setTaking] = useState(false);
  const lastTurnHeld = useRef<number | null>(null);
  useEffect(() => {
    if (!isActivePlayer) return;
    if (lastTurnHeld.current === state.turnNumber) return;
    const first = lastTurnHeld.current === null;
    lastTurnHeld.current = state.turnNumber;
    /*
     * Turn one is the game opening rather than a handover, and flashing the
     * board as the table appears reads as a loading glitch.
     *
     * Keyed off the turn number and not merely off "first time this component
     * saw itself active", which is what this was at first and which was wrong:
     * each side sees itself become active for the first time on a different
     * turn, so the guard swallowed the opponent's opening turn as well. Caught
     * in the browser - the near seat lit up on its turns and the far seat
     * never did.
     */
    if (first && state.turnNumber <= 1) return;
    setTaking(true);
    const timer = window.setTimeout(() => setTaking(false), TAKE_TURN_MS);
    return () => window.clearTimeout(timer);
  }, [isActivePlayer, state.turnNumber]);

  return (
    <section
      className={[
        "side",
        flipped ? "side--flipped" : "",
        isActivePlayer ? "side--active" : "",
        taking ? "side--taking-turn" : "",
        player.hasLost ? "side--lost" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="rail">
        {/*
            Concede, first thing in the rail and above the player's own name.

            It has now been in three places. At the end of the action bar it sat
            under whichever confirm button happened to be showing, so the button
            that ends the game moved *to* where the cursor had just been. Pinned
            above the piles it stopped moving with the buttons but still drifted
            with the rail's own contents - commander damage rows appear as a
            game goes on. The top of the rail is the only spot with nothing
            above it to push it, so it is in the same pixel on turn one and turn
            thirty. See ConcedeButton.
        */}
        {concede}

        <div className="rail__identity">
          <span className="rail__name">{player.id}</span>
          {hasPriority && <span className="rail__priority">Priority</span>}
          {isActivePlayer && <span className="rail__turn">Their turn</span>}
        </div>
        {/* Keyed on the life total so a change remounts the element, which is
            what makes a CSS animation play again rather than only the first
            time the class appears. */}
        <button
          key={player.life}
          ref={lifeElement}
          className={[
            "rail__life",
            lifeFlash && lifeFlash.delta > 0 ? "rail__life--up" : "",
            lifeFlash && lifeFlash.delta < 0 ? "rail__life--down" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onLifeClick}
          title="Click to target this player"
        >
          {player.life}
          <span className="rail__life-label">life</span>
          {/* A prevention shield is invisible until it silently eats damage,
              which is the worst way for a rules effect to work: you would only
              find out it had been there by the number not moving. */}
          {player.damagePrevention > 0 && (
            <span className="rail__shield" title="Damage that will be prevented this turn">
              shield {player.damagePrevention}
            </span>
          )}
          {lifeFlash && (
            <span
              className={`rail__life-delta ${lifeFlash.delta > 0 ? "rail__life-delta--up" : "rail__life-delta--down"}`}
            >
              {lifeFlash.delta > 0 ? `+${lifeFlash.delta}` : lifeFlash.delta}
            </span>
          )}
        </button>
        {/* Always rendered, even with an empty pool. It is where the mana pips
            fly to, and an anchor that only exists once you already have mana
            is no use for showing mana arriving. The dash is also a steadier
            thing to read than a line that appears and vanishes. */}
        <div className="rail__mana" data-mana-anchor={player.id}>
          Mana: {manaPoolSummary || "-"}
        </div>
        {Object.entries(player.commanderDamageTaken).map(([cmdId, dmg]) => (
          <div key={cmdId} className="rail__cmd-damage">
            Cmd dmg {dmg}/21
          </div>
        ))}
        {player.hasLost && <div className="rail__lost">LOST: {player.lossReason}</div>}

        {/*
            Graveyard and library side by side, the same size; exile a chip
            above them.

            All three shared one row once, which left each at 46px. The library
            then took the full width of the rail at 82px with the graveyard
            small above it, which read as two unrelated things rather than as
            two piles on the same table. They are now a matched pair, half the
            rail each.

            Half the rail is what sets the size: 62px of width, and 5:7 turns
            that into 87px of card. Stacking them at the library's old 82px
            instead would want 264px of rail for the pair and there are 157px
            going - it is width, not height, that this column is short of, so
            side by side is the arrangement that makes them big, not the one
            that makes them small. Exile gives up its picture to pay for it: it
            is the one of the three you can go a whole game without opening.
        */}
        <div className="rail__piles">
          {/* Only once something is in it - an always-empty box in a narrow
              rail is just clutter. */}
          {player.exile.length > 0 && (
            <ZonePile
              compact
              label="Exile"
              ownerLabel={player.id}
              cards={player.exile}
              cardDefinitions={cardDefinitions}
              onHover={onHover}
            />
          )}

          <div className="rail__piles-row">
            <ZonePile
              label="Graveyard"
              ownerLabel={player.id}
              cards={player.graveyard}
              cardDefinitions={cardDefinitions}
              selecting={selectingGraveyardTarget}
              onCardClick={selectingGraveyardTarget ? onGraveyardCardClick : undefined}
              onHover={onHover}
            />

            {/* The library is face-down and can't be looked through, so it is a
                card back and a count rather than a ZonePile. It also gives
                drawn cards somewhere to fly from - without a library on screen,
                a draw has no honest starting point and the card would have to
                appear in hand out of nowhere. */}
            <div className="pile pile--library">
              <div className="zone__label">Library</div>
              <div
                className="pile__back"
                data-flight-anchor={libraryAnchorKey(player.id)}
                title={`${player.library.length} cards left`}
              >
                {/* The two decks are told apart by their backs, the way two
                    real players' sleeves are: the light back is always the near
                    seat (you), the dark one always the far seat. Keyed off
                    `flipped` rather than off any notion of "is this the bot",
                    because the far half of the table is the opponent's in every
                    mode.

                    If the file is not there the img removes itself and the
                    drawn back underneath shows through - see .pile__back in
                    styles.css for why that case is real rather than
                    defensive. */}
                {backArt && (
                  <img
                    className="pile__back-art"
                    src={backArt}
                    alt=""
                    draggable={false}
                    onError={() => setBackArtFailed(true)}
                  />
                )}
                <span className="pile__back-count">{player.library.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*
          Two bands, not four rows. Lands and non-creature permanents used to
          have a full-width row each and stood almost empty in it, which pushed
          the creatures - the row you actually read during combat - into a
          third of the space. They now sit beside the hand, smaller, in the
          room that was going spare there.

          DOM order is always base-then-creatures; the CSS reverses it for your
          own side so both players' creatures end up nearest the centre line.
          Zones are told apart by the colour of the band they sit in rather
          than by a label - see .zone--* in styles.css. Anyone playing can see
          what a creature is.
      */}
      <div className="side__zones">
        <div className="row row--base">
          {/* Lands on the left. They are the thing you count and tap most
              often, and reading left-to-right they come before the hand you
              are spending them from. */}
          <div
            className="row__aside"
            style={{ "--land-h": `${landCardHeight(lands.length + otherPermanents.length)}px` } as CSSProperties}
          >
            <div className={`zone zone--lands ${targetingClass("Land")}`}>
              <CardRow className="row__cards">
                {lands.map((instance) => (
                  <CardView
                    key={instance.instanceId}
                    instance={instance}
                    definition={cardDefinitions[instance.definitionId]!}
                    willTap={willTapIds?.has(instance.instanceId)}
                    onHover={onHover}
                    onClick={() => onBattlefieldCardClick(instance.instanceId)}
                    small
                  />
                ))}
              </CardRow>
            </div>

            {otherPermanents.length > 0 && (
              <div
                className={`zone zone--other ${targetingClass("Artifact")} ${targetingClass("Enchantment")}`.trim()}
              >
                <CardRow className="row__cards">
                  {otherPermanents.map((instance) => (
                    <CardView
                      key={instance.instanceId}
                      instance={instance}
                      definition={cardDefinitions[instance.definitionId]!}
                      willTap={willTapIds?.has(instance.instanceId)}
                      onHover={onHover}
                      onClick={() => onBattlefieldCardClick(instance.instanceId)}
                      small
                    />
                  ))}
                </CardRow>
              </div>
            )}
          </div>
          <div className={`zone zone--hand ${dealing ? "zone--dealing" : ""}`.trim()}>
            {/* The only fanned row on the table - this is the one you are
                actually holding.

                The opponent's is fanned identically but face-down. It is not a
                count in a corner: how many cards they are holding is real
                information you read constantly, and seven backs in an arc say
                it without you counting anything. `--deal-index` staggers the
                deal - see the note on dealing above. */}
            <CardRow className="row__cards" arc>
              {player.hand.map((instance, index) =>
                hideHand ? (
                  <div
                    key={instance.instanceId}
                    className="card card--facedown"
                    style={{ "--deal-index": index } as CSSProperties}
                    data-card-instance={instance.instanceId}
                    data-card-zone="hand"
                    data-card-owner={instance.ownerId}
                    aria-hidden="true"
                  >
                    {backArt && <img className="card__back-art" src={backArt} alt="" draggable={false} />}
                  </div>
                ) : (
                  <CardView
                    key={instance.instanceId}
                    instance={instance}
                    definition={cardDefinitions[instance.definitionId]!}
                    playable={canPlay?.(instance.instanceId)}
                    dealIndex={index}
                    onHover={onHover}
                    onClick={() => onHandCardClick(instance.instanceId)}
                  />
                ),
              )}
            </CardRow>
          </div>

        </div>

        <div className="row row--creatures">
          <div className="zone zone--creatures">
            <CardRow className="row__cards">
              {creatures.map((instance) => (
                <CardView
                  key={instance.instanceId}
                  instance={instance}
                  state={state}
                  definition={cardDefinitions[instance.definitionId]!}
                  selected={
                    selectedBlockerSourceId === instance.instanceId ||
                    assignedBlockerIds.has(instance.instanceId)
                  }
                  // Blue for "you could send this one", orange once it is
                  // going. Attackers no longer share the blockers' gold
                  // outline: during a combat you are reading both at once,
                  // and one colour for both sides said nothing.
                  attackChoice={
                    selectedAttackerIds.has(instance.instanceId) ||
                    attackingIds.has(instance.instanceId)
                      ? "chosen"
                      : eligibleAttackerIds.has(instance.instanceId)
                        ? "eligible"
                        : undefined
                  }
                  // Creatures in combat lean towards the centre line, so who is
                  // committed to the fight reads from the board itself rather
                  // than only from the outline colour.
                  attacking={attackingIds.has(instance.instanceId)}
                  blocking={assignedBlockerIds.has(instance.instanceId)}
                  // Only the creatures in the fight, and only while damage is
                  // being dealt. The step lasts for a priority round, so the
                  // class appears once and the animation plays once.
                  clashing={
                    inDamageStep &&
                    (attackingIds.has(instance.instanceId) ||
                      assignedBlockerIds.has(instance.instanceId))
                  }
                  // A creature can be a mana source too, so it gets the same
                  // "this is about to be tapped" mark as a land.
                  willTap={willTapIds?.has(instance.instanceId)}
                  badge={combatBadge(instance.instanceId)}
                  onHover={onHover}
                  onClick={() => onBattlefieldCardClick(instance.instanceId)}
                />
              ))}
            </CardRow>
          </div>
        </div>
      </div>

      {/*
        The right-hand column: command zone, and the gap under it.

        The column already existed - .side__zones was padded by the width of
        the rail so that "centred" meant centred on the board rather than in
        whatever the rail left over - and the commander is exactly the thing
        that wants a permanent home of its own: it is not in any other zone, it
        comes back here when it dies, and it is castable from here all game.

        It used to span the whole height of the board, which made the commander
        the tallest card on screen for no reason and left nothing beside the
        hand. Now the two children mirror the two rows on the left exactly -
        same flex ratios, same reversal for the flipped seat - so the command
        zone lines up with the creature row, and whatever is passed in as
        `actions` gets the gap beside the hand.
      */}
      <div className="side__right">
        <div className="side__controls">{actions}</div>

        <div className="command">
          <div className="zone__label">Command</div>
          <div className="command__cards">
            {player.command.length === 0 ? (
              <p className="command__empty">In play</p>
            ) : (
              player.command.map((instance) => (
                <CardView
                  key={instance.instanceId}
                  instance={instance}
                  definition={cardDefinitions[instance.definitionId]!}
                  playable={canPlay?.(instance.instanceId)}
                  onHover={onHover}
                  onClick={() => onCommandCardClick(instance.instanceId)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
