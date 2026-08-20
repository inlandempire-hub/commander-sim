import type { GameState, MulliganState } from "./types.js";
import { drawCard, log, requirePlayer, shuffleLibrary } from "./state.js";

/**
 * The London mulligan (rule 103.4).
 *
 * You always draw seven. If you don't like them, you shuffle all seven back
 * and draw seven more - but each time you do, you will have to put one card
 * from the hand you finally keep on the bottom of your library. So a player on
 * their second mulligan keeps five of the seven they are looking at.
 *
 * This is the current rule, and it is not the same as the older one people
 * often remember, where each mulligan drew one card fewer. That version is
 * strictly worse to mulligan under, because you were choosing blind; the
 * London version lets you see seven cards and then decide which to lose. The
 * difference matters for how the interface has to work, which is why the
 * bottoming step exists at all.
 *
 * The procedure runs one player at a time here. The real rule has everyone
 * decide together each round and bottom cards afterwards, which matters in a
 * four-player pod where you might read the table; in a two-player game against
 * a bot or one friend it produces exactly the same hands, and taking it in
 * turns is far easier to present on a single screen.
 */

/** Seven, always - the number drawn, not the number kept. */
export const OPENING_HAND_SIZE = 7;

/**
 * You can keep mulliganing until you would be keeping nothing at all. Past
 * that there is no decision left to make, so the engine stops offering one.
 */
const MOST_MULLIGANS = OPENING_HAND_SIZE;

export function createMulliganState(playerIds: string[]): MulliganState {
  return {
    playerId: playerIds[0] ?? "",
    order: [...playerIds],
    mulligansTaken: 0,
    bottoming: false,
  };
}

/** True while any player still has a mulligan decision outstanding. */
export function isMulliganInProgress(state: GameState): boolean {
  return state.mulligan !== null;
}

function requireMulligan(state: GameState, playerId: string): MulliganState {
  const mulligan = state.mulligan;
  if (!mulligan) throw new Error("No mulligan is in progress");
  if (mulligan.playerId !== playerId) {
    throw new Error(`It is ${mulligan.playerId}'s mulligan decision, not ${playerId}'s`);
  }
  return mulligan;
}

/** How many cards this player will have to put back if they keep now. */
export function cardsToBottom(state: GameState): number {
  return state.mulligan?.mulligansTaken ?? 0;
}

/** False once mulliganing again would leave nothing to keep. */
export function canMulliganAgain(state: GameState): boolean {
  const mulligan = state.mulligan;
  if (!mulligan || mulligan.bottoming) return false;
  return mulligan.mulligansTaken < MOST_MULLIGANS;
}

/** Shuffle this hand away and look at seven fresh cards. */
export function takeMulligan(state: GameState, playerId: string): void {
  const mulligan = requireMulligan(state, playerId);
  if (mulligan.bottoming) throw new Error("Choose which cards to put on the bottom first");
  if (!canMulliganAgain(state)) {
    throw new Error(`${playerId} cannot mulligan again - there would be no cards left to keep`);
  }

  const player = requirePlayer(state, playerId);
  for (const card of player.hand.splice(0)) {
    card.zone = "library";
    player.library.push(card);
  }
  shuffleLibrary(state, playerId);
  drawCard(state, playerId, OPENING_HAND_SIZE, { silent: true });

  mulligan.mulligansTaken += 1;
  log(state, `${playerId} takes a mulligan to ${OPENING_HAND_SIZE - mulligan.mulligansTaken}`);
}

/**
 * Keep this hand. A player who has mulliganed still owes the library that many
 * cards, so they move on to choosing which ones rather than finishing here.
 */
