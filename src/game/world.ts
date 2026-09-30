import { RGB, hash2 } from "./util";
import { FISH_POOLS } from "./fish-data";
import { REGION_ADDITIONS, PREDATOR_POOLS } from "./fish-expansion";
import { LAND_COORDS_B64, LAND_LENS_B64 } from "./land-data";

// ---------------------------------------------------------------------------
// Real-world ocean, equirectangular projection.
// Arcade scale; not a nautical chart. Longitude [-180, 180] maps to X [0, WORLD_W], latitude
// [90, -90] maps to Y [0, WORLD_H]. The world is roughly 40000km around the
// equator × 20000km pole-to-pole, so we use a comfortable playable scale.
// ---------------------------------------------------------------------------

export const WORLD_SCALE = 6;
export const WORLD_W = 36000 * WORLD_SCALE;
export const WORLD_H = 18000 * WORLD_SCALE;
const KM_PER_DEG = WORLD_W / 360;
export const lon2x = (lon: number) => (lon + 180) * KM_PER_DEG;
export const lat2y = (lat: number) => (90 - lat) * (WORLD_H / 180);
export const x2lon = (x: number) => (x / KM_PER_DEG) - 180;
export const y2lat = (y: number) => 90 - (y / WORLD_H) * 180;

// Start in the Tyrrhenian Sea, off the west coast of Italy. Well in the open
// with Sardinia, Corsica and the Italian boot all visible on the horizon.
const START_LON = 12;
const START_LAT = 40.5;
export const START = { x: lon2x(START_LON), y: lat2y(START_LAT), lon: START_LON, lat: START_LAT };

// ---------------------------------------------------------------------------
// Fishing regions: each is a real-world sea/ocean with its own species,
// palette and hazards. The region a point belongs to is picked by nearest
// centre with a smooth blend, so borders feel organic.
// ---------------------------------------------------------------------------

export type IslandStyle = "palm" | "reef" | "moss" | "ice" | "storm" | "basalt";
export type DecorKind = "sand" | "coral" | "kelp" | "floe" | "rock" | "glow";
export type Weather = "glint" | "spores" | "snow" | "rain" | "plankton";

export interface Region {
  id: string;
  name: string;
  tagline: string;
  /** approximate real-world centre (lon, lat) */
  lon: number;
  lat: number;
  cx: number;
  cy: number;
  /** blend falloff in km (Gaussian-ish) */
  falloff: number;
  water: RGB;
  accent: string;
  island: IslandStyle;
  decor: DecorKind;
  weather: Weather;
  danger: number;
  fish: [string, number][];
  predator: string;
  predators?: string[];
}

function R(r: Omit<Region, "cx" | "cy">): Region {
  const names: Record<string, string> = { medit: "Mediterraneo", caribbean: "Mar dei Caraibi", greatbarrier: "Grande Barriera Corallina", northsea: "Mare del Nord", pacificnw: "Pacifico settentrionale", arctic: "Oceano Artico", bering: "Mare di Bering", antarctic: "Oceano Australe", japan: "Mare del Giappone", southatl: "Quarantesimi ruggenti", sargasso: "Mar dei Sargassi", seasia: "Triangolo dei Coralli", indian: "Oceano Indiano", hawaii: "Pacifico centrale", midatl: "Dorsale medio-atlantica", marianas: "Fossa delle Marianne" };
  return { ...r, name: names[r.id] || r.name, fish: [...(FISH_POOLS[r.id] || r.fish),...(REGION_ADDITIONS[r.id] || [])], predators: PREDATOR_POOLS[r.id] || [r.predator], falloff: r.falloff * WORLD_SCALE, cx: lon2x(r.lon), cy: lat2y(r.lat) };
}

