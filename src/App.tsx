import { useEffect, useState } from "react";
import { useExam } from "./hooks/useExam";
import StartScreen from "./components/StartScreen";
import ExamScreen from "./components/ExamScreen";
import ResultsScreen from "./components/ResultsScreen";
import { loadHistory, saveResult, type HistoryEntry } from "./lib/storage";

export default function App() {
  const exam = useExam();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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

  if (exam.status === "running") {
    return (
      <ExamScreen
        question={exam.question}
        questionNumber={exam.questionNumber}
        timeLeft={exam.timeLeft}
        onAnswer={exam.answer}
        onQuit={exam.reset}
      />
    );
  }

  if (exam.status === "finished" && exam.result) {
    return <ResultsScreen result={exam.result} onRestart={exam.reset} />;
  }

  return (
    <StartScreen
      history={history}
      onStart={exam.start}
      onHistoryChange={setHistory}
    />
  );
}
