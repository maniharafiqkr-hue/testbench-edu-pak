"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveDiagnosticAnswer,
  submitDiagnosticAttempt,
  type DiagnosticAnswerDraft,
} from "../actions";

export type DiagnosticQuestion = {
  id: string;
  section: string;
  marks: number;
  prompt: string;
  context: string | null;
  options: string[] | null;
  kind: "multiple_choice" | "short_answer" | "extended_writing";
  initialValue: string;
  isFlagged: boolean;
};

type SaveState = "saved" | "saving" | "error";

type Props = {
  attemptId: string;
  assessmentTitle: string;
  endsAt: string;
  questions: DiagnosticQuestion[];
};

function secondsUntil(endsAt: string) {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1_000));
}

export function DiagnosticSessionClient({
  attemptId,
  assessmentTitle,
  endsAt,
  questions,
}: Props) {
  const [current, setCurrent] = useState(0);
  const [answerValues, setAnswerValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((question) => [question.id, question.initialValue])),
  );
  const [flagged, setFlagged] = useState<string[]>(() =>
    questions.filter((question) => question.isFlagged).map((question) => question.id),
  );
  const [seconds, setSeconds] = useState(() => secondsUntil(endsAt));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTimers = useRef<Record<string, number>>({});
  const saveVersions = useRef<Record<string, number>>({});
  const expirySubmissionStarted = useRef(false);

  useEffect(() => {
    const updateTimer = () => setSeconds(secondsUntil(endsAt));
    updateTimer();
    const timer = window.setInterval(updateTimer, 1_000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => Object.values(timers).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const answered = questions.reduce(
    (count, question) => count + (answerValues[question.id]?.trim() ? 1 : 0),
    0,
  );
  const question = questions[current];
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");

  const persistQuestion = useCallback(
    async (draft: DiagnosticAnswerDraft, version: number) => {
      setSaveState("saving");
      try {
        await saveDiagnosticAnswer(attemptId, draft);
        if (saveVersions.current[draft.questionId] === version) {
          setSaveState("saved");
        }
      } catch {
        if (saveVersions.current[draft.questionId] === version) {
          setSaveState("error");
        }
      }
    },
    [attemptId],
  );

  function scheduleSave(questionId: string, value: string, isFlagged: boolean, delay = 650) {
    const nextVersion = (saveVersions.current[questionId] ?? 0) + 1;
    saveVersions.current[questionId] = nextVersion;
    window.clearTimeout(saveTimers.current[questionId]);
    setSaveState("saving");
    saveTimers.current[questionId] = window.setTimeout(() => {
      void persistQuestion({ questionId, value, isFlagged }, nextVersion);
    }, delay);
  }

  function updateAnswer(value: string) {
    setAnswerValues((existing) => ({ ...existing, [question.id]: value }));
    scheduleSave(question.id, value, flagged.includes(question.id), question.kind === "multiple_choice" ? 100 : 650);
  }

  function flushCurrentAnswer() {
    const value = answerValues[question.id] ?? "";
    scheduleSave(question.id, value, flagged.includes(question.id), 0);
  }

  function toggleFlag() {
    const willBeFlagged = !flagged.includes(question.id);
    setFlagged((existing) =>
      willBeFlagged
        ? [...existing, question.id]
        : existing.filter((questionId) => questionId !== question.id),
    );
    scheduleSave(question.id, answerValues[question.id] ?? "", willBeFlagged, 0);
  }

  const submit = useCallback(
    async (fromTimer = false) => {
      if (isSubmitting) {
        return;
      }

      if (
        !fromTimer &&
        !window.confirm(
          answered < questions.length
            ? `You have answered ${answered} of ${questions.length} questions. Submit anyway?`
            : "Submit your diagnostic? You will not be able to change these answers.",
        )
      ) {
        return;
      }

      setIsSubmitting(true);
      Object.values(saveTimers.current).forEach((timer) => window.clearTimeout(timer));
      const drafts = questions.map((item) => ({
        questionId: item.id,
        value: answerValues[item.id] ?? "",
        isFlagged: flagged.includes(item.id),
      }));

      try {
        await submitDiagnosticAttempt(attemptId, drafts);
      } catch {
        setIsSubmitting(false);
        setSaveState("error");
      }
    },
    [answerValues, answered, attemptId, flagged, isSubmitting, questions],
  );

  useEffect(() => {
    if (seconds === 0 && !expirySubmissionStarted.current) {
      expirySubmissionStarted.current = true;
      void submit(true);
    }
  }, [seconds, submit]);

  if (!question) {
    return null;
  }

  const saveMessage =
    saveState === "saving"
      ? "Saving answers…"
      : saveState === "error"
        ? "Save failed — keep this page open"
        : "All answers saved";

  return (
    <main className="exam-workspace">
      <header className="exam-header">
        <div>
          <strong>TestBench</strong>
          <span>{assessmentTitle} · Grade 10 English</span>
        </div>
        <div className={`exam-save exam-save-${saveState}`} aria-live="polite">
          <i /> {saveMessage}
        </div>
        <div className="exam-timer">
          <span>Time remaining</span>
          <strong>{minutes}:{remainder}</strong>
        </div>
      </header>

      <div className="exam-layout">
        <aside className="question-sidebar">
          <div>
            <span className="card-kicker">PROGRESS</span>
            <strong>{answered} of {questions.length} answered</strong>
            <div className="progress-track">
              <i style={{ width: `${(answered / questions.length) * 100}%` }} />
            </div>
          </div>
          <nav aria-label="Question palette">
            {questions.map((item, index) => (
              <button
                className={`${index === current ? "current" : ""} ${answerValues[item.id]?.trim() ? "answered" : ""}`}
                key={item.id}
                onClick={() => setCurrent(index)}
                type="button"
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{item.section}</strong>
                  <small>{item.marks} {item.marks === 1 ? "mark" : "marks"}</small>
                </div>
                {flagged.includes(item.id) ? <i>!</i> : null}
              </button>
            ))}
          </nav>
          <button
            className="submit-test"
            disabled={isSubmitting}
            onClick={() => void submit(false)}
            type="button"
          >
            {isSubmitting ? "Submitting…" : "Submit diagnostic"}
          </button>
        </aside>

        <section className="question-stage">
          <div className="question-meta">
            <div>
              <span>Question {current + 1} of {questions.length}</span>
              <span>{question.section}</span>
            </div>
            <button
              className={flagged.includes(question.id) ? "flag-active" : ""}
              onClick={toggleFlag}
              type="button"
            >
              {flagged.includes(question.id) ? "Flagged" : "Flag for review"}
            </button>
          </div>

          <article className="question-card">
            <span className="question-marks">
              {question.marks} {question.marks === 1 ? "mark" : "marks"}
            </span>
            <h1>{question.prompt}</h1>
            {question.context ? (
              <div className={question.kind === "extended_writing" ? "prompt-note" : "passage-box"}>
                <span>{question.kind === "extended_writing" ? "Writing guidance" : "Read the text"}</span>
                <p>{question.context}</p>
              </div>
            ) : null}

            {question.kind === "multiple_choice" ? (
              <div aria-label="Answer choices" className="answer-options" role="radiogroup">
                {question.options?.map((option, index) => (
                  <button
                    aria-checked={answerValues[question.id] === option}
                    className={answerValues[question.id] === option ? "selected" : ""}
                    key={option}
                    onClick={() => updateAnswer(option)}
                    role="radio"
                    type="button"
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    <p>{option}</p>
                  </button>
                ))}
              </div>
            ) : null}

            {question.kind === "short_answer" ? (
              <div className="written-answer">
                <label htmlFor="short-answer">Your answer</label>
                <textarea
                  id="short-answer"
                  onBlur={flushCurrentAnswer}
                  onChange={(event) => updateAnswer(event.target.value)}
                  placeholder="Write a complete answer and include one supporting detail…"
                  value={answerValues[question.id] ?? ""}
                />
                <small>
                  {(answerValues[question.id] ?? "").split(/\s+/).filter(Boolean).length} words · Aim for 35–50
                </small>
              </div>
            ) : null}

            {question.kind === "extended_writing" ? (
              <div className="written-answer">
                <div className="writing-toolbar">
                  <label htmlFor="writing-answer">Your narrative</label>
                  <span>Typed response</span>
                </div>
                <textarea
                  className="essay-box"
                  id="writing-answer"
                  onBlur={flushCurrentAnswer}
                  onChange={(event) => updateAnswer(event.target.value)}
                  placeholder="Begin your narrative here…"
                  value={answerValues[question.id] ?? ""}
                />
                <small>
                  {(answerValues[question.id] ?? "").split(/\s+/).filter(Boolean).length} words · Target 100–125
                </small>
              </div>
            ) : null}
          </article>

          <footer className="question-actions">
            <button
              className="button button-secondary"
              disabled={current === 0 || isSubmitting}
              onClick={() => setCurrent((value) => Math.max(0, value - 1))}
              type="button"
            >
              ← Previous
            </button>
            <span>Use the palette to revisit any question.</span>
            {current < questions.length - 1 ? (
              <button
                className="button"
                disabled={isSubmitting}
                onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}
                type="button"
              >
                Next question →
              </button>
            ) : (
              <button
                className="button"
                disabled={isSubmitting}
                onClick={() => void submit(false)}
                type="button"
              >
                {isSubmitting ? "Submitting…" : "Submit diagnostic"}
              </button>
            )}
          </footer>
        </section>
      </div>
    </main>
  );
}
