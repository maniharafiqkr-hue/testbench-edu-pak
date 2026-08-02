import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  answers,
  questions,
  repairItemReviews,
  repairPlanItems,
  repairPlans,
  skills,
  writingReviews,
} from "@/db/schema";
import type { RepairActivityContent } from "@/lib/learning-loop";
import { getPilotStudentId } from "@/lib/pilot-session";
import { StudentShell } from "../../../components/StudentShell";
import {
  completeReviewActivity,
  submitKnowledgeActivity,
  submitRewriteActivity,
} from "../actions";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ itemId: string }>;
  searchParams: Promise<{ answer?: string; error?: string; submitted?: string }>;
};

export default async function RepairActivityPage({ params, searchParams }: Props) {
  const studentId = await getPilotStudentId();
  if (!studentId) redirect("/app/diagnostic");
  const { itemId } = await params;
  if (!UUID_PATTERN.test(itemId)) notFound();

  const db = getDb();
  const [item] = await db
    .select({
      achieved: repairItemReviews.achieved,
      awardedMarks: repairPlanItems.awardedMarks,
      completedAt: repairPlanItems.completedAt,
      content: repairPlanItems.content,
      estimatedMinutes: repairPlanItems.estimatedMinutes,
      instructions: repairPlanItems.instructions,
      kind: repairPlanItems.kind,
      planId: repairPlanItems.planId,
      position: repairPlanItems.position,
      response: repairPlanItems.response,
      reviewFeedback: repairItemReviews.feedback,
      reviewStatus: repairItemReviews.status,
      selectedOption: repairPlanItems.selectedOption,
      skillName: skills.name,
      sourceContext: questions.context,
      sourcePrompt: questions.prompt,
      sourceResponse: answers.response,
      sourceSection: questions.section,
      teacherPriority: writingReviews.priorityImprovement,
      teacherRewrite: writingReviews.rewriteInstruction,
      teacherStrength: writingReviews.strength,
      title: repairPlanItems.title,
      unlocksAt: repairPlanItems.unlocksAt,
    })
    .from(repairPlanItems)
    .innerJoin(repairPlans, eq(repairPlans.id, repairPlanItems.planId))
    .leftJoin(skills, eq(skills.id, repairPlanItems.skillId))
    .leftJoin(answers, eq(answers.id, repairPlanItems.sourceAnswerId))
    .leftJoin(questions, eq(questions.id, answers.questionId))
    .leftJoin(writingReviews, eq(writingReviews.answerId, answers.id))
    .leftJoin(repairItemReviews, eq(repairItemReviews.itemId, repairPlanItems.id))
    .where(and(eq(repairPlanItems.id, itemId), eq(repairPlans.studentId, studentId)))
    .limit(1);
  if (!item) notFound();

  const sequence = await db
    .select({ completedAt: repairPlanItems.completedAt, position: repairPlanItems.position })
    .from(repairPlanItems)
    .where(eq(repairPlanItems.planId, item.planId))
    .orderBy(asc(repairPlanItems.position));
  const prerequisiteIncomplete = sequence.some(
    (candidate) => candidate.position < item.position && !candidate.completedAt,
  );
  const timeLocked = Boolean(item.unlocksAt && item.unlocksAt > new Date());
  const { answer, error, submitted } = await searchParams;
  const content = item.content as RepairActivityContent | null;

  if (prerequisiteIncomplete || timeLocked) {
    const unlockLabel = item.unlocksAt
      ? new Intl.DateTimeFormat("en-PK", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Karachi",
        }).format(item.unlocksAt)
      : null;
    return (
      <StudentShell current="plan" kicker={`PLAN STEP ${item.position}`} title={item.title}>
        <section className="panel activity-state-card">
          <span className="status status-neutral">Locked</span>
          <h2>{timeLocked ? "This fresh retest needs a little distance." : "Complete the earlier step first."}</h2>
          <p>{timeLocked
            ? `It unlocks ${unlockLabel} PKT. The delay checks whether the skill lasts instead of testing short-term memory.`
            : "Your plan is sequential so each task can use the evidence from the previous one."}</p>
          <Link className="button" href="/app/plan">Return to my plan</Link>
        </section>
      </StudentShell>
    );
  }

  const completed = Boolean(item.completedAt);
  return (
    <StudentShell current="plan" kicker={`PLAN STEP ${item.position} · ${item.estimatedMinutes} MIN`} title={item.title}>
      <div className="activity-heading">
        <Link href="/app/plan">← Back to plan</Link>
        <span className={`status ${completed ? "status-ready" : "status-live"}`}>
          {completed ? "Completed" : item.kind === "rewrite" && item.reviewStatus === "pending" ? "Teacher review pending" : "Ready"}
        </span>
      </div>

      {error === "rewrite-length" ? <div className="form-alert form-alert-error">Write at least 40 characters so your teacher has enough evidence to compare.</div> : null}
      {answer === "incorrect" ? <div className="form-alert form-alert-error">Not quite. Re-read the prompt and choose the option that most directly proves the skill.</div> : null}
      {answer === "correct" ? <div className="form-alert form-alert-success">Correct. This repair step is now part of your mastery history.</div> : null}
      {submitted === "1" ? <div className="form-alert form-alert-success">Your revised version was sent to the teacher for confirmation.</div> : null}

      {item.kind === "review" ? (
        <section className="panel learning-activity">
          <span className="card-kicker">UNDERSTAND THE LOST MARKS</span>
          <h2>{item.instructions}</h2>
          <div className="feedback-notes">
            <div><span>What worked</span><p>{item.teacherStrength ?? "Your teacher identified useful evidence in the response."}</p></div>
            <div><span>Priority change</span><p>{item.teacherPriority ?? content?.explanation}</p></div>
            <div><span>Use this in the rewrite</span><p>{item.teacherRewrite ?? "Apply the priority change in the next version."}</p></div>
          </div>
          {completed ? <Link className="button" href="/app/plan">Continue to the next step</Link> : (
            <form action={completeReviewActivity}>
              <input name="itemId" type="hidden" value={itemId} />
              <button className="button" type="submit">I understand the repair target</button>
            </form>
          )}
        </section>
      ) : null}

      {item.kind === "practice" || item.kind === "retest" ? (
        <section className="panel learning-activity">
          <span className="card-kicker">{item.kind === "retest" ? "FRESH RETEST" : "TARGETED PRACTICE"} · {item.skillName}</span>
          <h2>{content?.prompt}</h2>
          {content?.context ? <div className="review-context"><span>Read this evidence</span><p>{content.context}</p></div> : null}
          {completed ? (
            <div className="activity-complete">
              <strong>Your answer: {item.selectedOption}</strong>
              <p>{content?.explanation}</p>
              <Link className="button" href="/app/plan">Return to my plan</Link>
            </div>
          ) : (
            <form action={submitKnowledgeActivity} className="activity-options">
              <input name="itemId" type="hidden" value={itemId} />
              {content?.options?.map((option) => (
                <label key={option}>
                  <input defaultChecked={item.selectedOption === option} name="selectedOption" required type="radio" value={option} />
                  <span>{option}</span>
                </label>
              ))}
              <button className="button" type="submit">Check my answer</button>
            </form>
          )}
        </section>
      ) : null}

      {item.kind === "rewrite" ? (
        <div className="rewrite-workflow">
          <section className="panel rewrite-instruction">
            <span className="card-kicker">TEACHER’S REWRITE INSTRUCTION</span>
            <h2>{item.teacherRewrite ?? item.instructions}</h2>
            <p><strong>Target:</strong> {item.teacherPriority ?? content?.explanation}</p>
            {item.reviewStatus === "returned" ? (
              <div className={`form-alert ${item.achieved ? "form-alert-success" : "form-alert-error"}`}>
                <strong>{item.achieved ? "Target achieved" : "Revise once more"}</strong>
                <p>{item.reviewFeedback}</p>
              </div>
            ) : null}
          </section>

          {item.response ? (
            <section className="rewrite-comparison">
              <article className="panel"><span className="card-kicker">VERSION 1 · ORIGINAL</span><p>{item.sourceResponse}</p></article>
              <article className="panel"><span className="card-kicker">VERSION 2 · REVISED</span><p>{item.response}</p></article>
            </section>
          ) : null}

          {!completed && item.reviewStatus !== "pending" ? (
            <section className="panel learning-activity">
              <span className="card-kicker">WRITE VERSION {item.response ? "3" : "2"}</span>
              <div className="review-context"><span>{item.sourceSection} prompt</span><p>{item.sourcePrompt}</p>{item.sourceContext ? <p>{item.sourceContext}</p> : null}</div>
              <form action={submitRewriteActivity} className="rewrite-form">
                <input name="itemId" type="hidden" value={itemId} />
                <label htmlFor="response">Your improved response</label>
                <textarea defaultValue={item.response ?? item.sourceResponse ?? ""} id="response" name="response" required rows={14} />
                <button className="button" type="submit">Submit revised version</button>
              </form>
            </section>
          ) : null}

          {item.reviewStatus === "pending" ? (
            <section className="panel activity-state-card"><h2>Your rewrite is with the teacher.</h2><p>You can compare both versions above. The next step unlocks after the teacher confirms the targeted improvement.</p><Link className="button button-secondary" href="/app/plan">Return to my plan</Link></section>
          ) : null}
          {completed ? <section className="panel activity-state-card"><h2>The teacher confirmed your improvement.</h2><p>This skill is now updated in your progress history.</p><Link className="button" href="/app/plan">Continue to the retest</Link></section> : null}
        </div>
      ) : null}
    </StudentShell>
  );
}
