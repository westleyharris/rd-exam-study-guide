import type { DomainId } from "../types";

// ---------------------------------------------------------------------------
// Persistent study state: per-domain accuracy, bookmarks, and a "missed" pool.
// ---------------------------------------------------------------------------

const STATS_KEY = "rd-study-stats-v1";
const BOOKMARK_KEY = "rd-study-bookmarks-v1";
const MISSED_KEY = "rd-study-missed-v1";

export interface DomainStat {
  seen: number;
  correct: number;
}

export interface StudyStats {
  totalSeen: number;
  totalCorrect: number;
  byDomain: Record<DomainId, DomainStat>;
}

function emptyStats(): StudyStats {
  return {
    totalSeen: 0,
    totalCorrect: 0,
    byDomain: {
      1: { seen: 0, correct: 0 },
      2: { seen: 0, correct: 0 },
      3: { seen: 0, correct: 0 },
      4: { seen: 0, correct: 0 },
    },
  };
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
}

export function loadStats(): StudyStats {
  const s = read<StudyStats>(STATS_KEY, emptyStats());
  // Defensive: ensure all domains exist (in case of older data).
  const base = emptyStats();
  return { ...base, ...s, byDomain: { ...base.byDomain, ...s.byDomain } };
}

/** Record a batch of answered items into the persistent stats. */
export function recordAnswers(
  answers: { domain: DomainId; correct: boolean }[],
): StudyStats {
  const stats = loadStats();
  for (const a of answers) {
    stats.totalSeen += 1;
    stats.byDomain[a.domain].seen += 1;
    if (a.correct) {
      stats.totalCorrect += 1;
      stats.byDomain[a.domain].correct += 1;
    }
  }
  write(STATS_KEY, stats);
  return stats;
}

export function resetStats(): StudyStats {
  const s = emptyStats();
  write(STATS_KEY, s);
  return s;
}

// ---- bookmarks ------------------------------------------------------------

export function loadBookmarks(): Set<string> {
  return new Set(read<string[]>(BOOKMARK_KEY, []));
}

export function toggleBookmark(id: string): Set<string> {
  const set = loadBookmarks();
  if (set.has(id)) set.delete(id);
  else set.add(id);
  write(BOOKMARK_KEY, [...set]);
  return set;
}

// ---- missed pool ----------------------------------------------------------

export function loadMissed(): Set<string> {
  return new Set(read<string[]>(MISSED_KEY, []));
}

/** Add newly-missed ids; drop ids that were just answered correctly. */
export function updateMissed(
  results: { id: string; correct: boolean }[],
): Set<string> {
  const set = loadMissed();
  for (const r of results) {
    if (r.correct) set.delete(r.id);
    else set.add(r.id);
  }
  write(MISSED_KEY, [...set]);
  return set;
}

export function clearMissed(): Set<string> {
  write(MISSED_KEY, []);
  return new Set();
}
