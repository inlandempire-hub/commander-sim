import { describe, expect, it } from "vitest";
import { libraryAnchorKey, planFlights, STAGGER_MS, type Placement } from "../flight.js";

function at(zone: string, left: number, options: Partial<Placement> = {}): Placement {
  return { zone, ownerId: "donny", left, top: 100, width: 60, height: 84, ...options };
}

const NO_ANCHORS = new Map<string, Placement>();

describe("planFlights", () => {
  it("flies a card that changed zone, from where it was to where it is", () => {
    const before = new Map([["c1", at("hand", 400)]]);
    const after = new Map([["c1", at("battlefield", 250, { top: 300 })]]);

    const [flight, ...rest] = planFlights(before, after, NO_ANCHORS, 0);

    expect(rest).toHaveLength(0);
    expect(flight?.instanceId).toBe("c1");
    expect(flight?.from.left).toBe(400);
    expect(flight?.to.top).toBe(300);
  });

  it("ignores a card that only shifted along its row", () => {
    // Neighbours leaving a hand re-centres everything still in it. Animating
    // that would mean the whole hand slid sideways every time a card was cast.
    const before = new Map([["c1", at("hand", 400)]]);
    const after = new Map([["c1", at("hand", 340)]]);

    expect(planFlights(before, after, NO_ANCHORS, 0)).toEqual([]);
  });

  it("ignores a card that has not moved at all", () => {
    const before = new Map([["c1", at("battlefield", 400)]]);
    const after = new Map([["c1", at("battlefield", 400)]]);

    expect(planFlights(before, after, NO_ANCHORS, 0)).toEqual([]);
  });

  it("flies a newly drawn card out of its owner's library pile", () => {
    const anchors = new Map([[libraryAnchorKey("donny"), at("", 20, { top: 500 })]]);
    const after = new Map([["drawn", at("hand", 380)]]);

    const [flight] = planFlights(new Map(), after, anchors, 0);

    expect(flight?.from.left).toBe(20);
    expect(flight?.from.top).toBe(500);
    expect(flight?.to.left).toBe(380);
  });

  it("takes the library of the card's own owner, not just any library", () => {
    const anchors = new Map([
      [libraryAnchorKey("donny"), at("", 20)],
      [libraryAnchorKey("mike"), at("", 900)],
    ]);
    const after = new Map([["drawn", at("hand", 380, { ownerId: "mike" })]]);

    const [flight] = planFlights(new Map(), after, anchors, 0);

    expect(flight?.from.left).toBe(900);
  });

  it("does not invent a source for a card appearing anywhere but hand", () => {
    // A token being created, or a card put onto the battlefield straight from
    // a library. There is no honest place to fly it from, so it just appears.
    const anchors = new Map([[libraryAnchorKey("donny"), at("", 20)]]);
    const after = new Map([["token", at("battlefield", 380)]]);

    expect(planFlights(new Map(), after, anchors, 0)).toEqual([]);
  });

  it("does not fly a draw when there is no library on screen to fly it from", () => {
    const after = new Map([["drawn", at("hand", 380)]]);

    expect(planFlights(new Map(), after, NO_ANCHORS, 0)).toEqual([]);
  });

  it("skips cards measured at zero size rather than dividing by their width", () => {
    const before = new Map([["c1", at("hand", 400)]]);
    const after = new Map([["c1", at("battlefield", 250, { width: 0, height: 0 })]]);

    expect(planFlights(before, after, NO_ANCHORS, 0)).toEqual([]);
  });

  it("staggers a batch left to right", () => {
    const anchors = new Map([[libraryAnchorKey("donny"), at("", 20)]]);
    const after = new Map([
      ["c3", at("hand", 500)],
      ["c1", at("hand", 300)],
      ["c2", at("hand", 400)],
    ]);

    const flights = planFlights(new Map(), after, anchors, 0);

    expect(flights.map((f) => f.instanceId)).toEqual(["c1", "c2", "c3"]);
    expect(flights.map((f) => f.delay)).toEqual([0, STAGGER_MS, STAGGER_MS * 2]);
  });

  it("caps the stagger so a full opening hand does not crawl in", () => {
    const anchors = new Map([[libraryAnchorKey("donny"), at("", 20)]]);
    const after = new Map(
      Array.from({ length: 12 }, (_, i) => [`c${i}`, at("hand", i * 40)] as const),
    );

    const delays = planFlights(new Map(), after, anchors, 0).map((f) => f.delay);

    expect(Math.max(...delays)).toBeLessThanOrEqual(330);
  });

  it("gives the same card a different key each time it moves", () => {
    const hand = new Map([["c1", at("hand", 400)]]);
    const stack = new Map([["c1", at("stack", 600)]]);
    const graveyard = new Map([["c1", at("graveyard", 30)]]);

    const first = planFlights(hand, stack, NO_ANCHORS, 0)[0];
    const second = planFlights(stack, graveyard, NO_ANCHORS, 1)[0];

    // Same element id would make React treat the second journey as a
    // re-render of the first, and it would jump rather than travel.
    expect(first?.key).not.toBe(second?.key);
  });
});
