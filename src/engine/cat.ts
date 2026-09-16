import type {
  AdministeredItem,
  DomainId,
  ExamResult,
  OptionKey,
  Question,
  StopReason,
} from "../types";
import {
  CONFIDENCE_Z,
  DOMAIN_WEIGHTS,
  MAX_SCORED_ITEMS,
  MAX_TOTAL_ITEMS,
  MIN_SCORED_ITEMS,
  MIN_TOTAL_ITEMS,
  PASSING_SCALED,
  PASSING_THETA,
  PRETEST_ITEMS,
  SCALE_MAX,
  SCALE_MIN,
  SCALE_SLOPE,
  SUBSCORE_GROUPS,
} from "./examConfig";

// ---------------------------------------------------------------------------
// Rasch (1-PL) IRT helpers
// ---------------------------------------------------------------------------

/** Probability of a correct response under the Rasch model. */
function pCorrect(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

// Quadrature grid for EAP estimation.
const GRID: number[] = [];
for (let t = -4; t <= 4 + 1e-9; t += 0.1) GRID.push(Number(t.toFixed(2)));

// Standard-normal prior N(0, 1) evaluated on the grid.
const PRIOR = GRID.map((t) => Math.exp(-(t * t) / 2));

/**
 * Expectation A Posteriori (EAP) ability estimate with a N(0,1) prior.
 * Robust even when every response is right or wrong (unlike MLE), always finite.
 * Returns the posterior mean (theta) and standard deviation (SE).
 */
function estimateTheta(
  responses: { b: number; correct: boolean }[],
): { theta: number; se: number } {
  const post = PRIOR.slice();
  for (let i = 0; i < GRID.length; i++) {
    for (const r of responses) {
      const p = pCorrect(GRID[i], r.b);
      post[i] *= r.correct ? p : 1 - p;
    }
  }
  let sum = 0;
  let mean = 0;
  for (let i = 0; i < GRID.length; i++) {
    sum += post[i];
    mean += GRID[i] * post[i];
  }
  if (sum === 0) return { theta: 0, se: 1 };
  mean /= sum;
  let varSum = 0;
  for (let i = 0; i < GRID.length; i++) {
    varSum += (GRID[i] - mean) * (GRID[i] - mean) * post[i];
  }
  const variance = varSum / sum;
  return { theta: mean, se: Math.sqrt(variance) };
}

/** Fisher information of a Rasch item at ability theta. */
function information(theta: number, b: number): number {
  const p = pCorrect(theta, b);
  return p * (1 - p);
}

function scaledFromTheta(theta: number): number {
  const raw = PASSING_SCALED + SCALE_SLOPE * theta;
  return Math.round(Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw)));
}

// Fisher–Yates shuffle.
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Adaptive exam engine
// ---------------------------------------------------------------------------

export class ExamEngine {
  private pool: Map<DomainId, Question[]>;
  private used = new Set<string>();
  /** IDs from recent sittings — preferred-avoided so mock exams don't repeat. */
  private avoid: Set<string>;
  private items: AdministeredItem[] = [];
  private theta = 0;
  private se = 1;
  private scoredCount = 0;
  private domainScored: Record<DomainId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  private pretestSlots: Set<number>;
  private current: { q: Question; isPretest: boolean } | null = null;
  private stopReason: StopReason | null = null;
  private startedAt = Date.now();

  constructor(bank: Question[], avoidIds: Iterable<string> = []) {
    this.avoid = new Set(avoidIds);
    // Bucket the bank by domain, shuffled for variety across attempts.
    this.pool = new Map([
      [1, [] as Question[]],
      [2, [] as Question[]],
      [3, [] as Question[]],
      [4, [] as Question[]],
    ]);
    for (const q of shuffle(bank)) this.pool.get(q.domain)!.push(q);

    // Reserve 25 random positions within the first 125 items for pretest items.
    const slots = new Set<number>();
    while (slots.size < PRETEST_ITEMS) {
      slots.add(Math.floor(Math.random() * MIN_TOTAL_ITEMS)); // 0-indexed position
    }
    this.pretestSlots = slots;
  }

