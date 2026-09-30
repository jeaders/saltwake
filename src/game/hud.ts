import type { Game } from "./engine";
import type { Btn, ButtonId, Layout } from "./input";
import { TAU, clamp, easeOutBack, easeOutCubic, fmt, fmtTime } from "./util";
import { C } from "./types";
import { REGIONS, REGION_COUNT, WORLD_H, WORLD_W, x2lon, y2lat } from "./world";
import { audio } from "./audio";
import { drawRadar } from "./radar";

const FONT = "Fredoka, ui-rounded, 'Trebuchet MS', system-ui, sans-serif";
const INK = "rgba(7,26,46,0.72)";
const EDGE = "rgba(255,244,220,0.22)";
const CREAM = "#fff4dc";
const DIM = "rgba(255,244,220,0.6)";

const TOOL_COL: Record<string, string> = {
  net: "#ffd36b",
  harpoon: "#ff8a6b",
  sonar: "#7cf7ff",
  boost: "#ffb13b",
};
const TOOL_LABEL: Record<string, string> = { net: "RETE", harpoon: "FIOCINA", sonar: "SONAR", boost: "BOOST" };
const TOOL_KEY: Record<string, string> = { net: "SPAZIO", harpoon: "X", sonar: "C", boost: "SHIFT" };

export function margin(touch: boolean, ui: number) {
  return (touch ? 14 : 18) * ui;
}

export function mapRect(W: number, ui: number, touch: boolean) {
  const m = margin(touch, ui);
  const w = clamp(W * 0.3, 130, 220);
  const h = (w * WORLD_H) / WORLD_W; // 2:1 world -> half height
  return { x: W - m - w, y: m + 40 * ui + 10 * ui, w, h };
}

export function computeLayout(W: number, H: number, touch: boolean, ui: number): Layout {
  const m = margin(touch, ui);
  const buttons: Btn[] = [];
  const pr = 20 * ui;
  buttons.push({ id: "pause", cx: W - m - pr, cy: m + pr, hw: pr, hh: pr, round: true });
  buttons.push({ id: "mute", cx: W - m - pr * 3 - 8 * ui, cy: m + pr, hw: pr, hh: pr, round: true });
  if (touch) {
    const nr = 48 * ui;
    const cx = W - 22 * ui - nr;
    const cy = H - 26 * ui - nr;
    buttons.push({ id: "net", cx, cy, hw: nr, hh: nr, round: true });
    buttons.push({ id: "harpoon", cx: cx - 104 * ui, cy: cy + 20 * ui, hw: 38 * ui, hh: 38 * ui, round: true });
    buttons.push({ id: "sonar", cx: cx - 96 * ui, cy: cy - 84 * ui, hw: 32 * ui, hh: 32 * ui, round: true });
    buttons.push({ id: "boost", cx: cx + 4 * ui, cy: cy - 110 * ui, hw: 33 * ui, hh: 33 * ui, round: true });
  } else {
    const sz = 58 * ui;
    const gap = 10 * ui;
    const total = 4 * sz + 3 * gap;
    const x0 = W / 2 - total / 2 + sz / 2;
    const y = H - m - sz / 2;
    (["net", "harpoon", "sonar", "boost"] as ButtonId[]).forEach((id, i) => {
      buttons.push({ id, cx: x0 + i * (sz + gap), cy: y, hw: sz / 2, hh: sz / 2, round: false });
    });
  }
  return { buttons };
}

