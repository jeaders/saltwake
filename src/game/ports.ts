import { REGIONS, CoastInfo, WORLD_W, WORLD_SCALE, isOnLand, lat2y, lon2x, makeCoast, nearestCoast, regionAt, x2lon, y2lat } from "./world";

export interface DockSite {
  id: string;
  name: string;
  country: string;
  description: string;
  x: number;
  y: number;
  shoreX: number;
  shoreY: number;
  nx: number;
  ny: number;
  region: number;
  specialty: string[];
  color: string;
  real: boolean;
}

const definitions: [string, string, string, number, number, string, string[]][] = [
  ["napoli", "Napoli", "Italia", 14.25, 40.83, "Un caffè sul molo, il Vesuvio all’orizzonte e il mercato appena aperto.", ["seabream", "seabass", "redmullet", "squid"]],
  ["cagliari", "Cagliari", "Italia", 9.12, 39.2, "Salsedine, barche colorate e storie di pescatori sardi.", ["sardine", "anchovy", "octopus"]],
  ["bergen", "Bergen", "Norvegia", 5.3, 60.39, "Case di legno e fiordi: il tuo rifugio nei mari del nord.", ["herring", "cod", "salmon"]],
  ["reykjavik", "Reykjavík", "Islanda", -21.94, 64.15, "Luci calde, oceano freddo e leggende sotto i ghiacci.", ["cod", "char", "haddock"]],
  ["havana", "L’Avana", "Cuba", -82.37, 23.13, "Pastelli sul lungomare e pesci di mille colori nei Caraibi.", ["snapper", "parrotfish", "triggerfish"]],
  ["vancouver", "Vancouver", "Canada", -123.12, 49.28, "Un porto tra foreste, monti e grandi banchi di salmone.", ["salmon", "pollock", "rockfish"]],
  ["yokohama", "Yokohama", "Giappone", 139.64, 35.45, "Lanterne accese e un mercato che ama il tonno fresco.", ["bluefin", "squid", "bonito"]],
  ["cairns", "Cairns", "Australia", 145.78, -16.92, "La porta della Grande Barriera: ogni onda è un nuovo incontro.", ["clownfish", "bluetang", "grouper"]],
  ["bali", "Bali", "Indonesia", 115.21, -8.75, "Palme, coralli e una piccola spiaggia ancora da esplorare.", ["wrasse", "parrotfish", "moray"]],
  ["capetown", "Città del Capo", "Sudafrica", 18.43, -33.91, "Due oceani si incontrano sotto la montagna della Tavola.", ["yellowfin", "dorado", "swordfish"]],
  ["honolulu", "Honolulu", "Hawaii", -157.87, 21.3, "Una sosta tropicale nel cuore dell’immenso Pacifico.", ["dorado", "wahoo", "yellowfin"]],
  ["ushuaia", "Ushuaia", "Argentina", -68.3, -54.8, "L’ultimo porto prima del grande oceano australe.", ["icefish", "squid", "herring"]],
];

const coast = makeCoast();
export const PORTS: DockSite[] = definitions.map(([id, name, country, lon, lat, description, specialty]) => {
  const px = lon2x(lon), py = lat2y(lat);
  nearestCoast(px, py, 650 * WORLD_SCALE, coast);
  const shoreX = coast.found ? coast.x : px;
  const shoreY = coast.found ? coast.y : py;
  let nx = coast.found ? coast.nx : 1;
  let ny = coast.found ? coast.ny : 0;
  // Positions refer to simplified coasts, not navigational charts. Ensure a seaward approach.
  if (isOnLand(shoreX + nx * 65, shoreY + ny * 65)) {
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8;
      if (!isOnLand(shoreX + Math.cos(a) * 80, shoreY + Math.sin(a) * 80)) { nx = Math.cos(a); ny = Math.sin(a); break; }
    }
  }
  let x = shoreX + nx * 70, y = shoreY + ny * 70;
  const safety = makeCoast();
  const clear = (px: number, py: number) => !isOnLand(px,py) && (!nearestCoast(px,py,21,safety) || !safety.inside && safety.distance>=20);
  if(!clear(x,y)) {
    const heading=Math.atan2(ny,nx);let found=false;
    for(const distance of [70,100,45,140,190]){
      for(let i=0;i<24;i++){
        const angle=heading+(i%2?1:-1)*Math.ceil(i/2)*Math.PI/12;
        const qx=shoreX+Math.cos(angle)*distance,qy=shoreY+Math.sin(angle)*distance;
        if(clear(qx,qy)){x=qx;y=qy;nx=Math.cos(angle);ny=Math.sin(angle);found=true;break;}
      }
      if(found)break;
    }
  }
  const region = regionAt(x, y);
  return { id, name, country, description, specialty, x, y, shoreX, shoreY, nx, ny, region, color: REGIONS[region].accent, real: true };
});

export function nearestPort(x: number, y: number, radius = 600): DockSite | null {
  let found: DockSite | null = null, best = radius;
  for (const p of PORTS) {
    const dx = Math.abs(x - p.x);
    const d = Math.hypot(Math.min(dx, WORLD_W - dx), y - p.y);
    if (d < best) { best = d; found = p; }
  }
  return found;
}

export function coastalSite(x: number, y: number, c: CoastInfo): DockSite | null {
  const port = nearestPort(x, y, 180);
  if (port) return port;
  if (!c.found || (!c.inside && c.distance > 90)) return null;
  const region = regionAt(x, y);
  const r = REGIONS[region];
  return {
    id: `cove-${c.landId}-${Math.floor(c.x / (700 * WORLD_SCALE))}-${Math.floor(c.y / (700 * WORLD_SCALE))}`,
    name: r.weather === "snow" ? "Avamposto dei ghiacci" : "Cala dei naviganti",
    country: r.name,
    description: "Una spiaggia tranquilla e un piccolo emporio di pescatori. Scendi a terra: qui il viaggio continua.",
    x: c.x + c.nx * 70, y: c.y + c.ny * 70,
    shoreX: c.x, shoreY: c.y, nx: c.nx, ny: c.ny,
    region, specialty: r.fish.filter(([, weight]) => weight > 2).map(([id]) => id).slice(0, 3),
    color: r.accent, real: false,
  };
}

export function coordinates(x: number, y: number): string {
  const la = y2lat(y), lo = x2lon(x);
  return `${Math.abs(la).toFixed(1)}°${la >= 0 ? "N" : "S"} · ${Math.abs(lo).toFixed(1)}°${lo >= 0 ? "E" : "W"}`;
}
