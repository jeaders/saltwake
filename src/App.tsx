import { useCallback, useEffect, useRef, useState } from "react";
import { Game } from "./game/engine";
import type { Phase, RunSummary } from "./game/types";
import { audio } from "./game/audio";
import { bestScore } from "./game/storage";
import { GameOver, HighScores, PauseMenu, StartScreen } from "./components/Screens";
import { Harbor } from "./components/Harbor";
import { Journal } from "./components/Journal";
import { AdventureHud } from "./components/AdventureHud";
import { WorldAtlas } from "./components/WorldAtlas";
import { WORLD_W, WORLD_H, isOnLand, nearestCoast, makeCoast, shorePoint, lon2x, lat2y } from "./game/world";
import { PORTS } from "./game/ports";
import { SPECIES } from "./game/species";
import { readVoyage, saveVoyage, GameMode } from "./game/voyage";
import "./adventure.css";
import "./exploration.css";
import "./fleet.css";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [muted, setMuted] = useState(audio.muted);
  const [touch, setTouch] = useState(() => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
  const [best, setBest] = useState(() => bestScore());
  const [mode,setMode] = useState<GameMode>("free");
  const [hasSave,setHasSave] = useState(()=>!!readVoyage());
  const [version, refresh] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = new Game(canvas);
    g.onPhase = p => {
      setPhase(p);
      setTouch(g.input.touchMode);
      setScoresOpen(false);
      if (p === "menu" || p === "over") {setBest(bestScore());setHasSave(!!readVoyage());}
    };
    g.onOver = s => setSummary(s);
    g.adventure.onChange = () => refresh(v => v + 1);
    gameRef.current = g;
    refresh(v => v + 1);
    if (location.search.includes("debug")) {
      const w=window as unknown as Record<string,unknown>;
      w.__saltwake=g;w.__saltwakeWorld={WORLD_W,WORLD_H,isOnLand,nearestCoast,makeCoast,shorePoint,lon2x,lat2y,PORTS,SPECIES};
    }
    void document.fonts?.load("700 20px Fredoka");
    void document.fonts?.load("600 20px Fredoka");
    const save = () => { g.adventure.flush();saveVoyage(g); };
    window.addEventListener("pagehide", save);
    return () => {
      g.adventure.onChange = null;
      g.destroy();
      gameRef.current = null;
      window.removeEventListener("pagehide", save);
    };
  }, []);

  const play = useCallback(() => { audio.unlock(); gameRef.current?.start(mode); }, [mode]);
  const toggleMute = useCallback(() => { const g = gameRef.current; if (g) setMuted(g.toggleMute()); }, []);
  useEffect(() => {
    const id = window.setInterval(() => setMuted(audio.muted), 500);
    return () => window.clearInterval(id);
  }, []);
  const g = gameRef.current;

  return <div className="fixed inset-0 select-none" data-version={version}>
    <canvas ref={canvasRef} className="game" aria-label="Saltwake: naviga nel mondo, pesca e sbarca nei porti" />
    {(phase === "playing" || phase === "walking") && g && <AdventureHud game={g} />}
    {phase === "menu" && <StartScreen mode={mode} hasSave={hasSave} onMode={(m)=>{setMode(m);if(g)g.mode=m;}} onContinue={()=>{setMode("free");g?.continueVoyage();}} onPlay={play} onScores={() => setScoresOpen(true)} onJournal={() => g?.adventure.journal()} muted={muted} onMute={toggleMute} best={best} touch={touch} />}
    {phase === "paused" && <PauseMenu mode={g?.mode ?? mode} onSwitchMode={() => { if (!g) return; g.switchMode(g.mode === "free" ? "challenge" : "free"); setMode(g.mode); refresh(v => v + 1); }} onResume={() => g?.resume()} onRestart={() => g?.restart()} onMenu={() => g?.toMenu()} muted={muted} onMute={toggleMute} touch={touch} />}
    {phase === "docked" && g?.adventure.site && <Harbor key={g.adventure.site.id} game={g} />}
    {phase === "atlas" && g && <WorldAtlas game={g} />}
    {phase === "journal" && g && <Journal profile={g.adventure.profile} onClose={() => g.adventure.closeJournal()} />}
    {phase === "over" && summary && <GameOver key={summary.entryId} summary={summary} touch={touch} onRestart={() => g?.restart()} onMenu={() => g?.toMenu()} onScores={() => setScoresOpen(true)} />}
    {scoresOpen && <div data-block-gamekeys><HighScores onClose={() => setScoresOpen(false)} highlight={phase === "over" ? summary?.entryId : undefined} /></div>}
  </div>;
}
