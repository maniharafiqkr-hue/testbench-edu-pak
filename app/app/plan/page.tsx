import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/db";
import {
  attempts,
  attemptSkillResults,
  repairItemReviews,
  repairPlanItems,
  repairPlans,
  skills,
} from "@/db/schema";
import { requireStudentUser } from "@/lib/accounts";
import { StudentShell } from "../../components/StudentShell";
import { buildRepairPlan } from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ built?: string; completed?: string }> };

export default async function RepairPlanPage({ searchParams }: Props) {
  const studentId = (await requireStudentUser()).id;
  const db = getDb();
  const { built, completed } = await searchParams;
  const [plan] = await db
    .select({
      createdAt: repairPlans.createdAt,
      id: repairPlans.id,
      sourceAttemptId: repairPlans.sourceAttemptId,
      status: repairPlans.status,
    })
    .from(repairPlans)
    .where(eq(repairPlans.studentId, studentId))
    .orderBy(desc(repairPlans.createdAt))
    .limit(1);

  if (!plan) {
    const [returnedAttempt] = await db
      .select({ id: attempts.id, returnedAt: attempts.returnedAt })
      .from(attempts)
      .where(and(eq(attempts.studentId, studentId), eq(attempts.status, "returned")))
      .orderBy(desc(attempts.returnedAt))
      .limit(1);

    return (
      <StudentShell current="plan" kicker="PERSONALISED REPAIR" title="Your repair plan">
        <section className="panel activity-state-card">
          <span className="status status-neutral">{returnedAttempt ? "Evidence ready" : "Teacher review required"}</span>
          <h2>{returnedAttempt ? "Turn your returned marks into a learning sequence." : "Your plan unlocks after all written feedback is returned."}</h2>
          <p>{returnedAttempt
            ? "TestBench will rank the lost marks, select a priority skill, add your teacher’s rewrite instruction, and schedule a fresh retest."
            : "Your objective result is saved. The plan needs the teacher’s rubric marks and rewrite instructions before it can choose the right work."}</p>
          {returnedAttempt ? (
            <form action={buildRepairPlan}>
              <input name="attemptId" type="hidden" value={returnedAttempt.id} />
              <button className="button" type="submit">Generate my repair plan</button>
            </form>
          ) : <Link className="button" href="/app/results">View marking status</Link>}
        </section>
      </StudentShell>
    );
  }

  const [items, priorityRows] = await Promise.all([
    db
      .select({
        achieved: repairItemReviews.achieved,
        completedAt: repairPlanItems.completedAt,
        estimatedMinutes: repairPlanItems.estimatedMinutes,
        id: repairPlanItems.id,
        instructions: repairPlanItems.instructions,
        kind: repairPlanItems.kind,
        position: repairPlanItems.position,
        reviewStatus: repairItemReviews.status,
        skillName: skills.name,
        title: repairPlanItems.title,
        unlocksAt: repairPlanItems.unlocksAt,
      })
      .from(repairPlanItems)
      .leftJoin(skills, eq(skills.id, repairPlanItems.skillId))
      .leftJoin(repairItemReviews, eq(repairItemReviews.itemId, repairPlanItems.id))
      .where(eq(repairPlanItems.planId, plan.id))
      .orderBy(asc(repairPlanItems.position)),
    db
      .select({
        level: attemptSkillResults.level,
        maximumScore: attemptSkillResults.maximumScore,
        name: skills.name,
        score: attemptSkillResults.score,
      })
      .from(attemptSkillResults)
      .innerJoin(skills, eq(skills.id, attemptSkillResults.skillId))
      .where(eq(attemptSkillResults.attemptId, plan.sourceAttemptId)),
  ]);

  const completeCount = items.filter((item) => item.completedAt).length;
  const percentage = items.length ? Math.round((completeCount / items.length) * 100) : 0;
  const minutes = items.reduce((total, item) => total + item.estimatedMinutes, 0);
  const priorities = [...priorityRows]
    .sort((left, right) => left.score / left.maximumScore - right.score / right.maximumScore)
    .slice(0, 3);
  const retest = items.find((item) => item.kind === "retest");
  const retestDate = retest?.unlocksAt
    ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(retest.unlocksAt)
    : "After the rewrite";

  return (
    <StudentShell current="plan" kicker="PERSONALISED REPAIR" title="Your evidence-led repair plan">
      {built === "1" ? <div className="form-alert form-alert-success">Your plan was generated from the returned rubric and feedback.</div> : null}
      {completed === "1" ? <div className="form-alert form-alert-success">Step completed. The next activity is now ready.</div> : null}
      <section className="plan-intro">
        <div>
          <span className="eyebrow">{priorities.length} PRIORITIES · {minutes} MINUTES</span>
          <h2>A small sequence built from your actual lost marks.</h2>
          <p>Finish the work in order. Your teacher confirms the rewrite before a different question tests whether the repair lasts.</p>
        </div>
        <div className="plan-progress"><strong>{percentage}%</strong><span>{plan.status === "completed" ? "plan complete" : "completed"}</span></div>
      </section>

      <div className="plan-layout">
        <section className="task-list">
          {items.map((item, index) => {
            const priorIncomplete = items.some((candidate) => candidate.position < item.position && !candidate.completedAt);
            const timeLocked = Boolean(item.unlocksAt && item.unlocksAt > new Date());
            const awaitingTeacher = item.kind === "rewrite" && item.reviewStatus === "pending";
            const ready = !item.completedAt && !priorIncomplete && !timeLocked && !awaitingTeacher;
            const state = item.completedAt ? "complete" : ready ? "ready" : awaitingTeacher ? "pending" : "locked";
            const unlockLabel = item.unlocksAt
              ? new Intl.DateTimeFormat("en-PK", { weekday: "short", timeZone: "Asia/Karachi" }).format(item.unlocksAt)
              : index === 0 ? "Now" : `Step ${index + 1}`;
            return (
              <article className={`plan-task ${state}`} key={item.id}>
                <div className="task-number">{item.completedAt ? "✓" : item.position}</div>
                <div className="task-copy">
                  <span>{unlockLabel} · {item.kind}</span>
                  <h3>{item.title}</h3>
                  <p>{item.instructions}</p>
                </div>
                <div className="task-action">
                  <span>{item.estimatedMinutes} min</span>
                  {ready || item.completedAt ? <Link href={`/app/plan/${item.id}`}>{item.completedAt ? "Review" : "Start"} →</Link> : (
                    <small>{awaitingTeacher ? "Awaiting teacher" : timeLocked ? "Delay active" : "Unlocks next"}</small>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="panel plan-why">
          <span className="card-kicker">WHY THIS PLAN?</span>
          <h2>Your weakest evidence comes first</h2>
          {priorities.map((priority) => (
            <div key={priority.name}><span>{priority.level}</span><strong>{priority.name}</strong><small>{priority.score}/{priority.maximumScore} diagnostic marks</small></div>
          ))}
          <div><span>Fresh retest</span><strong>{retestDate}</strong></div>
          <Link href="/app/progress">View mastery history →</Link>
        </aside>
      </div>
    </StudentShell>
  );
}
