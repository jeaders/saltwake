import type { Species } from "./species";
import { TAU } from "./util";

/** Baked once into the fish sprite atlas, never drawn as vector paths in the live loop. */
export function drawSquid(g: CanvasRenderingContext2D, sp: Species, phase: number) {
  const L = sp.len, W = sp.wid;
  g.lineCap = "round";
  g.lineJoin = "round";
  // eight independently waving arms
  for (let i = 0; i < 8; i++) {
    const y = (i - 3.5) * W * 0.085;
    const bend = Math.sin(phase + i * 0.7) * W * 0.35;
    g.strokeStyle = i % 2 ? sp.body : sp.fin;
    g.lineWidth = Math.max(2, W * 0.075);
    g.beginPath();
    g.moveTo(-L * 0.05, y);
    g.bezierCurveTo(-L * 0.25, y + bend, -L * 0.5, y - bend, -L * (0.56 + (i % 3) * 0.05), y + bend * 0.6);
    g.stroke();
  }
  // lateral mantle fins
  g.fillStyle = sp.fin;
  g.beginPath();
  g.moveTo(L * 0.4, 0);
  g.lineTo(L * 0.15, -W * 0.75);
  g.lineTo(-L * 0.04, 0);
  g.lineTo(L * 0.15, W * 0.75);
  g.closePath(); g.fill();
  const grad = g.createLinearGradient(0, -W * 0.5, 0, W * 0.5);
  grad.addColorStop(0, sp.flank); grad.addColorStop(0.5, sp.body); grad.addColorStop(1, sp.flank);
  g.fillStyle = grad;
  g.strokeStyle = "rgba(4,18,36,.4)";
  g.lineWidth = 1.3;
  g.beginPath();
  if (sp.id === "octopus") g.ellipse(L * 0.2, 0, L * 0.25, W * 0.47, 0, 0, TAU);
  else {
    g.moveTo(L * 0.53, 0);
    g.bezierCurveTo(L * 0.2, -W * 0.62, -L * 0.14, -W * 0.42, -L * 0.14, 0);
    g.bezierCurveTo(-L * 0.14, W * 0.42, L * 0.2, W * 0.62, L * 0.53, 0);
  }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = sp.mark;
  for (let i = 0; i < 7; i++) {
    g.beginPath(); g.arc(L * (0.05 + i * 0.055), Math.sin(i * 2.1) * W * 0.2, W * 0.035, 0, TAU); g.fill();
  }
  for (const side of [-1, 1]) {
    g.fillStyle = "#fff4dc"; g.beginPath(); g.arc(-L * 0.07, side * W * 0.2, Math.max(2, W * 0.11), 0, TAU); g.fill();
    g.fillStyle = "#11253e"; g.beginPath(); g.arc(-L * 0.07, side * W * 0.2, Math.max(1.2, W * 0.06), 0, TAU); g.fill();
  }
}

export function drawSeahorse(g: CanvasRenderingContext2D, sp: Species, phase: number) {
  const L = sp.len;
  g.save();
  g.rotate(Math.sin(phase) * 0.08);
  g.strokeStyle = sp.body; g.lineWidth = L * 0.08;
  g.beginPath();
  g.moveTo(0, L * 0.18);
  g.bezierCurveTo(-L * 0.28, L * 0.5, L * 0.22, L * 0.55, L * 0.14, L * 0.31);
  g.bezierCurveTo(L * 0.1, L * 0.18, -L * 0.06, L * 0.27, L * 0.05, L * 0.37);
  g.stroke();
  g.fillStyle = sp.fin;
  g.beginPath();
  g.moveTo(-L * 0.12, -L * 0.04);
  g.lineTo(-L * (0.32 + Math.sin(phase) * 0.05), -L * 0.05);
  g.lineTo(-L * 0.12, L * 0.17); g.closePath(); g.fill();
  g.fillStyle = sp.body; g.strokeStyle = "rgba(4,18,36,.4)"; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(L * 0.29, -L * 0.23);
  g.lineTo(L * 0.28, -L * 0.12);
  g.lineTo(L * 0.12, -L * 0.12);
  g.bezierCurveTo(L * 0.1, L * 0.02, L * 0.18, L * 0.22, -L * 0.02, L * 0.24);
  g.bezierCurveTo(-L * 0.25, L * 0.18, -L * 0.08, -L * 0.09, -L * 0.14, -L * 0.2);
  g.quadraticCurveTo(-L * 0.18, -L * 0.38, 0, -L * 0.36);
  g.quadraticCurveTo(L * 0.11, -L * 0.36, L * 0.15, -L * 0.24);
  g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = sp.mark; g.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    g.beginPath(); g.moveTo(-L * 0.11, -L * 0.08 + i * L * 0.055); g.lineTo(L * 0.07, -L * 0.05 + i * L * 0.055); g.stroke();
  }
  g.fillStyle = "#16324c"; g.beginPath(); g.arc(L * 0.055, -L * 0.27, L * 0.038, 0, TAU); g.fill();
  g.fillStyle = sp.flank; g.beginPath(); g.arc(L * 0.065, -L * 0.283, L * 0.013, 0, TAU); g.fill();
  g.restore();
}
