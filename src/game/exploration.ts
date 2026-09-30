import type { Game } from "./engine";
import type { Phase } from "./types";
import { C } from "./types";
import { audio } from "./audio";
import { DockSite, PORTS, coastalSite, nearestPort } from "./ports";
import { REGIONS, WORLD_H, WORLD_W, isOnLand, makeCoast, nearestCoast, shorePoint } from "./world";
import { PK } from "./particles";
import { weightedPick } from "./species";
import { clamp, damp, hash2, rand } from "./util";
import { projectSaved, readVoyage, saveVoyage, VoyageSave } from "./voyage";

export type PoiKind = "port" | "camp" | "treasure" | "ruins" | "lookout";
export interface LandPoi { id: string; kind: PoiKind; x: number; y: number; name: string; reward: number; site?: DockSite; }
export interface Waypoint { x: number; y: number; name: string; }
export const POI_LABELS: Record<PoiKind,string> = { port:"Borgo dei pescatori", camp:"Accampamento", treasure:"Forziere sulla spiaggia", ruins:"Rovine dei navigatori", lookout:"Faro panoramico" };
export const POI_COLORS: Record<PoiKind,string> = { port:"#ffb59a", camp:"#ade5bf", treasure:"#f8d886", ruins:"#dbc3f4", lookout:"#9fe5eb" };
const POI_CELL = 520;

/** A real land avatar on the same continuous world as the fishing boat. */
export class Exploration {
  readonly g: Game;
  onFoot = false;
  person = { x: 0, y: 0, vx: 0, vy: 0, angle: Math.PI / 2, stride: 0, stamina: 1, running: false };
  coast = makeCoast();
  launch: { x: number; y: number; angle: number } | null = null;
  waypoint: Waypoint | null = null;
  walkTarget: { x: number; y: number } | null = null;
  nearest: LandPoi | null = null;
  visible: LandPoi[] = [];
  trail: {x:number;y:number}[] = [];
  distanceWalked = 0;
  message = "";
  private cellCache = new Map<string, LandPoi[]>();
  private localPois: LandPoi[] = [];
  private landingSite: DockSite | null = null;
  private atlasReturn: Phase = "playing";
  private movement = {x:0,y:0};
  private trailT = 0;
  private sampleT = 0;
  private saveT = 0;
  private uiT = 0;
  private stuckT = 0;
  private clickedPoi: string | null = null;
  private tired = false;
  /** Shore fishing: 0 idle, 1 waiting for a bite, 2 bite (reel now!). */
  fishing = { phase: 0 as 0 | 1 | 2, t: 0, wait: 0, x: 0, y: 0 };

  constructor(g: Game) { this.g = g; }
  get discoveries() { return this.g.adventure.profile.landmarks.length; }
  get focus() { return this.onFoot ? this.person : this.g.boat; }
  get portNearby() { return this.visible.find(p=>p.kind==="port"&&Math.hypot(p.x-this.person.x,p.y-this.person.y)<100) || null; }
  get goalDistance() {const p=this.focus;if(!this.waypoint)return 0;let dx=Math.abs(this.waypoint.x-p.x);dx=Math.min(dx,WORLD_W-dx);return Math.hypot(dx,this.waypoint.y-p.y);}
  reset() {
    this.onFoot=false;this.launch=null;this.waypoint=null;this.walkTarget=null;this.fishing.phase=0;
    this.visible=[];this.localPois=[];this.trail=[];this.nearest=null;this.landingSite=null;
    this.person.x=this.g.boat?.x || 0;this.person.y=this.g.boat?.y || 0;
    this.person.vx=this.person.vy=0;this.person.stamina=1;this.distanceWalked=0;
  }
  notify(message?:string) {
    if(message) { this.message=message;this.g.toast(message,"#f4d892"); }
    this.g.adventure.changed();
  }
  setWaypoint(x:number,y:number,name="Destinazione scelta") {
    this.waypoint={x:((x%WORLD_W)+WORLD_W)%WORLD_W,y:clamp(y,20,WORLD_H-20),name};
    this.g.adventure.changed();saveVoyage(this.g);
  }
  clearWaypoint() {this.waypoint=null;this.g.cruising=false;this.g.adventure.onChange?.();saveVoyage(this.g);}
  atlas() {
    const g=this.g;
    if(g.phase==="atlas") {this.closeAtlas();return;}
    if(!["playing","walking","docked","paused"].includes(g.phase))return;
    this.atlasReturn=g.phase;g.input.releaseAll();g.phase="atlas";audio.duck(true);g.onPhase?.("atlas");saveVoyage(g);
  }
  closeAtlas() {
    const g=this.g;if(g.phase!=="atlas")return;
    g.phase=this.atlasReturn;g.input.releaseAll();audio.duck(g.phase==="docked"||g.phase==="paused");g.onPhase?.(g.phase);
  }
  tickSea(dt:number) {
    this.saveT+=dt;this.uiT-=dt;
    if(this.saveT>8){this.saveT=0;saveVoyage(this.g);}
    if(this.waypoint && this.goalDistance<65) {const name=this.waypoint.name;this.clearWaypoint();this.notify(`Destinazione raggiunta · ${name}`);audio.discover();}
  }

