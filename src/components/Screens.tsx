import { ReactNode, useEffect, useState } from "react";
import { ScoreEntry, clearScores, getName, loadScores, renameScore, setName } from "../game/storage";
import type { RunSummary } from "../game/types";
import { fmt } from "../game/util";
import { SPECIES_COUNT } from "../game/species";
import { REGION_COUNT } from "../game/world";
import { Icon } from "./Icons";
import type { GameMode } from "../game/voyage";

// ---------------------------------------------------------------------------
// small pieces
// ---------------------------------------------------------------------------
export function BoatMark({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="drop-shadow-[0_4px_0_rgba(0,0,0,0.25)]">
      <path d="M31 24V10" stroke="#fff4dc" strokeWidth="3" strokeLinecap="round" />
      <path d="M31 10l12 5-12 4z" fill="#ffc94a" />
      <path d="M6 38h52l-8 14H16z" fill="#ff6b4a" stroke="#8f2f1f" strokeWidth="3" strokeLinejoin="round" />
      <rect x="20" y="24" width="22" height="14" rx="3" fill="#fff4dc" />
      <rect x="25" y="28" width="12" height="6" rx="1.5" fill="#3b9ec9" />
      <path d="M2 57c6-5 10-5 15 0s10 5 15 0 10-5 15 0 10 5 15 0" fill="none" stroke="#7cf7ff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block rounded-md bg-[#fff4dc] px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#0b2239] shadow-[0_2px_0_rgba(0,0,0,0.3)]">
      {children}
    </kbd>
  );
}

function ToolIcon({ id, color }: { id: string; color: string }) {
  const p = { fill: "none", stroke: color, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden className="shrink-0">
      {id === "net" && (
        <g {...p}>
          <circle cx="16" cy="16" r="11" />
          <circle cx="16" cy="16" r="5.5" strokeWidth="1.6" />
          <path d="M16 5v22M5 16h22M8.2 8.2l15.6 15.6M23.8 8.2L8.2 23.8" strokeWidth="1.4" />
        </g>
      )}
      {id === "harpoon" && (
        <g {...p}>
          <path d="M6 26L20 12" />
          <path d="M26 6l-9 2.5L23.5 15z" fill={color} />
          <path d="M11 21l-5-1M11 21l1 5" strokeWidth="1.8" />
        </g>
      )}
      {id === "sonar" && (
        <g {...p}>
          <circle cx="8" cy="24" r="1.6" fill={color} />
          <path d="M8 18a6 6 0 016 6M8 12a12 12 0 0112 12M8 6a18 18 0 0118 18" />
        </g>
      )}
      {id === "boost" && <path d="M18 3L7 18h8l-2 11 12-16h-8z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />}
    </svg>
  );
}

const TOOLS = [
  { id: "net", name: "Rete", key: "SPAZIO", color: "#ffd36b", text: "Lanciala sui banchi. Più pesci, più punti." },
  { id: "harpoon", name: "Fiocina", key: "X", color: "#ff8a6b", text: "Per i pesci grandi. Mira assistita." },
  { id: "sonar", name: "Sonar", key: "C", color: "#7cf7ff", text: "Marca i pesci per +50% punti." },
  { id: "boost", name: "Boost", key: "SHIFT", color: "#ffb13b", text: "Un balzo di velocità. Consuma energia." },
];

function NameField({ onChange }: { onChange?: (n: string) => void }) {
  const [v, setV] = useState(getName());
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-[#fff4dc]/70">
      <span className="uppercase tracking-wider text-[11px]">Capitano</span>
      <input
        value={v}
        maxLength={12}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => {
          setV(e.target.value);
          const n = e.target.value.trim() || "Capitano";
          setName(n);
          onChange?.(n);
        }}
        className="w-36 rounded-xl border-[1.5px] border-[#fff4dc]/25 bg-[#fff4dc]/10 px-3 py-1.5 text-center text-base font-bold text-[#fff4dc] outline-none transition focus:border-[#ffc94a] focus:bg-[#fff4dc]/15"
        style={{ userSelect: "text", WebkitUserSelect: "text" }}
      />
    </label>
  );
}

