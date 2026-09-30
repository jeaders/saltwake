import { useEffect, useRef, useState } from "react";
import type { Game } from "../game/engine";
import { UPGRADE_ORDER, UPGRADES, type UpgradeGroup } from "../game/upgrades";
import { HULL_PAINTS, CABIN_PAINTS, FLAGS, SHIP_MODELS, type HullPaint, type CabinPaint, type FlagColor, type ShipModel } from "../game/ship";
import { paintShip } from "../game/ship-drawing";
import { Icon } from "./Icons";

function ShipPreview({game}:{game:Game}){
  const ref=useRef<HTMLCanvasElement>(null),p=game.adventure.profile;
  const signature=JSON.stringify([p.ship,p.upgrades]);
  useEffect(()=>{
    const c=ref.current;if(!c)return;const g=c.getContext("2d")!;
    c.width=720;c.height=470;g.clearRect(0,0,720,470);
    // Small trailing ripples stay beneath the actual custom ship model.
    g.strokeStyle="rgba(184,222,208,.16)";g.lineWidth=2;
    g.beginPath();for(let i=0;i<5;i++){g.moveTo(40+i*18,220+i*9);g.quadraticCurveTo(175,250,254+i*7,259+i*3);}g.stroke();
    g.fillStyle="rgba(3,26,42,.25)";g.beginPath();g.ellipse(366,268,190,51,-.25,0,Math.PI*2);g.fill();
    g.save();g.translate(368,231);g.rotate(-.28);g.scale(5.4,5.4);paintShip(g,p.ship,p.upgrades,.48);g.restore();
  },[signature,p]);
  return <div className="fleet-preview"><div className="fleet-chart-grid"/><div className="fleet-preview-meta"><span>DISEGNO DELLA TUA NAVE</span><span>N ↑</span></div><canvas ref={ref} aria-label={`Anteprima della nave ${p.ship.name}`} className="fleet-preview-canvas"/><span className="fleet-preview-caption">{SHIP_MODELS[p.ship.model].name} · costruita per esplorare</span><div className="fleet-preview-mark"><Icon name="anchor" size={15}/> SALTWAKE SHIPYARD</div></div>;
}

