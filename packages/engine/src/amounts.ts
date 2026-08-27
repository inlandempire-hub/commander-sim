import type { Amount, Countable, GameState, StackTarget } from "./types.js";
import { findInstance, requireDefinition, requirePlayer } from "./state.js";
import { effectivePower, effectiveToughness, hasCreatureType } from "./counters.js";
import { manaValue } from "./mana.js";

/**
 * Numbers an effect reads off the game when it resolves.
 *
 * The third and last kind of unknown number, and the only one the effects layer
 * has to understand:
 *
 *   {X}             settled as the spell is cast, substituted by x.ts
 *   event-amount    settled as the trigger fires, substituted by x.ts
 *   count           read at resolution, evaluated here
 *
 * The first two are substitutions precisely because they can never change after
 * they are fixed. This one can and does: "draw a card for each creature you
 * control with a +1/+1 counter on it" counts the board at the moment Inspiring
 * Call resolves, so killing one of those creatures in response really does take
 * a card away. Substituting it early would quietly make the card uncounterable
 * in the way that matters.
 */

export function evaluateAmount(
  state: GameState,
  controllerId: string,
  amount: Amount,
  what: string,
  /**
   * The permanent the effect belongs to. Only `counters-on-source` needs it -
   * every other count reads the board or the player - so it is optional, and
   * a count that needs one without being given one answers zero rather than
   * guessing.
   */
  sourceInstanceId?: string,
  /**
   * What the effect is pointed at. Only `target-power` needs it - every other
   * amount reads the board, the player or the source - so it is optional, and an
   * amount that needs targets without being given any answers zero rather than
   * guessing at a number.
   */
  targets?: StackTarget[],
): number {
  if (typeof amount === "number") return amount;
  // "...times N" (Peer into the Abyss reads the multiplier off the amount).
  if (amount.kind === "count") return countOf(state, controllerId, amount.of, sourceInstanceId) * (amount.times ?? 1);
  if (amount.kind === "source-power") {
    // "Eomer deals damage equal to **its** power" - the permanent the ability is
    // printed on, read at resolution so a pumped Eomer hits harder.
    const source = sourceInstanceId ? findInstance(state, sourceInstanceId) : undefined;
    return source ? effectivePower(state, source.instance) : 0;
  }
  if (amount.kind === "target-power") {
    // The first card target, which is the creature every card of this shape
    // points at. Effective power, so a pumped creature really is worth more life.
    const first = (targets ?? []).find((t) => t.kind === "card");
    if (!first || first.kind !== "card") return 0;
    const found = findInstance(state, first.instanceId);
    return found ? effectivePower(state, found.instance) : 0;
  }
  if (amount.kind === "target-toughness") {
    // "you gain life equal to **its toughness**" - Noxious Gearhulk, read off the
    // creature it destroyed while that creature is still captured as the target.
    const first = (targets ?? []).find((t) => t.kind === "card");
    if (!first || first.kind !== "card") return 0;
    const found = findInstance(state, first.instanceId);
    return found ? effectiveToughness(state, found.instance) : 0;
  }
  if (amount.kind === "target-mana-value") {
    // "gain life equal to **that card's mana value**" - Healing Technique.
    const first = (targets ?? []).find((t) => t.kind === "card");
    if (!first || first.kind !== "card") return 0;
    const found = findInstance(state, first.instanceId);
    return found ? manaValue(requireDefinition(state, found.instance.definitionId).manaCost ?? { generic: 0, colors: {} }) : 0;
  }
  /*
   * An unresolved X or event-amount reaching here means a fire site skipped
   * `resolveAmounts`. Loud, because the alternative is a board wipe that
   * silently does nothing and looks like a targeting bug. Same posture as
   * `requireNumber`, which this replaces at every site that has a state to
   * read.
   */
  throw new Error(`${what} still contains an unresolved ${amount.kind} - resolveAmounts was not called`);
}

