import { and, asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { answers, assessments, attempts, questions } from "@/db/schema";
import { getPilotStudentId } from "@/lib/pilot-session";
import { DiagnosticSessionClient, type DiagnosticQuestion } from "./DiagnosticSessionClient";

export const dynamic = "force-dynamic";

export default async function DiagnosticSessionPage() {
  const studentId = await getPilotStudentId();
  if (!studentId) {
    redirect("/app/diagnostic");
  }

  const db = getDb();
  const [attempt] = await db
    .select({
      id: attempts.id,
      assessmentId: attempts.assessmentId,
      status: attempts.status,
      startedAt: attempts.startedAt,
      assessmentTitle: assessments.title,
      durationMinutes: assessments.durationMinutes,
    })
    .from(attempts)
    .innerJoin(assessments, eq(attempts.assessmentId, assessments.id))
    .where(eq(attempts.studentId, studentId))
    .orderBy(desc(attempts.startedAt))
    .limit(1);

  if (!attempt) {
    redirect("/app/diagnostic");
  }

  if (attempt.status !== "in_progress") {
    redirect(`/app/results?attempt=${attempt.id}`);
  }

  const [questionRows, answerRows] = await Promise.all([
    db
      .select({
        id: questions.id,
        section: questions.section,
        marks: questions.marks,
        prompt: questions.prompt,
        context: questions.context,
        options: questions.options,
        kind: questions.type,
      })
      .from(questions)
      .where(eq(questions.assessmentId, attempt.assessmentId))
      .orderBy(asc(questions.position)),
    db
      .select({
        questionId: answers.questionId,
        response: answers.response,
        selectedOption: answers.selectedOption,
        isFlagged: answers.isFlagged,
      })
      .from(answers)
      .where(and(eq(answers.attemptId, attempt.id))),
  ]);

  const answerByQuestionId = new Map(answerRows.map((answer) => [answer.questionId, answer]));
  const diagnosticQuestions: DiagnosticQuestion[] = questionRows.map((question) => {
    const answer = answerByQuestionId.get(question.id);
    return {
      ...question,
      initialValue: answer?.selectedOption ?? answer?.response ?? "",
      isFlagged: answer?.isFlagged ?? false,
    };
  });
  const endsAt = new Date(
    attempt.startedAt.getTime() + attempt.durationMinutes * 60 * 1_000,
  ).toISOString();

  return (
    <DiagnosticSessionClient
      assessmentTitle={attempt.assessmentTitle}
      attemptId={attempt.id}
      endsAt={endsAt}
      questions={diagnosticQuestions}
    />
  );
}
