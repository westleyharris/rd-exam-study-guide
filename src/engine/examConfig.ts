import type { DomainId } from "../types";

// ---------------------------------------------------------------------------
// Official RD exam parameters (source: CDR Candidate Handbook 2026 & Exam FAQ)
// ---------------------------------------------------------------------------

/** Every candidate answers at least this many items (100 scored + 25 pretest). */
export const MIN_TOTAL_ITEMS = 125;
/** No candidate answers more than this (120 scored + 25 pretest). */
export const MAX_TOTAL_ITEMS = 145;

/** Scored items range from the minimum to the maximum. */
export const MIN_SCORED_ITEMS = 100;
export const MAX_SCORED_ITEMS = 120;

/** Unscored pretest items are always exactly this many. */
export const PRETEST_ITEMS = 25;

/**
 * Exam clock, in seconds. The real CDR exam allows 3 hours; this simulator is
 * configured for 5 hours to give a more relaxed practice sitting.
 */
export const EXAM_HOURS = 5;
export const EXAM_SECONDS = EXAM_HOURS * 60 * 60;

/** Scaled-score range and the fixed passing standard. */
export const SCALE_MIN = 1;
export const SCALE_MAX = 50;
export const PASSING_SCALED = 25;

/**
 * The passing standard on the ability (theta) scale. By construction the item
 * bank and mapping are centered so that theta = 0 corresponds to the passing
 * scaled score of 25.
 */
export const PASSING_THETA = 0;

/** Slope of the linear theta -> scaled-score map (scaled = 25 + k * theta). */
export const SCALE_SLOPE = 12.5;

/**
 * 95% confidence multiplier used by the adaptive stopping rule. Once >= 125
 * items are answered, the exam ends early when theta +/- Z*SE clears the
 * passing standard entirely on one side.
 */
export const CONFIDENCE_Z = 1.96;

/** CDR content-domain weights for the 2022–2026 specifications. */
export const DOMAIN_WEIGHTS: Record<DomainId, number> = {
  1: 0.21, // Principles of Dietetics
  2: 0.45, // Nutrition Care for Individuals and Groups
  3: 0.21, // Management of Food and Nutrition Programs and Services
  4: 0.13, // Foodservice Systems
};

export const DOMAIN_NAMES: Record<DomainId, string> = {
  1: "Principles of Dietetics",
  2: "Nutrition Care for Individuals & Groups",
  3: "Management of Food & Nutrition Programs & Services",
  4: "Foodservice Systems",
};

/** CDR score-report sub-scores group the domains into two blocks. */
export const SUBSCORE_GROUPS = {
  foodAndNutritionSciences: [1, 2] as DomainId[], // "Food and Nutrition Sciences"
  foodServiceSystemsManagement: [3, 4] as DomainId[], // "Food Service Systems / Management"
};
