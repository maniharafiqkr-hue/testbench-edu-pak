import { and, asc, desc, eq, ne } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  answers,
  assessments,
  attempts,
  attemptSkillResults,
  questions,
  skills,
  writingReviews,
} from "@/db/schema";
import { getReviewCriteria } from "@/lib/review-rubrics";
import { requireStudentUser } from "@/lib/accounts";
import { StudentShell } from "../../components/StudentShell";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  searchParams: Promise<{ attempt?: string }>;
};

export default async function ResultsPage({ searchParams }: Props) {
  const studentId = (await requireStudentUser()).id;

  const { attempt: requestedAttemptId } = await searchParams;
  const validAttemptId = requestedAttemptId && UUID_PATTERN.test(requestedAttemptId)
    ? requestedAttemptId
    : null;
  const db = getDb();
  const [attempt] = await db
    .select({
      assessmentId: attempts.assessmentId,
      assessmentTitle: assessments.title,
      finalScore: attempts.finalScore,
      id: attempts.id,
      objectiveScore: attempts.objectiveScore,
      returnedAt: attempts.returnedAt,
      status: attempts.status,
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
      awardedMarks: answers.awardedMarks,
      correctAnswer: questions.correctAnswer,
      marks: questions.marks,
      priorityImprovement: writingReviews.priorityImprovement,
      questionId: questions.id,
      questionType: questions.type,
      reviewReturnedAt: writingReviews.returnedAt,
      reviewStatus: writingReviews.status,
      rewriteInstruction: writingReviews.rewriteInstruction,
      rubric: writingReviews.rubric,
      section: questions.section,
      strength: writingReviews.strength,
    })
    .from(questions)
    .leftJoin(
      answers,
      and(eq(answers.questionId, questions.id), eq(answers.attemptId, attempt.id)),
    )
    .leftJoin(writingReviews, eq(writingReviews.answerId, answers.id))
    .where(eq(questions.assessmentId, attempt.assessmentId))
    .orderBy(asc(questions.position));

  const calculatedSkills = await db
    .select({
      id: attemptSkillResults.id,
      level: attemptSkillResults.level,
      maximumScore: attemptSkillResults.maximumScore,
      name: skills.name,
      score: attemptSkillResults.score,
    })
    .from(attemptSkillResults)
    .innerJoin(skills, eq(skills.id, attemptSkillResults.skillId))
    .where(eq(attemptSkillResults.attemptId, attempt.id));

  const objectiveRows = responseRows.filter((row) => row.questionType === "multiple_choice");
  const writtenRows = responseRows.filter((row) => row.questionType !== "multiple_choice");
  const returnedWrittenRows = writtenRows.filter((row) => row.reviewStatus === "returned");
  const allWritingReturned = writtenRows.length > 0 && returnedWrittenRows.length === writtenRows.length;
  const objectiveMaximum = objectiveRows.reduce((total, row) => total + row.marks, 0);
  const totalMaximum = responseRows.reduce((total, row) => total + row.marks, 0);
  const objectiveScore = attempt.objectiveScore ?? 0;
  const finalScore = allWritingReturned
    ? attempt.finalScore ?? responseRows.reduce((total, row) => total + (row.awardedMarks ?? 0), 0)
    : null;
  const displayScore = finalScore ?? objectiveScore;
  const displayMaximum = finalScore === null ? objectiveMaximum : totalMaximum;
  const scorePercent = displayMaximum ? Math.round((displayScore / displayMaximum) * 100) : 0;
  const missedObjectiveRows = objectiveRows.filter((row) => (row.awardedMarks ?? 0) < row.marks);
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
          <span className="status status-ready">
            {allWritingReturned ? "Full diagnostic marked" : "Objective marking complete"}
          </span>
          <h2>{displayScore} of {displayMaximum} marks</h2>
          <p>{allWritingReturned
            ? "Your teacher has returned both written responses. Your final diagnostic result is ready."
            : "Your written responses are awaiting teacher review and are not counted as zero."}</p>
        </div>
        <div className="result-ring">
          <strong>{scorePercent}%</strong>
          <span>{allWritingReturned ? "final" : "objective"}</span>
        </div>
      </section>

      <div className="result-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><span className="card-kicker">EXAMINER LENS</span><h2>Marks you can recover</h2></div>
          </div>
          <div className="recovery-list">
            {missedObjectiveRows.length ? missedObjectiveRows.slice(0, 2).map((row) => (
              <article key={row.questionId}>
                <span>+{row.marks}</span>
                <div><strong>Review {row.section.toLowerCase()}</strong><p>The correct response was: {row.correctAnswer}</p></div>
              </article>
            )) : (
              <article><span>✓</span><div><strong>Strong objective start</strong><p>You secured every automatically marked question.</p></div></article>
            )}
            <article>
              <span>{allWritingReturned ? "Ready" : "Next"}</span>
              <div>
                <strong>{allWritingReturned ? "Teacher feedback returned" : "Written response review"}</strong>
                <p>{allWritingReturned
                  ? "Use the feedback below to complete your first rewrite."
                  : "Your comprehension and narrative evidence will update after teacher marking."}</p>
              </div>
            </article>
          </div>
        </section>

        <aside className="panel marking-card">
          <span className="card-kicker">WRITING STATUS</span>
          <h2>{allWritingReturned ? "Teacher review complete" : "Teacher review pending"}</h2>
          <p>{allWritingReturned
            ? `${returnedWrittenRows.length} written responses were marked and returned.`
            : `${writtenRows.length - returnedWrittenRows.length} of ${writtenRows.length} written responses still need review.`}</p>
          <div className="status-timeline">
            <span className="done">Submitted</span>
            <span className={allWritingReturned ? "done" : "current"}>Reviewing</span>
            <span className={allWritingReturned ? "done" : ""}>Feedback</span>
          </div>
          <small>Submitted {submittedTime} PKT</small>
        </aside>
      </div>

      {returnedWrittenRows.length ? (
        <section className="panel writing-feedback-section">
          <div className="panel-heading">
            <div><span className="card-kicker">TEACHER FEEDBACK</span><h2>Your returned writing</h2></div>
          </div>
          <div className="writing-feedback-list">
            {returnedWrittenRows.map((row) => {
              const criteria = getReviewCriteria(row.questionType, row.section, row.marks);
              return (
                <article className="writing-feedback-card" key={row.questionId}>
                  <header><div><span>{row.section}</span><strong>{row.awardedMarks ?? 0} / {row.marks} marks</strong></div></header>
                  <div className="feedback-notes">
                    <div><span>Strength</span><p>{row.strength}</p></div>
                    <div><span>Priority improvement</span><p>{row.priorityImprovement}</p></div>
                    <div><span>Rewrite next</span><p>{row.rewriteInstruction}</p></div>
                  </div>
                  <div className="student-rubric">
                    {criteria.map((criterion) => (
                      <span key={criterion.key}>{criterion.label}<strong>{row.rubric?.[criterion.key] ?? 0}/{criterion.maximum}</strong></span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="panel skill-profile">
        <div className="panel-heading"><div><span className="card-kicker">SKILL PROFILE</span><h2>{allWritingReturned ? "Your complete evidence" : "Objective evidence so far"}</h2></div></div>
        <div className="skill-table">
          {calculatedSkills.length ? calculatedSkills.map((skill) => (
            <div key={skill.id}>
              <strong>{skill.name}</strong>
              <span className={`level ${skill.level}`}>{skill.level}</span>
              <span>{skill.score} / {skill.maximumScore}</span>
            </div>
          )) : responseRows.map((row) => {
            const score = row.awardedMarks ?? 0;
            const pending = row.questionType !== "multiple_choice" && row.reviewStatus !== "returned";
            const secure = !pending && score / row.marks >= 0.7;
            return (
              <div key={row.questionId}>
                <strong>{row.section}</strong>
                <span className={`level ${pending ? "pending" : secure ? "secure" : "developing"}`}>
                  {pending ? "Pending" : secure ? "Secure" : "Developing"}
                </span>
                <span>{pending ? "—" : `${score} / ${row.marks}`}</span>
              </div>
            );
          })}
        </div>
        <div className="result-actions">
          <Link className="button" href="/app/plan">{allWritingReturned ? "Build my repair plan" : "Preview repair plan"}</Link>
          <Link className="button button-secondary" href="/app/home">Return home</Link>
        </div>
      </section>
    </StudentShell>
  );
}
