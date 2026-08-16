import { describe, expect, it } from "vitest";
import { createCardInstance, createGameState } from "../state.js";
import { castSpellWithAutoTap, planManaPayment } from "../autoTap.js";
import { TEST_CARD_DEFINITIONS } from "../cards/testCards.js";
import type { GameState } from "../types.js";

/**
 * Auto-tap has to leave you able to cast your *next* spell.
 *
 * The old chooser took the first useful source in board order, which meant the
 * generic part of a cost would happily eat the only land that made a colour the
 * following spell needed. Casting two coloured spells in a turn then required
 * tapping by hand - the engine doing half a job is worse than it doing none,
 * because the player has to know it went wrong before they can fix it.
 */
describe("auto-tap keeps colours open", () => {
  function game(): GameState {
    return createGameState(["Deadly Donny", "Salty Mike"], TEST_CARD_DEFINITIONS);
  }

  function board(state: GameState, playerId: string, landIds: string[]) {
    for (const id of landIds) {
      const land = createCardInstance(state, id, playerId, "battlefield");
      land.summoningSickness = false;
    }
  }

  function openMain(state: GameState) {
    state.phase = "precombat-main";
    state.step = "main";
    state.activePlayerIndex = 0;
    state.priorityPlayerIndex = 0;
  }

  it("Blight Mound then Tend the Pests, with the green source listed first", () => {
    /*
     * The reported case. Blight Mound is {2}{B} and Tend the Pests is {B}{G},
     * which is exactly five mana off five lands - so every source has to go to
     * the right place. Board order deliberately puts the Forest first, because
     * a left-to-right chooser spends it on Blight Mound's generic and leaves
     * three Swamps that can never produce the {G}.
     */
    const state = game();
    const me = state.players[0]!;
    openMain(state);
    board(state, me.id, ["forest", "bayou", "swamp", "swamp", "swamp"]);

    const mound = createCardInstance(state, "blight-mound", me.id, "hand");
    castSpellWithAutoTap(state, me.id, mound.instanceId);

    // Tend the Pests also asks for a creature as an additional cost - nothing
    // to do with mana, but it cannot be cast without one.
    const fodder = createCardInstance(state, "grizzly-bears", me.id, "battlefield");
    fodder.summoningSickness = false;

    const tend = createCardInstance(state, "tend-the-pests", me.id, "hand");
    // The real assertion: no manual tapping, and the {B}{G} is still there.
    expect(() =>
      castSpellWithAutoTap(state, me.id, tend.instanceId, [], {
        sacrificeInstanceId: fodder.instanceId,
      }),
    ).not.toThrow();
  });

  it("spends colourless on the generic part before touching a coloured source", () => {
    const state = game();
    const me = state.players[0]!;
    openMain(state);
    // Sol Ring makes {C}{C}; the Swamp is the only black.
    board(state, me.id, ["swamp", "sol-ring", "forest"]);

    // Blight Mound is {2}{B}: one black pip and two generic.
    const plan = planManaPayment(state, me.id, TEST_CARD_DEFINITIONS["blight-mound"]!.manaCost!);
    expect(plan.paid).toBe(true);
    const tapped = plan.taps.map((t) => t.instanceId);
    const solRing = me.battlefield.find((c) => c.definitionId === "sol-ring")!;
    expect(tapped).toContain(solRing.instanceId);
  });

  it("spends a basic before a dual that makes the same colour", () => {
    const state = game();
    const me = state.players[0]!;
    openMain(state);
    // Bayou first in board order, so a left-to-right chooser would take it.
    board(state, me.id, ["bayou", "swamp"]);

    // A single {B} - both lands can pay it, and only one of them also makes {G}.
    const plan = planManaPayment(state, me.id, { generic: 0, colors: { B: 1 } });
    expect(plan.paid).toBe(true);
    const swamp = me.battlefield.find((c) => c.definitionId === "swamp")!;
    expect(plan.taps[0]!.instanceId).toBe(swamp.instanceId);
  });

  it("still pays a cost it can only just afford", () => {
    // Flexibility must never come at the price of failing to pay at all.
    const state = game();
    const me = state.players[0]!;
    openMain(state);
    board(state, me.id, ["bayou"]);
    const plan = planManaPayment(state, me.id, { generic: 0, colors: { G: 1 } });
    expect(plan.paid).toBe(true);
    expect(plan.taps.length).toBe(1);
  });
});
