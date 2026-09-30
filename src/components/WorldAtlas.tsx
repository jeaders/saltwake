import { useRef, useState } from "react";
import type { Game } from "../game/engine";
import { LANDS, WORLD_H, WORLD_W, isOnLand, x2lon, y2lat } from "../game/world";
import { PORTS, coordinates } from "../game/ports";
import { POI_COLORS } from "../game/exploration";
import { Icon } from "./Icons";

const landPaths=LANDS.map(L=>{
  const pts=L.pts;const stride=pts.length>26000?8:pts.length>2200?4:2;
  let d=`M${(pts[0]/WORLD_W*900).toFixed(3)} ${(pts[1]/WORLD_H*450).toFixed(3)}`;
  for(let i=2;i<pts.length;i+=stride)d+=`L${(pts[i]/WORLD_W*900).toFixed(3)} ${(pts[i+1]/WORLD_H*450).toFixed(3)}`;
  return d+"Z";
});
export function geographicDistance(x1:number,y1:number,x2:number,y2:number) {
  const rad=Math.PI/180,a=y2lat(y1)*rad,b=y2lat(y2)*rad;
  const dlat=b-a,dlon=(x2lon(x2)-x2lon(x1))*rad;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dlon/2)**2)));
}
export function WorldAtlas({game}:{game:Game}) {
  const ex=game.exploration,actor=game.focus;
  const initial=ex.waypoint||{x:actor.x,y:actor.y,name:"La tua posizione"};
  const [selected,setSelected]=useState(initial);
  const [view,setView]=useState({x:0,y:0,w:900,h:450});
  const [tab,setTab]=useState<"ports"|"land">("ports");
  const svg=useRef<SVGSVGElement>(null);
  const drag=useRef<{x:number;y:number;vx:number;vy:number;moved:boolean;id:number}|null>(null);
  const scale=view.w/900;
  const mx=(x:number)=>x/WORLD_W*900,my=(y:number)=>y/WORLD_H*450;
  const distance=geographicDistance(actor.x,actor.y,selected.x,selected.y);
  const zoom=(direction:number)=>{
    const w=Math.max(35,Math.min(900,view.w*(direction>0?.62:1.62))),h=w/2;
    const cx=direction>0?mx(selected.x):view.x+view.w/2,cy=direction>0?my(selected.y):view.y+view.h/2;
    setView({x:Math.max(0,Math.min(900-w,cx-w/2)),y:Math.max(0,Math.min(450-h,cy-h/2)),w,h});
  };
  const place=(clientX:number,clientY:number)=>{
    const s=svg.current!;const p=s.createSVGPoint();p.x=clientX;p.y=clientY;
    const q=p.matrixTransform(s.getScreenCTM()!.inverse());
    const x=Math.max(0,Math.min(WORLD_W,q.x/900*WORLD_W)),y=Math.max(0,Math.min(WORLD_H,q.y/450*WORLD_H));
    setSelected({x,y,name:isOnLand(x,y)?"Esplora questa terra":"Rotta in mare aperto"});
  };
  const centerActor=()=>{
    setSelected({x:actor.x,y:actor.y,name:"La tua posizione"});
    const w=90,h=45;
    setView({x:Math.max(0,Math.min(900-w,mx(actor.x)-w/2)),y:Math.max(0,Math.min(450-h,my(actor.y)-h/2)),w,h});
  };
  return <div className="overlay atlas-overlay" role="dialog" aria-modal="true" aria-label="Mappa del viaggio">
    <div className="atlas-shell anim-pop">
      <header className="atlas-header"><div className="atlas-logo"><span><Icon name="compass" size={29}/></span><div><span className="eyebrow">IL MONDO È LA TUA ROTTA</span><h1>Atlante del viaggio</h1></div></div><div className="atlas-mode"><i/>{ex.onFoot?"Esplorazione a piedi":game.mode==="free"?"Navigazione libera":"Sfida a tempo"}</div><button className="icon-button" onClick={()=>ex.closeAtlas()} aria-label="Chiudi mappa"><Icon name="close"/></button></header>
      <div className="atlas-layout">
        <section className="atlas-map-column">
          <div className="atlas-map-tools"><span><Icon name="map" size={15}/>Coste reali · mondo 6× più ampio</span><div><button onClick={centerActor} aria-label="Centra la tua posizione"><Icon name="pin" size={18}/></button><button onClick={()=>zoom(-1)} disabled={view.w>=900} aria-label="Riduci zoom mappa">−</button><button onClick={()=>zoom(1)} disabled={view.w<=35} aria-label="Aumenta zoom mappa">+</button><button onClick={()=>setView({x:0,y:0,w:900,h:450})} aria-label="Mostra tutto il mondo"><Icon name="map" size={16}/></button></div></div>
          <div className="atlas-map-stage">
            <svg ref={svg} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} className="atlas-world" aria-label="Trascina per esplorare il planisfero, tocca per segnare una destinazione"
              onPointerDown={e=>{drag.current={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,moved:false,id:e.pointerId};}}
              onPointerMove={e=>{
                const d=drag.current;if(!d||d.id!==e.pointerId)return;
                const dx=e.clientX-d.x,dy=e.clientY-d.y;
                if(Math.hypot(dx,dy)>5){d.moved=true;e.currentTarget.setPointerCapture(e.pointerId);}
                if(d.moved){const rect=e.currentTarget.getBoundingClientRect();setView(v=>({...v,x:Math.max(0,Math.min(900-v.w,d.vx-dx/rect.width*v.w)),y:Math.max(0,Math.min(450-v.h,d.vy-dy/rect.height*v.h))}));}
              }}
              onPointerUp={e=>{const d=drag.current;drag.current=null;if(!d?.moved&&!(e.target as SVGElement).closest("[data-port]"))place(e.clientX,e.clientY);}}
              onPointerCancel={()=>drag.current=null}
            >
              <defs><radialGradient id="atlas-ocean"><stop stopColor="#315f73"/><stop offset="1" stopColor="#112d44"/></radialGradient><linearGradient id="atlas-land" x2="0" y2="1"><stop stopColor="#e6ddae"/><stop offset="1" stopColor="#9dba9d"/></linearGradient></defs>
              <rect width="900" height="450" fill="url(#atlas-ocean)"/>
              <g stroke="#a6d4cd" strokeOpacity=".12" strokeWidth={.7*scale}>{Array.from({length:13},(_,i)=><path key={`v${i}`} d={`M${i*75} 0v450`}/>)}{Array.from({length:7},(_,i)=><path key={`h${i}`} d={`M0 ${i*75}h900`}/>)}</g>
              <g fill="url(#atlas-land)" stroke="#7b9c89" strokeWidth={.4*scale}>{landPaths.map((d,i)=><path key={i} d={d}/>)}</g>
              {view.w>300&&<g fontSize="10" fontWeight="500" fill="#254a44" textAnchor="middle" letterSpacing="3" opacity=".7"><text x="225" y="135">AMERICA</text><text x="310" y="300">AMERICA</text><text x="485" y="119">EUROPA</text><text x="511" y="231">AFRICA</text><text x="664" y="134">ASIA</text><text x="795" y="327">OCEANIA</text><text x="450" y="425">ANTARTIDE</text></g>}
              <path d={`M${mx(actor.x)} ${my(actor.y)}L${mx(selected.x)} ${my(selected.y)}`} stroke="#f4d598" strokeWidth={1.6*scale} strokeDasharray={`${4*scale} ${5*scale}`} opacity=".75" fill="none"/>
              {PORTS.map(p=><g data-port={p.id} key={p.id} tabIndex={0} role="button" aria-label={`Segna ${p.name}`} className="atlas-port" onClick={e=>{e.stopPropagation();setSelected({x:p.x,y:p.y,name:p.name});}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();setSelected({x:p.x,y:p.y,name:p.name});}}}>
                <circle cx={mx(p.x)} cy={my(p.y)} r={11*scale} fill="transparent"/><circle cx={mx(p.x)} cy={my(p.y)} r={3.8*scale} fill={game.adventure.profile.visited.includes(p.id)?"#a9e5bf":"#ffe0a4"} stroke="#193c43" strokeWidth={1.5*scale}/>
                {view.w<450&&<text x={mx(p.x)+7*scale} y={my(p.y)+3*scale} fontSize={10*scale} fill="#f5dfb3" stroke="#173447" strokeWidth={2*scale} paintOrder="stroke">{p.name}</text>}
              </g>)}
              {ex.onFoot&&ex.visible.map(v=><circle key={v.id} cx={mx(v.x)} cy={my(v.y)} r={4*scale} fill={POI_COLORS[v.kind]} stroke="#163b43" strokeWidth={scale}/>)}
              {ex.onFoot&&<g><circle cx={mx(game.boat.x)} cy={my(game.boat.y)} r={5*scale} fill="#93d7e5" stroke="#173a41" strokeWidth={1.5*scale}/><text x={mx(game.boat.x)+8*scale} y={my(game.boat.y)+3*scale} fontSize={9*scale} fill="#ceeafa">Barca</text></g>}
              <circle cx={mx(actor.x)} cy={my(actor.y)} r={10*scale} fill="#fa987b" opacity=".23"/><circle cx={mx(actor.x)} cy={my(actor.y)} r={4.7*scale} fill="#fb9e80" stroke="#fff0d0" strokeWidth={1.7*scale}/>
              <g transform={`translate(${mx(selected.x)},${my(selected.y)})`} pointerEvents="none"><circle r={8*scale} stroke="#ffe4a5" strokeWidth={1.6*scale} fill="none"/><path d={`M${-12*scale} 0H${12*scale}M0 ${-12*scale}V${12*scale}`} stroke="#ffe4a5" strokeWidth={1.2*scale}/></g>
            </svg>
            <div className="atlas-map-badge"><span className="map-dot"/> TU SEI QUI <span>·</span> {coordinates(actor.x,actor.y)}</div>
          </div>
          <div className="atlas-legend"><span><i style={{background:"#ffb190"}}/>La tua posizione</span><span><i style={{background:"#ffe0a4"}}/>Porti</span><span><i style={{background:"#a8e4bb"}}/>Visitati</span><span className="atlas-gesture">Trascina per spostarti · tocca per segnare</span></div>
          <div className="atlas-selected"><span className="atlas-selected-icon"><Icon name="pin" size={25}/></span><div><span className="eyebrow">DESTINAZIONE SELEZIONATA</span><h2>{selected.name}</h2><p>{coordinates(selected.x,selected.y)} · {distance<1?"Qui vicino":`${Math.round(distance).toLocaleString("it-IT")} km geografici`}</p></div><button onClick={()=>{ex.setWaypoint(selected.x,selected.y,selected.name);ex.closeAtlas();}} className="mark-destination"><Icon name="compass" size={18}/>Segna destinazione<Icon name="arrow" size={17}/></button></div>
        </section>
        <aside className="atlas-sidebar"><div className="atlas-sidebar-tabs"><button className={tab==="ports"?"active":""} onClick={()=>setTab("ports")}>Porti del mondo</button><button className={tab==="land"?"active":""} onClick={()=>setTab("land")}>Luoghi vicini</button></div>
          {tab==="ports"?<div className="atlas-place-list">{PORTS.map(p=><button key={p.id} className={selected.name===p.name?"selected":""} onClick={()=>setSelected({x:p.x,y:p.y,name:p.name})}><Icon name="anchor" size={17}/><div><b>{p.name}</b><span>{p.country}</span></div>{game.adventure.profile.visited.includes(p.id)?<Icon name="check" size={15}/>:<Icon name="arrow" size={15}/>}</button>)}</div>:<div className="atlas-place-list">{ex.visible.map(v=><button key={v.id} onClick={()=>setSelected({x:v.x,y:v.y,name:v.name})}><Icon name={v.kind==="treasure"?"chest":v.kind==="port"?"shop":v.kind==="camp"?"leaf":"pin"} size={18}/><div><b>{v.name}</b><span>{game.adventure.profile.landmarks.includes(v.id)?"Esplorato":"Da esplorare"}</span></div><Icon name="arrow" size={15}/></button>)}{!ex.visible.length&&<p className="atlas-empty">Sbarca su una costa per scoprire accampamenti, fari e tesori.</p>}</div>}
          <div className="atlas-tip"><Icon name="compass" size={20}/><div><b>La mappa non è un confine.</b><p>Naviga in ogni oceano, sbarca dove preferisci e scegli una nuova spiaggia da cui ripartire. Gli indicatori mostrano la direzione, non aggirano automaticamente la terra.</p></div></div>
          {ex.waypoint&&<button className="clear-destination" onClick={()=>{ex.clearWaypoint();setSelected({x:actor.x,y:actor.y,name:"La tua posizione"});}}>Rimuovi destinazione attuale</button>}
        </aside>
      </div>
      <footer className="atlas-footer"><span><Icon name="check" size={15}/>Il viaggio libero viene salvato automaticamente.</span><button onClick={()=>ex.closeAtlas()}>Torna al viaggio <span className="tiny-key">TAB</span></button></footer>
    </div>
  </div>;
}
