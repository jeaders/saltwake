import type { Game } from "../game/engine";
import { SPECIES_COUNT } from "../game/species";
import { REGIONS, WORLD_W } from "../game/world";
import { geographicDistance } from "./WorldAtlas";
import { POI_COLORS } from "../game/exploration";
import { Icon } from "./Icons";
import { mapRect } from "../game/hud";

function WaypointGuide({game}:{game:Game}){
  const ex=game.exploration,w=ex.waypoint;if(!w)return null;
  const p=game.focus;let dx=w.x-p.x;if(dx>WORLD_W/2)dx-=WORLD_W;else if(dx< -WORLD_W/2)dx+=WORLD_W;const angle=Math.atan2(w.y-p.y,dx)*180/Math.PI;const distance=geographicDistance(p.x,p.y,w.x,w.y);
  return <div className="waypoint-guide"><span className="waypoint-arrow" style={{transform:`rotate(${angle}deg)`}}><Icon name="arrow" size={24}/></span><div><span>DESTINAZIONE</span><b>{w.name}</b><small>{distance<1?"Qui vicino":`${Math.round(distance).toLocaleString("it-IT")} km · scala arcade`}</small></div><button onClick={()=>ex.clearWaypoint()} aria-label="Rimuovi destinazione"><Icon name="close" size={15}/></button></div>;
}
export function AdventureHud({ game }: { game: Game }) {
  const a=game.adventure,p=a.profile,ex=game.exploration,u=game.ui;
  const m=game.input.touchMode?14*u:18*u;
  const mission=p.active;
  const foot=ex.onFoot;
  const nearby=ex.nearest;
  const radar=mapRect(game.W,u,game.input.touchMode);
  const threat=game.threats.danger;
  const defenseReady=p.upgrades.defense>0&&game.threats.defenseCd<=0;
  return <div className="adventure-hud-layer">
    {foot?<>
      <div className="land-status" style={{left:m,top:m}}><span className="land-character-badge"><span className="avatar-hat"/><span className="avatar-head"/><span className="avatar-shirt"/></span><div><span className="eyebrow">IL TUO VIAGGIO · A PIEDI</span><h2>Capitano esploratore</h2><p>{REGIONS[game.regionIdx].name} · {game.clockText}</p></div></div>
      <div className="land-explorer-tools" style={{left:m,top:m+79}}>
        <div className="land-stamina"><span>ENERGIA</span><div><i style={{width:`${ex.person.stamina*100}%`}}/></div><Icon name="bolt" size={14}/></div>
        <span className="land-discoveries"><Icon name="map" size={15}/>{ex.discoveries} luoghi esplorati</span>
        <button onClick={()=>a.journal()}><Icon name="book" size={17}/>Diario delle specie<span className="hud-key">I</span></button>
        <button onClick={()=>ex.guideToBoat()}><Icon name="anchor" size={17}/>Indica la barca</button>
      </div>
      <div className="land-controls">
        <button className={`land-fish-button ${ex.fishing.phase===2?"bite":""}`} onClick={()=>ex.castLine()} aria-label="Pesca dalla riva"><Icon name="fish" size={23}/><b>{ex.fishing.phase===2?"Tira!":ex.fishing.phase===1?"Attendi…":"Pesca"}</b><span>F</span></button>
        <button className={`land-run-button ${game.input.boostLatch?"running":""}`} onClick={()=>{game.input.boostLatch=!game.input.boostLatch;a.onChange?.();}} aria-pressed={game.input.boostLatch}><Icon name="bolt" size={23}/><b>Corri</b><span>SHIFT</span></button>
        <button className="land-launch-button" disabled={!ex.launch} onClick={()=>ex.launchBoat()}><Icon name="anchor" size={29}/><span className="land-action-key">E</span><b>Salpa da qui</b></button>
      </div>
      {nearby?<div className="land-interaction" style={{borderColor:`${POI_COLORS[nearby.kind]}66`}}><span className="land-interaction-symbol" style={{color:POI_COLORS[nearby.kind]}}><Icon name={nearby.kind==="treasure"?"chest":nearby.kind==="port"?"shop":nearby.kind==="camp"?"leaf":"pin"} size={25}/></span><div><span>HAI TROVATO</span><b>{nearby.name}</b><small>{nearby.kind==="port"?"Mercato, cantiere e incarichi":nearby.kind==="camp"?"Riposa e ripara la barca":p.landmarks.includes(nearby.id)?"Luogo già esplorato":`Esplora · +${nearby.reward} monete`}</small></div><button onClick={()=>ex.interact()}>Interagisci<span className="tiny-key">SPAZIO</span></button></div>:<div className="land-travel-hint"><span className="tiny-key">WASD</span> cammina <span>·</span> tocca la terra per muoverti <span>·</span> <span className="tiny-key">F</span> pesca dalla riva <span>·</span> raggiungi una spiaggia per salpare</div>}
    </>:<>
      <div className="adventure-hud" style={{left:m,top:156*u+m,width:162*u,fontSize:12*u}}>
        <div className="sea-ship-title"><Icon name="anchor" size={13*u}/><span>{p.ship.name}</span></div>
        <div className="sea-wallet"><Icon name="coin" size={17*u}/><b>{p.coins.toLocaleString("it-IT")}</b><span>{a.hold} in stiva</span></div>
        <button onClick={()=>a.journal()}><Icon name="book" size={17*u}/><span>Diario <b>{a.speciesFound}/{SPECIES_COUNT}</b></span><span className="hud-key">I</span></button>
        <button className={a.baitT>0?"bait-active":""} onClick={()=>a.useBait()} disabled={!p.bait&&a.baitT<=0}><Icon name="bait" size={17*u}/><span>{a.baitT>0?`Pastura · ${Math.ceil(a.baitT)}s`:"Pastura"} <b>{a.baitT<=0?p.bait:""}</b></span><span className="hud-key">F</span></button>
        <button className="defense-control" onClick={()=>game.threats.repel()} disabled={!defenseReady} aria-label="Impulso dissuasore"><Icon name="shield" size={17*u}/><span>{p.upgrades.defense<1?"Difesa da installare":game.threats.defenseCd>0?`Difesa · ${Math.ceil(game.threats.defenseCd)}s`:"Impulso difensivo"}</span><span className="hud-key">H</span></button>
        <div className="ship-handling"><button className={game.cruising?"active":""} onClick={()=>game.toggleCruise()} aria-pressed={game.cruising}><Icon name="compass" size={14}/>Crociera<span>Q</span></button><button className={game.precision?"active":""} onClick={()=>game.togglePrecision()} aria-pressed={game.precision}><Icon name="anchor" size={14}/>Manovra<span>Z</span></button></div>
        {mission&&<div className={`sea-mission ${mission.progress>=mission.target?"completed":""}`}><Icon name={mission.progress>=mission.target?"check":"scroll"} size={14*u}/><div><b>{mission.progress>=mission.target?"Premio al porto!":mission.title}</b><span>{mission.progress}/{mission.target} · {mission.reward} monete</span></div></div>}
      </div>
      {threat&&!a.canDock&&<div className="threat-warning" role="status"><Icon name="shield" size={26}/><div><span>{threat.state===4?"CARICA IN PREPARAZIONE":threat.state===5?"SCHIVA ADESSO":"PREDATORE NELLE VICINANZE"}</span><b>{threat.sp.name}</b><small>{threat.state===4||threat.state===5?"Cambia direzione · SHIFT boost · X fiocina":"Tieniti a distanza e controlla il radar."}</small></div><button disabled={!defenseReady} onClick={()=>game.threats.repel()}>Difesa H</button></div>}
      {a.canDock&&<button className="dock-prompt" onClick={()=>a.dock()}><span className="dock-prompt-icon"><Icon name="anchor" size={24}/></span><span><b>{a.nearby?`Sbarca a piedi · ${a.nearby.name}`:"Sbarca ed esplora questa costa"}</b><small>La barca resta qui. Cammina e scegli da dove ripartire.</small></span><span className="dock-key">E</span></button>}
    </>}
    <div className={`explore-map-tools ${foot?"on-foot":""}`} style={{right:m,top:(m+50*u+Math.max(65,Math.min(110,game.W*.15))+54*u)}}><button className="open-world-map" aria-label="Mappa del mondo" onClick={()=>ex.atlas()}><Icon name="map" size={18}/><span>Mappa del mondo</span><span className="tiny-key">TAB</span></button><div className="view-zoom"><button onClick={()=>game.changeZoom(-1)} disabled={game.zoomLevel<=.56} aria-label="Allarga la visuale">−</button><span>Vista {Math.round(game.zoomLevel*100)}%</span><button onClick={()=>game.changeZoom(1)} disabled={game.zoomLevel>=1.59} aria-label="Avvicina la visuale">+</button></div></div>
    <div className="radar-zoom-controls" style={{right:game.W-radar.x-radar.w+6,top:radar.y+radar.h-29}}><span>ZOOM RADAR</span><button aria-label="Allarga minimappa" onClick={()=>{game.minimap.changeZoom(1);a.onChange?.();}}>−</button><button aria-label="Avvicina minimappa" onClick={()=>{game.minimap.changeZoom(-1);a.onChange?.();}}>+</button></div>
    <WaypointGuide game={game}/>
  </div>;
}
