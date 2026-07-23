import type { ExamResult } from "../types";

const KEY = "rd-exam-history-v1";

export interface HistoryEntry {
  finishedAt: number;
  outcome: ExamResult["outcome"];
  scaledScore: number;
  totalItems: number;
  scoredItems: number;
  elapsedSeconds: number;
  stopReason: ExamResult["stopReason"];
  domainBreakdown: ExamResult["domainBreakdown"];
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveResult(r: ExamResult): HistoryEntry[] {
  const entry: HistoryEntry = {
    finishedAt: r.finishedAt,
    outcome: r.outcome,
    scaledScore: r.scaledScore,
    totalItems: r.totalItems,
    scoredItems: r.scoredItems,
    elapsedSeconds: r.elapsedSeconds,
    stopReason: r.stopReason,
    domainBreakdown: r.domainBreakdown,
  };
  const hist = [entry, ...loadHistory()].slice(0, 50);
  try {
    localStorage.setItem(KEY, JSON.stringify(hist));
  } catch {
    /* ignore quota errors */
  }
  return hist;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