export const REGIONS: Region[] = [
  R({ id: "medit", name: "Mediterranean", tagline: "Cradle of sailors, deep blue home", lon: 15, lat: 38, falloff: 900, water: [40, 150, 200], accent: "#ffd36b", island: "palm", decor: "sand", weather: "glint", danger: 1, fish: [["sardine", 5], ["mackerel", 3], ["yellowtail", 1.4], ["bluefin", 0.6]], predator: "shark" }),
  R({ id: "caribbean", name: "Caribbean Sea", tagline: "Turquoise reefs and pirate winds", lon: -75, lat: 15, falloff: 1100, water: [56, 210, 210], accent: "#ff8a6b", island: "reef", decor: "coral", weather: "glint", danger: 1, fish: [["clownfish", 4], ["angelfish", 2.5], ["pufferfish", 2], ["yellowtail", 1.2], ["manta", 0.5], ["bluefin", 0.2]], predator: "shark" }),
  R({ id: "greatbarrier", name: "Great Barrier Reef", tagline: "The largest living thing on Earth", lon: 148, lat: -18, falloff: 1000, water: [40, 190, 210], accent: "#ff8a6b", island: "reef", decor: "coral", weather: "glint", danger: 1, fish: [["clownfish", 4], ["angelfish", 3], ["pufferfish", 2.2], ["manta", 0.55], ["bluefin", 0.15]], predator: "shark" }),
  R({ id: "northsea", name: "North Sea", tagline: "Cold current, rich fisheries", lon: 3, lat: 57, falloff: 900, water: [34, 118, 128], accent: "#9be37a", island: "moss", decor: "kelp", weather: "spores", danger: 1, fish: [["cod", 4], ["mackerel", 3], ["salmon", 2.2], ["sturgeon", 0.4]], predator: "shark" }),
  R({ id: "pacificnw", name: "Pacific Northwest", tagline: "Kelp forests and leaping salmon", lon: -128, lat: 48, falloff: 1200, water: [30, 128, 108], accent: "#9be37a", island: "moss", decor: "kelp", weather: "spores", danger: 1, fish: [["perch", 4], ["salmon", 3], ["mackerel", 1.2], ["sturgeon", 0.5]], predator: "shark" }),
  R({ id: "arctic", name: "Arctic Ocean", tagline: "Ice above, legends below", lon: 0, lat: 82, falloff: 1400, water: [150, 208, 232], accent: "#d8f3ff", island: "ice", decor: "floe", weather: "snow", danger: 1, fish: [["cod", 4], ["char", 3], ["sardine", 0.5], ["narwhal", 0.45]], predator: "orca" }),
  R({ id: "bering", name: "Bering Sea", tagline: "Storm-lashed edge of Alaska", lon: -175, lat: 58, falloff: 1000, water: [90, 150, 175], accent: "#d8f3ff", island: "ice", decor: "floe", weather: "snow", danger: 1, fish: [["cod", 4], ["char", 2.5], ["salmon", 2], ["narwhal", 0.3]], predator: "orca" }),
  R({ id: "antarctic", name: "Southern Ocean", tagline: "Circumpolar cold, giant swells", lon: 30, lat: -68, falloff: 1600, water: [70, 130, 170], accent: "#d8f3ff", island: "ice", decor: "floe", weather: "snow", danger: 2, fish: [["cod", 3], ["char", 3], ["narwhal", 0.5], ["sturgeon", 0.3]], predator: "orca" }),
  R({ id: "japan", name: "Sea of Japan", tagline: "Typhoon roads and thunderfish", lon: 137, lat: 38, falloff: 900, water: [56, 90, 128], accent: "#ffe066", island: "storm", decor: "rock", weather: "rain", danger: 2, fish: [["sparkfish", 4], ["dorado", 2.5], ["mackerel", 1.2], ["swordfish", 0.5], ["bluefin", 0.4]], predator: "shark" }),
  R({ id: "southatl", name: "Roaring Forties", tagline: "Endless wind, cracking sky", lon: -30, lat: -45, falloff: 1500, water: [50, 78, 110], accent: "#ffe066", island: "storm", decor: "rock", weather: "rain", danger: 2, fish: [["sparkfish", 4], ["dorado", 2.5], ["swordfish", 0.5], ["bluefin", 0.3]], predator: "shark" }),
  R({ id: "sargasso", name: "Sargasso Sea", tagline: "Golden weed, secret currents", lon: -55, lat: 28, falloff: 1200, water: [30, 90, 165], accent: "#ffd36b", island: "reef", decor: "coral", weather: "glint", danger: 1, fish: [["sardine", 3], ["yellowtail", 2.5], ["dorado", 2], ["bluefin", 0.6], ["swordfish", 0.3]], predator: "shark" }),
  R({ id: "seasia", name: "Coral Triangle", tagline: "The garden of the sea", lon: 122, lat: 0, falloff: 1200, water: [40, 180, 205], accent: "#ff8a6b", island: "reef", decor: "coral", weather: "glint", danger: 1, fish: [["clownfish", 4], ["angelfish", 3], ["pufferfish", 2.4], ["manta", 0.5], ["bluefin", 0.2]], predator: "shark" }),
  R({ id: "indian", name: "Indian Ocean", tagline: "Monsoon-driven, teeming deep", lon: 75, lat: -15, falloff: 1500, water: [26, 120, 190], accent: "#ffd36b", island: "palm", decor: "sand", weather: "glint", danger: 1, fish: [["mackerel", 3], ["yellowtail", 2.5], ["dorado", 2], ["manta", 0.35], ["bluefin", 0.35]], predator: "shark" }),
  R({ id: "hawaii", name: "Central Pacific", tagline: "Blue desert dotted with paradise", lon: -155, lat: 18, falloff: 1400, water: [22, 110, 200], accent: "#ffd36b", island: "palm", decor: "sand", weather: "glint", danger: 1, fish: [["mackerel", 3], ["yellowtail", 2], ["dorado", 2], ["swordfish", 0.4], ["bluefin", 0.5]], predator: "shark" }),
  R({ id: "midatl", name: "Mid-Atlantic Ridge", tagline: "Hydrothermal glow miles deep", lon: -35, lat: 0, falloff: 1600, water: [12, 30, 78], accent: "#7cf7ff", island: "basalt", decor: "glow", weather: "plankton", danger: 2, fish: [["lantern", 4], ["viperfish", 2.5], ["oarfish", 0.4]], predator: "angler" }),
  R({ id: "marianas", name: "Mariana Trench", tagline: "The deepest place there is", lon: 142, lat: 12, falloff: 1200, water: [10, 20, 60], accent: "#7cf7ff", island: "basalt", decor: "glow", weather: "plankton", danger: 2, fish: [["lantern", 4], ["viperfish", 3], ["oarfish", 0.5]], predator: "angler" }),
];

