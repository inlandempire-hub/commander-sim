import { beforeEach, describe, expect, it } from "vitest";
import {
  DEADLY_DONNY,
  SALTY_MIKE,
  createDemoGame,
  canMulliganAgain,
  cardsToBottom,
  keepHand,
  putOnBottom,
  takeMulligan,
  passPriority,
  shouldAutoPass,
  type GameState,
} from "../index.js";

function donnyHandIds(state: GameState): string[] {
  return state.players.find((p) => p.id === DEADLY_DONNY)!.hand.map((c) => c.instanceId);
}

function librarySize(state: GameState, playerId: string): number {
  return state.players.find((p) => p.id === playerId)!.library.length;
}

describe("the London mulligan", () => {
  let state: GameState;

  beforeEach(() => {
    state = createDemoGame({ mulligan: true });
  });

  it("is off unless a game asks for it", () => {
    // Every headless test and bot-vs-bot run depends on this: a game that
    // stopped to ask about opening hands could not assert anything.
    expect(createDemoGame().mulligan).toBeNull();
  });

  it("asks the first player first, with a full seven cards", () => {
    expect(state.mulligan?.playerId).toBe(DEADLY_DONNY);
    expect(donnyHandIds(state)).toHaveLength(7);
    expect(cardsToBottom(state)).toBe(0);
  });

  it("nobody has priority until every hand is settled", () => {
    expect(shouldAutoPass(state, DEADLY_DONNY)).toBe(false);
    expect(() => passPriority(state, DEADLY_DONNY)).toThrow(/opening hand/i);
  });

  it("keeping seven finishes that player and moves on", () => {
    keepHand(state, DEADLY_DONNY);
    expect(state.mulligan?.playerId).toBe(SALTY_MIKE);
    expect(donnyHandIds(state)).toHaveLength(7);
  });

  it("ends once the last player keeps, and the game can then start", () => {
    keepHand(state, DEADLY_DONNY);
    keepHand(state, SALTY_MIKE);
    expect(state.mulligan).toBeNull();
    expect(() => passPriority(state, DEADLY_DONNY)).not.toThrow();
  });

  it("a mulligan shuffles the hand back and deals seven fresh cards", () => {
    const before = donnyHandIds(state);
    const libraryBefore = librarySize(state, DEADLY_DONNY);

    takeMulligan(state, DEADLY_DONNY);

    const after = donnyHandIds(state);
    expect(after).toHaveLength(7);
    // The library is the same size again: seven went back, seven came out.
    expect(librarySize(state, DEADLY_DONNY)).toBe(libraryBefore);
    // Cards genuinely went back rather than being held aside - the old hand
    // could legally be redrawn, so this checks the count, not the identity.
    expect(before.every((id) => after.includes(id))).toBe(false);
  });

  it("owes one card to the bottom for each mulligan taken", () => {
    expect(cardsToBottom(state)).toBe(0);
    takeMulligan(state, DEADLY_DONNY);
    expect(cardsToBottom(state)).toBe(1);
    takeMulligan(state, DEADLY_DONNY);
    expect(cardsToBottom(state)).toBe(2);
  });

  it("keeping after a mulligan asks which cards go back, rather than finishing", () => {
    takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);

    expect(state.mulligan?.bottoming).toBe(true);
    expect(state.mulligan?.playerId).toBe(DEADLY_DONNY);
    // Still seven in hand until the choice is actually made.
    expect(donnyHandIds(state)).toHaveLength(7);
  });

  it("puts the chosen cards on the bottom of the library, not the top", () => {
    takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);
    const [chosen] = donnyHandIds(state);

    putOnBottom(state, DEADLY_DONNY, [chosen!]);

    const player = state.players.find((p) => p.id === DEADLY_DONNY)!;
    expect(player.hand).toHaveLength(6);
    expect(player.library[player.library.length - 1]!.instanceId).toBe(chosen);
    expect(player.library[0]!.instanceId).not.toBe(chosen);
    expect(state.mulligan?.playerId).toBe(SALTY_MIKE);
  });

  it("refuses the wrong number of cards", () => {
    takeMulligan(state, DEADLY_DONNY);
    takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);
    const hand = donnyHandIds(state);

    expect(() => putOnBottom(state, DEADLY_DONNY, [hand[0]!])).toThrow(/exactly 2/);
    expect(() => putOnBottom(state, DEADLY_DONNY, hand.slice(0, 3))).toThrow(/exactly 2/);
    expect(() => putOnBottom(state, DEADLY_DONNY, [hand[0]!, hand[0]!])).toThrow(/twice/);
  });

  it("refuses a card that is not in that player's hand", () => {
    takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);
    const mikesCard = state.players.find((p) => p.id === SALTY_MIKE)!.hand[0]!.instanceId;

    expect(() => putOnBottom(state, DEADLY_DONNY, [mikesCard])).toThrow(/not in/);
  });

  it("will not let one player answer for another", () => {
    expect(() => keepHand(state, SALTY_MIKE)).toThrow(/not Salty Mike/);
    expect(() => takeMulligan(state, SALTY_MIKE)).toThrow(/not Salty Mike/);
  });

  it("stops offering a mulligan once there would be nothing left to keep", () => {
    for (let i = 0; i < 7; i++) {
      expect(canMulliganAgain(state)).toBe(true);
      takeMulligan(state, DEADLY_DONNY);
    }
    expect(canMulliganAgain(state)).toBe(false);
    expect(() => takeMulligan(state, DEADLY_DONNY)).toThrow(/no cards left to keep/);
  });

  it("a player who mulliganed to nothing keeps an empty hand", () => {
    for (let i = 0; i < 7; i++) takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);

    expect(donnyHandIds(state)).toHaveLength(0);
    expect(state.mulligan?.playerId).toBe(SALTY_MIKE);
  });

  it("does not ask which cards to bottom when the answer is all of them", () => {
    // A mulligan to nothing owes seven of seven, so there is no choice to
    // make - being walked through picking every card is a form, not a
    // decision. Keeping finishes it outright.
    for (let i = 0; i < 7; i++) takeMulligan(state, DEADLY_DONNY);
    expect(cardsToBottom(state)).toBe(7);

    keepHand(state, DEADLY_DONNY);
    expect(state.mulligan?.bottoming).toBe(false);
    expect(state.mulligan?.playerId).toBe(SALTY_MIKE);
    expect(() => putOnBottom(state, DEADLY_DONNY, [])).toThrow(/Salty Mike/);
  });

  it("puts the whole hand back on the library when it does", () => {
    const before = librarySize(state, DEADLY_DONNY);
    for (let i = 0; i < 7; i++) takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);

    // Seven were in hand and all seven went back, so nothing has been lost.
    expect(librarySize(state, DEADLY_DONNY)).toBe(before + 7);
    expect(donnyHandIds(state)).toHaveLength(0);
  });

  it("still asks at six, where there is a real choice", () => {
    for (let i = 0; i < 6; i++) takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);

    expect(state.mulligan?.bottoming).toBe(true);
    expect(state.mulligan?.playerId).toBe(DEADLY_DONNY);
  });

  it("logs the empty keep like any other", () => {
    for (let i = 0; i < 7; i++) takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);
    expect(state.log.some((entry) => entry.text === `${DEADLY_DONNY} keeps 0`)).toBe(true);
  });

  it("each player's mulligan count is their own", () => {
    takeMulligan(state, DEADLY_DONNY);
    takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);
    putOnBottom(state, DEADLY_DONNY, donnyHandIds(state).slice(0, 2));

    // Mike starts fresh rather than inheriting Donny's two.
    expect(cardsToBottom(state)).toBe(0);
    expect(canMulliganAgain(state)).toBe(true);
  });

  it("refuses to skip the bottoming step", () => {
    takeMulligan(state, DEADLY_DONNY);
    keepHand(state, DEADLY_DONNY);

    expect(() => keepHand(state, DEADLY_DONNY)).toThrow(/bottom/);
    expect(() => takeMulligan(state, DEADLY_DONNY)).toThrow(/bottom/);
  });

  it("refuses to bottom cards before keeping", () => {
    expect(() => putOnBottom(state, DEADLY_DONNY, [])).toThrow(/has not kept/);
  });
});
