import { cardsToBottom, canMulliganAgain, type CardInstance, type GameState } from "@mtg-commander-sim/engine";
import { definitionOf } from "./evaluate.js";

/**
 * Whether the bot keeps the seven cards it is looking at, and which ones it
 * sends back afterwards.
 *
 * The whole decision is about land count, because at this stage that is very
 * nearly the whole decision for a real player too. A hand with one land does
 * not function; a hand with six lands does nothing. Everything else - curve,
 * colours, whether the cards are any good - matters far less than being able
 * to cast things at all, and a deck here is mono-coloured so colour screw
 * cannot happen.
 */

/** Below this a hand cannot reliably make its land drops. */
const FEWEST_LANDS = 2;

/** Above this the hand is mostly lands and will run out of things to do. */
const MOST_LANDS = 5;

function isLand(state: GameState, card: CardInstance): boolean {
  return definitionOf(state, card)?.types.includes("Land") ?? false;
}

function landsInHand(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;
  return player.hand.filter((card) => isLand(state, card)).length;
}

/**
 * True if this hand is worth keeping.
 *
 * The window widens as the hand gets smaller, which is what a person does
 * too: a five-card hand with one land is bad, but it is better than a
 * four-card hand, and at some point you stop being able to afford to be
 * fussy. By the time it would be keeping three the bot takes whatever it has.
 */
export function shouldKeepHand(state: GameState, playerId: string): boolean {
  if (!canMulliganAgain(state)) return true;

  const keeping = state.players.find((p) => p.id === playerId)!.hand.length - cardsToBottom(state);
  if (keeping <= 4) return true;

  const lands = landsInHand(state, playerId);
  // One extra land either side of acceptable, once we are down to five.
  const slack = keeping <= 5 ? 1 : 0;
  return lands >= FEWEST_LANDS - slack && lands <= MOST_LANDS + slack;
}

/**
 * Which cards go to the bottom, having kept.
 *
 * Sheds surplus lands first and the most expensive spells after that - the
 * cards least likely to be cast in the early turns that a mulliganed hand has
 * to survive. Never sheds below the minimum land count, because bottoming your
 * way out of a functioning hand is worse than keeping an awkward one.
 */
export function chooseCardsToBottom(state: GameState, playerId: string): string[] {
  const count = cardsToBottom(state);
  if (count === 0) return [];

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return [];

  const lands = player.hand.filter((card) => isLand(state, card));
  const spells = player.hand.filter((card) => !isLand(state, card));

  const surplusLands = lands.slice(FEWEST_LANDS + 1);
  const expensiveFirst = [...spells].sort(
    (a, b) =>
      (definitionOf(state, b)?.manaCost?.generic ?? 0) - (definitionOf(state, a)?.manaCost?.generic ?? 0),
  );

  const order = [...surplusLands, ...expensiveFirst, ...lands];
  const chosen: string[] = [];
  for (const card of order) {
    if (chosen.length === count) break;
    if (!chosen.includes(card.instanceId)) chosen.push(card.instanceId);
  }
  return chosen;
}
