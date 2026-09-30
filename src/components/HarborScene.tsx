import { useEffect, useRef } from "react";
import { REGIONS } from "../game/world";
import type { DockSite } from "../game/ports";

export type ShorePlace = "market" | "shipyard" | "missions" | "treasure";
const SPOTS: { id: ShorePlace; x: number; name: string; color: string }[] = [
  { id: "treasure", x: 68, name: "Spiaggia", color: "#ffe198" },
  { id: "market", x: 268, name: "Mercato", color: "#ffb190" },
  { id: "shipyard", x: 465, name: "Cantiere", color: "#a7eac4" },
  { id: "missions", x: 626, name: "Incarichi", color: "#d7cbff" },
];

/** A tiny playable quay: smooth on-foot movement, keyboard or tap-to-walk. */
export function HarborScene({ site, treasureFound, onInteract }: { site: DockSite; treasureFound: boolean; onInteract: (place: ShorePlace) => void }) {
  const svg = useRef<SVGSVGElement>(null), captain = useRef<SVGGElement>(null), feet = useRef<SVGGElement>(null);
  const position = useRef({ x: 145, y: 274 });
  const target = useRef<{ x: number; y: number; action?: ShorePlace } | null>(null);
  const callback = useRef(onInteract);
  callback.current = onInteract;
  const cold = REGIONS[site.region].weather === "snow";
  useEffect(() => {
    const keys = new Set<string>();
    const movement = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        const nearby = SPOTS.find(s => Math.abs(s.x - position.current.x) < 42);
        if (nearby) callback.current(nearby.id);
      }
      if (movement.has(e.code)) { e.preventDefault(); keys.add(e.code); target.current = null; }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    let raf = 0, last = performance.now(), t = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000); last = now;
      const p = position.current;
      let dx = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
      let dy = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
      const dest = target.current;
      if (!dx && !dy && dest) {
        dx = dest.x - p.x; dy = dest.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 6) {
          p.x = dest.x; p.y = dest.y;
          target.current = null;
          if (dest.action) callback.current(dest.action);
          dx = dy = 0;
        }
      }
      const d = Math.hypot(dx, dy);
      if (d > 0) {
        const step = Math.min(165 * dt, dest ? d : 165 * dt);
        p.x = Math.max(38, Math.min(680, p.x + dx / d * step));
        p.y = Math.max(251, Math.min(286, p.y + dy / d * step));
        t += dt * 14;
      }
      captain.current?.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
      feet.current?.setAttribute("transform", `rotate(${d > 0 ? Math.sin(t) * 13 : 0})`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);

  const walk = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    target.current = { x: Math.max(38, Math.min(680, (e.clientX - r.left) / r.width * 720)), y: 274 };
  };
  const select = (place: ShorePlace, x: number) => { target.current = { x, y: 268, action: place }; };
  return <div className="harbor-scene-wrap">
    <svg ref={svg} viewBox="0 0 720 380" className="harbor-scene" aria-label="Borgo sul porto. Cammina con WASD o tocca il luogo che vuoi visitare." onClick={walk}>
      <defs>
        <linearGradient id="harbor-sky" x2="0" y2="1"><stop stopColor={cold ? "#b6d8f0" : "#edc5a0"} /><stop offset="1" stopColor={cold ? "#e6f5fc" : "#fff2cd"} /></linearGradient>
        <linearGradient id="harbor-water" x2="0" y2="1"><stop stopColor="#42bdbb" /><stop offset="1" stopColor="#217f9c" /></linearGradient>
        <linearGradient id="harbor-quay" x2="0" y2="1"><stop stopColor="#efd9b5" /><stop offset="1" stopColor="#d6bc9b" /></linearGradient>
        <pattern id="paving" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 0h40v20H0zm20 0v20" stroke="#b99776" strokeOpacity=".25" fill="none" /></pattern>
      </defs>
      <rect width="720" height="380" fill="url(#harbor-sky)" />
      <circle cx="120" cy="81" r="34" fill="#fff2b5" opacity=".9" />
      <path d="M0 167 130 100 219 155 312 91 427 157 552 84 720 161v110H0Z" fill={cold ? "#83a6b0" : "#96aba0"} />
      <path d="M0 189 152 145 233 183 386 133 483 180 608 145 720 181v87H0Z" fill={cold ? "#a5c2c6" : "#b8bea1"} />
      <g fill="none" stroke="#735f5a" strokeWidth="2" strokeLinecap="round" opacity=".65">
        <path d="M371 65q7-6 14 0 7-6 14 0M513 95q5-4 10 0 5-4 10 0M560 46q6-5 12 0 6-5 12 0" />
      </g>
      {/* Lighthouse and terraced village */}
      <g transform="translate(44,98)">
        <path d="M-17 141h61L28 13H0Z" fill="#fff0d3" stroke="#bc9b7a" strokeWidth="2" />
        <path d="M-3 49h35l3 20H-5Z" fill="#e18566" /><path d="M-8 96h48l2 20H-11Z" fill="#e18566" />
        <rect x="-2" y="0" width="31" height="18" rx="3" fill="#375769" /><path d="M-6 0 14-17 34 0Z" fill="#be6050" />
        <rect x="8" y="4" width="11" height="11" fill="#ffd67e" />
      </g>
      <g stroke="#b68c6e" strokeWidth="1.5">
        <path d="M125 241V143h82v98" fill="#eedcbf" />
        <path d="m117 144 48-25 50 25" fill="#c47760" />
        <rect x="198" y="166" width="56" height="75" fill="#efb091" />
        <path d="m194 166 33-16 33 16" fill="#ab655a" />
        <rect x="336" y="139" width="65" height="102" fill="#edceb0" />
        <path d="m330 139 38-23 39 23" fill="#b97962" />
        <rect x="390" y="169" width="60" height="72" fill="#f6e6c7" />
        <rect x="535" y="155" width="52" height="88" fill="#edb4a2" />
        <path d="m529 155 30-20 35 20" fill="#b06359" />
        <rect x="668" y="171" width="54" height="72" fill="#e8ccac" />
      </g>
      <g fill="#517b7b">
        {[145, 176, 353, 377, 547, 568].map((x,i) => <g key={x}><rect x={x} y={i < 4 ? 165 : 179} width="10" height="17" rx="3" /><rect x={x} y={i < 4 ? 203 : 212} width="10" height="17" rx="3" /></g>)}
      </g>
      <g stroke="#a7a389" strokeWidth="1.3" fill="none"><path d="M117 190q71 24 140 4M342 178q47 16 113 12" /></g>
      <g fill="#f5ede0"><path d="M159 197h20v17h-20zM198 200h13v14h-13zM377 189h18v14h-18z" /></g>
      {/* Waterfront shops */}
      <g transform="translate(223,163)">
        <rect width="96" height="83" rx="4" fill="#ffedcf" stroke="#bc9877" strokeWidth="2" />
        <rect x="10" y="31" width="76" height="41" rx="3" fill="#647b71" />
        <path d="M-7 22h110l-11 19H4Z" fill="#e57661" />
        <path d="M14 22h15l-1 19H10zm31 0h15l2 19H43zm32 0h15l8 19H81" fill="#fff0d3" />
        <rect x="10" y="57" width="76" height="20" fill="#d6af7e" />
        <g fill="#8ed5d0" stroke="#4c7678" strokeWidth="1"><ellipse cx="28" cy="54" rx="9" ry="4" /><ellipse cx="56" cy="54" rx="9" ry="4" /><ellipse cx="73" cy="55" rx="7" ry="4" /></g>
        <text x="48" y="16" textAnchor="middle" fontSize="10" fontWeight="600" fill="#9a5d46">PESCE FRESCO</text>
      </g>
      <g transform="translate(411,171)">
        <rect width="110" height="75" rx="4" fill="#d5dfbe" stroke="#95a189" strokeWidth="2" />
        <path d="m-9 1 64-23 66 23" fill="#4d8b80" />
        <rect x="9" y="19" width="47" height="56" rx="3" fill="#5b7467" />
        <rect x="69" y="27" width="27" height="24" rx="3" fill="#97b8b0" />
        <path d="m18 34 24 0m-12-12v24" stroke="#eddbb7" strokeWidth="4" />
        <text x="70" y="16" textAnchor="middle" fontSize="9" fontWeight="600" fill="#4c6e5d">CANTIERE</text>
      </g>
      <g transform="translate(602,197)">
        <path d="M2 16v49m44-49v49" stroke="#886c53" strokeWidth="5" />
        <rect y="4" width="48" height="41" rx="3" fill="#b58b60" stroke="#785c48" strokeWidth="2" />
        <path d="m-8 5 32-15 33 15" fill="#b5735b" />
        <rect x="7" y="12" width="15" height="23" fill="#fff0cf" /><rect x="28" y="14" width="12" height="19" fill="#ebdfb7" />
      </g>
      {/* Quay, moorings and sea */}
      <path d="M0 240h720v56H0Z" fill="url(#harbor-quay)" />
      <path d="M0 240h720v56H0Z" fill="url(#paving)" />
      <path d="M0 293h720v12H0Z" fill="#a88f73" />
      <path d="M0 305h720v75H0Z" fill="url(#harbor-water)" />
      <path d="M0 306h720" stroke="#c1efe2" strokeWidth="3" opacity=".65" />
      <g stroke="#b9e7de" strokeWidth="2" strokeLinecap="round" opacity=".5" className="harbor-ripples">
        <path d="M18 344h38m148-14h50m46 31h62m120-27h40m49 18h55M32 372h71m85-19h26m168-24h40m143 44h85" />
      </g>
      <g stroke="#a68160" strokeWidth="1.2"><path d="M115 280h47v85h-47z" fill="#bb946b" />{[297,312,327,342,356].map(y=><path key={y} d={`M115 ${y}h47`} />)}</g>
      <g fill="#6a7067">{[191,354,550,692].map(x=><g key={x}><rect x={x} y="285" width="9" height="12" rx="2" /><rect x={x-3} y="281" width="15" height="5" rx="2" /></g>)}</g>
      <g className="harbor-boat" transform="translate(62,337)">
        <ellipse cx="0" cy="12" rx="35" ry="9" fill="#125f77" opacity=".4" />
        <path d="M-38 0h77L26 20h-46Z" fill="#ec755e" stroke="#a84d40" strokeWidth="2" />
        <rect x="-15" y="-19" width="32" height="20" rx="4" fill="#fff0cf" /><rect x="-10" y="-14" width="20" height="9" rx="2" fill="#3e90a1" />
        <path d="M3-18v-20m0 0 16 6-16 4" stroke="#f4e7cf" strokeWidth="2" fill="#efbe72" />
        <path d="m34 5 15-48" stroke="#dfd2b4" strokeWidth="1.3" />
      </g>
      <g transform="translate(566,327)"><ellipse cx="0" cy="15" rx="29" ry="7" fill="#125f77" opacity=".3" /><path d="M-30 0h62l-9 17h-43Z" fill="#f2c675" stroke="#9b7952" strokeWidth="2" /><path d="M-26 1h55" stroke="#fff0d0" strokeWidth="4" /><path d="M-10-14v16m-5-16h32" stroke="#627f79" strokeWidth="3" /></g>
      {/* Potted plants, crates and treasure */}
      <g><path d="M361 242h20l-3 21h-14Z" fill="#d07d62" /><path d="M371 244v-27m0 13-13-9m13 2 11-12" stroke="#65976b" strokeWidth="6" strokeLinecap="round" /></g>
      <g transform="translate(540,256)" fill="#b38b62" stroke="#805f46" strokeWidth="2"><rect x="0" y="0" width="24" height="18" rx="2" /><path d="m3 3 18 12m0-12L3 15" /></g>
      <g transform="translate(68,252)"><path d="M-16 0a16 16 0 0 1 32 0v14h-32z" fill={treasureFound ? "#b7a48b" : "#c7964b"} stroke="#8f683f" strokeWidth="2" /><path d="M-15 0h30m-20-11v24m10-24v24" stroke="#f3d88d" strokeWidth="3" /><rect x="-4" y="-2" width="8" height="7" rx="1" fill="#f4d26f" />{treasureFound && <path d="m-8 7 5 4 11-11" stroke="#faf1d9" strokeWidth="3" fill="none" />}</g>
      {/* Clickable locations with a little pin label */}
      {SPOTS.map(spot => <g key={spot.id} className="shore-hotspot" role="button" tabIndex={0} aria-label={spot.name} onClick={e => { e.stopPropagation(); select(spot.id, spot.x); }} onKeyDown={e=>{if(e.key === "Enter" || e.key === " "){e.preventDefault();select(spot.id,spot.x);}}}>
        <rect x={spot.x - 55} y="142" width="110" height="144" rx="8" fill="transparent" />
        <g transform={`translate(${spot.x},${spot.id === "treasure" ? 222 : 148})`} className="shore-label">
          <rect x="-38" y="-17" width="76" height="23" rx="9" fill="#173d48" stroke={spot.color} strokeWidth="1" />
          <text y="-2" textAnchor="middle" fill={spot.color} fontSize="10.5" fontWeight="600">{spot.name}</text>
          <path d="m-4 6 4 5 4-5" fill="#173d48" />
        </g>
      </g>)}
      <g ref={captain} transform="translate(145,274)" pointerEvents="none">
        <ellipse cy="8" rx="11" ry="4" fill="#635246" opacity=".25" />
        <g ref={feet}><path d="m-3 0-1 8m7-8 1 8" stroke="#2d4d59" strokeWidth="4" strokeLinecap="round" /></g>
        <rect x="-7" y="-12" width="14" height="15" rx="5" fill="#ef8066" />
        <path d="M-7-7h14" stroke="#fff0d0" strokeWidth="2" />
        <circle cy="-18" r="7" fill="#efc296" />
        <path d="M-9-23q9-9 18 0v3H-9Z" fill="#fff4d9" /><path d="M-8-20h16" stroke="#2d5d70" strokeWidth="3" />
        <path d="m-9-11-3 8m21-8 3 8" stroke="#efc296" strokeWidth="3" strokeLinecap="round" />
        <circle cx="-2.5" cy="-17" r=".8" fill="#29454b" /><circle cx="2.5" cy="-17" r=".8" fill="#29454b" />
      </g>
      <text x="710" y="369" textAnchor="end" fontSize="9" fill="#c7e6dc" letterSpacing="2">{site.name.toUpperCase()} · SALTWAKE</text>
    </svg>
    <div className="scene-help"><span className="tiny-key">WASD</span> cammina · SPAZIO interagisci <span className="help-divider">·</span> oppure tocca un luogo</div>
  </div>;
}
