/**
 * Particles: the arithmetic, with no canvas and no React anywhere in it.
 *
 * Everything visual in this client so far has been CSS, deliberately, because
 * CSS degrades to an instant state change when a tab isn't compositing rather
 * than to nothing at all. Particles are the one thing CSS genuinely cannot do -
 * a hundred independently-moving specks would be a hundred DOM nodes, each with
 * its own keyframes, laid out and composited by the browser - so they get a
 * canvas and a single animation loop instead.
 *
 * The rule that made that safe is that particles are only ever *decoration on
 * top of something already legible*. Mana lands in the pool whether or not the
 * motes arrive; a creature dies whether or not the ash appears; the number of
 * damage floats off the card either way. If this entire module never ran, the
 * game would read exactly the same and just look flatter. Nothing here is ever
 * the only thing telling you something happened.
 *
 * Splitting the maths out here is not ceremony either: a particle system is
 * mostly numbers going wrong in ways you cannot see - a drag coefficient that
 * quietly never decays, a lifetime that goes negative, a burst that spawns
 * three thousand specks because a damage number was large. All of that is
 * testable without a browser, and none of it is testable through a canvas.
 */

import type { Placement } from "./flight.js";

/** A function returning 0..1. Injectable purely so the tests are deterministic. */
export type Random = () => number;

export type BurstKind = "mana-absorb" | "mana-spark" | "impact" | "ash" | "resolve";

export interface Particle {
  /** Viewport pixels, same coordinate space as getBoundingClientRect. */
  x: number;
  y: number;
  /** Pixels per second. */
  vx: number;
  vy: number;
  /** Milliseconds left to live, and what it started at, for the fade. */
  life: number;
  maxLife: number;
  /** Radius in CSS pixels. */
  size: number;
  color: string;
  /** Pixels per second squared. Negative floats upward. */
  gravity: number;
  /** Fraction of speed retained per second - 1 is frictionless, 0.1 is treacle. */
  drag: number;
  /**
   * Drawn with additive blending, so overlapping specks brighten instead of
   * covering each other. Right for light (mana, sparks), wrong for ash, which
   * has to sit dark against a dark table.
   */
  additive: boolean;
}

export interface Burst {
  kind: BurstKind;
  /** Where it goes off, in viewport pixels. */
  x: number;
  y: number;
  /** Overrides the preset's colour - the mana bursts are coloured by the mana. */
  color?: string;
  /** Scales the count, for bursts that have a magnitude. Damage, mostly. */
  strength?: number;
}

/**
 * The ceiling on live particles.
 *
 * Not a performance guess so much as a guard against one input: damage is a
 * number off a card, and a 40/40 trampling into a board wipe should not be able
 * to ask for four thousand specks. Over this, the oldest are dropped.
 */
export const MAX_PARTICLES = 420;

/**
 * Longest a single frame is allowed to advance the simulation, which is a
 * safety rail rather than a pacing choice: a backgrounded tab hands the first
 * frame after it wakes a delta of several seconds, and without a clamp every
 * live particle teleports off screen in one step. A tenth of a second is well
 * below any real frame, so it never affects normal playback.
 */
const MAX_STEP_MS = 100;

interface Preset {
  /** How many specks, before the cap. */
  count: number;
  /** Extra specks per point of strength, and the ceiling on that. */
  perStrength: number;
  maxCount: number;
  /** Pixels per second, low to high. */
  speed: [number, number];
  /** Milliseconds, low to high. */
  life: [number, number];
  /** Radius in pixels, low to high. */
  size: [number, number];
  gravity: number;
  drag: number;
  additive: boolean;
  color: string;
  /** Centre of the spray, radians. -PI/2 is straight up the screen. */
  aim: number;
  /** Total width of the spray, radians. TAU is every direction. */
  spread: number;
}

const TAU = Math.PI * 2;

