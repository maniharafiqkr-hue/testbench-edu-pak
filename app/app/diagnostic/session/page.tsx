"use client";

import { useEffect, useMemo, useState } from "react";

type Question = {
  id: number;
  section: string;
  marks: number;
  prompt: string;
  context?: string;
  options?: string[];
  kind: "choice" | "short" | "writing";
};

const questions: Question[] = [
  { id: 1, section: "Grammar", marks: 1, prompt: "Choose the sentence with correct subject–verb agreement.", options: ["The list of books are on the desk.", "The list of books is on the desk.", "The lists of book is on the desk.", "The list of books were on the desk."], kind: "choice" },
  { id: 2, section: "Vocabulary", marks: 1, prompt: "In the sentence below, what does ‘reluctant’ most nearly mean?", context: "Although Hira understood the value of the opportunity, she was reluctant to speak before the large audience.", options: ["Eager", "Unwilling", "Unable", "Prepared"], kind: "choice" },
  { id: 3, section: "Punctuation", marks: 1, prompt: "Choose the correctly punctuated sentence.", options: ["After the rain stopped we continued, our journey.", "After the rain stopped, we continued our journey.", "After the rain, stopped we continued our journey.", "After the rain stopped we, continued our journey."], kind: "choice" },
  { id: 4, section: "Comprehension", marks: 3, prompt: "Why did the community library become valuable to the neighbourhood? Support your answer with one detail from the passage.", context: "For years, the empty building at the corner of Amin Street had been ignored. A group of students persuaded local residents to turn it into a small library. Families donated books, retired teachers volunteered twice a week, and younger children finally had a quiet place to read after school. Within months, the library had become more than a room of books; it was a meeting place where neighbours shared skills and solved problems together.", kind: "short" },
  { id: 5, section: "Narrative writing", marks: 6, prompt: "Write a narrative of 100–125 words beginning with: ‘I knew I had only one chance to make things right.’", context: "Your narrative should include a clear problem, logical sequence, description, and conclusion. You may plan briefly on paper before writing.", kind: "writing" },
];

export default function DiagnosticSession() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(30 * 60);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const answered = useMemo(() => Object.values(answers).filter((answer) => answer.trim()).length, [answers]);
  const question = questions[current];
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");

  function updateAnswer(value: string) {
    setAnswers((existing) => ({ ...existing, [question.id]: value }));
  }

  function toggleFlag() {
    setFlagged((existing) => existing.includes(question.id) ? existing.filter((id) => id !== question.id) : [...existing, question.id]);
  }

  function submitAttempt() {
    window.location.assign("/app/results");
  }

  return (
    <main className="exam-workspace">
      <header className="exam-header">
        <div><strong>TestBench</strong><span>Starting diagnostic · Grade 10 English</span></div>
        <div className="exam-save"><i /> All answers saved</div>
        <div className="exam-timer"><span>Time remaining</span><strong>{minutes}:{remainder}</strong></div>
      </header>

      <div className="exam-layout">
        <aside className="question-sidebar">
          <div><span className="card-kicker">PROGRESS</span><strong>{answered} of {questions.length} answered</strong><div className="progress-track"><i style={{ width: `${(answered / questions.length) * 100}%` }} /></div></div>
          <nav aria-label="Question palette">
            {questions.map((item, index) => (
              <button className={`${index === current ? "current" : ""} ${answers[item.id]?.trim() ? "answered" : ""}`} key={item.id} onClick={() => setCurrent(index)}>
                <span>{item.id}</span><div><strong>{item.section}</strong><small>{item.marks} {item.marks === 1 ? "mark" : "marks"}</small></div>{flagged.includes(item.id) && <i>!</i>}
              </button>
            ))}
          </nav>
          <button className="submit-test" onClick={submitAttempt}>Review & submit</button>
        </aside>

        <section className="question-stage">
          <div className="question-meta"><div><span>Question {question.id} of {questions.length}</span><span>{question.section}</span></div><button className={flagged.includes(question.id) ? "flag-active" : ""} onClick={toggleFlag}>{flagged.includes(question.id) ? "Flagged" : "Flag for review"}</button></div>
          <article className="question-card">
            <span className="question-marks">{question.marks} {question.marks === 1 ? "mark" : "marks"}</span>
            <h1>{question.prompt}</h1>
            {question.context && <div className={question.kind === "writing" ? "prompt-note" : "passage-box"}><span>{question.kind === "writing" ? "Writing guidance" : "Read the text"}</span><p>{question.context}</p></div>}

            {question.kind === "choice" && <div className="answer-options">{question.options?.map((option, index) => <label className={answers[question.id] === option ? "selected" : ""} key={option}><input checked={answers[question.id] === option} name={`question-${question.id}`} onChange={() => updateAnswer(option)} type="radio" /><span>{String.fromCharCode(65 + index)}</span><p>{option}</p></label>)}</div>}
            {question.kind === "short" && <div className="written-answer"><label htmlFor="short-answer">Your answer</label><textarea id="short-answer" onChange={(event) => updateAnswer(event.target.value)} placeholder="Write a complete answer and include one supporting detail…" value={answers[question.id] ?? ""} /><small>{(answers[question.id] ?? "").split(/\s+/).filter(Boolean).length} words · Aim for 35–60</small></div>}
            {question.kind === "writing" && <div className="written-answer"><div className="writing-toolbar"><label htmlFor="writing-answer">Your narrative</label><span>Typed response</span></div><textarea className="essay-box" id="writing-answer" onChange={(event) => updateAnswer(event.target.value)} placeholder="Begin your narrative here…" value={answers[question.id] ?? ""} /><small>{(answers[question.id] ?? "").split(/\s+/).filter(Boolean).length} words · Target 100–125</small></div>}
          </article>

          <footer className="question-actions"><button className="button button-secondary" disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>← Previous</button><span>Use the palette to revisit any question.</span>{current < questions.length - 1 ? <button className="button" onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}>Next question →</button> : <button className="button" onClick={submitAttempt}>Review & submit</button>}</footer>
        </section>
      </div>
    </main>
  );
}
