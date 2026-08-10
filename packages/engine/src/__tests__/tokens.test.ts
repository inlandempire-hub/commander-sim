import { describe, expect, it } from "vitest";
import { makeTestGame } from "../testHelpers.js";
import { createCardInstance, requireDefinition } from "../state.js";
import { putOntoBattlefield } from "../permanents.js";
import { resolveTopOfStack } from "../stack.js";
import { advanceStep } from "../turn.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

/**
 * Minted tokens.
 *
 * `createToken` has worked since the Saproling was hand-written; what arrived
 * on 2026-08-10 is the ability to write the *definition* a card names, straight
 * out of its printed phrase. So these tests are about the definitions being
 * right, and about the two cards that use them behaving as printed.
 */

function enters(state: GameState, definitionId: string, playerId: string) {
  const instance = createCardInstance(state, definitionId, playerId, "library");
  putOntoBattlefield(state, instance.instanceId);
  return instance;
}

function drain(state: GameState): void {
  let guard = 40;
  while (state.stack.length > 0 && guard-- > 0) resolveTopOfStack(state);
}

/** Advances until the next upkeep, resolving nothing on the way. */
function toNextUpkeep(state: GameState): void {
  let guard = 40;
  do {
    state.stack.length = 0;
    advanceStep(state);
  } while (state.step !== "upkeep" && guard-- > 0);
  if (guard <= 0) throw new Error("never reached an upkeep");
}

describe("minted token definitions", () => {
  it("carries the stats, colour, subtype and keywords the card printed", () => {
    // Hornet Queen: "four 1/1 green Insect creature tokens with flying and
    // deathtouch".
    const token = TEST_CARD_DEFINITIONS["token-g-11-insect-flying-deathtouch"]!;
    expect(token.power).toBe(1);
    expect(token.toughness).toBe(1);
    expect(token.colorIdentity).toEqual(["G"]);
    expect(token.subtypes).toEqual(["Insect"]);
    expect(token.keywords).toEqual(["Flying", "Deathtouch"]);
    expect(token.isToken).toBe(true);
  });

  it("gives two differently-worded tokens two definitions", () => {
    /*
     * The id spells the token out in full for this reason. A 1/1 green Insect
     * and a 1/1 green Insect with flying and deathtouch are different cards,
     * and sharing one definition between them would hand every Insect-maker in
     * the pool whichever body happened to be minted first.
     */
    const ids = Object.keys(TEST_CARD_DEFINITIONS).filter((id) => id.startsWith("token-"));
    const bodies = ids.map((id) => {
      const def = TEST_CARD_DEFINITIONS[id]!;
      return `${def.power}/${def.toughness} ${(def.colorIdentity ?? []).join("")} ${(def.subtypes ?? []).join(
        "",
      )} ${(def.keywords ?? []).join(",")}`;
    });
    expect(new Set(bodies).size).toBe(bodies.length);
  });
});

describe("Hornet Queen", () => {
  it("makes four tokens on arrival", () => {
    // "When this creature enters, create four 1/1 green Insect creature tokens
    // with flying and deathtouch."
    const state = makeTestGame();
    const alice = state.players[0]!;

    enters(state, "hornet-queen", alice.id);
    drain(state);

    const tokens = alice.battlefield.filter(
      (c) => c.definitionId === "token-g-11-insect-flying-deathtouch",
    );
    expect(tokens).toHaveLength(4);
  });

  it("gives the tokens flying and deathtouch, not just a body", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "hornet-queen", alice.id);
    drain(state);

    const token = alice.battlefield.find(
      (c) => c.definitionId === "token-g-11-insect-flying-deathtouch",
    )!;
    const def = requireDefinition(state, token.definitionId);
    expect(def.keywords).toContain("Flying");
    expect(def.keywords).toContain("Deathtouch");
  });

  it("sets its own tokens off against a watcher, because a token entering is an arrival", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "soul-warden", alice.id); // "whenever another creature enters, you gain 1 life"
    drain(state);
    const before = alice.life;

    enters(state, "hornet-queen", alice.id);
    drain(state);

    // One for the Queen herself, four for the Insects.
    expect(alice.life).toBe(before + 5);
  });
});

describe("Ophiomancer", () => {
  /**
   * "At the beginning of each upkeep, if you control no Snakes, create a 1/1
   * black Snake creature token with deathtouch."
   */
  const snakes = (player: { battlefield: { definitionId: string }[] }) =>
    player.battlefield.filter((c) => c.definitionId === "token-b-11-snake-deathtouch").length;

  it("makes a Snake on an upkeep when you control none", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "ophiomancer", alice.id);

    toNextUpkeep(state);
    drain(state);

    expect(snakes(alice)).toBe(1);
  });

  it("makes no second Snake while the first is alive", () => {
    /*
     * The intervening-if, and the whole reason the card is not simply "a Snake
     * every turn". Checked when the trigger would go on the stack *and* again
     * as it resolves - so a Snake dying in response is the only way to get two.
     */
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "ophiomancer", alice.id);

    toNextUpkeep(state);
    drain(state);
    toNextUpkeep(state);
    drain(state);

    expect(snakes(alice)).toBe(1);
  });

  it("makes another once the Snake is gone", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "ophiomancer", alice.id);
    toNextUpkeep(state);
    drain(state);

    alice.battlefield = alice.battlefield.filter(
      (c) => c.definitionId !== "token-b-11-snake-deathtouch",
    );
    toNextUpkeep(state);
    drain(state);

    expect(snakes(alice)).toBe(1);
  });

  it("fires on the opponent's upkeep too, because the card says 'each'", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "ophiomancer", alice.id);

    // Alice's own upkeep first, then hand the turn over and take the Snake away
    // so the next upkeep has something to do.
    toNextUpkeep(state);
    drain(state);
    alice.battlefield = alice.battlefield.filter(
      (c) => c.definitionId !== "token-b-11-snake-deathtouch",
    );

    toNextUpkeep(state);
    expect(state.players[state.activePlayerIndex]!.id).toBe(state.players[1]!.id);
    drain(state);

    expect(snakes(alice)).toBe(1);
  });

  it("gives the Snake deathtouch", () => {
    const state = makeTestGame();
    const alice = state.players[0]!;
    enters(state, "ophiomancer", alice.id);
    toNextUpkeep(state);
    drain(state);

    const snake = alice.battlefield.find((c) => c.definitionId === "token-b-11-snake-deathtouch")!;
    expect(requireDefinition(state, snake.definitionId).keywords).toContain("Deathtouch");
  });
});