export function keepHand(state: GameState, playerId: string): void {
  const mulligan = requireMulligan(state, playerId);
  if (mulligan.bottoming) throw new Error("Already keeping - choose which cards to put on the bottom");
  const player = requirePlayer(state, playerId);

  /*
   * Bottoming is a choice, and there are two ways for there to be no choice to
   * make: you owe nothing, or you owe everything.
   *
   * The second is a mulligan to nothing. You are looking at seven cards and
   * all seven go back, so being walked through picking seven of seven is a
   * form to fill in rather than a decision - and the interface would have you
   * clicking every card in turn to confirm something already settled. Straight
   * into the game instead.
   */
  if (mulligan.mulligansTaken > 0 && mulligan.mulligansTaken < player.hand.length) {
    mulligan.bottoming = true;
    return;
  }
  if (mulligan.mulligansTaken > 0) {
    for (const card of player.hand.splice(0)) {
      card.zone = "library";
      player.library.push(card);
    }
  }
  log(state, `${playerId} keeps ${player.hand.length}`);
  advance(state);
}

/**
 * Put the owed cards on the bottom of the library, in the order given. Ends
 * this player's mulligan.
 */
export function putOnBottom(state: GameState, playerId: string, instanceIds: string[]): void {
  const mulligan = requireMulligan(state, playerId);
  if (!mulligan.bottoming) throw new Error(`${playerId} has not kept a hand yet`);

  const owed = mulligan.mulligansTaken;
  if (instanceIds.length !== owed) {
    throw new Error(`${playerId} must put exactly ${owed} card(s) on the bottom, not ${instanceIds.length}`);
  }
  if (new Set(instanceIds).size !== instanceIds.length) {
    throw new Error("The same card cannot be put on the bottom twice");
  }

  const player = requirePlayer(state, playerId);
  for (const instanceId of instanceIds) {
    const index = player.hand.findIndex((card) => card.instanceId === instanceId);
    if (index === -1) throw new Error(`${instanceId} is not in ${playerId}'s hand`);
    const [card] = player.hand.splice(index, 1);
    card!.zone = "library";
    player.library.push(card!);
  }

  log(state, `${playerId} keeps ${player.hand.length}`);
  advance(state);
}

/**
 * "If this card is in your opening hand, you may begin the game with it on the
 * battlefield." - Gemstone Caverns and Quicksilver.
 *
 * Offered once, here, because this is the moment the rules describe: opening
 * hands are settled and the first turn has not begun. Every player is asked in
 * turn order, and the questions queue - `pendingCardChoices` is already a queue
 * for exactly this reason, and nothing can happen until they are all answered.
 *
 * Written as a card choice over a single card rather than a yes/no, because that
 * is what it is: the picker already exists, and a player with two such cards is
 * asked about each.
 */
function offerOpeningPermanents(state: GameState): void {
  const starter = state.players[state.activePlayerIndex]?.id;
  for (const player of state.players) {
    for (const card of player.hand) {
      const rule = state.cardDefinitions[card.definitionId]?.beginsOnBattlefield;
      if (!rule) continue;
      /*
       * "...and you're not the starting player" - Gemstone Caverns is a catch-up
       * card and says so. Quicksilver has no such clause, which is why this is
       * read off the card rather than applied to both.
       */
      if (rule.notStartingPlayerOnly && player.id === starter) continue;
      state.pendingCardChoices.push({
        playerId: player.id,
        sourceInstanceId: card.instanceId,
        prompt: `Begin the game with ${
          state.cardDefinitions[card.definitionId]?.name ?? "it"
        } on the battlefield?`,
        candidateInstanceIds: [card.instanceId],
        min: 0,
        max: 1,
        mode: "begin-on-battlefield",
        effectControllerId: player.id,
      });
    }
  }
}

/**
 * Hands over to the next player, or starts the game once everyone has kept.
 *
 * Nothing else in the engine needs to know the mulligan happened: clearing the
 * field leaves the state exactly as it would have been if every player had
 * simply been dealt a hand, which is what the rest of the turn machinery
 * already expects.
 */
function advance(state: GameState): void {
  const mulligan = state.mulligan;
  if (!mulligan) return;

  const next = mulligan.order[mulligan.order.indexOf(mulligan.playerId) + 1];
  if (next === undefined) {
    state.mulligan = null;
    offerOpeningPermanents(state);
    return;
  }
  mulligan.playerId = next;
  mulligan.mulligansTaken = 0;
  mulligan.bottoming = false;
}
