import { getMuted, setMutedPref } from "./storage";

/**
 * Tiny WebAudio synth: every sound effect, the ocean bed and the gentle
 * background music are generated at runtime – no audio assets required.
 */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const CHORDS = [
  { root: 110.0, notes: [220.0, 261.63, 329.63, 440.0] }, // Am
  { root: 87.31, notes: [174.61, 220.0, 261.63, 349.23] }, // F
  { root: 130.81, notes: [261.63, 329.63, 392.0, 523.25] }, // C
  { root: 98.0, notes: [196.0, 246.94, 293.66, 392.0] }, // G
];
const ARP = [0, 1, 2, 3, 2, 1, 3, 2];

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  delay?: number;
  attack?: number;
}
interface NoiseOpts {
  vol?: number;
  freq?: number;
  to?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
  attack?: number;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  music!: GainNode;
  echo!: GainNode;
  muted = getMuted();
  silent = false;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private nextNote = 0;
  private step = 0;
  private ambientStarted = false;
  private lastCatch = 0;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(c.destination);
      this.sfx = c.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.music = c.createGain();
      this.music.gain.value = 0.5;
      this.music.connect(this.master);
      // simple feedback echo for music
      const delay = c.createDelay(1);
      delay.delayTime.value = 0.36;
      const fb = c.createGain();
      fb.gain.value = 0.35;
      this.echo = c.createGain();
      this.echo.gain.value = 0.5;
      this.echo.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(this.music);
      // noise buffer
      const len = c.sampleRate * 3;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5 * 0.6 + w * 0.4;
      }
      this.noiseBuf = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.startAmbient();
    this.startMusic();
  }

  setMuted(m: boolean) {
    this.muted = m;
    setMutedPref(m);
    if (this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  duck(on: boolean) {
    if (!this.ctx) return;
    this.music.gain.setTargetAtTime(on ? 0.18 : 0.5, this.ctx.currentTime, 0.15);
  }

  private startAmbient() {
    if (this.ambientStarted || !this.ctx || !this.noiseBuf) return;
    this.ambientStarted = true;
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 520;
    const g = c.createGain();
    g.gain.value = 0.13;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
    lfo.start();
  }

  private startMusic() {
    if (this.musicTimer !== null || !this.ctx) return;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 100);
  }

  private schedule() {
    const c = this.ctx;
    if (!c || c.state !== "running") return;
    const eighth = 60 / 92 / 2;
    while (this.nextNote < c.currentTime + 0.3) {
      this.playStep(this.step, this.nextNote);
      this.nextNote += eighth;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const c = this.ctx!;
    const chord = CHORDS[Math.floor(step / 8) % 4];
    const pos = step % 8;
    if (pos === 0 || pos === 4) {
      this.musicTone(chord.root, t, 0.9, pos === 0 ? 0.16 : 0.1, "triangle", false);
    }
    if (Math.random() < 0.86) {
      const n = chord.notes[ARP[pos]] * (Math.random() < 0.18 ? 2 : 1);
      this.musicTone(n, t, 0.42, 0.055, "sine", true);
    }
    void c;
  }

  private musicTone(freq: number, t: number, dur: number, vol: number, type: OscillatorType, echo: boolean) {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(this.music);
    if (echo) g.connect(this.echo);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------- helpers
  private tone(freq: number, dur: number, o: ToneOpts = {}) {
    const c = this.ctx;
    if (!c || this.muted || this.silent) return;
    const t = c.currentTime + (o.delay ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t + dur);
    const vol = o.vol ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, o: NoiseOpts = {}) {
    const c = this.ctx;
    if (!c || !this.noiseBuf || this.muted || this.silent) return;
    const t = c.currentTime + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type ?? "lowpass";
    f.frequency.setValueAtTime(o.freq ?? 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + dur);
    f.Q.value = o.q ?? 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol ?? 0.3, t + (o.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------------- sfx
  click() {
    this.tone(660, 0.07, { type: "triangle", vol: 0.12 });
  }
  start() {
    [392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.25, { type: "triangle", vol: 0.14, delay: i * 0.07 }));
  }
  net() {
    this.noise(0.28, { type: "bandpass", freq: 500, to: 1800, q: 1.2, vol: 0.28, attack: 0.06 });
  }
  splash(size = 1) {
    this.noise(0.4, { type: "lowpass", freq: 2400, to: 300, vol: 0.32 * size });
    this.tone(220, 0.18, { type: "sine", slide: 70, vol: 0.22 * size });
  }
  harpoon() {
    this.noise(0.22, { type: "highpass", freq: 900, to: 3600, vol: 0.22, attack: 0.02 });
    this.tone(700, 0.16, { type: "sawtooth", slide: 180, vol: 0.09 });
    this.tone(120, 0.12, { type: "square", slide: 60, vol: 0.12 });
  }
  hit(big = false) {
    this.tone(big ? 150 : 200, 0.3, { type: "sine", slide: 40, vol: big ? 0.5 : 0.35 });
    this.noise(0.22, { type: "lowpass", freq: 1500, to: 200, vol: big ? 0.4 : 0.25 });
  }
  thunk() {
    this.tone(180, 0.12, { type: "triangle", slide: 90, vol: 0.2 });
  }
  catchFish(combo: number, tier: number) {
    const c = this.ctx;
    if (!c) return;
    const now = c.currentTime;
    // avoid stacking too many identical dings at the exact same time
    if (now - this.lastCatch < 0.02) return;
    this.lastCatch = now;
    const idx = Math.min(PENTA.length - 1, Math.max(0, combo - 1));
    const f = 392 * Math.pow(2, PENTA[idx] / 12);
    this.tone(f, 0.32, { type: "triangle", vol: 0.22 });
    this.tone(f * 2, 0.22, { type: "sine", vol: 0.08 });
    if (tier >= 2) this.tone(f * 1.5, 0.3, { type: "sine", vol: 0.1, delay: 0.07 });
    if (tier >= 3) {
      this.tone(f * 2, 0.4, { type: "triangle", vol: 0.12, delay: 0.14 });
      this.tone(f * 3, 0.4, { type: "sine", vol: 0.06, delay: 0.2 });
    }
  }
  arrive() {
    this.tone(880, 0.06, { type: "sine", vol: 0.05 });
  }
  sonar() {
    this.tone(1250, 0.9, { type: "sine", vol: 0.2, slide: 1100 });
    this.tone(620, 0.9, { type: "sine", vol: 0.1, delay: 0.18 });
  }
  pickup() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.18, { type: "triangle", vol: 0.16, delay: i * 0.06 }));
  }
  boost() {
    this.noise(0.5, { type: "bandpass", freq: 300, to: 1600, q: 0.9, vol: 0.3, attack: 0.1 });
    this.tone(90, 0.4, { type: "sawtooth", slide: 160, vol: 0.12 });
  }
  thunder() {
    this.noise(1.4, { type: "lowpass", freq: 500, to: 70, vol: 0.6, attack: 0.02 });
    this.tone(60, 0.8, { type: "sine", slide: 30, vol: 0.35 });
  }
  warn() {
    this.tone(1000, 0.08, { type: "square", vol: 0.06 });
  }
  bite() {
    this.noise(0.2, { type: "bandpass", freq: 900, to: 200, vol: 0.35 });
    this.tone(130, 0.25, { type: "sawtooth", slide: 50, vol: 0.25 });
  }
  discover() {
    [392, 493.88, 587.33, 783.99, 987.77].forEach((f, i) => this.tone(f, 0.45, { type: "triangle", vol: 0.15, delay: i * 0.09 }));
  }
  combo(level: number) {
    const f = 440 * Math.pow(2, (level * 2) / 12);
    this.tone(f, 0.18, { type: "square", vol: 0.06 });
    this.tone(f * 1.5, 0.28, { type: "triangle", vol: 0.12, delay: 0.06 });
  }
  tick() {
    this.tone(1300, 0.05, { type: "square", vol: 0.07 });
  }
  gameOver() {
    [523.25, 466.16, 392, 311.13, 261.63].forEach((f, i) => this.tone(f, 0.5, { type: "triangle", vol: 0.2, delay: i * 0.16 }));
  }
  ready() {
    this.tone(1046, 0.05, { type: "sine", vol: 0.04 });
  }
}

export const audio = new AudioEngine();
