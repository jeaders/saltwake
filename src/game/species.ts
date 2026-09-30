import { TAU, hash2 } from "./util";
import { EXTRA_FISH } from "./fish-data";
import { NEW_FISH } from "./fish-expansion";
import { drawSquid, drawSeahorse } from "./special-sprites";

export type Shape = "fish" | "round" | "long" | "ray" | "shark" | "orca" | "angler" | "flat" | "eel" | "squid" | "seahorse";
export type Pattern = "none" | "stripes" | "spots" | "bands" | "line";

export interface Species {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  value: number;
  /** seconds of daylight restored when caught */
  time: number;
  len: number;
  wid: number;
  speed: number;
  panic: number;
  flee: number;
  school: [number, number];
  body: string;
  flank: string;
  fin: string;
  mark: string;
  pattern: Pattern;
  shape: Shape;
  bill?: number;
  billColor?: string;
  glow?: string;
  predator?: boolean;
  lure?: boolean;
  note?: string;
  protected?: boolean;
  spiky?: boolean;
}

const S = (s: Species) => s;

export const SPECIES: Record<string, Species> = {
  // ---------- Sunny Shallows ----------
  sardine: S({ id: "sardine", name: "Sardine", tier: 1, value: 10, time: 0.4, len: 24, wid: 8, speed: 85, panic: 190, flee: 140, school: [9, 16], body: "#8fb0d4", flank: "#e3eefa", fin: "#6f8fb5", mark: "#4f6f98", pattern: "line", shape: "fish" }),
  mackerel: S({ id: "mackerel", name: "Mackerel", tier: 1, value: 20, time: 0.6, len: 34, wid: 11, speed: 100, panic: 220, flee: 150, school: [5, 9], body: "#2a7fb0", flank: "#dcebf0", fin: "#1f5f88", mark: "#0f3d5e", pattern: "stripes", shape: "fish" }),
  yellowtail: S({ id: "yellowtail", name: "Yellowtail", tier: 2, value: 45, time: 1.2, len: 50, wid: 15, speed: 115, panic: 250, flee: 170, school: [2, 4], body: "#e8b93a", flank: "#fff2b8", fin: "#d99a1a", mark: "#2d7fb8", pattern: "line", shape: "fish" }),
  bluefin: S({ id: "bluefin", name: "Bluefin Tuna", tier: 3, value: 160, time: 3, len: 92, wid: 28, speed: 130, panic: 300, flee: 220, school: [1, 1], body: "#1f4f86", flank: "#c8d9e8", fin: "#173c66", mark: "#f0cf4a", pattern: "line", shape: "fish" }),
  // ---------- Coral Reef ----------
  clownfish: S({ id: "clownfish", name: "Clownfish", tier: 1, value: 25, time: 0.6, len: 26, wid: 12, speed: 80, panic: 190, flee: 130, school: [4, 8], body: "#ff7a1c", flank: "#ffb266", fin: "#ff6a10", mark: "#ffffff", pattern: "bands", shape: "round" }),
  angelfish: S({ id: "angelfish", name: "Angelfish", tier: 2, value: 50, time: 1.2, len: 40, wid: 26, speed: 90, panic: 210, flee: 160, school: [2, 4], body: "#2f6fe0", flank: "#f5d44a", fin: "#f2c230", mark: "#a8d6ff", pattern: "stripes", shape: "round" }),
  pufferfish: S({ id: "pufferfish", name: "Pufferfish", tier: 2, value: 60, time: 1.4, len: 36, wid: 30, speed: 60, panic: 140, flee: 130, school: [1, 3], body: "#d9c27a", flank: "#fff3c4", fin: "#c7a75a", mark: "#8a6f2c", pattern: "spots", shape: "round" }),
  manta: S({ id: "manta", name: "Manta Ray", tier: 3, value: 260, time: 4, len: 112, wid: 124, speed: 100, panic: 210, flee: 240, school: [1, 1], body: "#27304f", flank: "#4b5d92", fin: "#1a2038", mark: "#eaf2ff", pattern: "spots", shape: "ray" }),
  // ---------- Kelp Forest ----------
  perch: S({ id: "perch", name: "Green Perch", tier: 1, value: 22, time: 0.6, len: 30, wid: 11, speed: 85, panic: 200, flee: 140, school: [5, 9], body: "#6aa84f", flank: "#e4f0a8", fin: "#4f8a3a", mark: "#2f5a26", pattern: "stripes", shape: "fish" }),
  salmon: S({ id: "salmon", name: "Salmon", tier: 2, value: 55, time: 1.3, len: 52, wid: 15, speed: 120, panic: 260, flee: 170, school: [2, 4], body: "#ff8f7a", flank: "#ffd8c8", fin: "#e86a58", mark: "#c94a3c", pattern: "spots", shape: "fish" }),
  sturgeon: S({ id: "sturgeon", name: "Giant Sturgeon", tier: 3, value: 240, time: 4, len: 132, wid: 24, speed: 70, panic: 170, flee: 200, school: [1, 1], body: "#6b7a5a", flank: "#bcc79e", fin: "#56634a", mark: "#3d4833", pattern: "spots", shape: "long" }),
  // ---------- Arctic Floes ----------
  cod: S({ id: "cod", name: "Arctic Cod", tier: 1, value: 28, time: 0.7, len: 34, wid: 12, speed: 85, panic: 200, flee: 140, school: [5, 9], body: "#a79678", flank: "#e8dfca", fin: "#8a7a5f", mark: "#5e5240", pattern: "spots", shape: "fish" }),
  char: S({ id: "char", name: "Arctic Char", tier: 2, value: 58, time: 1.3, len: 46, wid: 14, speed: 115, panic: 250, flee: 170, school: [2, 4], body: "#8fb2c8", flank: "#ff9a7a", fin: "#ff8a66", mark: "#ffffff", pattern: "spots", shape: "fish" }),
  narwhal: S({ id: "narwhal", name: "Narwhal", tier: 3, value: 320, time: 5, len: 118, wid: 38, speed: 85, panic: 210, flee: 230, school: [1, 1], body: "#c2cfdb", flank: "#f0f4f8", fin: "#9fb0bf", mark: "#6d7f90", pattern: "spots", shape: "orca", bill: 0.5, billColor: "#fff6e0" }),
  // ---------- Storm Sea ----------
  sparkfish: S({ id: "sparkfish", name: "Sparkfish", tier: 1, value: 30, time: 0.7, len: 26, wid: 9, speed: 110, panic: 240, flee: 150, school: [6, 10], body: "#ffe94d", flank: "#fffbd0", fin: "#ffd21a", mark: "#ffffff", pattern: "line", shape: "fish", glow: "#ffe94d" }),
  dorado: S({ id: "dorado", name: "Dorado", tier: 2, value: 70, time: 1.4, len: 56, wid: 16, speed: 125, panic: 270, flee: 180, school: [2, 3], body: "#2ec4a6", flank: "#ffe066", fin: "#1ea88c", mark: "#7dffe0", pattern: "spots", shape: "fish" }),
  swordfish: S({ id: "swordfish", name: "Swordfish", tier: 3, value: 280, time: 4, len: 110, wid: 22, speed: 150, panic: 320, flee: 240, school: [1, 1], body: "#3a5f8f", flank: "#d3deec", fin: "#2b4870", mark: "#9bb7d8", pattern: "line", shape: "fish", bill: 0.45, billColor: "#9aa9b8" }),
  // ---------- Abyss ----------
  lantern: S({ id: "lantern", name: "Lanternfish", tier: 1, value: 40, time: 0.8, len: 26, wid: 10, speed: 80, panic: 190, flee: 150, school: [7, 12], body: "#2f4a8f", flank: "#6ee7ff", fin: "#22387a", mark: "#b4f8ff", pattern: "spots", shape: "fish", glow: "#6ee7ff" }),
  viperfish: S({ id: "viperfish", name: "Viperfish", tier: 2, value: 90, time: 1.6, len: 50, wid: 13, speed: 120, panic: 260, flee: 180, school: [2, 3], body: "#1b2848", flank: "#4a6cae", fin: "#101a30", mark: "#7cf7ff", pattern: "spots", shape: "fish", glow: "#7cf7ff" }),
  oarfish: S({ id: "oarfish", name: "Oarfish", tier: 3, value: 420, time: 5, len: 150, wid: 18, speed: 90, panic: 200, flee: 220, school: [1, 1], body: "#cfd8e6", flank: "#ffffff", fin: "#ff4a6a", mark: "#ff4a6a", pattern: "line", shape: "long", glow: "#ffb0c0" }),
  ...Object.fromEntries([...EXTRA_FISH,...NEW_FISH].map(sp => [sp.id, sp])),
  // ---------- Predators ----------
  shark: S({ id: "shark", name: "Reef Shark", tier: 3, value: 260, time: 4, len: 104, wid: 28, speed: 90, panic: 0, flee: 0, school: [1, 1], body: "#7d8b99", flank: "#c9d2da", fin: "#5d6a77", mark: "#3d4650", pattern: "none", shape: "shark", predator: true }),
  orca: S({ id: "orca", name: "Orca", tier: 3, value: 380, time: 5, len: 124, wid: 44, speed: 95, panic: 0, flee: 0, school: [1, 1], body: "#121b29", flank: "#26344a", fin: "#0b121c", mark: "#ffffff", pattern: "none", shape: "orca", predator: true }),
  angler: S({ id: "angler", name: "Anglerfish", tier: 3, value: 520, time: 6, len: 78, wid: 58, speed: 90, panic: 0, flee: 0, school: [1, 1], body: "#2d2142", flank: "#5b3f7a", fin: "#1a1228", mark: "#ffd36b", pattern: "spots", shape: "angler", predator: true, lure: true, glow: "#ffd36b" }),
};


