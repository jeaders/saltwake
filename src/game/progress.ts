import { SPECIES, Species } from "./species";
import { FISH_POOLS } from "./fish-data";
import { UpgradeId, UPGRADE_ORDER, UPGRADES, freshUpgrades } from "./upgrades";
import { ShipAppearance, defaultShip, validatedShip } from "./ship";
export { UPGRADE_ORDER, UPGRADES } from "./upgrades";
export type { UpgradeId } from "./upgrades";

export interface Mission {
  id: string;
  title: string;
  description: string;
  kind: "catch" | "species" | "rare" | "diversity" | "ports";
  species?: string;
  target: number;
  progress: number;
  reward: number;
  seen: string[];
}
export interface Entry { count: number; first: number; region: string; }
export interface CaptainProgress {
  coins: number;
  bait: number;
  book: Record<string, Entry>;
  cargo: Record<string, number>;
  upgrades: Record<UpgradeId, number>;
  visited: string[];
  treasures: string[];
  claimed: string[];
  active: Mission | null;
  totalCatch: number;
  landmarks: string[];
  ship: ShipAppearance;
}

const KEY = "saltwake.captain.v2";

const intro = (): Mission => ({ id: "first-haul", title: "La cena del borgo", description: "Cattura 12 pesci e ritira la ricompensa in un porto.", kind: "catch", target: 12, progress: 0, reward: 180, seen: [] });
const defaults = (): CaptainProgress => ({ coins: 120, bait: 3, book: {}, cargo: {}, upgrades: freshUpgrades(), visited: [], treasures: [], claimed: [], active: intro(), totalCatch: 0, landmarks: [], ship: defaultShip() });

export function loadProgress(): CaptainProgress {
  const p = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return p;
    const d = JSON.parse(raw) as CaptainProgress;
    const integer = (v: number, max = 1e8) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
    p.coins = integer(d.coins);
    p.bait = integer(d.bait, 99);
    p.totalCatch = integer(d.totalCatch);
    p.ship = validatedShip(d.ship);
    for (const id of UPGRADE_ORDER) p.upgrades[id] = integer(d.upgrades?.[id], 3);
    for (const [id, e] of Object.entries(d.book || {})) {
      if (SPECIES[id] && e && e.count > 0) p.book[id] = { count: integer(e.count), first: Number(e.first) || Date.now(), region: String(e.region || "medit") };
    }
    for (const [id, n] of Object.entries(d.cargo || {})) if (SPECIES[id] && !SPECIES[id].protected && n > 0) p.cargo[id] = integer(n, 99999);
    for (const k of ["visited", "treasures", "claimed", "landmarks"] as const) p[k] = Array.isArray(d[k]) ? d[k].filter(v => typeof v === "string").slice(0, 500) : [];
    p.active = d.active && typeof d.active.id === "string" && d.active.target > 0
      ? { ...d.active, progress: integer(d.active.progress, d.active.target), seen: Array.isArray(d.active.seen) ? d.active.seen : [] }
      : null;
  } catch { /* offline/private mode: keep the in-memory captain */ }
  return p;
}

export function saveProgress(p: CaptainProgress) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* memory state remains playable */ }
}

export function marketPrice(sp: Species, specialty: string[] = []): number {
  if (sp.protected) return 0;
  return Math.max(4, Math.round(sp.value * 0.45 * (specialty.includes(sp.id) ? 1.25 : 1)));
}
export function cargoCount(p: CaptainProgress) { return Object.values(p.cargo).reduce((a, b) => a + b, 0); }
export function cargoValue(p: CaptainProgress, specialty: string[] = []) {
  return Math.round(Object.entries(p.cargo).reduce((sum, [id, n]) => sum + n * marketPrice(SPECIES[id], specialty), 0) * (1 + p.upgrades.cargo * .12));
}
export function sellCargo(p: CaptainProgress, specialty: string[]): number {
  const amount = cargoValue(p, specialty);
  if (!amount) return 0;
  p.coins += amount;
  p.cargo = {};
  saveProgress(p);
  return amount;
}

export function noteCatch(p: CaptainProgress, sp: Species, region: string): boolean {
  const isNew = !p.book[sp.id];
  if (isNew) p.book[sp.id] = { count: 0, first: Date.now(), region };
  p.book[sp.id].count++;
  p.totalCatch++;
  if (!sp.protected) p.cargo[sp.id] = (p.cargo[sp.id] || 0) + 1;
  const m = p.active;
  if (m && m.progress < m.target) {
    if (m.kind === "catch" || (m.kind === "species" && m.species === sp.id) || (m.kind === "rare" && sp.tier === 3)) m.progress++;
    if (m.kind === "diversity" && !m.seen.includes(sp.id)) { m.seen.push(sp.id); m.progress++; }
    m.progress = Math.min(m.target, m.progress);
  }
  return isNew;
}

export function offeredMissions(p: CaptainProgress, portId: string, region: string): Mission[] {
  const local = (FISH_POOLS[region] || FISH_POOLS.medit).find(([id]) => SPECIES[id].tier === 2 && !SPECIES[id].protected)?.[0] || "mackerel";
  const make = (kind: Mission["kind"], title: string, description: string, target: number, reward: number, species?: string): Mission => ({ id: `${portId}:${kind}`, title, description, kind, target, progress: 0, reward, species, seen: [] });
  return [
    make("species", "Il piatto dello chef", `Cattura 4 ${SPECIES[local].name.toLowerCase()}. Lo chef ti aspetta.`, 4, 240, local),
    make("diversity", "Un mare di colori", "Registra 5 specie diverse durante questo incarico.", 5, 280),
    make("rare", "La leggenda del molo", "Fai 2 catture o avvistamenti leggendari.", 2, 400),
    make("ports", "Passaporto dei mari", "Sbarca in 3 approdi differenti dopo aver accettato.", 3, 300),
  ].filter(m => !p.claimed.includes(m.id));
}

export function visitPort(p: CaptainProgress, id: string) {
  if (!p.visited.includes(id)) p.visited.push(id);
  const m = p.active;
  if (m?.kind === "ports" && !m.seen.includes(id)) { m.seen.push(id); m.progress = Math.min(m.target, m.seen.length); }
  saveProgress(p);
}

export function buyUpgrade(p: CaptainProgress, id: UpgradeId): boolean {
  if(!Object.prototype.hasOwnProperty.call(UPGRADES,id))return false;
  const level = p.upgrades[id];
  const cost = UPGRADES[id].costs[level];
  if (!UPGRADES[id] || !Number.isInteger(level) || level >= 3 || p.coins < cost || !Number.isFinite(cost)) return false;
  p.coins -= cost;
  p.upgrades[id]++;
  saveProgress(p);
  return true;
}

export function claimMission(p: CaptainProgress): number {
  const m = p.active;
  if (!m || m.progress < m.target || p.claimed.includes(m.id)) return 0;
  p.coins += m.reward;
  p.claimed.push(m.id);
  p.active = null;
  saveProgress(p);
  return m.reward;
}
