import type { Game } from "./engine";
import type { Phase } from "./types";
import { C } from "./types";
import { audio } from "./audio";
import { Species } from "./species";
import { ShipAppearance, validatedShip } from "./ship";
import { PORTS, DockSite, coastalSite, nearestPort } from "./ports";
import { REGIONS, isOnLand, makeCoast, nearestCoast } from "./world";
import { Mission, UpgradeId, buyUpgrade, cargoCount, claimMission, loadProgress, noteCatch, offeredMissions, saveProgress, sellCargo, visitPort } from "./progress";

/** Economy and shore play are deliberately separate from the 60fps fishing simulation. */
export class Adventure {
  readonly g: Game;
  profile = loadProgress();
  onChange: (() => void) | null = null;
  coast = makeCoast();
  site: DockSite | null = null;
  nearby: DockSite | null = null;
  canDock = false;
  baitT = 0;
  grace = 3;
  message = "";
  services = new Set<string>();
  private journalReturn: Phase = "playing";
  private sampleT = 0;
  private saveT = 0;
  private uiT = 0;
  private dirty = false;

  constructor(g: Game) { this.g = g; }
  reset() {
    this.site = null;
    this.nearby = null;
    this.canDock = false;
    this.baitT = 0;
    this.grace = 3;
    this.services.clear();
    this.flush();
    this.onChange?.();
  }
  flush() { saveProgress(this.profile); this.dirty = false; }
  changed(message?: string) {
    if (message) this.message = message;
    this.flush();
    this.onChange?.();
  }
  get hold() { return cargoCount(this.profile); }
  get speciesFound() { return Object.keys(this.profile.book).length; }
  get missions() { return offeredMissions(this.profile, this.site?.id || "napoli", REGIONS[this.site?.region ?? this.g.regionIdx].id); }

  tick(dt: number) {
    this.grace = Math.max(0, this.grace - dt);
    this.baitT = Math.max(0, this.baitT - dt);
    this.sampleT -= dt;
    if (this.sampleT <= 0) { this.sampleT = 0.12; this.checkShore(); }
    this.saveT += dt;
    if (this.dirty && this.saveT > 1.5) { this.saveT = 0; this.flush(); }
    this.uiT -= dt;
    if (this.uiT <= 0) { this.uiT = 0.3; this.onChange?.(); }
  }

  checkShore() {
    const b = this.g.boat;
    nearestCoast(b.x, b.y, 100, this.coast);
    this.nearby = nearestPort(b.x, b.y, 140);
    this.canDock = !!this.nearby || (this.coast.found && (this.coast.inside || this.coast.distance < 86));
  }

  /** Approaching land is a feature, not a dead end: it opens a shoreside village. */
  dock() {
    const g = this.g;
    if (g.phase !== "playing") return false;
    this.checkShore();
    if (!this.canDock) { g.toast("Avvicinati a una costa o a un molo", "#ffd36b"); return false; }
    const site = this.nearby || coastalSite(g.boat.x, g.boat.y, this.coast);
    if (!site) return false;
    g.settleCatches();
    this.site = site;
    this.services.clear();
    this.message = "Benvenuto a terra. Il tempo in mare è in pausa.";
    visitPort(this.profile, site.id);
    g.boat.x = site.x; g.boat.y = site.y;
    g.boat.vx = g.boat.vy = 0; g.boat.boosting = false;
    g.input.releaseAll();
    g.phase = "docked";
    audio.duck(true); audio.pickup();
    this.changed();
    g.onPhase?.("docked");
    g.exploration.walk();
    return true;
  }

  leave() {
    const g = this.g, s = this.site;
    if (g.phase !== "docked" || !s) return;
    if(g.exploration.onFoot){g.exploration.resumeWalking();return;}
    let d = 45;
    let x = s.shoreX + s.nx * d, y = s.shoreY + s.ny * d;
    for (let tries = 0; tries < 8 && isOnLand(x, y); tries++) { d += 35; x = s.shoreX + s.nx * d; y = s.shoreY + s.ny * d; }
    g.boat.x = x; g.boat.y = y;
    g.boat.ang = Math.atan2(s.ny, s.nx);
    g.boat.vx = s.nx * 80; g.boat.vy = s.ny * 80;
    g.boat.invuln = 2;
    this.grace = 3;
    this.canDock = false;
    g.input.releaseAll();
    g.phase = "playing";
    audio.duck(false); audio.start();
    g.onPhase?.("playing");
    g.toast("Buon vento, capitano!", "#9af7ff");
    this.changed();
  }

  journal() {
    const g = this.g;
    if (g.phase === "journal") { this.closeJournal(); return; }
    if (!["playing", "walking", "menu", "paused", "docked", "over"].includes(g.phase)) return;
    this.journalReturn = g.phase;
    g.input.releaseAll();
    g.phase = "journal";
    this.flush(); audio.duck(true);
    g.onPhase?.("journal");
  }
  closeJournal() {
    const g = this.g;
    if (g.phase !== "journal") return;
    g.phase = this.journalReturn;
    g.input.releaseAll();
    audio.duck(g.phase === "docked" || g.phase === "paused");
    g.onPhase?.(g.phase);
  }