const LOCAL_NAMES: Record<string, string> = {"sardine": "Sardina", "mackerel": "Sgombro", "yellowtail": "Ricciola", "bluefin": "Tonno rosso", "clownfish": "Pesce pagliaccio", "angelfish": "Pesce angelo", "pufferfish": "Pesce palla", "manta": "Manta", "perch": "Persico verde", "salmon": "Salmone", "sturgeon": "Storione gigante", "cod": "Merluzzo artico", "char": "Salmerino", "narwhal": "Narvalo", "sparkfish": "Pesce scintilla", "dorado": "Lampuga", "swordfish": "Pesce spada", "lantern": "Pesce lanterna", "viperfish": "Pesce vipera", "oarfish": "Regaleco", "shark": "Squalo grigio", "orca": "Orca", "angler": "Rana pescatrice"};
for (const [id, name] of Object.entries(LOCAL_NAMES)) SPECIES[id].name = name;
for (const id of ["manta", "narwhal", "orca"]) SPECIES[id].protected = true;
export const SPECIES_LIST = Object.values(SPECIES);
export const SPECIES_COUNT = SPECIES_LIST.length;

// -------------------------------------------------------------------------
// Sprite baking: every species is pre-rendered into a few tail-wag frames so
// drawing a fish at runtime is a single drawImage call.
// -------------------------------------------------------------------------

