import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Brand } from "@/app/components/Brand";
import { getDb } from "@/db";
import { answers, assessments, attempts, questions, users, writingReviews } from "@/db/schema";
import { requireTeacherSession } from "@/lib/teacher-session";
import { logoutTeacher } from "./actions";

export const dynamic = "force-dynamic";

function submittedLabel(date: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(date);
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ returned?: string }>;
}) {
  await requireTeacherSession();
  const { returned } = await searchParams;
  const rows = await getDb()
    .select({
      assessmentTitle: assessments.title,
      attemptId: attempts.id,
      createdAt: writingReviews.createdAt,
      marks: questions.marks,
      questionPosition: questions.position,
      reviewId: writingReviews.id,
      returnedAt: writingReviews.returnedAt,
      section: questions.section,
      status: writingReviews.status,
      studentName: users.displayName,
    })
    .from(writingReviews)
    .innerJoin(answers, eq(answers.id, writingReviews.answerId))
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .innerJoin(attempts, eq(attempts.id, answers.attemptId))
    .innerJoin(assessments, eq(assessments.id, attempts.assessmentId))
    .innerJoin(users, eq(users.id, attempts.studentId))
    .orderBy(desc(writingReviews.createdAt));

  const queueRows = [...rows].sort((left, right) => {
    const priority = { pending: 0, in_review: 1, returned: 2 };
    return priority[left.status] - priority[right.status]
      || left.createdAt.getTime() - right.createdAt.getTime();
  });
  const awaitingRows = queueRows.filter((row) => row.status !== "returned");
  const returnedCount = rows.filter((row) => row.status === "returned").length;
  const attemptCount = new Set(rows.map((row) => row.attemptId)).size;
  const completionPercent = rows.length
    ? Math.round((rows.filter((row) => row.status === "returned").length / rows.length) * 100)
    : 0;
  const nextReview = awaitingRows[0];

  return (
    <main className="staff-page">
      <header className="staff-header container">
        <Brand />
        <div>
          <span>Pilot English teacher</span>
          <form action={logoutTeacher}><button className="text-button" type="submit">Sign out</button></form>
          <span className="avatar" aria-hidden="true">ET</span>
        </div>
      </header>

      <div className="container staff-title">
        <div>
          <span className="eyebrow">TEACHER WORKSPACE</span>
          <h1>Student writing review</h1>
          <p>{awaitingRows.length
            ? `${awaitingRows.length} response${awaitingRows.length === 1 ? "" : "s"} need attention.`
            : "Every submitted response has been reviewed."}</p>
        </div>
        <div className="staff-title-actions">
          <Link className="button button-secondary" href="/">View student site</Link>
          {nextReview ? <Link className="button" href={`/staff/reviews/${nextReview.reviewId}`}>Mark next response</Link> : null}
        </div>
      </div>

      {returned === "1" ? (
        <div className="container form-alert form-alert-success">Feedback returned to the student successfully.</div>
      ) : null}

      <div className="container staff-metrics">
        <article><span>Awaiting marking</span><strong>{awaitingRows.length}</strong><small>{awaitingRows[0] ? `Oldest · ${submittedLabel(awaitingRows[0].createdAt)} PKT` : "Queue clear"}</small></article>
        <article><span>Returned feedback</span><strong>{returnedCount}</strong><small>Teacher feedback delivered</small></article>
        <article><span>Student attempts</span><strong>{attemptCount}</strong><small>With written submissions</small></article>
        <article><span>Review completion</span><strong>{completionPercent}%</strong><small>{rows.length} total responses</small></article>
      </div>

      <section className="container marking-panel panel">
        <div className="panel-heading">
          <div><span className="card-kicker">MARKING QUEUE</span><h2>Extended responses</h2></div>
          <span className="queue-summary">Pending first · returned work remains editable</span>
        </div>

        {queueRows.length ? (
          <div className="queue-table">
            <div className="queue-row queue-head"><span>Submission</span><span>Task</span><span>Received</span><span>Status</span></div>
            {queueRows.map((row) => (
              <Link className="queue-row queue-row-link" href={`/staff/reviews/${row.reviewId}`} key={row.reviewId}>
                <span><strong>{row.studentName}</strong><small>TB-{row.attemptId.slice(0, 6).toUpperCase()}</small></span>
                <span><strong>{row.section}</strong><small>{row.assessmentTitle} · Q{row.questionPosition} · {row.marks} marks</small></span>
                <span>{submittedLabel(row.createdAt)} PKT</span>
                <span className={`queue-status queue-status-${row.status}`}>{row.status === "returned" ? "Returned" : row.status === "in_review" ? "In review" : "Mark now"}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-queue"><strong>No writing submissions yet</strong><p>New diagnostic responses will appear here automatically.</p></div>
        )}
      </section>
    </main>
  );
}
