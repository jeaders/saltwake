import type { Game } from "./engine";
import { lon2x, lat2y, x2lon, y2lat } from "./world";

export type GameMode = "free" | "challenge";
export interface VoyageSave {
  version: 1;
  mode: "free";
  savedAt: number;
  walking: boolean;
  boat: { lon: number; lat: number; angle: number; hull: number };
  person: { lon: number; lat: number; angle: number };
  score: number;
  fish: number;
  runtime: number;
  seas: boolean[];
  zoom: number;
  clock?: number;
  waypoint: { lon: number; lat: number; name: string } | null;
}
const KEY = "saltwake.voyage.v1";
export function readVoyage(): VoyageSave | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null") as VoyageSave;
    if (!s || s.version !== 1 || s.mode !== "free") return null;
    const valid = (p: { lon: number; lat: number }) => p && Number.isFinite(p.lon) && Number.isFinite(p.lat) && Math.abs(p.lon) <= 180 && Math.abs(p.lat) <= 90;
    return valid(s.boat) && valid(s.person) && Number.isFinite(s.score) && Array.isArray(s.seas) ? s : null;
  } catch { return null; }
}
export function saveVoyage(g: Game) {
  if (g.mode !== "free" || !g.boat || ["menu","over","dying"].includes(g.phase)) return;
  const ex = g.exploration;
  const s: VoyageSave = {
    version: 1, mode: "free", savedAt: Date.now(), walking: ex.onFoot,
    boat: { lon: x2lon(g.boat.x), lat: y2lat(g.boat.y), angle: g.boat.ang, hull: g.boat.hull },
    person: { lon: x2lon(ex.person.x), lat: y2lat(ex.person.y), angle: ex.person.angle },
    score: g.score, fish: g.caught, runtime: g.runTime, seas: [...g.discovered], zoom: g.zoomLevel, clock: g.worldClock,
    waypoint: ex.waypoint ? { lon: x2lon(ex.waypoint.x), lat: y2lat(ex.waypoint.y), name: ex.waypoint.name } : null,
  };
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* local memory stays playable */ }
}
export const projectSaved = (p: { lon: number; lat: number }) => ({ x: lon2x(p.lon), y: lat2y(p.lat) });
