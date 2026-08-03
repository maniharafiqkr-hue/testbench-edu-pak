import Link from "next/link";
import { requireStudentUser } from "@/lib/accounts";
import { StudentShell } from "../../components/StudentShell";
import { startDiagnosticAttempt } from "./actions";

export default async function DiagnosticInstructions() {
  await requireStudentUser();
  return (
    <StudentShell current="practice" kicker="STARTING POINT" title="English diagnostic">
      <div className="instructions-layout">
        <section className="panel instructions-main">
          <span className="eyebrow">BEFORE YOU BEGIN</span><h2>One short test. One useful starting point.</h2><p>This diagnostic samples the skills that matter across Grade 10 English. It is not a final prediction and it will not affect any school grade.</p>
          <div className="instruction-grid">
            <div><span>01</span><strong>30 minutes</strong><p>A visible timer helps us understand pacing.</p></div>
            <div><span>02</span><strong>5 sections</strong><p>Grammar, vocabulary, comprehension, précis, and writing.</p></div>
            <div><span>03</span><strong>Mixed marking</strong><p>Objective results are immediate; writing is teacher-reviewed.</p></div>
            <div><span>04</span><strong>One attempt</strong><p>Answer honestly so your first plan is useful.</p></div>
          </div>
          <div className="integrity-note"><strong>Keep this attempt honest.</strong><p>Use no notes or outside help. If you are unsure, choose your best answer—we measure uncertainty too.</p></div>
          <div className="instruction-actions">
            <form action={startDiagnosticAttempt}>
              <button className="button" type="submit">Start or resume diagnostic</button>
            </form>
            <Link className="button button-secondary" href="/app/home">Return home</Link>
          </div>
        </section>
        <aside className="panel checklist-panel"><span className="card-kicker">READY CHECK</span><h2>Before the timer starts</h2><ul><li>Find a quiet 30-minute window</li><li>Keep paper nearby for planning</li><li>Use a stable device and connection</li><li>Submit your own first response</li></ul><div className="support-note"><span>Writing review</span><strong>Usually returned within 24 hours</strong></div></aside>
      </div>
    </StudentShell>
  );
}
