/**
 * How anything on the table asks for a burst of particles.
 *
 * A module-level channel rather than a React context, matching sound.ts, and
 * for the same reason: the things that want to make a noise or throw off a few
 * specks are scattered five levels deep in the tree (a card taking damage, a
 * land being tapped), and threading a callback down to every one of them would
 * add a prop to four components in order to move a dot. Nothing reads back out
 * of here and nothing renders from it, so there is no state to get out of step.
 *
 * The layer registers itself as the sink when it mounts. Before that - and
 * after it unmounts, and in a test with no DOM at all - emitting is a no-op
 * rather than an error, which is the correct behaviour for decoration.
 */

import type { Burst } from "./particles.js";

const STORAGE_KEY = "mtg-commander-sim.particles";

let sink: ((burst: Burst) => void) | null = null;
let enabled = readEnabled();
let reducedMotion = readReducedMotion();

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    // No storage (a locked-down profile, or no DOM at all): default to on.
    return true;
  }
}

/**
 * Someone who has asked their operating system to stop things moving has asked
 * for this too, and they should not have to find a checkbox in a card game to
 * be taken at their word. Read once - it is a preference, not a live signal,
 * and a page reload is a reasonable price for changing it.
 */
function readReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function particlesEnabled(): boolean {
  return enabled;
}

/** Whether the toggle is being overridden by the operating system's setting. */
export function particlesSuppressedByMotionPreference(): boolean {
  return reducedMotion;
}

export function setParticlesEnabled(value: boolean): void {
  enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    // A locked-down profile just doesn't remember the preference.
  }
}

export function setParticleSink(next: ((burst: Burst) => void) | null): void {
  sink = next;
}

export function emitParticles(burst: Burst): void {
  if (!enabled || reducedMotion || !sink) return;
  sink(burst);
}
