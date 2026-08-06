/**
 * Game sounds, synthesised rather than sampled.
 *
 * Every note here is generated with the Web Audio API at runtime - there are no
 * audio files in this repo and nothing is downloaded. That is partly the same
 * copyright posture as the card art (CLAUDE.md: ship empty of other people's
 * content), and partly practical: a card game needs half a dozen short cues,
 * and half a dozen oscillators cost nothing and never 404.
 *
 * ## Why this was rewritten (2026-08-06)
 *
 * The first version was one oscillator per cue with a fixed twelve-millisecond
 * fade at each end. That is a *beep*, and a beep is what makes a game sound
 * cheap however good it looks - a card landing on a table is not a sine wave.
 *
 * Three things separate this from that, and none of them need a sample:
 *
 * **Cues are layered.** Real sounds have a transient (the sharp bit at the
 * front that tells you what hit what), a body (the pitched part) and a tail.
 * A card being played is mostly transient - paper, no pitch at all - and was
 * the worst served by a single oscillator. Each cue is now a list of voices
 * that start at their own offsets.
 *
 * **Noise is a first-class voice.** Anything involving paper, impact or
 * scraping is noise through a moving filter, not a tone. Half the cues here
 * have no oscillator in them any more.
 *
 * **There is a room.** A short feedback delay under everything, sent at a low
 * level, so cues have somewhere to decay into instead of stopping dead in an
 * anechoic void. A real reverb needs an impulse response, which is a file, so
 * this is the cheap version - and the cheap version is most of the effect.
 *
 * The overall level is deliberately low. Sound is the largest cheap gain in
 * perceived polish and the fastest way to wreck it is to be loud.
 */

export type Cue =
  | "card"
  | "land"
  | "attack"
  | "damage"
  | "death"
  | "draw"
  | "shield"
  | "turn"
  | "error";

/**
 * A tone: an oscillator with a pitch that can sweep. `to` below the fundamental
 * is what makes something read as landing rather than as rising.
 */
export interface ToneVoice {
  kind: "tone";
  type: OscillatorType;
  /** Hz at the start, and optionally where it sweeps to by the end. */
  from: number;
  to?: number;
  gain: number;
  /** Seconds, all of them. */
  attack: number;
  length: number;
  /** Seconds to wait after the cue begins. Layers a cue without a second call. */
  delay?: number;
}

/**
 * Filtered noise: paper, impact, scrape. The filter sweep is doing most of the
 * characterisation - the same noise through a falling lowpass is a thud and
 * through a rising bandpass is a riffle.
 */
export interface NoiseVoice {
  kind: "noise";
  filter: BiquadFilterType;
  /** Filter cutoff in Hz, and where it sweeps to. */
  from: number;
  to?: number;
  /** Filter Q. High values ring, which is how noise gets a sense of pitch. */
  q?: number;
  gain: number;
  attack: number;
  length: number;
  delay?: number;
}

export type Voice = ToneVoice | NoiseVoice;

/**
 * Nothing may be louder than this, per voice. Not a taste judgement - a typo of
 * 0.5 for 0.05 is a genuinely painful sound through headphones, and it is the
 * kind of mistake that is silent in review and obvious to whoever is wearing
 * them. Pinned by a test.
 */
export const MAX_VOICE_GAIN = 0.12;

/** Nor may any cue run longer than this. A game cue that outlasts the action is noise. */
export const MAX_CUE_SECONDS = 0.9;

