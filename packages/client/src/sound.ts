/**
 * Game sounds, synthesised rather than sampled.
 *
 * Every note here is generated with the Web Audio API at runtime - there are
 * no audio files in this repo and nothing is downloaded. That is partly the
 * same copyright posture as the card art (CLAUDE.md: ship empty of other
 * people's content), and partly just practical: a card game needs half a
 * dozen short cues, and half a dozen oscillators cost nothing and never 404.
 *
 * They are deliberately plain - a soft click for a card, a thud for a land, a
 * rising pair for combat. Sound is the cheapest large gain in perceived
 * polish, and the fastest way to make a game feel cheap is to overdo it.
 */

export type Cue = "card" | "land" | "attack" | "damage" | "death" | "draw" | "error";

interface Note {
  /** Hz. A second entry sweeps to that pitch. */
  from: number;
  to?: number;
  /** Seconds. */
  length: number;
  type: OscillatorType;
  gain: number;
}

const CUES: Record<Cue, Note[]> = {
  // A short, soft click - this fires most often, so it has to be unobtrusive.
  card: [{ from: 660, to: 880, length: 0.09, type: "triangle", gain: 0.05 }],
  // Lower and blunter: something heavy going down on the table.
  land: [{ from: 180, to: 120, length: 0.13, type: "sine", gain: 0.07 }],
  // Two rising notes - a call to arms rather than an impact.
  attack: [
    { from: 300, to: 420, length: 0.09, type: "square", gain: 0.035 },
    { from: 420, to: 560, length: 0.12, type: "square", gain: 0.035 },
  ],
  // Falling and harsh.
  damage: [{ from: 240, to: 90, length: 0.16, type: "sawtooth", gain: 0.05 }],
  death: [{ from: 160, to: 55, length: 0.32, type: "sawtooth", gain: 0.055 }],
  draw: [{ from: 1200, to: 1500, length: 0.05, type: "sine", gain: 0.03 }],
  error: [{ from: 200, to: 160, length: 0.18, type: "square", gain: 0.05 }],
};

const STORAGE_KEY = "mtg-commander-sim.sound";

let context: AudioContext | undefined;
let enabled = readEnabled();

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
  } catch {
    // A locked-down profile just doesn't remember the preference.
  }
}

/**
 * Browsers refuse to start audio until the user has interacted with the page,
 * so the context is created on the first cue rather than up front - by which
 * point a click has always happened.
 */
function audio(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return undefined;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

export function play(cue: Cue): void {
  if (!enabled) return;
  const ctx = audio();
  if (!ctx) return;

  let at = ctx.currentTime;
  for (const note of CUES[cue]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.from, at);
    if (note.to !== undefined) osc.frequency.exponentialRampToValueAtTime(note.to, at + note.length);

    // A hard start or stop on a raw oscillator clicks audibly; a very short
    // ramp at each end is the difference between a note and a pop.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(note.gain, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + note.length);

    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + note.length + 0.02);
    at += note.length * 0.75;
  }
}

/**
 * Picks the cue for a log line. The engine's log is already a description of
 * everything that happens, so driving sound off it means a new logged event
 * gets a sound for free rather than needing its own hook.
 */
export function cueForLogLine(line: string): Cue | undefined {
  const text = line.toLowerCase();
  if (text.includes(" dies")) return "death";
  if (text.includes("damage")) return "damage";
  if (text.includes("attacks with")) return "attack";
  if (text.includes("draws")) return "draw";
  if (text.includes("resolves")) return "card";
  return undefined;
}