export const REGION_COUNT = REGIONS.length;

// Domain warp keeps borders organic. Amplitudes are in km.
const dists = new Float32Array(REGION_COUNT);

export function regionField(x: number, y: number, out: number[]): number {
  const wx = ((x + 260 * Math.sin(y * 0.00035 + 1.3)) % WORLD_W + WORLD_W) % WORLD_W;
  const wy = y + 260 * Math.sin(x * 0.00032 + 0.4);
  let dmin = Infinity;
  let best = 0;
  for (let i = 0; i < REGION_COUNT; i++) {
    const r = REGIONS[i];
    const dx = Math.abs(wx - r.cx);
    const d = Math.hypot(Math.min(dx, WORLD_W - dx), wy - r.cy) / r.falloff;
    dists[i] = d;
    if (d < dmin) {
      dmin = d;
      best = i;
    }
  }
  let sum = 0;
  for (let i = 0; i < REGION_COUNT; i++) {
    const w = Math.exp(-(dists[i] - dmin) * 2.2);
    out[i] = w;
    sum += w;
  }
  for (let i = 0; i < REGION_COUNT; i++) out[i] /= sum;
  return best;
}

const tmpW: number[] = new Array(REGION_COUNT).fill(0);
export function regionAt(x: number, y: number): number {
  return regionField(x, y, tmpW);
}

export function waterColor(weights: number[], out: RGB) {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < REGION_COUNT; i++) {
    const w = weights[i];
    const c = REGIONS[i].water;
    r += c[0] * w;
    g += c[1] * w;
    b += c[2] * w;
  }
  out[0] = r;
  out[1] = g;
  out[2] = b;
}

// ---------------------------------------------------------------------------
// Real-world landmasses. Decoded from land-data.ts at module load, then
// projected to world coordinates and split into a spatial grid so collision
// queries only look at nearby polygons.
// ---------------------------------------------------------------------------