export interface Sprite {
  frames: HTMLCanvasElement[];
  w: number;
  h: number;
}

export const FRAMES = 8;
const RES = 2;

interface Profile {
  p: number;
  q: number;
  tail: "fork" | "fan" | "lunate" | "whale";
  tl: number;
  ts: number;
  pec: number;
  amp: number;
}

const PROFILE: Record<Exclude<Shape, "ray" | "squid" | "seahorse">, Profile> = {
  fish: { p: 1.5, q: 0.65, tail: "fork", tl: 0.3, ts: 0.85, pec: 0.22, amp: 0.34 },
  round: { p: 1.2, q: 0.5, tail: "fan", tl: 0.26, ts: 0.6, pec: 0.3, amp: 0.22 },
  long: { p: 1.3, q: 0.5, tail: "fork", tl: 0.1, ts: 0.9, pec: 0.3, amp: 0.55 },
  shark: { p: 1.6, q: 0.75, tail: "lunate", tl: 0.3, ts: 0.9, pec: 0.42, amp: 0.28 },
  orca: { p: 1.35, q: 0.5, tail: "whale", tl: 0.24, ts: 1.15, pec: 0.3, amp: 0.2 },
  flat: { p: 0.95, q: 0.4, tail: "fan", tl: 0.17, ts: 0.4, pec: 0.17, amp: 0.08 },
  eel: { p: 1.1, q: 0.35, tail: "fan", tl: 0.09, ts: 0.38, pec: 0.2, amp: 1.3 },
  angler: { p: 1.1, q: 0.45, tail: "fan", tl: 0.25, ts: 0.7, pec: 0.3, amp: 0.15 },
};

