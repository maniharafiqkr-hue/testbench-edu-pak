import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import {
  attempts,
  repairPlanItems,
  repairPlans,
  skillProgressEvents,
  skills,
} from "@/db/schema";
import { requireStudentUser } from "@/lib/accounts";
import { StudentShell } from "../../components/StudentShell";

export const dynamic = "force-dynamic";

function eventLabel(source: string) {
  const labels: Record<string, string> = {
    diagnostic: "Starting diagnostic",
    feedback_review: "Feedback reviewed",
    practice: "Targeted practice",
    teacher_confirmed_rewrite: "Teacher-confirmed rewrite",
    retest: "Fresh delayed retest",
  };
  return labels[source] ?? source.replaceAll("_", " ");
}

export default async function ProgressPage() {
  const studentId = (await requireStudentUser()).id;
  const db = getDb();
  const [events, plans, returnedAttempts] = await Promise.all([
    db
      .select({
        createdAt: skillProgressEvents.createdAt,
        id: skillProgressEvents.id,
        level: skillProgressEvents.level,
        maximumScore: skillProgressEvents.maximumScore,
        score: skillProgressEvents.score,
        skillId: skills.id,
        skillName: skills.name,
        source: skillProgressEvents.source,
      })
      .from(skillProgressEvents)
      .innerJoin(skills, eq(skills.id, skillProgressEvents.skillId))
      .where(eq(skillProgressEvents.studentId, studentId))
      .orderBy(desc(skillProgressEvents.createdAt)),
    db
      .select({ id: repairPlans.id, status: repairPlans.status })
      .from(repairPlans)
      .where(eq(repairPlans.studentId, studentId))
      .orderBy(desc(repairPlans.createdAt)),
    db
      .select({ finalScore: attempts.finalScore, id: attempts.id, returnedAt: attempts.returnedAt })
      .from(attempts)
      .where(eq(attempts.studentId, studentId))
      .orderBy(desc(attempts.returnedAt)),
  ]);

  const latestBySkill = new Map<string, (typeof events)[number]>();
  for (const event of events) {
    if (!latestBySkill.has(event.skillId)) latestBySkill.set(event.skillId, event);
  }
  const latestSkills = [...latestBySkill.values()].sort((left, right) =>
    left.score / left.maximumScore - right.score / right.maximumScore,
  );
  const currentPlan = plans[0];
  const planItems = currentPlan
    ? await db
        .select({ completedAt: repairPlanItems.completedAt })
        .from(repairPlanItems)
        .where(eq(repairPlanItems.planId, currentPlan.id))
    : [];
  const completedItems = planItems.filter((item) => item.completedAt).length;
  const planPercentage = planItems.length ? Math.round((completedItems / planItems.length) * 100) : 0;
  const secureCount = latestSkills.filter((skill) => skill.level === "secure").length;

  return (
    <StudentShell current="progress" kicker="MASTERY, NOT JUST MARKS" title="Your English progress">
      <section className="progress-summary-grid">
        <article className="panel"><span>Repair plan</span><strong>{planPercentage}%</strong><small>{completedItems} of {planItems.length || 0} activities complete</small></article>
        <article className="panel"><span>Skills secure</span><strong>{secureCount}/{latestSkills.length || 0}</strong><small>Based on your latest evidence</small></article>
        <article className="panel"><span>Diagnostics returned</span><strong>{returnedAttempts.filter((attempt) => attempt.returnedAt).length}</strong><small>Teacher-marked starting points</small></article>
      </section>

      <div className="dashboard-grid progress-main-grid">
        <section className="panel skill-profile">
          <div className="panel-heading"><div><span className="card-kicker">CURRENT SKILL PROFILE</span><h2>Latest evidence by skill</h2></div></div>
          {latestSkills.length ? (
            <div className="skill-table">
              {latestSkills.map((skill) => {
                const percentage = Math.round((skill.score / skill.maximumScore) * 100);
                return (
                  <div key={skill.skillId}>
                    <strong>{skill.skillName}</strong>
                    <span className={`level ${skill.level}`}>{skill.level}</span>
                    <span>{percentage}%</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="panel-note">Complete a diagnostic to create your first skill profile.</p>}
          <div className="result-actions"><Link className="button" href="/app/plan">Continue my plan</Link><Link className="button button-secondary" href="/app/results">View diagnostic result</Link></div>
        </section>

        <aside className="panel mastery-explainer">
          <span className="card-kicker">HOW LEVELS MOVE</span>
          <h2>Every level needs evidence</h2>
          <p>A diagnostic sets the baseline. Targeted practice records a repair. A teacher-confirmed rewrite and delayed fresh retest provide the strongest proof.</p>
          <div><span className="level priority">Priority</span><p>Less than half of the available evidence.</p></div>
          <div><span className="level developing">Developing</span><p>Some correct evidence, but not yet consistent.</p></div>
          <div><span className="level secure">Secure</span><p>At least 80%, or a completed repair proof.</p></div>
        </aside>
      </div>

      <section className="panel mastery-history">
        <div className="panel-heading"><div><span className="card-kicker">MASTERY HISTORY</span><h2>How your evidence changed</h2></div></div>
        {events.length ? (
          <div className="history-list">
            {events.map((event) => (
              <article key={event.id}>
                <span className={`history-dot ${event.level}`} />
                <div><strong>{event.skillName}</strong><p>{eventLabel(event.source)}</p></div>
                <div><strong>{event.score}/{event.maximumScore}</strong><small>{new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(event.createdAt)}</small></div>
              </article>
            ))}
          </div>
        ) : <p className="panel-note">Your evidence timeline will begin when teacher marking is returned.</p>}
      </section>
    </StudentShell>
  );
}