export interface Landmass {
  /** projected polygon (x,y pairs) */
  pts: Float32Array;
  bx0: number;
  by0: number;
  bx1: number;
  by1: number;
  /** approximate radius, for LOD checks */
  cx: number;
  cy: number;
  r: number;
  /** dominant region id, computed lazily for styling */
  region: number;
}

function decodeB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

const _lenBytes = decodeB64(LAND_LENS_B64);
const _lens = new Uint32Array(_lenBytes.buffer, _lenBytes.byteOffset, _lenBytes.byteLength / 4);
const _crdBytes = decodeB64(LAND_COORDS_B64);
const _crds = new Float32Array(_crdBytes.buffer, _crdBytes.byteOffset, _crdBytes.byteLength / 4);

export const LANDS: Landmass[] = [];
{
  let p = 0;
  for (let i = 0; i < _lens.length; i++) {
    const n = _lens[i];
    const pts = new Float32Array(n * 2);
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (let k = 0; k < n; k++) {
      const lon = _crds[p++];
      const lat = _crds[p++];
      const x = lon2x(lon);
      const y = lat2y(lat);
      pts[k * 2] = x;
      pts[k * 2 + 1] = y;
      if (x < bx0) bx0 = x;
      if (y < by0) by0 = y;
      if (x > bx1) bx1 = x;
      if (y > by1) by1 = y;
    }
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    const r = Math.hypot(bx1 - bx0, by1 - by0) / 2;
    // Ensure every ring is clockwise (positive area with y-down). This lets
    // the renderer expand/shrink outlines with a single sign convention.
    let sa = 0;
    for (let k = 0, j = n - 1; k < n; j = k, k++) {
      sa += pts[k * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[k * 2 + 1];
    }
    if (sa < 0) {
      // reverse in place
      for (let a = 0, b = n - 1; a < b; a++, b--) {
        const ax = pts[a * 2], ay = pts[a * 2 + 1];
        pts[a * 2] = pts[b * 2];
        pts[a * 2 + 1] = pts[b * 2 + 1];
        pts[b * 2] = ax;
        pts[b * 2 + 1] = ay;
      }
    }
    // Pick a "regional" flavour by sampling several interior points; the bbox
    // centroid alone lies outside oddly shaped landmasses (e.g. Italy).
    const interiorSamples = [
      [cx, cy],
      [(bx0 * 2 + bx1) / 3, (by0 * 2 + by1) / 3],
      [(bx0 + bx1 * 2) / 3, (by0 + by1 * 2) / 3],
      [(bx0 * 2 + bx1) / 3, (by0 + by1 * 2) / 3],
      [(bx0 + bx1 * 2) / 3, (by0 * 2 + by1) / 3],
    ];
    const votes = new Uint16Array(REGION_COUNT);
    let best = 0;
    let bestVotes = 0;
    for (const [sx, sy] of interiorSamples) {
      const ri = regionAt(sx, sy);
      votes[ri]++;
      if (votes[ri] > bestVotes) { bestVotes = votes[ri]; best = ri; }
    }
    LANDS.push({ pts, bx0, by0, bx1, by1, cx, cy, r, region: best });
  }
}

// Spatial grid: bucket land indices for O(1) lookups.
const GCELL = 1000; // km
const GCOLS = Math.ceil(WORLD_W / GCELL);
const GROWS = Math.ceil(WORLD_H / GCELL);
const grid: Uint16Array[] = new Array(GCOLS * GROWS);

{
  const counts = new Uint16Array(GCOLS * GROWS);
  for (let i = 0; i < LANDS.length; i++) {
    const L = LANDS[i];
    const gx0 = Math.max(0, Math.floor(L.bx0 / GCELL));
    const gx1 = Math.min(GCOLS - 1, Math.floor(L.bx1 / GCELL));
    const gy0 = Math.max(0, Math.floor(L.by0 / GCELL));
    const gy1 = Math.min(GROWS - 1, Math.floor(L.by1 / GCELL));
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) counts[gy * GCOLS + gx]++;
  }
  for (let i = 0; i < counts.length; i++) grid[i] = new Uint16Array(counts[i]);
  counts.fill(0);
  for (let i = 0; i < LANDS.length; i++) {
    const L = LANDS[i];
    const gx0 = Math.max(0, Math.floor(L.bx0 / GCELL));
    const gx1 = Math.min(GCOLS - 1, Math.floor(L.bx1 / GCELL));
    const gy0 = Math.max(0, Math.floor(L.by0 / GCELL));
    const gy1 = Math.min(GROWS - 1, Math.floor(L.by1 / GCELL));
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const k = gy * GCOLS + gx;
      grid[k][counts[k]++] = i;
    }
  }
}