const cache = new Map<string, Sprite>();
const glowCache = new Map<string, HTMLCanvasElement>();

export function getSprite(sp: Species): Sprite {
  let s = cache.get(sp.id);
  if (!s) {
    s = buildSprite(sp);
    cache.set(sp.id, s);
  }
  return s;
}

export function getGlow(color: string): HTMLCanvasElement {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, color);
    grd.addColorStop(0.25, color + "99");
    grd.addColorStop(1, color + "00");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
  }
  return c;
}

function buildSprite(sp: Species): Sprite {
  const L = sp.len;
  const W = sp.wid;
  const prof = sp.shape === "ray" || sp.shape === "squid" || sp.shape === "seahorse" ? null : PROFILE[sp.shape];
  const bill = (sp.bill ?? 0) * L;
  const lure = sp.lure ? L * 0.5 : 0;
  const half = sp.shape === "ray" ? W * 0.62 : sp.shape === "seahorse" ? L * 0.7 : Math.max(W * (prof ? prof.ts : 0.9), W * 0.9) + 6;
  const cw = Math.ceil(L * 1.3 + bill * 2 + lure * 2 + 12);
  const ch = Math.ceil(half * 2 + (lure ? W * 0.3 : 0) + 8);
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < FRAMES; f++) {
    const c = document.createElement("canvas");
    c.width = cw * RES;
    c.height = ch * RES;
    const g = c.getContext("2d")!;
    g.scale(RES, RES);
    g.translate(cw / 2, ch / 2);
    g.lineJoin = "round";
    g.lineCap = "round";
    const phase = (f / FRAMES) * TAU;
    if (sp.shape === "ray") drawRay(g, sp, phase);
    else if (sp.shape === "squid") drawSquid(g, sp, phase);
    else if (sp.shape === "seahorse") drawSeahorse(g, sp, phase);
    else drawFish(g, sp, prof!, phase);
    frames.push(c);
  }
  return { frames, w: cw, h: ch };
}

const OUTLINE = "rgba(4,18,36,0.4)";

