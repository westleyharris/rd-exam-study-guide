import { useMemo, useState } from "react";
import bankData from "../data/questions.json";
import type { DomainId, Question } from "../types";
import { DOMAIN_COLORS, DOMAIN_SHORT, DOMAIN_WEIGHT_PCT } from "../lib/domainMeta";
import { clearHistory, type HistoryEntry } from "../lib/storage";
import { formatDate, formatDuration } from "../lib/format";

const BANK = bankData as Question[];

interface Props {
  history: HistoryEntry[];
  onStart: () => void;
  onHistoryChange: (h: HistoryEntry[]) => void;
}

export default function StartScreen({ history, onStart, onHistoryChange }: Props) {
  const [confirming, setConfirming] = useState(false);

  const bankCount = BANK.length;
  const passed = history.filter((h) => h.outcome === "pass").length;

  const weights: { d: DomainId; pct: number }[] = [
    { d: 1, pct: DOMAIN_WEIGHT_PCT[1] },
    { d: 2, pct: DOMAIN_WEIGHT_PCT[2] },
    { d: 3, pct: DOMAIN_WEIGHT_PCT[3] },
    { d: 4, pct: DOMAIN_WEIGHT_PCT[4] },
  ];

  const bestScore = useMemo(
    () => history.reduce((m, h) => Math.max(m, h.scaledScore), 0),
    [history],
  );

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="logo">RD</div>
        <div className="brand">
          RD Exam Simulator
          <small>Registered Dietitian registration exam — adaptive practice</small>
        </div>
      </div>

      <div className="card hero">
        <span className="pill pill-primary">Computer Adaptive Test · 125–145 items</span>
        <h1 style={{ marginTop: 14 }}>Sit a full, realistic RD exam</h1>
        <p className="subtitle">
          A faithful simulation of the CDR registration examination administered
          through Pearson VUE — variable adaptive length, a 3-hour clock, no going
          back, and a 1–50 scaled score with a pass mark of 25.
        </p>

        <div className="spec-grid mt-24">
          <div className="spec">
            <div className="label">Length</div>
            <div className="value">125–145 <small>questions</small></div>
          </div>
          <div className="spec">
            <div className="label">Time limit</div>
            <div className="value">3:00:00 <small>hrs</small></div>
          </div>
          <div className="spec">
            <div className="label">Pass mark</div>
            <div className="value">25 <small>/ 50 scaled</small></div>
          </div>
          <div className="spec">
            <div className="label">Question bank</div>
            <div className="value">{bankCount.toLocaleString()} <small>real items</small></div>
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <button className="btn btn-primary btn-lg" onClick={() => setConfirming(true)}>
            Begin exam simulation →
          </button>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Content blueprint (2022–2026 specifications)</div>
        <div className="domain-bar">
          {weights.map((w) => (
            <span
              key={w.d}
              style={{ width: `${w.pct}%`, background: DOMAIN_COLORS[w.d] }}
              title={`${DOMAIN_SHORT[w.d]} — ${w.pct}%`}
            />
          ))}
        </div>
        <div className="domain-legend">
          {weights.map((w) => (
            <div className="row" key={w.d}>
              <span className="dot" style={{ background: DOMAIN_COLORS[w.d] }} />
              <span>
                <strong>Domain {w.d}.</strong> {DOMAIN_SHORT[w.d]}
              </span>
              <span className="w">{w.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">How this mirrors the real exam</div>
        <ul className="rules">
          <li><span className="tick">✓</span> <span><strong>Adaptive length.</strong> Everyone gets at least 125 items (100 scored + 25 unscored pretest). The exam ends early once it is statistically confident you have clearly passed or clearly failed — otherwise it continues, item by item, up to 145.</span></li>
          <li><span className="tick">✓</span> <span><strong>Difficulty adapts.</strong> Answer well and questions get harder; a harder path needs fewer correct answers to pass. You are measured against a fixed standard, not a percentage.</span></li>
          <li><span className="tick">✓</span> <span><strong>No going back.</strong> Each question must be answered to advance. You cannot skip, review, or change a previous answer.</span></li>
          <li><span className="tick">✓</span> <span><strong>One 3-hour clock.</strong> It starts on question 1 and never pauses. Answer fewer than 125 in time and the exam is scored as an inconclusive fail.</span></li>
          <li><span className="tick">✓</span> <span><strong>Scaled scoring.</strong> Performance is reported 1–50 (pass = 25), with two sub-scores: Food &amp; Nutrition Sciences (Domains I–II) and Food Service Systems / Management (Domains III–IV).</span></li>
        </ul>
      </div>

      {history.length > 0 && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <div className="section-title" style={{ margin: 0 }}>Your attempts</div>
            <button
              className="link-btn"
              onClick={() => {
                clearHistory();
                onHistoryChange([]);
              }}
            >
              Clear history
            </button>
          </div>
          <div className="stat-row" style={{ marginBottom: 18 }}>
            <div className="stat"><div className="n">{history.length}</div><div className="l">Attempts</div></div>
            <div className="stat"><div className="n">{passed}</div><div className="l">Passed</div></div>
            <div className="stat"><div className="n">{bestScore || "—"}</div><div className="l">Best scaled score</div></div>
          </div>
          {history.slice(0, 8).map((h, i) => (
            <div className="history-row" key={i}>
              <span
                className="hdot"
                style={{ background: h.outcome === "pass" ? "var(--pass)" : "var(--fail)" }}
              />
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{h.outcome}</span>
              <span className="muted">Scaled {h.scaledScore}</span>
              <span className="muted">{h.totalItems} items</span>
              <span className="muted">{formatDuration(h.elapsedSeconds)}</span>
              <span className="muted" style={{ marginLeft: "auto" }}>{formatDate(h.finishedAt)}</span>
            </div>
          ))}
        </div>
      )}

      <p className="muted center" style={{ fontSize: 12.5, marginTop: 24, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
        Practice questions are drawn from the Jean Inman review materials for personal study. Item
        difficulties are simulated (CDR does not publish real calibrations); scaled scores are an
        estimate, not an official CDR result.
      </p>

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Start the 3-hour exam?</h3>
            <p>
              The clock starts immediately and runs continuously. You won't be able
              to pause, go back, or change answers — just like the real exam. Set
              aside uninterrupted time before you begin.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Not yet</button>
              <button className="btn btn-primary" onClick={onStart}>Start now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
