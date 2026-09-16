const KEY = "rd-exam-seen-ids-v1";

/** Remember this many completed mock exams so later sittings prefer unseen items. */
const MAX_EXAMS = 5;

function loadExams(): string[][] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((exam): exam is string[] => Array.isArray(exam));
  } catch {
    return [];
  }
}

/** Question IDs used in recent completed mock exams — skip these when we can. */
export function loadAvoidIds(): Set<string> {
  return new Set(loadExams().flat());
}

export function recordExamIds(ids: string[]): void {
  if (ids.length === 0) return;
  try {
    const next = [ids, ...loadExams()].slice(0, MAX_EXAMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota errors */
  }
}
