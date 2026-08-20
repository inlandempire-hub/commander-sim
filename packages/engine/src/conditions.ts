import type { BoardCondition, CardDefinition, Color, GameState } from "./types.js";
import { requirePlayer } from "./state.js";

/**
 * "Do you control a Swamp?", "do you have two or more opponents?" - the small
 * set of questions real cards ask about the board.
 *
 * Two unrelated-looking features turned out to ask exactly the same thing.
 * A tapland wants to know it as the land arrives ("enters tapped unless you
 * control two or more other lands"); an activation restriction wants to know it
 * every time somebody reaches for the ability ("activate only if you control a
 * Swamp"). Writing them separately would have meant two answers to one
 * question, and the day they disagreed the bug would be in whichever half
 * nobody was looking at.
 *
 * Deliberately a closed list rather than a predicate language. Four shapes
 * cover every card in the pool, and a fifth can be added the day one needs it -
 * which is a far better failure mode than a general condition language that
 * quietly accepts something it cannot really evaluate.
 */

/**
 * A permanent's colour, which is not the same thing as its colour identity.
 *
 * Colour comes from the mana cost: Forest is a colourless permanent even though
 * it taps for green, and its colour *identity* is green. Sapseep Forest asks
 * for "two or more green permanents", so reading identity here would have every
 * Forest on the board count towards it and the card would switch on a turn or
 * two early in a deck that plays nothing but green.
 */
export function cardColors(def: CardDefinition): Color[] {
  if (!def.manaCost) return [];
  return (Object.keys(def.manaCost.colors) as Color[]).filter(
    (color) => (def.manaCost?.colors[color] ?? 0) > 0,
  );
}

/**
 * Whether `playerId`'s board satisfies `condition` right now.
 *
 * `excludeInstanceId` leaves one permanent out of the count. Only the tapland
 * case uses it: the condition is checked with the land already on the
 * battlefield, so "two or more *other* lands" has to be able to say other.
 */
export function meetsBoardCondition(
  state: GameState,
  playerId: string,
  condition: BoardCondition,
  excludeInstanceId?: string,
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  const others = player.battlefield.filter((card) => card.instanceId !== excludeInstanceId);

  switch (condition.kind) {
    case "controls-other-lands":
      return (
        others.filter((card) => state.cardDefinitions[card.definitionId]?.types.includes("Land"))
          .length >= condition.count
      );
    case "opponents":
      return state.players.length - 1 >= condition.count;
    case "creatures-on-battlefield": {
      let creatures = 0;
      for (const p of state.players) {
        for (const c of p.battlefield) {
          if (state.cardDefinitions[c.definitionId]?.types.includes("Creature")) creatures += 1;
        }
      }
      return creatures >= condition.count;
    }
    case "card-types-in-graveyard": {
      const types = new Set<string>();
      for (const card of player?.graveyard ?? []) {
        for (const t of state.cardDefinitions[card.definitionId]?.types ?? []) types.add(t);
      }
      return types.size >= condition.count;
    }
    case "controls-subtype": {
      // "a Swamp or a Forest" - any one of them will do, and a dual counts for
      // both at once because this reads the type line rather than card names.
      const matching = others.filter((card) => {
        const def = state.cardDefinitions[card.definitionId];
        return condition.subtypes.some((subtype) => def?.subtypes?.includes(subtype));
      });
      return matching.length >= (condition.count ?? 1);
    }
    case "controls-color": {
      const matching = others.filter((card) => {
        const def = state.cardDefinitions[card.definitionId];
        return def ? cardColors(def).includes(condition.color) : false;
      });
      return matching.length >= condition.count;
    }
    case "controls-lands":
      /*
       * Every land, including the one that just arrived - which is why this
       * reads the whole battlefield rather than `others`. Scute Swarm's
       * landfall counts the land that set it off, and excluding it would make
       * the card switch on one land later than it does.
       */
      return (
        player.battlefield.filter((card) => state.cardDefinitions[card.definitionId]?.types.includes("Land"))
          .length >= condition.count
      );
    case "attached-to-a-creature": {
      // Asked of the permanent itself rather than of the board, so the one
      // being excluded is the one doing the asking - see the call site.
      if (!excludeInstanceId) return false;
      const self = player.battlefield.find((c) => c.instanceId === excludeInstanceId);
      if (!self?.attachedTo) return false;
      const host = player.battlefield.find((c) => c.instanceId === self.attachedTo);
      return host !== undefined && (state.cardDefinitions[host.definitionId]?.types.includes("Creature") ?? false);
    }
    case "controls-commander":
      /*
       * On the battlefield, which is what "control" means. A commander waiting
       * in the command zone is not controlled by anyone in play, and counting
       * it would make Deadly Rollick free from the opening hand of every game
       * - which is precisely the drawback the card is built around.
       */
      return others.some((card) => card.isCommander);
  }
}

/** The player whose board a condition is asked about is always the one reaching for the card. */
export function controllerMeets(
  state: GameState,
  playerId: string,
  condition: BoardCondition | undefined,
): boolean {
  if (!condition) return true;
  requirePlayer(state, playerId);
  return meetsBoardCondition(state, playerId, condition);
}
