import type { ShipAppearance } from "./ship";
import { HULL_PAINTS, CABIN_PAINTS, FLAGS } from "./ship";
import type { UpgradeId } from "./upgrades";
import { TAU } from "./util";

export function shipHull(ctx:CanvasRenderingContext2D){
  ctx.beginPath();ctx.moveTo(38,0);ctx.bezierCurveTo(30,-8,16,-15,-6,-15);ctx.lineTo(-29,-14);ctx.quadraticCurveTo(-35,-14,-35,-8);ctx.lineTo(-35,8);ctx.quadraticCurveTo(-35,14,-29,14);ctx.lineTo(-6,15);ctx.bezierCurveTo(16,15,30,8,38,0);ctx.closePath();
}
/** Shared paint routine for the shipyard preview AND the actual boat in the world. */
export function paintShip(ctx:CanvasRenderingContext2D,ship:ShipAppearance,upgrades:Record<UpgradeId,number>,radar=0,recoil=0,flash=0){
  const hull=HULL_PAINTS[ship.hull],cabin=CABIN_PAINTS[ship.cabin],flag=FLAGS[ship.flag];
  ctx.lineJoin="round";ctx.lineCap="round";
  shipHull(ctx);ctx.fillStyle=hull.color;ctx.fill();ctx.strokeStyle=hull.edge;ctx.lineWidth=2.2;ctx.stroke();
  ctx.save();ctx.translate(-1,0);ctx.scale(.9,.76);shipHull(ctx);ctx.fillStyle="#fff0d0";ctx.fill();ctx.restore();
  ctx.save();ctx.translate(-1,0);ctx.scale(.8,.6);shipHull(ctx);ctx.fillStyle="#d6ae7d";ctx.fill();ctx.restore();
  ctx.strokeStyle="rgba(128,83,44,.22)";ctx.lineWidth=1;ctx.beginPath();for(let i=-1;i<=1;i++){ctx.moveTo(-28,i*4.5);ctx.lineTo(24-Math.abs(i)*10,i*4.5);}ctx.stroke();
  if(upgrades.hull){
    ctx.strokeStyle="#a7b3b1";ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(-27,-12);ctx.lineTo(4,-12);ctx.moveTo(-27,12);ctx.lineTo(4,12);ctx.stroke();
    ctx.fillStyle="#677f83";for(const y of [-12,12])for(const x of [-25,-15,-5]){ctx.beginPath();ctx.arc(x,y,.8,0,TAU);ctx.fill();}
  }
  ctx.fillStyle=upgrades.cargo?"#6dabb2":"#477b92";ctx.strokeStyle="#366270";ctx.lineWidth=1.2;
  ctx.beginPath();ctx.roundRect(-31,-7,12,14,2);ctx.fill();ctx.stroke();
  if(upgrades.cargo){ctx.strokeStyle="#e0f2db";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-25,-4);ctx.lineTo(-25,4);ctx.moveTo(-29,0);ctx.lineTo(-21,0);ctx.stroke();}
  else {ctx.fillStyle="#eabc70";ctx.beginPath();ctx.arc(-25,0,4.7,0,TAU);ctx.fill();ctx.strokeStyle="#b58943";ctx.beginPath();ctx.moveTo(-28,-2);ctx.lineTo(-22,2);ctx.moveTo(-28,2);ctx.lineTo(-22,-2);ctx.stroke();}
  const cabinW=ship.model==="cabin"?28:23,cabinH=ship.model==="cabin"?21:17;
  ctx.fillStyle=cabin.color;ctx.strokeStyle=cabin.edge;ctx.lineWidth=1.4;
  ctx.beginPath();ctx.roundRect(-16,-cabinH/2,cabinW,cabinH,3);ctx.fill();ctx.stroke();
  ctx.fillStyle="#84cbd7";ctx.beginPath();ctx.roundRect(-14,-cabinH/2+2,cabinW-6,cabinH-4,2);ctx.fill();
  ctx.fillStyle="#3c6d87";ctx.fillRect(-16+cabinW-3,-cabinH/2+2,2,cabinH-4);
  if(ship.model==="explorer"){
    ctx.fillStyle="#294d75";ctx.beginPath();ctx.roundRect(-13,-6,13,12,1.5);ctx.fill();
    ctx.strokeStyle="#83bad0";ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-9,-6);ctx.lineTo(-9,6);ctx.moveTo(-4.5,-6);ctx.lineTo(-4.5,6);ctx.moveTo(-13,0);ctx.lineTo(0,0);ctx.stroke();
  }
  if(upgrades.sonar){
    ctx.fillStyle="#f0efda";ctx.beginPath();ctx.arc(-5,0,4,0,TAU);ctx.fill();ctx.fillStyle="#7ad3d4";ctx.beginPath();ctx.arc(-5,0,2.3,0,TAU);ctx.fill();
    ctx.save();ctx.translate(-5,0);ctx.rotate(radar);ctx.strokeStyle="#c88f69";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(7,0);ctx.stroke();ctx.restore();
  }
  // A little mast and a clearly visible coloured pennant.
  ctx.strokeStyle="#eee5ca";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(6,-4);ctx.lineTo(6,-21);ctx.stroke();
  ctx.fillStyle=flag.color;ctx.beginPath();ctx.moveTo(6,-21);ctx.lineTo(18,-17);ctx.lineTo(6,-13);ctx.closePath();ctx.fill();
  ctx.fillStyle="#466477";ctx.beginPath();ctx.arc(23,0,4.8,0,TAU);ctx.fill();
  ctx.fillStyle=upgrades.harpoon?"#d3d7cd":"#849ba7";ctx.beginPath();ctx.roundRect(23-recoil*4,-1.7,12,3.4,1);ctx.fill();
  if(upgrades.harpoon>1){ctx.fillStyle="#f2bf7c";ctx.fillRect(31-recoil*4,-2.8,3,5.6);}
  if(upgrades.defense){
    ctx.fillStyle="#91cfd3";ctx.strokeStyle="#3d7e89";ctx.lineWidth=1;
    for(const side of [-1,1]){ctx.beginPath();ctx.roundRect(10,side>0?8:-12,6,4,1.5);ctx.fill();ctx.stroke();}
  }
  if(upgrades.repair){ctx.fillStyle="#8aba97";ctx.beginPath();ctx.roundRect(-18,9,7,4,1);ctx.fill();}
  if(upgrades.engine>0){ctx.fillStyle="#526874";ctx.beginPath();ctx.roundRect(-39,-4,5,8,1.5);ctx.fill();}
  ctx.fillStyle="#eb675a";ctx.beginPath();ctx.arc(16,-11.8,1.7,0,TAU);ctx.fill();ctx.fillStyle="#8ddc9d";ctx.beginPath();ctx.arc(16,11.8,1.7,0,TAU);ctx.fill();
  if(flash>0){shipHull(ctx);ctx.fillStyle=`rgba(255,255,255,${flash*.75})`;ctx.fill();}
}