function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button className="btn btn-ghost !px-4 !py-2 text-sm" onClick={onToggle} aria-label={muted ? "Attiva suono" : "Disattiva suono"}>
      {muted ? "Suono: no" : "Suono: sì"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// start screen
// ---------------------------------------------------------------------------
export function StartScreen(props: { mode: GameMode; hasSave: boolean; onMode: (m:GameMode)=>void; onContinue: ()=>void; onPlay: () => void; onScores: () => void; onJournal: () => void; muted: boolean; onMute: () => void; best: number; touch: boolean }) {
  return (
    <div className="overlay" style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(6,24,42,.32), rgba(4,14,26,.85))" }}>
      <div className="glass start-card anim-pop w-full max-w-[720px] px-5 py-6 sm:px-9 sm:py-6">
        <div className="start-col">
          <span className="new-season"><i /> NUOVO · LA TUA NAVE, IL TUO MARE</span>
          <div className="flex flex-col items-center gap-2">
            <div className="start-boat" style={{ animation: "floaty 3.2s ease-in-out infinite" }}><BoatMark size={56} /></div>
            <h1 className="start-title title-grad text-[56px] font-bold leading-[.95] tracking-wide sm:text-[72px]">SALTWAKE</h1>
            <p className="max-w-[460px] text-center text-[14px] font-medium leading-snug text-[#fff4dc]/75">Naviga, cammina e trova il tuo prossimo orizzonte.</p>
          </div>
          <div className="voyage-mode-select"><button className={props.mode==="free"?"active":""} onClick={()=>props.onMode("free")}><Icon name="compass" size={17}/><span><b>Viaggio libero</b><small>Senza conto alla rovescia</small></span></button><button className={props.mode==="challenge"?"active":""} onClick={()=>props.onMode("challenge")}><Icon name="sun" size={17}/><span><b>Sfida a tempo</b><small>Pesca, combo e classifica</small></span></button></div>
          <p className="mode-hint">Puoi cambiare modalità in qualsiasi momento dal menu di pausa.</p>
          <button className="btn btn-primary w-full max-w-[340px] !py-3.5 text-[25px] tracking-wider" autoFocus onClick={props.onPlay}>ESPLORA <span className="inline-flex align-middle ml-2"><Icon name="arrow" size={25} /></span></button>
          {props.hasSave&&<button className="resume-voyage" onClick={props.onContinue}><Icon name="compass" size={16}/>Riprendi il viaggio salvato<Icon name="arrow" size={16}/></button>}
          <div className="-mt-1 text-xs text-[#fff4dc]/50">{props.touch ? "Tocca per iniziare l’avventura" : <>Premi <Kbd>INVIO</Kbd> o <Kbd>SPAZIO</Kbd> per iniziare</>}</div>
        </div>
        <div className="start-col">
          <div className="world-stats"><div><b>{SPECIES_COUNT}</b><span>specie da incontrare</span></div><div><b>{REGION_COUNT}</b><span>mari reali</span></div><div><b>12</b><span>porti da visitare</span></div></div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            {TOOLS.map(t => <div key={t.id} className="flex flex-col gap-1 rounded-xl border border-[#fff4dc]/15 bg-[#fff4dc]/[.04] p-2.5"><div className="flex items-center gap-2"><ToolIcon id={t.id} color={t.color} /><div className="leading-tight"><div className="tool-name text-[13px] font-semibold" style={{ color: t.color }}>{t.name}</div>{!props.touch && <Kbd>{t.key}</Kbd>}</div></div><p className="tool-text text-[10.5px] leading-snug text-[#fff4dc]/60">{t.text}</p></div>)}
          </div>
          <p className="shore-intro"><b>Una nave tutta tua, un mare più vivo.</b> Personalizza la barca, migliora 12 sistemi e incontra 84 specie. Il radar segue ogni tuo passo.</p>
          <p className="help-text text-center text-[11px] leading-relaxed text-[#fff4dc]/60">{props.touch ? <>Trascina a sinistra per governare · tocca gli attrezzi a destra · avvicinati alla costa per sbarcare.</> : <><Kbd>WASD</Kbd> governa · <Kbd>E</Kbd> sbarca · <Kbd>TAB</Kbd> mappa · <Kbd>Z</Kbd> manovra · <Kbd>I</Kbd> diario · <Kbd>ESC</Kbd> pausa · <Kbd>R</Kbd> ricomincia</>}</p>
          <div className="flex w-full flex-wrap items-center justify-center gap-2"><button className="btn btn-ghost !px-3 !py-2 text-[12px]" onClick={props.onJournal}><span className="inline-flex items-center gap-1.5"><Icon name="book" size={17} /> Diario delle specie</span></button><button className="btn btn-ghost !px-3 !py-2 text-[12px]" onClick={props.onScores}>Classifica{props.best > 0 ? ` · ${fmt(props.best)}` : ""}</button><MuteButton muted={props.muted} onToggle={props.onMute} /></div>
          <NameField />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// pause
// ---------------------------------------------------------------------------
export function PauseMenu(props: { onResume: () => void; onRestart: () => void; onMenu: () => void; mode: GameMode; onSwitchMode: () => void; muted: boolean; onMute: () => void; touch: boolean }) {
  return (
    <div className="overlay" style={{ background: "rgba(4,14,26,0.62)" }}>
      <div className="glass anim-pop flex w-full max-w-[380px] flex-col items-center gap-3 px-6 py-7">
        <h2 className="title-grad text-5xl font-bold">IN PAUSA</h2>
        <p className="mb-1 text-sm text-[#fff4dc]/70">La marea può aspettare.</p>
        <button className="btn btn-primary w-full !py-3.5 text-xl" autoFocus onClick={props.onResume}>
          CONTINUA {!props.touch && <span className="ml-1 text-sm opacity-80">(Esc)</span>}
        </button>
        <button className="btn btn-ghost w-full" onClick={props.onSwitchMode}>
          <span className="inline-flex items-center gap-2"><Icon name={props.mode === "free" ? "sun" : "compass"} size={17} /> {props.mode === "free" ? "Passa alla sfida a tempo" : "Passa al viaggio libero"}</span>
        </button>
        <button className="btn btn-ghost w-full" onClick={props.onRestart}>
          Nuova partita {!props.touch && <span className="text-xs opacity-60">(R)</span>}
        </button>
        <button className="btn btn-ghost w-full" onClick={props.onMenu}>
          Menu principale
        </button>
        <MuteButton muted={props.muted} onToggle={props.onMute} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// high-score table
// ---------------------------------------------------------------------------
function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ScoreTable({ scores, highlight, limit }: { scores: ScoreEntry[]; highlight?: string; limit?: number }) {
  const rows = scores.slice(0, limit ?? 10);
  if (rows.length === 0) {
    return <div className="py-6 text-center text-sm text-[#fff4dc]/60">Nessun viaggio registrato. Il primo posto ti aspetta!</div>;
  }
  const medal = ["#ffd36b", "#d8e2ea", "#e0a06a"];
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#fff4dc]/15">
      <div className="grid grid-cols-[2rem_1fr_auto_3rem_2.6rem] gap-x-2 bg-[#fff4dc]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#fff4dc]/60">
        <span>#</span>
        <span>Capitano</span>
        <span className="text-right">Punti</span>
        <span className="text-right">Pesci</span>
        <span className="text-right">Data</span>
      </div>
      {rows.map((s, i) => {
        const me = s.id === highlight;
        return (
          <div
            key={s.id}
            className={`grid grid-cols-[2rem_1fr_auto_3rem_2.6rem] items-center gap-x-2 px-3 py-1.5 text-[14px] font-semibold ${me ? "bg-[#ffc94a]/20 text-[#fff3b0]" : i % 2 ? "bg-[#fff4dc]/[0.04]" : ""}`}
          >
            <span className="font-bold" style={{ color: medal[i] ?? "rgba(255,244,220,0.55)" }}>
              {i + 1}
            </span>
            <span className="truncate">
              {s.name}
              {me && <span className="ml-1.5 rounded bg-[#ffc94a] px-1 py-px text-[9px] font-bold text-[#0b2239]">NUOVO</span>}
            </span>
            <span className="text-right tabular-nums">{fmt(s.score)}</span>
            <span className="text-right tabular-nums text-[#fff4dc]/65">{s.fish}</span>
            <span className="text-right text-xs text-[#fff4dc]/50">{fmtDate(s.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HighScores({ onClose, highlight }: { onClose: () => void; highlight?: string }) {
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" style={{ background: "rgba(4,14,26,0.78)", zIndex: 30 }} onClick={onClose}>
      <div className="glass anim-pop flex w-full max-w-[520px] flex-col items-center gap-3 px-5 py-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="title-grad text-4xl font-bold">DIARIO DEI CAPITANI</h2>
        <p className="-mt-1 text-xs text-[#fff4dc]/60">I migliori 10 viaggi · salvati su questo dispositivo</p>
        <ScoreTable scores={scores} highlight={highlight} />
        <div className="flex gap-2">
          <button className="btn btn-primary !px-8 !py-2.5 text-base" autoFocus onClick={onClose}>
            Chiudi
          </button>
          {scores.length > 0 && (
            <button
              className="btn btn-ghost !px-4 !py-2.5 text-sm"
              onClick={() => {
                if (!confirm) {
                  setConfirm(true);
                  return;
                }
                clearScores();
                setScores([]);
                setConfirm(false);
              }}
            >
              {confirm ? "Confermi?" : "Cancella"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// game over
// ---------------------------------------------------------------------------
function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function GameOver(props: { summary: RunSummary; onRestart: () => void; onMenu: () => void; onScores: () => void; touch: boolean }) {
  const s = props.summary;
  const shown = useCountUp(s.score);
  const [scores, setScores] = useState<ScoreEntry[]>(() => loadScores());
  const wreck = s.reason === "wreck";
  const stats = [
    { label: "Pesci pescati", value: String(s.fish) },
    { label: "Miglior serie", value: `${s.combo}` },
    { label: "Mari scoperti", value: `${s.seas}/${REGION_COUNT}` },
    { label: "Grande incontro", value: s.biggest },
  ];
  return (
    <div className="overlay" style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(20,8,30,0.45), rgba(4,10,22,0.88))" }}>
      <div className="glass anim-pop flex w-full max-w-[600px] flex-col items-center gap-3 px-5 py-6 sm:px-8">
        <div className="short-hide text-[11px] font-bold uppercase tracking-[0.3em] text-[#fff4dc]/60">{wreck ? "Il mare chiede il suo tributo" : "Il sole tramonta sul tuo viaggio"}</div>
        <h2 className="title-grad text-[46px] font-bold leading-none sm:text-[60px]" style={wreck ? { filter: "hue-rotate(-20deg) drop-shadow(0 4px 0 rgba(120,20,20,.6))" } : undefined}>
          {wreck ? "NAUFRAGIO" : "TRAMONTO"}
        </h2>

        <div className="flex flex-col items-center">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#fff4dc]/60">Punteggio finale</div>
          <div className="text-[64px] font-bold leading-none tabular-nums text-[#fff4dc] [text-shadow:0_4px_0_rgba(0,0,0,0.35)] sm:text-[80px]">{fmt(shown)}</div>
          <div className="mt-1 h-7">
            {s.newBest ? (
              <span className="rounded-full bg-[#ffc94a] px-3 py-1 text-xs font-bold tracking-wider text-[#0b2239]" style={{ animation: "floaty 1.4s ease-in-out infinite", display: "inline-block" }}>
                NUOVO RECORD PERSONALE!
              </span>
            ) : s.rank > 0 ? (
              <span className="text-sm font-semibold text-[#ffd36b]">#{s.rank} nella classifica dei capitani</span>
            ) : null}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((st) => (
            <div key={st.label} className="rounded-2xl border border-[#fff4dc]/15 bg-[#fff4dc]/[0.07] px-2 py-2 text-center">
              <div className="truncate text-[17px] font-bold text-[#ffd36b]">{st.value}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#fff4dc]/55">{st.label}</div>
            </div>
          ))}
        </div>

        {scores.length > 0 && s.rank > 0 && (
          <div className="short-hide w-full">
            <ScoreTable scores={scores} highlight={s.entryId} limit={5} />
          </div>
        )}

        <div className="flex w-full flex-col items-center gap-3">
          <button className="btn btn-primary w-full max-w-[360px] !py-3.5 text-2xl tracking-wide" autoFocus onClick={props.onRestart}>
            SALPA ANCORA {!props.touch && <span className="ml-1 text-sm opacity-80">(R)</span>}
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {s.rank > 0 && (
              <NameField
                onChange={(n) => {
                  renameScore(s.entryId, n);
                  setScores(loadScores());
                }}
              />
            )}
            <button className="btn btn-ghost !px-4 !py-2 text-sm" onClick={props.onScores}>
              Classifica
            </button>
            <button className="btn btn-ghost !px-4 !py-2 text-sm" onClick={props.onMenu}>
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
