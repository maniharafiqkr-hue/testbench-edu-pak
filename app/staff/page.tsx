import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Brand } from "@/app/components/Brand";
import { UserButton } from "@neondatabase/auth-ui";
import { getDb } from "@/db";
import {
  answers,
  assessments,
  attempts,
  questions,
  repairItemReviews,
  repairPlanItems,
  repairPlans,
  skills,
  users,
  writingReviews,
} from "@/db/schema";
import { REVIEW_ROLES, ROLE_LABELS, requireStaffAccess } from "@/lib/accounts";
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
  searchParams: Promise<{ accepted?: string; returned?: string; rewriteReturned?: string }>;
}) {
  const staff = await requireStaffAccess(REVIEW_ROLES);
  const { accepted, returned, rewriteReturned } = await searchParams;
  const db = getDb();
  const rows = await db
    .select({
      assessmentTitle: assessments.title,
      attemptId: attempts.id,
      createdAt: writingReviews.createdAt,
      marks: questions.marks,
      questionPosition: questions.position,
      reviewId: writingReviews.id,
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

  const rewriteRows = await db
    .select({
      achieved: repairItemReviews.achieved,
      reviewId: repairItemReviews.id,
      skillName: skills.name,
      status: repairItemReviews.status,
      studentName: users.displayName,
      submittedAt: repairPlanItems.submittedAt,
      title: repairPlanItems.title,
    })
    .from(repairItemReviews)
    .innerJoin(repairPlanItems, eq(repairPlanItems.id, repairItemReviews.itemId))
    .innerJoin(repairPlans, eq(repairPlans.id, repairPlanItems.planId))
    .innerJoin(users, eq(users.id, repairPlans.studentId))
    .leftJoin(skills, eq(skills.id, repairPlanItems.skillId))
    .orderBy(desc(repairPlanItems.submittedAt));

  const queueRows = [...rows].sort((left, right) => {
    const priority = { pending: 0, in_review: 1, returned: 2 };
    return priority[left.status] - priority[right.status]
      || left.createdAt.getTime() - right.createdAt.getTime();
  });
  const awaitingRows = queueRows.filter((row) => row.status !== "returned");
  const pendingRewrites = rewriteRows.filter((row) => row.status !== "returned");
  const totalAwaiting = awaitingRows.length + pendingRewrites.length;
  const returnedCount = rows.filter((row) => row.status === "returned").length;
  const attemptCount = new Set(rows.map((row) => row.attemptId)).size;
  const completionPercent = rows.length
    ? Math.round((returnedCount / rows.length) * 100)
    : 0;
  const nextReview = awaitingRows[0];

  return (
    <main className="staff-page">
      <header className="staff-header container">
        <Brand />
        <div>
          <span>{staff.user.displayName} · {ROLE_LABELS[staff.user.role]}</span>
          {staff.legacy ? <form action={logoutTeacher}><button className="text-button" type="submit">Sign out</button></form> : <UserButton />}
        </div>
      </header>

      <div className="container staff-title">
        <div>
          <span className="eyebrow">TEACHER WORKSPACE</span>
          <h1>Student writing review</h1>
          <p>{totalAwaiting
            ? `${totalAwaiting} response${totalAwaiting === 1 ? "" : "s"} need attention.`
            : "Every submitted response has been reviewed."}</p>
        </div>
        <div className="staff-title-actions">
          {(staff.legacy || ["academic_lead", "admin"].includes(staff.user.role)) ? <Link className="button button-secondary" href="/staff/users">Manage staff</Link> : null}
          <Link className="button button-secondary" href="/">View student site</Link>
          {pendingRewrites[0] ? <Link className="button" href={`/staff/rewrites/${pendingRewrites[0].reviewId}`}>Review next rewrite</Link>
            : nextReview ? <Link className="button" href={`/staff/reviews/${nextReview.reviewId}`}>Mark next response</Link> : null}
        </div>
      </div>

      {returned === "1" ? <div className="container form-alert form-alert-success">Feedback returned to the student successfully.</div> : null}
      {rewriteReturned === "1" ? <div className="container form-alert form-alert-success">Rewrite decision returned. The student’s plan and mastery history were updated.</div> : null}
      {accepted === "1" ? <div className="container form-alert form-alert-success">Your named staff account is active. The shared pilot code has now retired.</div> : null}

      <div className="container staff-metrics">
        <article><span>Awaiting marking</span><strong>{totalAwaiting}</strong><small>{pendingRewrites.length ? "A rewrite needs confirmation" : awaitingRows[0] ? `Oldest · ${submittedLabel(awaitingRows[0].createdAt)} PKT` : "Queue clear"}</small></article>
        <article><span>Returned feedback</span><strong>{returnedCount}</strong><small>Initial feedback delivered</small></article>
        <article><span>Student attempts</span><strong>{attemptCount}</strong><small>With written submissions</small></article>
        <article><span>Initial completion</span><strong>{completionPercent}%</strong><small>{rows.length} total responses</small></article>
      </div>

      <section className="container marking-panel panel">
        <div className="panel-heading">
          <div><span className="card-kicker">REWRITE QUEUE</span><h2>Confirm targeted improvement</h2></div>
          <span className="queue-summary">Compare version 1 and version 2 side by side</span>
        </div>
        {rewriteRows.length ? (
          <div className="queue-table">
            <div className="queue-row queue-head"><span>Student</span><span>Repair target</span><span>Received</span><span>Status</span></div>
            {rewriteRows.map((row) => (
              <Link className="queue-row queue-row-link" href={`/staff/rewrites/${row.reviewId}`} key={row.reviewId}>
                <span><strong>{row.studentName}</strong><small>Student revision</small></span>
                <span><strong>{row.title}</strong><small>{row.skillName}</small></span>
                <span>{row.submittedAt ? `${submittedLabel(row.submittedAt)} PKT` : "Not submitted"}</span>
                <span className={`queue-status queue-status-${row.status}`}>{row.status === "returned" ? row.achieved ? "Achieved" : "Revise again" : "Review now"}</span>
              </Link>
            ))}
          </div>
        ) : <div className="empty-queue"><strong>No rewrites submitted yet</strong><p>Student version-two responses will appear here automatically.</p></div>}
      </section>

      <section className="container marking-panel panel">
        <div className="panel-heading">
          <div><span className="card-kicker">INITIAL MARKING QUEUE</span><h2>Extended responses</h2></div>
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
        ) : <div className="empty-queue"><strong>No writing submissions yet</strong><p>New diagnostic responses will appear here automatically.</p></div>}
      </section>
    </main>
  );
}
