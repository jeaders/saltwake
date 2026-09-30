import { useMemo, useState } from "react";
import type { CaptainProgress } from "../game/progress";
import { marketPrice } from "../game/progress";
import { SPECIES_COUNT, SPECIES_LIST } from "../game/species";
import { REGIONS } from "../game/world";
import { Icon } from "./Icons";
import { FishPortrait } from "./FishPortrait";

export function Journal({ profile, onClose }: { profile: CaptainProgress; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [region, setRegion] = useState("all");
  const [selected, setSelected] = useState(() => Object.keys(profile.book)[0] || "sardine");
  const all = useMemo(() => [...SPECIES_LIST].sort((a,b) => a.tier - b.tier || a.name.localeCompare(b.name, "it")), []);
  const visible = [...all].sort((a, b) => Number(!!profile.book[b.id]) - Number(!!profile.book[a.id])).filter(sp => {
    const matchesRegion = region === "all" || REGIONS.find(r => r.id === region)?.fish.some(([id]) => id === sp.id) || REGIONS.find(r => r.id === region)?.predators?.includes(sp.id);
    return matchesRegion && sp.name.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || filter === "found" && !!profile.book[sp.id] || filter === "legendary" && sp.tier === 3);
  });
  const sp = SPECIES_LIST.find(s => s.id === selected)!;
  const record = profile.book[sp.id];
  const discovered = Object.keys(profile.book).length;
  const legendary = SPECIES_LIST.filter(s => s.tier === 3 && profile.book[s.id]).length;
  const habitats = REGIONS.filter(r => r.fish.some(([id]) => id === sp.id) || (r.predators || [r.predator]).includes(sp.id));
  const rarity = ["", "Comune", "Rara", "Leggendaria"];
  return <div className="overlay journal-overlay" role="dialog" aria-modal="true" aria-label="Diario delle specie">
    <div className="journal-shell anim-pop">
      <header className="journal-header"><div className="journal-title"><Icon name="book" size={31} /><div><span className="eyebrow">OGNI INCONTRO È UNA STORIA</span><h1>Diario delle specie</h1></div></div><div className="journal-counter"><b>{discovered}</b> / {SPECIES_COUNT}<span>specie scoperte</span></div><button className="icon-button" onClick={onClose} aria-label="Chiudi diario"><Icon name="close" /></button></header>
      <div className="journal-layout">
        <aside className="fish-detail" key={sp.id}>
          <span className={`rarity-badge rarity-${sp.tier}`}><Icon name={sp.tier === 3 ? "star" : "fish"} size={14} />{rarity[sp.tier]}</span>
          <div className="detail-portrait"><div className="fish-aura" /><FishPortrait id={sp.id} large /><span className="portrait-waterline" /></div>
          <span className="eyebrow">{record ? "INCONTRO REGISTRATO" : "ANCORA DA SCOPRIRE"}</span>
          <h2>{sp.name}</h2>
          <p className="fish-description">{sp.note || (sp.predator ? "Un incontro da non sottovalutare. Il sonar ti aiuta a individuarlo: mantieni le distanze." : "Un abitante dei mari di Saltwake. Scoprilo durante i tuoi viaggi e aggiungilo al diario.")}</p>
          <div className="fish-facts"><div><span>Incontri</span><b>{record?.count || "—"}</b></div><div><span>Punti base</span><b>{sp.value}</b></div><div><span>{sp.protected ? "Ricerca" : "Mercato"}</span><b>{sp.protected ? <Icon name="leaf" size={20} /> : `${marketPrice(sp)} ◉`}</b></div></div>
          <h3><Icon name="map" size={16} /> Dove cercarlo</h3>
          <div className="habitat-tags">{habitats.map(r => <button key={r.id} onClick={() => { setRegion(r.id); setFilter("all"); setSearch(""); }}>{r.name}</button>)}</div>
          <div className="fish-method"><Icon name={sp.protected ? "leaf" : sp.tier === 3 ? "sonar" : "net"} size={18} /><span>{sp.protected ? "Specie protetta: registra l’incontro e rilasciala. Non entra nella stiva." : sp.tier === 3 ? "Usa sonar e fiocina: è troppo grande per la rete." : "Rete per i banchi · pastura per avvicinarli."}</span></div>
          <div className="journal-overall"><span><Icon name="fish" size={15} /> {profile.totalCatch} incontri totali</span><span><Icon name="star" size={15} /> {legendary} leggendarie</span></div>
        </aside>
        <section className="journal-collection">
          <div className="journal-tools"><label className="journal-search"><Icon name="search" size={18} /><input type="search" placeholder="Cerca una specie…" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Filtra per mare" value={region} onChange={e => setRegion(e.target.value)}><option value="all">Tutti i 16 mari</option>{REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div className="collection-filters"><div>{[["all", "Tutte"], ["found", "Scoperte"], ["legendary", "Leggendarie"]].map(([id,label]) => <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>{label}</button>)}</div><span>{visible.length} specie</span></div>
          <div className="fish-gallery">
            {visible.map(f => {
              const known = !!profile.book[f.id];
              return <button key={f.id} className={`fish-card ${known ? "discovered" : "undiscovered"} ${selected === f.id ? "selected" : ""} rarity-${f.tier}`} onClick={() => setSelected(f.id)} aria-label={`${f.name}${known ? ", scoperta" : ", da scoprire"}`}>
                <div className="fish-card-meta"><span>{String(SPECIES_LIST.indexOf(f) + 1).padStart(2, "0")}</span><span>{f.tier === 3 ? <Icon name="star" size={12} /> : f.tier === 2 ? "••" : "•"}</span></div>
                <div className="fish-card-portrait"><FishPortrait id={f.id} silhouette={!known} />{!known && <span className="unknown-fish">?</span>}</div>
                <b>{known ? f.name : "Da scoprire"}</b><span className="fish-card-count">{known ? `${profile.book[f.id].count} incontri` : rarity[f.tier]}</span>
              </button>;
            })}
            {visible.length === 0 && <div className="no-fish-results"><Icon name="search" size={35} /><h3>Nessuna specie trovata</h3><p>Prova un altro nome o un altro mare.</p><button onClick={() => {setSearch("");setRegion("all");setFilter("all");}}>Mostra tutte le specie</button></div>}
          </div>
          <footer className="collection-footer"><Icon name="check" size={15} /><span>Il diario e i tuoi progressi sono salvati su questo dispositivo.</span><button onClick={onClose}>Chiudi <span className="tiny-key">I</span></button></footer>
        </section>
      </div>
    </div>
  </div>;
}
