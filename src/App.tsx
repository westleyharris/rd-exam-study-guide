import { useCallback, useEffect, useState } from "react";
import { useExam } from "./hooks/useExam";
import StartScreen from "./components/StartScreen";
import ExamScreen from "./components/ExamScreen";
import ResultsScreen from "./components/ResultsScreen";
import StudyMode from "./components/StudyMode";
import { loadHistory, saveResult, type HistoryEntry } from "./lib/storage";
import { loadStats, type StudyStats } from "./lib/studyStorage";

type View = "home" | "exam" | "study";

export default function App() {
  const exam = useExam();
  const [view, setView] = useState<View>("home");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [studyStats, setStudyStats] = useState<StudyStats>(() => loadStats());

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Persist a finished result exactly once.
  useEffect(() => {
    if (exam.status === "finished" && exam.result) {
      setHistory(saveResult(exam.result));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.status]);

  const refreshStudyStats = useCallback(() => setStudyStats(loadStats()), []);

  const startExam = useCallback(() => {
    exam.start();
    setView("exam");
  }, [exam]);

  const exitToHome = useCallback(() => {
    exam.reset();
    setView("home");
    setHistory(loadHistory());
  }, [exam]);

  if (view === "exam") {
    if (exam.status === "finished" && exam.result) {
      return <ResultsScreen result={exam.result} onRestart={exitToHome} />;
    }
    if (exam.status === "running") {
      return (
        <ExamScreen
          question={exam.question}
          questionNumber={exam.questionNumber}
          timeLeft={exam.timeLeft}
          onAnswer={exam.answer}
          onQuit={exitToHome}
        />
      );
    }
    // idle fallback (shouldn't normally happen)
    setView("home");
  }

  if (view === "study") {
    return <StudyMode onExit={() => setView("home")} onStatsChange={refreshStudyStats} />;
  }

  return (
    <StartScreen
      history={history}
      studyStats={studyStats}
      onStartExam={startExam}
      onStudy={() => setView("study")}
      onHistoryChange={setHistory}
    />
  );
}
