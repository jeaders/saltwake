import { LANDS, WORLD_H, WORLD_W, forEachLand, regionAt, REGIONS } from "./world";

export interface MapRect { x: number; y: number; w: number; h: number; }
const paths = new WeakMap<Float32Array, Path2D>();
const wrap = (v: number) => ((v % WORLD_W) + WORLD_W) % WORLD_W;

/** North-up LOCAL chart. The actor stays centred and the coastline scrolls beneath them. */
export class MiniMap {
  readonly chart = document.createElement("canvas");
  readonly w = 512;
  readonly h = 256;
  centerX = 0;
  centerY = 0;
  span = 1800;
  zoom = 1;
  version = 0;
  trail: { x: number; y: number }[] = [];
  private bakedX = Infinity;
  private bakedY = Infinity;
  private bakedSpan = 0;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.chart.width = this.w; this.chart.height = this.h;
    this.ctx = this.chart.getContext("2d")!;
  }
  reset() { this.trail = []; this.bakedX = Infinity; this.bakedSpan = 0; this.zoom = 1; }
  reveal(x: number, y: number, _radius = 900) {
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 14) {
      this.trail.push({x,y});
      if (this.trail.length > 280) this.trail.shift();
    }
  }
  refresh() { /* chart is updated using the CURRENT focus inside draw(), never the parked boat */ }
  changeZoom(direction: number) { this.zoom = Math.max(0.6, Math.min(2.2, this.zoom + direction * 0.3)); }

  follow(x: number, y: number, onFoot: boolean, radarLevel = 0) {
    this.centerX = wrap(x); this.centerY = y;
    this.span = (onFoot ? 1100 : 1800) * this.zoom * (1 + radarLevel * 0.09);
  }
  /** Select the nearest longitude copy. Also works while crossing the antimeridian. */
  deltaX(x: number) {
    let dx = wrap(x) - this.centerX;
    if (dx > WORLD_W / 2) dx -= WORLD_W;
    if (dx < -WORLD_W / 2) dx += WORLD_W;
    return dx;
  }
  project(x: number, y: number, r: MapRect) {
    return { x: r.x + r.w / 2 + this.deltaX(x) / this.span * r.w, y: r.y + r.h / 2 + (y - this.centerY) / this.span * r.w };
  }

  private bake() {
    const padSpan = this.span * 1.6;
    const c = this.ctx;
    this.bakedX = this.centerX; this.bakedY = this.centerY; this.bakedSpan = padSpan;
    this.version++;
    c.setTransform(1,0,0,1,0,0);
    const region = REGIONS[regionAt(this.centerX,this.centerY)];
    const rgb = region.water;
    c.fillStyle = `rgb(${Math.round(rgb[0]*.34+7)},${Math.round(rgb[1]*.33+23)},${Math.round(rgb[2]*.32+30)})`;
    c.fillRect(0,0,this.w,this.h);
    const s = this.w / padSpan;
    const x0=this.centerX-padSpan/2, y0=this.centerY-padSpan/4;
    c.setTransform(s,0,0,s,-x0*s,-y0*s);
    c.lineJoin = "round";
    const paint = (index: number) => {
      const L=LANDS[index]; let p=paths.get(L.pts);
      if(!p){ p=new Path2D();p.moveTo(L.pts[0],L.pts[1]);for(let i=2;i<L.pts.length;i+=2)p.lineTo(L.pts[i],L.pts[i+1]);p.closePath();paths.set(L.pts,p); }
      c.fillStyle = "#93b3a2"; c.fill(p);
      c.strokeStyle = "#e6d5a4";c.lineWidth = 1.1/s;c.stroke(p);
    };
    forEachLand(x0,y0,x0+padSpan,y0+padSpan/2,(_L,i)=>paint(i));
    if(x0<0){ c.save();c.translate(-WORLD_W,0);forEachLand(x0+WORLD_W,y0,WORLD_W,y0+padSpan/2,(_L,i)=>paint(i));c.restore(); }
    if(x0+padSpan>WORLD_W){c.save();c.translate(WORLD_W,0);forEachLand(0,y0,x0+padSpan-WORLD_W,y0+padSpan/2,(_L,i)=>paint(i));c.restore();}
    // Geographic chart grid, not tied to the screen. It visibly scrolls even at sea.
    const cell=this.span<1300?200:400;
    c.strokeStyle="rgba(173,224,215,.14)";c.lineWidth=.6/s;c.beginPath();
    for(let x=Math.floor(x0/cell)*cell;x<x0+padSpan;x+=cell){c.moveTo(x,y0);c.lineTo(x,y0+padSpan/2);}
    for(let y=Math.floor(y0/cell)*cell;y<y0+padSpan/2;y+=cell){c.moveTo(x0,y);c.lineTo(x0+padSpan,y);}
    c.stroke();
    if(y0<0 || y0+padSpan/2>WORLD_H){c.fillStyle="rgba(214,237,238,.15)";if(y0<0)c.fillRect(x0,y0,padSpan,-y0);if(y0+padSpan/2>WORLD_H)c.fillRect(x0,WORLD_H,padSpan,y0+padSpan/2-WORLD_H);}
  }
  draw(ctx: CanvasRenderingContext2D,r:MapRect) {
    let dx=this.centerX-this.bakedX;
    if(dx>WORLD_W/2)dx-=WORLD_W;if(dx< -WORLD_W/2)dx+=WORLD_W;
    if(this.bakedSpan!==this.span*1.6 || Math.abs(dx)>this.span*.22 || Math.abs(this.centerY-this.bakedY)>this.span*.1)this.bake();
    dx=this.centerX-this.bakedX;
    if(dx>WORLD_W/2)dx-=WORLD_W;if(dx< -WORLD_W/2)dx+=WORLD_W;
    const sx=this.w/2+(dx-this.span/2)/this.bakedSpan*this.w;
    const sy=this.h/2+(this.centerY-this.bakedY-this.span*r.h/r.w/2)/this.bakedSpan*this.w;
    const sw=this.span/this.bakedSpan*this.w,sh=sw*r.h/r.w;
    ctx.drawImage(this.chart,sx,sy,sw,sh,r.x,r.y,r.w,r.h);
  }
}
