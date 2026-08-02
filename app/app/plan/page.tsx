import Link from "next/link";
import { StudentShell } from "../../components/StudentShell";

const tasks = [
  ["Today", "Review comprehension evidence", "See why two correct ideas did not earn full marks.", "12 min", "ready"],
  ["Monday", "Repair tense consistency", "Complete eight short corrections from your mistakes.", "10 min", "locked"],
  ["Tuesday", "Rewrite your narrative opening", "Begins when teacher feedback is returned.", "18 min", "pending"],
  ["Thursday", "Retest on a fresh passage", "Prove the repaired comprehension skill after a delay.", "15 min", "locked"],
];

export default function RepairPlanPage() {
  return (
    <StudentShell current="plan" kicker="WEEK OF 3 AUGUST" title="Your seven-day repair plan">
      <section className="plan-intro"><div><span className="eyebrow">3 PRIORITIES · 55 MINUTES</span><h2>A small plan built from your actual lost marks.</h2><p>Finish the work in order. The final retest checks whether the improvement lasts.</p></div><div className="plan-progress"><strong>0%</strong><span>this week</span></div></section>
      <div className="plan-layout"><section className="task-list">{tasks.map(([day, title, copy, time, state], index) => <article className={`plan-task ${state}`} key={title}><div className="task-number">{index + 1}</div><div className="task-copy"><span>{day}</span><h3>{title}</h3><p>{copy}</p></div><div className="task-action"><span>{time}</span>{state === "ready" ? <Link href="/app/results">Start →</Link> : <small>{state === "pending" ? "Awaiting review" : "Unlocks next"}</small>}</div></article>)}</section><aside className="panel plan-why"><span className="card-kicker">WHY THIS PLAN?</span><h2>Your evidence</h2><p>Two comprehension answers had the right idea but lacked passage evidence. Tense accuracy also fell on longer sentences.</p><div><span>Highest opportunity</span><strong>Comprehension evidence</strong></div><div><span>Retest scheduled</span><strong>Thursday</strong></div></aside></div>
    </StudentShell>
  );
}