function countOf(
  state: GameState,
  controllerId: string,
  of: Countable,
  sourceInstanceId?: string,
): number {
  const player = requirePlayer(state, controllerId);
  const creatures = player.battlefield.filter((instance) =>
    requireDefinition(state, instance.definitionId).types.includes("Creature"),
  );

  switch (of.what) {
    case "creatures": {
      return creatures.filter((instance) => {
        if (of.withCounter && instance.plusOneCounters <= 0) return false;
        // "for each **other** Human you control" - Eomer does not count himself.
        if (of.excludeSource && instance.instanceId === sourceInstanceId) return false;
        if (of.subtype && !hasCreatureType(state, instance, of.subtype)) return false;
        if (of.excludeSubtype) {
          const def = requireDefinition(state, instance.definitionId);
          if (def.subtypes?.includes(of.excludeSubtype)) return false;
        }
        return true;
      }).length;
    }
    case "greatest-power": {
      const eligible = creatures.filter((instance) => {
        if (!of.excludeSubtype) return true;
        return !requireDefinition(state, instance.definitionId).subtypes?.includes(of.excludeSubtype);
      });
      // No creatures means zero, not negative infinity - "draw cards equal to
      // the greatest power" with an empty board draws nothing.
      if (eligible.length === 0) return 0;
      // Effective power, so counters and anthems count. A card that read the
      // printed number would be a different card the moment anything pumped.
      return Math.max(...eligible.map((instance) => effectivePower(state, instance)));
    }
    case "counters-placed-this-turn":
      return player.plusOneCountersPlacedThisTurn;
    case "creature-cards-in-your-graveyard":
      return player.graveyard.filter((card) =>
        requireDefinition(state, card.definitionId).types.includes("Creature"),
      ).length;
    case "land-cards-in-your-graveyard":
      return player.graveyard.filter((card) =>
        requireDefinition(state, card.definitionId).types.includes("Land"),
      ).length;
    case "half-library-round-up":
      return Math.ceil(player.library.length / 2);
    case "half-life-round-up":
      // Life can be negative mid-resolution; never ask for negative life loss.
      return Math.max(0, Math.ceil(player.life / 2));
    case "counters-on-source": {
      // "For each counter on this creature" means every kind at once, which is
      // why this adds the piles rather than reading one of them.
      const source = sourceInstanceId ? findInstance(state, sourceInstanceId) : undefined;
      if (!source) return 0;
      return source.instance.plusOneCounters + source.instance.otherCounters;
    }
    case "life-gained-this-turn":
      return player.lifeGainedThisTurn;
    case "one-plus-instants-and-sorceries-cast-this-turn": {
      /*
       * `spellTypesCastThisTurn` is a list of the type lines of the spells this
       * player has cast this turn, kept for the hate pieces. A spell counts once
       * however many of the two types it has - no printed card is both - because
       * "instant and sorcery spells" counts spells rather than types.
       *
       * The "one plus" is part of the printed phrase, so it is added here: a
       * Rionya trigger with no spells cast still makes one copy.
       */
      const spells = player.spellTypesCastThisTurn.filter(
        (types) => types.includes("Instant") || types.includes("Sorcery"),
      ).length;
      return 1 + spells;
    }
    case "opponents":
      return state.players.filter((p) => p.id !== controllerId && !p.hasLost).length;
    case "cards-named-this-in-all-graveyards": {
      // By name, and across every graveyard on the table. The source is the
      // spell being resolved, which is still on the stack - so it is not one of
      // the copies it counts.
      const source = sourceInstanceId ? findInstance(state, sourceInstanceId) : undefined;
      if (!source) return 0;
      const name = requireDefinition(state, source.instance.definitionId).name;
      return state.players.reduce(
        (total, p) =>
          total +
          p.graveyard.filter((card) => requireDefinition(state, card.definitionId).name === name).length,
        0,
      );
    }
    case "attacking-creatures": {
      /*
       * "for each other attacking Goblin" - Goblin Rabblemaster.
       *
       * Every attacker on the table, not just this player's: `state.attackers`
       * is one map for the combat, and a card that says "attacking Goblin"
       * means any of them. Nothing in the pool attacks on somebody else's
       * behalf, so in practice they are the controller's - but reading the
       * combat rather than the battlefield is what makes the number fall as
       * attackers are removed from combat.
       */
      let total = 0;
      for (const attackerInstanceId of Object.keys(state.attackers)) {
        if (of.excludeSource && attackerInstanceId === sourceInstanceId) continue;
        const found = findInstance(state, attackerInstanceId);
        if (!found || found.instance.zone !== "battlefield") continue;
        if (of.subtype && !hasCreatureType(state, found.instance, of.subtype)) continue;
        total += 1;
      }
      return total;
    }
    case "players-who-have-lost":
      return state.players.filter((p) => p.hasLost).length;
    case "creatures-attacking-you":
      // `state.attackers` maps an attacker to the player it is attacking, so
      // this is a count of the entries pointed at us - not of our creatures,
      // and not of every attacker on the table.
      return Object.values(state.attackers).filter((defenderId) => defenderId === controllerId).length;
  }
}
