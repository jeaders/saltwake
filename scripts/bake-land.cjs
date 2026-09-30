// Natural Earth coastline, bundled locally: no runtime map requests.
const fs = require('node:fs');
const { feature } = require('topojson-client');
const world = require('world-atlas/land-10m.json');
const fc = feature(world, world.objects.land);
const rings = fc.features.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map(p => p[0]));

function simplify(points, eps) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a,b] = stack.pop(); const [ax,ay] = points[a]; const [bx,by] = points[b];
    const dx = bx-ax, dy = by-ay, l2 = dx*dx+dy*dy;
    let best = eps*eps, at = -1;
    for (let k=a+1;k<b;k++) {
      const [px,py] = points[k];
      const t = l2 ? Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l2)) : 0;
      const d = (px-ax-dx*t)**2+(py-ay-dy*t)**2;
      if (d>best) {best=d;at=k;}
    }
    if(at>=0) {keep[at]=1;stack.push([a,at],[at,b]);}
  }
  return points.filter((_,i)=>keep[i]);
}

function clip(points, edge, keepGreater) {
  const output=[];
  const inside = p => keepGreater ? p[0]>=edge : p[0]<=edge;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[j],b=points[i],ia=inside(a),ib=inside(b);
    if(ia!==ib) {
      const t=(edge-a[0])/(b[0]-a[0]);
      output.push([edge,a[1]+(b[1]-a[1])*t]);
    }
    if(ib)output.push(b);
  }
  return output;
}

/** Split spherical antimeridian crossings before using a flat world projection. */
function splitDateline(ring) {
  const pts=[];
  for(let i=0;i<ring.length;i++) {
    let [x,y]=ring[i];
    if(i) {
      const previous=pts[pts.length-1][0];
      while(x-previous>180)x-=360;
      while(x-previous< -180)x+=360;
    }
    pts.push([x,y]);
  }
  // Antarctica winds around the South Pole: close the cap at latitude -90,
  // not with a straight shortcut through the middle of the ocean.
  if(Math.abs(pts[pts.length-1][0]-pts[0][0])>300 && pts.every(p=>p[1]< -45)) {
    pts.push([pts[pts.length-1][0],-90],[pts[0][0],-90],pts[0]);
  }
  let min=Infinity,max=-Infinity;
  for(const point of pts){if(point[0]<min)min=point[0];if(point[0]>max)max=point[0];}
  const output=[];
  for(let shift=Math.floor((min+180)/360);shift<=Math.floor((max+180)/360);shift++) {
    let part=pts.map(([x,y])=>[x-shift*360,y]);
    part=clip(part,-180,true);if(part.length<3)continue;
    part=clip(part,180,false);if(part.length<3)continue;
    if(part[0][0]!==part[part.length-1][0]||part[0][1]!==part[part.length-1][1])part.push(part[0]);
    output.push(part);
  }
  return output;
}
const kept = [];
for (const ring of rings) {
  const mediterranean = ring.some(([lo,la])=>lo>-10&&lo<38&&la>30&&la<48);
  for(const part of splitDateline(ring)) {
    const pts = simplify(part, mediterranean ? 0.012 : 0.055);
    if (pts.length < 4) continue;
    let area = 0;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++) area += pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1];
    if (Math.abs(area)*.5 < .012) continue;
    kept.push(pts);
  }
}
const lengths = new Uint32Array(kept.map(r=>r.length));
const coords = new Float32Array(kept.reduce((n,r)=>n+r.length*2,0));
let p=0; for(const ring of kept) for(const [lon,lat] of ring){coords[p++]=+lon.toFixed(4);coords[p++]=+lat.toFixed(4);}
const b64 = arr=>Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength).toString('base64');
fs.writeFileSync('src/game/land-data.ts', `// Natural Earth / world-atlas land-10m, public-domain coastline.\n// Rebuild with node scripts/bake-land.cjs. ${kept.length} polygons, ${coords.length/2} vertices.\nexport const LAND_LENS_B64 = ${JSON.stringify(b64(lengths))};\nexport const LAND_COORDS_B64 = ${JSON.stringify(b64(coords))};\n`);
console.log(`${kept.length} dateline-clipped landmasses, ${coords.length/2} vertices, ${Math.round(coords.byteLength/1024)} KB raw`);
