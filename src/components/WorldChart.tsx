import { memo } from "react";
import { LANDS, REGIONS, WORLD_H, WORLD_W } from "../game/world";
import { PORTS } from "../game/ports";

const paths = LANDS.map(L => {
  const p = L.pts;
  let d = `M${(p[0] / WORLD_W * 900).toFixed(2)},${(p[1] / WORLD_H * 450).toFixed(2)}`;
  for (let i = 2; i < p.length; i += 2) d += `L${(p[i] / WORLD_W * 900).toFixed(2)},${(p[i + 1] / WORLD_H * 450).toFixed(2)}`;
  return d + "Z";
});

export const WorldChart = memo(function WorldChart({ selected, onSelect, visited = [] }: { selected: string; onSelect: (id: string) => void; visited?: string[] }) {
  const pin = PORTS.find(p => p.id === selected);
  return (
    <svg className="world-chart" viewBox="0 0 900 450" role="group" aria-label="Planisfero: scegli uno dei dodici porti">
      <defs>
        <radialGradient id="chart-sea"><stop stopColor="#2c7086" /><stop offset="1" stopColor="#112a45" /></radialGradient>
        <linearGradient id="chart-land" x2="0" y2="1"><stop stopColor="#f1e1b8" /><stop offset="1" stopColor="#b6ad87" /></linearGradient>
      </defs>
      <rect width="900" height="450" rx="12" fill="url(#chart-sea)" />
      <g stroke="#8acbd0" strokeOpacity=".12" strokeWidth="1">
        {Array.from({ length: 13 }, (_, i) => <path key={`x${i}`} d={`M${i * 75} 0v450`} />)}
        {Array.from({ length: 7 }, (_, i) => <path key={`y${i}`} d={`M0 ${i * 75}h900`} />)}
        <path d="M0 225h900" strokeOpacity=".3" strokeDasharray="5 6" />
      </g>
      <g fill="url(#chart-land)" stroke="#879a88" strokeWidth=".5">
        {paths.map((d, i) => <path d={d} key={i} />)}
      </g>
      <g fontSize="11" fontWeight="600" fill="#243a44" opacity=".7" textAnchor="middle" letterSpacing="3">
        <text x="225" y="136">AMERICA</text><text x="310" y="300">AMERICA</text>
        <text x="485" y="119">EUROPA</text><text x="510" y="231">AFRICA</text>
        <text x="664" y="134">ASIA</text><text x="795" y="327">OCEANIA</text>
        <text x="450" y="425">ANTARTIDE</text>
      </g>
      <g fontSize="10" fill="#c3e2df" opacity=".55" textAnchor="middle" letterSpacing="2">
        <text x="120" y="250">PACIFICO</text><text x="407" y="235">ATLANTICO</text><text x="641" y="295">INDIANO</text>
      </g>
      {PORTS.map(port => {
        const x = port.x / WORLD_W * 900, y = port.y / WORLD_H * 450;
        const isSelected = selected === port.id, seen = visited.includes(port.id);
        return <g key={port.id} role="button" tabIndex={0} aria-label={`Scegli ${port.name}, ${port.country}`} className="chart-pin" onClick={() => onSelect(port.id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(port.id); } }}>
          <circle cx={x} cy={y} r="13" fill="transparent" />
          {isSelected && <circle cx={x} cy={y} r="12" fill="#ff8263" opacity=".3" />}
          <circle cx={x} cy={y} r={isSelected ? 6 : 4} fill={isSelected ? "#ff8263" : seen ? "#a6f1be" : "#ffe29a"} stroke="#183044" strokeWidth="2" />
        </g>;
      })}
      {pin && <g pointerEvents="none" transform={`translate(${pin.x / WORLD_W * 900},${pin.y / WORLD_H * 450})`}>
        <rect x="-46" y="-37" width="92" height="23" rx="8" fill="#10293f" stroke="#ffc980" strokeWidth="1" />
        <text y="-21" fontSize="12" fontWeight="600" textAnchor="middle" fill="#fff4dc">{pin.name}</text>
      </g>}
      <text x="16" y="436" fill="#d7e8d8" opacity=".7" fontSize="9" letterSpacing="1">SALTWAKE • {REGIONS.length} MARI DA ESPLORARE</text>
    </svg>
  );
});
