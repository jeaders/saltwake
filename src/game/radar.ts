import type { Game } from "./engine";
import type { MapRect } from "./minimap";
import { PORTS } from "./ports";
import { POI_COLORS } from "./exploration";
import { HULL_PAINTS } from "./ship";
import { TAU } from "./util";

const FONT="Fredoka, ui-rounded, system-ui, sans-serif";
/** Draws markers using the same LOCAL transform as the scrolling geographic chart. */
export function drawRadar(g:Game,r:MapRect){
  const ctx=g.ctx,map=g.minimap,p=g.focus;
  map.follow(p.x,p.y,g.exploration.onFoot,g.adventure.profile.upgrades.sonar);
  ctx.save();ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,8*g.ui);ctx.clip();
  map.draw(ctx,r);
  const point=(x:number,y:number)=>map.project(x,y,r);
  const visible=(x:number,y:number,pad=7)=>x>=r.x-pad&&x<=r.x+r.w+pad&&y>=r.y-pad&&y<=r.y+r.h+pad;
  // A trail of recent real positions makes movement visible even in open water.
  ctx.strokeStyle="rgba(255,236,179,.36)";ctx.lineWidth=1.3;ctx.beginPath();let last:{x:number;y:number}|null=null;
  for(const pos of map.trail){const q=point(pos.x,pos.y);if(!last||Math.hypot(q.x-last.x,q.y-last.y)>r.w)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);last=q;}ctx.stroke();
  const goal=g.exploration.waypoint;
  if(goal){const q=point(goal.x,goal.y);ctx.strokeStyle="rgba(255,220,148,.7)";ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(r.x+r.w/2,r.y+r.h/2);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([]);
    if(visible(q.x,q.y)){ctx.strokeStyle="#ffe3a4";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(q.x,q.y,5,0,TAU);ctx.stroke();}
    else{const dx=q.x-(r.x+r.w/2),dy=q.y-(r.y+r.h/2),k=Math.min((r.w/2-10)/Math.abs(dx||.001),(r.h/2-10)/Math.abs(dy||.001));ctx.save();ctx.translate(r.x+r.w/2+dx*k,r.y+r.h/2+dy*k);ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle="#ffdd9b";ctx.beginPath();ctx.moveTo(4,0);ctx.lineTo(-3,-3);ctx.lineTo(-3,3);ctx.closePath();ctx.fill();ctx.restore();}}
  for(const port of PORTS){const q=point(port.x,port.y);if(!visible(q.x,q.y))continue;
    ctx.fillStyle=g.adventure.profile.visited.includes(port.id)?"#a8ebbb":"#ffdba1";ctx.strokeStyle="#133d48";ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(q.x,q.y,3.5,0,TAU);ctx.fill();ctx.stroke();
    ctx.font=`500 ${8*g.ui}px ${FONT}`;ctx.textAlign="left";ctx.textBaseline="middle";ctx.lineWidth=2.5;ctx.strokeStyle="#133d48";ctx.strokeText(port.name,q.x+5,q.y);ctx.fillStyle="#f3dfb7";ctx.fillText(port.name,q.x+5,q.y);
  }
  for(const c of g.crates){const q=point(c.x,c.y);if(!visible(q.x,q.y))continue;ctx.fillStyle=c.kind==="repair"?"#a8e9b7":c.kind==="time"?"#8edbe7":"#ffd483";ctx.fillRect(q.x-2,q.y-2,4,4);}
  if(g.exploration.onFoot){
    const q=point(g.boat.x,g.boat.y);if(visible(q.x,q.y)){ctx.fillStyle=HULL_PAINTS[g.adventure.profile.ship.hull].color;ctx.strokeStyle="#d7ece4";ctx.lineWidth=1;ctx.beginPath();ctx.arc(q.x,q.y,3.5,0,TAU);ctx.fill();ctx.stroke();}
    for(const v of g.exploration.visible){const q=point(v.x,v.y);if(!visible(q.x,q.y))continue;ctx.fillStyle=POI_COLORS[v.kind];ctx.fillRect(q.x-2,q.y-2,4,4);}
  }else{
    for(const school of g.schools){
      const tagged=school.members.some(f=>f.marked>0);
      if(!tagged&&g.adventure.profile.upgrades.sonar<1)continue;
      const q=point(school.x,school.y);if(!visible(q.x,q.y))continue;
      ctx.globalAlpha=tagged?1:.45;ctx.fillStyle=school.sp.tier===3?"#ffd483":"#7ddfe5";ctx.beginPath();ctx.arc(q.x,q.y,school.sp.tier===3?2.8:1.7,0,TAU);ctx.fill();ctx.globalAlpha=1;
    }
  }
  for(const pred of g.predators){const q=point(pred.x,pred.y);if(!visible(q.x,q.y))continue;
    const alert=pred.state===4||pred.state===5;
    ctx.fillStyle=alert?"#ff9c7b":"#ec785e";ctx.strokeStyle="#fed0a3";ctx.lineWidth=.9;
    ctx.beginPath();ctx.arc(q.x,q.y,alert?3.5+Math.sin(g.t*10):2.8,0,TAU);ctx.fill();ctx.stroke();}
  // Small viewport box, anchored to the actual actor rather than an old global chart.
  ctx.strokeStyle="rgba(215,244,224,.25)";ctx.lineWidth=.8;
  const vw=Math.min(r.w*.9,g.W/g.S/map.span*r.w),vh=Math.min(r.h*.9,g.H/g.S/map.span*r.w);
  ctx.strokeRect(r.x+r.w/2-vw/2,r.y+r.h/2-vh/2,vw,vh);
  const cx=r.x+r.w/2,cy=r.y+r.h/2;
  ctx.fillStyle="rgba(249,223,165,.12)";ctx.beginPath();ctx.arc(cx,cy,11,0,TAU);ctx.fill();
  ctx.save();ctx.translate(cx,cy);ctx.rotate(g.exploration.onFoot?g.exploration.person.angle:g.boat.ang);
  ctx.fillStyle="#fff4d8";ctx.strokeStyle="#e69975";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-3.8);ctx.lineTo(-2,0);ctx.lineTo(-4,3.8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  // Always-on tracking indicator: no "frozen" planet-scale view.
  ctx.fillStyle="rgba(10,35,48,.86)";ctx.beginPath();ctx.roundRect(r.x+5,r.y+5,84*g.ui,17*g.ui,5);ctx.fill();
  ctx.fillStyle="#a9e7c0";ctx.beginPath();ctx.arc(r.x+12*g.ui,r.y+13*g.ui,2,0,TAU);ctx.fill();
  ctx.font=`500 ${8*g.ui}px ${FONT}`;ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillStyle="#d6e2c8";ctx.fillText("RADAR · TI SEGUE",r.x+19*g.ui,r.y+13*g.ui);
  ctx.fillStyle="#e5edd3";ctx.font=`600 ${9*g.ui}px ${FONT}`;ctx.textAlign="right";ctx.fillText("N ↑",r.x+r.w-6,r.y+12*g.ui);
  ctx.restore();ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,8*g.ui);ctx.lineWidth=1.5;ctx.strokeStyle="rgba(218,236,209,.28)";ctx.stroke();
}
