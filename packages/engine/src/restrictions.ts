import type { ActionRestriction, CardDefinition, CardType, ChosenOnEntry, GameState } from "./types.js";
import { requireDefinition, requirePlayer } from "./state.js";

/**
 * The hate pieces: cards that forbid an action outright rather than doing
 * something themselves.
 *
 * Every other continuous effect in this engine *changes* something - a power, a
 * keyword, whether a permanent enters tapped. These change whether an action may
 * be taken at all, which is a different question asked in a different place: at
 * the moment somebody tries to cast, activate or draw.
 *
 * Deliberately a closed list of the phrases real cards print, in the same spirit
 * as `BoardCondition` and `Countable`. A general "forbid any action matching a
 * predicate" language would be quicker to write and impossible to read back
 * against a card, and this pool's whole posture is that a fixture must be exact
 * or absent.
 *
 * **Restrictions are not optional and cannot be paid around.** "Can't" beats
 * "can" in Magic's rules, so nothing here takes a cost or an override - a
 * restriction that applies simply refuses.
 */

/** One restriction, and who put it there - the "your" in "your opponents". */
interface ActiveRestriction {
  restriction: ActionRestriction;
  controllerId: string;
  /**
   * What was chosen as the permanent entered, for the one restriction that
   * reads it - Sanctum Prelate's number. Absent for a turn restriction, which
   * has no permanent, and for every card that is never asked.
   */
  chosen?: ChosenOnEntry;
}

/**
 * Everything currently forbidding something, from permanents on the battlefield
 * and from spells that restricted the rest of the turn (Silence).
 *
 * Read fresh each time rather than cached: a Grand Abolisher that dies mid-turn
 * stops restricting immediately, and a cache would be one more thing to
 * invalidate correctly.
 */
export function activeRestrictions(state: GameState): ActiveRestriction[] {
  const found: ActiveRestriction[] = [];
  for (const player of state.players) {
    for (const instance of player.battlefield) {
      const def = requireDefinition(state, instance.definitionId);
      for (const restriction of def.staticRestrictions ?? []) {
        found.push({ restriction, controllerId: instance.controllerId, chosen: instance.chosenOnEntry });
      }
    }
  }
  found.push(...state.turnRestrictions);
  return found;
}

/** Whether a restriction owned by `controllerId` currently binds `playerId`. */
function applies(state: GameState, active: ActiveRestriction, playerId: string): boolean {
  const { restriction, controllerId } = active;
  // "**During your turn**, your opponents can't ..." - Grand Abolisher. Off
  // entirely on anybody else's turn, which is the whole shape of the card.
  const duringYourTurnOnly =
    (restriction.kind === "opponents-cannot-cast" || restriction.kind === "cannot-activate") &&
    restriction.duringYourTurnOnly === true;
  if (duringYourTurnOnly && state.players[state.activePlayerIndex]?.id !== controllerId) return false;

  switch (restriction.kind) {
    case "opponents-cannot-cast":
    case "opponents-cast-from-hand-only":
      return playerId !== controllerId;
    case "cannot-activate":
      return restriction.who === "each-player" || playerId !== controllerId;
    default:
      // "**Each player** can't cast more than one spell each turn" - symmetrical,
      // and it binds the controller too. Archon of Emeria is a real cost to its
      // own deck, and a version that exempted its controller would be a
      // different and much better card.
      return true;
  }
}

/** How many spells this player has already cast this turn, in the category asked about. */
function castCount(typesCast: CardType[][], only?: "noncreature" | "nonartifact"): number {
  if (!only) return typesCast.length;
  const barred: CardType = only === "noncreature" ? "Creature" : "Artifact";
  return typesCast.filter((types) => !types.includes(barred)).length;
}

/**
 * Why this player may not cast this card right now, or undefined if they may.
 *
 * A sentence rather than a boolean, because it is shown: the client refuses an
 * illegal action out loud, and "you can't do that" with no reason is the single
 * most annoying thing a rules engine does.
 */
