import type { Game } from "./engine";
import { LandPoi, POI_COLORS } from "./exploration";
import { REGIONS, WORLD_W, isOnLand, regionAt } from "./world";
import { TAU, hash2 } from "./util";

const FONT="Fredoka, ui-rounded, system-ui, sans-serif";
const trees=new Map<string,{x:number;y:number;size:number;kind:number}[]>();
function treeCell(cx:number,cy:number){
  const key=`${cx}:${cy}`;let list=trees.get(key);if(list)return list;
  list=[];
  for(let i=0;i<7;i++){
    const x=(cx+hash2(cx,cy,221+i))*300,y=(cy+hash2(cx,cy,241+i))*300;
    if(!isOnLand(x,y))continue;
    list.push({x,y,size:13+hash2(cx,cy,261+i)*16,kind:Math.floor(hash2(cx,cy,281+i)*4)});
  }
  trees.set(key,list);if(trees.size>90){const first=trees.keys().next().value;if(first)trees.delete(first);}
  return list;
}
function house(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,color:string){
  ctx.fillStyle="rgba(10,40,40,.16)";ctx.beginPath();ctx.roundRect(x-w*.52+4,y-w*.35+9,w,w*.85,5);ctx.fill();
  ctx.fillStyle="#f4e7bf";ctx.strokeStyle="#bca577";ctx.lineWidth=1.4;
  ctx.beginPath();ctx.roundRect(x-w*.5,y-w*.4,w,w*.8,4);ctx.fill();ctx.stroke();
  ctx.fillStyle="#728e83";ctx.fillRect(x-4,y+w*.17,8,w*.2);
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x-w*.57,y-w*.12);ctx.lineTo(x,y-w*.59);ctx.lineTo(x+w*.57,y-w*.12);ctx.lineTo(x+w*.47,y+w*.07);ctx.lineTo(x-w*.47,y+w*.07);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(70,40,30,.2)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-w*.59);ctx.lineTo(x,y+w*.05);ctx.stroke();
  ctx.fillStyle="#ecd098";ctx.fillRect(x+w*.14,y+w*.13,6,6);
}
function poi(g:Game,v:LandPoi){
  const ctx=g.ctx,near=g.exploration.nearest?.id===v.id;
  const done=g.adventure.profile.landmarks.includes(v.id),col=POI_COLORS[v.kind];
  ctx.save();ctx.translate(v.x,v.y);
  ctx.fillStyle="rgba(11,39,33,.14)";ctx.beginPath();ctx.ellipse(4,11,31,14,0,0,TAU);ctx.fill();
  if(v.kind==="port"){
    ctx.fillStyle="#d3bf8d";ctx.beginPath();ctx.roundRect(-66,-26,134,62,18);ctx.fill();
    house(ctx,-35,-7,35,"#db866f");house(ctx,19,-14,45,"#648f85");house(ctx,54,13,26,"#e6b978");
    ctx.fillStyle="#ad7957";ctx.fillRect(-20,19,32,14);ctx.fillStyle="#e2ad7b";ctx.fillRect(-24,15,40,7);
    ctx.fillStyle="#83bed0";ctx.beginPath();ctx.ellipse(-5,17,7,2.3,0,0,TAU);ctx.fill();
  }else if(v.kind==="camp"){
    ctx.fillStyle="#497e65";ctx.beginPath();ctx.moveTo(-27,13);ctx.lineTo(0,-22);ctx.lineTo(29,13);ctx.closePath();ctx.fill();
    ctx.fillStyle="#81ae83";ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(29,13);ctx.lineTo(5,13);ctx.closePath();ctx.fill();
    ctx.fillStyle="#233f36";ctx.beginPath();ctx.moveTo(-10,13);ctx.lineTo(0,-3);ctx.lineTo(9,13);ctx.fill();
    ctx.fillStyle="#cf8864";ctx.beginPath();ctx.arc(-34,17,6,0,TAU);ctx.fill();ctx.fillStyle="#ffc77a";ctx.beginPath();ctx.moveTo(-39,17);ctx.quadraticCurveTo(-31,9,-33,0);ctx.quadraticCurveTo(-25,12,-29,17);ctx.fill();
  }else if(v.kind==="treasure"){
    ctx.fillStyle=done?"#ae9d76":"#c78f43";ctx.strokeStyle="#805b30";ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(-16,-13,32,25,5);ctx.fill();ctx.stroke();
    ctx.fillStyle="#f5d486";ctx.fillRect(-9,-13,3,25);ctx.fillRect(7,-13,3,25);ctx.fillRect(-16,-3,32,3);ctx.fillRect(-3,-4,6,8);
    if(!done){const t=Math.sin(g.t*3.2)*.5+.5;ctx.fillStyle=`rgba(255,238,172,${t})`;ctx.beginPath();ctx.arc(-21,-18,3,0,TAU);ctx.fill();}
  }else if(v.kind==="lookout"){
    ctx.fillStyle="#dedec3";ctx.strokeStyle="#a2aa91";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-13,14);ctx.lineTo(-7,-34);ctx.lineTo(7,-34);ctx.lineTo(14,14);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#d58268";ctx.fillRect(-9,-11,18,8);ctx.fillStyle="#335d67";ctx.fillRect(-11,-42,22,10);
    ctx.fillStyle="#f6cf80";ctx.fillRect(-5,-40,10,7);ctx.fillStyle="#d77f67";ctx.beginPath();ctx.moveTo(-15,-42);ctx.lineTo(0,-54);ctx.lineTo(15,-42);ctx.fill();
  }else{
    ctx.fillStyle="#c9c3a4";ctx.strokeStyle="#8c967d";ctx.lineWidth=1.5;
    for(const x of [-24,0,24]){ctx.beginPath();ctx.roundRect(x-6,-22,12,39,2);ctx.fill();ctx.stroke();ctx.fillRect(x-9,-24,18,5);ctx.fillRect(x-8,15,16,5);}
    ctx.fillStyle="#dee0bf";ctx.beginPath();ctx.moveTo(-33,-24);ctx.lineTo(0,-40);ctx.lineTo(33,-24);ctx.fill();
  }
  const label=done&&v.kind!=="port"&&v.kind!=="camp"?"Esplorato":near?`${v.name} · SPAZIO`:v.name;
  if(g.S>.5){
    ctx.font=`500 ${near?13:11}px ${FONT}`;ctx.textAlign="center";ctx.textBaseline="middle";
    const w=ctx.measureText(label).width+18,y=v.kind==="lookout"?-72:-55;
    ctx.fillStyle="rgba(13,43,44,.85)";ctx.strokeStyle=near?col:"rgba(226,225,176,.25)";ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(-w/2,y-10,w,21,7);ctx.fill();ctx.stroke();ctx.fillStyle=done?"#b5cec0":col;ctx.fillText(label,0,y+1);
  }
  if(near){ctx.strokeStyle=col;ctx.globalAlpha=.45;ctx.lineWidth=2;ctx.setLineDash([4,6]);ctx.beginPath();ctx.ellipse(0,6,40,24,0,0,TAU);ctx.stroke();}
  ctx.restore();
}
export function drawLandExploration(g:Game){
  const ex=g.exploration;if(!ex.onFoot)return;
  const ctx=g.ctx,p=ex.person;
  ctx.setTransform(g.A,0,0,g.A,g.tx,g.ty);
  const range=Math.min(1300,g.viewR),style=REGIONS[regionAt(p.x,p.y)].island;
  const x0=Math.floor((p.x-range)/300),x1=Math.floor((p.x+range)/300),y0=Math.floor((p.y-range)/300),y1=Math.floor((p.y+range)/300);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)for(const t of treeCell(cx,cy)){
    if(ex.visible.some(v=>Math.hypot(v.x-t.x,v.y-t.y)<75))continue;
    ctx.fillStyle="rgba(23,53,27,.13)";ctx.beginPath();ctx.ellipse(t.x+5,t.y+9,t.size,t.size*.66,0,0,TAU);ctx.fill();
    if(style==="ice"||t.kind===3){
      ctx.fillStyle=style==="ice"?"#cadde2":"#98a07d";ctx.beginPath();ctx.moveTo(t.x-t.size*.65,t.y+8);ctx.lineTo(t.x-t.size*.3,t.y-t.size*.7);ctx.lineTo(t.x+t.size*.5,t.y-t.size*.4);ctx.lineTo(t.x+t.size*.7,t.y+7);ctx.closePath();ctx.fill();
      ctx.strokeStyle="rgba(246,251,218,.32)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(t.x-t.size*.3,t.y-t.size*.7);ctx.lineTo(t.x,t.y);ctx.stroke();
    }else{
      ctx.fillStyle=style==="moss"?"#3b7651":"#58834e";ctx.beginPath();ctx.arc(t.x,t.y,t.size,0,TAU);ctx.fill();
      ctx.fillStyle=style==="moss"?"#57956a":"#7caa65";ctx.beginPath();ctx.arc(t.x-t.size*.22,t.y-t.size*.25,t.size*.73,0,TAU);ctx.fill();
      ctx.fillStyle="rgba(192,217,125,.25)";ctx.beginPath();ctx.arc(t.x-t.size*.42,t.y-t.size*.5,t.size*.25,0,TAU);ctx.fill();
    }
    ctx.fillStyle="rgba(243,229,167,.35)";ctx.fillRect(t.x+t.size+13,t.y+10,2,3);ctx.fillRect(t.x+t.size+17,t.y+15,2,3);
  }
  // A visible breadcrumb trail preserves the sense of having walked here.
  if(ex.trail.length>1){
    ctx.strokeStyle="rgba(238,218,172,.35)";ctx.lineWidth=5;ctx.lineCap="round";ctx.setLineDash([2,14]);ctx.beginPath();
    ex.trail.forEach((v,i)=>{if(!i||Math.abs(v.x-ex.trail[i-1].x)>WORLD_W/2)ctx.moveTo(v.x,v.y);else ctx.lineTo(v.x,v.y);});ctx.stroke();ctx.setLineDash([]);
  }
  for(const v of ex.visible)if(Math.abs(v.x-g.cam.x)*g.S<g.W*.6+90&&Math.abs(v.y-g.cam.y)*g.S<g.H*.6+90)poi(g,v);
  if(ex.launch){
    const v=ex.launch,r=28+Math.sin(g.t*2)*2;
    ctx.strokeStyle="#d9f4b5";ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(v.x,v.y,r,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.font=`500 11px ${FONT}`;ctx.textAlign="center";ctx.strokeStyle="rgba(8,37,45,.8)";ctx.lineWidth=3;ctx.strokeText("SALPA DA QUI · E",v.x,v.y-r-12);ctx.fillStyle="#f4edc5";ctx.fillText("SALPA DA QUI · E",v.x,v.y-r-12);
  }
  drawFishing(g);
  if(ex.walkTarget){ctx.strokeStyle="rgba(255,245,193,.65)";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(ex.walkTarget.x,ex.walkTarget.y,9,0,TAU);ctx.stroke();}
}