export function Shipyard({game}:{game:Game}){
  const a=game.adventure,p=a.profile;
  const [name,setName]=useState(p.ship.name);
  const [group,setGroup]=useState<UpgradeGroup|"all">("all");
  const total=UPGRADE_ORDER.reduce((n,id)=>n+p.upgrades[id],0);
  const groups:{id:UpgradeGroup|"all";label:string;icon:string}[]=[{id:"all",label:"Tutti",icon:"wrench"},{id:"fishing",label:"Pesca",icon:"fish"},{id:"navigation",label:"Viaggio",icon:"compass"},{id:"safety",label:"Protezione",icon:"shield"}];
  const systems=UPGRADE_ORDER.filter(id=>group==="all"||UPGRADES[id].group===group);
  return <div className="fleet-workshop" data-block-gamekeys>
    <header className="fleet-workshop-title"><div><span className="eyebrow">IL TUO CANTIERE · LA TUA IDENTITÀ</span><h2>Falla diventare la tua nave.</h2><p>Un nuovo colore, un motore migliore, il prossimo orizzonte.</p></div><div className="fleet-saved"><Icon name="check" size={16}/><span>Configurazione salvata<br/><b>{total}/36 potenziamenti</b></span></div></header>
    <div className="fleet-workshop-layout">
      <section className="fleet-design">
        <ShipPreview game={game}/>
        <label className="fleet-name-label"><span>IL NOME SULLO SCAFO</span><div><Icon name="anchor" size={18}/><input value={name} maxLength={24} aria-label="Nome della nave" spellCheck={false} onChange={e=>setName(e.target.value)} onBlur={()=>{a.customize({name});setName(a.profile.ship.name);}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/><Icon name="check" size={14}/></div></label>
        <div className="fleet-design-section"><div className="fleet-control-title"><b>Il modello</b><span>Stesso ingombro, stile diverso</span></div><div className="fleet-models">{(Object.keys(SHIP_MODELS) as ShipModel[]).map(id=><button key={id} className={p.ship.model===id?"selected":""} aria-pressed={p.ship.model===id} onClick={()=>a.customize({model:id})}><Icon name={id==="explorer"?"compass":id==="cabin"?"shop":"anchor"} size={18}/><span>{SHIP_MODELS[id].name}</span></button>)}</div></div>
        <div className="fleet-design-section"><div className="fleet-control-title"><b>Colore dello scafo</b><span>{HULL_PAINTS[p.ship.hull].name}</span></div><div className="fleet-swatches">{(Object.keys(HULL_PAINTS) as HullPaint[]).map(id=><button key={id} className={p.ship.hull===id?"selected":""} style={{"--swatch":HULL_PAINTS[id].color} as React.CSSProperties} onClick={()=>a.customize({hull:id})} aria-pressed={p.ship.hull===id} aria-label={`Scafo ${HULL_PAINTS[id].name}`} title={HULL_PAINTS[id].name}>{p.ship.hull===id&&<Icon name="check" size={16}/>}</button>)}</div></div>
        <div className="fleet-small-controls"><div><span className="fleet-small-label">CABINA</span><div className="fleet-swatches small">{(Object.keys(CABIN_PAINTS) as CabinPaint[]).map(id=><button key={id} className={p.ship.cabin===id?"selected":""} style={{"--swatch":CABIN_PAINTS[id].color} as React.CSSProperties} onClick={()=>a.customize({cabin:id})} aria-label={`Cabina ${CABIN_PAINTS[id].name}`} aria-pressed={p.ship.cabin===id}>{p.ship.cabin===id&&<Icon name="check" size={13}/>}</button>)}</div></div><div><span className="fleet-small-label">BANDIERA</span><div className="fleet-swatches small">{(Object.keys(FLAGS) as FlagColor[]).map(id=><button key={id} className={p.ship.flag===id?"selected":""} style={{"--swatch":FLAGS[id].color} as React.CSSProperties} onClick={()=>a.customize({flag:id})} aria-label={`Bandiera ${FLAGS[id].name}`} aria-pressed={p.ship.flag===id}>{p.ship.flag===id&&<Icon name="check" size={13}/>}</button>)}</div></div></div>
        <p className="fleet-design-note"><Icon name="check" size={13}/>Personalizzazione gratuita, visibile anche in mare.</p>
      </section>
      <section className="fleet-systems">
        <div className="fleet-system-stats"><div><Icon name="bolt" size={17}/><span>Potenza<b>+{p.upgrades.engine*12}%</b></span></div><div><Icon name="shield" size={17}/><span>Danni<b>−{p.upgrades.hull*15}%</b></span></div><div><Icon name="coin" size={17}/><span>Ricavi<b>+{p.upgrades.cargo*12}%</b></span></div></div>
        <div className="fleet-system-heading"><div><h3>Ogni pezzo fa la differenza</h3><p>12 sistemi · 3 livelli · progressi permanenti</p></div><span className="fleet-budget"><Icon name="coin" size={17}/>{p.coins.toLocaleString("it-IT")}</span></div>
        <nav className="fleet-system-tabs" aria-label="Categorie dei potenziamenti">{groups.map(t=><button key={t.id} className={group===t.id?"active":""} onClick={()=>setGroup(t.id)}><Icon name={t.icon} size={15}/>{t.label}</button>)}</nav>
        <div className="fleet-upgrade-list">{systems.map(id=>{
          const u=UPGRADES[id],level=p.upgrades[id],max=level===3,cost=u.costs[level],afford=!max&&p.coins>=cost;
          return <article className={`fleet-system-card ${max?"maxed":""}`} key={id}>
            <div className="fleet-card-head"><span className="fleet-part-icon" style={{color:u.color}}><Icon name={u.icon} size={21}/></span><span className="fleet-level-indicator">{[1,2,3].map(l=><i key={l} style={l<=level?{background:u.color}:undefined}/>)}<small>{level}/3</small></span></div>
            <h4>{u.name}</h4><p>{u.detail}</p>
            <div className="fleet-next-effect"><span>{max?"CONFIGURAZIONE MASSIMA":"PROSSIMO LIVELLO"}</span><b style={{color:u.color}}>{u.effect(max?3:level+1)}</b></div>
            <button aria-label={max?`${u.name} al massimo`:`Potenzia ${u.name} al livello ${level+1}`} disabled={!afford} onClick={()=>a.upgrade(id)} className="fleet-buy">{max?<><Icon name="check" size={14}/><span>Completato</span></>:<><span>{afford?"Installa":"Monete insufficienti"}</span><b>{cost}<Icon name="coin" size={13}/></b></>}</button>
          </article>;
        })}</div>
        <div className="fleet-supply-row"><span>Prima di salpare</span><button disabled={p.coins<35||game.boat.hull>=100||a.services.has("repair")} onClick={()=>a.supply("repair")}><Icon name="shield" size={15}/>Ripara<small>35 ◉</small></button><button disabled={p.coins<55||p.bait>=97} onClick={()=>a.supply("bait")}><Icon name="bait" size={15}/>3 pastura<small>55 ◉</small></button>{game.mode==="challenge"&&<button disabled={p.coins<40||game.timeLeft>=129||a.services.has("daylight")} onClick={()=>a.supply("daylight")}><Icon name="sun" size={15}/>+30s<small>40 ◉</small></button>}</div>
      </section>
    </div>
  </div>;
}