const PRESETS: Record<BurstKind, Preset> = {
  /*
   * Mana arriving in the pool. The one the whole system was built for: a pip
   * flies from the land to the mana readout, and this is what it turns into
   * when it gets there. Drifts upward and outward and fades - absorbed, not
   * scattered - and is always the colour of the mana that was actually made.
   */
  "mana-absorb": {
    count: 14,
    perStrength: 0,
    maxCount: 14,
    speed: [26, 78],
    life: [420, 720],
    size: [1.3, 3.0],
    gravity: -26,
    drag: 0.28,
    additive: true,
    color: "#d8d2c4",
    aim: -Math.PI / 2,
    spread: TAU,
  },
  /*
   * The other end of the same journey: a small puff at the land as the mana
   * leaves it. Deliberately much smaller than the arrival - the land giving
   * something up should read as quieter than the pool receiving it.
   */
  "mana-spark": {
    count: 5,
    perStrength: 0,
    maxCount: 5,
    speed: [30, 90],
    life: [240, 400],
    size: [1.0, 2.1],
    gravity: 70,
    drag: 0.2,
    additive: true,
    color: "#d8d2c4",
    aim: -Math.PI / 2,
    spread: Math.PI * 1.2,
  },
  /*
   * Damage landing on a creature. Scaled by the amount, because 1 damage on a
   * 4/4 and 3 on a 3/3 already look identical on the card and the whole point
   * of the flinch and the floating number was to separate them.
   */
  impact: {
    count: 7,
    perStrength: 3,
    maxCount: 26,
    speed: [110, 300],
    life: [280, 500],
    size: [1.2, 2.6],
    gravity: 620,
    drag: 0.35,
    additive: true,
    color: "#ffc98a",
    aim: -Math.PI / 2,
    spread: TAU,
  },
  /*
   * A permanent leaving the battlefield for the graveyard. Slow, heavy and
   * unlit - the only burst here that is not additive, because ash that glows
   * reads as a firework and a creature dying should not look like a reward.
   */
  ash: {
    count: 18,
    perStrength: 0,
    maxCount: 18,
    speed: [18, 62],
    life: [620, 1100],
    size: [1.4, 3.4],
    gravity: 96,
    drag: 0.5,
    additive: false,
    color: "#6d6a78",
    aim: -Math.PI / 2,
    spread: TAU,
  },
  /*
   * A spell leaving the stack. Fired where the card was sitting, so the thing
   * that resolves has somewhere it visibly went, rather than the panel simply
   * being empty on the next frame.
   */
  resolve: {
    count: 16,
    perStrength: 0,
    maxCount: 16,
    speed: [70, 160],
    life: [400, 700],
    size: [1.1, 2.4],
    gravity: -18,
    drag: 0.3,
    additive: true,
    color: "#9fb6e8",
    aim: -Math.PI / 2,
    spread: TAU,
  },
};

/**
 * The five mana colours, as the client draws them.
 *
 * Single source for both the flying pip and the burst it becomes: the pip layer
 * reads these too and writes them into its inline custom properties, so the
 * speck that lands in the pool cannot end up a different white from the dot
 * that flew there. They are lifted rather than saturated - a table this dark
 * needs black mana to be a visible violet rather than an invisible black.
 */
export const MANA_COLORS: Record<string, string> = {
  W: "#f4efd8",
  U: "#79b4ea",
  B: "#a99ad8",
  R: "#ef7a5e",
  G: "#7fce6c",
  C: "#d8d2c4",
};

export function manaColor(color: string | undefined): string {
  return MANA_COLORS[color ?? "C"] ?? MANA_COLORS.C!;
}

/** `#rrggbb` plus an alpha, as a CSS colour. Anything unparseable passes through. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = Number.parseInt(match[1]!, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function between(random: Random, low: number, high: number): number {
  return low + random() * (high - low);
}

/** How many specks a burst is worth, strength included and the ceiling applied. */
export function burstCount(kind: BurstKind, strength = 0): number {
  const preset = PRESETS[kind];
  const wanted = preset.count + Math.max(0, strength) * preset.perStrength;
  return Math.min(preset.maxCount, Math.round(wanted));
}

/**
 * Turns a burst into the specks it is made of.
 *
 * Every particle gets its own direction, speed, size and lifetime inside the
 * preset's ranges - identical particles look like a single object being scaled
 * rather than like a lot of small things.
 */