export function castRestrictionProblem(
  state: GameState,
  playerId: string,
  def: CardDefinition,
  fromZone: string,
): string | undefined {
  const player = requirePlayer(state, playerId);
  for (const active of activeRestrictions(state)) {
    if (!applies(state, active, playerId)) continue;
    const { restriction } = active;

    if (restriction.kind === "opponents-cannot-cast") {
      if (restriction.only === "noncreature" && def.types.includes("Creature")) continue;
      return restriction.duringYourTurnOnly
        ? "You can't cast spells during that player's turn"
        : "You can't cast spells this turn";
    }

    if (restriction.kind === "opponents-cast-from-hand-only" && fromZone !== "hand") {
      // Commanders are the reason this is worth having: Drannith Magistrate
      // turns the command zone off, which is most of what the card does in
      // this format.
      return "You can only cast spells from your hand";
    }

    if (restriction.kind === "cannot-cast-chosen-mana-value") {
      /*
       * Sanctum Prelate. A Prelate whose number has not been chosen yet
       * restricts nothing: defaulting to zero would switch off every
       * zero-cost spell in the format on the strength of a question nobody
       * has answered.
       */
      const chosen = active.chosen?.number;
      if (chosen === undefined) continue;
      if (restriction.only === "noncreature" && def.types.includes("Creature")) continue;
      if (manaValue(def) !== chosen) continue;
      return `Spells with mana value ${chosen} can't be cast`;
    }

    if (restriction.kind === "cast-limit") {
      if (restriction.only === "noncreature" && def.types.includes("Creature")) continue;
      if (restriction.only === "nonartifact" && def.types.includes("Artifact")) continue;
      const already = castCount(player.spellTypesCastThisTurn, restriction.only);
      if (already >= restriction.perTurn) {
        const what =
          restriction.only === "noncreature"
            ? "noncreature spell"
            : restriction.only === "nonartifact"
              ? "nonartifact spell"
              : "spell";
        // "one", not "1" - the message is shown to a player and the cards
        // print the word.
        const many = restriction.perTurn === 1 ? "one" : String(restriction.perTurn);
        return `You can't cast more than ${many} ${what}${restriction.perTurn === 1 ? "" : "s"} each turn`;
      }
    }
  }
  return undefined;
}

/** Why this player may not activate an ability of this permanent, or undefined. */
export function activateRestrictionProblem(
  state: GameState,
  playerId: string,
  def: CardDefinition,
): string | undefined {
  for (const active of activeRestrictions(state)) {
    if (!applies(state, active, playerId)) continue;
    const { restriction } = active;
    if (restriction.kind !== "cannot-activate") continue;
    if (!restriction.types.some((type) => def.types.includes(type))) continue;
    // Clarion Conqueror switches off Sol Ring as surely as it switches off a
    // creature's tap ability - a mana ability is an activated ability, and
    // exempting it would make the card far weaker than it reads.
    return `Activated abilities of ${restriction.types.map((t) => t.toLowerCase() + "s").join(", ")} can't be activated`;
  }
  return undefined;
}

/**
 * Whether this player may draw another card right now.
 *
 * Spirit of the Labyrinth. A draw that is forbidden simply does not happen -
 * it is not a draw from an empty library and must never look like one, or the
 * player would lose the game to a card that only says they cannot draw.
 */
export function mayDraw(state: GameState, playerId: string): boolean {
  const player = requirePlayer(state, playerId);
  for (const active of activeRestrictions(state)) {
    if (!applies(state, active, playerId)) continue;
    if (active.restriction.kind !== "draw-limit") continue;
    if (player.cardsDrawnThisTurn >= active.restriction.perTurn) return false;
  }
  return true;
}

/**
 * A card's mana value - the total cost, colours and generic together.
 *
 * {X} counts as zero, which is the rule everywhere except on the stack. No card
 * here asks about a spell's X while it is being cast, so the simple answer is
 * the right one.
 */
function manaValue(def: CardDefinition): number {
  const cost = def.manaCost;
  if (!cost) return 0;
  const colours = Object.values(cost.colors ?? {}).reduce((sum, n) => sum + (n ?? 0), 0);
  return (cost.generic ?? 0) + colours;
}