  start(): Question {
    this.startedAt = Date.now();
    this.current = this.pickNext();
    return this.current.q;
  }

  getCurrent(): Question | null {
    return this.current?.q ?? null;
  }

  /** 1-based number of the item currently being shown. */
  currentNumber(): number {
    return this.items.length + 1;
  }

  isFinished(): boolean {
    return this.stopReason !== null;
  }

  getTheta(): number {
    return this.theta;
  }

  /**
   * Record the examinee's response to the current item, advance the engine, and
   * return the next question (or null when the exam has ended).
   */
  answer(response: OptionKey, seconds: number): Question | null {
    if (!this.current) throw new Error("Exam has not been started.");
    const { q, isPretest } = this.current;
    const correct = response === q.correct;
    this.used.add(q.id);

    if (!isPretest) {
      this.scoredCount += 1;
      this.domainScored[q.domain] += 1;
      const scoredResponses = this.items
        .filter((it) => !it.isPretest)
        .map((it) => ({ b: it.question.difficulty, correct: it.correct }));
      scoredResponses.push({ b: q.difficulty, correct });
      const est = estimateTheta(scoredResponses);
      this.theta = est.theta;
      this.se = est.se;
    }

    this.items.push({
      question: q,
      response,
      correct,
      isPretest,
      thetaAfter: this.theta,
      seAfter: this.se,
      seconds,
    });

    this.stopReason = this.evaluateStop();
    if (this.stopReason) {
      this.current = null;
      return null;
    }
    this.current = this.pickNext();
    return this.current.q;
  }

  /** Force-finish because the 3-hour clock expired. */
  expire(): void {
    if (this.stopReason) return;
    this.stopReason =
      this.items.length >= MIN_TOTAL_ITEMS ? "time-expired" : "insufficient-time";
    this.current = null;
  }

  // -- internals ----------------------------------------------------------

  private evaluateStop(): StopReason | null {
    const total = this.items.length;
    // Never end before the minimum of 125 items / 100 scored.
    if (total < MIN_TOTAL_ITEMS || this.scoredCount < MIN_SCORED_ITEMS) {
      return null;
    }
    // Hard ceilings.
    if (total >= MAX_TOTAL_ITEMS || this.scoredCount >= MAX_SCORED_ITEMS) {
      return "max-length";
    }
    // Confidence-interval rule around the passing standard.
    const lower = this.theta - CONFIDENCE_Z * this.se;
    const upper = this.theta + CONFIDENCE_Z * this.se;
    if (lower > PASSING_THETA) return "confidence-pass";
    if (upper < PASSING_THETA) return "confidence-fail";
    return null;
  }

  private pickNext(): { q: Question; isPretest: boolean } {
    const position = this.items.length; // 0-indexed slot about to be filled
    const wantPretest =
      this.pretestSlots.has(position) &&
      this.countPretestSoFar() < PRETEST_ITEMS;

    if (wantPretest) {
      const q = this.pickByInformation(this.pickPretestDomain());
      if (q) return { q, isPretest: true };
      // Fall through to a scored item if that domain is exhausted.
    }

    const domain = this.pickScoredDomain();
    const q = this.pickByInformation(domain) ?? this.pickAnyUnused();
    if (!q) throw new Error("Question bank exhausted.");
    return { q, isPretest: false };
  }

  private countPretestSoFar(): number {
    return this.items.filter((it) => it.isPretest).length;
  }

  /** Choose the scored domain that is currently furthest below its target share. */
  private pickScoredDomain(): DomainId {
    const denom = this.scoredCount + 1;
    let best: DomainId = 2;
    let bestGap = -Infinity;
    for (const d of [1, 2, 3, 4] as DomainId[]) {
      if (this.availableInDomain(d) === 0) continue;
      const share = this.domainScored[d] / denom;
      const gap = DOMAIN_WEIGHTS[d] - share; // most behind -> largest gap
      if (gap > bestGap) {
        bestGap = gap;
        best = d;
      }
    }
    return best;
  }

