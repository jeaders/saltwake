export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  fish: number;
  seas: number;
  combo: number;
  date: number;
}

const SCORES_KEY = "saltwake.scores.v1";
const NAME_KEY = "saltwake.name";
const MUTE_KEY = "saltwake.muted";
const MAX_ENTRIES = 10;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* storage unavailable (private mode, quota) – ignore */
  }
}

export function loadScores(): ScoreEntry[] {
  const raw = safeGet(SCORES_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as ScoreEntry[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && typeof e.score === "number" && typeof e.name === "string")
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function bestScore(): number {
  const s = loadScores();
  return s.length ? s[0].score : 0;
}

/** Adds an entry. Returns the new rank (1-based) or 0 if it did not make the table. */
export function addScore(entry: ScoreEntry): number {
  const list = loadScores();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_ENTRIES);
  safeSet(SCORES_KEY, JSON.stringify(trimmed));
  const idx = trimmed.findIndex((e) => e.id === entry.id);
  return idx >= 0 ? idx + 1 : 0;
}

export function renameScore(id: string, name: string) {
  const list = loadScores();
  const e = list.find((x) => x.id === id);
  if (e) {
    e.name = name;
    safeSet(SCORES_KEY, JSON.stringify(list));
  }
}

export function clearScores() {
  safeSet(SCORES_KEY, "[]");
}

export function getName(): string {
  return safeGet(NAME_KEY) || "Capitano";
}
export function setName(n: string) {
  safeSet(NAME_KEY, n);
}
export function getMuted(): boolean {
  return safeGet(MUTE_KEY) === "1";
}
export function setMutedPref(m: boolean) {
  safeSet(MUTE_KEY, m ? "1" : "0");
}