const CUES: Record<Cue, Voice[]> = {
  /*
   * A card being played: paper landing on cloth. This fires more than anything
   * else, so it has to be soft enough to hear a hundred times.
   *
   * No oscillator at all. A card has no pitch, and the previous triangle-wave
   * blip was the single most toy-like sound in the game.
   */
  card: [
    // The slap of the card meeting the table.
    { kind: "noise", filter: "bandpass", from: 2600, to: 900, q: 0.8, gain: 0.05, attack: 0.002, length: 0.075 },
    // A short low thump under it, so it lands on something rather than in air.
    { kind: "tone", type: "sine", from: 240, to: 130, gain: 0.035, attack: 0.004, length: 0.09 },
  ],

  /*
   * A land: heavier, and the one cue that should sound like weight. Longer body,
   * lower sweep, and a click on the front so it reads as a hard surface rather
   * than a cushion.
   */
  land: [
    { kind: "noise", filter: "lowpass", from: 3200, to: 400, q: 1, gain: 0.055, attack: 0.001, length: 0.06 },
    { kind: "tone", type: "sine", from: 190, to: 62, gain: 0.075, attack: 0.005, length: 0.22 },
    // A second body an octave up, quieter and shorter - two partials read as a
    // struck object where one reads as a synthesiser.
    { kind: "tone", type: "triangle", from: 380, to: 150, gain: 0.025, attack: 0.004, length: 0.11 },
  ],

  /*
   * Attack: a call, not an impact - the impact is the damage cue a moment
   * later. Two rising notes with a breath of noise across them.
   */
  attack: [
    { kind: "tone", type: "sawtooth", from: 280, to: 400, gain: 0.03, attack: 0.012, length: 0.11 },
    { kind: "tone", type: "sawtooth", from: 420, to: 600, gain: 0.032, attack: 0.01, length: 0.15, delay: 0.075 },
    { kind: "noise", filter: "highpass", from: 1800, to: 4200, q: 0.7, gain: 0.02, attack: 0.03, length: 0.18 },
  ],

  /*
   * Damage: something hitting something. Transient first and loudest, pitch
   * dropping hard underneath it - the pitch drop is what the ear reads as force.
   */
  damage: [
    { kind: "noise", filter: "bandpass", from: 1800, to: 260, q: 1.4, gain: 0.06, attack: 0.001, length: 0.11 },
    { kind: "tone", type: "sawtooth", from: 300, to: 70, gain: 0.05, attack: 0.002, length: 0.17 },
  ],

  /*
   * Death: the same shape as damage but slower and further down, so the two are
   * recognisably related. A creature dying should feel like the end of the
   * sentence that the damage started.
   */
  death: [
    { kind: "noise", filter: "lowpass", from: 1400, to: 180, q: 1, gain: 0.045, attack: 0.004, length: 0.3 },
    { kind: "tone", type: "sawtooth", from: 180, to: 42, gain: 0.055, attack: 0.008, length: 0.42 },
    // A low tail that outlives the rest, which is the whole difference between
    // "that died" and "that was removed".
    { kind: "tone", type: "sine", from: 90, to: 46, gain: 0.03, attack: 0.05, length: 0.55, delay: 0.08 },
  ],

  /*
   * Draw: a card sliding off the top of the library. Rising filter on noise -
   * that is a riffle - with the faintest tone so it cuts through a busy moment.
   */
  draw: [
    { kind: "noise", filter: "bandpass", from: 1400, to: 5200, q: 1.6, gain: 0.035, attack: 0.006, length: 0.09 },
    { kind: "tone", type: "sine", from: 1300, to: 1750, gain: 0.014, attack: 0.006, length: 0.06 },
  ],

  /*
   * Damage that was prevented. Deliberately the near-opposite of the damage
   * cue: it rises rather than falls, and it rings rather than thuds. A shield
   * eating a hit used to play the impact sound, which said the exact opposite
   * of what had happened - the whole point is that nothing landed.
   */
  shield: [
    { kind: "noise", filter: "bandpass", from: 900, to: 2600, q: 6, gain: 0.03, attack: 0.004, length: 0.16 },
    { kind: "tone", type: "sine", from: 520, to: 780, gain: 0.03, attack: 0.008, length: 0.24 },
  ],

  /*
   * The turn changing hands - the one cue that is not an object doing
   * something, so the one place a pure tone is right rather than lazy.
   *
   * A rising fifth, which is the most unambiguous "and now this" interval
   * there is, over a low swell. Longer than everything else here on purpose:
   * it is punctuation between sentences rather than a word inside one, and
   * it fires once a turn rather than a dozen times.
   */
  turn: [
    { kind: "tone", type: "sine", from: 196, to: 294, gain: 0.045, attack: 0.03, length: 0.5 },
    { kind: "tone", type: "triangle", from: 392, to: 588, gain: 0.022, attack: 0.04, length: 0.42, delay: 0.05 },
    { kind: "noise", filter: "lowpass", from: 300, to: 1400, q: 1, gain: 0.018, attack: 0.12, length: 0.5 },
  ],

  /*
   * Error: the only cue allowed to be unpleasant, and the only one that should
   * be. Two dissonant tones a semitone apart, which is a sound nothing else
   * here makes.
   */
  error: [
    { kind: "tone", type: "square", from: 200, to: 170, gain: 0.04, attack: 0.004, length: 0.2 },
    { kind: "tone", type: "square", from: 212, to: 180, gain: 0.03, attack: 0.004, length: 0.2 },
  ],
};

/** The voices a cue is made of. Exported so the shape can be tested without a browser. */
export const CUE_VOICES: Readonly<Record<Cue, readonly Voice[]>> = CUES;

/** How long a cue runs, start to last voice finishing. */
export function cueDuration(cue: Cue): number {
  return Math.max(...CUES[cue].map((voice) => (voice.delay ?? 0) + voice.length));
}

/** The loudest single voice in a cue. */
export function peakGain(cue: Cue): number {
  return Math.max(...CUES[cue].map((voice) => voice.gain));
}

/**
 * Every cue that exists, so a test can check each one has something that plays
 * it. That is not busywork: the "land" cue sat here unheard for weeks because
 * the engine logged no line for a land drop, and nothing anywhere would have
 * told us. A sound that is never played looks exactly like a sound that works.
 */
