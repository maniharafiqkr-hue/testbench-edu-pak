import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/app/components/Brand";
import { getDb } from "@/db";
import {
  answers,
  assessmentQuestions,
  assessmentVersions,
  attempts,
  questionRevisions,
  users,
  writingReviews,
} from "@/db/schema";
import { getReviewCriteria } from "@/lib/review-rubrics";
import { REVIEW_ROLES, requireStaffAccess } from "@/lib/accounts";
import { ReviewForm } from "./ReviewForm";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ reviewId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function WritingReviewPage({ params, searchParams }: Props) {
  await requireStaffAccess(REVIEW_ROLES);
  const { reviewId } = await params;
  if (!UUID_PATTERN.test(reviewId)) {
    notFound();
  }

  const [review] = await getDb()
    .select({
      assessmentTitle: assessmentVersions.title,
      attemptId: attempts.id,
      context: questionRevisions.context,
      marks: assessmentQuestions.marks,
      position: assessmentQuestions.position,
      priorityImprovement: writingReviews.priorityImprovement,
      prompt: questionRevisions.prompt,
      questionType: questionRevisions.responseType,
      response: answers.response,
      rewriteInstruction: writingReviews.rewriteInstruction,
      rubric: writingReviews.rubric,
      section: assessmentQuestions.section,
      status: writingReviews.status,
      strength: writingReviews.strength,
      studentName: users.displayName,
      submittedAt: attempts.submittedAt,
    })
    .from(writingReviews)
    .innerJoin(answers, eq(answers.id, writingReviews.answerId))
    .innerJoin(assessmentQuestions, eq(assessmentQuestions.id, answers.assessmentQuestionId))
    .innerJoin(questionRevisions, eq(questionRevisions.id, assessmentQuestions.questionRevisionId))
    .innerJoin(assessmentVersions, eq(assessmentVersions.id, assessmentQuestions.assessmentVersionId))
    .innerJoin(attempts, eq(attempts.id, answers.attemptId))
    .innerJoin(users, eq(users.id, attempts.studentId))
    .where(eq(writingReviews.id, reviewId))
    .limit(1);

  if (!review) {
    notFound();
  }

  const { error } = await searchParams;
  const criteria = getReviewCriteria(review.questionType, review.section, review.marks);
  const submittedAt = review.submittedAt
    ? new Intl.DateTimeFormat("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Karachi",
      }).format(review.submittedAt)
    : "Recently";

  return (
    <main className="staff-page">
      <header className="staff-header container">
        <Brand />
        <Link className="button button-secondary button-small" href="/staff">Back to queue</Link>
      </header>

      <div className="container review-title">
        <div>
          <span className="eyebrow">{review.assessmentTitle}</span>
          <h1>{review.section}</h1>
          <p>{review.studentName} · Attempt {review.attemptId.slice(0, 8).toUpperCase()} · {submittedAt} PKT</p>
        </div>
        <span className={`status ${review.status === "returned" ? "status-ready" : "status-neutral"}`}>
          {review.status === "returned" ? "Feedback returned" : "Awaiting review"}
        </span>
      </div>

      <div className="container review-layout">
        <aside className="review-source">
          <section className="panel review-question-card">
            <span className="card-kicker">QUESTION {review.position} · {review.marks} MARKS</span>
            <h2>{review.prompt}</h2>
            {review.context ? <div className="review-context"><span>Source text</span><p>{review.context}</p></div> : null}
          </section>
          <section className="panel student-response-card">
            <span className="card-kicker">STUDENT RESPONSE</span>
            <p>{review.response || "No written response was submitted."}</p>
          </section>
        </aside>

        <div>
          {error ? (
            <div className="form-alert form-alert-error review-error">
              Please complete every feedback field and choose valid rubric marks.
            </div>
          ) : null}
          <ReviewForm
            criteria={criteria}
            existingFeedback={{
              priorityImprovement: review.priorityImprovement ?? "",
              rewriteInstruction: review.rewriteInstruction ?? "",
              strength: review.strength ?? "",
            }}
            existingRubric={review.rubric ?? {}}
            maximumMarks={review.marks}
            reviewId={reviewId}
            wasReturned={review.status === "returned"}
          />
        </div>
      </div>
    </main>
  );
}
