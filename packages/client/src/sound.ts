/**
 * Sound, from recordings rather than from oscillators.
 *
 * The previous version of this file synthesised everything - layered
 * oscillators, filtered noise, a feedback-delay room - and was deleted on
 * 2026-08-06 because no amount of layering makes a synthesiser sound like card
 * stock hitting a table. This one plays actual foley.
 *
 * The samples are Kenney's Casino Audio pack, CC0 (public domain), committed to
 * the repo under `packages/client/public/sfx/` with the licence beside them.
 * That is a deliberate difference from the card art and the mana symbols: those
 * are Wizards' and are gitignored, this is ours to redistribute and there is no
 * reason to make a fresh clone go and find it.
 *
 * Three things make recordings sound like a game rather than like a soundboard:
 *
 * - **Variants.** Most cues have several takes and pick one at random, never
 *   the same one twice running. A hand of seven cards deals seven times in a
 *   second, and one sample repeated seven times is a machine gun.
 * - **Detune.** Each play is nudged a few percent in speed. Even across eight
 *   takes, exact repetition is what gives a sample library away.
 * - **A voice cap.** Four creatures taking combat damage is four cues inside a
 *   tenth of a second; past a handful of concurrent voices the sum clips and
 *   the whole thing turns to mush.
 *
 * What is *not* covered: the pack is card and casino foley, so there is nothing
 * in it for a sword landing. Combat damage borrows a poker-chip clack, which is
 * a stand-in rather than the right sound, and `attack` has no cue at all. See
 * SAMPLES for where a combat pack would slot in.
 */

/** Everything that can make a noise. Adding one means adding a row to SAMPLES. */
export type Cue =
  | "card"
  | "land"
  | "draw"
  | "shuffle"
  | "sweep"
  | "gain"
  | "damage"
  | "shield"
  | "mana"
  | "refuse";

const SFX = "/sfx";

