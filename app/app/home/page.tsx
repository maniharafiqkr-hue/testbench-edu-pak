import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import {
  attempts,
  repairItemReviews,
  repairPlanItems,
  repairPlans,
  skillProgressEvents,
  skills,
  users,
} from "@/db/schema";
import { getPilotStudentId } from "@/lib/pilot-session";
import { StudentShell } from "../../components/StudentShell";

export const dynamic = "force-dynamic";

export default async function StudentHome() {
  const studentId = await getPilotStudentId();
  if (!studentId) {
    return (
      <StudentShell current="home" kicker="YOUR ENGLISH STARTING POINT" title="Welcome to TestBench.">
        <section className="next-action-card"><span className="card-kicker">YOUR NEXT BEST ACTION</span><h2>Start the English diagnostic</h2><p>Five short sections will establish your first evidence profile before teacher review.</p><Link className="button button-light" href="/app/diagnostic">Start diagnostic</Link></section>
      </StudentShell>
    );
  }

  const db = getDb();
  const [[student], [attempt], [plan], events] = await Promise.all([
    db.select({ name: users.displayName }).from(users).where(eq(users.id, studentId)).limit(1),
    db.select({ id: attempts.id, status: attempts.status }).from(attempts).where(eq(attempts.studentId, studentId)).orderBy(desc(attempts.createdAt)).limit(1),
    db.select({ id: repairPlans.id, status: repairPlans.status }).from(repairPlans).where(eq(repairPlans.studentId, studentId)).orderBy(desc(repairPlans.createdAt)).limit(1),
    db
      .select({ createdAt: skillProgressEvents.createdAt, level: skillProgressEvents.level, maximumScore: skillProgressEvents.maximumScore, score: skillProgressEvents.score, skillId: skills.id, skillName: skills.name })
      .from(skillProgressEvents)
      .innerJoin(skills, eq(skills.id, skillProgressEvents.skillId))
      .where(eq(skillProgressEvents.studentId, studentId))
      .orderBy(desc(skillProgressEvents.createdAt)),
  ]);

  const planItems = plan ? await db
    .select({
      completedAt: repairPlanItems.completedAt,
      estimatedMinutes: repairPlanItems.estimatedMinutes,
      id: repairPlanItems.id,
      kind: repairPlanItems.kind,
      reviewStatus: repairItemReviews.status,
      title: repairPlanItems.title,
      unlocksAt: repairPlanItems.unlocksAt,
    })
    .from(repairPlanItems)
    .leftJoin(repairItemReviews, eq(repairItemReviews.itemId, repairPlanItems.id))
    .where(eq(repairPlanItems.planId, plan.id))
    .orderBy(asc(repairPlanItems.position)) : [];
  const completedCount = planItems.filter((item) => item.completedAt).length;
  const planPercentage = planItems.length ? Math.round((completedCount / planItems.length) * 100) : 0;
  const nextItem = planItems.find((item) => !item.completedAt);
  const latestBySkill = new Map<string, (typeof events)[number]>();
  for (const event of events) if (!latestBySkill.has(event.skillId)) latestBySkill.set(event.skillId, event);
  const currentSkills = [...latestBySkill.values()].sort((left, right) => left.score / left.maximumScore - right.score / right.maximumScore).slice(0, 3);

  let actionTitle = "Start your English diagnostic";
  let actionCopy = "Complete five short sections to establish your first skill profile.";
  let actionHref = "/app/diagnostic";
  let actionLabel = "Start diagnostic";
  let actionStatus = "Ready";
  if (attempt?.status === "in_progress") {
    actionTitle = "Continue your English diagnostic";
    actionCopy = "Your saved answers are waiting. Complete the remaining sections so your teacher can review the written evidence.";
    actionHref = "/app/diagnostic/session";
    actionLabel = "Continue diagnostic";
    actionStatus = "In progress";
  } else if (attempt && attempt.status !== "returned") {
    actionTitle = "Teacher review is in progress";
    actionCopy = "Your objective marks are ready. Written rubric marks and rewrite instructions will complete your evidence profile.";
    actionHref = `/app/results?attempt=${attempt.id}`;
    actionLabel = "View marking status";
    actionStatus = "Awaiting teacher";
  } else if (nextItem) {
    const pending = nextItem.kind === "rewrite" && nextItem.reviewStatus === "pending";
    const timeLocked = Boolean(nextItem.unlocksAt && nextItem.unlocksAt > new Date());
    actionTitle = pending ? "Your rewrite is with the teacher" : timeLocked ? "Your fresh retest is scheduled" : nextItem.title;
    actionCopy = pending
      ? "The teacher will compare both versions and confirm whether the targeted improvement was achieved."
      : timeLocked
        ? "A short delay protects the validity of the retest. You can review your progress while it unlocks."
        : `This ${nextItem.estimatedMinutes}-minute activity is the next unlocked step in your repair sequence.`;
    actionHref = pending || timeLocked ? "/app/plan" : `/app/plan/${nextItem.id}`;
    actionLabel = pending || timeLocked ? "View my plan" : "Start next activity";
    actionStatus = pending ? "Teacher check" : timeLocked ? "Delay active" : "Ready now";
  } else if (attempt?.status === "returned" && !plan) {
    actionTitle = "Build your repair plan";
    actionCopy = "Your marks and teacher feedback are ready to become a personalised sequence of practice, rewrite, and retest tasks.";
    actionHref = "/app/plan";
    actionLabel = "Build my plan";
    actionStatus = "Evidence ready";
  } else if (plan?.status === "completed") {
    actionTitle = "Your first repair loop is complete";
    actionCopy = "See how the diagnostic, rewrite, and fresh retest changed your skill evidence.";
    actionHref = "/app/progress";
    actionLabel = "View mastery history";
    actionStatus = "Loop complete";
  }

  const today = new Intl.DateTimeFormat("en-PK", { dateStyle: "full", timeZone: "Asia/Karachi" }).format(new Date()).toUpperCase();
  return (
    <StudentShell current="home" kicker={today} title={`Good to see you, ${student?.name ?? "student"}.`}>
      <section className="next-action-card">
        <div><span className="card-kicker">YOUR NEXT BEST ACTION</span><span className="status status-live">{actionStatus}</span></div>
        <h2>{actionTitle}</h2><p>{actionCopy}</p>
        {planItems.length ? <div className="action-meta"><span><strong>{planPercentage}%</strong> of plan complete</span><span><strong>{completedCount} of {planItems.length}</strong> activities complete</span></div> : null}
        <Link className="button button-light" href={actionHref}>{actionLabel}</Link>
      </section>

      <div className="dashboard-grid">
        <section className="panel priority-panel">
          <div className="panel-heading"><div><span className="card-kicker">LEARNING LOOP</span><h2>Your current sequence</h2></div><Link href="/app/plan">View plan</Link></div>
          <div className="starter-steps">
            <div className={`starter-step ${attempt ? "complete" : "current"}`}><span>{attempt ? "✓" : "1"}</span><div><strong>Complete diagnostic</strong><p>Create an evidence baseline</p></div></div>
            <div className={`starter-step ${attempt?.status === "returned" ? "complete" : attempt ? "current" : ""}`}><span>{attempt?.status === "returned" ? "✓" : "2"}</span><div><strong>Receive teacher feedback</strong><p>Rubric marks and rewrite target</p></div></div>
            <div className={`starter-step ${plan ? completedCount ? "complete" : "current" : ""}`}><span>{completedCount ? "✓" : "3"}</span><div><strong>Repair and rewrite</strong><p>Practice the weakest evidence</p></div></div>
            <div className={`starter-step ${plan?.status === "completed" ? "complete" : nextItem?.kind === "retest" ? "current" : ""}`}><span>{plan?.status === "completed" ? "✓" : "4"}</span><div><strong>Fresh delayed retest</strong><p>Prove the improvement lasts</p></div></div>
          </div>
        </section>

        <aside className="panel evidence-panel">
          <span className="card-kicker">CURRENT SIGNALS</span><h2>Latest skill evidence</h2>
          {currentSkills.length ? currentSkills.map((skill) => {
            const percentage = Math.round((skill.score / skill.maximumScore) * 100);
            return <div className="mini-skill" key={skill.skillId}><div><strong>{skill.skillName}</strong><span>{skill.level}</span></div><div className="progress-track"><i style={{ width: `${percentage}%` }} /></div></div>;
          }) : <p className="panel-note">Your skill profile appears after teacher marking is returned.</p>}
          {currentSkills.length ? <Link href="/app/progress">Open full progress →</Link> : null}
        </aside>
      </div>
    </StudentShell>
  );
}
