import type { Game } from "./engine";
import { PORTS } from "./ports";
import { drawTerrain } from "./terrain";
import { paintShip } from "./ship-drawing";
import { drawLandExploration, drawExplorer } from "./land-render";
import { TAU, clamp, easeOutBack, hash2 } from "./util";
import { FRAMES, getGlow, getSprite } from "./species";
import { REGIONS, WORLD_H, WORLD_W, forEachDecor, Decor, Island, IslandStyle } from "./world";
import { C, CaughtFish, Crate, Fish, NetObj, Predator } from "./types";

// ---------------------------------------------------------------------------
// module-level frame state (avoids per-frame closure allocation)
// ---------------------------------------------------------------------------
let G: Game;
const coastPaths=new WeakMap<Float32Array,Path2D>();
let vx0 = 0;
let vy0 = 0;
let vx1 = 0;
let vy1 = 0;
const FONT = "Fredoka, ui-rounded, 'Trebuchet MS', system-ui, sans-serif";

const TILE_WORLD = 640;
const TILE_RES = 1.6;
let tileA: HTMLCanvasElement | null = null;
let tileB: HTMLCanvasElement | null = null;
let vigDark: HTMLCanvasElement | null = null;
let vigRed: HTMLCanvasElement | null = null;
let sandSprite: HTMLCanvasElement | null = null;

const AMB_N = 110;
const ambX = new Float32Array(AMB_N);
const ambY = new Float32Array(AMB_N);
const ambZ = new Float32Array(AMB_N);

function ensureAssets() {
  if (tileA) return;
  const size = Math.round(TILE_WORLD * TILE_RES);
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    return c;
  };
  // --- crest tile: short bright arcs -------------------------------------
  tileA = mk();
  {
    const g = tileA.getContext("2d")!;
    g.scale(TILE_RES, TILE_RES);
    g.lineCap = "round";
    for (let i = 0; i < 46; i++) {
      const x = hash2(i, 1, 501) * TILE_WORLD;
      const y = hash2(i, 2, 501) * TILE_WORLD;
      const r = 12 + hash2(i, 3, 501) * 34;
      const a0 = hash2(i, 4, 501) * TAU;
      const span = 0.7 + hash2(i, 5, 501) * 1.0;
      const al = 0.08 + hash2(i, 6, 501) * 0.14;
      g.strokeStyle = `rgba(255,255,255,${al})`;
      g.lineWidth = 1.6 + hash2(i, 7, 501) * 1.8;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          g.beginPath();
          g.arc(x + ox * TILE_WORLD, y + oy * TILE_WORLD, r, a0, a0 + span);
          g.stroke();
        }
      }
    }
  }
  // --- caustic tile: soft light / shade blobs ----------------------------
  tileB = mk();
  {
    const g = tileB.getContext("2d")!;
    g.scale(TILE_RES, TILE_RES);
    for (let i = 0; i < 26; i++) {
      const x = hash2(i, 1, 777) * TILE_WORLD;
      const y = hash2(i, 2, 777) * TILE_WORLD;
      const r = 50 + hash2(i, 3, 777) * 90;
      const dark = i % 3 === 0;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cx = x + ox * TILE_WORLD;
          const cy = y + oy * TILE_WORLD;
          if (cx < -r || cy < -r || cx > TILE_WORLD + r || cy > TILE_WORLD + r) continue;
          const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
          if (dark) {
            grd.addColorStop(0, "rgba(0,25,55,0.07)");
            grd.addColorStop(1, "rgba(0,25,55,0)");
          } else {
            grd.addColorStop(0, "rgba(255,255,255,0.075)");
            grd.addColorStop(1, "rgba(255,255,255,0)");
          }
          g.fillStyle = grd;
          g.beginPath();
          g.ellipse(cx, cy, r, r * 0.7, hash2(i, 9, 777) * TAU, 0, TAU);
          g.fill();
        }
      }
    }
  }
  const vig = (r: number, gr: number, b: number, a: number) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(128, 128, 60, 128, 128, 184);
    grd.addColorStop(0, `rgba(${r},${gr},${b},0)`);
    grd.addColorStop(1, `rgba(${r},${gr},${b},${a})`);
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    return c;
  };
  vigDark = vig(0, 10, 28, 0.6);
  vigRed = vig(255, 30, 30, 0.75);
  {
    sandSprite = document.createElement("canvas");
    sandSprite.width = 256;
    sandSprite.height = 154;
    const g = sandSprite.getContext("2d")!;
    g.translate(128, 77);
    g.scale(1, 0.6);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 128);
    grd.addColorStop(0, "rgba(255,244,205,0.2)");
    grd.addColorStop(0.55, "rgba(255,240,190,0.11)");
    grd.addColorStop(1, "rgba(255,240,190,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, 128, 0, TAU);
    g.fill();
  }
  for (let i = 0; i < AMB_N; i++) {
    ambX[i] = hash2(i, 1, 900);
    ambY[i] = hash2(i, 2, 900);
    ambZ[i] = hash2(i, 3, 900);
  }
}

