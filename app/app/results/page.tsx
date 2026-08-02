import { and, asc, desc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { answers, assessments, attempts, questions } from "@/db/schema";
import { getPilotStudentId } from "@/lib/pilot-session";
import { StudentShell } from "../../components/StudentShell";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  searchParams: Promise<{ attempt?: string }>;
};

export default async function ResultsPage({ searchParams }: Props) {
  const studentId = await getPilotStudentId();
  if (!studentId) {
    redirect("/app/diagnostic");
  }

  const { attempt: requestedAttemptId } = await searchParams;
  const validAttemptId = requestedAttemptId && UUID_PATTERN.test(requestedAttemptId)
    ? requestedAttemptId
    : null;
  const db = getDb();
  const [attempt] = await db
    .select({
      id: attempts.id,
      assessmentId: attempts.assessmentId,
      assessmentTitle: assessments.title,
      status: attempts.status,
      objectiveScore: attempts.objectiveScore,
      submittedAt: attempts.submittedAt,
    })
    .from(attempts)
    .innerJoin(assessments, eq(attempts.assessmentId, assessments.id))
    .where(
      validAttemptId
        ? and(eq(attempts.id, validAttemptId), eq(attempts.studentId, studentId))
        : and(eq(attempts.studentId, studentId), ne(attempts.status, "in_progress")),
    )
    .orderBy(desc(attempts.submittedAt))
    .limit(1);

  if (!attempt) {
    redirect("/app/diagnostic");
  }

  if (attempt.status === "in_progress") {
    redirect("/app/diagnostic/session");
  }

  const responseRows = await db
    .select({
      questionId: questions.id,
      section: questions.section,
      type: questions.type,
      marks: questions.marks,
      correctAnswer: questions.correctAnswer,
      awardedMarks: answers.awardedMarks,
      response: answers.response,
    })
    .from(questions)
    .leftJoin(
      answers,
      and(eq(answers.questionId, questions.id), eq(answers.attemptId, attempt.id)),
    )
    .where(eq(questions.assessmentId, attempt.assessmentId))
    .orderBy(asc(questions.position));

  const objectiveRows = responseRows.filter((row) => row.type === "multiple_choice");
  const writtenRows = responseRows.filter((row) => row.type !== "multiple_choice");
  const objectiveMaximum = objectiveRows.reduce((total, row) => total + row.marks, 0);
  const objectiveScore = attempt.objectiveScore ?? 0;
  const objectivePercent = objectiveMaximum
    ? Math.round((objectiveScore / objectiveMaximum) * 100)
    : 0;
  const missedObjectiveRows = objectiveRows.filter(
    (row) => (row.awardedMarks ?? 0) < row.marks,
  );
  const submittedTime = attempt.submittedAt
    ? new Intl.DateTimeFormat("en-PK", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Karachi",
      }).format(attempt.submittedAt)
    : "just now";

  return (
    <StudentShell current="progress" kicker="DIAGNOSTIC RESULT" title="Your English starting profile">
      <section className="result-hero panel">
        <div>
          <span className="status status-ready">Objective marking complete</span>
          <h2>{objectiveScore} of {objectiveMaximum} objective marks</h2>
          <p>
            Your written responses were submitted successfully and are awaiting teacher review.
            They are not counted as zero.
          </p>
        </div>
        <div className="result-ring">
          <strong>{objectivePercent}%</strong>
          <span>objective</span>
        </div>
      </section>

      <div className="result-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="card-kicker">EXAMINER LENS</span>
              <h2>Marks you can recover</h2>
            </div>
          </div>
          <div className="recovery-list">
            {missedObjectiveRows.length ? (
              missedObjectiveRows.slice(0, 2).map((row) => (
                <article key={row.questionId}>
                  <span>+{row.marks}</span>
                  <div>
                    <strong>Review {row.section.toLowerCase()}</strong>
                    <p>The correct response was: {row.correctAnswer}</p>
                  </div>
                </article>
              ))
            ) : (
              <article>
                <span>✓</span>
                <div>
                  <strong>Strong objective start</strong>
                  <p>You secured every automatically marked question in this diagnostic.</p>
                </div>
              </article>
            )}
            <article>
              <span>Next</span>
              <div>
                <strong>Written response review</strong>
                <p>Your comprehension and narrative evidence will update after teacher marking.</p>
              </div>
            </article>
          </div>
        </section>

        <aside className="panel marking-card">
          <span className="card-kicker">WRITING STATUS</span>
          <h2>Teacher review pending</h2>
          <p>{writtenRows.length} written responses entered the marking queue.</p>
          <div className="status-timeline">
            <span className="done">Submitted</span>
            <span className="current">Reviewing</span>
            <span>Feedback</span>
          </div>
          <small>Submitted {submittedTime} PKT</small>
        </aside>
      </div>

      <section className="panel skill-profile">
        <div className="panel-heading">
          <div>
            <span className="card-kicker">SKILL PROFILE</span>
            <h2>Objective evidence so far</h2>
          </div>
        </div>
        <div className="skill-table">
          {objectiveRows.map((row) => {
            const score = row.awardedMarks ?? 0;
            const secure = score === row.marks;
            return (
              <div key={row.questionId}>
                <strong>{row.section}</strong>
                <span className={`level ${secure ? "secure" : "developing"}`}>
                  {secure ? "Secure" : "Developing"}
                </span>
                <span>{score} / {row.marks}</span>
              </div>
            );
          })}
          <div>
            <strong>Comprehension and writing</strong>
            <span className="level pending">Pending</span>
            <span>—</span>
          </div>
        </div>
        <div className="result-actions">
          <Link className="button" href="/app/plan">Preview repair plan</Link>
          <Link className="button button-secondary" href="/app/home">Return home</Link>
        </div>
      </section>
    </StudentShell>
  );
}
