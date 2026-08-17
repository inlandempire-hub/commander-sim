import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  createGameState,
  enteredBattlefield,
  requirePlayer,
  TEST_CARD_DEFINITIONS,
  type GameState,
} from "@mtg-commander-sim/engine";
import { applyBotAction } from "../localHarness.js";
import { castOptionsFor, type BotAction } from "../types.js";

/**
 * How a spell is being cast, not just which spell.
 *
 * The local harness built the engine's cast options by hand and passed one of
 * the four fields, so for as long as the other three have existed the bot-vs-bot
 * test cast something other than what the bot decided: Deadly Rollick charged
 * its printed cost rather than being free, Tend the Pests cast with no creature
 * named to sacrifice, and an {X} spell announced 0.
 *
 * The client's own applier passed all four, so games in the browser were right
 * and only the test was wrong - which is the worse direction. Neither demo deck
 * had a card of any of those shapes until the Blech list went in.
 *
 * The fix is one shared translation. These tests are about that: the mapping
 * keeps every field, and the harness really does honour them.
 */
describe("how the bot's spell is cast, not just which", () => {
  function table(): { state: GameState; me: string; them: string } {
    const state = createGameState(["Deadly Donny", "Salty Mike"], TEST_CARD_DEFINITIONS);
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
    return { state, me: state.players[0]!.id, them: state.players[1]!.id };
  }

  function put(state: GameState, definitionId: string, playerId: string) {
    const instance = createCardInstance(state, definitionId, playerId, "battlefield");
    enteredBattlefield(state, instance);
    instance.summoningSickness = false;
    return instance;
  }

  it("carries every field the action holds", () => {
    const action: Extract<BotAction, { kind: "castSpell" }> = {
      kind: "castSpell",
      instanceId: "c1",
      targets: [],
      fromCommandZone: true,
      chosenX: 3,
      sacrificeInstanceId: "c2",
      useAlternativeCost: true,
    };
    // Named one by one rather than compared to a spread of the action, so that a
    // field added to the action without being mapped fails here.
    expect(castOptionsFor(action)).toEqual({
      fromCommandZone: true,
      chosenX: 3,
      sacrificeInstanceId: "c2",
      useAlternativeCost: true,
    });
  });

  it("casts Deadly Rollick for free when the bot says to", () => {
    const { state, me, them } = table();
    // "If you control a commander" - the condition its free cast asks about.
    const commander = createCardInstance(state, "blech-loafing-pest", me, "battlefield", {
      isCommander: true,
    });
    enteredBattlefield(state, commander);
    const victim = put(state, "grizzly-bears", them);
    const rollick = createCardInstance(state, "deadly-rollick", me, "hand");

    // No lands at all, so the printed {3}{B} is unpayable - the only way this
    // resolves is the alternative cost actually being used.
    expect(requirePlayer(state, me).battlefield.filter((c) => c.definitionId === "bayou")).toHaveLength(0);

    applyBotAction(state, me, {
      kind: "castSpell",
      instanceId: rollick.instanceId,
      targets: [{ kind: "card", instanceId: victim.instanceId }],
      fromCommandZone: false,
      useAlternativeCost: true,
    });
    expect(state.stack).toHaveLength(1);
  });

  it("gives up the creature the bot chose for Tend the Pests", () => {
    const { state, me } = table();
    const fodder = put(state, "grizzly-bears", me);
    // {1}{B}{G} - three lands, all untapped.
    for (const id of ["bayou", "bayou", "swamp"]) put(state, id, me);
    const pests = createCardInstance(state, "tend-the-pests", me, "hand");

    applyBotAction(state, me, {
      kind: "castSpell",
      instanceId: pests.instanceId,
      targets: [],
      fromCommandZone: false,
      sacrificeInstanceId: fodder.instanceId,
    });

    // Sacrificing is part of paying the cost, so it has happened already - the
    // spell is on the stack and the creature is not on the battlefield.
    expect(state.stack).toHaveLength(1);
    expect(
      requirePlayer(state, me).battlefield.some((c) => c.instanceId === fodder.instanceId),
    ).toBe(false);
  });
});