const inView = (x: number, y: number, pad: number) => x > vx0 - pad && x < vx1 + pad && y > vy0 - pad && y < vy1 + pad;
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---------------------------------------------------------------------------
export function renderWorld(g: Game) {
  G = g;
  ensureAssets();
  const ctx = g.ctx;
  const cw = g.canvas.width;
  const ch = g.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const w = g.waterRGB;
  ctx.fillStyle = `rgb(${w[0] | 0},${w[1] | 0},${w[2] | 0})`;
  ctx.fillRect(0, 0, cw, ch);

  ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
  const hw = g.W / (2 * g.S) + 40 / g.S;
  const hh = g.H / (2 * g.S) + 40 / g.S;
  vx0 = g.cam.x - hw;
  vx1 = g.cam.x + hw;
  vy0 = g.cam.y - hh;
  vy1 = g.cam.y + hh;

  drawWaves(g);
  drawEdges(g);
  forEachDecor(vx0 - 120, vy0 - 120, vx1 + 120, vy1 + 120, decorCb);
  drawSonars(g);
  for (const c of g.crates) if (inView(c.x, c.y, 80)) drawCrate(g, c);
  drawStrikeWarnings(g);
  drawSchools(g);
  for (const p of g.predators) if (inView(p.x, p.y, 160)) drawPredator(g, p);
  drawMarks(g);
  for (const n of g.nets) drawNet(g, n);
  g.particles.draw(ctx, 0);
  drawTerrain(ctx, vx0, vy0, vx1, vy1, islandCb);
  // Terrain on the opposite longitude is also visible at the antimeridian.
  if(vx0<0){ctx.save();ctx.translate(-WORLD_W,0);drawTerrain(ctx,vx0+WORLD_W,vy0,WORLD_W,vy1,islandCb);ctx.restore();}
  if(vx1>WORLD_W){ctx.save();ctx.translate(WORLD_W,0);drawTerrain(ctx,0,vy0,vx1-WORLD_W,vy1,islandCb);ctx.restore();}
  drawPorts(g);
  drawLandExploration(g);
  drawHarpoon(g);
  drawFlyers(g);
  drawBoat(g);
  g.companions.draw(g);
  drawExplorer(g);
  g.particles.draw(ctx, 1);
  g.companions.drawBirds(g);
  drawStrikeBolts(g);
  drawReticles(g);

  // ---- screen space ------------------------------------------------------
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  drawPopups(g);
  drawAmbient(g);
  drawGrade(g);
}

// ---------------------------------------------------------------------------
// water
// ---------------------------------------------------------------------------
function drawTileLayer(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, ox: number, oy: number) {
  const ix0 = Math.floor((vx0 - ox) / TILE_WORLD);
  const ix1 = Math.floor((vx1 - ox) / TILE_WORLD);
  const iy0 = Math.floor((vy0 - oy) / TILE_WORLD);
  const iy1 = Math.floor((vy1 - oy) / TILE_WORLD);
  for (let iy = iy0; iy <= iy1; iy++) {
    for (let ix = ix0; ix <= ix1; ix++) {
      ctx.drawImage(tile, ox + ix * TILE_WORLD, oy + iy * TILE_WORLD, TILE_WORLD, TILE_WORLD);
    }
  }
}

function drawWaves(g: Game) {
  const ctx = g.ctx;
  const t = g.t;
  // deep caustics drift slowly, slightly parallaxed for depth (skipped on slow devices)
  if (g.particles.q > 0.5) drawTileLayer(ctx, tileB!, g.cam.x * 0.1 + t * 9, g.cam.y * 0.1 + t * 5);
  ctx.globalAlpha = 0.9;
  drawTileLayer(ctx, tileA!, Math.sin(t * 0.6) * 8 - t * 4, Math.cos(t * 0.5) * 8 + t * 2.5);
  ctx.globalAlpha = 1;
}

