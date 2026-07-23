import { useCallback, useEffect, useMemo, useState } from "react";
import bankData from "../data/questions.json";
import type { DomainId, OptionKey, Question } from "../types";
import { DOMAIN_COLORS, DOMAIN_SHORT } from "../lib/domainMeta";
import {
  loadBookmarks,
  loadMissed,
  recordAnswers,
  toggleBookmark,
  updateMissed,
} from "../lib/studyStorage";

const BANK = bankData as Question[];
const OPTS: OptionKey[] = ["a", "b", "c", "d"];

type Phase = "config" | "practice" | "summary";
type Source = "all" | "missed" | "bookmarked";
type Size = 10 | 25 | 50 | "all";

interface Props {
  onExit: () => void;
  onStatsChange: () => void;
}

interface Answer {
  choice: OptionKey | null;
  checked: boolean;
}

function shuffle<T>(a: T[]): T[] {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function StudyMode({ onExit, onStatsChange }: Props) {
  const [phase, setPhase] = useState<Phase>("config");
  const [domains, setDomains] = useState<Set<DomainId>>(new Set([1, 2, 3, 4]));
  const [source, setSource] = useState<Source>("all");
  const [size, setSize] = useState<Size>(25);

  const [session, setSession] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [index, setIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => loadBookmarks());

  const missed = useMemo(() => loadMissed(), []);
  const savedBookmarks = useMemo(() => loadBookmarks(), []);

  const poolFor = useCallback(
    (src: Source, doms: Set<DomainId>): Question[] => {
      let pool = BANK.filter((q) => doms.has(q.domain));
      if (src === "missed") pool = pool.filter((q) => missed.has(q.id));
      if (src === "bookmarked") pool = pool.filter((q) => savedBookmarks.has(q.id));
      return pool;
    },
    [missed, savedBookmarks],
  );

  const availableCount = poolFor(source, domains).length;

  const start = () => {
    const pool = shuffle(poolFor(source, domains));
    const n = size === "all" ? pool.length : Math.min(size, pool.length);
    const chosen = pool.slice(0, n);
    if (chosen.length === 0) return;
    setSession(chosen);
    setAnswers(chosen.map(() => ({ choice: null, checked: false })));
    setIndex(0);
    setPhase("practice");
  };

  const current = session[index];
  const currentAnswer = answers[index];

  const select = useCallback(
    (choice: OptionKey) => {
      setAnswers((prev) => {
        if (prev[index]?.checked) return prev;
        const next = prev.slice();
        next[index] = { ...next[index], choice };
        return next;
      });
    },
    [index],
  );

  const check = useCallback(() => {
    setAnswers((prev) => {
      if (!prev[index]?.choice || prev[index]?.checked) return prev;
      const next = prev.slice();
      next[index] = { ...next[index], checked: true };
      return next;
    });
  }, [index]);

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(session.length - 1, Math.max(0, i + delta)));
    },
    [session.length],
  );

  const finish = useCallback(() => {
    const graded = session.map((q, i) => ({
      id: q.id,
      domain: q.domain,
      correct: answers[i].choice === q.correct,
    }));
    recordAnswers(graded.map((g) => ({ domain: g.domain, correct: g.correct })));
    updateMissed(graded.map((g) => ({ id: g.id, correct: g.correct })));
    onStatsChange();
    setPhase("summary");
  }, [session, answers, onStatsChange]);

  const flag = useCallback(() => {
    if (!current) return;
    setBookmarks(toggleBookmark(current.id));
  }, [current]);

  // Keyboard shortcuts during practice.
  useEffect(() => {
    if (phase !== "practice") return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const key = e.key.toLowerCase();
      if (["a", "b", "c", "d"].includes(key)) select(key as OptionKey);
      else if (["1", "2", "3", "4"].includes(key)) select(OPTS[Number(key) - 1]);
      else if (key === "enter") {
        if (!currentAnswer?.checked) check();
        else if (index < session.length - 1) go(1);
        else finish();
      } else if (key === "arrowright") go(1);
      else if (key === "arrowleft") go(-1);
      else if (key === "f") flag();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, currentAnswer, index, session.length, select, check, go, finish, flag]);

  // ---- CONFIG ----
  if (phase === "config") {
    return (
      <StudyConfig
        domains={domains}
        setDomains={setDomains}
        source={source}
        setSource={setSource}
        size={size}
        setSize={setSize}
        availableCount={availableCount}
        missedCount={missed.size}
        bookmarkCount={savedBookmarks.size}
        onStart={start}
        onExit={onExit}
      />
    );
  }

  // ---- SUMMARY ----
  if (phase === "summary") {
    return (
      <StudySummary
        session={session}
        answers={answers}
        onExit={onExit}
        onRestart={() => setPhase("config")}
        onReviewMissed={() => {
          const wrong = session.filter((q, i) => answers[i].choice !== q.correct);
          if (wrong.length === 0) return;
          setSession(shuffle(wrong));
          setAnswers(wrong.map(() => ({ choice: null, checked: false })));
          setIndex(0);
          setPhase("practice");
        }}
      />
    );
  }

  // ---- PRACTICE ----
  if (!current) return null;
  const answered = answers.filter((a) => a.checked).length;
  const correctSoFar = session.filter((q, i) => answers[i].checked && answers[i].choice === q.correct).length;
  const acc = answered ? Math.round((correctSoFar / answered) * 100) : 0;
  const revealed = currentAnswer.checked;
  const isBookmarked = bookmarks.has(current.id);

  return (
    <div className="exam-wrap">
      <div className="exam-header">
        <div className="qnum">
          Question {index + 1} <small>of {session.length}</small>
        </div>
        <div className="timer" style={{ gap: 18 }}>
          <span className="pill" style={{ background: "var(--surface-2)" }}>
            {answered > 0 ? `${acc}% correct` : "Study mode"}
          </span>
          <button className="link-btn" onClick={onExit}>exit</button>
        </div>
      </div>

      <div className="progress-thin" aria-hidden>
        <span style={{ width: `${((index + 1) / session.length) * 100}%` }} />
      </div>

      <div className="question-card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <span
            className="pill"
            style={{ background: DOMAIN_COLORS[current.domain] + "22", color: DOMAIN_COLORS[current.domain] }}
          >
            Domain {current.domain} · {DOMAIN_SHORT[current.domain]}
          </span>
          <button
            className="link-btn"
            onClick={flag}
            style={{ color: isBookmarked ? "var(--accent)" : "var(--text-faint)", textDecoration: "none", fontSize: 14 }}
            title="Flag for later review (f)"
          >
            {isBookmarked ? "★ Flagged" : "☆ Flag"}
          </button>
        </div>

        <div className="question-stem">{current.text}</div>

        <div className="options">
          {OPTS.map((k) => {
            const isCorrect = k === current.correct;
            const isChosen = k === currentAnswer.choice;
            let cls = "option";
            if (revealed && isCorrect) cls += " opt-correct";
            else if (revealed && isChosen && !isCorrect) cls += " opt-wrong";
            else if (isChosen) cls += " selected";
            return (
              <button
                key={k}
                className={cls}
                onClick={() => select(k)}
                disabled={revealed}
                type="button"
              >
                <span className="marker">{k}</span>
                <span className="otext">{current.options[k]}</span>
                {revealed && isCorrect && <span className="opt-flag correct">✓ correct</span>}
                {revealed && isChosen && !isCorrect && <span className="opt-flag wrong">your answer</span>}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className={`feedback ${currentAnswer.choice === current.correct ? "ok" : "no"}`}>
            <strong>
              {currentAnswer.choice === current.correct ? "Correct." : "Not quite."}
            </strong>{" "}
            The verified answer is <b>{current.correct.toUpperCase()}</b>.
            {current.explanation ? (
              <div className="explanation">
                <span className="explanation-label">Why</span>
                {current.explanation}
              </div>
            ) : (
              <div className="explanation muted-note">
                Concept to review — <b>Domain {current.domain}: {DOMAIN_SHORT[current.domain]}</b>.
                Look up the reasoning in your study materials.
              </div>
            )}
          </div>
        )}

        <div className="exam-footer">
          <div>
            {index > 0 && (
              <button className="btn btn-ghost" onClick={() => go(-1)}>← Previous</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {!revealed ? (
              <button className="btn btn-primary" onClick={check} disabled={!currentAnswer.choice}>
                Check answer
              </button>
            ) : index < session.length - 1 ? (
              <button className="btn btn-primary" onClick={() => go(1)}>Next →</button>
            ) : (
              <button className="btn btn-primary" onClick={finish}>Finish session</button>
            )}
          </div>
        </div>
      </div>

      <div className="center" style={{ marginTop: 16 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>
          Keys: <b>A–D</b> or <b>1–4</b> to answer · <b>Enter</b> to check / continue · <b>F</b> to flag
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Config sub-screen
// ---------------------------------------------------------------------------

function StudyConfig(props: {
  domains: Set<DomainId>;
  setDomains: (s: Set<DomainId>) => void;
  source: Source;
  setSource: (s: Source) => void;
  size: Size;
  setSize: (s: Size) => void;
  availableCount: number;
  missedCount: number;
  bookmarkCount: number;
  onStart: () => void;
  onExit: () => void;
}) {
  const { domains, setDomains, source, setSource, size, setSize } = props;
  const toggleDomain = (d: DomainId) => {
    const next = new Set(domains);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    if (next.size > 0) setDomains(next);
  };

  const sizes: Size[] = [10, 25, 50, "all"];
  const sources: { key: Source; label: string; note: string; disabled: boolean }[] = [
    { key: "all", label: "All questions", note: "Full bank", disabled: false },
    { key: "missed", label: "Questions I've missed", note: `${props.missedCount} saved`, disabled: props.missedCount === 0 },
    { key: "bookmarked", label: "Flagged questions", note: `${props.bookmarkCount} flagged`, disabled: props.bookmarkCount === 0 },
  ];

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="logo">RD</div>
        <div className="brand">Study Mode<small>Practice with immediate feedback</small></div>
        <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={props.onExit}>← Home</button>
      </div>

      <div className="card">
        <div className="section-title">Content domains</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {([1, 2, 3, 4] as DomainId[]).map((d) => (
            <button
              key={d}
              className={`chip ${domains.has(d) ? "chip-on" : ""}`}
              onClick={() => toggleDomain(d)}
              style={domains.has(d) ? { borderColor: DOMAIN_COLORS[d], background: DOMAIN_COLORS[d] + "18", color: DOMAIN_COLORS[d] } : {}}
            >
              <span className="dot" style={{ background: DOMAIN_COLORS[d] }} />
              Domain {d} · {DOMAIN_SHORT[d]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Question set</div>
        <div className="opt-cards">
          {sources.map((s) => (
            <button
              key={s.key}
              className={`opt-card ${source === s.key ? "on" : ""}`}
              onClick={() => !s.disabled && setSource(s.key)}
              disabled={s.disabled}
            >
              <div className="oc-label">{s.label}</div>
              <div className="oc-note">{s.note}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-title">Session length</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {sizes.map((s) => (
            <button
              key={String(s)}
              className={`chip ${size === s ? "chip-on chip-primary" : ""}`}
              onClick={() => setSize(s)}
            >
              {s === "all" ? "All available" : `${s} questions`}
            </button>
          ))}
        </div>
      </div>

      <div className="card flex-between">
        <div className="muted" style={{ fontSize: 14 }}>
          <b style={{ color: "var(--text)" }}>{props.availableCount}</b> questions match your selection.
        </div>
        <button className="btn btn-primary btn-lg" onClick={props.onStart} disabled={props.availableCount === 0}>
          Start studying →
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary sub-screen
// ---------------------------------------------------------------------------

function StudySummary(props: {
  session: Question[];
  answers: Answer[];
  onExit: () => void;
  onRestart: () => void;
  onReviewMissed: () => void;
}) {
  const { session, answers } = props;
  const total = session.length;
  const correct = session.filter((q, i) => answers[i].choice === q.correct).length;
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const wrong = session.filter((q, i) => answers[i].choice !== q.correct);

  const byDomain = ([1, 2, 3, 4] as DomainId[]).map((d) => {
    const items = session.filter((q) => q.domain === d);
    const c = items.filter((q) => answers[session.indexOf(q)].choice === q.correct).length;
    return { d, seen: items.length, correct: c };
  }).filter((x) => x.seen > 0);

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="logo">RD</div>
        <div className="brand">Study session complete<small>Nice work</small></div>
      </div>

      <div className="card result-hero">
        <div className="score-big">{acc}<span className="of">%</span></div>
        <div className="score-caption">{correct} of {total} correct</div>
      </div>

      {byDomain.length > 0 && (
        <div className="card">
          <div className="section-title">By domain</div>
          {byDomain.map((b) => (
            <div className="subscore" key={b.d}>
              <div className="name">
                Domain {b.d}
                <small>{DOMAIN_SHORT[b.d]}</small>
              </div>
              <div className="val" style={{ color: DOMAIN_COLORS[b.d] }}>
                {Math.round((b.correct / b.seen) * 100)}%
                <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}> · {b.correct}/{b.seen}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="flex-between">
          <div>
            <div style={{ fontWeight: 700 }}>{wrong.length} to review</div>
            <div className="muted" style={{ fontSize: 13 }}>
              Missed questions were saved to your "missed" set for later practice.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {wrong.length > 0 && (
              <button className="btn btn-ghost" onClick={props.onReviewMissed}>Review missed now</button>
            )}
            <button className="btn btn-ghost" onClick={props.onRestart}>New session</button>
            <button className="btn btn-primary" onClick={props.onExit}>Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}