  /** From a harbor, or immediately after a voluntary disembark, enter the world on foot. */
  walk() {
    const g=this.g,site=g.adventure.site;
    if(g.phase!=="docked"||!site)return false;
    if(this.onFoot) {this.resumeWalking();return true;}
    const c=makeCoast();
    c.found=true;c.x=site.shoreX;c.y=site.shoreY;c.nx=site.nx;c.ny=site.ny;
    let p=shorePoint(c,true,35);
    if(!p){nearestCoast(g.boat.x,g.boat.y,400,c);p=shorePoint(c,true,25);}
    if(!p){this.notify("Questa scogliera non ha una spiaggia accessibile. Prova un’altra costa.");return false;}
    this.onFoot=true;this.person.x=p.x;this.person.y=p.y;this.person.vx=this.person.vy=0;
    this.person.angle=Math.atan2(-site.ny,-site.nx);this.person.stamina=1;
    this.landingSite=site;this.trail=[{...p}];this.walkTarget=null;
    this.seedLanding(site,p.x,p.y);
    this.resumeWalking();this.scan();
    this.g.showBanner("IL VIAGGIO CONTINUA A TERRA", "Cammina liberamente · E per salpare da una nuova costa", "#f4d892", 2.4);
    saveVoyage(g);return true;
  }
  resumeWalking() {
    const g=this.g;g.phase="walking";g.input.releaseAll();g.cruising=false;audio.duck(false);
    g.cam.x=this.person.x;g.cam.y=this.person.y;g.camPunch=0;g.onPhase?.("walking");g.adventure.onChange?.();
  }

