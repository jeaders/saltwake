import { TAU, angleDiff, clamp, damp, easeOutCubic, rand, randInt, segDist2 } from "./util";
import { Particles, PK } from "./particles";
import { Input } from "./input";
import { audio } from "./audio";
import { SPECIES, Species, weightedPick } from "./species";
import { MiniMap } from "./minimap";
import { Adventure } from "./adventure";
import { Exploration } from "./exploration";
import { Companions } from "./companions";
import { Threats } from "./threats";
import { GameMode, readVoyage, saveVoyage } from "./voyage";
import { PORTS } from "./ports";
import {
  REGIONS,
  REGION_COUNT,
  START,
  WORLD_H,
  WORLD_W,
  islandPush,
  isOnLand,
  nearestCoast,
  makeCoast,
  regionField,
  waterColor,
} from "./world";
import { addScore, bestScore, getName, ScoreEntry } from "./storage";
import {
  Boat,
  C,
  Crate,
  CrateKind,
  Fish,
  Flyer,
  HarpoonObj,
  NetObj,
  Phase,
  Popup,
  Predator,
  RunSummary,
  School,
  SonarPing,
  Strike,
} from "./types";
import { computeLayout, renderHud } from "./hud";
import { renderWorld } from "./render";

export type { Phase, RunSummary } from "./types";

const TIER_COLOR = ["", "#ffffff", "#ffe58a", "#ffb066"];

function swapRemove<T>(arr: T[], i: number) {
  const last = arr.pop() as T;
  if (i < arr.length) arr[i] = last;
}

export interface Toast {
  text: string;
  color: string;
  t: number;
  dur: number;
}
export interface Banner {
  title: string;
  sub: string;
  color: string;
  t: number;
  dur: number;
}

export class Game {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly input: Input;
  readonly particles = new Particles();
  readonly minimap = new MiniMap();
  readonly adventure = new Adventure(this);
  readonly exploration = new Exploration(this);
  readonly companions = new Companions();
  readonly threats = new Threats(this);
  private lastDamageAt = -10;
  /** 0..1 over one in-game day (0 = midnight). Free voyages only. */
  worldClock = 0.35;
  sun = 1;
  night = 0;
  twilight = 0;
  private wasNight = false;
  get clockText() {
    const mins = Math.floor(this.worldClock * 1440 / 10) * 10;
    return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  private advanceClock(dt: number) {
    this.worldClock = (this.worldClock + dt / 360) % 1;
    const s = Math.sin((this.worldClock - 0.25) * TAU);
    this.sun = s;
    const k = clamp((0.05 - s) / 0.5, 0, 1);
    this.night = k * k * (3 - 2 * k);
    this.twilight = Math.max(0, 1 - Math.abs(s) / 0.24) * (1 - this.night * 0.5);
    const isNight = this.night > 0.5;
    if (isNight !== this.wasNight) {
      this.wasNight = isNight;
      this.toast(isNight ? "Scende la notte · i pesci luminosi valgono +25%" : "Alba · una nuova giornata di pesca", "#9fe5eb");
    }
  }
  mode: GameMode = "free";
  zoomLevel = 1;
  cruising = false;
  precision = false;
  private pauseReturn: "playing" | "walking" = "playing";
  get focus() { return this.exploration.focus; }
  private fishCoast = makeCoast();
  private boatCoast = makeCoast();

  get netRadius() { return C.NET_R * (1 + this.adventure.profile.upgrades.net * 0.2); }
  get netCooldown() { return C.NET_CD - this.adventure.profile.upgrades.net * 0.15; }
  get sonarCooldown() { return C.SONAR_CD - this.adventure.profile.upgrades.sonar * 1.3; }
  get sonarRadius() { return C.SONAR_R * (1+this.adventure.profile.upgrades.sonar*.2); }
  get harpoonDamage() { return 1+this.adventure.profile.upgrades.harpoon; }
  get harpoonRange() { return C.HARP_RANGE*(1+this.adventure.profile.upgrades.harpoon*.15); }
  get engineMultiplier() { return 1+this.adventure.profile.upgrades.engine*.12; }

  // ---- view -------------------------------------------------------------
  W = 800;
  H = 600;
  dpr = 1;
  dprCap = 2;
  private resolutionScale = 1;
  viewScale = 1;
  ui = 1;
  S = 1;
  A = 1;
  tx = 0;
  ty = 0;
  shakeX = 0;
  shakeY = 0;
  cam = { x: START.x, y: START.y, zoom: 1 };
  camPunch = 0;
  zoomIntro = 0;
  viewR = 900;
  weights: number[] = new Array(REGION_COUNT).fill(0);
  waterRGB: [number, number, number] = [60, 200, 206];

  // ---- state ------------------------------------------------------------
  phase: Phase = "menu";
  onPhase: ((p: Phase) => void) | null = null;
  onOver: ((s: RunSummary) => void) | null = null;
  t = 0;
  runTime = 0;
  timeLeft: number = C.START_TIME;
  score = 0;
  caught = 0;
  combo = 0;
  comboT = 0;
  comboMult = 1;
  bestCombo = 0;
  frenzyT = 0;
  biggestVal = 0;
  biggestName = "—";
  seas = 1;
  distance = 0;
  netsThrown = 0;
  harpoonsFired = 0;
  discovered: boolean[] = new Array(REGION_COUNT).fill(false);
  regionIdx = 0;
  reason: "night" | "wreck" = "night";
  best = bestScore();

  boat!: Boat;
  schools: School[] = [];
  predators: Predator[] = [];
  crates: Crate[] = [];
  nets: NetObj[] = [];
  harpoon: HarpoonObj | null = null;
  flyers: Flyer[] = [];
  strikes: Strike[] = [];
  popups: Popup[] = [];
  sonars: SonarPing[] = [];

  // aim helpers (also used by renderer for reticles)
  netAim = { x: 0, y: 0, count: 0, assist: false, show: false };
  lock = { x: 0, y: 0, tx: 0, ty: 0, sp: null as Species | null, valid: false, t: 0 };

  hud = {
    scorePunch: 0,
    comboPunch: 0,
    hullFlash: 0,
    timeFlash: 0,
    redFlash: 0,
    whiteFlash: 0,
    dispScore: 0,
    toast: null as Toast | null,
    banner: null as Banner | null,
    tip: "",
    tipA: 0,
    ready: { net: 0, harpoon: 0, sonar: 0, boost: 0 },
  };

  // ---- private ----------------------------------------------------------
  private trauma = 0;
  private hitstop = 0;
  private dyingT = 0;
  private last = 0;
  private raf = 0;
  private destroyed = false;
  private ro: ResizeObserver;
  private mv = { x: 0, y: 0 };
  private pushV = { x: 0, y: 0 };
  private tmpW: number[] = new Array(REGION_COUNT).fill(0);
  private bw: number[] = new Array(REGION_COUNT).fill(0);
  private buf = { net: 0, harpoon: 0, sonar: 0 };
  private spawnT = 0;
  private crateT = 9;
  private strikeT = 5;
  private demoA = 0;
  private lastSec = 99;
  private lastTouch = false;
  private mapT = 0;
  private tipStage = 0;
  private tipT = 0;
  private sonarFound = 0;
  private lockScore = 0;
  private frameEma = 1 / 60;
  private perfT = 0;
  private quality = 2;
  private lastRenderedPhase: Phase | "" = "";
  private canvasDirty = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    this.input = new Input(canvas, coarse);
    this.lastTouch = coarse;
    this.input.onGesture = () => audio.unlock();
    this.input.onZoom = delta => this.changeZoom(delta);
    this.input.onWorldClick = (x,y) => {
      if(this.phase==="walking") this.exploration.click((x-this.W/2-this.shakeX)/this.S+this.cam.x,(y-this.H/2-this.shakeY)/this.S+this.cam.y);
    };
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    document.addEventListener("visibilitychange", this.onVis);
    window.addEventListener("blur", this.onBlur);
    this.resetWorld();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
    window.removeEventListener("blur", this.onBlur);
    this.input.destroy();
    this.adventure.flush();
    saveVoyage(this);
  }

  private onVis = () => {
    if (document.hidden) this.pause();
  };
  private onBlur = () => {
    this.pause();
  };

  // ------------------------------------------------------------ sizing
  resize() {
    this.canvasDirty = true;
    const r = this.canvas.getBoundingClientRect();
    this.W = Math.max(280, r.width);
    this.H = Math.max(240, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap) * this.resolutionScale;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
    this.viewScale = clamp(Math.min(this.W / 660, this.H / 600), 0.5, 2.2);
    this.ui = clamp(Math.min(this.W, this.H) / 560, 0.8, 1.2);
    this.viewR = Math.hypot(this.W, this.H) / (2 * this.viewScale * 0.82 * this.zoomLevel) + 70;
    this.input.W = this.W;
    this.input.H = this.H;
    this.input.ui = this.ui;
    this.relayout();
  }

  private relayout() {
    this.input.layout = computeLayout(this.W, this.H, this.input.touchMode, this.ui);
    if(this.exploration.onFoot) this.input.layout.buttons=this.input.layout.buttons.filter(b=>b.id==="pause"||b.id==="mute");
  }