function drawFishing(g:Game){
  const ex=g.exploration,f=ex.fishing;if(!f.phase)return;
  const ctx=g.ctx,p=ex.person,bite=f.phase===2;
  const dx=Math.cos(p.angle),dy=Math.sin(p.angle);
  const tipX=p.x+dx*24,tipY=p.y-24+dy*6,bob=Math.sin(g.t*(bite?28:3))*(bite?3.2:1.2)+(bite?4:0);
  ctx.lineCap="round";
  ctx.strokeStyle="#7b5b39";ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(p.x+dx*4,p.y-9);ctx.lineTo(tipX,tipY);ctx.stroke();
  ctx.strokeStyle="rgba(255,251,230,.9)";ctx.lineWidth=1.1;
  ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo((tipX+f.x)/2,Math.min(tipY,f.y)-30+(bite?16:0),f.x,f.y+bob);ctx.stroke();
  ctx.strokeStyle=`rgba(255,255,255,${bite?.75:.4})`;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.ellipse(f.x,f.y+2,9+(bite?Math.sin(g.t*18)*3+4:0),4.6,0,0,TAU);ctx.stroke();
  ctx.fillStyle="#f4f1e6";ctx.beginPath();ctx.arc(f.x,f.y+bob,4.3,Math.PI,0);ctx.fill();
  ctx.fillStyle="#e4503f";ctx.beginPath();ctx.arc(f.x,f.y+bob,4.3,0,Math.PI);ctx.fill();
  if(bite){
    const y=p.y-56+Math.sin(g.t*14)*2;
    ctx.fillStyle="rgba(186,44,36,.95)";ctx.beginPath();ctx.arc(p.x,y,14,0,TAU);ctx.fill();
    ctx.strokeStyle="#fff2d1";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#fff";ctx.font=`700 20px ${FONT}`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("!",p.x,y+1);
    ctx.font=`600 12px ${FONT}`;ctx.strokeStyle="rgba(8,37,45,.85)";ctx.lineWidth=3;ctx.strokeText("TIRA! F / SPAZIO",p.x,y-24);ctx.fillStyle="#fff1c9";ctx.fillText("TIRA! F / SPAZIO",p.x,y-24);
  }
}

