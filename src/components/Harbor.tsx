import { useCallback, useState } from "react";
import type { Game } from "../game/engine";
import { SPECIES } from "../game/species";
import { REGIONS } from "../game/world";
import { PORTS, coordinates } from "../game/ports";
import { cargoCount, cargoValue, marketPrice } from "../game/progress";
import { Icon } from "./Icons";
import { FishPortrait } from "./FishPortrait";
import { HarborScene, ShorePlace } from "./HarborScene";
import { WorldChart } from "./WorldChart";
import { Shipyard } from "./Shipyard";

const money = (n: number) => n.toLocaleString("it-IT");
type Tab = "market" | "shipyard" | "missions" | "routes";
const TABS: { id: Tab; name: string; icon: string }[] = [
  { id: "market", name: "Mercato", icon: "shop" },
  { id: "shipyard", name: "Cantiere", icon: "wrench" },
  { id: "missions", name: "Incarichi", icon: "scroll" },
  { id: "routes", name: "Rotte", icon: "map" },
];

export function Harbor({ game }: { game: Game }) {
  const a = game.adventure, p = a.profile, site = a.site!;
  const [tab, setTab] = useState<Tab>("market");
  const [destination, setDestination] = useState(() => PORTS.find(v => v.id !== site.id)?.id || "napoli");
  const interact = useCallback((place: ShorePlace) => {
    if (place === "treasure") a.treasure();
    else setTab(place);
  }, [a]);
  const selected = PORTS.find(v => v.id === destination)!;
  const cargo = Object.entries(p.cargo).filter(([, n]) => n > 0).sort(([a], [b]) => SPECIES[b].value - SPECIES[a].value);
  const total = cargoValue(p, site.specialty);
  const mission = p.active;
  const treasureFound = p.treasures.includes(site.id);

  return <div className="overlay harbor-overlay" role="dialog" aria-modal="true" aria-label={`Sei sbarcato a ${site.name}`}>
    <div className={`harbor-shell anim-pop ${tab === "shipyard" ? "shipyard-open" : ""}`}>
      <header className="harbor-header">
        <div className="harbor-heading">
          <span className="harbor-anchor"><Icon name="anchor" size={26} /></span>
          <div><div className="eyebrow">TERRA IN VISTA · {site.country}</div><h1>{site.name}<span className="docked-badge"><i /> Ormeggiato</span></h1></div>
        </div>
        <div className="harbor-header-tools">
          <span className="wallet"><Icon name="coin" size={21} /><b>{money(p.coins)}</b><span>monete</span></span>
          <button className="icon-button journal-link" onClick={() => a.journal()} aria-label="Apri diario delle specie"><Icon name="book" /></button>
          <button className="icon-button" onClick={() => a.leave()} aria-label={game.exploration.onFoot?"Torna a esplorare":"Torna in mare"}><Icon name="close" /></button>
        </div>
      </header>

      <div className="harbor-content">
        {tab !== "shipyard" && <section className="harbor-location">
          <HarborScene key={site.id} site={site} treasureFound={treasureFound} onInteract={interact} />
          <div className="port-caption"><Icon name="pin" size={17} /><span>{coordinates(site.shoreX, site.shoreY)}</span><span className="caption-sea">{REGIONS[site.region].name}</span></div>
          <p className="port-description">{site.description}</p>
          <div className={`shore-treasure ${treasureFound ? "found" : ""}`}>
            <span className="treasure-icon"><Icon name={treasureFound ? "check" : "chest"} size={25} /></span>
            <div><b>{treasureFound ? "Spiaggia esplorata" : "Qualcosa luccica sulla spiaggia…"}</b><span>{treasureFound ? "Il tesoro di questo approdo è nel tuo inventario." : "Tocca il forziere nel borgo e vai a scoprire cosa contiene."}</span></div>
            <span className="treasure-tag">{treasureFound ? "TROVATO" : "+90"}</span>
          </div>
          <div className="port-session-stats">
            <div><Icon name="fish" size={18} /><span><b>{cargoCount(p)}</b> in stiva</span></div>
            <div><Icon name="shield" size={18} /><span>Scafo <b>{Math.ceil(game.boat.hull)}%</b></span></div>
            <div><Icon name="sun" size={18} /><span><b>{game.mode==="free"?"∞":`${Math.ceil(game.timeLeft)}s`}</b> {game.mode==="free"?"viaggio libero":"di luce"}</span></div>
          </div>
        </section>}

        <section className="harbor-activities">
          <nav className="harbor-tabs" aria-label="Attività in porto">
            {TABS.map(t => <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}><Icon name={t.icon} size={18} /><span>{t.name}</span>{t.id === "missions" && mission && mission.progress >= mission.target && <i className="notification-dot" />}</button>)}
          </nav>
          <div className="activity-content" key={tab}>
            {tab === "market" && <>
              <div className="activity-title"><div><span className="eyebrow">FRESCO DI GIORNATA</span><h2>Dal mare al mercato</h2></div><Icon name="fish" size={31} /></div>
              <p className="activity-copy">Trasforma il pescato in monete. Il punteggio e le specie nel diario non si perdono.</p>
              {cargo.length > 0 ? <>
                <div className="market-list">
                  {cargo.map(([id, n]) => {
                    const sp = SPECIES[id], bonus = site.specialty.includes(id);
                    return <div className="market-row" key={id}>
                      <div className="market-fish"><FishPortrait id={id} /></div>
                      <div className="market-name"><b>{sp.name}</b><span>{n} {n === 1 ? "esemplare" : "esemplari"} {bonus && <em>+25% locale</em>}</span></div>
                      <span className="market-price">{money(Math.round(n * marketPrice(sp, site.specialty) * (1+p.upgrades.cargo*.12)))}<Icon name="coin" size={14} /></span>
                    </div>;
                  })}
                </div>
                <div className="market-total"><span>Valore della stiva <small>{cargoCount(p)} pesci{p.upgrades.cargo>0?` · +${p.upgrades.cargo*12}% stiva refrigerata`:""}</small></span><b>{money(total)} <Icon name="coin" size={22} /></b></div>
                <button className="shore-button sell-button" onClick={() => a.sell()}><Icon name="shop" size={20} /> Vendi tutto il pescato <Icon name="arrow" size={20} /></button>
              </> : <div className="empty-hold"><Icon name="fish" size={40} /><h3>La stiva è ancora vuota</h3><p>Salpa, riempi la rete e torna qui a vendere il tuo pescato.</p><span>Le specie protette vengono sempre rilasciate.</span></div>}
              <div className="local-demand"><Icon name="star" size={15} /><span>Qui paghiamo <b>+25%</b> per {site.specialty.map(id => SPECIES[id]?.name.toLowerCase()).filter(Boolean).slice(0, 3).join(", ")}.</span></div>
            </>}

            {tab === "shipyard" && <Shipyard game={game}/>}

            {tab === "missions" && <>
              <div className="activity-title"><div><span className="eyebrow">STORIE DAL MOLO</span><h2>C’è lavoro per te</h2></div><Icon name="scroll" size={30} /></div>
              <p className="activity-copy">Un incarico alla volta. Puoi ritirare la ricompensa in qualunque approdo.</p>
              {mission && <div className={`active-mission ${mission.progress >= mission.target ? "complete" : ""}`}>
                <span className="eyebrow">{mission.progress >= mission.target ? "INCARICO COMPLETATO" : "IL TUO INCARICO ATTIVO"}</span>
                <h3>{mission.title}</h3><p>{mission.description}</p>
                <div className="mission-meter"><span style={{ width: `${Math.min(100, mission.progress / mission.target * 100)}%` }} /></div>
                <div className="mission-bottom"><span>{mission.progress} / {mission.target}</span><b>{mission.reward} <Icon name="coin" size={14} /></b></div>
                {mission.progress >= mission.target ? <button className="shore-button mission-claim" onClick={() => a.claim()}><Icon name="check" size={18} /> Ritira la ricompensa</button> : <button className="abandon-mission" onClick={() => a.abandon()}>Rinuncia a questo incarico</button>}
              </div>}
              <div className="mission-list">
                {a.missions.map(m => <article key={m.id}><span className="mission-icon"><Icon name={m.kind === "rare" ? "star" : m.kind === "ports" ? "compass" : m.kind === "species" ? "fish" : "book"} size={23} /></span><div><h3>{m.title}</h3><p>{m.description}</p><span className="mission-reward">{m.reward} monete</span></div><button className="accept-mission" disabled={!!mission} onClick={() => a.accept(m)} aria-label={`Accetta ${m.title}`}><Icon name="arrow" size={19} /></button></article>)}
                {a.missions.length === 0 && <p className="activity-copy">Hai aiutato tutti qui! Un nuovo porto ha nuove storie da offrirti.</p>}
              </div>
            </>}

            {tab === "routes" && <>
              <div className="activity-title"><div><span className="eyebrow">IL MONDO TI ASPETTA</span><h2>Scegli un altro orizzonte</h2></div><Icon name="compass" size={30} /></div>
              <p className="activity-copy">Naviga liberamente, oppure prenota un passaggio marittimo per esplorare mari lontani.</p>
              <WorldChart selected={destination} onSelect={setDestination} visited={p.visited} />
              <label className="route-select"><span>Destinazione</span><select value={destination} onChange={e => setDestination(e.target.value)}>{PORTS.map(port => <option key={port.id} value={port.id}>{port.name} · {port.country}{p.visited.includes(port.id) ? " ✓" : ""}</option>)}</select></label>
              <div className="route-destination"><span className="destination-icon"><Icon name="pin" size={24} /></span><div><h3>{selected.name}</h3><p>{REGIONS[selected.region].name} · {coordinates(selected.x, selected.y)}</p></div><span className="route-cost">80 <Icon name="coin" size={16} /></span></div>
              <button className="shore-button" disabled={destination === site.id || p.coins < 80} onClick={() => a.travel(destination)}><Icon name="compass" size={20} />{destination === site.id ? "Sei già qui" : p.coins < 80 ? "Servono 80 monete" : `Salpa verso ${selected.name}`}<Icon name="arrow" size={20} /></button>
              <p className="map-disclaimer">Coste reali semplificate. Fauna e tempi di viaggio in stile arcade.</p>
            </>}
          </div>
        </section>
      </div>

      <footer className="harbor-footer"><div className="port-message" role="status"><Icon name="check" size={16} /><span>{a.message}</span></div><button className="return-to-sea" onClick={() => a.leave()}><Icon name={game.exploration.onFoot?"pin":"anchor"} size={18} /> {game.exploration.onFoot?"Torna a esplorare":"Torna in mare"} <span className="tiny-key">E</span></button></footer>
    </div>
  </div>;
}
