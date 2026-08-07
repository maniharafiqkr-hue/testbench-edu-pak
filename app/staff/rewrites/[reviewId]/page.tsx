import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/app/components/Brand";
import { getDb } from "@/db";
import {
  answers,
  assessmentQuestions,
  questionRevisions,
  repairItemReviews,
  repairPlanItems,
  repairPlans,
  skills,
  users,
  writingReviews,
} from "@/db/schema";
import { REVIEW_ROLES, requireStaffAccess } from "@/lib/accounts";
import { returnRewriteReview } from "../../actions";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ reviewId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function RewriteReviewPage({ params, searchParams }: Props) {
  await requireStaffAccess(REVIEW_ROLES);
  const { reviewId } = await params;
  if (!UUID_PATTERN.test(reviewId)) notFound();
  const db = getDb();
  const [review] = await db
    .select({
      achieved: repairItemReviews.achieved,
      feedback: repairItemReviews.feedback,
      itemId: repairPlanItems.id,
      response: repairPlanItems.response,
      sourceAnswerId: repairPlanItems.sourceAnswerId,
      status: repairItemReviews.status,
      studentName: users.displayName,
      submittedAt: repairPlanItems.submittedAt,
      skillName: skills.name,
      title: repairPlanItems.title,
    })
    .from(repairItemReviews)
    .innerJoin(repairPlanItems, eq(repairPlanItems.id, repairItemReviews.itemId))
    .innerJoin(repairPlans, eq(repairPlans.id, repairPlanItems.planId))
    .innerJoin(users, eq(users.id, repairPlans.studentId))
    .leftJoin(skills, eq(skills.id, repairPlanItems.skillId))
    .where(eq(repairItemReviews.id, reviewId))
    .limit(1);
  if (!review || !review.sourceAnswerId) notFound();

  const [original] = await db
    .select({
      context: questionRevisions.context,
      priorityImprovement: writingReviews.priorityImprovement,
      prompt: questionRevisions.prompt,
      response: answers.response,
      rewriteInstruction: writingReviews.rewriteInstruction,
      section: assessmentQuestions.section,
      strength: writingReviews.strength,
    })
    .from(answers)
    .innerJoin(assessmentQuestions, eq(assessmentQuestions.id, answers.assessmentQuestionId))
    .innerJoin(questionRevisions, eq(questionRevisions.id, assessmentQuestions.questionRevisionId))
    .leftJoin(writingReviews, eq(writingReviews.answerId, answers.id))
    .where(eq(answers.id, review.sourceAnswerId))
    .limit(1);
  if (!original) notFound();

  const { error } = await searchParams;
  const submittedAt = review.submittedAt
    ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(review.submittedAt)
    : "Recently";

  return (
    <main className="staff-page">
      <header className="staff-header container">
        <Brand />
        <Link className="button button-secondary button-small" href="/staff">Back to workspace</Link>
      </header>

      <div className="container review-title">
        <div>
          <span className="eyebrow">REWRITE CONFIRMATION · {review.skillName}</span>
          <h1>{review.title}</h1>
          <p>{review.studentName} · submitted {submittedAt} PKT</p>
        </div>
        <span className={`status ${review.status === "returned" ? "status-ready" : "status-neutral"}`}>
          {review.status === "returned" ? "Decision returned" : "Confirmation needed"}
        </span>
      </div>

      <section className="container panel rewrite-target-card">
        <span className="card-kicker">TARGETED IMPROVEMENT</span>
        <h2>{original.rewriteInstruction}</h2>
        <p><strong>Original priority:</strong> {original.priorityImprovement}</p>
      </section>

      <section className="container teacher-comparison">
        <article className="panel">
          <span className="card-kicker">VERSION 1 · ORIGINAL</span>
          <h2>{original.section}</h2>
          <p className="comparison-response">{original.response}</p>
        </article>
        <article className="panel">
          <span className="card-kicker">VERSION 2 · STUDENT REVISION</span>
          <h2>After teacher feedback</h2>
          <p className="comparison-response">{review.response}</p>
        </article>
      </section>

      <div className="container review-layout rewrite-review-layout">
        <section className="panel review-question-card">
          <span className="card-kicker">ORIGINAL QUESTION</span>
          <h2>{original.prompt}</h2>
          {original.context ? <div className="review-context"><span>Source or requirements</span><p>{original.context}</p></div> : null}
          <div className="feedback-notes"><div><span>Original strength</span><p>{original.strength}</p></div></div>
        </section>

        <section className="panel learning-activity">
          <span className="card-kicker">TEACHER DECISION</span>
          <h2>Was the targeted improvement achieved?</h2>
          {error ? <div className="form-alert form-alert-error">Choose a decision and write at least eight characters of useful feedback.</div> : null}
          <form action={returnRewriteReview} className="rewrite-review-form">
            <input name="reviewId" type="hidden" value={reviewId} />
            <label className="decision-option"><input defaultChecked={review.achieved === true} name="achieved" required type="radio" value="yes" /><span><strong>Yes — achieved</strong><small>Complete the rewrite and unlock the delayed retest when its timer is ready.</small></span></label>
            <label className="decision-option"><input defaultChecked={review.achieved === false} name="achieved" required type="radio" value="no" /><span><strong>Not yet</strong><small>Return it for another revision while keeping the target visible.</small></span></label>
            <label htmlFor="feedback">Confirmation feedback</label>
            <textarea defaultValue={review.feedback ?? ""} id="feedback" name="feedback" required rows={5} />
            <button className="button" type="submit">Return rewrite decision</button>
          </form>
        </section>
      </div>
    </main>
  );
}
