import { useEffect, useState } from "react";
import type { OptionKey, Question } from "../types";
import { formatClock } from "../lib/format";
import { MIN_TOTAL_ITEMS } from "../engine/examConfig";

interface Props {
  question: Question | null;
  questionNumber: number;
  timeLeft: number;
  onAnswer: (choice: OptionKey) => void;
  onQuit?: () => void;
}

const OPTS: OptionKey[] = ["a", "b", "c", "d"];

export default function ExamScreen({ question, questionNumber, timeLeft, onAnswer, onQuit }: Props) {
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [clockHidden, setClockHidden] = useState(false);
  const [quitting, setQuitting] = useState(false);

  // Clear selection whenever a new question arrives.
  useEffect(() => {
    setSelected(null);
  }, [question?.id, questionNumber]);

  // Guard against accidental tab close mid-exam.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (!question) return null;

  const clockClass =
    timeLeft <= 300 ? "danger" : timeLeft <= 900 ? "warn" : "";
  const progressPct = Math.min(100, (questionNumber / MIN_TOTAL_ITEMS) * 100);
  const beyondMin = questionNumber > MIN_TOTAL_ITEMS;

  const submit = () => {
    if (selected) onAnswer(selected);
  };

  return (
    <div className="exam-wrap">
      <div className="exam-header">
        <div className="qnum">
          Question {questionNumber}
          <small>{beyondMin ? "  · final adaptive stretch" : `  of at least ${MIN_TOTAL_ITEMS}`}</small>
        </div>
        <div className="timer">
          <span
            className={`clock ${clockHidden ? "hidden-clock" : clockClass}`}
            title="Time remaining"
          >
            {clockHidden ? "— : — — : — —" : formatClock(timeLeft)}
          </span>
          <button className="link-btn" onClick={() => setClockHidden((h) => !h)}>
            {clockHidden ? "show clock" : "hide clock"}
          </button>
        </div>
      </div>

      <div className="progress-thin" aria-hidden>
        <span style={{ width: `${progressPct}%` }} />
      </div>

      <div className="question-card">
        <div className="question-stem">{question.text}</div>
        <div className="options">
          {OPTS.map((k) => (
            <button
              key={k}
              className={`option ${selected === k ? "selected" : ""}`}
              onClick={() => setSelected(k)}
              type="button"
            >
              <span className="marker">{k}</span>
              <span className="otext">{question.options[k]}</span>
            </button>
          ))}
        </div>

        <div className="exam-footer">
          <div className="hint">
            You cannot return to this question after continuing. Select an answer to proceed.
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={!selected}>
            Next question →
          </button>
        </div>
      </div>

      <div className="center" style={{ marginTop: 18 }}>
        {onQuit && (
          <button className="link-btn" onClick={() => setQuitting(true)}>
            End exam early
          </button>
        )}
      </div>

      {quitting && (
        <div className="modal-overlay" onClick={() => setQuitting(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>End the exam now?</h3>
            <p>
              On the real exam, stopping before answering 125 questions means it
              is not scored. This attempt will be discarded and not saved.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setQuitting(false)}>Keep going</button>
              <button className="btn btn-primary" onClick={onQuit}>Discard &amp; exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
