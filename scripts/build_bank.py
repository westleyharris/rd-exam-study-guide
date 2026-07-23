#!/usr/bin/env python3
"""Build the question bank: parse OCR text, attach verified answers, classify
Domain III vs IV, estimate difficulties, and emit src/data/questions.json.

Run from the project root:  python3 scripts/build_bank.py
"""
import hashlib
import json
import math
import re
from pathlib import Path

import answer_keys
from parse_questions import parse_text

ROOT = Path(__file__).resolve().parent.parent
OCR_DIR = Path(__file__).parent / "ocr_text"
OUT = ROOT / "src" / "data" / "questions.json"

# Inman file -> CDR domain. Domain III/IV share a file and are split by content.
SOURCES = {"d1": 1, "d2": 2, "d34": None}

# ---------------------------------------------------------------------------
# Light OCR cleanup (conservative; only unambiguous artifacts)
# ---------------------------------------------------------------------------

def clean(text: str) -> str:
    text = text.replace("’", "'").replace("‘", "'")
    text = re.sub(r"\s+([,.;:%?])", r"\1", text)   # space before punctuation
    text = re.sub(r"\s{2,}", " ", text)             # collapse runs of spaces
    text = text.replace(" - ", "-")
    return text.strip()


# ---------------------------------------------------------------------------
# Domain III (Management) vs IV (Foodservice Systems) classifier
# ---------------------------------------------------------------------------

MGMT_TERMS = [
    "manage", "manager", "employee", "staff", "supervisor", "supervise", "hire",
    "hiring", "interview", "discipline", "terminate", "labor", "budget", "cost",
    "financial", "revenue", "profit", "expense", "forecast", "productivity",
    "fte", "payroll", "wage", "salary", "union", "grievance", "performance",
    "appraisal", "leadership", "motivat", "delegat", "conflict", "team",
    "marketing", "market ", "public relations", "advertis", "promotion",
    "quality", "benchmark", "continuous quality", "cqi", "regulatory",
    "compliance", "policy", "procedure", "orient", "training", "schedul",
    "turnover", "absenteeism", "span of control", "organizational", "mission",
    "strategic", "productivity", "break-even", "break even", "inventory turnover",
    "accounting", "balance sheet", "income statement", "capital", "depreciat",
]
FOODSERVICE_TERMS = [
    "menu", "recipe", "haccp", "sanitation", "sanitize", "temperature", "thaw",
    "cook", "cooking", "bacteria", "contaminat", "foodborne", "pathogen",
    "procure", "purchas", "receiving", "storage", "store", "inventory",
    "equipment", "kitchen", "oven", "refriger", "freezer", "dishmachine",
    "dish machine", "ware washing", "warewashing", "production", "portion",
    "cycle menu", "tray", "trayline", "service", "serving", "steam table",
    "ventilation", "layout", "facility", "floor", "work flow", "workflow",
    "yield", "as purchased", "edible portion", "ep ", "ap ", "standardized",
    "danger zone", "holding", "chilling", "reheat", "food safety", "spoilage",
    "salmonella", "e. coli", "listeria", "botulism", "cross-contamination",
    "convection", "grill", "fryer", "steamer", "receiving dock", "par stock",
]


def classify_iii_iv(q, tally):
    """Return 3 (management) or 4 (foodservice). Unknowns keep the 21:13 ratio."""
    text = (q["stem"] + " " + " ".join(q["options"].values())).lower()
    m = sum(text.count(t) for t in MGMT_TERMS)
    f = sum(text.count(t) for t in FOODSERVICE_TERMS)
    if m > f:
        return 3
    if f > m:
        return 4
    # Tie/unknown: assign to whichever domain is furthest below its target share
    # of the overall 21:13 (III:IV) split so the pool stays realistically mixed.
    total = tally[3] + tally[4] + 1
    share3 = tally[3] / total
    return 3 if share3 < 0.21 / (0.21 + 0.13) else 4


# ---------------------------------------------------------------------------
# Deterministic difficulty estimate (Rasch b-parameter, logits)
# ---------------------------------------------------------------------------

def difficulty_for(qid: str) -> float:
    """Stable pseudo-difficulty ~ N(0, 0.9), clipped to [-2.4, 2.4].

    CDR does not release item calibrations, so difficulties are simulated. They
    are seeded from the question id so the bank is reproducible across rebuilds,
    and centered on 0 (the passing standard) with a realistic spread.
    """
    h = hashlib.sha256(qid.encode()).digest()
    u1 = (int.from_bytes(h[0:4], "big") + 1) / (2**32 + 1)
    u2 = (int.from_bytes(h[4:8], "big") + 1) / (2**32 + 1)
    z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)  # Box–Muller
    return max(-2.4, min(2.4, round(z * 0.9, 3)))


def main():
    bank = []
    stats = {1: 0, 2: 0, 3: 0, 4: 0}
    iii_iv_tally = {3: 0, 4: 0}

    for src, domain in SOURCES.items():
        text = (OCR_DIR / f"{src}.txt").read_text(encoding="utf-8", errors="replace")
        answers = answer_keys.as_dict(src)
        parsed = parse_text(text, answer_keys.EXPECTED[src])
        for q in parsed:
            num = q["num"]
            if num not in answers:
                continue
            dom = domain
            if dom is None:  # Domain III/IV file
                dom = classify_iii_iv(q, iii_iv_tally)
                iii_iv_tally[dom] += 1
            qid = f"{src.upper()}-{num:03d}"
            item = {
                "id": qid,
                "domain": dom,
                "text": clean(q["stem"]),
                "options": {k: clean(v) for k, v in q["options"].items()},
                "correct": answers[num],
                "difficulty": difficulty_for(qid),
            }
            bank.append(item)
            stats[dom] += 1

    # ---- validation ----
    assert all(b["correct"] in "abcd" for b in bank)
    assert all(set(b["options"]) == set("abcd") for b in bank)
    ids = [b["id"] for b in bank]
    assert len(ids) == len(set(ids)), "duplicate question ids"

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=1), encoding="utf-8")

    total = len(bank)
    print(f"Wrote {total} questions -> {OUT.relative_to(ROOT)}")
    for d in (1, 2, 3, 4):
        print(f"  Domain {d}: {stats[d]:4d}  ({stats[d]/total*100:4.1f}%)")
    print(f"  (CDR target weights: I 21%, II 45%, III 21%, IV 13%)")


if __name__ == "__main__":
    main()