// ---------------------------------------------------------------------------
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill = INK, stroke = EDGE) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", outline = 0) {
  ctx.font = `700 ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if (outline > 0) {
    ctx.lineWidth = outline;
    ctx.strokeStyle = "rgba(6,22,40,0.85)";
    ctx.lineJoin = "round";
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

// ---------------------------------------------------------------------------
export function renderHud(g: Game) {
  const ctx = g.ctx;
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const over = g.phase === "over";
  const touch = g.input.touchMode;

  if(g.exploration.onFoot){
    drawTopRight(g);drawBanner(g);drawToast(g);
    if(touch)drawTouchControls(g);
    return;
  }
  drawMarkers(g);
  drawScore(g);
  drawTimer(g);
  drawTopRight(g);
  if (!over) {
    if (touch) drawTouchControls(g);
    else drawToolbar(g);
  }
  drawBanner(g);
  drawToast(g);
  drawTip(g);
}

// ---- score / combo / hull -------------------------------------------------
function drawScore(g: Game) {
  const ctx = g.ctx;
  const u = g.ui;
  const m = margin(g.input.touchMode, u);
  const x = m;
  let y = m;
  const w = 162 * u;
  const h = 54 * u;
  const hud = g.hud;
  panel(ctx, x, y, w, h, 14 * u);
  text(ctx, "SCORE", x + 13 * u, y + 15 * u, 10.5 * u, DIM);
  text(ctx, `BEST ${fmt(Math.max(g.best, g.score))}`, x + w - 12 * u, y + 15 * u, 10.5 * u, DIM, "right");
  // number with punch
  const pk = easeOutCubic(hud.scorePunch);
  const sc = 1 + 0.28 * pk;
  ctx.save();
  ctx.translate(x + 13 * u, y + h - 19 * u);
  ctx.scale(sc, sc);
  const frenzy = g.frenzyT > 0;
  const col = frenzy ? (Math.floor(g.t * 10) % 2 ? "#ffd36b" : "#fff3b0") : pk > 0.05 ? "#fff3b0" : CREAM;
  text(ctx, fmt(hud.dispScore), 0, 0, 29 * u, col, "left", 4);
  ctx.restore();

  // combo chip
  y += h + 6 * u;
  const ch = 26 * u;
  const mm = g.comboMult;
  const active = g.combo >= 2;
  const cols = ["#cfe6f2", "#ffe58a", "#ffb066", "#ff7a5a", "#ff5a8a", "#e06bff", "#9a7bff", "#7cf7ff"];
  const ccol = cols[Math.min(mm - 1, cols.length - 1)];
  const cp = easeOutCubic(clamp(hud.comboPunch / 1.6, 0, 1));
  ctx.save();
  ctx.translate(x, y + ch / 2);
  const cs = 1 + 0.18 * cp;
  ctx.scale(cs, cs);
  ctx.translate(0, -ch / 2);
  ctx.globalAlpha = active ? 1 : 0.4;
  panel(ctx, 0, 0, w, ch, 10 * u, INK, active ? ccol : EDGE);
  if (active) {
    // draining bar
    const frac = clamp(g.comboT / C.COMBO_TIME, 0, 1);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, w, ch, 10 * u);
    ctx.clip();
    ctx.fillStyle = ccol;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(0, 0, w * frac, ch);
    ctx.globalAlpha = 1;
    ctx.fillRect(0, ch - 3 * u, w * frac, 3 * u);
    ctx.restore();
  }
  text(ctx, `COMBO ×${mm}`, 12 * u, ch / 2 + 1, 13.5 * u, active ? ccol : DIM);
  if (active) text(ctx, `${g.combo} chain`, w - 11 * u, ch / 2 + 1, 11.5 * u, DIM, "right");
  ctx.restore();
  ctx.globalAlpha = 1;

  // hull
  y += ch + 9 * u;
  const hh = 15 * u;
  text(ctx, "SCAFO", x + 2 * u, y + hh / 2, 10 * u, DIM);
  const bx = x + 34 * u;
  const bw = w - 34 * u;
  const segs = 10;
  const gap = 2.5 * u;
  const sw = (bw - gap * (segs - 1)) / segs;
  const frac = g.boat.hull / C.HULL_MAX;
  const hcol = frac > 0.6 ? "#6fe28a" : frac > 0.3 ? "#ffc94a" : "#ff6b5a";
  for (let i = 0; i < segs; i++) {
    const sx = bx + i * (sw + gap);
    const f = clamp(frac * segs - i, 0, 1);
    ctx.beginPath();
    ctx.roundRect(sx, y, sw, hh, 3 * u);
    ctx.fillStyle = "rgba(7,26,46,0.6)";
    ctx.fill();
    if (f > 0) {
      ctx.globalAlpha = 0.45 + 0.55 * f;
      ctx.fillStyle = hud.hullFlash > 0.3 ? "#ffffff" : hcol;
      ctx.beginPath();
      ctx.roundRect(sx, y, sw, hh, 3 * u);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  // boost
  y += hh + 6 * u;
  const eh = 7 * u;
  text(ctx, "BOOST", x + 2 * u, y + eh / 2, 8.5 * u, DIM);
  ctx.beginPath();
  ctx.roundRect(bx, y, bw, eh, 3.5 * u);
  ctx.fillStyle = "rgba(7,26,46,0.6)";
  ctx.fill();
  const en = g.boat.energy;
  if (en > 0.01) {
    ctx.beginPath();
    ctx.roundRect(bx, y, Math.max(eh, bw * en), eh, 3.5 * u);
    ctx.fillStyle = g.boat.exhausted ? (Math.floor(g.t * 8) % 2 ? "#ff6b5a" : "#8a3a30") : g.boat.boosting ? "#ffe27a" : "#ffb13b";
    ctx.fill();
  }
}

// ---- timer -------------------------------------------------------------------
function drawTimer(g: Game) {
  const ctx = g.ctx;
  const u = g.ui;
  const m = margin(g.input.touchMode, u);
  const w = 132 * u;
  const h = 44 * u;
  const x = g.W / 2 - w / 2;
  const y = m;
  const tl = g.timeLeft;
  const low = g.mode === "challenge" && tl < 15;
  const flash = g.hud.timeFlash;
  ctx.save();
  ctx.translate(g.W / 2, y + h / 2);
  const s = 1 + 0.1 * flash;
  ctx.scale(s, s);
  ctx.translate(-g.W / 2, -(y + h / 2));
  panel(ctx, x, y, w, h, 14 * u, INK, low ? "rgba(255,110,90,0.8)" : EDGE);
  // sun
  const k = clamp(1 - tl / 45, 0, 1);
  const sr = (g: number, a: number) => Math.round(g + (a - g) * k);
  const sunCol = `rgb(${sr(255, 255)},${sr(214, 110)},${sr(90, 60)})`;
  const sxp = x + 24 * u;
  const syp = y + h / 2 - 2 * u;
  if (g.mode === "free" && g.night > 0.5) {
    // crescent moon while it's dark
    ctx.fillStyle = "#cfe2ff";
    ctx.beginPath();
    ctx.arc(sxp, syp, 8.5 * u, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(7,26,46,0.96)";
    ctx.beginPath();
    ctx.arc(sxp + 4.5 * u, syp - 2.5 * u, 7.5 * u, 0, TAU);
    ctx.fill();
  } else {
  ctx.strokeStyle = sunCol;
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + g.t * 0.5;
    ctx.moveTo(sxp + Math.cos(a) * 9 * u, syp + Math.sin(a) * 9 * u);
    ctx.lineTo(sxp + Math.cos(a) * 13 * u, syp + Math.sin(a) * 13 * u);
  }
  ctx.stroke();
  ctx.fillStyle = sunCol;
  ctx.beginPath();
  ctx.arc(sxp, syp, 6.5 * u, 0, TAU);
  ctx.fill();
  }
  text(ctx, g.mode === "free" ? g.clockText : fmtTime(tl), x + w - 14 * u, y + h / 2 - 3 * u, 25 * u, low && Math.floor(g.t * 4) % 2 ? "#ff8a7a" : CREAM, "right", 3);
  if(g.mode === "free") {
    text(ctx,g.exploration.onFoot?"A PIEDI":"VIAGGIO LIBERO",x+w-14*u,y+h-10*u,8*u,DIM,"right");
    ctx.restore();return;
  }
  // progress
  const bx = x + 12 * u;
  const bw = w - 24 * u;
  const by = y + h - 9 * u;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, 4 * u, 2 * u);
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fill();
  const frac = clamp(tl / C.MAX_TIME, 0, 1);
  ctx.beginPath();
  ctx.roundRect(bx, by, Math.max(4 * u, bw * frac), 4 * u, 2 * u);
  ctx.fillStyle = low ? "#ff6b5a" : tl < 45 ? "#ffa04a" : "#ffd36b";
  ctx.fill();
  ctx.restore();

  if (g.frenzyT > 0) {
    const fw = 150 * u;
    const fy = y + h + 6 * u;
    panel(ctx, g.W / 2 - fw / 2, fy, fw, 22 * u, 11 * u, "rgba(90,55,0,0.75)", "#ffd36b");
    text(ctx, `FRENZY ×2 · ${Math.ceil(g.frenzyT)}s`, g.W / 2, fy + 11.5 * u, 12 * u, "#ffd36b", "center");
  }
}

// ---- top right: buttons + minimap ---------------------------------------------
function drawTopRight(g: Game) {
  const ctx = g.ctx;
  const u = g.ui;
  const touch = g.input.touchMode;
  for (const b of g.input.layout.buttons) {
    if (b.id !== "pause" && b.id !== "mute") continue;
    ctx.beginPath();
    ctx.arc(b.cx, b.cy, b.hw, 0, TAU);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.strokeStyle = EDGE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = CREAM;
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2 * u;
    if (b.id === "pause") {
      const r = b.hw * 0.36;
      ctx.fillRect(b.cx - r * 0.85, b.cy - r, r * 0.6, r * 2);
      ctx.fillRect(b.cx + r * 0.25, b.cy - r, r * 0.6, r * 2);
    } else {
      const r = b.hw * 0.4;
      ctx.beginPath();
      ctx.moveTo(b.cx - r, b.cy - r * 0.4);
      ctx.lineTo(b.cx - r * 0.4, b.cy - r * 0.4);
      ctx.lineTo(b.cx + r * 0.25, b.cy - r);
      ctx.lineTo(b.cx + r * 0.25, b.cy + r);
      ctx.lineTo(b.cx - r * 0.4, b.cy + r * 0.4);
      ctx.lineTo(b.cx - r, b.cy + r * 0.4);
      ctx.closePath();
      ctx.fill();
      if (audio.muted) {
        ctx.strokeStyle = "#ff8a7a";
        ctx.beginPath();
        ctx.moveTo(b.cx + r * 0.6, b.cy - r * 0.6);
        ctx.lineTo(b.cx + r * 1.3, b.cy + r * 0.6);
        ctx.moveTo(b.cx + r * 1.3, b.cy - r * 0.6);
        ctx.lineTo(b.cx + r * 0.6, b.cy + r * 0.6);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(b.cx + r * 0.3, b.cy, r * 0.8, -0.8, 0.8);
        ctx.stroke();
      }
    }
  }
  // Local north-up chart follows the real actor each rendered frame.
  const r = mapRect(g.W, u, touch);
  drawRadar(g,r);
  // labels below the minimap
  const reg = REGIONS[g.regionIdx];
  text(ctx, reg.name, r.x + r.w, r.y + r.h + 11 * u, 11 * u, reg.accent, "right", 3);
  let found = 0;
  for (let i = 0; i < REGION_COUNT; i++) if (g.discovered[i]) found++;
  const lat = y2lat(g.focus.y);
  const lon = x2lon(g.focus.x);
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`;
  text(ctx, `${latStr}  ${lonStr}`, r.x + r.w, r.y + r.h + 25 * u, 10 * u, DIM, "right", 3);
  text(ctx, `MARI ${found}/${REGION_COUNT}`, r.x + r.w, r.y + r.h + 38 * u, 9.5 * u, DIM, "right", 3);
  // ---- compass ---------------------------------------------------------
  drawCompass(g, r.x + 14 * u, r.y + r.h + 24 * u);
}