  // ---------------------------------------------------------- lifecycle
  start(mode: GameMode = this.mode) {
    this.mode = mode;
    this.worldClock = 0.35;
    this.wasNight = false;
    this.night = 0;
    this.twilight = 0;
    this.exploration.reset();
    this.cruising=false;this.precision=false;
    audio.unlock();
    audio.duck(false);
    audio.silent = false;
    audio.start();
    this.adventure.reset();
    this.resetWorld();
    this.input.releaseAll();
    this.score = 0;
    this.caught = 0;
    this.combo = 0;
    this.comboT = 0;
    this.comboMult = 1;
    this.bestCombo = 0;
    this.frenzyT = 0;
    this.biggestVal = 0;
    this.biggestName = "—";
    this.seas = 1;
    this.distance = 0;
    this.netsThrown = 0;
    this.harpoonsFired = 0;
    this.runTime = 0;
    this.timeLeft = C.START_TIME;
    this.discovered.fill(false);
    this.regionIdx = 0;
    this.discovered[0] = true;
    this.tipStage = 0;
    this.tipT = 0;
    this.lastSec = 99;
    this.threats.reset();
    this.lastDamageAt=-10;
    this.crateT = 9;
    this.strikeT = 5;
    this.best = bestScore();
    this.hud.dispScore = 0;
    this.zoomIntro = 0.3;
    this.input.clearPressed();
    this.buf.net = this.buf.harpoon = this.buf.sonar = 0;
    this.starterSetup();
    // The menu boat slowly cruises in circles. Never inherit that demo heading:
    // the first cast should face the calm school in the open water to starboard.
    this.boat.ang = 0.48;
    this.boat.vx = this.boat.vy = 0;
    this.phase = "playing";
    this.onPhase?.("playing");
    this.exploration.setWaypoint(PORTS[0].x,PORTS[0].y,"Napoli · primo approdo");
    this.showBanner("BUON VENTO!", this.mode==="free"?"Nessun limite di tempo · naviga, sbarca, cammina":"Sfida a tempo · pesca e crea combo", "#ffd36b", 2.2);
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  restart() {
    this.start();
  }

  pause() {
    if (this.phase !== "playing" && this.phase !== "walking") return;
    this.pauseReturn=this.phase;
    saveVoyage(this);
    this.phase = "paused";
    this.input.releaseAll();
    audio.duck(true);
    this.onPhase?.("paused");
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = this.pauseReturn;
    audio.duck(false);
    this.input.releaseAll();
    this.onPhase?.(this.phase);
  }

  toMenu() {
    saveVoyage(this);
    this.exploration.reset();
    this.adventure.flush();
    this.adventure.reset();
    this.phase = "menu";
    audio.duck(false);
    this.resetWorld();
    this.input.clearPressed();
    this.onPhase?.("menu");
  }

  toggleMute() {
    audio.unlock();
    audio.setMuted(!audio.muted);
    return audio.muted;
  }

  private resetWorld() {
    this.particles.clear();
    this.schools.length = 0;
    this.predators.length = 0;
    this.crates.length = 0;
    this.nets.length = 0;
    this.harpoon = null;
    this.flyers.length = 0;
    this.strikes.length = 0;
    this.popups.length = 0;
    this.sonars.length = 0;
    this.hud.toast = null;
    this.hud.banner = null;
    this.hud.tip = "";
    this.hud.tipA = 0;
    this.hud.redFlash = 0;
    this.hud.whiteFlash = 0;
    this.trauma = 0;
    this.hitstop = 0;
    this.camPunch = 0;
    this.demoA = -0.4;
    this.boat = {
      x: START.x,
      y: START.y,
      vx: 0,
      vy: 0,
      ang: this.phase === "menu" ? this.demoA : 0,
      hull: C.HULL_MAX,
      invuln: 0,
      energy: 1,
      exhausted: false,
      boosting: false,
      boostIdle: 0,
      netCd: 0,
      harpCd: 0,
      sonarCd: 0,
      squash: 0,
      bank: 0,
      recoil: 0,
      flash: 0,
      wakeT: 0,
      smokeT: 0,
      sunk: 0,
      radar: 0,
    };
    this.cam.x = START.x + 120;
    this.cam.y = START.y;
    this.cam.zoom = 1;
    this.companions.reset();
    this.threats.reset();
    this.minimap.reset();
    // Give the player a big initial reveal around home so the world map reads
    // well as "planet Earth" right from the first frame.
    this.minimap.reveal(START.x, START.y, 4000);
    this.minimap.reveal(START.x, START.y, 1800);
    // initial ocean population, in view of the starting boat
    for (let i = 0; i < 80 && this.schools.length < 16; i++) {
      const a = rand(0, TAU);
      const r = rand(120, 500);
      this.trySpawnSchool(START.x + Math.cos(a) * r, START.y + Math.sin(a) * r);
    }
  }

  /** Guarantees something fun within the first seconds. */
  private starterSetup() {
    // drop random schools that happen to be too close to keep the starters clear
    for (let i = this.schools.length - 1; i >= 0; i--) {
      const s = this.schools[i];
      if (Math.hypot(s.x - START.x, s.y - START.y) < 260) swapRemove(this.schools, i);
    }
    const starter: [Species, number, number][] = [
      [SPECIES.sardine, 125, 65], [SPECIES.anchovy, -115, 150],
      [SPECIES.redmullet, -240, -55], [SPECIES.seabream, -200, 160],
      [SPECIES.squid, -80, 240],
    ];
    for (const [sp, dx, dy] of starter) {
      let x = START.x + dx, y = START.y + dy;
      if (this.badSpot(x, y, 60)) { x = START.x - Math.abs(dx) - 70; y = START.y + 120; }
      if (!isOnLand(x, y)) this.spawnSchool(sp, x, y, 12);
    }
    this.crates.push({ x: START.x - 80, y: START.y + 5, kind: "time", t: 0, life: 60 });
  }

  /** Lets a player recover from picking the wrong mode on the start screen. */
  switchMode(mode: GameMode) {
    if (mode === this.mode || !["playing", "walking", "paused"].includes(this.phase)) return;
    this.mode = mode;
    if (mode === "challenge") {
      this.timeLeft = C.START_TIME;
      this.lastSec = 99;
      this.score = 0; this.hud.dispScore = 0;
      this.caught = 0; this.combo = 0; this.comboT = 0; this.comboMult = 1; this.bestCombo = 0;
      this.night = 0; this.twilight = 0;
      this.toast("Sfida a tempo · punteggio azzerato, classifica attiva", "#ffd36b");
    } else {
      this.wasNight = false;
      this.toast("Viaggio libero · nessun timer, niente fretta", "#9fe5eb");
    }
    this.adventure.onChange?.();
  }

  changeZoom(delta: number) {
    if(!["playing","walking"].includes(this.phase))return;
    this.zoomLevel=clamp(this.zoomLevel+delta*.15,.55,1.6);
    this.viewR=Math.hypot(this.W,this.H)/(2*this.viewScale*.82*this.zoomLevel)+70;
    this.adventure.onChange?.();
  }
  continueVoyage() { const saved=readVoyage();this.start("free");this.exploration.restore(saved); }
  toggleCruise() {
    if(this.phase!=="playing")return;
    this.cruising=!this.cruising;if(this.cruising)this.precision=false;
    this.toast(this.cruising?"Crociera attivata · Q per fermare · governa con WASD":"Crociera disattivata","#9fe5eb");
    this.adventure.onChange?.();
  }
  togglePrecision() {
    if(this.phase!=="playing")return;
    this.precision=!this.precision;if(this.precision)this.cruising=false;
    this.toast(this.precision?"Manovra lenta · controllo preciso negli stretti":"Velocità normale","#f4d892");
    this.adventure.onChange?.();
  }

  // --------------------------------------------------------------- loop
  private frame = (ts: number) => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    const now = ts / 1000;
    let dt = now - this.last;
    this.last = now;
    if (dt <= 0) return;
    if (dt > 0.25) dt = 1 / 60;
    dt = Math.min(dt, 1 / 20);

    this.monitorPerf(dt);

    this.t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    if (this.input.touchMode !== this.lastTouch) {
      this.lastTouch = this.input.touchMode;
      this.relayout();
    }
    this.input.pollGamepad();
    this.handleInput();
    this.relayout();

    let gdt = dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      gdt = 0;
    } else if (this.phase === "dying") {
      gdt = dt * 0.4;
    }
    if (this.phase === "dying") {
      this.dyingT += dt;
      if (this.dyingT > 1.6) this.finishRun();
    }
    if (!["paused", "docked", "journal", "atlas", "over"].includes(this.phase)) this.step(gdt, dt);
    // Shore and journal have their own lightweight animation. Keep the paused
    // ocean as a still frame instead of repainting hundreds of sprites behind them.
    if (!["paused", "docked", "journal", "atlas", "over"].includes(this.phase) || this.lastRenderedPhase !== this.phase || this.canvasDirty) {
      this.render();
      this.lastRenderedPhase = this.phase;
      this.canvasDirty = false;
    }
  };

  private monitorPerf(dt: number) {
    this.frameEma += (dt - this.frameEma) * 0.05;
    this.perfT += dt;
    if (this.perfT > 1.5) {
      this.perfT = 0;
      if ((this.phase === "playing" || this.phase === "walking") && this.frameEma > 0.0215 && this.quality > 0) {
        // slower than ~46fps: shed particles first, then resolution
        this.quality--;
        // Keep the closer schools, gracefully discard distant schools if a
        // slow device needs a lower sprite budget.
        const budget = this.quality === 1 ? 17 : 13;
        while (this.schools.length > budget) {
          let far = 0, distance = -1;
          for (let i = 0; i < this.schools.length; i++) {
            const d = Math.hypot(this.schools[i].x - this.boat.x, this.schools[i].y - this.boat.y);
            if (d > distance) { distance = d; far = i; }
          }
          swapRemove(this.schools, far);
        }
        this.particles.q = this.quality === 1 ? 0.6 : 0.35;
        if (this.quality === 0 && this.dprCap > 1.25) {
          this.dprCap = 1.25;
          this.resize();
        }
        this.frameEma = 1 / 60;
      } else if ((this.phase === "playing" || this.phase === "walking") && this.quality === 0 && this.frameEma > .0205 && this.resolutionScale > .7) {
        // A software renderer can be fill-rate limited even at DPR 1. Keep
        // the React interface sharp and reduce only the ocean/terrain canvas.
        this.resolutionScale = Math.max(.7, this.resolutionScale - .1);
        this.resize();
        this.frameEma = 1/60;
      }
    }
  }

  private handleInput() {
    const inp = this.input;
    if (inp.consume("mute")) this.toggleMute();
    if(inp.consume("zoomIn"))this.changeZoom(1);
    if(inp.consume("zoomOut"))this.changeZoom(-1);
    switch (this.phase) {
      case "menu":
        if (inp.consume("journal")) this.adventure.journal();
        else if (inp.consume("confirm")) this.start();
        inp.clearPressed();
        break;
      case "playing":
        inp.consume("confirm");
        if (inp.consume("pause")) this.pause();
        else if (inp.consume("restart")) this.restart();
        else if (inp.consume("journal")) this.adventure.journal();
        else if (inp.consume("dock")) this.adventure.dock();
        else if (inp.consume("atlas")) this.exploration.atlas();
        if(inp.consume("cruise"))this.toggleCruise();
        if(inp.consume("precision"))this.togglePrecision();
        if (inp.consume("repel")) this.threats.repel();
        if (inp.consume("bait")) this.adventure.useBait();
        break;
      case "walking":
        if(inp.consume("pause"))this.pause();
        else if(inp.consume("atlas"))this.exploration.atlas();
        else if(inp.consume("journal"))this.adventure.journal();
        else if(inp.consume("dock"))this.exploration.launchBoat();
        else if(inp.consume("restart"))this.restart();
        else {const cast=inp.consume("net"),enter=inp.consume("confirm");if(cast||enter)this.exploration.interact();}
        inp.consume("cruise");inp.consume("precision");
        if(inp.consume("bait"))this.exploration.castLine();
        inp.consume("harpoon");inp.consume("sonar");inp.consume("repel");
        break;
      case "atlas":
        if(inp.consume("pause")||inp.consume("atlas"))this.exploration.closeAtlas();
        inp.clearPressed();break;
      case "docked":
        if (inp.consume("pause") || inp.consume("dock")) this.adventure.leave();
        else if (inp.consume("journal")) this.adventure.journal();
        inp.clearPressed();
        break;
      case "journal":
        if (inp.consume("pause") || inp.consume("journal")) this.adventure.closeJournal();
        inp.clearPressed();
        break;
      case "paused":
        if(inp.consume("atlas"))this.exploration.atlas();
        else if (inp.consume("pause")) this.resume();
        else if (inp.consume("restart")) this.restart();
        inp.clearPressed();
        break;
      case "dying":
        if (this.dyingT > 0.5 && (inp.consume("restart") || inp.consume("confirm"))) this.restart();
        inp.clearPressed();
        break;
      case "over":
        if (inp.consume("restart") || inp.consume("confirm")) this.restart();
        inp.clearPressed();
        break;
    }
  }

  // -------------------------------------------------------------- update
  private step(dt: number, real: number) {
    const live = this.phase === "playing";
    audio.silent = this.phase === "menu";

    if (this.phase === "playing" || this.phase === "walking") {
      if (this.mode === "free") this.advanceClock(dt);
      else { this.night = 0; this.twilight = 0; }
    }
    if(this.phase==="walking") {
      this.exploration.update(dt);this.updateRegion();this.updatePopups(dt);this.particles.update(dt);
      this.updateCamera(real);this.updateHud(real);
      this.mapT-=real;if(this.mapT<=0){this.mapT=.3;this.minimap.reveal(this.focus.x,this.focus.y,1000);}
      return;
    }
    if (live) { this.adventure.tick(dt);this.exploration.tickSea(dt);this.companions.update(this, dt); }
    this.updateBoat(dt, live);
    if (this.phase === "docked") return;

    if (live && this.phase === "playing") {
      this.runTime += dt;
      // daylight drains a little faster the longer you sail
      if(this.mode==="challenge")this.timeLeft -= dt * (1 + Math.min(0.6, this.runTime / 600));
      if (this.mode==="challenge" && this.timeLeft < 10.5) {
        const sec = Math.ceil(this.timeLeft);
        if (sec !== this.lastSec && sec > 0) {
          this.lastSec = sec;
          audio.tick();
          this.hud.timeFlash = 1;
        }
      } else this.lastSec = 99;
      if (this.mode==="challenge" && this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.endGame("night");
      }
      if (this.comboT > 0) {
        this.comboT -= dt;
        if (this.comboT <= 0) {
          if (this.combo >= 4) this.toast("Combo persa", "#ff9a8a");
          this.combo = 0;
          this.comboMult = 1;
        }
      }
      if (this.frenzyT > 0) {
        this.frenzyT -= dt;
        if (this.frenzyT <= 0) this.toast("Frenzy over", "#ffe58a");
      }
      this.updateAim();
      this.updateTools(dt);
      this.updateRegion();
      this.updateCrates(dt);
      this.updateStrikes(dt);
      this.predatorSpawn(dt);
      this.updateTips(dt);
    }

    this.updateNets(dt);
    this.updateHarpoon(dt);
    this.updateFlyers(dt);
    this.updateSonars(dt);
    this.updateSchools(dt);
    this.updatePredators(dt, live);
    this.spawnTick(dt);
    this.updatePopups(dt);
    this.particles.update(dt);
    this.updateCamera(real);
    this.updateHud(real);

    this.mapT -= real;
    if (this.mapT <= 0) {
      this.mapT = 0.3;
      this.minimap.reveal(this.boat.x, this.boat.y);
    }
  }

  // ---- boat ----------------------------------------------------------
  private updateBoat(dt: number, live: boolean) {
    const b = this.boat;
    const inp = this.input;
    const mv = this.mv;
    if (b.sunk > 0) {
      b.sunk += dt * 0.7;
      b.vx *= Math.exp(-2 * dt);
      b.vy *= Math.exp(-2 * dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.ang += dt * 0.6;
      return;
    }
    if (live) inp.getMove(mv);
    else if (this.phase === "menu") {
      this.demoA += dt * 0.3;
      mv.x = Math.cos(this.demoA) * 0.55;
      mv.y = Math.sin(this.demoA) * 0.55;
    } else {
      mv.x = 0;
      mv.y = 0;
    }
    if(live&&this.cruising&&!mv.x&&!mv.y){
      const goal=this.exploration.waypoint;
      let gx=goal?goal.x-b.x:0;if(gx>WORLD_W/2)gx-=WORLD_W;else if(gx< -WORLD_W/2)gx+=WORLD_W;
      const a=goal?Math.atan2(goal.y-b.y,gx):b.ang;
      const aheadX=b.x+Math.cos(a)*240,aheadY=b.y+Math.sin(a)*240;
      if(isOnLand(aheadX,aheadY)||nearestCoast(aheadX,aheadY,65,this.boatCoast)) {
        this.cruising=false;this.toast("Costa in vista · riprendi il timone","#f4d892");
      } else {mv.x=Math.cos(a);mv.y=Math.sin(a);}
    }
    const mag = Math.hypot(mv.x, mv.y);
    const speed = Math.hypot(b.vx, b.vy);

    // boost
    const wantBoost = live && !this.precision && inp.boostHeld();
    if (wantBoost && !b.exhausted && b.energy > 0) {
      if (!b.boosting) {
        b.boosting = true;
        audio.boost();
        this.addTrauma(0.12);
        this.camPunch -= 0.03;
        for (let i = 0; i < 10; i++) {
          this.particles.spawn(PK.Dot, b.x - Math.cos(b.ang) * 30, b.y - Math.sin(b.ang) * 30, rand(-120, 120) - Math.cos(b.ang) * 160, rand(-120, 120) - Math.sin(b.ang) * 160, 0.4, 4, "#ffd27a", 1, -6, 3);
        }
      }
      b.energy -= dt * 0.42 / (1 + this.adventure.profile.upgrades.boost * 0.4);
      b.boostIdle = 0;
      if (b.energy <= 0) {
        b.energy = 0;
        b.exhausted = true;
        b.boosting = false;
        inp.boostLatch = false;
        this.toast("Boost esaurito", "#ffd27a");
      }
    } else {
      b.boosting = false;
      if (wantBoost && b.exhausted) inp.boostLatch = false;
      b.boostIdle += dt;
      if (b.boostIdle > 0.5) b.energy = Math.min(1, b.energy + dt * 0.24 * (1+this.adventure.profile.upgrades.boost*.3));
      if (b.exhausted && b.energy > 0.3) {
        b.exhausted = false;
        this.hud.ready.boost = 1;
      }
    }

    let bankT = 0;
    if (mag > 0.06) {
      const target = Math.atan2(mv.y, mv.x);
      const diff = angleDiff(b.ang, target);
      const turn = this.precision?9:4.6 + 2.6 * (1 - Math.min(1, speed / 300));
      b.ang += clamp(diff, -turn * dt, turn * dt);
      bankT = clamp(diff * 0.45, -0.5, 0.5);
      const align = Math.max(0.3, Math.cos(diff) * 0.5 + 0.5);
      const a = (this.precision ? 150 : this.cruising ? 1550 : b.boosting ? 1000 : 580) * this.engineMultiplier * Math.max(0.35, mag) * align;
      b.vx += Math.cos(b.ang) * a * dt;
      b.vy += Math.sin(b.ang) * a * dt;
    } else if (b.boosting) {
      const force = 1000 * this.engineMultiplier;
      b.vx += Math.cos(b.ang) * force * dt;
      b.vy += Math.sin(b.ang) * force * dt;
    }
    b.bank = damp(b.bank, bankT, 8, dt);

    const c = Math.cos(b.ang);
    const s = Math.sin(b.ang);
    let fwd = b.vx * c + b.vy * s;
    let lat = -b.vx * s + b.vy * c;
    fwd *= Math.exp(-1.8 * dt);
    lat *= Math.exp(-4.2 * dt);
    b.vx = c * fwd - s * lat;
    b.vy = s * fwd + c * lat;
    const sp2 = Math.hypot(b.vx, b.vy);
    const cap=this.precision?92:(this.cruising?950:640)*this.engineMultiplier;
    if (sp2 > cap) { b.vx *= cap/sp2; b.vy *= cap/sp2; }
    const ox = b.x;
    const oy = b.y;
    const moveSteps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/4));
    for(let i=0;i<moveSteps;i++){b.x+=b.vx*dt/moveSteps;b.y+=b.vy*dt/moveSteps;this.collideLand();}
    if (live) this.distance += Math.hypot(b.x - ox, b.y - oy);

    // The world wraps around horizontally (the boat can cross the antimeridian).
    if (b.x < 0) { b.x += WORLD_W; this.cam.x += WORLD_W; }
    else if (b.x >= WORLD_W) { b.x -= WORLD_W; this.cam.x -= WORLD_W; }
    // Poles are hard walls.
    const m = 40;
    if (b.y < m) {
      b.y = m;
      b.vy = Math.abs(b.vy) * 0.3;
    } else if (b.y > WORLD_H - m) {
      b.y = WORLD_H - m;
      b.vy = -Math.abs(b.vy) * 0.3;
    }

    this.collideLand();

    // timers & decorations
    b.invuln = Math.max(0, b.invuln - dt);
    b.flash = Math.max(0, b.flash - dt * 4);
    b.squash = damp(b.squash, 0, 12, dt);
    b.recoil = Math.max(0, b.recoil - dt * 5);
    b.radar += dt * 3;

    // wake
    const spd = Math.hypot(b.vx, b.vy);
    b.wakeT -= dt;
    if (spd > 50 && b.wakeT <= 0) {
      b.wakeT = b.boosting ? 0.018 : 0.04;
      const sx = b.x - c * 32 * C.BOAT_SCALE;
      const sy = b.y - s * 32 * C.BOAT_SCALE;
      const lx = -s;
      const ly = c;
      const side = (Math.random() < 0.5 ? -1 : 1) * 11;
      const q = this.particles.q;
      if (Math.random() < q) this.particles.foam(sx + lx * side, sy + ly * side, lx * side * 2.2 - c * 18, ly * side * 2.2 - s * 18, 4 + spd * 0.008);
      if (Math.random() < 0.5 * q) this.particles.foam(sx, sy, -c * 10, -s * 10, 6 + spd * 0.01);
      if (b.boosting && Math.random() < q) {
        this.particles.spawn(PK.Dot, sx - c * 8, sy - s * 8, -c * 140 + rand(-50, 50), -s * 140 + rand(-50, 50), 0.32, 4.5, Math.random() < 0.5 ? "#ffd27a" : "#ff9a4a", 1, -8, 2);
      }
      if (Math.random() < 0.12 * q) this.particles.bubble(sx, sy);
    }
    // The repair pump works only after seven calm seconds, away from animals.
    const pump=this.adventure.profile.upgrades.repair;
    if(live&&pump>0&&b.hull<100&&this.runTime-this.lastDamageAt>7&&!this.predators.some(p=>Math.hypot(p.x-b.x,p.y-b.y)<450))b.hull=Math.min(100,b.hull+dt*.8*pump);
    // smoke when damaged
    if (b.hull < 35 && b.sunk === 0) {
      b.smokeT -= dt;
      if (b.smokeT <= 0) {
        b.smokeT = 0.09;
        this.particles.spawn(PK.Dot, b.x + rand(-6, 6), b.y + rand(-6, 6), rand(-14, 14), rand(-30, -10), 0.9, 5, "rgba(60,60,70,0.55)", 1, 10, 0.8);
      }
    }
  }

  /**
   * Polygon-aware coast collision: pushes the boat off the shore and
   * bounces (or damages) proportional to impact speed.
   */
  private collideLand() {
    const b=this.boat,c=this.boatCoast,margin=C.BOAT_R+.6;
    const ca=Math.cos(b.ang),sa=Math.sin(b.ang);
    // A slim three-circle capsule follows the physical hull, not the old
    // oversized exclusion disc. Remove inward velocity to slide, not bounce.
    for(const offset of [-10,0,11]){
      const px=b.x+ca*offset,py=b.y+sa*offset;
      if(!nearestCoast(px,py,margin,c))continue;
      if(!c.inside&&c.distance>=margin)continue;
      const correction=c.inside?margin+c.distance:margin-c.distance;
      b.x+=c.nx*correction;b.y+=c.ny*correction;
      const vn=b.vx*c.nx+b.vy*c.ny;
      if(vn<0){b.vx-=vn*c.nx;b.vy-=vn*c.ny;}
      if(b.boosting&&-vn>270&&this.phase==="playing")this.hurt(7,c.x,c.y);
    }
  }

  hurt(amount: number, sx: number, sy: number): boolean {
    const b = this.boat;
    if (this.phase !== "playing" || b.invuln > 0) return false;
    amount *= (this.mode==="free"?.55:1)*(1 - this.adventure.profile.upgrades.hull * 0.15);
    this.lastDamageAt=this.runTime;
    b.hull = Math.max(0, b.hull - amount);
    b.invuln = 1.1;
    b.flash = 1;
    b.squash = 0.12;
    this.hud.hullFlash = 1;
    this.hud.redFlash = 1;
    this.addTrauma(0.6);
    this.hitstop = Math.max(this.hitstop, 0.07);
    const dx = b.x - sx;
    const dy = b.y - sy;
    const d = Math.hypot(dx, dy) || 1;
    b.vx += (dx / d) * 240;
    b.vy += (dy / d) * 240;
    this.particles.debris(b.x, b.y, 14);
    this.particles.sparks(b.x, b.y, "#ffd27a", 10, 320);
    this.popup(b.x, b.y - 30, `-${Math.round(amount)}`, "#ff6b5a", 22);
    audio.hit(true);
    if (b.hull <= 0) this.endGame("wreck");
    return true;
  }

  // ---- tools ---------------------------------------------------------
  private updateAim() {
    const b = this.boat;
    // net preview / assist
    const hx = Math.cos(b.ang);
    const hy = Math.sin(b.ang);
    let best = -1e9;
    let bx = b.x + hx * C.NET_DEFAULT_RANGE;
    let by = b.y + hy * C.NET_DEFAULT_RANGE;
    let bc = 0;
    let assist = false;
    for (let i = 0; i < this.schools.length; i++) {
      const s = this.schools[i];
      if (s.sp.tier === 3) continue;
      const dx = s.x - b.x;
      const dy = s.y - b.y;
      const d = Math.hypot(dx, dy);
      if (d < 50 || d > 470) continue;
      const da = Math.abs(angleDiff(b.ang, Math.atan2(dy, dx)));
      if (da > 0.62) continue;
      const px = s.x + s.vx * 0.4;
      const py = s.y + s.vy * 0.4;
      let c = 0;
      for (let k = 0; k < s.members.length; k++) {
        const m = s.members[k];
        if ((m.x - px) * (m.x - px) + (m.y - py) * (m.y - py) < this.netRadius * this.netRadius) c++;
      }
      const sc = c * 10 - da * 12 - d * 0.012;
      if (c > 0 && sc > best) {
        best = sc;
        bc = c;
        assist = true;
        let ddx = px - b.x;
        let ddy = py - b.y;
        const dd = Math.hypot(ddx, ddy);
        const dl = clamp(dd, 70, C.NET_MAX_RANGE);
        ddx = (ddx / dd) * dl;
        ddy = (ddy / dd) * dl;
        bx = b.x + ddx;
        by = b.y + ddy;
      }
    }
    this.netAim.x = bx;
    this.netAim.y = by;
    this.netAim.count = bc;
    this.netAim.assist = assist;
    this.netAim.show = b.netCd <= 0.25;

    // harpoon lock
    this.lock.valid = false;
    this.lockScore = 1e9;
    for (let i = 0; i < this.schools.length; i++) {
      const s = this.schools[i];
      const dx = s.x - b.x;
      const dy = s.y - b.y;
      if (dx * dx + dy * dy > (this.harpoonRange + s.rad) * (this.harpoonRange + s.rad)) continue;
      for (let k = 0; k < s.members.length; k++) this.considerLock(s.members[k], s.sp);
    }
    for (let i = 0; i < this.predators.length; i++) this.considerLock(this.predators[i], this.predators[i].sp);
    if (this.lock.valid) this.lock.t += 1 / 60;
    else this.lock.t = 0;
  }

  private considerLock(f: { x: number; y: number; vx: number; vy: number }, sp: Species) {
    const b = this.boat;
    const dx = f.x - b.x;
    const dy = f.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 60 || d > this.harpoonRange - 30) return;
    const tt = d / C.HARP_SPEED;
    const px = f.x + f.vx * tt;
    const py = f.y + f.vy * tt;
    const a = Math.atan2(py - b.y, px - b.x);
    const da = Math.abs(angleDiff(b.ang, a));
    if (da > 0.4) return;
    const score = da * 2 + d * 0.0009 - sp.tier * 0.06 - (sp.predator ? .2 : 0);
    if (score < this.lockScore) {
      this.lockScore = score;
      this.lock.valid = true;
      this.lock.x = px;
      this.lock.y = py;
      this.lock.tx = f.x;
      this.lock.ty = f.y;
      this.lock.sp = sp;
    }
  }

  private updateTools(dt: number) {
    const b = this.boat;
    const inp = this.input;
    const prevNet = b.netCd;
    const prevSonar = b.sonarCd;
    const prevHarp = b.harpCd;
    b.netCd = Math.max(0, b.netCd - dt);
    b.harpCd = Math.max(0, b.harpCd - dt);
    b.sonarCd = Math.max(0, b.sonarCd - dt);
    if (prevNet > 0 && b.netCd <= 0) this.hud.ready.net = 1;
    if (prevSonar > 0 && b.sonarCd <= 0) {
      this.hud.ready.sonar = 1;
      audio.ready();
    }
    if (prevHarp > 0 && b.harpCd <= 0 && !this.harpoon) this.hud.ready.harpoon = 1;

    if (inp.consume("net")) this.buf.net = 0.22;
    if (inp.consume("harpoon")) this.buf.harpoon = 0.22;
    if (inp.consume("sonar")) this.buf.sonar = 0.22;
    inp.consume("boost");
    this.buf.net -= dt;
    this.buf.harpoon -= dt;
    this.buf.sonar -= dt;

    if (this.buf.net > 0 && b.netCd <= 0) {
      this.buf.net = 0;
      this.fireNet();
    }
    if (this.buf.harpoon > 0 && !this.harpoon && b.harpCd <= 0) {
      this.buf.harpoon = 0;
      this.fireHarpoon();
    }
    if (this.buf.sonar > 0 && b.sonarCd <= 0) {
      this.buf.sonar = 0;
      this.fireSonar();
    }
  }

  private fireNet() {
    const b = this.boat;
    b.netCd = this.netCooldown;
    this.netsThrown++;
    const c = Math.cos(b.ang);
    const s = Math.sin(b.ang);
    const x0 = b.x + c * 24;
    const y0 = b.y + s * 24;
    this.nets.push({
      phase: 0,
      t: 0,
      x0,
      y0,
      x1: this.netAim.x,
      y1: this.netAim.y,
      x: x0,
      y: y0,
      r: 6,
      h: 0,
      caught: [],
      spin: rand(0, TAU),
    });
    b.squash = 0.07;
    audio.net();
    this.particles.splash(x0, y0, 3, 0.4);
  }

  private updateNets(dt: number) {
    const b = this.boat;
    for (let i = this.nets.length - 1; i >= 0; i--) {
      const n = this.nets[i];
      n.t += dt;
      n.spin += dt * 1.2;
      if (n.phase === 0) {
        const dur = 0.34;
        const p = Math.min(1, n.t / dur);
        const e = easeOutCubic(p);
        n.x = n.x0 + (n.x1 - n.x0) * e;
        n.y = n.y0 + (n.y1 - n.y0) * e;
        n.h = Math.sin(Math.PI * p);
        n.r = 10 + (this.netRadius - 10) * e;
        if (p >= 1) this.landNet(n);
      } else if (n.phase === 1) {
        const p = Math.min(1, n.t / 0.2);
        n.r = this.netRadius * (1 + 0.04 * Math.sin(p * Math.PI));
        for (const c of n.caught) {
          c.x += (n.x - c.x) * Math.min(1, dt * 7);
          c.y += (n.y - c.y) * Math.min(1, dt * 7);
          c.rot += dt * 3;
        }
        if (p >= 1) {
          n.phase = 2;
          n.t = 0;
          audio.thunk();
        }
      } else if (n.phase === 2) {
        const p = Math.min(1, n.t / 0.26);
        n.r = this.netRadius * (1 - 0.86 * p * p);
        for (const c of n.caught) {
          c.x += (n.x - c.x) * Math.min(1, dt * 12);
          c.y += (n.y - c.y) * Math.min(1, dt * 12);
          c.rot += dt * 6;
        }
        if (p >= 1) {
          n.phase = 3;
          n.t = 0;
          this.launchHaul(n);
        }
      } else {
        const p = Math.min(1, n.t / 0.28);
        n.x += (b.x - n.x) * Math.min(1, dt * 10);
        n.y += (b.y - n.y) * Math.min(1, dt * 10);
        n.r = this.netRadius * 0.14 * (1 - p);
        if (p >= 1) swapRemove(this.nets, i);
      }
    }
  }

  private landNet(n: NetObj) {
    n.phase = 1;
    n.t = 0;
    n.h = 0;
    n.r = this.netRadius;
    this.particles.splash(n.x, n.y, 16, 1.25);
    this.particles.ring(n.x, n.y, 20, this.netRadius * 1.1, "rgba(255,255,255,0.7)", 0.55);
    audio.splash(1);
    this.addTrauma(0.14);
    let tooBig = false;
    for (let si = this.schools.length - 1; si >= 0; si--) {
      const s = this.schools[si];
      const dx = s.x - n.x;
      const dy = s.y - n.y;
      if (dx * dx + dy * dy > (this.netRadius + s.rad) * (this.netRadius + s.rad)) continue;
      for (let mi = s.members.length - 1; mi >= 0; mi--) {
        const f = s.members[mi];
        const rr = this.netRadius + f.sp.wid * 0.2;
        if ((f.x - n.x) * (f.x - n.x) + (f.y - n.y) * (f.y - n.y) > rr * rr) continue;
        if (f.sp.tier === 3) {
          if (!tooBig) {
            tooBig = true;
            this.popup(f.x, f.y - 20, "TROPPO GRANDE! Usa la fiocina", "#ffb066", 15);
          }
          continue;
        }
        n.caught.push({ f, x: f.x, y: f.y, rot: f.ang });
        swapRemove(s.members, mi);
        s.panic = 1.2;
      }
      if (s.members.length === 0) swapRemove(this.schools, si);
    }
    if (n.caught.length > 0) {
      for (let k = 0; k < Math.min(6, n.caught.length); k++) this.particles.bubble(n.x + rand(-40, 40), n.y + rand(-40, 40));
    }
  }

  private launchHaul(n: NetObj) {
    const cnt = n.caught.length;
    if (cnt === 0) {
      this.popup(n.x, n.y - 10, "Rete vuota!", "#cfe6f2", 15);
      return;
    }
    const mult = cnt >= 2 ? Math.min(3, 1 + 0.25 * (cnt - 1)) : 1;
    this.addTrauma(0.1 + Math.min(0.3, cnt * 0.04));
    this.particles.ring(n.x, n.y, 8, 70, "rgba(255,240,180,0.9)", 0.45);
    this.particles.stars(n.x, n.y, "#fff3b0", 6 + cnt, 170);
    for (let i = 0; i < cnt; i++) {
      const c = n.caught[i];
      this.flyers.push({
        sp: c.f.sp,
        x0: c.x + rand(-6, 6),
        y0: c.y + rand(-6, 6),
        x: c.x,
        y: c.y,
        t: 0,
        dur: 0.42,
        delay: 0.03 + i * 0.07,
        sc: c.f.scale * 0.85,
        rot: c.rot,
        spin: rand(-9, 9),
        mult,
        marked: c.f.marked > 0,
        ang: c.rot,
        ox: i === 0 ? 0 : Math.cos(i * 2.4) * 22 * Math.sqrt(i),
        oy: i === 0 ? -8 : Math.sin(i * 2.4) * 16 * Math.sqrt(i) - 14,
      });
    }
    if (cnt >= 2) {
      this.popup(n.x, n.y - 46, `PESCATA ×${cnt}  +${Math.round((mult - 1) * 100)}%`, "#9af7ff", 17);
      if (cnt >= 5) this.toast(`${cnt} PESCI IN UNA RETE!`, "#9af7ff");
    }
    n.caught.length = 0;
  }

  private updateFlyers(dt: number) {
    const b = this.boat;
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      if (f.delay > 0) {
        f.delay -= dt;
        if (f.delay <= 0) this.awardCatch(f.sp, f.x0, f.y0, f.mult, f.marked, undefined, f.ox, f.oy);
        continue;
      }
      f.t += dt;
      const p = Math.min(1, f.t / f.dur);
      const e = p * p * (3 - 2 * p);
      const tx = b.x - Math.cos(b.ang) * 6;
      const ty = b.y - Math.sin(b.ang) * 6;
      f.x = f.x0 + (tx - f.x0) * e;
      f.y = f.y0 + (ty - f.y0) * e - Math.sin(Math.PI * p) * 70;
      f.rot += f.spin * dt;
      if (p >= 1) {
        b.squash = Math.min(0.14, b.squash + 0.05);
        this.particles.confetti(b.x, b.y, f.sp.body, 4, 120);
        this.particles.splash(b.x, b.y, 2, 0.35);
        audio.arrive();
        swapRemove(this.flyers, i);
      }
    }
  }

  private flushFlyers() {
    for (const f of this.flyers) {
      if (f.delay > 0) {
        f.delay = 0;
        this.awardCatch(f.sp, f.x0, f.y0, f.mult, f.marked, undefined, f.ox, f.oy);
      }
    }
    this.flyers.length = 0;
  }

  private fireHarpoon() {
    const b = this.boat;
    let ang = b.ang;
    if (this.lock.valid) {
      const a = Math.atan2(this.lock.y - b.y, this.lock.x - b.x);
      if (Math.abs(angleDiff(b.ang, a)) < 0.45) ang = a;
    }
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    this.harpoon = { x: b.x + c * 38, y: b.y + s * 38, ang, dist: 0, phase: 0, carry: null };
    this.harpoonsFired++;
    b.recoil = 1;
    b.vx -= Math.cos(ang) * 40;
    b.vy -= Math.sin(ang) * 40;
    this.addTrauma(0.14);
    audio.harpoon();
    this.particles.sparks(b.x + c * 40, b.y + s * 40, "#fff3c0", 6, 260);
    this.particles.splash(b.x + c * 36, b.y + s * 36, 3, 0.4);
  }

  private updateHarpoon(dt: number) {
    const h = this.harpoon;
    if (!h) return;
    const b = this.boat;
    if (h.phase === 0) {
      const step = C.HARP_SPEED * dt;
      const c = Math.cos(h.ang);
      const s = Math.sin(h.ang);
      const nx = h.x + c * step;
      const ny = h.y + s * step;
      if (this.harpoonHit(h, h.x, h.y, nx, ny)) {
        h.phase = 1;
      } else {
        h.x = nx;
        h.y = ny;
        h.dist += step;
        if (Math.random() < 0.5) this.particles.foam(h.x, h.y, 0, 0, 2.5);
        if (h.dist >= this.harpoonRange) {
          h.phase = 1;
          this.particles.splash(h.x, h.y, 6, 0.6);
          audio.splash(0.5);
        }
      }
    } else {
      const dx = b.x - h.x;
      const dy = b.y - h.y;
      const d = Math.hypot(dx, dy);
      const step = 1900 * dt;
      if (d <= step + 34) {
        if (h.carry) {
          b.squash = 0.12;
          this.particles.confetti(b.x, b.y, h.carry.body, 8, 160);
          audio.arrive();
        }
        this.harpoon = null;
        b.harpCd = Math.max(.07,.18-this.adventure.profile.upgrades.harpoon*.03);
      } else {
        h.x += (dx / d) * step;
        h.y += (dy / d) * step;
      }
    }
  }

  private harpoonHit(h: HarpoonObj, ax: number, ay: number, bx: number, by: number): boolean {
    let bestD = 1e18;
    let bestFish: Fish | null = null;
    let bestPred: Predator | null = null;
    for (let si = 0; si < this.schools.length; si++) {
      const s = this.schools[si];
      const rr = s.rad + 70;
      if (segDist2(s.x, s.y, ax, ay, bx, by) > rr * rr) continue;
      for (let mi = 0; mi < s.members.length; mi++) {
        const f = s.members[mi];
        const r = 15 + Math.max(f.sp.len * 0.26, f.sp.wid * 0.56) * f.scale;
        if (segDist2(f.x, f.y, ax, ay, bx, by) < r * r) {
          const d = (f.x - ax) * (f.x - ax) + (f.y - ay) * (f.y - ay);
          if (d < bestD) {
            bestD = d;
            bestFish = f;
            bestPred = null;
          }
        }
      }
    }
    for (let pi = 0; pi < this.predators.length; pi++) {
      const p = this.predators[pi];
      const r = 18 + Math.max(p.sp.len * 0.3, p.sp.wid * 0.55) * p.scale;
      if (segDist2(p.x, p.y, ax, ay, bx, by) < r * r) {
        const d = (p.x - ax) * (p.x - ax) + (p.y - ay) * (p.y - ay);
        if (d < bestD) {
          bestD = d;
          bestFish = null;
          bestPred = p;
        }
      }
    }
    if (bestFish) {
      const f = bestFish;
      h.x = f.x;
      h.y = f.y;
      h.carry = f.sp;
      const s = f.school;
      const idx = s.members.indexOf(f);
      if (idx >= 0) swapRemove(s.members, idx);
      if (s.members.length === 0) {
        const si = this.schools.indexOf(s);
        if (si >= 0) swapRemove(this.schools, si);
      } else s.panic = 1.2;
      this.particles.splash(f.x, f.y, 10, 1);
      this.particles.sparks(f.x, f.y, "#fff3c0", 8, 280);
      this.awardCatch(f.sp, f.x, f.y, 1.5, f.marked > 0, "SPEAR ×1.5");
      audio.hit(f.sp.tier >= 3);
      return true;
    }
    if (bestPred) {
      const p = bestPred;
      h.x = p.x;
      h.y = p.y;
      p.hp-=this.harpoonDamage;
      p.flash = 1;
      this.particles.splash(p.x, p.y, 12, 1.1);
      this.particles.sparks(p.x, p.y, "#ff9a7a", 12, 320);
      if (p.hp <= 0) {
        h.carry = p.sp;
        swapRemove(this.predators, this.predators.indexOf(p));
        this.awardCatch(p.sp, p.x, p.y, 1.5, p.marked > 0, p.sp.name.toUpperCase() + " ALLONTANATO!");
        this.hitstop = Math.max(this.hitstop, 0.1);
        this.addTrauma(0.5);
        this.particles.confetti(p.x, p.y, p.sp.flank, 20, 260);
      } else {
        p.state = 3;
        p.t = 0.7;
        p.vx = Math.cos(h.ang) * 200;
        p.vy = Math.sin(h.ang) * 200;
        this.popup(p.x, p.y - 30, "HIT!", "#ff9a7a", 22);
        this.hitstop = Math.max(this.hitstop, 0.06);
        this.addTrauma(0.3);
        audio.hit(true);
      }
      return true;
    }
    return false;
  }

  private fireSonar() {
    const b = this.boat;
    b.sonarCd = this.sonarCooldown;
    this.sonars.push({ x: b.x, y: b.y, t: 0, r: 0, prev: 0 });
    this.sonarFound = 0;
    audio.sonar();
    this.addTrauma(0.06);
    this.toast("PING SONAR", "#9af7ff");
  }

  private updateSonars(dt: number) {
    for (let i = this.sonars.length - 1; i >= 0; i--) {
      const p = this.sonars[i];
      p.t += dt;
      p.prev = p.r;
      p.r = this.sonarRadius * easeOutCubic(Math.min(1, p.t / 1.3));
      for (let si = 0; si < this.schools.length; si++) {
        const s = this.schools[si];
        for (let mi = 0; mi < s.members.length; mi++) {
          const f = s.members[mi];
          const d = Math.hypot(f.x - p.x, f.y - p.y);
          if (d > p.prev && d <= p.r) {
            f.marked = 10 + this.adventure.profile.upgrades.sonar * 3;
            if (f.sp.tier === 3) this.sonarFound++;
          }
        }
      }
      for (let pi = 0; pi < this.predators.length; pi++) {
        const pr = this.predators[pi];
        const d = Math.hypot(pr.x - p.x, pr.y - p.y);
        if (d > p.prev && d <= p.r) pr.marked = 10 + this.adventure.profile.upgrades.sonar * 3;
      }
      if (p.t > 1.6) {
        if (this.phase === "playing") {
          this.toast(this.sonarFound > 0 ? `${this.sonarFound} rare catch${this.sonarFound > 1 ? "es" : ""} spotted!` : "Pesci marcati: +50% punti", "#9af7ff");
        }
        swapRemove(this.sonars, i);
      }
    }
  }

  // ---- scoring ---------------------------------------------------------
  awardCatch(sp: Species, x: number, y: number, mult: number, marked: boolean, tag?: string, ox = 0, oy = 0) {
    this.combo++;
    this.comboT = C.COMBO_TIME;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const prevMult = this.comboMult;
    const mm = Math.min(8, 1 + Math.floor((this.combo - 1) / 3));
    this.comboMult = mm;
    if (mm > prevMult) {
      this.toast(`COMBO ×${mm}!`, "#ffd36b");
      this.hud.comboPunch = 1.6;
      audio.combo(mm);
      this.addTrauma(0.12);
    }
    const glowBonus = this.mode === "free" && this.night > 0.5 && !!sp.glow;
    const pts = Math.round(sp.value * mult * mm * (this.frenzyT > 0 ? 2 : 1) * (marked ? 1.5 : 1) * (glowBonus ? 1.25 : 1));
    if (glowBonus) this.popup(x - 28, y + 30, "NOTTE ×1.25", "#9fe5eb", 11);
    this.score += pts;
    this.caught++;
    this.adventure.caught(sp);
    this.timeLeft = Math.min(C.MAX_TIME, this.timeLeft + sp.time);
    if (sp.value > this.biggestVal) {
      this.biggestVal = sp.value;
      this.biggestName = sp.name;
    }
    const color = TIER_COLOR[sp.tier];
    const big = ox === 0 && oy === 0;
    this.popup(x + ox, y + oy - 10, `+${pts}`, color, (big ? 17 : 14) + sp.tier * (big ? 5 : 3) + (mm > 1 ? 2 : 0));
    if (sp.time >= 1) this.popup(x + ox + 26, y + oy + 12, `+${sp.time.toFixed(1)}s`, "#9af7ff", 13);
    if (tag) this.popup(x, y + 16, tag, "#ffffff", 13);
    if (marked && big) this.popup(x - 30, y + 4, "TAGGED", "#9af7ff", 11);
    this.particles.confetti(x, y, sp.body, 6 + sp.tier * 5, 210);
    this.particles.confetti(x, y, sp.flank, 4 + sp.tier * 3, 170);
    if (sp.tier >= 2) this.particles.stars(x, y, sp.tier === 3 ? "#ffd36b" : "#fff3b0", 3 + sp.tier * 2, 200);
    this.addTrauma(sp.tier === 1 ? 0.05 : sp.tier === 2 ? 0.14 : 0.33);
    if (sp.tier === 3) this.hitstop = Math.max(this.hitstop, 0.08);
    else if (sp.tier === 2) this.hitstop = Math.max(this.hitstop, 0.03);
    this.camPunch += sp.tier === 1 ? 0.012 : sp.tier === 2 ? 0.026 : 0.05;
    this.hud.scorePunch = 1;
    this.hud.comboPunch = Math.max(this.hud.comboPunch, 1);
    audio.catchFish(this.combo, sp.tier);
  }

  // ---- fish ----------------------------------------------------------
  spawnSchool(sp: Species, x: number, y: number, calm = 0): School {
    const n = randInt(sp.school[0], sp.school[1]);
    const s: School = {
      sp,
      x,
      y,
      vx: 0,
      vy: 0,
      ang: rand(0, TAU),
      target: 0,
      wanderT: rand(1, 3),
      panic: 0,
      calm,
      members: [],
      rad: 40,
      rip: rand(0, 1),
    };
    s.target = s.ang;
    let spread = n === 1 ? 0 : 14 + Math.sqrt(n) * (8 + sp.len * 0.28);
    if (nearestCoast(x, y, spread + 80, this.fishCoast)) {
      if (this.fishCoast.inside) {
        x = this.fishCoast.x + this.fishCoast.nx * (spread + 40);
        y = this.fishCoast.y + this.fishCoast.ny * (spread + 40);
        s.x = x; s.y = y;
      } else spread = Math.min(spread, Math.max(12, this.fishCoast.distance - 28));
    }
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const r = Math.sqrt(Math.random()) * spread;
      s.members.push({
        sp,
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r,
        vx: 0,
        vy: 0,
        ang: s.ang,
        scale: sp.tier === 3 ? rand(0.95, 1.1) : rand(0.92, 1.14),
        anim: Math.random(),
        ox: Math.cos(a) * r,
        oy: Math.sin(a) * r,
        wob: rand(0, TAU),
        marked: 0,
        school: s,
      });
    }
    s.rad = spread + 50 + sp.len * 0.3;
    this.schools.push(s);
    return s;
  }

  /** True if this world point is unusable for spawning (on land or too close to coast). */
  private badSpot(x: number, y: number, margin = 30): boolean {
    if (isOnLand(x, y)) return true;
    return islandPush(x, y, margin, this.pushV) > 0;
  }

  private trySpawnSchool(x: number, y: number): School | null {
    if (y < 160 || y > WORLD_H - 160) return null;
    if (x < 0) x += WORLD_W;
    else if (x >= WORLD_W) x -= WORLD_W;
    if (this.badSpot(x, y, 40)) return null;
    const ri = regionField(x, y, this.tmpW);
    const reg = REGIONS[ri];
    let t3 = 0;
    for (const s of this.schools) if (s.sp.tier === 3) t3++;
    // Prefer variety instead of filling the sea with copies of the same species.
    const table: [string, number][] = reg.fish.map(([id, w]) => [id, w / (1 + this.schools.filter(s => s.sp.id === id).length * 2.2)]);
    const sp = weightedPick(table, t3 >= 4);
    return this.spawnSchool(sp, x, y, 0);
  }

  private spawnTick(dt: number) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 0.1;
    const target = this.quality >= 2 ? 22 : this.quality === 1 ? 17 : 13;
    if (this.schools.length >= target) return;
    const b = this.boat;
    const sp = Math.hypot(b.vx, b.vy);
    let a: number;
    if (sp > 80 && Math.random() < 0.65) a = Math.atan2(b.vy, b.vx) + rand(-1.1, 1.1);
    else a = rand(0, TAU);
    const close = this.schools.filter(s => Math.hypot(s.x - b.x, s.y - b.y) < this.viewR * 0.8).length;
    const r = close < 7 ? rand(330, this.viewR * 0.85) : this.viewR + rand(20, 260);
    this.trySpawnSchool(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
  }

  private updateSchools(dt: number) {
    const b = this.boat;
    const speed = Math.hypot(b.vx, b.vy);
    const stealth = 0.55 + 0.45 * clamp(speed / 260, 0, 1.3);
    const despawn = (this.viewR + 1100) * (this.viewR + 1100);
    for (let si = this.schools.length - 1; si >= 0; si--) {
      const s = this.schools[si];
      const dx = s.x - b.x;
      const dy = s.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > despawn) {
        swapRemove(this.schools, si);
        continue;
      }
      s.wanderT -= dt;
      if (s.wanderT <= 0) {
        s.target = s.ang + rand(-1.3, 1.3);
        s.wanderT = rand(1.6, 4);
      }
      const bait = this.adventure.baitT > 0 && d2 < Math.pow(650+this.adventure.profile.upgrades.bait*120,2);
      const fr = s.sp.flee * stealth * (b.boosting ? 1.35 : 1) * (s.calm > 0 || bait ? 0.2 : 1);
      if (bait) { s.target = Math.atan2(-dy, -dx); s.panic = 0; s.calm = Math.max(s.calm, 0.5); }
      if (d2 < fr * fr && this.phase !== "over") {
        if (s.panic <= 0.9) s.target = Math.atan2(dy, dx) + rand(-0.5, 0.5);
        s.panic = 1.1;
      }
      s.panic -= dt;
      s.calm -= dt;
      const coast = this.fishCoast;
      const shore = nearestCoast(s.x, s.y, s.rad + 35, coast);
      if (shore) {
        s.target = Math.atan2(coast.ny, coast.nx);
        if (coast.inside || coast.distance < 28) {
          s.x = coast.x + coast.nx * (s.rad + 30);
          s.y = coast.y + coast.ny * (s.rad + 30);
        }
      }
      if (s.x < 220) s.target = 0;
      else if (s.x > WORLD_W - 220) s.target = Math.PI;
      if (s.y < 220) s.target = Math.PI / 2;
      else if (s.y > WORLD_H - 220) s.target = -Math.PI / 2;
      const turn = s.panic > 0 ? 4 : 1.6;
      s.ang += clamp(angleDiff(s.ang, s.target), -turn * dt, turn * dt);
      const sp = (s.panic > 0 ? s.sp.panic : s.sp.speed) * (bait && d2 < 150 * 150 ? 0.2 : s.calm > 0 ? 0.45 : 1);
      const ca = Math.cos(s.ang);
      const sa = Math.sin(s.ang);
      s.vx = ca * sp;
      s.vy = sa * sp;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      // ripples make schools easy to spot
      s.rip -= dt;
      if (s.rip <= 0 && s.members.length > 0) {
        s.rip = rand(0.5, 1.1);
        const m = s.members[(Math.random() * s.members.length) | 0];
        if (this.particles.q > 0.5) this.particles.ring(m.x, m.y, 2, 16, "rgba(255,255,255,0.45)", 0.9);
      }

      const spread = s.panic > 0 ? 1.25 : 1;
      const rate = 1.3 + sp * 0.022;
      for (let i = 0; i < s.members.length; i++) {
        const m = s.members[i];
        const wa = Math.sin(this.t * 1.4 + m.wob) * 5;
        const wb = Math.cos(this.t * 1.1 + m.wob) * 5;
        const tx = s.x + (m.ox * ca - m.oy * sa) * spread + wa;
        const ty = s.y + (m.ox * sa + m.oy * ca) * spread + wb;
        const ux = (tx - m.x) * 3.2 + s.vx;
        const uy = (ty - m.y) * 3.2 + s.vy;
        const k = Math.min(1, 7 * dt);
        m.vx += (ux - m.vx) * k;
        m.vy += (uy - m.vy) * k;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (shore) {
          const safe = (m.x - coast.x) * coast.nx + (m.y - coast.y) * coast.ny;
          if (safe < 15) { m.x += coast.nx * (15 - safe); m.y += coast.ny * (15 - safe); }
        }
        if (m.vx * m.vx + m.vy * m.vy > 64) m.ang += clamp(angleDiff(m.ang, Math.atan2(m.vy, m.vx)), -9 * dt, 9 * dt);
        m.anim += dt * rate;
        if (m.marked > 0) m.marked -= dt;
      }
    }
  }

  // ---- predators -------------------------------------------------------
  private predatorSpawn(dt:number) { this.threats.spawnTick(dt); }
  private updatePredators(dt:number,live:boolean) { this.threats.update(dt,live); }

  // ---- crates & hazards ------------------------------------------------
  private updateCrates(dt: number) {
    const b = this.boat;
    this.crateT -= dt;
    if (this.crateT <= 0 && this.crates.length < 2) {
      this.crateT = rand(11, 17);
      for (let tries = 0; tries < 6; tries++) {
        const a = rand(0, TAU);
        const r = rand(380, 720);
        let x = b.x + Math.cos(a) * r;
        const y = b.y + Math.sin(a) * r;
        if (y < 160 || y > WORLD_H - 160) continue;
        if (x < 0) x += WORLD_W;
        else if (x >= WORLD_W) x -= WORLD_W;
        if (this.badSpot(x, y, 30)) continue;
        const roll = Math.random();
        let kind: CrateKind = roll < 0.4 ? "time" : roll < 0.7 ? "repair" : "frenzy";
        if (kind === "repair" && b.hull > 80) kind = "time";
        this.crates.push({ x, y, kind, t: 0, life: 45 });
        break;
      }
    }
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const c = this.crates[i];
      c.t += dt;
      const dx = b.x - c.x;
      const dy = b.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d < 140 && d > 1) {
        // gentle magnet so pickups feel generous
        const pull = (1 - d / 140) * 160 * dt;
        c.x += (dx / d) * pull;
        c.y += (dy / d) * pull;
      }
      if (d < 46) {
        this.collectCrate(c);
        swapRemove(this.crates, i);
      } else if (c.t > c.life || d > this.viewR + 1400) {
        swapRemove(this.crates, i);
      }
    }
  }

  private collectCrate(c: Crate) {
    const b = this.boat;
    audio.pickup();
    this.addTrauma(0.12);
    this.particles.splash(c.x, c.y, 10, 0.9);
    this.particles.stars(c.x, c.y, "#fff3b0", 10, 220);
    this.hud.scorePunch = 0.6;
    if (c.kind === "time") {
      this.timeLeft = Math.min(C.MAX_TIME, this.timeLeft + 8);
      this.popup(c.x, c.y - 14, "+8s LUCE", "#9af7ff", 20);
      this.particles.confetti(c.x, c.y, "#7ce9ff", 14, 220);
    } else if (c.kind === "repair") {
      b.hull = Math.min(C.HULL_MAX, b.hull + 35);
      this.popup(c.x, c.y - 14, "+35 HULL", "#9be37a", 20);
      this.particles.confetti(c.x, c.y, "#9be37a", 14, 220);
    } else {
      this.frenzyT = 12;
      this.popup(c.x, c.y - 14, "FRENZY ×2 SCORE", "#ffd36b", 20);
      this.toast("FRENZY! Double score for 12s", "#ffd36b");
      this.particles.confetti(c.x, c.y, "#ffd36b", 18, 240);
    }
  }

  private updateStrikes(dt: number) {
    const b = this.boat;
    const stormW = REGIONS.reduce((w, r, i) => w + (r.weather === "rain" ? this.bw[i] : 0), 0);
    if (stormW > 0.5) {
      this.strikeT -= dt;
      if (this.strikeT <= 0) {
        this.strikeT = rand(3.4, 5.8);
        const targeted = Math.random() < 0.45;
        const x = targeted ? b.x + b.vx * 1.2 + rand(-60, 60) : b.x + rand(-420, 420);
        const y = targeted ? b.y + b.vy * 1.2 + rand(-60, 60) : b.y + rand(-320, 320);
        this.strikes.push({ x, y, t: 0, warn: 1.25, fired: false, beep: 0 });
      }
    }
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t += dt;
      if (!s.fired) {
        s.beep -= dt;
        if (s.beep <= 0) {
          s.beep = 0.28;
          audio.warn();
        }
        if (s.t >= s.warn) {
          s.fired = true;
          this.hud.whiteFlash = 1;
          this.addTrauma(0.55);
          audio.thunder();
          this.particles.sparks(s.x, s.y, "#fff7b0", 18, 420);
          this.particles.ring(s.x, s.y, 10, 130, "rgba(255,247,176,0.95)", 0.5);
          this.particles.splash(s.x, s.y, 14, 1.4);
          if (Math.hypot(b.x - s.x, b.y - s.y) < 86) this.hurt(18, s.x, s.y);
        }
      } else if (s.t > s.warn + 0.7) {
        swapRemove(this.strikes, i);
      }
    }
  }

  // ---- regions ----------------------------------------------------------
  private updateRegion() {
    const b = this.focus;
    const idx = regionField(b.x, b.y, this.bw);
    const cur = this.regionIdx;
    if (idx !== cur && (this.bw[idx] > 0.62 || this.bw[cur] < 0.3)) {
      this.regionIdx = idx;
      const reg = REGIONS[idx];
      if (!this.discovered[idx]) {
        this.discovered[idx] = true;
        this.seas++;
        this.score += 500;
        this.timeLeft = Math.min(C.MAX_TIME, this.timeLeft + 10);
        this.hud.scorePunch = 1;
        this.showBanner(reg.name.toUpperCase(), this.mode==="free"?"Nuovo mare scoperto! +500 punti":"Nuovo mare scoperto! +500 punti · +10s", reg.accent, 3);
        this.popup(b.x, b.y - 50, "+500 SCOPERTA", reg.accent, 22);
        this.particles.stars(b.x, b.y, reg.accent, 18, 280);
        this.particles.ring(b.x, b.y, 10, 160, "rgba(255,255,255,0.9)", 0.8);
        audio.discover();
        this.addTrauma(0.2);
      } else {
        this.showBanner(reg.name.toUpperCase(), reg.tagline, reg.accent, 2.2);
      }
    }
  }

  // ---- tips -----------------------------------------------------------------
  private updateTips(dt: number) {
    const touch = this.input.touchMode;
    const b = this.boat;
    let text = "";
    const next = () => {
      this.tipStage++;
      this.tipT = 0;
    };
    switch (this.tipStage) {
      case 0:
        text = touch ? "Trascina a sinistra per governare" : "Governa con WASD o con le frecce";
        if (Math.hypot(b.x - START.x, b.y - START.y) > 170 || this.runTime > 7) next();
        break;
      case 1:
        text = touch ? "Avvicinati ai pesci e tocca RETE" : "Avvicinati ai pesci · SPAZIO per lanciare la rete";
        if (this.netsThrown > 0) next();
        break;
      case 2:
        this.tipT += dt;
        text = this.caught > 0 ? "Ottimo! Catture consecutive creano una COMBO" : "";
        if (this.caught > 0 && this.tipT > 4.5) next();
        else if (this.caught === 0) this.tipT = 0;
        break;
      case 3:
        if (this.runTime > 16) {
          this.tipT += dt;
          text = touch ? "Pesce grande? FIOCINA · SONAR per i pesci rari" : "X fiocina · C sonar · SHIFT boost · F pastura";
          if (this.harpoonsFired > 0 || this.tipT > 7) next();
        }
        break;
      case 4:
        if (this.runTime > 38) {
          this.tipT += dt;
          text = "Avvicinati a terra · E per sbarcare, vendere e potenziarti";
          if (this.tipT > 5) next();
        }
        break;
    }
    this.hud.tip = text || this.hud.tip;
    const show = text !== "";
    this.hud.tipA = damp(this.hud.tipA, show ? 1 : 0, 6, dt);
    if (!show && this.hud.tipA < 0.02) this.hud.tip = "";
  }

  // ---- misc -----------------------------------------------------------------
  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.t += dt;
      p.y += p.vy * dt;
      p.vy *= Math.exp(-1.5 * dt);
      if (p.t >= p.life) swapRemove(this.popups, i);
    }
  }

  popup(x: number, y: number, text: string, color: string, size: number) {
    if (this.popups.length > 40) swapRemove(this.popups, 0);
    this.popups.push({ x: x + rand(-6, 6), y, text, color, size, t: 0, life: 1.1, vy: -60 });
  }

  toast(text: string, color: string) {
    this.hud.toast = { text, color, t: 0, dur: 1.7 };
  }

  showBanner(title: string, sub: string, color: string, dur: number) {
    this.hud.banner = { title, sub, color, t: 0, dur };
  }

  addTrauma(v: number) {
    this.trauma = Math.min(1, this.trauma + v);
  }

  private updateCamera(real: number) {
    const b = this.focus;
    const cam = this.cam;
    const lead=this.exploration.onFoot?.1:.42;
    const tx = b.x + b.vx * lead;
    const ty = b.y + b.vy * lead;
    const k = this.phase === "menu" ? 2.2 : 5;
    cam.x = damp(cam.x, tx, k, real);
    cam.y = damp(cam.y, ty, k, real);
    const sp = Math.hypot(b.vx, b.vy);
    this.zoomIntro = damp(this.zoomIntro, 0, 2.6, real);
    this.camPunch = damp(this.camPunch, 0, 7, real);
    const zt = (this.exploration.onFoot?1.05:1 - 0.13 * clamp(sp / 540, 0, 1)) * this.zoomLevel + this.zoomIntro;
    cam.zoom = damp(cam.zoom, zt, 3.2, real);
  }

  private updateHud(real: number) {
    const h = this.hud;
    h.scorePunch = Math.max(0, h.scorePunch - real * 3.5);
    h.comboPunch = Math.max(0, h.comboPunch - real * 3);
    h.hullFlash = Math.max(0, h.hullFlash - real * 2.2);
    h.timeFlash = Math.max(0, h.timeFlash - real * 2.5);
    h.redFlash = Math.max(0, h.redFlash - real * 1.8);
    h.whiteFlash = Math.max(0, h.whiteFlash - real * 3.2);
    h.ready.net = Math.max(0, h.ready.net - real * 3);
    h.ready.harpoon = Math.max(0, h.ready.harpoon - real * 3);
    h.ready.sonar = Math.max(0, h.ready.sonar - real * 3);
    h.ready.boost = Math.max(0, h.ready.boost - real * 3);
    h.dispScore += (this.score - h.dispScore) * Math.min(1, real * 10);
    if (Math.abs(this.score - h.dispScore) < 0.6) h.dispScore = this.score;
    if (h.toast) {
      h.toast.t += real;
      if (h.toast.t > h.toast.dur) h.toast = null;
    }
    if (h.banner) {
      h.banner.t += real;
      if (h.banner.t > h.banner.dur) h.banner = null;
    }
  }

  /** Bank fish already in a closing net before the shore screen freezes time. */
  settleCatches() {
    for (const n of this.nets) if (n.caught.length) this.launchHaul(n);
    this.flushFlyers();
    this.nets.length = 0;
    this.harpoon = null;
    this.adventure.flush();
  }

  /** A paid port passage moves the boat, not the score or the local high-score table. */
  relocate(x: number, y: number) {
    this.settleCatches();
    this.boat.x = x; this.boat.y = y; this.boat.vx = this.boat.vy = 0;
    this.cam.x = x; this.cam.y = y;
    this.schools.length = 0; this.predators.length = 0; this.strikes.length = 0; this.crates.length = 0;
    this.particles.clear();
    this.companions.reset();
    this.threats.reset();
    for (let i = 0; i < 55 && this.schools.length < 16; i++) {
      const a = rand(0, TAU), r = rand(160, 700);
      this.trySpawnSchool(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    this.minimap.reveal(x, y, 1700);
    this.updateRegion();
  }

  // ---- end of run ------------------------------------------------------------
  private endGame(reason: "night" | "wreck") {
    if (this.phase !== "playing") return;
    this.settleCatches();
    if (reason === "night") this.timeLeft = 0;
    this.phase = "dying";
    this.dyingT = 0;
    this.reason = reason;
    this.harpoon = null;
    this.input.releaseAll();
    const b = this.boat;
    audio.gameOver();
    if (reason === "wreck") {
      b.sunk = 0.01;
      this.addTrauma(0.95);
      this.hitstop = 0.12;
      this.particles.debris(b.x, b.y, 40);
      this.particles.sparks(b.x, b.y, "#ffb04a", 26, 480);
      this.particles.splash(b.x, b.y, 30, 2);
      this.particles.ring(b.x, b.y, 10, 220, "rgba(255,200,120,0.9)", 0.9);
      this.showBanner("SHIPWRECKED", "The sea takes its due…", "#ff8a6b", 3);
    } else {
      this.addTrauma(0.3);
      this.showBanner("TRAMONTO", "Il sole si è spento sul tuo viaggio", "#ffb066", 3);
    }
    this.adventure.flush();
    this.onPhase?.("dying");
  }

  private finishRun() {
    const entry: ScoreEntry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name: getName(),
      score: this.score,
      fish: this.caught,
      seas: this.seas,
      combo: this.bestCombo,
      date: Date.now(),
    };
    const prev = bestScore();
    const rank = this.mode==="challenge"&&this.score > 0 ? addScore(entry) : 0;
    this.best = Math.max(prev, this.score);
    const summary: RunSummary = {
      score: this.score,
      fish: this.caught,
      combo: this.bestCombo,
      seas: this.seas,
      biggest: this.biggestName,
      time: this.runTime,
      reason: this.reason,
      entryId: entry.id,
      rank,
      newBest: this.mode==="challenge"&&this.score > prev && this.score > 0,
      distance: this.distance,
    };
    this.phase = "over";
    this.onPhase?.("over");
    this.onOver?.(summary);
  }

  // ---- render ------------------------------------------------------------------
  private render() {
    const tr = this.trauma;
    const amp = tr * tr * 24;
    this.shakeX = amp * (Math.sin(this.t * 61.3) + Math.sin(this.t * 37.1 + 2.0)) * 0.5;
    this.shakeY = amp * (Math.sin(this.t * 53.7 + 1.0) + Math.sin(this.t * 41.9 + 4.0)) * 0.5;
    const zoom = this.cam.zoom + this.camPunch;
    this.S = this.viewScale * zoom;
    this.A = this.dpr * this.S;
    this.tx = this.dpr * (this.W / 2 + this.shakeX) - this.cam.x * this.A;
    this.ty = this.dpr * (this.H / 2 + this.shakeY) - this.cam.y * this.A;
    regionField(this.cam.x, this.cam.y, this.weights);
    waterColor(this.weights, this.waterRGB);
    this.minimap.refresh();
    renderWorld(this);
    if (this.phase !== "menu") renderHud(this);
  }

  // world -> css pixel helpers
  sx(x: number) {
    return (x - this.cam.x) * this.S + this.W / 2 + this.shakeX;
  }
  sy(y: number) {
    return (y - this.cam.y) * this.S + this.H / 2 + this.shakeY;
  }
}
