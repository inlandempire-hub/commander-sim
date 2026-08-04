import { describe, expect, it } from "vitest";
import {
  MANA_COLORS,
  MAX_PARTICLES,
  burstCount,
  burstForFlight,
  manaColor,
  mergeParticles,
  particleAlpha,
  spawnBurst,
  stepParticles,
  withAlpha,
  type Particle,
} from "../particles.js";
import type { Placement } from "../flight.js";

/** A deterministic stand-in for Math.random, cycling through fixed values. */
function fixedRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length]!;
}

function place(zone: string, left: number, top: number): Placement {
  return { zone, ownerId: "donny", left, top, width: 100, height: 140 };
}

describe("spawnBurst", () => {
  it("spawns every particle at the point the burst was fired from", () => {
    const particles = spawnBurst({ kind: "resolve", x: 400, y: 250 }, fixedRandom([0.5]));
    expect(particles.length).toBeGreaterThan(0);
    for (const p of particles) {
      expect(p.x).toBe(400);
      expect(p.y).toBe(250);
    }
  });

  it("uses the burst's colour when it names one, and the preset's when it does not", () => {
    const coloured = spawnBurst({ kind: "mana-absorb", x: 0, y: 0, color: "#7fce6c" }, fixedRandom([0.5]));
    expect(coloured.every((p) => p.color === "#7fce6c")).toBe(true);

    const plain = spawnBurst({ kind: "ash", x: 0, y: 0 }, fixedRandom([0.5]));
    expect(plain.every((p) => p.color === "#6d6a78")).toBe(true);
  });

  it("gives particles differing directions and speeds rather than one shared velocity", () => {
    // Identical particles read as one object being scaled, not as many things.
    const particles = spawnBurst({ kind: "impact", x: 0, y: 0 }, Math.random);
    const velocities = new Set(particles.map((p) => `${p.vx.toFixed(4)}:${p.vy.toFixed(4)}`));
    expect(velocities.size).toBeGreaterThan(1);
  });

  it("stays inside the preset's ranges for size and lifetime", () => {
    for (let i = 0; i < 40; i++) {
      for (const p of spawnBurst({ kind: "mana-absorb", x: 0, y: 0 })) {
        expect(p.size).toBeGreaterThanOrEqual(1.3);
        expect(p.size).toBeLessThanOrEqual(3.0);
        expect(p.life).toBeGreaterThanOrEqual(420);
        expect(p.life).toBeLessThanOrEqual(720);
        expect(p.life).toBe(p.maxLife);
      }
    }
  });

  it("marks ash as non-additive and mana as additive", () => {
    // Ash that glows reads as a firework; a creature dying should not.
    expect(spawnBurst({ kind: "ash", x: 0, y: 0 }).every((p) => p.additive)).toBe(false);
    expect(spawnBurst({ kind: "mana-absorb", x: 0, y: 0 }).every((p) => p.additive)).toBe(true);
  });
});

describe("burstCount", () => {
  it("scales an impact with the damage dealt", () => {
    expect(burstCount("impact", 1)).toBeLessThan(burstCount("impact", 5));
  });

  it("caps an impact however large the damage is", () => {
    // A 40/40 trampling through should not ask for four thousand specks.
    expect(burstCount("impact", 999)).toBe(26);
  });

  it("ignores strength for bursts that have no magnitude", () => {
    expect(burstCount("ash", 0)).toBe(burstCount("ash", 12));
  });

  it("never returns a negative count for negative strength", () => {
    expect(burstCount("impact", -5)).toBe(burstCount("impact", 0));
  });
});

describe("stepParticles", () => {
  const one = (over: Partial<Particle> = {}): Particle[] => [
    {
      x: 0,
      y: 0,
      vx: 100,
      vy: 0,
      life: 1000,
      maxLife: 1000,
      size: 2,
      color: "#fff",
      gravity: 0,
      drag: 1,
      additive: true,
      ...over,
    },
  ];

  it("moves a particle along its velocity", () => {
    const [p] = stepParticles(one(), 100);
    expect(p!.x).toBeCloseTo(10, 5);
    expect(p!.y).toBeCloseTo(0, 5);
  });

  it("applies gravity to vertical velocity", () => {
    const [p] = stepParticles(one({ vx: 0, gravity: 500 }), 100);
    expect(p!.vy).toBeCloseTo(50, 5);
    expect(p!.y).toBeGreaterThan(0);
  });

  it("floats a particle upward when gravity is negative", () => {
    const [p] = stepParticles(one({ vx: 0, gravity: -100 }), 100);
    expect(p!.y).toBeLessThan(0);
  });

  it("slows a particle down when drag is below one", () => {
    const [p] = stepParticles(one({ drag: 0.25 }), 100);
    expect(p!.vx).toBeLessThan(100);
    expect(p!.vx).toBeGreaterThan(0);
  });

  it("makes drag frame-rate independent", () => {
    // One 100ms step and ten 10ms steps must land in the same place, or the
    // motion changes with the monitor's refresh rate.
    const coarse = stepParticles(one({ drag: 0.3 }), 100);
    let fine = one({ drag: 0.3 });
    for (let i = 0; i < 10; i++) fine = stepParticles(fine, 10);
    expect(fine[0]!.vx).toBeCloseTo(coarse[0]!.vx, 4);
  });

  it("drops particles whose life has run out", () => {
    expect(stepParticles(one({ life: 40 }), 50)).toHaveLength(0);
  });

  it("clamps an enormous delta so a backgrounded tab does not teleport everything", () => {
    const [p] = stepParticles(one({ life: 100000, maxLife: 100000 }), 10_000);
    // 100ms of movement at 100px/s, not ten seconds of it.
    expect(p!.x).toBeCloseTo(10, 5);
  });

  it("ignores a negative delta rather than running backwards", () => {
    const [p] = stepParticles(one(), -100);
    expect(p!.x).toBe(0);
    expect(p!.life).toBe(1000);
  });

  it("does not mutate the particles it was given", () => {
    const before = one();
    stepParticles(before, 100);
    expect(before[0]!.x).toBe(0);
    expect(before[0]!.life).toBe(1000);
  });
});

