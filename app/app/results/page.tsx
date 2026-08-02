import Link from "next/link";
import { StudentShell } from "../../components/StudentShell";

export default function ResultsPage() {
  return (
    <StudentShell current="progress" kicker="DIAGNOSTIC RESULT" title="Your first English profile">
      <section className="result-hero panel"><div><span className="status status-ready">Objective marking complete</span><h2>11 of 15 objective marks</h2><p>Your writing is safely submitted and awaiting teacher review. It is not counted as zero.</p></div><div className="result-ring"><strong>73%</strong><span>objective</span></div></section>
      <div className="result-grid">
        <section className="panel"><div className="panel-heading"><div><span className="card-kicker">EXAMINER LENS</span><h2>Marks you can recover</h2></div></div><div className="recovery-list"><article><span>+2</span><div><strong>Support comprehension answers</strong><p>You identified the right idea but did not quote or point to evidence.</p></div></article><article><span>+1</span><div><strong>Keep tense consistent</strong><p>Two verb shifts weakened otherwise correct sentences.</p></div></article><article><span>Next</span><div><strong>Writing organisation</strong><p>This skill will update when your narrative is reviewed.</p></div></article></div></section>
        <aside className="panel marking-card"><span className="card-kicker">WRITING STATUS</span><h2>Teacher review pending</h2><p>Your narrative has entered the marking queue.</p><div className="status-timeline"><span className="done">Submitted</span><span className="current">Reviewing</span><span>Feedback</span></div><small>Expected by Monday, 6:00 PM</small></aside>
      </div>
      <section className="panel skill-profile"><div className="panel-heading"><div><span className="card-kicker">SKILL PROFILE</span><h2>Evidence so far</h2></div></div><div className="skill-table"><div><strong>Vocabulary in context</strong><span className="level secure">Secure</span><span>4 / 5</span></div><div><strong>Sentence grammar</strong><span className="level developing">Developing</span><span>3 / 5</span></div><div><strong>Comprehension evidence</strong><span className="level developing">Developing</span><span>4 / 5</span></div><div><strong>Extended writing</strong><span className="level pending">Pending</span><span>—</span></div></div><div className="result-actions"><Link className="button" href="/app/plan">Open my repair plan</Link><Link className="button button-secondary" href="/app/home">Return home</Link></div></section>
    </StudentShell>
  );
}
