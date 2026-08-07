import { and, asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  answers,
  assessmentQuestions,
  assessmentVersions,
  attempts,
  questionRevisions,
} from "@/db/schema";
import { requireStudentUser } from "@/lib/accounts";
import { DiagnosticSessionClient, type DiagnosticQuestion } from "./DiagnosticSessionClient";

export const dynamic = "force-dynamic";

export default async function DiagnosticSessionPage() {
  const studentId = (await requireStudentUser()).id;

  const db = getDb();
  const [attempt] = await db
    .select({
      id: attempts.id,
      assessmentVersionId: attempts.assessmentVersionId,
      status: attempts.status,
      startedAt: attempts.startedAt,
      assessmentTitle: assessmentVersions.title,
      durationMinutes: assessmentVersions.durationMinutes,
    })
    .from(attempts)
    .innerJoin(assessmentVersions, eq(attempts.assessmentVersionId, assessmentVersions.id))
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
        id: assessmentQuestions.id,
        section: assessmentQuestions.section,
        marks: assessmentQuestions.marks,
        prompt: questionRevisions.prompt,
        context: questionRevisions.context,
        options: questionRevisions.options,
        kind: questionRevisions.responseType,
      })
      .from(assessmentQuestions)
      .innerJoin(questionRevisions, eq(assessmentQuestions.questionRevisionId, questionRevisions.id))
      .where(eq(assessmentQuestions.assessmentVersionId, attempt.assessmentVersionId))
      .orderBy(asc(assessmentQuestions.position)),
    db
      .select({
        assessmentQuestionId: answers.assessmentQuestionId,
        response: answers.response,
        selectedOption: answers.selectedOption,
        isFlagged: answers.isFlagged,
      })
      .from(answers)
      .where(and(eq(answers.attemptId, attempt.id))),
  ]);

  const answerByQuestionId = new Map(answerRows.map((answer) => [answer.assessmentQuestionId, answer]));
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