export const CUE_NAMES = Object.keys(CUES) as Cue[];

const STORAGE_KEY = "mtg-commander-sim.sound";

let context: AudioContext | undefined;
let master: GainNode | undefined;
let space: GainNode | undefined;
let noiseBuffer: AudioBuffer | undefined;
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
    buildBus(context);
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

/**
 * The chain everything plays through, built once.
 *
 * A compressor on the way out, because cues overlap constantly - combat damage
 * on four creatures is four cues inside a tenth of a second - and without one
 * the sum clips into a crackle exactly when the most is happening.
 *
 * The "room" is a delay feeding back into itself through a lowpass. Each pass
 * is quieter and duller than the last, which is what a room does to a sound,
 * and at this send level it is not audible as an echo - just as the difference
 * between a cue that stops and a cue that ends.
 */
function buildBus(ctx: AudioContext): void {
  const out = ctx.createDynamicsCompressor();
  out.threshold.value = -18;
  out.knee.value = 12;
  out.ratio.value = 5;
  out.attack.value = 0.003;
  out.release.value = 0.14;
  out.connect(ctx.destination);

  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(out);

  const delay = ctx.createDelay(0.4);
  delay.delayTime.value = 0.075;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const damping = ctx.createBiquadFilter();
  damping.type = "lowpass";
  damping.frequency.value = 2000;

  space = ctx.createGain();
  space.gain.value = 0.22;
  space.connect(delay);
  delay.connect(damping).connect(feedback).connect(delay);
  delay.connect(master);
}

/**
 * A second of white noise, made once and replayed at different offsets.
 *
 * Generating a fresh buffer per cue would allocate 44,000 random numbers every
 * time a card is played, which for a sound lasting 75 milliseconds is absurd.
 * Every noise voice reads from a random point in this one, so they do not all
 * sound like the same recording.
 */
function noise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/**
 * Attack, then decay to silence.
 *
 * `exponentialRampToValueAtTime` cannot reach or pass zero - it throws on a
 * target of 0 and does nothing useful from one - which is why every ramp here
 * ends at 0.0001 and the node is stopped afterwards. The attack is per voice
 * rather than fixed: a card slap needs to be at full level in two milliseconds
 * or it is not a slap, while the tail of a death cue wants fifty.
 */
function envelope(ctx: AudioContext, voice: Voice, at: number): GainNode {
  const gain = ctx.createGain();
  const peak = Math.min(voice.gain, MAX_VOICE_GAIN);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + Math.max(0.001, voice.attack));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + voice.length);
  return gain;
}

function playVoice(ctx: AudioContext, voice: Voice, at: number): void {
  const gain = envelope(ctx, voice, at);
  gain.connect(master ?? ctx.destination);
  if (space) gain.connect(space);

  if (voice.kind === "tone") {
    const osc = ctx.createOscillator();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(voice.from, at);
    if (voice.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, voice.to), at + voice.length);
    }
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + voice.length + 0.02);
    return;
  }

  const source = ctx.createBufferSource();
  const buffer = noise(ctx);
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = voice.filter;
  filter.Q.value = voice.q ?? 1;
  filter.frequency.setValueAtTime(voice.from, at);
  if (voice.to !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, voice.to), at + voice.length);
  }
  source.connect(filter).connect(gain);
  // A random offset into the shared buffer, so ten cards played in a row are
  // ten slightly different sounds rather than one sound ten times.
  const offset = Math.random() * Math.max(0, buffer.duration - voice.length - 0.01);
  source.start(at, offset, voice.length + 0.02);
  source.stop(at + voice.length + 0.02);
}

export function play(cue: Cue): void {
  if (!enabled) return;
  const ctx = audio();
  if (!ctx) return;

  const start = ctx.currentTime;
  for (const voice of CUES[cue]) playVoice(ctx, voice, start + (voice.delay ?? 0));
}

/**
 * Picks the cue for a log line. The engine's log is already a description of
 * everything that happens, so driving sound off it means a new logged event
 * gets a sound for free rather than needing its own hook.
 */
export function cueForLogLine(line: string): Cue | undefined {
  const text = line.toLowerCase();
  if (text.includes(" dies")) return "death";
  // Before the damage test, not after: a prevented hit is a line containing the
  // word "damage" in which no damage was dealt, and playing the impact sound
  // for it would say the opposite of what happened.
  if (text.includes("prevented")) return "shield";
  if (text.includes("damage")) return "damage";
  if (text.includes("attacks with")) return "attack";
  if (text.includes("draws")) return "draw";
  // Only lands are "played" rather than cast, so this cannot catch a spell.
  // The engine had no line for a land drop at all until 2026-08-04, which is
  // why the land cue below existed for weeks without ever being heard.
  if (text.includes(" plays ")) return "land";
  if (text.includes("resolves")) return "card";
  return undefined;
}
