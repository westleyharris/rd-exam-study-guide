// ---------------------------------------------------------------------------
// Core data model for the RD Exam Simulator
// ---------------------------------------------------------------------------

/** CDR content domains (2022–2026 test specifications). */
export type DomainId = 1 | 2 | 3 | 4;

export type OptionKey = "a" | "b" | "c" | "d";

export interface Question {
  /** Stable id, e.g. "D1-001". */
  id: string;
  /** CDR domain 1–4. */
  domain: DomainId;
  /** Question stem. */
  text: string;
  /** Four answer options keyed a–d. */
  options: Record<OptionKey, string>;
  /** The verified correct option. */
  correct: OptionKey;
  /**
   * IRT (Rasch / 1-PL) difficulty in logits. Estimated — CDR does not release
   * real item calibrations — but produces a realistic adaptive experience.
   */
  difficulty: number;
}

/** A single administered item during an exam attempt. */
export interface AdministeredItem {
  question: Question;
  /** The examinee's chosen option. */
  response: OptionKey;
  correct: boolean;
  /** Was this item a (never-counted) pretest item? */
  isPretest: boolean;
  /** Ability estimate (theta) after this item was scored. */
  thetaAfter: number;
  /** Standard error of the ability estimate after this item. */
  seAfter: number;
  /** Seconds spent on this item. */
  seconds: number;
}

export type ExamOutcome = "pass" | "fail";

/** Why the adaptive exam stopped. */
export type StopReason =
  | "confidence-pass" // CI cleared the standard on the high side
  | "confidence-fail" // CI cleared the standard on the low side
  | "max-length" // reached the maximum item count
  | "time-expired" // 3-hour clock ran out (with >= 125 answered)
  | "insufficient-time"; // clock ran out with < 125 answered -> inconclusive fail

export interface ExamResult {
  outcome: ExamOutcome;
  /** Official-style scaled score, 1–50 (pass = 25). */
  scaledScore: number;
  /** Final ability estimate. */
  theta: number;
  stopReason: StopReason;
  totalItems: number;
  scoredItems: number;
  pretestItems: number;
  /** Per-domain performance on scored items (for the sub-score report). */
  domainBreakdown: Record<
    DomainId,
    { scoredSeen: number; scoredCorrect: number }
  >;
  /** Sub-scaled scores as reported by CDR. */
  subScores: {
    foodAndNutritionSciences: number; // Domains I + II
    foodServiceSystemsManagement: number; // Domains III + IV
  };
  items: AdministeredItem[];
  startedAt: number;
  finishedAt: number;
  elapsedSeconds: number;
}
