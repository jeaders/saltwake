import type { Species } from "./species";

export type Phase = "menu" | "playing" | "paused" | "dying" | "over" | "docked" | "journal" | "walking" | "atlas";

export const C = {
  START_TIME: 100,
  MAX_TIME: 130,
  COMBO_TIME: 4,
  HULL_MAX: 100,
  BOAT_R: 6,
  BOAT_SCALE: 0.52,
  NET_CD: 1.3,
  NET_R: 118,
  NET_MAX_RANGE: 330,
  NET_DEFAULT_RANGE: 190,
  HARP_SPEED: 1250,
  HARP_RANGE: 540,
  SONAR_CD: 9,
  SONAR_R: 1000,
  PRED_HP: 2,
} as const;

export interface Boat {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  hull: number;
  invuln: number;
  energy: number;
  exhausted: boolean;
  boosting: boolean;
  boostIdle: number;
  netCd: number;
  harpCd: number;
  sonarCd: number;
  squash: number;
  bank: number;
  recoil: number;
  flash: number;
  wakeT: number;
  smokeT: number;
  sunk: number;
  radar: number;
}

export interface Fish {
  sp: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  scale: number;
  anim: number;
  ox: number;
  oy: number;
  wob: number;
  marked: number;
  school: School;
}

export interface School {
  sp: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  target: number;
  wanderT: number;
  panic: number;
  calm: number;
  members: Fish[];
  rad: number;
  rip: number;
}

export interface Predator {
  sp: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  scale: number;
  anim: number;
  hp: number;
  /** 0 prowl, 1 chase, 2 retreat, 3 stagger, 4 wind-up, 5 charge */
  state: 0 | 1 | 2 | 3 | 4 | 5;
  maxHp: number;
  age: number;
  cooldown: number;
  attackX: number;
  attackY: number;
  windup: number;
  t: number;
  flash: number;
  marked: number;
  wanderT: number;
  target: number;
}

export type CrateKind = "time" | "repair" | "frenzy";
export interface Crate {
  x: number;
  y: number;
  kind: CrateKind;
  t: number;
  life: number;
}

export interface CaughtFish {
  f: Fish;
  x: number;
  y: number;
  rot: number;
}

export interface NetObj {
  phase: 0 | 1 | 2 | 3;
  t: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x: number;
  y: number;
  r: number;
  h: number;
  caught: CaughtFish[];
  spin: number;
}

export interface HarpoonObj {
  x: number;
  y: number;
  ang: number;
  dist: number;
  phase: 0 | 1;
  carry: Species | null;
}

export interface Flyer {
  sp: Species;
  x0: number;
  y0: number;
  x: number;
  y: number;
  t: number;
  dur: number;
  delay: number;
  sc: number;
  rot: number;
  spin: number;
  mult: number;
  marked: boolean;
  ang: number;
  ox: number;
  oy: number;
}

export interface Strike {
  x: number;
  y: number;
  t: number;
  warn: number;
  fired: boolean;
  beep: number;
}

export interface SonarPing {
  x: number;
  y: number;
  t: number;
  r: number;
  prev: number;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  t: number;
  life: number;
  vy: number;
}

export interface RunSummary {
  score: number;
  fish: number;
  combo: number;
  seas: number;
  biggest: string;
  time: number;
  reason: "night" | "wreck";
  entryId: string;
  rank: number;
  newBest: boolean;
  distance: number;
}
