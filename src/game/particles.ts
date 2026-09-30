import { TAU, rand } from "./util";

export enum PK {
  Dot = 0,
  Ring = 1,
  Spark = 2,
  Star = 3,
  Chip = 4,
  Bubble = 5,
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  color: string;
  kind: PK;
  rot: number;
  vr: number;
  drag: number;
  /** 0 = under the boat, 1 = above */
  layer: 0 | 1;
}

const MAX = 720;

export class Particles {
  list: Particle[] = [];
  count = 0;
  /** quality multiplier (1 = full) */
  q = 1;

  constructor() {
    for (let i = 0; i < MAX; i++) {
      this.list.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, grow: 0, color: "#fff", kind: PK.Dot, rot: 0, vr: 0, drag: 0, layer: 1 });
    }
  }

  clear() {
    this.count = 0;
  }

  spawn(kind: PK, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, layer: 0 | 1 = 1, grow = 0, drag = 0): Particle | null {
    if (this.count >= MAX) return null;
    const p = this.list[this.count++];
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = 0;
    p.max = life;
    p.size = size;
    p.grow = grow;
    p.color = color;
    p.layer = layer;
    p.rot = Math.random() * TAU;
    p.vr = 0;
    p.drag = drag;
    return p;
  }

  update(dt: number) {
    for (let i = 0; i < this.count; i++) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.max) {
        // swap-remove
        const last = this.list[this.count - 1];
        this.list[this.count - 1] = p;
        this.list[i] = last;
        this.count--;
        i--;
        continue;
      }
      if (p.drag > 0) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size += p.grow * dt;
    }
  }

  // ------------------------------------------------------------ emitters
  splash(x: number, y: number, n: number, power = 1) {
    n = Math.ceil(n * this.q);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(60, 220) * power;
      this.spawn(PK.Dot, x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.35, 0.7), rand(2, 4.5) * (0.7 + power * 0.3), "#ffffff", 1, -4, 3.2);
    }
    this.ring(x, y, 10, 70 * power, "rgba(255,255,255,0.8)", 0.6);
    this.ring(x, y, 4, 46 * power, "rgba(255,255,255,0.6)", 0.45);
  }

  ring(x: number, y: number, r0: number, r1: number, color: string, life = 0.6) {
    const p = this.spawn(PK.Ring, x, y, 0, 0, life, r0, color, 0, (r1 - r0) / life, 0);
    if (p) p.vr = 0;
  }

  foam(x: number, y: number, vx: number, vy: number, size = 5) {
    this.spawn(PK.Dot, x, y, vx, vy, rand(0.5, 0.9), size, "rgba(255,255,255,0.75)", 0, size * 1.6, 1.2);
  }

  bubble(x: number, y: number) {
    this.spawn(PK.Bubble, x, y, rand(-8, 8), rand(-12, 4), rand(0.8, 1.6), rand(1.5, 3.5), "rgba(255,255,255,0.8)", 0, 0, 0.5);
  }

  confetti(x: number, y: number, color: string, n: number, speed = 200) {
    n = Math.ceil(n * this.q);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(0.3, 1) * speed;
      const p = this.spawn(PK.Chip, x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.45, 0.9), rand(2.5, 5), color, 1, -3, 2.6);
      if (p) p.vr = rand(-14, 14);
    }
  }

  stars(x: number, y: number, color: string, n: number, speed = 160) {
    n = Math.ceil(n * this.q);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(0.4, 1) * speed;
      const p = this.spawn(PK.Star, x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.4, 0.8), rand(5, 9), color, 1, -6, 3);
      if (p) p.vr = rand(-4, 4);
    }
  }

  sparks(x: number, y: number, color: string, n: number, speed = 300) {
    n = Math.ceil(n * this.q);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(0.4, 1) * speed;
      const p = this.spawn(PK.Spark, x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.2, 0.5), rand(6, 14), color, 1, 0, 3);
      if (p) p.rot = a;
    }
  }

  debris(x: number, y: number, n: number) {
    n = Math.ceil(n * this.q);
    const cols = ["#b5763a", "#e8d2a0", "#ff6b4a", "#8a5a2b"];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const s = rand(60, 260);
      const p = this.spawn(PK.Chip, x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.6, 1.1), rand(3, 6), cols[i % cols.length], 1, -2, 2);
      if (p) p.vr = rand(-12, 12);
    }
  }

  // ------------------------------------------------------------ drawing
  draw(ctx: CanvasRenderingContext2D, layer: 0 | 1) {
    for (let i = 0; i < this.count; i++) {
      const p = this.list[i];
      if (p.layer !== layer) continue;
      const t = p.life / p.max;
      const a = 1 - t;
      switch (p.kind) {
        case PK.Dot: {
          const r = p.size;
          if (r <= 0.2) break;
          ctx.globalAlpha = a * (p.layer === 0 ? 0.8 : 1);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.fill();
          break;
        }
        case PK.Ring: {
          ctx.globalAlpha = a * a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5 * a + 0.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.92, 0, 0, TAU);
          ctx.stroke();
          break;
        }
        case PK.Bubble: {
          ctx.globalAlpha = a * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.stroke();
          break;
        }
        case PK.Spark: {
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.2;
          const len = p.size * a;
          const dx = Math.cos(p.rot) * len;
          const dy = Math.sin(p.rot) * len;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - dx, p.y - dy);
          ctx.stroke();
          break;
        }
        case PK.Star: {
          const r = p.size;
          if (r <= 0.3) break;
          ctx.globalAlpha = Math.min(1, a * 1.6);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.quadraticCurveTo(0, 0, 0, r);
          ctx.quadraticCurveTo(0, 0, -r, 0);
          ctx.quadraticCurveTo(0, 0, 0, -r);
          ctx.fill();
          ctx.restore();
          break;
        }
        case PK.Chip: {
          const r = p.size;
          if (r <= 0.3) break;
          ctx.globalAlpha = Math.min(1, a * 1.8);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
