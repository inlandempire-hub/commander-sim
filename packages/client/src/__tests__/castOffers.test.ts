import { describe, expect, it } from "vitest";
import { createGameState, createCardInstance, TEST_CARD_DEFINITIONS } from "@mtg-commander-sim/engine";
import { castOffer, controlsFreeCastEnabler, hasPlayableBackFace } from "../castOffers.js";

const D = TEST_CARD_DEFINITIONS;

describe("client cast offers", () => {
  it("offers Warp for Starwinder and Offspring for Thundertrap Trainer, nothing for a plain spell", () => {
    expect(castOffer(D["starwinder"]!)).toBe("warp");
    expect(castOffer(D["thundertrap-trainer"]!)).toBe("offspring");
    expect(castOffer(D["grizzly-bears"]!)).toBeNull();
    expect(castOffer(D["murder"]!)).toBeNull();
  });

  it("sees a free-cast enabler only while Omniscience is on the battlefield", () => {
    const state = createGameState(["alice", "bob"], D);
    expect(controlsFreeCastEnabler(state, "alice")).toBe(false);
    createCardInstance(state, "omniscience", "alice", "battlefield");
    expect(controlsFreeCastEnabler(state, "alice")).toBe(true);
    // It is the controller's board that matters, not the opponent's.
    expect(controlsFreeCastEnabler(state, "bob")).toBe(false);
  });

  it("treats an MDFC back as a playable face but a transform back as not", () => {
    const state = createGameState(["alice"], D);
    // Waterlogged Teachings // Inundated Archive - a real second face to choose.
    expect(hasPlayableBackFace(state, D["waterlogged-teachings"]!)).toBe(true);
    // Emet-Selch // Hades - a transform target, not a face you cast.
    expect(hasPlayableBackFace(state, D["emet-selch-unsundered"]!)).toBe(false);
    // A single-faced card has no back at all.
    expect(hasPlayableBackFace(state, D["grizzly-bears"]!)).toBe(false);
  });
});