describe("particleAlpha", () => {
  const at = (life: number): Particle => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life,
    maxLife: 1000,
    size: 2,
    color: "#fff",
    gravity: 0,
    drag: 1,
    additive: true,
  });

  it("starts transparent, so a burst is not a hard-edged disc on its first frame", () => {
    expect(particleAlpha(at(1000))).toBe(0);
  });

  it("reaches full opacity early in the particle's life", () => {
    expect(particleAlpha(at(850))).toBeCloseTo(0.85, 2);
  });

  it("fades away towards the end", () => {
    expect(particleAlpha(at(200))).toBeLessThan(particleAlpha(at(600)));
    expect(particleAlpha(at(1))).toBeCloseTo(0, 2);
  });

  it("never leaves the 0..1 range", () => {
    for (const life of [-50, 0, 500, 1000, 5000]) {
      const alpha = particleAlpha(at(life));
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });
});

describe("mergeParticles", () => {
  const many = (count: number): Particle[] =>
    Array.from({ length: count }, (_, i) => ({
      x: i,
      y: 0,
      vx: 0,
      vy: 0,
      life: 100,
      maxLife: 100,
      size: 1,
      color: "#fff",
      gravity: 0,
      drag: 1,
      additive: true,
    }));

  it("keeps everything while under the cap", () => {
    expect(mergeParticles(many(10), many(5))).toHaveLength(15);
  });

  it("never exceeds the cap", () => {
    expect(mergeParticles(many(MAX_PARTICLES), many(60))).toHaveLength(MAX_PARTICLES);
  });

  it("drops the oldest, so a new burst always appears in full", () => {
    const incoming = spawnBurst({ kind: "ash", x: 999, y: 999 });
    const merged = mergeParticles(many(MAX_PARTICLES), incoming);
    expect(merged.slice(-incoming.length)).toEqual(incoming);
  });
});

describe("burstForFlight", () => {
  it("throws ash when a permanent reaches the graveyard", () => {
    const scheduled = burstForFlight(
      { from: place("battlefield", 100, 100), to: place("graveyard", 500, 300), delay: 0 },
      380,
    );
    expect(scheduled?.burst.kind).toBe("ash");
    // At the far end - the ash is it arriving in the graveyard.
    expect(scheduled?.burst.x).toBe(550);
    expect(scheduled?.burst.y).toBe(370);
    expect(scheduled?.delayMs).toBe(380);
  });

  it("waits for a staggered card to actually land before the ash appears", () => {
    const scheduled = burstForFlight(
      { from: place("battlefield", 0, 0), to: place("graveyard", 0, 0), delay: 110 },
      380,
    );
    expect(scheduled?.delayMs).toBe(490);
  });

  it("throws motes where a spell was sitting when it leaves the stack", () => {
    const scheduled = burstForFlight(
      { from: place("stack", 200, 60), to: place("battlefield", 40, 400), delay: 0 },
      380,
    );
    expect(scheduled?.burst.kind).toBe("resolve");
    expect(scheduled?.burst.x).toBe(250);
    expect(scheduled?.burst.y).toBe(130);
    // Immediately: resolving *is* leaving the stack.
    expect(scheduled?.delayMs).toBe(0);
  });

  it("treats a countered spell the same as a resolved one - both left the stack", () => {
    const scheduled = burstForFlight(
      { from: place("stack", 0, 0), to: place("graveyard", 0, 0), delay: 0 },
      380,
    );
    expect(scheduled?.burst.kind).toBe("resolve");
  });

  it("stays quiet for ordinary card movement", () => {
    // A land being played and a card being drawn already have the card itself
    // travelling; a burst on each would turn a turn into fireworks.
    expect(burstForFlight({ from: place("hand", 0, 0), to: place("battlefield", 0, 0), delay: 0 }, 380)).toBeNull();
    expect(burstForFlight({ from: place("library", 0, 0), to: place("hand", 0, 0), delay: 0 }, 380)).toBeNull();
    expect(burstForFlight({ from: place("hand", 0, 0), to: place("stack", 0, 0), delay: 0 }, 380)).toBeNull();
  });
});

describe("colours", () => {
  it("has a colour for each of the five mana colours", () => {
    for (const color of ["W", "U", "B", "R", "G"]) {
      expect(MANA_COLORS[color]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("falls back to colourless for an unknown or missing colour", () => {
    expect(manaColor(undefined)).toBe(MANA_COLORS.C);
    expect(manaColor("X")).toBe(MANA_COLORS.C);
  });

  it("turns a hex colour into rgba", () => {
    expect(withAlpha("#7fce6c", 0.5)).toBe("rgba(127, 206, 108, 0.5)");
  });

  it("clamps alpha and passes anything unparseable straight through", () => {
    expect(withAlpha("#000000", 5)).toBe("rgba(0, 0, 0, 1)");
    expect(withAlpha("#000000", -1)).toBe("rgba(0, 0, 0, 0)");
    expect(withAlpha("rebeccapurple", 0.5)).toBe("rebeccapurple");
  });
});