const slides = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${SFX}/card-slide-${n}.ogg`);
const places = [1, 2, 3, 4].map((n) => `${SFX}/card-place-${n}.ogg`);
const shoves = [1, 2, 3, 4].map((n) => `${SFX}/card-shove-${n}.ogg`);
const collides = [1, 2, 3, 4].map((n) => `${SFX}/chips-collide-${n}.ogg`);
const chipLays = [1, 2, 3].map((n) => `${SFX}/chip-lay-${n}.ogg`);
const chipStacks = [1, 2, 3].map((n) => `${SFX}/chips-stack-${n}.ogg`);

export interface CueSpec {
  /** One is picked at random per play. Several takes is what stops repetition. */
  files: readonly string[];
  /** Relative loudness. 1 is the ceiling; nothing here should need to be at it. */
  gain: number;
  /**
   * Playback speed, which is also pitch. Below 1 reads as heavier and larger -
   * the only difference between playing a spell and playing a land is that a
   * land goes down harder, and this is that.
   */
  rate?: number;
}

export const SAMPLES: Record<Cue, CueSpec> = {
  /** Casting a spell: a card going down on the table. */
  card: { files: places, gain: 0.55 },
  /** Playing a land. The same action, pitched down so it lands heavier. */
  land: { files: places, gain: 0.62, rate: 0.85 },
  /** Drawing, and each card of the opening deal - a card sliding off the top. */
  draw: { files: slides, gain: 0.4 },
  /** A mulligan. The one cue with a single take, because there is one shuffle. */
  shuffle: { files: [`${SFX}/card-shuffle.ogg`], gain: 0.5 },
  /** Anything leaving the board - dying, destroyed, exiled. A card swept aside. */
  sweep: { files: shoves, gain: 0.5 },
  /** Life gained: chips stacking up. */
  gain: { files: chipStacks, gain: 0.45 },
  /**
   * Damage. A poker chip clack, and the one honest compromise in this file -
   * it is an impact of about the right length and weight, but it is not the
   * sound of a creature being hit. Kenney's RPG Audio pack has real impacts if
   * this reads wrong.
   */
  damage: { files: collides, gain: 0.5 },
  /** Damage prevented. Deliberately *not* the damage cue - see cueForLogLine. */
  shield: { files: chipLays, gain: 0.45, rate: 1.25 },
  /** A land tapped for mana. */
  mana: { files: chipLays, gain: 0.35 },
  /** The game refusing something. Low and blunt. */
  refuse: { files: collides, gain: 0.4, rate: 0.8 },
};

/* --- what the log is saying ------------------------------------------------ */

/**
 * Picks a cue from a log line, so anything the engine learns to describe gets a
 * sound for free rather than needing a call site.
 *
 * **Order is load-bearing.** "3 damage to Deadly Donny prevented" contains the
 * word "damage", so the prevention test has to come first - it did not, once,
 * and prevented damage played the impact, which said the exact opposite of what
 * had happened.
 */
export function cueForLogLine(line: string): Cue | undefined {
  if (/ prevented/.test(line)) return "shield";
  if (/ deals \d+ damage/.test(line)) return "damage";
  if (/ gains \d+ life/.test(line)) return "gain";
  if (/ draws \d+ card/.test(line)) return "draw";
  if (/ casts /.test(line)) return "card";
  if (/ plays /.test(line)) return "land";
  if (/ takes a mulligan/.test(line)) return "shuffle";
  if (/ dies| is destroyed| is exiled/.test(line)) return "sweep";
  return undefined;
}

/* --- playing it ------------------------------------------------------------ */

const STORAGE_KEY = "mtg-sim.sound";

/**
 * How many samples may overlap. Past this the oldest is dropped rather than
 * added to - a stack of eight simultaneous chip clacks is louder than any one
 * of them by a factor that clips.
 */
const MAX_VOICES = 6;

/** How far each play is nudged in speed, either way. */
const DETUNE = 0.06;

let enabled = readEnabled();
let context: AudioContext | undefined;
let master: GainNode | undefined;
const buffers = new Map<string, AudioBuffer | null>();
const lastPick = new Map<Cue, number>();
let voices = 0;

function readEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // A browser with storage blocked still gets sound, just not a memory of it.
  }
}

/**
 * The context is created on the first play rather than at import, because
 * browsers refuse to start one outside a user gesture and a context created
 * suspended stays suspended. The first play is always after a click - keeping
 * an opening hand, at the latest.
 */
function audio(): { ctx: AudioContext; out: GainNode } | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return undefined;
  if (!context) {
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.9;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return { ctx: context, out: master! };
}

/**
 * Fetches and decodes a sample once, and remembers a failure as `null` so a
 * missing file is one 404 rather than one per play. Missing is a supported
 * state: somebody may have swapped the pack out, and a game with no sound is
 * better than a game that stutters on every card.
 */
async function load(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  const cached = buffers.get(url);
  if (cached !== undefined) return cached;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(String(response.status));
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
    buffers.set(url, buffer);
    return buffer;
  } catch {
    buffers.set(url, null);
    return null;
  }
}

/**
 * Picks a take, never the one that just played.
 *
 * Exported and pure so the no-immediate-repeat rule can be tested: it is the
 * difference between a deal sounding like cards and sounding like a loop.
 */
export function pickIndex(count: number, previous: number | undefined, random = Math.random): number {
  if (count <= 1) return 0;
  const choice = Math.floor(random() * (count - 1));
  return previous === undefined ? Math.floor(random() * count) : (previous + 1 + choice) % count;
}

export function play(cue: Cue): void {
  if (!enabled) return;
  const spec = SAMPLES[cue];
  if (!spec || voices >= MAX_VOICES) return;
  const bus = audio();
  if (!bus) return;

  const index = pickIndex(spec.files.length, lastPick.get(cue));
  lastPick.set(cue, index);
  const url = spec.files[index]!;

  void load(bus.ctx, url).then((buffer) => {
    if (!buffer || !enabled || voices >= MAX_VOICES) return;
    const source = bus.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = (spec.rate ?? 1) * (1 + (Math.random() * 2 - 1) * DETUNE);
    const gain = bus.ctx.createGain();
    gain.gain.value = spec.gain;
    source.connect(gain).connect(bus.out);
    voices += 1;
    source.onended = () => {
      voices -= 1;
    };
    source.start();
  });
}

/** Loads every sample up front, so the first of each cue is not late. */
export function primeSounds(): void {
  const bus = audio();
  if (!bus) return;
  for (const spec of Object.values(SAMPLES)) {
    for (const url of spec.files) void load(bus.ctx, url);
  }
}
