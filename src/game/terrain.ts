import { forEachIsland, type Island } from "./world";

const SIZE = 512;
const RESOLUTION = 1.5;
const LIMIT = 32;
interface Tile { canvas: HTMLCanvasElement | null; used: number; }
const cache = new Map<string, Tile>();
let clock = 0;

/**
 * The coastline never changes. Bake camera-local terrain tiles on first visit
 * instead of rebuilding several thousand polygon vertices every frame. Empty
 * ocean tiles don't allocate a canvas; an LRU cap bounds memory on phones.
 */
export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  paint: (island: Island, context: CanvasRenderingContext2D) => void,
) {
  clock++;
  const ix0 = Math.floor(x0 / SIZE), ix1 = Math.floor(x1 / SIZE);
  const iy0 = Math.floor(y0 / SIZE), iy1 = Math.floor(y1 / SIZE);
  for (let iy = iy0; iy <= iy1; iy++) {
    for (let ix = ix0; ix <= ix1; ix++) {
      const key = `${ix}:${iy}`;
      let tile = cache.get(key);
      const x = ix * SIZE, y = iy * SIZE;
      if (!tile) {
        const islands: Island[] = [];
        forEachIsland(x - 45, y - 45, x + SIZE + 45, y + SIZE + 45, island => islands.push(island));
        let canvas: HTMLCanvasElement | null = null;
        if (islands.length) {
          canvas = document.createElement("canvas");
          canvas.width = canvas.height = SIZE * RESOLUTION;
          const c = canvas.getContext("2d")!;
          c.setTransform(RESOLUTION, 0, 0, RESOLUTION, -x * RESOLUTION, -y * RESOLUTION);
          c.lineJoin = "round"; c.lineCap = "round";
          for (const island of islands) paint(island, c);
        }
        tile = { canvas, used: clock };
        cache.set(key, tile);
      }
      tile.used = clock;
      if (tile.canvas) ctx.drawImage(tile.canvas, x, y, SIZE, SIZE);
    }
  }
  if (cache.size > LIMIT) {
    const old = [...cache.entries()].filter(([, v]) => v.used < clock).sort((a,b) => a[1].used - b[1].used);
    for (let i = 0; i < old.length && cache.size > LIMIT; i++) {
      if (old[i][1].canvas) { old[i][1].canvas!.width = 0; old[i][1].canvas!.height = 0; }
      cache.delete(old[i][0]);
    }
  }
}
