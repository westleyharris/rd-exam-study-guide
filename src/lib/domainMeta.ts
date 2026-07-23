import type { DomainId } from "../types";

export const DOMAIN_COLORS: Record<DomainId, string> = {
  1: "#0d9488",
  2: "#6366f1",
  3: "#f59e0b",
  4: "#ec4899",
};

export const DOMAIN_SHORT: Record<DomainId, string> = {
  1: "Principles of Dietetics",
  2: "Nutrition Care",
  3: "Management",
  4: "Foodservice Systems",
};

export const DOMAIN_WEIGHT_PCT: Record<DomainId, number> = {
  1: 21,
  2: 45,
  3: 21,
  4: 13,
};