/** Vintage rose-of-the-winds compass. The red needle points where the boat is heading. */
function drawCompass(g: Game, cx: number, cy: number) {
  const ctx = g.ctx;
  const u = g.ui;
  const R = 18 * u;
  // dial
  ctx.fillStyle = "rgba(240, 220, 170, 0.95)";
  ctx.strokeStyle = "rgba(60,32,12,0.75)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // ticks
  ctx.strokeStyle = "rgba(60,32,12,0.55)";
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const inner = i % 4 === 0 ? R * 0.6 : R * 0.78;
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94);
  }
  ctx.stroke();
  ctx.font = `700 ${8 * u}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#7a3020";
  ctx.fillText("N", cx, cy - R * 0.72);
  ctx.fillStyle = "rgba(60,32,12,0.75)";
  ctx.fillText("E", cx + R * 0.72, cy);
  ctx.fillText("S", cx, cy + R * 0.72);
  ctx.fillText("W", cx - R * 0.72, cy);
  // needle
  const ang = g.exploration.onFoot?g.exploration.person.angle:g.boat.ang;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.fillStyle = "#c9402a";
  ctx.beginPath();
  ctx.moveTo(R * 0.85, 0);
  ctx.lineTo(-R * 0.15, -R * 0.18);
  ctx.lineTo(-R * 0.15, R * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(60,32,12,0.85)";
  ctx.beginPath();
  ctx.moveTo(-R * 0.85, 0);
  ctx.lineTo(-R * 0.15, -R * 0.13);
  ctx.lineTo(-R * 0.15, R * 0.13);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f6e2a8";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.14, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(60,32,12,0.9)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

// ---- tool bar (desktop) ------------------------------------------------------
function toolState(g: Game, id: string): { frac: number; label: string; busy: boolean; active: boolean } {
  const b = g.boat;
  switch (id) {
    case "net":
      return { frac: b.netCd / g.netCooldown, label: b.netCd > 0.95 ? String(Math.ceil(b.netCd)) : "", busy: b.netCd > 0, active: false };
    case "harpoon":
      if (g.harpoon) return { frac: 0.7, label: "", busy: true, active: false };
      return { frac: b.harpCd / 0.12, label: "", busy: b.harpCd > 0, active: false };
    case "sonar":
      return { frac: b.sonarCd / g.sonarCooldown, label: b.sonarCd > 0.95 ? String(Math.ceil(b.sonarCd)) : "", busy: b.sonarCd > 0, active: false };
    default:
      return { frac: 1 - b.energy, label: "", busy: b.exhausted, active: b.boosting };
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, id: string, cx: number, cy: number, s: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.085);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (id === "net") {
    const r = s * 0.34;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.lineWidth *= 0.6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.moveTo(r * 0.55, 0);
    ctx.arc(0, 0, r * 0.55, 0, TAU);
    ctx.stroke();
  } else if (id === "harpoon") {
    ctx.beginPath();
    ctx.moveTo(-s * 0.32, s * 0.32);
    ctx.lineTo(s * 0.2, -s * 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.36, -s * 0.36);
    ctx.lineTo(s * 0.1, -s * 0.28);
    ctx.lineTo(s * 0.28, -s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, s * 0.1);
    ctx.lineTo(-s * 0.26, s * 0.0);
    ctx.moveTo(-s * 0.1, s * 0.1);
    ctx.lineTo(0, s * 0.26);
    ctx.stroke();
  } else if (id === "sonar") {
    ctx.beginPath();
    ctx.arc(-s * 0.22, s * 0.22, s * 0.05, 0, TAU);
    ctx.fill();
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(-s * 0.22, s * 0.22, s * 0.17 * i, -Math.PI / 2, 0);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(s * 0.08, -s * 0.38);
    ctx.lineTo(-s * 0.22, s * 0.06);
    ctx.lineTo(-s * 0.02, s * 0.06);
    ctx.lineTo(-s * 0.1, s * 0.38);
    ctx.lineTo(s * 0.22, -s * 0.08);
    ctx.lineTo(s * 0.02, -s * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawToolbar(g: Game) {
  const ctx = g.ctx;
  const u = g.ui;
  for (const b of g.input.layout.buttons) {
    if (b.id === "pause" || b.id === "mute") continue;
    const st = toolState(g, b.id);
    const col = TOOL_COL[b.id];
    const ready = !st.busy && (b.id !== "boost" || g.boat.energy > 0.05);
    const flash = g.hud.ready[b.id as "net"];
    const sz = b.hw * 2;
    const x = b.cx - b.hw;
    const y = b.cy - b.hh;
    ctx.save();
    ctx.translate(b.cx, b.cy);
    const sc = 1 + 0.14 * flash + (st.active ? 0.05 : 0);
    ctx.scale(sc, sc);
    ctx.translate(-b.cx, -b.cy);
    panel(ctx, x, y, sz, sz, 14 * u, INK, ready ? col : EDGE);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, sz, sz, 14 * u);
    ctx.clip();
    if (b.id === "boost") {
      // energy fill rises from the bottom
      ctx.fillStyle = g.boat.exhausted ? "rgba(255,90,70,0.35)" : "rgba(255,177,59,0.32)";
      ctx.fillRect(x, y + sz * (1 - g.boat.energy), sz, sz * g.boat.energy);
    } else if (st.frac > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x, y, sz, sz * clamp(st.frac, 0, 1));
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.4})`;
      ctx.fillRect(x, y, sz, sz);
    }
    ctx.restore();
    drawIcon(ctx, b.id, b.cx, b.cy - 5 * u, sz * 0.72, ready ? col : "rgba(255,244,220,0.45)");
    text(ctx, TOOL_LABEL[b.id], b.cx, y + sz - 9 * u, 8.5 * u, ready ? CREAM : DIM, "center");
    // key cap
    const kw = Math.max(16 * u, TOOL_KEY[b.id].length * 6.4 * u + 8 * u);
    panel(ctx, x + 4 * u, y + 4 * u, kw, 15 * u, 5 * u, "rgba(255,244,220,0.92)", "");
    text(ctx, TOOL_KEY[b.id], x + 4 * u + kw / 2, y + 12 * u, 9 * u, "#0b2239", "center");
    if (st.label) text(ctx, st.label, b.cx, b.cy - 5 * u, 20 * u, CREAM, "center", 3);
    ctx.restore();
  }
}