export function drawExplorer(g:Game){
  const ex=g.exploration;if(!ex.onFoot)return;
  const p=ex.person,ctx=g.ctx,walking=Math.hypot(p.vx,p.vy)>10;
  const stride=walking?Math.sin(p.stride):0;
  const scale=1.28;
  ctx.setTransform(g.A*scale,0,0,g.A*scale,g.tx+p.x*g.A,g.ty+p.y*g.A);
  ctx.fillStyle="rgba(16,40,28,.22)";ctx.beginPath();ctx.ellipse(0,5,11,4.5,0,0,TAU);ctx.fill();
  ctx.lineCap="round";
  ctx.strokeStyle="#314b57";ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(-3,-1);ctx.lineTo(-4,6+stride*3);ctx.moveTo(3,-1);ctx.lineTo(4,6-stride*3);ctx.stroke();
  ctx.fillStyle="#ed8469";ctx.strokeStyle="#b76a51";ctx.lineWidth=1.2;
  ctx.beginPath();ctx.roundRect(-7,-14,14,16,5);ctx.fill();ctx.stroke();
  ctx.fillStyle="#f6e0b3";ctx.fillRect(-6,-8,12,2);
  ctx.fillStyle="#ad8560";ctx.beginPath();ctx.roundRect(-7,-12,5,9,2);ctx.fill();
  ctx.strokeStyle="#eebf93";ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(-8,-11);ctx.lineTo(-11,-4+stride*2);ctx.moveTo(8,-11);ctx.lineTo(11,-4-stride*2);ctx.stroke();
  const look=Math.cos(p.angle)*1.5;
  ctx.fillStyle="#efc395";ctx.beginPath();ctx.arc(look,-20,7.5,0,TAU);ctx.fill();
  ctx.fillStyle="#faf0cf";ctx.beginPath();ctx.roundRect(-9,-29,18,7,3);ctx.fill();
  ctx.fillStyle="#36596b";ctx.fillRect(-9,-24,18,2.5);
  ctx.fillStyle="#183f53";ctx.fillRect(look-3,-20,1.5,2);ctx.fillRect(look+2,-20,1.5,2);
  ctx.strokeStyle="#bb815e";ctx.lineWidth=1;ctx.beginPath();ctx.arc(look,-18,2.5,0,Math.PI);ctx.stroke();
  ctx.setTransform(g.A,0,0,g.A,g.tx,g.ty);
}
