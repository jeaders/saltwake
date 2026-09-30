import type { Game } from "./engine";
import type { Predator } from "./types";
import { SPECIES } from "./species";
import { REGIONS, WORLD_W, WORLD_H, isOnLand, makeCoast, nearestCoast } from "./world";
import { nearestPort } from "./ports";
import { TAU, rand, pick, angleDiff, clamp, segDist2 } from "./util";
import { audio } from "./audio";

export interface ThreatTrait { hp:number;damage:number;charge:number;windup:number; }
export const THREAT_TRAITS:Record<string,ThreatTrait>={
  shark:{hp:2,damage:14,charge:355,windup:1.2},greatwhite:{hp:4,damage:23,charge:405,windup:1.45},
  tigershark:{hp:3,damage:19,charge:380,windup:1.2},hammerhead:{hp:3,damage:17,charge:420,windup:1.2},
  mako:{hp:2,damage:16,charge:490,windup:1.3},stingray:{hp:2,damage:14,charge:330,windup:1.25},
  giantsquid:{hp:4,damage:21,charge:345,windup:1.45},angler:{hp:3,damage:18,charge:335,windup:1.4},
  orca:{hp:4,damage:18,charge:360,windup:1.6},
};

/** Timed wildlife encounters, not an endless stream of unavoidable bites. */
export class Threats {
  readonly g:Game;
  nextEncounter=28;
  defenseCd=0;
  pulse=0;
  private coast=makeCoast();
  constructor(g:Game){this.g=g;}
  reset(){this.nextEncounter=28;this.defenseCd=0;this.pulse=0;}
  get danger(){return this.g.predators.find(p=>p.state===4||p.state===5)||this.g.predators.find(p=>p.state===1)||null;}
  get defenseRadius(){return 350+this.g.adventure.profile.upgrades.defense*130;}
  get defenseCooldown(){return 21-this.g.adventure.profile.upgrades.defense*3;}
  spawn(id:string,x:number,y:number):Predator|null {
    const g=this.g,sp=SPECIES[id];if(!sp?.predator||isOnLand(x,y))return null;
    const trait=THREAT_TRAITS[id]||THREAT_TRAITS.shark;
    const p:Predator={sp,x,y,vx:0,vy:0,ang:Math.atan2(g.boat.y-y,g.boat.x-x),scale:1,anim:Math.random(),hp:trait.hp,maxHp:trait.hp,state:0,t:0,flash:0,marked:0,wanderT:2,target:0,age:0,cooldown:2,attackX:g.boat.x,attackY:g.boat.y,windup:trait.windup};
    g.predators.push(p);return p;
  }
  spawnTick(dt:number){
    const g=this.g;this.defenseCd=Math.max(0,this.defenseCd-dt);this.pulse=Math.max(0,this.pulse-dt);
    this.nextEncounter-=dt;if(this.nextEncounter>0||g.runTime<22)return;
    const b=g.boat,reg=REGIONS[g.regionIdx];
    const cap=g.mode==="free"?1:Math.min(2,reg.danger);
    if(g.predators.length>=cap){this.nextEncounter=5;return;}
    // A quay or a narrow approach is a sanctuary, not a forced combat arena.
    if(nearestPort(b.x,b.y,220)||nearestCoast(b.x,b.y,110,this.coast)){this.nextEncounter=8;return;}
    const id=pick(reg.predators||[reg.predator]);
    for(let tries=0;tries<12;tries++){
      const angle=rand(0,TAU),r=rand(540,720);
      const x=((b.x+Math.cos(angle)*r)%WORLD_W+WORLD_W)%WORLD_W,y=b.y+Math.sin(angle)*r;
      if(y<100||y>WORLD_H-100||isOnLand(x,y)||nearestCoast(x,y,65,this.coast))continue;
      if(this.spawn(id,x,y)){
        this.nextEncounter=rand(38,58)*(g.adventure.baitT>0?.8:1);
        g.toast(`${SPECIES[id].name} nelle vicinanze · prepara la difesa`,"#ffb292");audio.warn();
        return;
      }
    }
    this.nextEncounter=6;
  }
  repel(){
    const g=this.g;if(g.phase!=="playing")return false;
    if(g.adventure.profile.upgrades.defense<1){g.toast("Installa il dissuasore al cantiere","#9edce8");return false;}
    if(this.defenseCd>0){g.toast(`Dissuasore pronto tra ${Math.ceil(this.defenseCd)}s`,"#9edce8");return false;}
    this.defenseCd=this.defenseCooldown;this.pulse=1;
    const b=g.boat;let count=0;
    for(const p of g.predators)if(Math.hypot(p.x-b.x,p.y-b.y)<this.defenseRadius){p.state=2;p.t=4;p.cooldown=8;p.flash=.4;count++;}
    g.particles.ring(b.x,b.y,8,this.defenseRadius,"rgba(158,233,239,.9)",1);
    g.particles.ring(b.x,b.y,5,this.defenseRadius*.85,"rgba(225,249,228,.6)",.85);
    g.particles.stars(b.x,b.y,"#bbf1ec",8,145);audio.sonar();
    g.toast(count?`${count} predatore${count>1?"i allontanati":" allontanato"}`:"Impulso difensivo emesso","#a9e7de");
    g.adventure.onChange?.();return true;
  }
  update(dt:number,live:boolean){
    const g=this.g,b=g.boat;
    for(let i=g.predators.length-1;i>=0;i--){
      const p=g.predators[i],trait=THREAT_TRAITS[p.sp.id]||THREAT_TRAITS.shark;
      p.age+=dt;p.t-=dt;p.cooldown=Math.max(0,p.cooldown-dt);p.flash=Math.max(0,p.flash-dt*3);p.marked=Math.max(0,p.marked-dt);
      let dx=b.x-p.x;if(dx>WORLD_W/2)dx-=WORLD_W;if(dx< -WORLD_W/2)dx+=WORLD_W;
      const dy=b.y-p.y,d=Math.hypot(dx,dy);
      if(d>g.viewR+1500||p.age>43){g.predators.splice(i,1);continue;}
      if(!live||p.age>32){if(p.state!==2){p.state=2;p.t=8;p.cooldown=10;}}
      let angle=p.ang,speed=p.sp.speed,turn=2.3;
      if(p.state===0){
        angle=Math.atan2(dy,dx)+Math.sin(p.age*.5)*.2;speed=p.sp.speed*.85;
        if(live&&p.cooldown<=0&&d<640)p.state=1;
      }else if(p.state===1){
        angle=Math.atan2(dy,dx);speed=p.sp.speed*1.65;
        if(d>1000){p.state=0;p.cooldown=2;}
        if(live&&p.cooldown<=0&&d<310){
          p.state=4;p.t=trait.windup;p.windup=trait.windup;
          p.attackX=b.x+b.vx*.55;p.attackY=b.y+b.vy*.55;
          p.target=Math.atan2(p.attackY-p.y,p.attackX-p.x);
          g.toast(`${p.sp.name} sta caricando! Cambia direzione`,"#ffbc8f");audio.warn();
        }
      }else if(p.state===4){
        angle=p.target;speed=p.sp.speed*.12;turn=6;
        if(p.t<=0){p.state=5;p.t=1.35;p.ang=p.target;p.vx=Math.cos(p.target)*trait.charge;p.vy=Math.sin(p.target)*trait.charge;g.particles.splash(p.x,p.y,8,.7);}
      }else if(p.state===5){
        angle=p.target;speed=trait.charge;turn=0;
        if(p.t<=0){p.state=2;p.t=3.7;p.cooldown=7;}
      }else if(p.state===2){
        angle=Math.atan2(-dy,-dx)+.2;speed=p.sp.speed*1.8;turn=3.5;
        if(p.t<=0&&p.age<30&&live){p.state=0;p.cooldown=Math.max(p.cooldown,2.5);}
      }else if(p.state===3){
        speed=0;if(p.t<=0){p.state=2;p.t=2.8;p.cooldown=5;}
      }
      const near=nearestCoast(p.x,p.y,80,this.coast);
      if(near){angle=Math.atan2(this.coast.ny,this.coast.nx);turn=5;if(p.state===4||p.state===5){p.state=2;p.t=3;p.cooldown=6;}}
      if(p.y<110)angle=Math.PI/2;if(p.y>WORLD_H-110)angle=-Math.PI/2;
      if(turn)p.ang+=clamp(angleDiff(p.ang,angle),-turn*dt,turn*dt);
      const k=p.state===5?1:Math.min(1,dt*5);
      p.vx+=(Math.cos(p.ang)*speed-p.vx)*k;p.vy+=(Math.sin(p.ang)*speed-p.vy)*k;
      const oldX=p.x,oldY=p.y;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(isOnLand(p.x,p.y)){p.x=oldX;p.y=oldY;p.state=2;p.t=3;p.cooldown=6;}
      const nose=p.sp.len*.34*p.scale;
      if(live&&p.state===5&&segDist2(b.x,b.y,oldX+Math.cos(p.ang)*nose,oldY+Math.sin(p.ang)*nose,p.x+Math.cos(p.ang)*nose,p.y+Math.sin(p.ang)*nose)<Math.pow(9+p.sp.wid*.3,2)){
        g.hurt(trait.damage,p.x,p.y);audio.bite();g.particles.splash(b.x,b.y,12,.9);
        p.state=2;p.t=4.2;p.cooldown=9;
      }
      p.x=((p.x%WORLD_W)+WORLD_W)%WORLD_W;
      p.anim+=dt*(.8+speed*.01);
    }
  }
}
