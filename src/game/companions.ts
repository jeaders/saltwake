import type { Game } from "./engine";
import { TAU, damp, rand } from "./util";
import { isOnLand } from "./world";
import { audio } from "./audio";

interface Dolphin {
  side: number;
  back: number;
  x: number;
  y: number;
  ang: number;
  cycle: number;
  period: number;
  u: number;
  alpha: number;
  airborne: boolean;
  ready: boolean;
}

/** Ambient life: dolphins that race beside the hull, and gulls that circle rich schools. */
export class Companions {
  dolphins: Dolphin[] = [];

  reset() {
    this.dolphins = [];
  }

  private spawn() {
    const slots: [number, number][] = [[1, 55], [-1, 95], [1, 150]];
    this.dolphins = slots.map(([side, back], i) => ({
      side, back, x: 0, y: 0, ang: 0, cycle: rand(0, 2), period: 2.3 + i * 0.55, u: 0, alpha: 0, airborne: false, ready: false,
    }));
  }

  update(g: Game, dt: number) {
    const b = g.boat;
    const speed = Math.hypot(b.vx, b.vy);
    if (!this.dolphins.length) this.spawn();
    const active = g.phase === "playing" && speed > 110 && !b.sunk;
    const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
    for (const d of this.dolphins) {
      const tx = b.x - ca * d.back - sa * d.side * (62 + d.back * 0.22);
      const ty = b.y - sa * d.back + ca * d.side * (62 + d.back * 0.22);
      const over = isOnLand(tx, ty);
      if (!d.ready) { d.x = tx; d.y = ty; d.ready = true; }
      d.x = damp(d.x, tx, 4, dt);
      d.y = damp(d.y, ty, 4, dt);
      d.ang = b.ang;
      d.alpha = damp(d.alpha, active && !over ? 1 : 0, 3, dt);
      if (d.alpha < 0.05) continue;
      d.cycle += dt * Math.min(1.3, speed / 330 + 0.35);
      d.u = (d.cycle % d.period) / d.period;
      const air = d.u < 0.2;
      if (air !== d.airborne) {
        d.airborne = air;
        g.particles.splash(d.x, d.y, air ? 4 : 7, air ? 0.45 : 0.75);
        if (!air && Math.hypot(d.x - g.cam.x, d.y - g.cam.y) < 420) audio.arrive();
      }
    }
  }

  draw(g: Game) {
    if (g.phase !== "playing" && g.phase !== "paused") return;
    const ctx = g.ctx;
    for (const d of this.dolphins) {
      if (d.alpha < 0.05) continue;
      const p = d.u < 0.2 ? d.u / 0.2 : 0;
      const h = Math.sin(Math.PI * p);
      ctx.save();
      ctx.translate(d.x, d.y - h * 44);
      ctx.rotate(d.ang + (p ? (p - 0.5) * 0.9 : 0));
      const s = 0.9 + h * 0.55;
      ctx.scale(s, s);
      ctx.globalAlpha = d.alpha * (0.5 + 0.5 * h);
      if (h > 0.02) {
        ctx.fillStyle = "rgba(0,35,60,0.18)";
        ctx.beginPath();
        ctx.ellipse(4, 46 * h / s, 17, 5, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = h > 0.05 ? "#7f9fb6" : "rgba(28,75,108,.75)";
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.bezierCurveTo(13, -7, -4, -8.5, -14, -2);
      ctx.lineTo(-23, -7.5);
      ctx.lineTo(-21, 0);
      ctx.lineTo(-23, 7.5);
      ctx.lineTo(-14, 2);
      ctx.bezierCurveTo(-4, 8.5, 13, 7, 19, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(226,240,246,.9)";
      ctx.beginPath();
      ctx.moveTo(18, 1);
      ctx.bezierCurveTo(10, 6.5, -4, 7.5, -13, 2);
      ctx.bezierCurveTo(-4, 3, 8, 3, 18, 1);
      ctx.fill();
      ctx.fillStyle = h > 0.05 ? "#6a8aa2" : "rgba(20,60,92,.85)";
      ctx.beginPath();
      ctx.moveTo(-1, -7.5);
      ctx.lineTo(-8, -14);
      ctx.lineTo(-9, -6.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0d2438";
      ctx.beginPath();
      ctx.arc(11, -2.2, 1.1, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Gulls wheel above big or rare schools, hinting where the good fishing is. */
  drawBirds(g: Game) {
    const ctx = g.ctx;
    const t = g.t;
    ctx.lineCap = "round";
    for (const s of g.schools) {
      if (s.sp.tier < 2 && s.members.length < 11) continue;
      if (Math.abs(s.x - g.cam.x) * g.S > g.W * 0.62 + 80 || Math.abs(s.y - g.cam.y) * g.S > g.H * 0.62 + 80) continue;
      const n = s.sp.tier === 3 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = t * (0.7 + i * 0.13) + i * 2.1 + s.x * 0.01;
        const r = 34 + i * 12 + s.rad * 0.18;
        const x = s.x + Math.cos(a) * r;
        const y = s.y + Math.sin(a) * r * 0.62 - 46 - i * 5;
        const flap = Math.sin(t * 9 + i * 1.7) * 3.6;
        ctx.fillStyle = "rgba(0,35,55,.13)";
        ctx.beginPath();
        ctx.ellipse(x + 9, y + 52, 6, 2.2, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "#fbfcfa";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(x - 9, y + flap * 0.4);
        ctx.quadraticCurveTo(x - 4, y - flap, x, y);
        ctx.quadraticCurveTo(x + 4, y - flap, x + 9, y + flap * 0.4);
        ctx.stroke();
      }
    }
  }
}