export function spawnBurst(burst: Burst, random: Random = Math.random): Particle[] {
  const preset = PRESETS[burst.kind];
  const color = burst.color ?? preset.color;
  const count = burstCount(burst.kind, burst.strength ?? 0);
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = preset.aim + (random() - 0.5) * preset.spread;
    const speed = between(random, preset.speed[0], preset.speed[1]);
    const life = between(random, preset.life[0], preset.life[1]);
    particles.push({
      x: burst.x,
      y: burst.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: between(random, preset.size[0], preset.size[1]),
      color,
      gravity: preset.gravity,
      drag: preset.drag,
      additive: preset.additive,
    });
  }
  return particles;
}

/**
 * Advances every particle by one frame and drops the dead ones.
 *
 * `dtMs` is clamped: a tab that was backgrounded for ten seconds hands the
 * first frame back an enormous delta, and without the clamp every live particle
 * teleports off screen in one step instead of simply expiring quietly.
 *
 * Drag is applied as a per-second retained fraction raised to the elapsed time,
 * rather than multiplied once per frame, so the motion is the same on a 144Hz
 * monitor as on a 60Hz one.
 */
export function stepParticles(particles: readonly Particle[], dtMs: number): Particle[] {
  const step = Math.max(0, Math.min(MAX_STEP_MS, dtMs));
  const dt = step / 1000;
  const alive: Particle[] = [];

  for (const p of particles) {
    const life = p.life - step;
    if (life <= 0) continue;
    const keep = Math.pow(p.drag, dt);
    const vx = p.vx * keep;
    const vy = p.vy * keep + p.gravity * dt;
    alive.push({
      ...p,
      x: p.x + vx * dt,
      y: p.y + vy * dt,
      vx,
      vy,
      life,
    });
  }
  return alive;
}

/**
 * How opaque a particle is right now: up fast, then away over the rest of its
 * life. The quick fade-in is what stops a burst appearing as a hard-edged disc
 * of specks on its first frame.
 */
export function particleAlpha(p: Particle): number {
  const remaining = Math.max(0, Math.min(1, p.life / p.maxLife));
  const elapsed = 1 - remaining;
  const fadeIn = Math.min(1, elapsed / 0.15);
  return Math.max(0, Math.min(1, fadeIn * remaining));
}

/**
 * Adds a new burst to the live set, staying under the cap.
 *
 * Oldest first when something has to go: the specks nearest the end of their
 * lives are the faintest, so dropping those is the least visible way to lose
 * some, and it means a burst can never fail to appear because the screen was
 * already busy.
 */
export function mergeParticles(existing: readonly Particle[], incoming: readonly Particle[]): Particle[] {
  const merged = [...existing, ...incoming];
  if (merged.length <= MAX_PARTICLES) return merged;
  return merged.slice(merged.length - MAX_PARTICLES);
}

export interface ScheduledBurst {
  burst: Burst;
  /** Milliseconds to wait, so the burst lands with the thing it belongs to. */
  delayMs: number;
}

function centreOf(placement: Placement): { x: number; y: number } {
  return { x: placement.left + placement.width / 2, y: placement.top + placement.height / 2 };
}

/**
 * Which burst, if any, a card's journey between zones is worth.
 *
 * Driven off the flight system rather than off the engine for the same reason
 * the flights themselves are (see flight.ts): the client never has to be told a
 * creature died. Anything that moves a permanent to a graveyard produces ash,
 * including effects nobody has written yet.
 *
 * Only two journeys qualify. Everything else - a land being played, a card
 * drawn, a spell put on the stack - already has the card itself travelling,
 * which is plenty; adding a burst to each would turn a turn into fireworks.
 */
export function burstForFlight(
  flight: { from: Placement; to: Placement; delay: number },
  flightMs: number,
): ScheduledBurst | null {
  if (flight.from.zone === "battlefield" && flight.to.zone === "graveyard") {
    // At the far end, timed to the card landing: the ash is the permanent
    // arriving in the graveyard, not leaving the battlefield.
    const at = centreOf(flight.to);
    return { burst: { kind: "ash", x: at.x, y: at.y }, delayMs: flight.delay + flightMs };
  }
  if (flight.from.zone === "stack") {
    // At the near end, immediately: the spell resolving is it leaving the
    // stack, whether it then goes to the battlefield or to the graveyard.
    const at = centreOf(flight.from);
    return { burst: { kind: "resolve", x: at.x, y: at.y }, delayMs: flight.delay };
  }
  return null;
}