const visitMark = new Uint8Array(LANDS.length);
let visitStamp = 0;

/**
 * Visit every landmass whose bounding box overlaps the given world rectangle.
 * Each land is reported at most once per call, even if it spans several cells.
 */
export function forEachLand(x0: number, y0: number, x1: number, y1: number, cb: (L: Landmass, i: number) => void) {
  visitStamp = (visitStamp + 1) & 0xff;
  if (visitStamp === 0) {
    visitMark.fill(0);
    visitStamp = 1;
  }
  const gx0 = Math.max(0, Math.floor(x0 / GCELL));
  const gx1 = Math.min(GCOLS - 1, Math.floor(x1 / GCELL));
  const gy0 = Math.max(0, Math.floor(y0 / GCELL));
  const gy1 = Math.min(GROWS - 1, Math.floor(y1 / GCELL));
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const bucket = grid[gy * GCOLS + gx];
      for (let k = 0; k < bucket.length; k++) {
        const idx = bucket[k];
        if (visitMark[idx] === visitStamp) continue;
        visitMark[idx] = visitStamp;
        const L = LANDS[idx];
        if (L.bx0 > x1 || L.bx1 < x0 || L.by0 > y1 || L.by1 < y0) continue;
        cb(L, idx);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Point/segment helpers used by collision, spawning and steering.
// ---------------------------------------------------------------------------

/** Even-odd point-in-polygon test on a Float32 [x,y,x,y,...] ring. */
function pointInRing(px: number, py: number, pts: Float32Array): boolean {
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const yi = pts[i + 1];
    const yj = pts[j + 1];
    if ((yi > py) !== (yj > py)) {
      const xi = pts[i];
      const xj = pts[j];
      const xIntersect = ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (px < xIntersect) inside = !inside;
    }
  }
  return inside;
}

const ROW_SIZE = 420;
const rowEdges: { ax: number; ay: number; bx: number; by: number; land: number }[][] = [];
for (let li = 0; li < LANDS.length; li++) {
  const pts = LANDS[li].pts;
  for (let i=0,j=pts.length-2;i<pts.length;j=i,i+=2) {
    const ax=pts[j],ay=pts[j+1],bx=pts[i],by=pts[i+1];
    if (ay===by) continue;
    const edge = {ax,ay,bx,by,land:li};
    const lo=Math.max(0,Math.floor(Math.min(ay,by)/ROW_SIZE));
    const hi=Math.min(Math.floor(WORLD_H/ROW_SIZE),Math.floor(Math.max(ay,by)/ROW_SIZE));
    for(let row=lo;row<=hi;row++) (rowEdges[row] ||= []).push(edge);
  }
}
const parity = new Uint8Array(LANDS.length);
export function isOnLand(x: number, y: number): boolean {
  if (y<0 || y>WORLD_H) return false;
  x = (x % WORLD_W + WORLD_W) % WORLD_W;
  parity.fill(0);
  const edges = rowEdges[Math.floor(y / ROW_SIZE)] || [];
  for (const e of edges) {
    if ((e.ay>y) !== (e.by>y) && x < (e.bx-e.ax)*(y-e.ay)/(e.by-e.ay)+e.ax) parity[e.land] ^= 1;
  }
  for (let i=0;i<parity.length;i++) if (parity[i]) return true;
  return false;
}

/** Finds a reachable point on the requested side of the actual shoreline. */
export function shorePoint(c: CoastInfo, land: boolean, distance = 18): { x: number; y: number } | null {
  const sign = land ? -1 : 1;
  for (const d of [distance, distance*1.8, distance*3, 5]) {
    const x=c.x+c.nx*d*sign, y=c.y+c.ny*d*sign;
    if (isOnLand(x,y)===land) return {x,y};
  }
  for(let i=0;i<24;i++) {
    const angle=i*Math.PI/12;
    const x=c.x+Math.cos(angle)*distance, y=c.y+Math.sin(angle)*distance;
    if(isOnLand(x,y)===land) return {x,y};
  }
  return null;
}

export interface CoastInfo {
  found: boolean;
  inside: boolean;
  distance: number;
  x: number;
  y: number;
  nx: number;
  ny: number;
  landId: number;
}
export const makeCoast = (): CoastInfo => ({ found: false, inside: false, distance: Infinity, x: 0, y: 0, nx: 1, ny: 0, landId: -1 });

interface ShoreEdge {ax:number;ay:number;bx:number;by:number;land:number;}
const EDGE_CELL=360;
const EDGE_COLS=Math.ceil(WORLD_W/EDGE_CELL);
const edgeGrid=new Map<number,number[]>();
const shoreEdges:ShoreEdge[]=[];
for(let land=0;land<LANDS.length;land++){
  const pts=LANDS[land].pts;
  for(let i=0,j=pts.length-2;i<pts.length;j=i,i+=2){
    const ax=pts[j],ay=pts[j+1],bx=pts[i],by=pts[i+1];
    if(ax===bx&&ay===by)continue;
    const id=shoreEdges.length;shoreEdges.push({ax,ay,bx,by,land});
    const loX=Math.max(0,Math.floor(Math.min(ax,bx)/EDGE_CELL)),hiX=Math.min(EDGE_COLS-1,Math.floor(Math.max(ax,bx)/EDGE_CELL));
    const loY=Math.max(0,Math.floor(Math.min(ay,by)/EDGE_CELL)),hiY=Math.floor(Math.max(ay,by)/EDGE_CELL);
    for(let cy=loY;cy<=hiY;cy++)for(let cx=loX;cx<=hiX;cx++){
      const key=cy*EDGE_COLS+cx;const list=edgeGrid.get(key);
      if(list)list.push(id);else edgeGrid.set(key,[id]);
    }
  }
}
const edgeVisited=new Uint32Array(shoreEdges.length);let edgeStamp=0;
/** Exact coast query, indexed by segment; only nearby edges are evaluated. */
export function nearestCoast(x:number,y:number,range:number,out:CoastInfo):boolean {
  out.found=false;out.inside=isOnLand(x,y);out.distance=Infinity;
  let best=range*range;const stamp=++edgeStamp;
  const gx0=Math.max(0,Math.floor((x-range)/EDGE_CELL)),gx1=Math.min(EDGE_COLS-1,Math.floor((x+range)/EDGE_CELL));
  const gy0=Math.max(0,Math.floor((y-range)/EDGE_CELL)),gy1=Math.floor((y+range)/EDGE_CELL);
  for(let cy=gy0;cy<=gy1;cy++)for(let cx=gx0;cx<=gx1;cx++){
    const list=edgeGrid.get(cy*EDGE_COLS+cx);if(!list)continue;
    for(const id of list){
      if(edgeVisited[id]===stamp)continue;edgeVisited[id]=stamp;
      const e=shoreEdges[id],dx=e.bx-e.ax,dy=e.by-e.ay,len2=dx*dx+dy*dy;
      const t=len2?Math.max(0,Math.min(1,((x-e.ax)*dx+(y-e.ay)*dy)/len2)):0;
      const qx=e.ax+dx*t,qy=e.ay+dy*t,d2=(x-qx)**2+(y-qy)**2;
      if(d2>=best)continue;best=d2;const d=Math.sqrt(d2);
      let nx=out.inside?qx-x:x-qx,ny=out.inside?qy-y:y-qy;
      if(d<.001){const l=Math.hypot(dx,dy)||1;nx=dy/l;ny=-dx/l;if(isOnLand(qx+nx*2,qy+ny*2)){nx=-nx;ny=-ny;}}
      else {nx/=d;ny/=d;}
      out.found=true;out.x=qx;out.y=qy;out.nx=nx;out.ny=ny;out.distance=d;out.landId=e.land;
    }
  }
  return out.found;
}

const steeringCoast = makeCoast();
export function landPush(x: number, y: number, margin: number, out: { x: number; y: number }): number {
  out.x = out.y = 0;
  if (!nearestCoast(x, y, margin, steeringCoast)) return 0;
  const c = steeringCoast;
  const strength = c.inside ? Math.min(4, 1 + c.distance / margin) : Math.max(0, 1 - c.distance / margin);
  out.x = c.nx * strength; out.y = c.ny * strength;
  return strength;
}

// Legacy alias so the rest of the engine keeps compiling.
export const islandPush = landPush;

// ---------------------------------------------------------------------------
// Seabed decoration: sparse, camera-local. Skipped over land tiles.
// ---------------------------------------------------------------------------

export type Decor = {
  x: number;
  y: number;
  kind: DecorKind;
  size: number;
  seed: number;
  region: number;
};

const DCELL = 340;
const scratch: Decor = { x: 0, y: 0, kind: "sand", size: 0, seed: 0, region: 0 };

export function forEachDecor(x0: number, y0: number, x1: number, y1: number, cb: (d: Decor) => void) {
  const cx0 = Math.floor(x0 / DCELL);
  const cx1 = Math.floor(x1 / DCELL);
  const cy0 = Math.floor(y0 / DCELL);
  const cy1 = Math.floor(y1 / DCELL);
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let k = 0; k < 2; k++) {
        if (hash2(cx, cy, 120 + k) > 0.62) continue;
        const x = (cx + hash2(cx, cy, 130 + k)) * DCELL;
        const y = (cy + hash2(cx, cy, 140 + k)) * DCELL;
        if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) continue;
        if (isOnLand(x, y)) continue;
        const region = regionAt(x, y);
        scratch.x = x;
        scratch.y = y;
        scratch.region = region;
        scratch.kind = REGIONS[region].decor;
        scratch.size = 0.7 + hash2(cx, cy, 150 + k) * 0.9;
        scratch.seed = hash2(cx, cy, 160 + k) * 1000;
        cb(scratch);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Legacy Island / palm structures for the renderer. Islands are now derived
// from small landmasses so the drawing code keeps working unchanged, and we
// scatter palms/rocks on top for character.
// ---------------------------------------------------------------------------

export type Lump = { x: number; y: number; r: number };
export type Palm = { x: number; y: number; s: number; a: number };
export interface Island {
  x: number;
  y: number;
  r: number;
  lumps: Lump[];
  palms: Palm[];
  region: number;
  seed: number;
  /** for the polygon-based renderer path */
  land?: Landmass;
}

const islandCache = new Map<number, Island>();

function buildIslandFor(idx: number, L: Landmass): Island {
  const seed = idx * 131 + 17;
  const region = L.region;
  // Sprinkle palms/rocks/blocks along the outline for decoration.
  const palms: Palm[] = [];
  const per = REGIONS[region].island;
  const density = per === "ice" || per === "basalt" ? 0 : per === "storm" ? 0.9 : 1;
  const nMax = L.r < 40 ? 3 : L.r < 120 ? 6 : 12;
  const n = Math.floor(nMax * density);
  for (let i = 0; i < n; i++) {
    const a = hash2(idx, i, 71) * Math.PI * 2;
    const rr = L.r * (0.15 + hash2(idx, i, 72) * 0.5);
    const px = L.cx + Math.cos(a) * rr;
    const py = L.cy + Math.sin(a) * rr;
    if (!pointInRingLocal(px, py, L.pts)) continue;
    palms.push({ x: px, y: py, s: 0.7 + hash2(idx, i, 73) * 0.6, a: hash2(idx, i, 74) * Math.PI * 2 });
  }
  // Provide a "lump" list matching the polygon bounds for legacy shoal/foam.
  return { x: L.cx, y: L.cy, r: L.r, lumps: [{ x: L.cx, y: L.cy, r: L.r }], palms, region, seed, land: L };
}

function pointInRingLocal(px: number, py: number, pts: Float32Array): boolean {
  return pointInRing(px, py, pts);
}

export function forEachIsland(x0: number, y0: number, x1: number, y1: number, cb: (i: Island) => void) {
  forEachLand(x0, y0, x1, y1, (L, idx) => {
    let isl = islandCache.get(idx);
    if (!isl) {
      isl = buildIslandFor(idx, L);
      islandCache.set(idx, isl);
    }
    cb(isl);
  });
}