  private pickPretestDomain(): DomainId {
    // Pretest items follow the same content weighting for realism.
    const roll = Math.random();
    let cum = 0;
    for (const d of [1, 2, 3, 4] as DomainId[]) {
      cum += DOMAIN_WEIGHTS[d];
      if (roll <= cum && this.availableInDomain(d) > 0) return d;
    }
    return this.pickScoredDomain();
  }

  private availableInDomain(d: DomainId): number {
    return this.pool.get(d)!.filter((q) => !this.used.has(q.id)).length;
  }

  /**
   * Progressive randomesque window: wide early (exposure control), tighter
   * later (precise measurement). Operational CAT programs do the same so the
   * handful of items nearest the passing standard are not over-administered.
   * 40 candidates at item 1 → 8 candidates by item 125.
   */
  private randomesqueK(): number {
    const progress = Math.min(1, this.items.length / MIN_TOTAL_ITEMS);
    return Math.round(40 - 32 * progress);
  }

  /**
   * From a domain, select an unused item that maximizes Fisher information at
   * the current ability estimate. Prefers items not seen in recent sittings;
   * if those are exhausted, falls back to the remaining unused pool. Light
   * randomization among the top-K keeps two similar-ability exams from
   * drawing the same handful of items.
   */
  private pickByInformation(domain: DomainId): Question | null {
    const unused = this.pool.get(domain)!.filter((q) => !this.used.has(q.id));
    if (unused.length === 0) return null;

    const rank = (cands: Question[]): Question => {
      const sorted = cands.slice().sort(
        (a, b) =>
          information(this.theta, b.difficulty) -
          information(this.theta, a.difficulty),
      );
      const k = Math.min(Math.max(this.randomesqueK(), 8), sorted.length);
      return sorted[Math.floor(Math.random() * k)];
    };

    const fresh = unused.filter((q) => !this.avoid.has(q.id));
    return rank(fresh.length > 0 ? fresh : unused);
  }

  private pickAnyUnused(): Question | null {
    for (const d of [2, 1, 3, 4] as DomainId[]) {
      const q = this.pickByInformation(d);
      if (q) return q;
    }
    return null;
  }

  // -- results ------------------------------------------------------------

  buildResult(): ExamResult {
    const finishedAt = Date.now();
    const scored = this.items.filter((it) => !it.isPretest);

    const domainBreakdown = {
      1: { scoredSeen: 0, scoredCorrect: 0 },
      2: { scoredSeen: 0, scoredCorrect: 0 },
      3: { scoredSeen: 0, scoredCorrect: 0 },
      4: { scoredSeen: 0, scoredCorrect: 0 },
    } as ExamResult["domainBreakdown"];
    for (const it of scored) {
      const d = it.question.domain;
      domainBreakdown[d].scoredSeen += 1;
      if (it.correct) domainBreakdown[d].scoredCorrect += 1;
    }

    const subTheta = (domains: DomainId[]): number => {
      const rs = scored
        .filter((it) => domains.includes(it.question.domain))
        .map((it) => ({ b: it.question.difficulty, correct: it.correct }));
      if (rs.length === 0) return this.theta;
      return estimateTheta(rs).theta;
    };

    const insufficient = this.stopReason === "insufficient-time";
    const outcome =
      !insufficient && this.theta >= PASSING_THETA ? "pass" : "fail";

    return {
      outcome,
      scaledScore: insufficient ? 2 : scaledFromTheta(this.theta),
      theta: this.theta,
      stopReason: this.stopReason ?? "max-length",
      totalItems: this.items.length,
      scoredItems: scored.length,
      pretestItems: this.items.length - scored.length,
      domainBreakdown,
      subScores: {
        foodAndNutritionSciences: scaledFromTheta(
          subTheta(SUBSCORE_GROUPS.foodAndNutritionSciences),
        ),
        foodServiceSystemsManagement: scaledFromTheta(
          subTheta(SUBSCORE_GROUPS.foodServiceSystemsManagement),
        ),
      },
      items: this.items,
      startedAt: this.startedAt,
      finishedAt,
      elapsedSeconds: Math.round((finishedAt - this.startedAt) / 1000),
    };
  }
}
