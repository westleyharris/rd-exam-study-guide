import { useMemo, useState } from "react";
import bankData from "../data/questions.json";
import type { DomainId, Question } from "../types";
import { DOMAIN_COLORS, DOMAIN_SHORT, DOMAIN_WEIGHT_PCT } from "../lib/domainMeta";
import { clearHistory, type HistoryEntry } from "../lib/storage";
import { type StudyStats } from "../lib/studyStorage";
import { formatDate, formatDuration } from "../lib/format";
import BrandHeader from "./BrandHeader";
import { beachPhoto, pnutPhoto } from "../photos";

const BANK = bankData as Question[];

interface Props {
  history: HistoryEntry[];
  studyStats: StudyStats;
  onStartExam: () => void;
  onStudy: () => void;
  onHistoryChange: (h: HistoryEntry[]) => void;
}

export default function StartScreen({ history, studyStats, onStartExam, onStudy, onHistoryChange }: Props) {
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

  const studyAcc = studyStats.totalSeen
    ? Math.round((studyStats.totalCorrect / studyStats.totalSeen) * 100)
    : 0;

  return (
    <div className="app-shell">
      <BrandHeader />

      {/* Mode selection */}
      <div className="mode-cards">
        <button className="mode-card" onClick={() => setConfirming(true)}>
          <div className="mc-icon" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)" }}>◆</div>
          <h3>Exam Simulation</h3>
          <p>Sit a full, realistic adaptive exam: 125–145 questions, a running clock, no going back, and a 1–50 scaled score.</p>
          <div className="mc-go">Begin exam →</div>
        </button>
        <button className="mode-card" onClick={onStudy}>
          <div className="mc-icon" style={{ background: "#fdecc8", color: "#b45309" }}>✎</div>
          <h3>Study Mode</h3>
          <p>Practice by domain at your own pace with immediate feedback, flag tricky questions, and drill the ones you miss.</p>
          <div className="mc-go">Start studying →</div>
        </button>
      </div>

      <div className="card">
        <div className="spec-grid">
          <div className="spec">
            <div className="label">Exam length</div>
            <div className="value">125–145 <small>questions</small></div>
          </div>
          <div className="spec">
            <div className="label">Time limit</div>
            <div className="value">5:00:00 <small>hrs</small></div>
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
              <span><strong>Domain {w.d}.</strong> {DOMAIN_SHORT[w.d]}</span>
              <span className="w">{w.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {studyStats.totalSeen > 0 && (
        <div className="card">
          <div className="section-title">Study progress</div>
          <div className="stat-row" style={{ marginBottom: 18 }}>
            <div className="stat"><div className="n">{studyStats.totalSeen.toLocaleString()}</div><div className="l">Questions practiced</div></div>
            <div className="stat"><div className="n">{studyAcc}%</div><div className="l">Overall accuracy</div></div>
          </div>
          <div className="domain-legend">
            {([1, 2, 3, 4] as DomainId[]).map((d) => {
              const s = studyStats.byDomain[d];
              const pct = s.seen ? Math.round((s.correct / s.seen) * 100) : null;
              return (
                <div className="row" key={d}>
                  <span className="dot" style={{ background: DOMAIN_COLORS[d] }} />
                  <span><strong>Domain {d}.</strong> {DOMAIN_SHORT[d]}</span>
                  <span className="w" style={pct !== null && pct < 60 ? { color: "var(--fail)" } : {}}>
                    {pct === null ? "—" : `${pct}%`} <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>({s.correct}/{s.seen})</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
            Domains under 60% are highlighted — good candidates for focused review in Study Mode.
          </p>
        </div>
      )}

      <div className="card">
        <div className="section-title">How the exam mirrors the real thing</div>
        <ul className="rules">
          <li><span className="tick">✓</span> <span><strong>Adaptive length.</strong> Everyone gets at least 125 items (100 scored + 25 unscored pretest). The exam ends early once it is statistically confident you have clearly passed or clearly failed — otherwise it continues, item by item, up to 145.</span></li>
          <li><span className="tick">✓</span> <span><strong>Difficulty adapts.</strong> Answer well and questions get harder; a harder path needs fewer correct answers to pass. You are measured against a fixed standard, not a percentage.</span></li>
          <li><span className="tick">✓</span> <span><strong>No going back.</strong> Each question must be answered to advance. You cannot skip, review, or change a previous answer.</span></li>
          <li><span className="tick">✓</span> <span><strong>One continuous clock.</strong> It starts on question 1 and never pauses (5 hours here — the real exam allows 3). Answer fewer than 125 in time and the exam is scored as an inconclusive fail.</span></li>
          <li><span className="tick">✓</span> <span><strong>Scaled scoring.</strong> Performance is reported 1–50 (pass = 25), with two sub-scores: Food &amp; Nutrition Sciences (Domains I–II) and Food Service Systems / Management (Domains III–IV).</span></li>
        </ul>
      </div>

      {history.length > 0 && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 8 }}>
            <div className="section-title" style={{ margin: 0 }}>Your exam attempts</div>
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
              <span className="hdot" style={{ background: h.outcome === "pass" ? "var(--pass)" : "var(--fail)" }} />
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{h.outcome}</span>
              <span className="muted">Scaled {h.scaledScore}</span>
              <span className="muted">{h.totalItems} items</span>
              <span className="muted">{formatDuration(h.elapsedSeconds)}</span>
              <span className="muted" style={{ marginLeft: "auto" }}>{formatDate(h.finishedAt)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="home-dedication">
        <div className="dedication-photos">
          <img src={beachPhoto} alt="Arely on the beach" className="dedication-photo photo-beach" />
          <img src={pnutPhoto} alt="Pnut" className="dedication-photo photo-cat" />
        </div>
        <p>
          Made for Arely <span aria-hidden="true">·</span> Hey babe! Love you and proud of all your hard work! Keep it up you are going to do amazing things! Love Wes :)
        </p>
      </div>

      {confirming && (
        <div className="modal-overlay" onClick={() => setConfirming(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Start the timed exam?</h3>
            <p>
              You've got this, Arely. The clock starts immediately and runs continuously.
              You won't be able to pause, go back, or change answers — just like the real exam.
              Set aside uninterrupted time before you begin.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirming(false)}>Not yet</button>
              <button className="btn btn-primary" onClick={onStartExam}>Start now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