// ---- touch controls ----------------------------------------------------------
function drawTouchControls(g: Game) {
  const ctx = g.ctx;
  const u = g.ui;
  const inp = g.input;
  // joystick
  const s = inp.stick;
  const R = 54 * u;
  if (s.active) {
    ctx.beginPath();
    ctx.arc(s.ox, s.oy, R, 0, TAU);
    ctx.fillStyle = "rgba(255,244,220,0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,244,220,0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    let dx = s.px - s.ox;
    let dy = s.py - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    ctx.beginPath();
    ctx.arc(s.ox + dx, s.oy + dy, 25 * u, 0, TAU);
    ctx.fillStyle = "rgba(255,244,220,0.5)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.stroke();
  } else if (g.runTime < 12 && g.phase === "playing") {
    const cx = g.W * 0.2;
    const cy = g.H - 120 * u;
    const a = 0.35 + 0.2 * Math.sin(g.t * 3);
    ctx.globalAlpha = a;
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    text(ctx, "TRASCINA QUI", cx, cy, 11 * u, CREAM, "center");
    ctx.globalAlpha = 1;
  }
  // buttons
  for (const b of inp.layout.buttons) {
    if (b.id === "pause" || b.id === "mute") continue;
    const st = toolState(g, b.id);
    const col = TOOL_COL[b.id];
    const latched = b.id === "boost" && (inp.boostLatch || st.active);
    const ready = !st.busy && (b.id !== "boost" || g.boat.energy > 0.05);
    const flash = g.hud.ready[b.id as "net"];
    ctx.save();
    ctx.translate(b.cx, b.cy);
    const sc = 1 + 0.12 * flash + (latched ? 0.05 : 0);
    ctx.scale(sc, sc);
    const r = b.hw;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = "rgba(7,26,46,0.62)";
    ctx.fill();
    ctx.lineWidth = latched ? 4 : 2.5;
    ctx.strokeStyle = ready || latched ? col : EDGE;
    ctx.stroke();
    // cooldown pie
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, TAU);
    ctx.clip();
    if (b.id === "boost") {
      ctx.fillStyle = g.boat.exhausted ? "rgba(255,90,70,0.35)" : "rgba(255,177,59,0.3)";
      ctx.fillRect(-r, r - 2 * r * g.boat.energy, 2 * r, 2 * r * g.boat.energy);
    } else if (st.frac > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r * 1.2, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(st.frac, 0, 1));
      ctx.closePath();
      ctx.fill();
    }
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flash * 0.4})`;
      ctx.fillRect(-r, -r, 2 * r, 2 * r);
    }
    ctx.restore();
    drawIcon(ctx, b.id, 0, -r * 0.1, r * 1.15, ready || latched ? col : "rgba(255,244,220,0.45)");
    text(ctx, TOOL_LABEL[b.id], 0, r * 0.66, Math.max(8, r * 0.22), ready ? CREAM : DIM, "center");
    if (st.label) text(ctx, st.label, 0, -r * 0.1, r * 0.55, CREAM, "center", 3);
    ctx.restore();
  }
}

// ---- banner / toast / tip -------------------------------------------------------
function drawBanner(g: Game) {
  const b = g.hud.banner;
  if (!b) return;
  const ctx = g.ctx;
  const u = g.ui;
  const tIn = clamp(b.t / 0.35, 0, 1);
  const tOut = clamp((b.dur - b.t) / 0.5, 0, 1);
  const a = Math.min(tIn, tOut);
  const sc = easeOutBack(tIn);
  const y = g.H * 0.25;
  ctx.save();
  ctx.globalAlpha = a;
  const grd = ctx.createLinearGradient(0, 0, g.W, 0);
  grd.addColorStop(0, "rgba(6,22,40,0)");
  grd.addColorStop(0.2, "rgba(6,22,40,0.45)");
  grd.addColorStop(0.8, "rgba(6,22,40,0.45)");
  grd.addColorStop(1, "rgba(6,22,40,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, y - 40 * u * sc, g.W, 92 * u * sc);
  ctx.translate(g.W / 2, y);
  ctx.scale(sc, sc);
  const size = Math.min(46 * u, (g.W * 0.9) / Math.max(8, b.title.length * 0.62));
  text(ctx, b.title, 0, 0, size, b.color, "center", 7);
  text(ctx, b.sub, 0, size * 0.85, Math.min(16 * u, 15 + 0 * u), CREAM, "center", 4);
  ctx.restore();
}

function drawToast(g: Game) {
  const t = g.hud.toast;
  if (!t) return;
  const ctx = g.ctx;
  const u = g.ui;
  const m = margin(g.input.touchMode, u);
  const tIn = easeOutBack(clamp(t.t / 0.25, 0, 1));
  const a = clamp((t.dur - t.t) / 0.3, 0, 1);
  const y = m + 44 * u + 12 * u + (g.frenzyT > 0 ? 30 * u : 0) + 13 * u;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `700 ${14 * u}px ${FONT}`;
  const w = ctx.measureText(t.text).width + 30 * u;
  ctx.translate(g.W / 2, y);
  ctx.scale(tIn, tIn);
  panel(ctx, -w / 2, -13 * u, w, 26 * u, 13 * u, "rgba(7,26,46,0.82)", t.color);
  text(ctx, t.text, 0, 1, 14 * u, t.color, "center");
  ctx.restore();
}

function drawTip(g: Game) {
  const h = g.hud;
  if (!h.tip || h.tipA < 0.02 || g.phase !== "playing") return;
  const ctx = g.ctx;
  const u = g.ui;
  const touch = g.input.touchMode;
  const m = margin(touch, u);
  const y = touch ? g.H * 0.37 : g.H - m - 58 * u - 34 * u;
  ctx.save();
  ctx.globalAlpha = h.tipA;
  ctx.font = `600 ${15 * u}px ${FONT}`;
  const w = Math.min(g.W - 24, ctx.measureText(h.tip).width + 36 * u);
  const bob = Math.sin(g.t * 3) * 2;
  panel(ctx, g.W / 2 - w / 2, y - 16 * u + bob, w, 32 * u, 16 * u, "rgba(7,26,46,0.8)", "rgba(255,211,107,0.7)");
  ctx.font = `600 ${15 * u}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = CREAM;
  ctx.fillText(h.tip, g.W / 2, y + 1 + bob, w - 16);
  ctx.restore();
}

