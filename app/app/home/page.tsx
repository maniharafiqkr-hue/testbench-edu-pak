import Link from "next/link";
import { StudentShell } from "../../components/StudentShell";

export default function StudentHome() {
  return (
    <StudentShell current="home" kicker="SUNDAY, 2 AUGUST" title="Good evening, Areeba.">
      <section className="next-action-card">
        <div><span className="card-kicker">YOUR NEXT BEST ACTION</span><span className="status status-live">Diagnostic in progress</span></div>
        <h2>Finish your English starting diagnostic</h2>
        <p>You have completed grammar and vocabulary. Comprehension and writing will give us enough evidence to build your first repair plan.</p>
        <div className="action-meta"><span><strong>18 min</strong> remaining</span><span><strong>3 of 5</strong> sections complete</span></div>
        <Link className="button button-light" href="/app/diagnostic/session">Continue diagnostic</Link>
      </section>

      <div className="dashboard-grid">
        <section className="panel priority-panel">
          <div className="panel-heading"><div><span className="card-kicker">THIS WEEK</span><h2>Your preparation</h2></div><Link href="/app/plan">View plan</Link></div>
          <div className="starter-steps">
            <div className="starter-step complete"><span>✓</span><div><strong>Set your target</strong><p>Grade A · FBISE English</p></div></div>
            <div className="starter-step current"><span>2</span><div><strong>Complete diagnostic</strong><p>18 minutes remaining</p></div></div>
            <div className="starter-step"><span>3</span><div><strong>Receive your repair plan</strong><p>Unlocks after diagnostic</p></div></div>
            <div className="starter-step"><span>4</span><div><strong>Rewrite and retest</strong><p>Prove the improvement</p></div></div>
          </div>
        </section>

        <aside className="panel evidence-panel">
          <span className="card-kicker">EARLY SIGNALS</span><h2>What we know so far</h2>
          <div className="mini-skill"><div><strong>Vocabulary in context</strong><span>Secure</span></div><div className="progress-track"><i style={{ width: "82%" }} /></div></div>
          <div className="mini-skill"><div><strong>Sentence grammar</strong><span>Developing</span></div><div className="progress-track"><i style={{ width: "58%" }} /></div></div>
          <p className="panel-note">Your full skill profile will appear after comprehension and writing are reviewed.</p>
        </aside>
      </div>

      <section className="panel recent-panel"><div className="panel-heading"><div><span className="card-kicker">QUICK PRACTICE</span><h2>Available after your diagnostic</h2></div></div><div className="practice-preview"><article><span>10 min</span><h3>Grammar precision</h3><p>Agreement, tense, and sentence transformation.</p></article><article><span>15 min</span><h3>Comprehension evidence</h3><p>Support every answer with the right detail.</p></article><article><span>20 min</span><h3>Paragraph rewrite</h3><p>Turn strong ideas into a clear sequence.</p></article></div></section>
    </StudentShell>
  );
}