function drawFish(g: CanvasRenderingContext2D, sp: Species, prof: Profile, phase: number) {
  const L = sp.len;
  const W = sp.wid;
  const xNose = L / 2;
  const xBase = -L / 2 + prof.tl * L;
  const Lb = xNose - xBase;
  const N = 22;

  const hwAt = (s: number) => {
    const u = 1 - s;
    const h = (W / 2) * Math.pow(Math.sin(Math.PI * Math.pow(u, prof.p)), prof.q);
    const floor = W * 0.075 * (1 - Math.min(1, u / 0.3));
    return Math.max(h, floor);
  };
  const yc = (s: number) => Math.sin(phase - s * 2.4) * prof.amp * W * 0.62 * Math.pow(s, 1.5);
  const bodyPath = () => {
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const x = xNose - s * Lb;
      const y = yc(s) - hwAt(s);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    for (let i = N; i >= 0; i--) {
      const s = i / N;
      g.lineTo(xNose - s * Lb, yc(s) + hwAt(s));
    }
    g.closePath();
  };

  if(sp.id === "hammerhead") {
    g.fillStyle=sp.body;g.strokeStyle="rgba(4,18,36,.4)";g.lineWidth=1.1;
    g.beginPath();g.roundRect(xNose-L*.19,-W*.88,L*.19,W*1.76,5);g.fill();g.stroke();
    g.fillStyle="#11283d";for(const side of [-1,1]){g.beginPath();g.arc(xNose-L*.12,side*W*.8,1.7,0,TAU);g.fill();}
  }
  // --- bill / tusk ---
  if (sp.bill) {
    g.fillStyle = sp.billColor ?? "#ddd";
    const bw = sp.shape === "orca" ? W * 0.05 : W * 0.07;
    g.beginPath();
    g.moveTo(xNose - 3, -bw);
    g.lineTo(xNose + sp.bill * L, 0);
    g.lineTo(xNose - 3, bw);
    g.closePath();
    g.fill();
  }
  // --- angler lure ---
  if (sp.lure) {
    g.strokeStyle = "#1a1228";
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(xNose - L * 0.12, 0);
    g.quadraticCurveTo(xNose + L * 0.15, -W * 0.55, xNose + L * 0.42, -W * 0.12);
    g.stroke();
    g.fillStyle = "#fff6c8";
    g.beginPath();
    g.arc(xNose + L * 0.42, -W * 0.12, 3.2, 0, TAU);
    g.fill();
    g.fillStyle = sp.mark;
    g.beginPath();
    g.arc(xNose + L * 0.42, -W * 0.12, 2, 0, TAU);
    g.fill();
  }

  // --- tail fin ---
  {
    const dy = yc(1) - yc(0.92);
    const th = Math.atan2(-dy, 0.08 * Lb) * 1.5;
    const tl = prof.tl * L * 1.05;
    const ts = prof.ts * W;
    const tw = W * 0.08;
    g.save();
    g.translate(xBase + 1, yc(1));
    g.rotate(th);
    g.fillStyle = sp.fin;
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(0.8, W * 0.035);
    g.beginPath();
    switch (prof.tail) {
      case "fork":
        g.moveTo(0, -tw);
        g.lineTo(-tl, -ts);
        g.lineTo(-tl * 0.62, 0);
        g.lineTo(-tl, ts);
        g.lineTo(0, tw);
        break;
      case "fan":
        g.moveTo(0, -tw);
        g.quadraticCurveTo(-tl * 0.6, -ts * 1.1, -tl, -ts * 0.6);
        g.quadraticCurveTo(-tl * 1.1, 0, -tl, ts * 0.6);
        g.quadraticCurveTo(-tl * 0.6, ts * 1.1, 0, tw);
        break;
      case "lunate":
        g.moveTo(0, -tw);
        g.lineTo(-tl * 1.15, -ts * 1.25);
        g.lineTo(-tl * 0.55, -ts * 0.05);
        g.lineTo(-tl * 0.8, ts * 0.8);
        g.lineTo(0, tw);
        break;
      case "whale":
        g.moveTo(0, -tw);
        g.bezierCurveTo(-tl * 0.4, -ts * 0.6, -tl * 0.6, -ts * 1.0, -tl * 1.0, -ts * 1.15);
        g.bezierCurveTo(-tl * 0.75, -ts * 0.5, -tl * 0.6, -ts * 0.2, -tl * 0.55, 0);
        g.bezierCurveTo(-tl * 0.6, ts * 0.2, -tl * 0.75, ts * 0.5, -tl, ts * 1.15);
        g.bezierCurveTo(-tl * 0.6, ts * 1.0, -tl * 0.4, ts * 0.6, 0, tw);
        break;
    }
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  // --- pectoral fins ---
  {
    const s = 0.28;
    const x = xNose - s * Lb;
    const flap = 1 + 0.22 * Math.sin(phase + 1);
    const fl = W * prof.pec * 1.7;
    const fw = W * prof.pec * 1.25 * flap;
    g.fillStyle = sp.fin;
    g.strokeStyle = OUTLINE;
    g.lineWidth = Math.max(0.8, W * 0.03);
    for (const sgn of [-1, 1]) {
      const y0 = yc(s) + sgn * hwAt(s) * 0.85;
      g.beginPath();
      g.moveTo(x + fl * 0.2, y0);
      g.lineTo(x - fl * 0.7, y0 + sgn * fw);
      g.lineTo(x - fl * 1.15, y0 + sgn * fw * 0.5);
      g.lineTo(x - fl * 0.8, y0);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }

  if (sp.spiky) {
    g.strokeStyle = sp.fin;
    g.lineWidth = Math.max(1.4, W * 0.065);
    for (let k = 0; k < 7; k++) {
      const x = xNose - Lb * (0.22 + k * 0.08);
      const r = W * (sp.id === "flyingfish" ? 0.9 : 0.8) * (0.6 + 0.4 * Math.sin(k + phase));
      g.beginPath(); g.moveTo(x, -W * 0.3); g.lineTo(x - r * 0.3, -r); g.moveTo(x, W * 0.3); g.lineTo(x - r * 0.3, r); g.stroke();
    }
  }

  // --- body ---
  bodyPath();
  const grd = g.createLinearGradient(0, -W / 2, 0, W / 2);
  grd.addColorStop(0, sp.flank);
  grd.addColorStop(0.3, sp.body);
  grd.addColorStop(0.7, sp.body);
  grd.addColorStop(1, sp.flank);
  g.fillStyle = grd;
  g.fill();

  // --- patterns (clipped to body) ---
  g.save();
  bodyPath();
  g.clip();
  const seed = Math.round(L);
  switch (sp.pattern) {
    case "stripes":
      g.fillStyle = sp.mark;
      g.globalAlpha = 0.55;
      for (let k = 0; k < 5; k++) {
        const x = xNose - Lb * (0.28 + k * 0.13);
        g.save();
        g.translate(x, 0);
        g.rotate(0.22);
        g.fillRect(-W * 0.035, -W, W * 0.07, W * 2);
        g.restore();
      }
      break;
    case "spots": {
      g.fillStyle = sp.mark;
      g.globalAlpha = sp.shape === "angler" ? 0.85 : 0.75;
      const n = sp.shape === "orca" ? 6 : 11;
      for (let k = 0; k < n; k++) {
        const s = 0.18 + 0.7 * hash2(k * 7 + 1, seed, 3);
        const y = (hash2(k * 13 + 5, seed, 4) - 0.5) * hwAt(s) * 1.5;
        const r = W * (0.04 + 0.05 * hash2(k, seed, 5));
        g.beginPath();
        g.arc(xNose - s * Lb, yc(s) + y, r, 0, TAU);
        g.fill();
      }
      break;
    }
    case "bands":
      for (const s of [0.24, 0.54, 0.82]) {
        const x = xNose - s * Lb;
        const bw = Lb * (s > 0.7 ? 0.06 : 0.09);
        g.fillStyle = sp.mark;
        g.globalAlpha = 0.95;
        g.fillRect(x - bw / 2, -W, bw, W * 2);
        g.strokeStyle = "rgba(20,10,0,0.55)";
        g.lineWidth = 0.9;
        g.strokeRect(x - bw / 2, -W, bw, W * 2);
      }
      break;
    case "line":
      g.strokeStyle = sp.mark;
      g.globalAlpha = 0.75;
      g.lineWidth = Math.max(1.2, W * 0.11);
      g.beginPath();
      for (let i = 2; i <= N; i++) {
        const s = i / N;
        if (i === 2) g.moveTo(xNose - s * Lb, yc(s));
        else g.lineTo(xNose - s * Lb, yc(s));
      }
      g.stroke();
      break;
    default:
      break;
  }
  g.restore();

  // orca markings
  if (sp.id === "orca" || sp.id === "narwhal") {
    if (sp.id === "orca") {
      g.fillStyle = "#ffffff";
      for (const sgn of [-1, 1]) {
        g.beginPath();
        g.ellipse(xNose - Lb * 0.2, sgn * W * 0.26, W * 0.17, W * 0.07, sgn * 0.4, 0, TAU);
        g.fill();
      }
      g.fillStyle = "#3a4a66";
      g.beginPath();
      g.ellipse(xNose - Lb * 0.52, 0, W * 0.24, W * 0.16, 0, 0, TAU);
      g.fill();
    }
  }

  // outline
  bodyPath();
  g.strokeStyle = OUTLINE;
  g.lineWidth = Math.max(0.9, W * 0.045);
  g.stroke();

  // eyes
  {
    const s = sp.shape === "angler" ? 0.2 : 0.14;
    const ex = xNose - s * Lb;
    const ey = hwAt(s) * 0.62;
    const er = Math.max(1.2, W * (sp.shape === "angler" ? 0.06 : 0.085));
    for (const sgn of [-1, 1]) {
      g.fillStyle = sp.shape === "angler" ? "#fff2a8" : "#0b1420";
      g.beginPath();
      g.arc(ex, yc(s) + sgn * ey, er, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath();
      g.arc(ex + er * 0.3, yc(s) + sgn * ey - er * 0.3, er * 0.35, 0, TAU);
      g.fill();
    }
  }
  // angler teeth hint
  if (sp.shape === "angler") {
    g.strokeStyle = "#fff6d8";
    g.lineWidth = 1;
    g.beginPath();
    for (let k = -3; k <= 3; k++) {
      g.moveTo(xNose - 1, k * W * 0.06);
      g.lineTo(xNose - 5, k * W * 0.06 + 1);
    }
    g.stroke();
  }
}

function drawRay(g: CanvasRenderingContext2D, sp: Species, phase: number) {
  const L = sp.len;
  const W = sp.wid;
  const k = 1 + Math.sin(phase) * 0.13;
  const path = new Path2D();
  path.moveTo(L * 0.5, 0);
  path.quadraticCurveTo(L * 0.4, -W * 0.1, L * 0.25, -W * 0.3 * k);
  path.quadraticCurveTo(L * 0.12, -W * 0.52 * k, -L * 0.08, -W * 0.5 * k);
  path.quadraticCurveTo(-L * 0.02, -W * 0.2, -L * 0.25, -W * 0.06);
  path.lineTo(-L * 0.3, 0);
  path.lineTo(-L * 0.25, W * 0.06);
  path.quadraticCurveTo(-L * 0.02, W * 0.2, -L * 0.08, W * 0.5 * k);
  path.quadraticCurveTo(L * 0.12, W * 0.52 * k, L * 0.25, W * 0.3 * k);
  path.quadraticCurveTo(L * 0.4, W * 0.1, L * 0.5, 0);
  path.closePath();

  // tail whip
  g.strokeStyle = sp.fin;
  g.lineWidth = Math.max(1.5, W * 0.035);
  g.beginPath();
  g.moveTo(-L * 0.28, 0);
  g.quadraticCurveTo(-L * 0.4, Math.sin(phase) * W * 0.08, -L * 0.52, Math.sin(phase - 1) * W * 0.1);
  g.stroke();

  const grd = g.createRadialGradient(L * 0.15, 0, 2, L * 0.05, 0, W * 0.6);
  grd.addColorStop(0, sp.flank);
  grd.addColorStop(1, sp.body);
  g.fillStyle = grd;
  g.fill(path);
  g.save();
  g.clip(path);
  g.fillStyle = sp.mark;
  g.globalAlpha = 0.85;
  for (let i = 0; i < 12; i++) {
    const x = (hash2(i, 2, 9) - 0.3) * L * 0.55;
    const y = (hash2(i, 3, 9) - 0.5) * W * 0.7;
    g.beginPath();
    g.arc(x, y, 1.6 + hash2(i, 4, 9) * 2.6, 0, TAU);
    g.fill();
  }
  g.restore();
  g.strokeStyle = OUTLINE;
  g.lineWidth = 1.6;
  g.stroke(path);
  // eyes
  g.fillStyle = "#0b1420";
  for (const sgn of [-1, 1]) {
    g.beginPath();
    g.arc(L * 0.36, sgn * W * 0.085, 2.6, 0, TAU);
    g.fill();
  }
}

export function weightedPick(table: [string, number][], skipTier3 = false): Species {
  let total = 0;
  for (const [id, w] of table) {
    if (skipTier3 && SPECIES[id].tier === 3) continue;
    total += w;
  }
  let r = Math.random() * total;
  for (const [id, w] of table) {
    if (skipTier3 && SPECIES[id].tier === 3) continue;
    r -= w;
    if (r <= 0) return SPECIES[id];
  }
  return SPECIES[table[0][0]];
}