// ---- off-screen markers -------------------------------------------------------
function marker(g: Game, wx: number, wy: number, color: string, kind: "diamond" | "danger" | "crate") {
  const ctx = g.ctx;
  const u = g.ui;
  const x = g.sx(wx);
  const y = g.sy(wy);
  const inset = 30 * u;
  if (x > inset * 0.5 && x < g.W - inset * 0.5 && y > inset * 0.5 && y < g.H - inset * 0.5) return;
  const cx = g.W / 2;
  const cy = g.H / 2;
  const dx = x - cx;
  const dy = y - cy;
  const kx = dx !== 0 ? (g.W / 2 - inset) / Math.abs(dx) : 1e9;
  const ky = dy !== 0 ? (g.H / 2 - inset) / Math.abs(dy) : 1e9;
  const k = Math.min(kx, ky);
  const px = cx + dx * k;
  const py = cy + dy * k;
  const ang = Math.atan2(dy, dx);
  const pulse = kind === "danger" ? 1 + 0.12 * Math.sin(g.t * 12) : 1;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  ctx.arc(0, 0, 12 * u, 0, TAU);
  ctx.fillStyle = "rgba(7,26,46,0.78)";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(Math.cos(ang) * 22 * u, Math.sin(ang) * 22 * u);
  ctx.lineTo(Math.cos(ang + 2.5) * 13 * u, Math.sin(ang + 2.5) * 13 * u);
  ctx.lineTo(Math.cos(ang - 2.5) * 13 * u, Math.sin(ang - 2.5) * 13 * u);
  ctx.closePath();
  ctx.fill();
  if (kind === "danger") {
    text(ctx, "!", 0, 1, 15 * u, color, "center");
  } else if (kind === "crate") {
    ctx.fillRect(-4 * u, -4 * u, 8 * u, 8 * u);
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -6 * u);
    ctx.lineTo(4.5 * u, 0);
    ctx.lineTo(0, 6 * u);
    ctx.lineTo(-4.5 * u, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawMarkers(g: Game) {
  if (g.phase !== "playing") return;
  const b = g.boat;
  for (const p of g.predators) {
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (([1,4,5].includes(p.state) && d < 1000) || p.marked > 0) marker(g, p.x, p.y, "#ff5a4a", "danger");
  }
  for (const s of g.schools) {
    for (const f of s.members) if (f.marked > 0 && f.sp.tier === 3) marker(g, f.x, f.y, "#ffd36b", "diamond");
  }
  for (const c of g.crates) marker(g, c.x, c.y, c.kind === "time" ? "#3bd6f5" : c.kind === "repair" ? "#5ed66a" : "#ffc83a", "crate");
}