  useBait() {
    const g = this.g;
    if (g.phase !== "playing") return;
    if (this.baitT > 0) { g.toast("La pastura è già attiva", "#ffd36b"); return; }
    if (!this.profile.bait) { g.toast("Pastura finita: comprala al porto", "#ffd36b"); return; }
    this.profile.bait--;
    this.baitT = 12+this.profile.upgrades.bait*6;
    audio.sonar();
    g.particles.ring(g.boat.x, g.boat.y, 5, 220, "#ffde83", 1.2);
    g.toast(`PASTURA! I pesci si avvicinano per ${this.baitT}s`, "#ffd36b");
    this.changed();
  }

  caught(sp: Species) {
    const m = this.profile.active;
    const wasDone = m ? m.progress >= m.target : true;
    const fresh = noteCatch(this.profile, sp, REGIONS[this.g.regionIdx].id);
    if (fresh) {
      this.g.toast(`NUOVA SPECIE · ${sp.name}`, "#b9eff3");
      this.g.particles.stars(this.g.boat.x, this.g.boat.y, "#fff5b0", 8, 160);
    }
    if (!wasDone && m && m.progress >= m.target) {
      this.g.toast("INCARICO COMPLETATO! Ritira il premio al porto", "#a2eab1");
      audio.discover();
    }
    this.dirty = true;
  }

  sell() {
    if (this.g.phase !== "docked" || !this.site) return;
    const amount = sellCargo(this.profile, this.site.specialty);
    if (!amount) return;
    audio.pickup();
    this.changed(`Pescato venduto! +${amount.toLocaleString("it-IT")} monete.`);
  }
  customize(values: Partial<ShipAppearance>) {
    if(this.g.phase!=="docked")return;
    this.profile.ship=validatedShip({...this.profile.ship,...values});
    this.changed();
  }
  upgrade(id: UpgradeId) {
    if (this.g.phase !== "docked") return;
    if (!buyUpgrade(this.profile, id)) return;
    audio.discover();
    this.changed("Potenziamento installato! Lo conserverai anche nel prossimo viaggio.");
  }
  supply(id: "repair" | "daylight" | "bait") {
    if (this.g.phase !== "docked") return;
    const p = this.profile, g = this.g;
    const cost = id === "repair" ? 35 : id === "daylight" ? 40 : 55;
    if (p.coins < cost || (id !== "bait" && this.services.has(id))) return;
    if ((id === "repair" && g.boat.hull >= 100) || (id === "daylight" && g.timeLeft >= C.MAX_TIME - 1) || (id === "bait" && p.bait >= 97)) return;
    p.coins -= cost;
    if (id === "repair") g.boat.hull = 100;
    if (id === "daylight") g.timeLeft = Math.min(C.MAX_TIME, g.timeLeft + 30);
    if (id === "bait") p.bait = Math.min(99, p.bait + 3);
    if (id !== "bait") this.services.add(id);
    g.boat.energy = 1;
    audio.pickup();
    this.changed(id === "repair" ? "Scafo riparato. Pronto per altre avventure!" : id === "daylight" ? "Provviste caricate: +30 secondi di navigazione." : "Tre sacchetti di pastura pronti a bordo.");
  }
  accept(m: Mission) {
    if (this.g.phase !== "docked" || this.profile.active || this.profile.claimed.includes(m.id)) return;
    this.profile.active = { ...m, seen: [] };
    audio.click(); this.changed("Incarico accettato. Puoi consegnarlo in qualunque approdo.");
  }
  abandon() {
    if (this.g.phase !== "docked" || !this.profile.active) return;
    this.profile.active = null;
    this.changed("Incarico annullato. Ora puoi sceglierne un altro.");
  }
  claim() {
    if (this.g.phase !== "docked") return;
    const coins = claimMission(this.profile);
    if (!coins) return;
    audio.discover(); this.changed(`Incarico consegnato! +${coins} monete.`);
  }
  treasure() {
    if (this.g.phase !== "docked" || !this.site || this.profile.treasures.includes(this.site.id)) return;
    this.profile.treasures.push(this.site.id);
    this.profile.coins += 90;
    this.profile.bait = Math.min(99, this.profile.bait + 2);
    audio.pickup();
    this.changed("TESORO TROVATO! +90 monete e 2 sacchetti di pastura.");
  }
  travel(id: string) {
    if (this.g.phase !== "docked" || this.profile.coins < 80) return;
    const p = PORTS.find(p => p.id === id);
    if (!p || p.id === this.site?.id) return;
    this.profile.coins -= 80;
    this.g.exploration.onFoot=false;
    this.site = p;
    visitPort(this.profile, p.id);
    this.g.relocate(p.x, p.y);
    this.changed();
    this.leave();
    this.g.showBanner(p.name.toUpperCase(), `Nuova rotta · ${p.country}`, p.color, 2.5);
  }
}
