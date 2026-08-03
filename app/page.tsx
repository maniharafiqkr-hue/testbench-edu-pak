import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "./components/Brand";

export const metadata: Metadata = {
  title: "English exam practice with a clear next step",
  description: "Diagnose weak English skills, understand lost marks, rewrite your work, and retest before the board exam.",
};

const method = [
  ["01", "Attempt", "Practice calmly or take a realistic timed mock."],
  ["02", "Mark", "See objective results and criterion-based writing feedback."],
  ["03", "Understand", "Learn the exact error behind each lost mark."],
  ["04", "Rewrite", "Improve the sentence, paragraph, précis, or response."],
  ["05", "Retest", "Prove the skill on a fresh question after a short delay."],
];

const skills = [
  ["Vocabulary & grammar", "Rules, transformations, context, and accurate sentence control."],
  ["Reading comprehension", "Main idea, inference, evidence, and complete short responses."],
  ["Précis & title", "Concise meaning, coherence, accuracy, and a fitting title."],
  ["Narrative writing", "Conflict, sequence, description, dialogue, and a clear conclusion."],
  ["Explanatory essays", "Task fulfilment, paragraph logic, vocabulary, and mechanics."],
  ["Exam timing", "Know where time is being lost and practise the right response length."],
];

export default function Home() {
  return (
    <main className="marketing-page">
      <header className="site-header container">
        <Brand />
        <nav aria-label="Main navigation" className="site-nav">
          <a href="#method">How it works</a>
          <a href="#skills">English skills</a>
          <Link href="/staff">For teachers</Link>
        </nav>
        <div className="header-actions">
          <Link className="text-link" href="/auth/sign-in">Log in</Link>
          <Link className="button button-small" href="/auth/sign-up">Create student account</Link>
        </div>
      </header>

      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">FBISE · GRADE 10 ENGLISH</span>
          <h1>Don&apos;t just see your score. See what to fix next.</h1>
          <p className="hero-lede">TestBench turns English practice into a clear improvement loop: understand every lost mark, rewrite weak work, and retest the skill while it is still fresh.</p>
          <div className="hero-actions">
            <Link className="button" href="/auth/sign-up">Take the free diagnostic</Link>
            <a className="button button-secondary" href="#method">See how it works</a>
          </div>
          <div className="trust-row" aria-label="Program facts">
            <span><strong>30 min</strong> first diagnostic</span>
            <span><strong>7 skills</strong> clearly measured</span>
            <span><strong>1 plan</strong> for your next week</span>
          </div>
        </div>

        <div className="hero-report" aria-label="Example examiner report">
          <div className="report-topline"><span className="report-label">Examiner Lens</span><span className="status status-ready">Plan ready</span></div>
          <h2>Where you can recover marks</h2>
          <div className="report-score-row"><div><span className="score-number">11</span><span className="score-total">/ 15 objective</span></div><span className="trend-pill">3 marks recoverable</span></div>
          <div className="priority-list">
            <div className="priority-item"><span className="priority-rank">01</span><div><strong>Evidence in comprehension</strong><p>Your answer is correct but unsupported by the passage.</p></div><span className="priority-mark">+2</span></div>
            <div className="priority-item"><span className="priority-rank">02</span><div><strong>Paragraph organisation</strong><p>Good ideas need a clearer opening and sequence.</p></div><span className="priority-mark">+1</span></div>
            <div className="priority-item muted-priority"><span className="priority-rank">03</span><div><strong>Tense consistency</strong><p>Two shifts weakened an otherwise strong narrative.</p></div><span className="priority-mark">Fix</span></div>
          </div>
          <div className="report-next"><span>Next action · 18 minutes</span><strong>Rewrite your opening paragraph →</strong></div>
        </div>
      </section>

      <section className="signal-strip"><div className="container signal-grid"><p>Built around the current Grade 10 English assessment structure.</p><div><span>Vocabulary & grammar</span><span>Comprehension</span><span>Précis</span><span>Writing</span></div></div></section>

      <section className="section container" id="method">
        <div className="section-heading split-heading"><div><span className="eyebrow">THE TESTBENCH METHOD</span><h2>Every test ends with a next step.</h2></div><p>Scores tell you what happened. TestBench helps you change what happens next.</p></div>
        <div className="method-grid">{method.map(([number, title, copy]) => <article className="method-card" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>

      <section className="section soft-section" id="skills"><div className="container"><div className="section-heading"><span className="eyebrow">ENGLISH, MARK BY MARK</span><h2>Know the skill behind the score.</h2></div><div className="skills-grid">{skills.map(([title, copy], index) => <article className="skill-card" key={title}><span className="skill-index">0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>

      <section className="teacher-section container"><div><span className="eyebrow light">TEACHER-REVIEWED WRITING</span><h2>Writing deserves more than a model answer.</h2></div><div><p>Extended responses are reviewed against a clear rubric. Students see one strength, one priority improvement, and exactly what to rewrite.</p><Link className="button button-light" href="/staff">Explore the teacher workspace</Link></div></section>

      <footer className="site-footer container"><Brand /><p>English exam practice that turns every lost mark into a next step.</p><span>© 2026 TestBench</span></footer>
    </main>
  );
}
