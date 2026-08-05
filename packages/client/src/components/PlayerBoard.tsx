import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CardDefinition, CardType, GameState, Player } from "@mtg-commander-sim/engine";
import { CardView } from "./CardView.js";
import { ZonePile } from "./ZonePile.js";
import { CardRow } from "./CardRow.js";
import { libraryAnchorKey } from "../flight.js";
import { landCardHeight } from "../landSize.js";
import { emitParticles } from "../particleBus.js";

/** How long a life change stays flagged up before fading. */
const LIFE_FLASH_MS = 1000;

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

        {/* Concede sits here, immediately above the piles, and nowhere else all
            game. See ConcedeButton: it ends the game outright, so its position
            must not depend on which buttons happen to be showing. */}
        {concede}

        <div className="rail__piles">
          {/* The library is face-down and can't be looked through, so it is a
              card back and a count rather than a ZonePile. It earns its place
              twice over: how many cards are left is real information in a long
              game, and it gives drawn cards somewhere to fly from - without a
              library on screen, a draw has no honest starting point and the
              card would have to appear in hand out of nowhere. */}
          <div className="pile">
            <div className="zone__label">Library</div>
            <div
              className="pile__back"
              data-flight-anchor={libraryAnchorKey(player.id)}
              title={`${player.library.length} cards left`}
            >
              <span className="pile__back-count">{player.library.length}</span>
            </div>
          </div>
          <ZonePile
            label="Graveyard"
            ownerLabel={player.id}
            cards={player.graveyard}
            cardDefinitions={cardDefinitions}
            selecting={selectingGraveyardTarget}
            onCardClick={selectingGraveyardTarget ? onGraveyardCardClick : undefined}
            onHover={onHover}
          />
          {/* Exile only appears once something is in it - an always-empty box
              in a narrow rail is just clutter. */}
          {player.exile.length > 0 && (
            <ZonePile
              label="Exile"
              ownerLabel={player.id}
              cards={player.exile}
              cardDefinitions={cardDefinitions}
              onHover={onHover}
            />
          )}
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
          <div className="zone zone--hand">
            <CardRow className="row__cards">
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
