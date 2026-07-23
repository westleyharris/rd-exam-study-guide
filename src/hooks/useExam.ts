import { useCallback, useEffect, useRef, useState } from "react";
import { ExamEngine } from "../engine/cat";
import { EXAM_SECONDS } from "../engine/examConfig";
import bankData from "../data/questions.json";
import type { ExamResult, OptionKey, Question } from "../types";

const BANK = bankData as Question[];

export type ExamStatus = "idle" | "running" | "finished";

export interface UseExam {
  status: ExamStatus;
  question: Question | null;
  questionNumber: number;
  timeLeft: number;
  result: ExamResult | null;
  start: () => void;
  answer: (choice: OptionKey) => void;
  reset: () => void;
}

export function useExam(): UseExam {
  const engineRef = useRef<ExamEngine | null>(null);
  const questionShownAt = useRef<number>(0);
  const [status, setStatus] = useState<ExamStatus>("idle");
  const [question, setQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const [result, setResult] = useState<ExamResult | null>(null);

  const finish = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setResult(engine.buildResult());
    setStatus("finished");
    setQuestion(null);
  }, []);

  const start = useCallback(() => {
    const engine = new ExamEngine(BANK);
    engineRef.current = engine;
    const first = engine.start();
    questionShownAt.current = Date.now();
    setQuestion(first);
    setQuestionNumber(engine.currentNumber());
    setTimeLeft(EXAM_SECONDS);
    setResult(null);
    setStatus("running");
  }, []);

  const answer = useCallback(
    (choice: OptionKey) => {
      const engine = engineRef.current;
      if (!engine || status !== "running") return;
      const seconds = (Date.now() - questionShownAt.current) / 1000;
      const next = engine.answer(choice, seconds);
      if (next === null) {
        finish();
        return;
      }
      questionShownAt.current = Date.now();
      setQuestion(next);
      setQuestionNumber(engine.currentNumber());
    },
    [status, finish],
  );

  const reset = useCallback(() => {
    engineRef.current = null;
    setStatus("idle");
    setQuestion(null);
    setResult(null);
    setTimeLeft(EXAM_SECONDS);
  }, []);

  // Countdown timer.
  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          engineRef.current?.expire();
          finish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [status, finish]);

  return {
    status,
    question,
    questionNumber,
    timeLeft,
    result,
    start,
    answer,
    reset,
  };
}