function drawEdges(g: Game) {
  // World wraps horizontally now (antimeridian crossing). Only the poles need
  // a subtle icy fade so they don't feel like a hard wall.
  const ctx = g.ctx;
  const fade = 500;
  if (vy0 < fade) {
    const grd = ctx.createLinearGradient(0, 0, 0, fade);
    grd.addColorStop(0, "rgba(210,236,246,0.55)");
    grd.addColorStop(1, "rgba(210,236,246,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(vx0, 0, vx1 - vx0, fade);
  }
  if (vy1 > WORLD_H - fade) {
    const grd = ctx.createLinearGradient(0, WORLD_H - fade, 0, WORLD_H);
    grd.addColorStop(0, "rgba(210,236,246,0)");
    grd.addColorStop(1, "rgba(210,236,246,0.55)");
    ctx.fillStyle = grd;
    ctx.fillRect(vx0, WORLD_H - fade, vx1 - vx0, fade);
  }
}

// ---------------------------------------------------------------------------
// seabed decoration
// ---------------------------------------------------------------------------
const CORAL = ["#ff7a9c", "#ff9a5a", "#c86bff", "#ffd36b", "#ff6b6b"];

function decorCb(d: Decor) {
  const ctx = G.ctx;
  const t = G.t;
  const s = d.size;
  switch (d.kind) {
    case "sand":
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.seed);
      ctx.drawImage(sandSprite!, -120 * s, -72 * s, 240 * s, 144 * s);
      ctx.restore();
      break;
    case "coral":
      ctx.fillStyle = "rgba(0,30,70,0.2)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + 8, 46 * s, 24 * s, 0, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = d.seed + i * 1.3;
        const px = d.x + Math.cos(a) * 24 * s;
        const py = d.y + Math.sin(a) * 15 * s;
        const r = (8 + (i % 3) * 4) * s;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = CORAL[(i + (d.seed | 0)) % CORAL.length];
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(px - r * 0.25, py - r * 0.25, r * 0.45, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    case "kelp":
      ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const bx = d.x + (i - 2) * 10 * s;
        const len = (70 + ((i * 37) % 50)) * s;
        const sway = Math.sin(t * 1.1 + d.seed + i * 0.8) * 15 * s;
        ctx.strokeStyle = i % 2 ? "rgba(46,150,86,0.82)" : "rgba(34,120,70,0.85)";
        ctx.lineWidth = 6 * s;
        ctx.beginPath();
        ctx.moveTo(bx, d.y);
        ctx.quadraticCurveTo(bx + sway * 0.3, d.y - len * 0.5, bx + sway, d.y - len);
        ctx.stroke();
      }
      break;
    case "floe": {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(Math.sin(t * 0.25 + d.seed) * 0.08 + d.seed);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        const r = (34 + hash2(i, d.seed | 0, 31) * 28) * s;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "rock": {
      ctx.fillStyle = "rgba(10,25,40,0.14)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 30 * s, 18 * s, d.seed, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + 0.08 * Math.sin(t * 2 + d.seed)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 38 * s, 24 * s, d.seed, 0, TAU);
      ctx.stroke();
      break;
    }
    case "glow": {
      const col = (d.seed | 0) % 2 ? "#7cf7ff" : "#ff7ad9";
      const r = 80 * s;
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 1.5 + d.seed);
      ctx.drawImage(getGlow(col), d.x - r, d.y - r, r * 2, r * 2);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = col;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(d.seed + i * 2.1) * 14 * s, d.y + Math.sin(d.seed + i * 2.1) * 10 * s, 3, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// islands
// ---------------------------------------------------------------------------
interface IslePal {
  sand: string;
  land: string;
  land2: string;
  shoal: string;
}
const ISL: Record<IslandStyle, IslePal> = {
  palm: { sand: "#f6e2a8", land: "#63b75c", land2: "#4fa150", shoal: "rgba(255,255,255,0.13)" },
  reef: { sand: "#eadbb4", land: "#7fa36a", land2: "#668f58", shoal: "rgba(255,255,255,0.12)" },
  moss: { sand: "#bdb08f", land: "#447f50", land2: "#326b42", shoal: "rgba(255,255,255,0.09)" },
  ice: { sand: "#dff1fb", land: "#ffffff", land2: "#e3f3fc", shoal: "rgba(230,248,255,0.2)" },
  storm: { sand: "#727d89", land: "#404b58", land2: "#313b47", shoal: "rgba(255,255,255,0.07)" },
  basalt: { sand: "#3a3e60", land: "#181b30", land2: "#24274a", shoal: "rgba(120,140,255,0.08)" },
};

function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, a: number, t: number) {
  ctx.fillStyle = "rgba(0,40,30,0.25)";
  ctx.beginPath();
  ctx.ellipse(x + 5 * s, y + 6 * s, 22 * s, 13 * s, 0, 0, TAU);
  ctx.fill();
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const ang = a + (i * TAU) / 7 + Math.sin(t * 1.3 + a + i) * 0.07;
    const len = 26 * s;
    ctx.strokeStyle = i % 2 ? "#2f8d46" : "#3fa957";
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.6, y + Math.sin(ang) * len * 0.6 - 4 * s, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.fillStyle = "#7a4a22";
  ctx.beginPath();
  ctx.arc(x, y, 3.6 * s, 0, TAU);
  ctx.fill();
}

function islandCb(isl: Island, ctx: CanvasRenderingContext2D = G.ctx) {
  if (ctx === G.ctx && !inView(isl.x, isl.y, isl.r + 120)) return;
  const style = REGIONS[isl.region].island;
  const pal = ISL[style];
  const t = G.t;

  const L = isl.land;
  if (!L) return;
  let path=coastPaths.get(L.pts);
  if(!path){
    path=new Path2D();path.moveTo(L.pts[0],L.pts[1]);
    for(let i=2;i<L.pts.length;i+=2)path.lineTo(L.pts[i],L.pts[i+1]);
    path.closePath();coastPaths.set(L.pts,path);
  }
  // Stroke and clip the original coastline, never warp concave headlands.
  // The visible land now exactly matches the collision polygon.
  ctx.lineJoin="round";
  ctx.strokeStyle=pal.shoal;ctx.lineWidth=32;ctx.stroke(path);
  ctx.strokeStyle=`rgba(255,255,255,${.43+.1*Math.sin(t*2+isl.seed)})`;ctx.lineWidth=9;ctx.stroke(path);
  ctx.fillStyle=pal.land;ctx.fill(path);
  ctx.save();ctx.clip(path);
  ctx.strokeStyle=pal.sand;ctx.lineWidth=13;ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle="rgba(30,46,28,.27)";ctx.lineWidth=.8;ctx.stroke(path);

  // Detail objects only when we can really see them
  if (G.S < 0.55 && ctx === G.ctx) return;
  if (style === "palm" || style === "reef") {
    for (const p of isl.palms) drawPalm(ctx, p.x, p.y, p.s, p.a, t);
  } else if (style === "moss") {
    for (const p of isl.palms) {
      ctx.fillStyle = "#2a5e3a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15 * p.s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#3a7a4a";
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, 9 * p.s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#58a062";
      ctx.beginPath();
      ctx.arc(p.x - 3, p.y - 3, 3.5 * p.s, 0, TAU);
      ctx.fill();
    }
  } else if (style === "ice") {
    ctx.strokeStyle = "rgba(120,190,230,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + isl.seed;
      const rr = L.r * (0.28 + 0.2 * Math.sin(i * 3.1 + isl.seed));
      const x = L.cx + Math.cos(a) * rr;
      const y = L.cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (style === "storm" || style === "basalt") {
    for (const p of isl.palms) {
      ctx.fillStyle = style === "storm" ? "#3f4956" : "#181b30";
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + p.a;
        const r = 6 * p.s + 3 * hash2(k, p.x | 0, 5);
        const x = p.x + Math.cos(a) * r;
        const y = p.y + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
}

// Harbour piers are real approach points, painted after the coastline.
function drawPorts(g: Game) {
  const ctx = g.ctx;
  ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
  for (const p of PORTS) {
    if (!inView(p.x, p.y, 120)) continue;
    const ang = Math.atan2(p.ny, p.nx);
    const pier=Math.hypot(p.x-p.shoreX,p.y-p.shoreY)+9;
    ctx.save();
    ctx.translate(p.shoreX, p.shoreY); ctx.rotate(ang);
    ctx.fillStyle = "#b48a58"; ctx.strokeStyle = "#745335"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-9, -13, pier+9, 26, 3); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(94,64,36,.45)"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < pier/8; i++) { ctx.moveTo(i * 8, -12); ctx.lineTo(i * 8, 12); }
    ctx.stroke();
    ctx.fillStyle = "#6a7162";
    for (const y of [-14, 14]) for (const x of [7, 63]) { ctx.beginPath(); ctx.arc(x,y,3,0,TAU); ctx.fill(); }
    ctx.restore();
    if (g.night > 0.15) {
      const gr = 120;
      ctx.globalAlpha = Math.min(1, g.night * 1.2) * 0.85;
      ctx.drawImage(getGlow("#ffcf7a"), p.shoreX - gr, p.shoreY - gr, gr * 2, gr * 2);
      ctx.globalAlpha = 1;
    }
    const close = Math.hypot(g.boat.x - p.x, g.boat.y - p.y) < 160;
    const pulse = (g.t * 0.45) % 1;
    ctx.strokeStyle = `rgba(255,226,157,${(1-pulse) * .55})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x,p.y,20+pulse*42,0,TAU); ctx.stroke();
    ctx.fillStyle = close ? "#d6e8bc" : "#153e50"; ctx.strokeStyle = "#f3d795"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(p.x,p.y,14,0,TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = close ? "#284c56" : "#fff0ba"; ctx.lineWidth=2.2;
    ctx.beginPath(); ctx.moveTo(p.x,p.y-7); ctx.lineTo(p.x,p.y+7);
    ctx.moveTo(p.x-4,p.y-3); ctx.lineTo(p.x+4,p.y-3);
    ctx.moveTo(p.x-7,p.y+1); ctx.quadraticCurveTo(p.x-7,p.y+10,p.x,p.y+7); ctx.quadraticCurveTo(p.x+7,p.y+10,p.x+7,p.y+1); ctx.stroke();
    ctx.font=`600 14px ${FONT}`; ctx.textAlign="center"; ctx.textBaseline="middle";
    const name = close ? `${p.name} · E` : p.name;
    const tw = ctx.measureText(name).width;
    ctx.fillStyle="rgba(11,37,53,.85)"; ctx.strokeStyle="rgba(241,217,162,.4)";ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(p.x-tw/2-10,p.y-49,tw+20,25,8); ctx.fill();ctx.stroke();
    ctx.fillStyle="#f8dfa7";ctx.fillText(name,p.x,p.y-36);
  }
}

// ---------------------------------------------------------------------------
// fish
// ---------------------------------------------------------------------------
function drawFishSprite(g: Game, f: Fish, ang: number, scale: number, x: number, y: number) {
  const ctx = g.ctx;
  const sprite = getSprite(f.sp);
  const fr = ((f.anim % 1) * FRAMES) | 0;
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const k = g.A * scale;
  if (f.sp.glow) {
    const r = f.sp.len * 0.9;
    ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(g.t * 3 + f.wob);
    ctx.drawImage(getGlow(f.sp.glow), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
  ctx.setTransform(k * cos, k * sin, -k * sin, k * cos, x * g.A + g.tx, y * g.A + g.ty);
  ctx.drawImage(sprite.frames[fr], -sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
}

function drawSchools(g: Game) {
  const ctx = g.ctx;
  for (let si = 0; si < g.schools.length; si++) {
    const s = g.schools[si];
    if (!inView(s.x, s.y, s.rad + 40)) continue;
    for (let i = 0; i < s.members.length; i++) {
      const f = s.members[i];
      if (!inView(f.x, f.y, 90)) continue;
      drawFishSprite(g, f, f.ang, f.scale, f.x, f.y);
    }
  }
  ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
}

function drawPredator(g: Game, p: Predator) {
  const ctx = g.ctx;
  const sprite = getSprite(p.sp);
  const fr = ((p.anim % 1) * FRAMES) | 0;
  const cos = Math.cos(p.ang);
  const sin = Math.sin(p.ang);
  const k = g.A * p.scale;
  if(p.state===4||p.state===5){
    ctx.setTransform(g.A,0,0,g.A,g.tx,g.ty);
    const length=Math.min(640,Math.hypot(p.attackX-p.x,p.attackY-p.y)+180);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.target);
    ctx.fillStyle=p.state===4?"rgba(247,177,104,.10)":"rgba(249,106,81,.16)";
    ctx.beginPath();ctx.roundRect(0,-21,length,42,15);ctx.fill();
    ctx.strokeStyle=p.state===4?"rgba(255,211,142,.8)":"rgba(255,131,102,.9)";ctx.lineWidth=2;ctx.setLineDash([10,9]);ctx.lineDashOffset=-g.t*24;
    ctx.beginPath();ctx.moveTo(15,0);ctx.lineTo(length,0);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  }
  if (p.sp.glow) {
    const r = p.sp.len * 0.8;
    ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(getGlow(p.sp.glow), p.x - r, p.y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
  // dark shadow for menace
  ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
  ctx.fillStyle = "rgba(0,20,40,0.18)";
  ctx.beginPath();
  ctx.ellipse(p.x + 6, p.y + 10, p.sp.len * 0.45, p.sp.wid * 0.5, p.ang, 0, TAU);
  ctx.fill();
  ctx.setTransform(k * cos, k * sin, -k * sin, k * cos, p.x * g.A + g.tx, p.y * g.A + g.ty);
  ctx.drawImage(sprite.frames[fr], -sprite.w / 2, -sprite.h / 2, sprite.w, sprite.h);
  ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
  if (p.flash > 0) {
    const r = p.sp.len * 0.7;
    ctx.globalAlpha = p.flash * 0.8;
    ctx.drawImage(getGlow("#ffffff"), p.x - r, p.y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
  // Health bars make the harpoon upgrades visibly meaningful.
  if(p.hp<p.maxHp){ctx.fillStyle="rgba(9,28,43,.8)";ctx.beginPath();ctx.roundRect(p.x-26,p.y+42,52,5,2.5);ctx.fill();ctx.fillStyle="#edaf8a";ctx.beginPath();ctx.roundRect(p.x-26,p.y+42,Math.max(4,52*p.hp/p.maxHp),5,2.5);ctx.fill();}
  // alert marker
  if ((p.state===1||p.state===4||p.state===5) && Math.hypot(g.boat.x - p.x, g.boat.y - p.y) < 730) {
    const pulse = 1 + 0.15 * Math.sin(g.t * 14);
    ctx.fillStyle = "#ff4a3a";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 46, 15 * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `700 22px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", p.x, p.y - 45);
  }
}

function drawMarks(g: Game) {
  const ctx = g.ctx;
  const t = g.t;
  ctx.lineWidth = 2.5;
  for (let si = 0; si < g.schools.length; si++) {
    const s = g.schools[si];
    for (let i = 0; i < s.members.length; i++) {
      const f = s.members[i];
      if (f.marked <= 0 || !inView(f.x, f.y, 60)) continue;
      const a = Math.min(1, f.marked) * (0.6 + 0.3 * Math.sin(t * 8 + f.wob));
      const r = f.sp.len * 0.55 * f.scale + 9 + 2 * Math.sin(t * 6 + f.wob);
      ctx.strokeStyle = `rgba(154,247,255,${a})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, TAU);
      ctx.stroke();
      if (f.sp.tier === 3) drawDiamond(ctx, f.x, f.y - r - 12 + Math.sin(t * 4) * 3, 8, `rgba(255,211,107,${Math.min(1, f.marked)})`);
    }
  }
  for (const p of g.predators) {
    if (p.marked <= 0 || !inView(p.x, p.y, 100)) continue;
    const a = Math.min(1, p.marked) * 0.8;
    ctx.strokeStyle = `rgba(255,110,90,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.sp.len * 0.6, 0, TAU);
    ctx.stroke();
  }
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.75, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.75, y);
  ctx.closePath();
  ctx.fill();
}

function drawSonars(g: Game) {
  const ctx = g.ctx;
  for (const p of g.sonars) {
    const a = Math.max(0, 1 - p.t / 1.6);
    ctx.fillStyle = `rgba(154,247,255,${0.06 * a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(154,247,255,${0.75 * a})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.4 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.93, 0, TAU);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// nets / harpoon / flyers
// ---------------------------------------------------------------------------
function drawNet(g: Game, n: NetObj) {
  const ctx = g.ctx;
  if (!inView(n.x, n.y, g.netRadius + 60)) return;
  const fly = n.phase === 0;
  const lift = fly ? n.h * 46 : 0;
  const r = Math.max(2, n.r);
  if (fly) {
    ctx.fillStyle = "rgba(0,30,60,0.18)";
    ctx.beginPath();
    ctx.ellipse(n.x, n.y, r, r * 0.85, 0, 0, TAU);
    ctx.fill();
  }
  const cy = n.y - lift;
  const alpha = n.phase === 3 ? Math.max(0, 1 - n.t / 0.28) : 1;
  ctx.save();
  ctx.translate(n.x, cy);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.rotate(n.spin * (fly ? 2.5 : 0.25));
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, TAU);
  ctx.moveTo(r * 0.68, 0);
  ctx.arc(0, 0, r * 0.68, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#fff3c6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#ff7a4a";
  const nf = 12;
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * TAU;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 4.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (n.phase === 1 || n.phase === 2) {
    const sc = n.phase === 2 ? 0.8 : 1;
    for (let i = 0; i < n.caught.length; i++) {
      const c: CaughtFish = n.caught[i];
      drawFishSprite(g, c.f, c.rot, c.f.scale * sc, c.x, c.y);
    }
    ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
  }
}

function drawHarpoon(g: Game) {
  const h = g.harpoon;
  if (!h) return;
  const ctx = g.ctx;
  const b = g.boat;
  const bx = b.x + Math.cos(b.ang) * 34;
  const by = b.y + Math.sin(b.ang) * 34;
  // rope
  const mx = (bx + h.x) / 2 + Math.sin(g.t * 30) * 2;
  const my = (by + h.y) / 2 + Math.cos(g.t * 30) * 2;
  ctx.strokeStyle = "rgba(255,240,205,0.95)";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.quadraticCurveTo(mx, my, h.x, h.y);
  ctx.stroke();
  // carried fish
  if (h.carry) {
    const sp = getSprite(h.carry);
    const k = g.A * 0.95;
    const a = h.ang + Math.sin(g.t * 26) * 0.25;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const fr = ((g.t * 14) % 1 * FRAMES) | 0;
    ctx.setTransform(k * cos, k * sin, -k * sin, k * cos, (h.x + Math.cos(h.ang) * 6) * g.A + g.tx, (h.y + Math.sin(h.ang) * 6) * g.A + g.ty);
    ctx.drawImage(sp.frames[fr], -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
  }
  // spear
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.ang);
  ctx.strokeStyle = "#5b4630";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(8, 0);
  ctx.stroke();
  ctx.fillStyle = "#f4f7fa";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(6, -5.5);
  ctx.lineTo(9, 0);
  ctx.lineTo(6, 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(20,30,40,0.6)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawFlyers(g: Game) {
  const ctx = g.ctx;
  for (const f of g.flyers) {
    const p = f.delay > 0 ? 0 : Math.min(1, f.t / f.dur);
    const sp = getSprite(f.sp);
    const sc = f.sc * (f.delay > 0 ? 0.6 : (1 + 0.45 * Math.sin(Math.PI * p)) * (1 - p * 0.55));
    const x = f.delay > 0 ? f.x0 : f.x;
    const y = f.delay > 0 ? f.y0 : f.y;
    const cos = Math.cos(f.rot);
    const sin = Math.sin(f.rot);
    const k = g.A * sc;
    if (f.delay <= 0) {
      ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
      ctx.fillStyle = "rgba(0,30,60,0.15)";
      ctx.beginPath();
      ctx.ellipse(x, y + 70 * Math.sin(Math.PI * p) + 6, 12 * sc, 6 * sc, 0, 0, TAU);
      ctx.fill();
    }
    ctx.setTransform(k * cos, k * sin, -k * sin, k * cos, x * g.A + g.tx, y * g.A + g.ty);
    ctx.drawImage(sp.frames[((g.t * 14 + f.x0) % 1 * FRAMES) | 0], -sp.w / 2, -sp.h / 2, sp.w, sp.h);
  }
  ctx.setTransform(g.A, 0, 0, g.A, g.tx, g.ty);
}

// ---------------------------------------------------------------------------
// crates
// ---------------------------------------------------------------------------
const CRATE_COL = { time: "#3bd6f5", repair: "#5ed66a", frenzy: "#ffc83a" };

function drawCrate(g: Game, c: Crate) {
  const ctx = g.ctx;
  const t = g.t;
  const bob = Math.sin(t * 3 + c.x) * 2.5;
  const col = CRATE_COL[c.kind];
  const remaining = c.life - c.t;
  if (remaining < 6 && Math.sin(t * 16) > 0) ctx.globalAlpha = 0.45;
  // beacon
  const pulse = (t * 0.9 + c.x * 0.01) % 1;
  ctx.strokeStyle = col;
  ctx.globalAlpha *= 0.55 * (1 - pulse);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 18 + pulse * 46, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = remaining < 6 && Math.sin(t * 16) > 0 ? 0.45 : 1;
  const r = 70;
  const gl = ctx.globalAlpha;
  ctx.globalAlpha = gl * 0.5;
  ctx.drawImage(getGlow(col), c.x - r, c.y - r, r * 2, r * 2);
  ctx.globalAlpha = gl;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  ctx.rotate(Math.sin(t * 1.7 + c.y) * 0.12);
  ctx.fillStyle = "rgba(0,30,60,0.22)";
  ctx.beginPath();
  ctx.ellipse(3, 6, 20, 15, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#9a6334";
  ctx.strokeStyle = "#5a3818";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-16, -16, 32, 32, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(-12, -12, 24, 24, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  if (c.kind === "time") {
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, 0, TAU);
    ctx.moveTo(0, -4.5);
    ctx.lineTo(0, 0);
    ctx.lineTo(3.5, 2);
    ctx.stroke();
  } else if (c.kind === "repair") {
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 7);
    ctx.stroke();
  } else {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 3.6 : 8.5;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// lightning
// ---------------------------------------------------------------------------
function drawStrikeWarnings(g: Game) {
  const ctx = g.ctx;
  for (const s of g.strikes) {
    if (s.fired) {
      const a = Math.max(0, 1 - (s.t - s.warn) / 0.7);
      ctx.fillStyle = `rgba(20,20,30,${0.25 * a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 50, 0, TAU);
      ctx.fill();
      continue;
    }
    const p = s.t / s.warn;
    ctx.fillStyle = `rgba(255,90,70,${0.1 + 0.12 * Math.sin(g.t * 16)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 86, 0, TAU);
    ctx.fill();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -g.t * 50;
    ctx.strokeStyle = "rgba(255,110,80,0.95)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 86, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 86 * p, 0, TAU);
    ctx.stroke();
  }
}

function drawStrikeBolts(g: Game) {
  const ctx = g.ctx;
  for (const s of g.strikes) {
    if (!s.fired) continue;
    const age = s.t - s.warn;
    if (age > 0.45) continue;
    const a = 1 - age / 0.45;
    const seed = Math.floor(s.x);
    const segs = 11;
    const topY = s.y - 1000;
    ctx.lineJoin = "round";
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? `rgba(255,255,200,${a * 0.6})` : `rgba(255,255,255,${a})`;
      ctx.lineWidth = pass === 0 ? 14 : 5;
      ctx.beginPath();
      ctx.moveTo(s.x + (hash2(0, seed, 5) - 0.5) * 120, topY);
      for (let i = 1; i < segs; i++) {
        const y = topY + ((s.y - topY) * i) / segs;
        const x = s.x + (hash2(i, seed, 5) - 0.5) * 90 * (1 - i / segs);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,255,220,${a * 0.5})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 90 * (1 - a * 0.4), 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// reticles
// ---------------------------------------------------------------------------
function drawReticles(g: Game) {
  if (g.phase !== "playing" || g.cruising) return;
  const ctx = g.ctx;
  const b = g.boat;
  const t = g.t;
  // net preview
  if (g.netAim.show) {
    const { x, y, count } = g.netAim;
    const ready = b.netCd <= 0;
    ctx.save();
    ctx.setLineDash([9, 11]);
    ctx.lineDashOffset = -t * 28;
    ctx.strokeStyle = count > 0 ? "rgba(255,240,150,0.95)" : "rgba(255,255,255,0.32)";
    ctx.globalAlpha = ready ? 1 : 0.5;
    ctx.lineWidth = count > 0 ? 3 : 2.2;
    ctx.beginPath();
    ctx.arc(x, y, g.netRadius * (1 + 0.02 * Math.sin(t * 6)), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    if (count > 0) {
      ctx.fillStyle = "rgba(255,243,176,0.9)";
      ctx.font = `700 30px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(10,30,50,0.6)";
      ctx.lineWidth = 5;
      ctx.strokeText(`×${count}`, x, y);
      ctx.fillText(`×${count}`, x, y);
    }
    ctx.restore();
  }
  // harpoon lock-on
  if (g.lock.valid && !g.harpoon) {
    const k = 1 + Math.max(0, 0.15 - g.lock.t) * 6;
    const r = (22 + (g.lock.sp ? g.lock.sp.wid * 0.3 : 0)) * k;
    const rot = t * 1.4;
    ctx.save();
    ctx.translate(g.lock.x, g.lock.y);
    ctx.rotate(rot);
    const ready = b.harpCd <= 0;
    ctx.strokeStyle = ready ? "rgba(255,120,90,0.95)" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(r, -r * 0.45);
      ctx.lineTo(r, -r);
      ctx.lineTo(r * 0.45, -r);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// boat
// ---------------------------------------------------------------------------
function drawBoat(g: Game) {
  const b=g.boat;if(b.sunk>1)return;const ctx=g.ctx;
  const speed=Math.hypot(b.vx,b.vy),bob=1+Math.sin(g.t*3.1)*.012,sq=b.squash,sunk=Math.min(1,b.sunk);
  const sx=C.BOAT_SCALE*(1+sq)*bob*(1-sunk*.4),sy=C.BOAT_SCALE*(1-sq*.8)*bob*(1-.05*Math.abs(b.bank))*(1-sunk*.4);
  const angle=b.ang+b.bank*.06,ca=Math.cos(angle),sa=Math.sin(angle),A=g.A;
  ctx.setTransform(A*ca*sx,A*sa*sx,-A*sa*sy,A*ca*sy,b.x*A+g.tx,b.y*A+g.ty);
  ctx.globalAlpha=(1-sunk)*(b.invuln>0&&g.phase==="playing"&&Math.floor(g.t*18)%2===0?.5:1);
  ctx.fillStyle="rgba(0,30,50,.22)";ctx.beginPath();ctx.ellipse(3,6,40,17,0,0,TAU);ctx.fill();
  const k=Math.min(1,speed/320);
  if(k>.08){ctx.strokeStyle=`rgba(255,255,255,${.35+.45*k})`;ctx.lineWidth=3.2;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(35,-3);ctx.quadraticCurveTo(27,-15*k-3,6,-19*k-3);ctx.moveTo(35,3);ctx.quadraticCurveTo(27,15*k+3,6,19*k+3);ctx.stroke();}
  if(b.boosting){const fl=20+9*Math.sin(g.t*70);ctx.fillStyle="#f69e4f";ctx.beginPath();ctx.moveTo(-33,-7);ctx.lineTo(-33-fl,0);ctx.lineTo(-33,7);ctx.closePath();ctx.fill();ctx.fillStyle="#ffdf8d";ctx.beginPath();ctx.moveTo(-33,-4);ctx.lineTo(-33-fl*.6,0);ctx.lineTo(-33,4);ctx.closePath();ctx.fill();}
  paintShip(ctx,g.adventure.profile.ship,g.adventure.profile.upgrades,b.radar,b.recoil,b.flash);
  ctx.globalAlpha=1;ctx.setTransform(A,0,0,A,g.tx,g.ty);
}

// ---------------------------------------------------------------------------
// screen-space: popups, ambience, grading
// ---------------------------------------------------------------------------
function drawPopups(g: Game) {
  const ctx = g.ctx;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  for (const p of g.popups) {
    const x = g.sx(p.x);
    const y = g.sy(p.y);
    if (x < -100 || x > g.W + 100 || y < -60 || y > g.H + 60) continue;
    const pop = p.t < 0.2 ? easeOutBack(p.t / 0.2) : 1;
    const a = clamp((p.life - p.t) / 0.35, 0, 1);
    const size = p.size * g.ui * (0.8 + 0.2 * Math.min(1.6, g.S)) * pop;
    if (size < 1) continue;
    ctx.globalAlpha = a;
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.lineWidth = Math.max(3, size * 0.22);
    ctx.strokeStyle = "rgba(8,26,46,0.85)";
    ctx.strokeText(p.text, x, y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, x, y);
  }
  ctx.globalAlpha = 1;
}

function drawAmbient(g: Game) {
  const ctx = g.ctx;
  const w = g.weights;
  const W = g.W;
  const H = g.H;
  const t = g.t;
  let rain = 0, snow = 0, plank = 0, spores = 0, glint = 0;
  REGIONS.forEach((r, i) => {
    if (r.weather === "rain") rain += w[i];
    if (r.weather === "snow") snow += w[i];
    if (r.weather === "plankton") plank += w[i];
    if (r.weather === "spores") spores += w[i];
    if (r.weather === "glint") glint += w[i];
  });
  const q = g.particles.q;
  if (rain > 0.04) {
    const n = Math.floor(AMB_N * rain * (q > 0.5 ? 1 : 0.6));
    ctx.strokeStyle = `rgba(205,225,245,${0.42 * Math.min(1, rain * 1.4)})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = mod(ambX[i] * W - t * 130 + ambZ[i] * 80, W);
      const py = mod(ambY[i] * H + t * (620 + ambZ[i] * 300), H);
      ctx.moveTo(px, py);
      ctx.lineTo(px - 8, py + 22);
    }
    ctx.stroke();
  }
  if (snow > 0.04) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.min(1, snow * 1.3)})`;
    const n = Math.floor(AMB_N * snow);
    for (let i = 0; i < n; i++) {
      const px = mod(ambX[i] * W + Math.sin(t * 0.8 + ambY[i] * 9) * 22 - g.cam.x * g.S * 0.3, W);
      const py = mod(ambY[i] * H + t * (34 + ambZ[i] * 46) - g.cam.y * g.S * 0.3, H);
      ctx.beginPath();
      ctx.arc(px, py, 1.3 + ambZ[i] * 2.2, 0, TAU);
      ctx.fill();
    }
  }
  if (plank > 0.04) {
    const n = Math.floor(70 * plank);
    for (let i = 0; i < n; i++) {
      const px = mod(ambX[i] * W - g.cam.x * g.S * 0.5 + Math.sin(t * 0.5 + i) * 14, W);
      const py = mod(ambY[i] * H - g.cam.y * g.S * 0.5 + Math.cos(t * 0.4 + i) * 10 - t * 6, H);
      const r = 5 + ambZ[i] * 11;
      ctx.globalAlpha = Math.min(1, plank * 1.3) * (0.35 + 0.35 * Math.sin(t * 1.6 + i * 3));
      ctx.drawImage(getGlow(i % 3 === 0 ? "#ff7ad9" : "#7cf7ff"), px - r, py - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  if (spores > 0.04) {
    ctx.fillStyle = `rgba(230,255,170,${0.5 * spores})`;
    const n = Math.floor(50 * spores);
    for (let i = 0; i < n; i++) {
      const px = mod(ambX[i] * W - g.cam.x * g.S * 0.4 + Math.sin(t * 0.7 + i) * 18, W);
      const py = mod(ambY[i] * H - g.cam.y * g.S * 0.4 - t * 10, H);
      ctx.beginPath();
      ctx.arc(px, py, 1.2 + ambZ[i] * 1.8, 0, TAU);
      ctx.fill();
    }
  }
  if (glint > 0.04 && q > 0.5) {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.5;
    const n = Math.floor(40 * glint);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const tw = Math.pow(Math.max(0, Math.sin(t * 1.8 + i * 7.3)), 6);
      if (tw < 0.05) continue;
      const px = mod(ambX[i] * W - g.cam.x * g.S * 0.95, W);
      const py = mod(ambY[i] * H - g.cam.y * g.S * 0.95, H);
      const r = (3 + ambZ[i] * 6) * tw;
      ctx.moveTo(px - r, py);
      ctx.lineTo(px + r, py);
      ctx.moveTo(px, py - r);
      ctx.lineTo(px, py + r);
    }
    ctx.globalAlpha = 0.8 * Math.min(1, glint);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawGrade(g: Game) {
  const ctx = g.ctx;
  const W = g.W;
  const H = g.H;
  if (g.phase !== "menu" && g.mode === "challenge" && !g.exploration.onFoot) {
    const tl = g.timeLeft;
    if (tl < 45) {
      const k = 1 - tl / 45;
      ctx.fillStyle = `rgba(255,110,40,${0.2 * k})`;
      ctx.fillRect(0, 0, W, H);
      if (k > 0.55) {
        ctx.fillStyle = `rgba(20,10,70,${0.5 * ((k - 0.55) / 0.45)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }
  // day / night cycle (free voyage)
  if (g.mode === "free" && g.phase !== "menu") {
    if (g.night > 0.01) { ctx.fillStyle = `rgba(7,17,52,${g.night * 0.42})`; ctx.fillRect(0, 0, W, H); }
    if (g.twilight > 0.01) { ctx.fillStyle = `rgba(255,140,60,${g.twilight * 0.16})`; ctx.fillRect(0, 0, W, H); }
  }
  // base vignette
  ctx.globalAlpha = 0.85;
  ctx.drawImage(vigDark!, 0, 0, W, H);
  ctx.globalAlpha = 1;
  // danger vignette
  let red = g.hud.redFlash;
  if (g.phase === "playing") {
    if (g.boat.hull < 30) red = Math.max(red, 0.3 + 0.15 * Math.sin(g.t * 6));
    if (g.mode === "challenge" && g.timeLeft < 10) red = Math.max(red, 0.22 + 0.16 * Math.sin(g.t * 8));
  }
  if (red > 0.01) {
    ctx.globalAlpha = Math.min(1, red);
    ctx.drawImage(vigRed!, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  if (g.hud.whiteFlash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${0.65 * g.hud.whiteFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
}