  private seedLanding(site:DockSite,x:number,y:number) {
    this.localPois=[];
    const placements: [PoiKind,number,number][] = [["port",100,25],["camp",185,-100],["treasure",250,125],["lookout",380,0]];
    for(const [kind,depth,side] of placements) {
      let px=x-site.nx*depth-site.ny*side,py=y-site.ny*depth+site.nx*side;
      if(!isOnLand(px,py)) {
        let found=false;
        for(let i=0;i<20;i++) {
          const a=i*Math.PI/10,d=depth*.65;
          px=x+Math.cos(a)*d;py=y+Math.sin(a)*d;
          if(isOnLand(px,py)){found=true;break;}
        }
        if(!found)continue;
      }
      this.localPois.push({id:`shore-${site.id}-${kind}`,kind,x:px,y:py,name:kind==="port"?site.name:POI_LABELS[kind],reward:kind==="treasure"?90:kind==="lookout"?45:0,site:kind==="port"?site:undefined});
    }
  }
  private cellPois(cx:number,cy:number):LandPoi[] {
    const key=`${cx}:${cy}`;let pois=this.cellCache.get(key);if(pois)return pois;
    pois=[];
    for(let i=0;i<2;i++) {
      if(hash2(cx,cy,74+i)>.54)continue;
      const x=(cx+.16+hash2(cx,cy,81+i)*.68)*POI_CELL;
      const y=(cy+.16+hash2(cx,cy,91+i)*.68)*POI_CELL;
      if(!isOnLand(x,y))continue;
      const kinds:PoiKind[]=["camp","treasure","lookout","ruins"];
      const kind=kinds[Math.floor(hash2(cx,cy,101+i)*kinds.length)];
      pois.push({id:`land-${cx}-${cy}-${i}`,kind,x,y,name:POI_LABELS[kind],reward:kind==="ruins"?140:kind==="treasure"?90:kind==="lookout"?45:0});
    }
    this.cellCache.set(key,pois);
    if(this.cellCache.size>160){const old=this.cellCache.keys().next().value;if(old)this.cellCache.delete(old);}
    return pois;
  }
  scan() {
    const p=this.person;
    const range=Math.max(760,Math.min(1350,this.g.viewR));
    this.visible=[...this.localPois.filter(v=>Math.hypot(v.x-p.x,v.y-p.y)<range)];
    for(let cy=Math.floor((p.y-range)/POI_CELL);cy<=Math.floor((p.y+range)/POI_CELL);cy++)
      for(let cx=Math.floor((p.x-range)/POI_CELL);cx<=Math.floor((p.x+range)/POI_CELL);cx++)this.visible.push(...this.cellPois(cx,cy));
    for(const site of PORTS) {
      const x=site.shoreX-site.nx*85,y=site.shoreY-site.ny*85;
      if(Math.hypot(x-p.x,y-p.y)<range&&isOnLand(x,y)&&!this.visible.some(v=>v.site?.id===site.id))this.visible.push({id:`port-${site.id}`,kind:"port",x,y,name:site.name,reward:0,site});
    }
    this.nearest=null;let best=65;
    for(const v of this.visible){const d=Math.hypot(p.x-v.x,p.y-v.y);if(d<best){best=d;this.nearest=v;}}
    this.launch=null;
    if(nearestCoast(p.x,p.y,58,this.coast)&&this.coast.inside&&this.coast.distance<58){
      const q=shorePoint(this.coast,false,24);
      if(q) {const check=makeCoast();if(!nearestCoast(q.x,q.y,C.BOAT_R+1,check)||!check.inside&&check.distance>=C.BOAT_R)this.launch={...q,angle:Math.atan2(this.coast.ny,this.coast.nx)};}
    }
  }
  update(dt:number) {
    const g=this.g,p=this.person,mv=this.movement;g.input.getMove(mv);
    if(mv.x||mv.y){this.walkTarget=null;this.clickedPoi=null;}
    else if(this.walkTarget) {
      const dx=this.walkTarget.x-p.x,dy=this.walkTarget.y-p.y,d=Math.hypot(dx,dy);
      if(d<5){this.walkTarget=null;if(this.clickedPoi){this.scan();this.clickedPoi=null;this.interact();}}else {mv.x=dx/d;mv.y=dy/d;}
    }
    const active=Math.hypot(mv.x,mv.y)>.05;
    if(this.tired&&p.stamina>.3)this.tired=false;
    p.running=active&&g.input.boostHeld()&&!this.tired&&p.stamina>.05;
    p.stamina=clamp(p.stamina+dt*(p.running?-.13/(1+g.adventure.profile.upgrades.boots*.3):.25),0,1);
    if(p.stamina<.04){g.input.boostLatch=false;this.tired=true;}
    const speed=(p.running?250:135)*(1+g.adventure.profile.upgrades.boots*.1);
    p.vx=damp(p.vx,mv.x*speed,14,dt);p.vy=damp(p.vy,mv.y*speed,14,dt);
    const dx=p.vx*dt,dy=p.vy*dt,oldX=p.x,oldY=p.y;
    // Never jump across water, even on a slow frame. Axis sliding allows following beaches.
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
    for(let i=0;i<steps;i++){
      const sx=dx/steps,sy=dy/steps;
      if(isOnLand(p.x+sx,p.y+sy)){p.x+=sx;p.y+=sy;}
      else {if(isOnLand(p.x+sx,p.y))p.x+=sx;if(isOnLand(p.x,p.y+sy))p.y+=sy;}
    }
    if(p.x<0){p.x+=WORLD_W;g.cam.x+=WORLD_W;}else if(p.x>=WORLD_W){p.x-=WORLD_W;g.cam.x-=WORLD_W;}
    p.y=clamp(p.y,12,WORLD_H-12);
    const walked=Math.hypot(p.x-oldX,p.y-oldY);
    this.distanceWalked+=walked;
    if(p.running&&walked>.5&&Math.random()<dt*24)g.particles.spawn(PK.Dot,p.x-Math.cos(p.angle)*6,p.y+6,rand(-22,22),rand(-18,-4),.42,3.2,"rgba(238,224,178,.85)",1,3,2.5);
    this.tickFishing(dt);
    if(walked>.1){p.angle=Math.atan2(p.vy,p.vx);p.stride+=walked*.1;this.stuckT=0;}
    else if(this.walkTarget){this.stuckT+=dt;if(this.stuckT>.5){this.walkTarget=null;this.stuckT=0;g.toast("C’è acqua davanti: segui la costa", "#f4d892");}}
    this.trailT+=dt;this.sampleT-=dt;this.saveT+=dt;this.uiT-=dt;
    if(this.trailT>.24&&walked>.1){this.trailT=0;this.trail.push({x:p.x,y:p.y});if(this.trail.length>180)this.trail.shift();}
    if(this.sampleT<=0){this.sampleT=.12;this.scan();}
    if(this.uiT<=0){this.uiT=.25;g.adventure.onChange?.();}
    if(this.saveT>8){this.saveT=0;saveVoyage(g);}
  }
  click(x:number,y:number) {
    if(!this.onFoot||this.g.phase!=="walking")return;
    const poi=this.visible.find(v=>Math.hypot(v.x-x,v.y-y)<40);
    if(poi){this.walkTarget={x:poi.x,y:poi.y};this.clickedPoi=poi.id;}
    else if(isOnLand(x,y)){this.walkTarget={x,y};this.clickedPoi=null;}
    else this.castLine(x,y);
  }
  launchBoat() {
    const g=this.g;
    if(g.phase!=="walking")return;
    this.scan();
    if(!this.launch){this.notify("Raggiungi una spiaggia: qui sei troppo lontano dall’acqua.");return;}
    const point={...this.launch};
    this.fishing.phase=0;
    this.onFoot=false;this.walkTarget=null;
    g.relocate(point.x,point.y);g.boat.ang=point.angle;g.boat.vx=Math.cos(point.angle)*45;g.boat.vy=Math.sin(point.angle)*45;
    g.boat.invuln=2;g.phase="playing";g.input.releaseAll();g.adventure.grace=3;g.adventure.canDock=false;
    audio.start();audio.duck(false);g.onPhase?.("playing");g.toast("Nuova costa, nuovo orizzonte. Buon vento!", "#9fe5eb");saveVoyage(g);
  }
  interact() {
    if(this.g.phase!=="walking")return;
    if(this.fishing.phase===2){this.castLine();return;}
    this.scan();const v=this.nearest;if(!v){this.notify("Avvicinati a un punto d’interesse e premi SPAZIO.");return;}
    const g=this.g,a=g.adventure,p=a.profile;
    if(v.kind==="port") {
      a.site=v.site||this.landingSite;
      if(!a.site){const c=makeCoast();nearestCoast(this.person.x,this.person.y,150,c);a.site=coastalSite(this.person.x,this.person.y,c);}
      if(!a.site)return;
      a.message="Il tuo personaggio ti aspetta fuori. Quando vuoi, torna a esplorare.";
      g.input.releaseAll();g.phase="docked";audio.duck(true);g.onPhase?.("docked");a.changed();return;
    }
    if(v.kind==="camp") {
      this.person.stamina=1;g.boat.hull=Math.min(100,g.boat.hull+25);g.boat.energy=1;
      this.notify("Una sosta al campo · energia piena e +25% scafo");audio.pickup();return;
    }
    if(p.landmarks.includes(v.id)){this.notify("Hai già esplorato questo luogo. Il prossimo orizzonte ti aspetta.");return;}
    p.landmarks.push(v.id);p.coins+=v.reward;
    if(v.kind==="treasure")p.bait=Math.min(99,p.bait+2);
    if(v.kind==="lookout")g.minimap.reveal(this.person.x,this.person.y,9000);
    g.score+=v.reward*3;audio.discover();g.particles.stars(v.x,v.y,"#ffe19b",15,130);
    this.notify(`${v.name} esplorato · +${v.reward} monete${v.kind==="treasure"?" e 2 pastura":""}`);saveVoyage(g);
  }
  /** F / Pesca: cast toward the water, wait for the bite, then press again to reel in. */
  castLine(tx?: number, ty?: number) {
    const g=this.g,f=this.fishing,p=this.person;
    if(g.phase!=="walking")return;
    if(f.phase===1){this.cancelLine("Troppo presto! Aspetta il segnale");return;}
    if(f.phase===2){this.reelIn();return;}
    const base=tx===undefined||ty===undefined?p.angle:Math.atan2(ty-p.y,tx-p.x);
    let spot:{x:number;y:number}|null=null;
    for(const off of [0,.5,-.5,1,-1,1.6,-1.6,2.3,-2.3,Math.PI]){
      const a=base+off,cx=Math.cos(a),cy=Math.sin(a);
      for(let d=30;d<=150&&!spot;d+=8){
        if(!isOnLand(p.x+cx*d,p.y+cy*d)){
          let e=d;while(e<d+26&&!isOnLand(p.x+cx*(e+6),p.y+cy*(e+6)))e+=6;
          spot={x:p.x+cx*e,y:p.y+cy*e};
        }
      }
      if(spot)break;
    }
    if(!spot){g.toast("Avvicinati all'acqua per lanciare la lenza","#f4d892");return;}
    f.phase=1;f.t=0;f.wait=rand(1.8,4.8)/(1+g.adventure.profile.upgrades.rod*.2);f.x=spot.x;f.y=spot.y;
    p.angle=Math.atan2(spot.y-p.y,spot.x-p.x);
    g.particles.splash(spot.x,spot.y,6,.55);audio.splash(.45);
    g.toast("Lenza in acqua · aspetta il segnale","#9fe5eb");
    g.adventure.onChange?.();
  }
  private cancelLine(message: string) {
    this.fishing.phase=0;this.g.toast(message,"#f4d892");this.g.adventure.onChange?.();
  }
  private tickFishing(dt: number) {
    const g=this.g,f=this.fishing,p=this.person;
    if(!f.phase)return;
    if(Math.hypot(f.x-p.x,f.y-p.y)>210){this.cancelLine("La lenza si è spezzata: sei troppo lontano");return;}
    f.t+=dt;
    if(f.phase===1){
      if(f.t>=f.wait){
        f.phase=2;f.t=0;audio.warn();
        g.particles.ring(f.x,f.y,4,38,"rgba(255,255,255,.9)",.5);
        g.adventure.onChange?.();
      }else if(Math.random()<dt*2.2)g.particles.ring(f.x,f.y,2,13,"rgba(255,255,255,.4)",.9);
    }else if(f.t>1.15+g.adventure.profile.upgrades.rod*.25)this.cancelLine("Il pesce è scappato! Riprova");
  }
  private reelIn() {
    const g=this.g,f=this.fishing;
    const sp=weightedPick(REGIONS[g.regionIdx].fish,true);
    f.phase=0;
    g.particles.splash(f.x,f.y,14,1.1);audio.splash(1);
    g.awardCatch(sp,f.x,f.y,1.25,false,"DALLA RIVA ×1.25");
    if(sp.protected)g.toast(`${sp.name}: specie protetta, registrata e rilasciata`,"#a2eab1");
    g.adventure.onChange?.();
  }
  guideToBoat() { this.setWaypoint(this.g.boat.x,this.g.boat.y,"La tua barca");this.notify("La bussola indica la barca. Puoi anche salpare da un’altra spiaggia."); }
  restore(s: VoyageSave | null = readVoyage()) {
    if(!s)return false;
    const g=this.g,boat=projectSaved(s.boat),person=projectSaved(s.person);
    g.relocate(boat.x,boat.y);g.boat.ang=s.boat.angle;g.boat.hull=clamp(s.boat.hull,15,100);
    g.score=Math.max(0,s.score);g.hud.dispScore=g.score;g.caught=Math.max(0,s.fish);g.runTime=Math.max(0,s.runtime);
    g.discovered=g.discovered.map((_,i)=>!!s.seas[i]);g.seas=g.discovered.filter(Boolean).length;
    g.zoomLevel=clamp(s.zoom||1,.55,1.6);
    g.worldClock=clamp(s.clock??.35,0,.999);
    this.waypoint=s.waypoint?{...projectSaved(s.waypoint),name:s.waypoint.name}:null;
    if(s.walking&&isOnLand(person.x,person.y)) {
      this.onFoot=true;this.person={...this.person,...person,angle:s.person.angle,vx:0,vy:0,stamina:1};
      const c=makeCoast();nearestCoast(boat.x,boat.y,200,c);
      this.landingSite=nearestPort(boat.x,boat.y,180)||coastalSite(boat.x,boat.y,c);
      g.adventure.site=this.landingSite;
      if(this.landingSite){
        const site=this.landingSite,c=makeCoast();c.found=true;c.x=site.shoreX;c.y=site.shoreY;c.nx=site.nx;c.ny=site.ny;
        const original=shorePoint(c,true,35)||person;
        this.seedLanding(site,original.x,original.y);
      }
      this.resumeWalking();this.scan();
    }
    this.notify("Viaggio ripreso. Bentornato, capitano.");saveVoyage(g);return true;
  }
}
