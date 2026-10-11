/**
 * Synthesises a cheesy "online guru" trap bed: 140 BPM, half-time feel, 8 bars, seamless loop.
 * Node only, no deps. Run: npx tsx scripts/make-guru-beat.ts  (npm run music:guru)
 * Output: public/music/guru-beat.wav (48 kHz, 16-bit, stereo).
 * Voices wrap around the loop end (circular mix) so the file loops with no seam.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

const SR = 48000;
const BPM = 140;
const STEP = 60 / BPM / 4; // one sixteenth in seconds
const STEPS = 128; // 8 bars x 16
const N = Math.round(STEPS * STEP * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);
const stepAt = (s: number) => Math.round(s * STEP * SR);

/** Add mono signal x into the stereo bus at sample `start`, wrapping around the loop. */
function mix(x: Float32Array, start: number, gain: number, pan = 0) {
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < x.length; i++) {
    const j = (start + i) % N;
    L[j] += x[i] * gl;
    R[j] += x[i] * gr;
  }
}

// ---- step sequencer: 32 sixteenths = 2 bars, repeated 4x. 'x' = hit ----
const pat = (s: string) => [...s.replace(/[ |]/g, '')].map((c) => c !== '.');
const KICK = pat('x...|..x.|....|..x. x...|....|..x.|x...'); // 808 pattern
const CLAP = pat('....|....|x...|.... ....|....|x...|....'); // beat 3 of each bar
const HAT = pat('x.x.|x.x.|x.x.|x.x. x.x.|x.x.|x.x.|xxxx'); // 1/8ths, roll end of bar 4
// bar 8 also rolls, handled in hat loop below

// Lead motif: 2 bars, [step, midi, lengthInSteps]
const A4 = 69;
const MOTIF: [number, number, number][] = [
  [0, A4, 2], [2, A4 + 3, 2], [4, A4 + 7, 4], [8, A4 + 5, 2], [10, A4 + 3, 2], [12, A4 + 7, 4],
  [16, A4 + 3, 2], [18, A4 + 2, 2], [20, A4, 4], [24, A4 - 2, 2], [26, A4, 2], [28, A4 + 2, 4],
];
// Bass root per bar (A A F G, repeated twice over 8 bars)
const ROOTS = [45, 45, 41, 43]; // A2 A2 F2 G2

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

function lowpass(x: Float32Array, fc: number) {
  const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
  const y = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) y[i] = s += a * (x[i] - s);
  return y;
}
const highpass = (x: Float32Array, fc: number) => {
  const lp = lowpass(x, fc);
  return x.map((v, i) => v - lp[i]);
};

function kick(): Float32Array {
  const len = Math.round(0.6 * SR), y = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 40 + 15 * Math.exp(-t / 0.05); // 55 -> 40 Hz glide
    ph += (2 * Math.PI * f) / SR;
    const env = Math.exp(-t / 0.3) * Math.min(1, t / 0.002);
    y[i] = Math.sin(ph) * env * 1.4 + (t < 0.004 ? rnd() * 0.3 : 0);
  }
  return y;
}
function clap(): Float32Array {
  const len = Math.round(0.35 * SR), y = new Float32Array(len);
  const n = highpass(lowpass(Float32Array.from({length: len}, rnd), 7000), 900);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    // three quick flams then a tail
    const flam = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) / 0.006) : 0), 0);
    const env = Math.max(flam * 0.5, 0) + Math.exp(-t / 0.09);
    y[i] = n[i] * env * 0.8 + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t / 0.07) * 0.5;
  }
  return y;
}
function hat(open = false): Float32Array {
  const len = Math.round((open ? 0.12 : 0.045) * SR);
  const n = Float32Array.from({length: len}, rnd);
  const h = highpass(n, 7000);
  for (let i = 0; i < len; i++) h[i] *= Math.exp(-(i / SR) / (open ? 0.05 : 0.012));
  return h;
}
function sub(midi: number, steps: number): Float32Array {
  const len = Math.round(steps * STEP * SR), y = new Float32Array(len), f = mtof(midi);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const fade = Math.min(1, t / 0.005, (len - i) / (0.01 * SR));
    y[i] = Math.sin(2 * Math.PI * f * t) * fade * 0.55;
  }
  return y;
}
/** Detuned saw pair as additive harmonics (band-limited), vibrato, soft low-pass. */
function lead(midi: number, steps: number): Float32Array {
  const len = Math.round(steps * STEP * SR), y = new Float32Array(len);
  const f0 = mtof(midi);
  const ph = [0, 0];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.2);
    let s = 0;
    [0.996, 1.004].forEach((det, k) => {
      const f = f0 * det * vib;
      ph[k] += (2 * Math.PI * f) / SR;
      for (let h = 1; h * f < 6000; h++) s += Math.sin(h * ph[k]) / h;
    });
    const env = Math.min(1, t / 0.008) * Math.min(1, (len - i) / (0.015 * SR)) * (0.75 + 0.25 * Math.exp(-t / 0.15));
    y[i] = s * env * 0.16;
  }
  return lowpass(lowpass(y, 3200), 4500);
}

// ---- arrange ----
const kickS = kick(), clapS = clap(), hatC = hat(), hatO = hat(true);
for (let bar2 = 0; bar2 < 4; bar2++) {
  const base = bar2 * 32;
  for (let i = 0; i < 32; i++) {
    const s = base + i;
    if (KICK[i]) mix(kickS, stepAt(s), 0.9);
    if (CLAP[i]) { mix(clapS, stepAt(s), 0.55, -0.05); }
    if (HAT[i] && !(i >= 28 && bar2 % 2 === 1)) mix(i % 8 === 6 && i < 28 ? hatO : hatC, stepAt(s), 0.28, (i / 2) % 2 ? 0.35 : -0.35);
  }
  for (const [st, m, len] of MOTIF) mix(lead(m, len), stepAt(base + st), 1, 0.15);
}
// 1/16 hat rolls at the end of bars 4 and 8, with a rising velocity
for (const barEnd of [16 * 4, 16 * 8]) {
  for (let k = 0; k < 4; k++) mix(hatC, stepAt(barEnd - 4 + k), 0.18 + 0.07 * k, k % 2 ? 0.35 : -0.35);
}
// sub follows the kick root: each kick hit holds until the next kick (max 4 steps)
for (let bar = 0; bar < 8; bar++) {
  const root = ROOTS[bar % 4];
  for (let i = 0; i < 16; i++) {
    const idx = bar * 16 + i, within = idx % 32;
    if (KICK[within]) mix(sub(root, 3), stepAt(idx), 0.8);
  }
}

// ---- master: soft clip, normalise to -3 dBFS ----
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.2);
  R[i] = Math.tanh(R[i] * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = Math.pow(10, -3 / 20) / peak;

// ---- RIFF writer ----
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
const out = 'public/music/guru-beat.wav';
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, Buffer.concat([hdr, data]));
console.log(`wrote ${out}: ${(N / SR).toFixed(3)}s`);
