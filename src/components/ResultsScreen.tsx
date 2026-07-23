import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { DomainId, ExamResult } from "../types";
import { DOMAIN_COLORS, DOMAIN_SHORT } from "../lib/domainMeta";
import { formatDuration } from "../lib/format";
import { PASSING_SCALED } from "../engine/examConfig";

interface Props {
  result: ExamResult;
  onRestart: () => void;
}

const STOP_MESSAGES: Record<ExamResult["stopReason"], string> = {
  "confidence-pass":
    "The exam ended early because your performance was, with confidence, clearly above the passing standard.",
  "confidence-fail":
    "The exam ended early because your performance was, with confidence, clearly below the passing standard.",
  "max-length":
    "You reached the maximum length. Your ability estimate stayed near the borderline, so the exam ran the full item count before deciding.",
  "time-expired":
    "The clock ran out, but you had answered at least 125 questions, so the exam was scored.",
  "insufficient-time":
    "The clock ran out before you answered the minimum of 125 questions, so the exam is scored as an inconclusive fail (scaled score 2).",
};

export default function ResultsScreen({ result, onRestart }: Props) {
  const [showReview, setShowReview] = useState(false);
  const passed = result.outcome === "pass";

  const chartData = useMemo(
    () =>
      ([1, 2, 3, 4] as DomainId[]).map((d) => {
        const b = result.domainBreakdown[d];
        const pct = b.scoredSeen ? Math.round((b.scoredCorrect / b.scoredSeen) * 100) : 0;
        return {
          domain: d,
          name: `D${d}`,
          pct,
          label: `${b.scoredCorrect}/${b.scoredSeen}`,
          color: DOMAIN_COLORS[d],
        };
      }),
    [result],
  );

  const scoredItems = result.items.filter((i) => !i.isPretest);
  const overallCorrect = scoredItems.filter((i) => i.correct).length;

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="logo">RD</div>
        <div className="brand">
          RD Exam Simulator
          <small>Score report</small>
        </div>
      </div>

      <div className="card result-hero">
        <div className={`result-badge ${passed ? "pass" : "fail"}`}>
          {passed ? "● Pass" : "● Did not pass"}
        </div>
        <div className="score-big">
          {result.scaledScore}
          <span className="of"> / 50</span>
        </div>
        <div className="score-caption">
          Scaled score · passing standard is {PASSING_SCALED}
        </div>
        <div className="stop-note">{STOP_MESSAGES[result.stopReason]}</div>
      </div>

      <div className="card">
        <div className="section-title">Exam summary</div>
        <div className="stat-row">
          <div className="stat"><div className="n">{result.totalItems}</div><div className="l">Total items</div></div>
          <div className="stat"><div className="n">{result.scoredItems}</div><div className="l">Scored items</div></div>
          <div className="stat"><div className="n">{result.pretestItems}</div><div className="l">Pretest (unscored)</div></div>
          <div className="stat"><div className="n">{overallCorrect}/{result.scoredItems}</div><div className="l">Scored correct</div></div>
          <div className="stat"><div className="n">{formatDuration(result.elapsedSeconds)}</div><div className="l">Time used</div></div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Sub-scores (as reported by CDR)</div>
        <div className="subscore">
          <div className="name">
            Food &amp; Nutrition Sciences
            <small>Domains I &amp; II</small>
          </div>
          <div className="val">{result.subScores.foodAndNutritionSciences}<span className="muted" style={{ fontSize: 14 }}> / 50</span></div>
        </div>
        <div className="subscore">
          <div className="name">
            Food Service Systems / Management
            <small>Domains III &amp; IV</small>
          </div>
          <div className="val">{result.subScores.foodServiceSystemsManagement}<span className="muted" style={{ fontSize: 14 }}> / 50</span></div>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
          Sub-scores are informational only — CDR does not use them for the pass/fail
          decision, and areas with few items are less precise.
        </p>
      </div>

      <div className="card">
        <div className="section-title">Performance by content domain</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 24, right: 8, left: -18, bottom: 0 }}>
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--text-muted)", fontSize: 13, fontWeight: 600 }} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--text-faint)", fontSize: 12 }} unit="%" />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {chartData.map((d) => (
                  <Cell key={d.domain} fill={d.color} />
                ))}
                <LabelList dataKey="label" position="top" fill="var(--text-muted)" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="domain-legend" style={{ marginTop: 8 }}>
          {chartData.map((d) => (
            <div className="row" key={d.domain}>
              <span className="dot" style={{ background: d.color }} />
              <span><strong>Domain {d.domain}.</strong> {DOMAIN_SHORT[d.domain as DomainId]}</span>
              <span className="w">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex-between">
          <div className="section-title" style={{ margin: 0 }}>Review every question</div>
          <button className="btn btn-ghost" onClick={() => setShowReview((s) => !s)}>
            {showReview ? "Hide review" : "Show review"}
          </button>
        </div>
        {showReview && (
          <div style={{ marginTop: 18 }}>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              The real exam never reveals answers — but reviewing here is where the
              studying happens. Pretest items did not count toward the score.
            </p>
            {result.items.map((it, i) => (
              <div className="review-item" key={i}>
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="pill">Q{i + 1} · Domain {it.question.domain}</span>
                  <span className={`tag ${it.isPretest ? "pretest" : it.correct ? "right" : "miss"}`}>
                    {it.isPretest ? "Pretest" : it.correct ? "Correct" : "Missed"}
                  </span>
                </div>
                <div className="rq">{it.question.text}</div>
                {(["a", "b", "c", "d"] as const).map((k) => {
                  const isCorrect = k === it.question.correct;
                  const isChosen = k === it.response;
                  const cls = isCorrect ? "correct" : isChosen ? "wrong" : "";
                  return (
                    <div className={`ra ${cls}`} key={k}>
                      <span className="k">{k}</span>
                      <span>
                        {it.question.options[k]}
                        {isCorrect && " ✓"}
                        {isChosen && !isCorrect && "  ← your answer"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="center" style={{ marginTop: 26 }}>
        <button className="btn btn-primary btn-lg" onClick={onRestart}>
          Return to start
        </button>
      </div>
    </div>
  );
}
