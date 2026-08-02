"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ensurePilotAssessment } from "@/db/pilot-assessment";
import { getDb } from "@/db";
import { answers, assessments, attempts, questions, writingReviews } from "@/db/schema";
import { ensurePilotStudent, getPilotStudentId } from "@/lib/pilot-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RESPONSE_LENGTH = 5_000;

export type DiagnosticAnswerDraft = {
  questionId: string;
  value: string;
  isFlagged: boolean;
};

async function getOwnedAttempt(attemptId: string, studentId: string) {
  if (!UUID_PATTERN.test(attemptId)) {
    return null;
  }

  const [attempt] = await getDb()
    .select({
      id: attempts.id,
      assessmentId: attempts.assessmentId,
      status: attempts.status,
      startedAt: attempts.startedAt,
      durationMinutes: assessments.durationMinutes,
    })
    .from(attempts)
    .innerJoin(assessments, eq(attempts.assessmentId, assessments.id))
    .where(and(eq(attempts.id, attemptId), eq(attempts.studentId, studentId)))
    .limit(1);

  return attempt ?? null;
}

async function persistDraftAnswers(
  attempt: NonNullable<Awaited<ReturnType<typeof getOwnedAttempt>>>,
  drafts: DiagnosticAnswerDraft[],
) {
  if (drafts.length === 0) {
    return;
  }

  if (drafts.length > 100) {
    throw new Error("Too many answers were submitted.");
  }

  const uniqueDrafts = [...new Map(drafts.map((draft) => [draft.questionId, draft])).values()];
  if (uniqueDrafts.some((draft) => !UUID_PATTERN.test(draft.questionId))) {
    throw new Error("An answer contains an invalid question identifier.");
  }

  const db = getDb();
  const assessmentQuestions = await db
    .select({
      id: questions.id,
      type: questions.type,
      options: questions.options,
    })
    .from(questions)
    .where(
      and(
        eq(questions.assessmentId, attempt.assessmentId),
        inArray(
          questions.id,
          uniqueDrafts.map((draft) => draft.questionId),
        ),
      ),
    );

  if (assessmentQuestions.length !== uniqueDrafts.length) {
    throw new Error("One or more answers do not belong to this diagnostic.");
  }

  const questionById = new Map(assessmentQuestions.map((question) => [question.id, question]));
  const now = new Date();

  await Promise.all(
    uniqueDrafts.map((draft) => {
      const question = questionById.get(draft.questionId);
      if (!question) {
        throw new Error("Question not found.");
      }

      const value = draft.value.slice(0, MAX_RESPONSE_LENGTH);
      const selectedOption = question.type === "multiple_choice" && value ? value : null;
      const response = question.type === "multiple_choice" || !value ? null : value;

      if (selectedOption && !question.options?.includes(selectedOption)) {
        throw new Error("The selected answer is not a valid option.");
      }

      return db
        .insert(answers)
        .values({
          attemptId: attempt.id,
          questionId: question.id,
          response,
          selectedOption,
          isFlagged: Boolean(draft.isFlagged),
        })
        .onConflictDoUpdate({
          target: [answers.attemptId, answers.questionId],
          set: {
            response,
            selectedOption,
            isFlagged: Boolean(draft.isFlagged),
            updatedAt: now,
          },
        });
    }),
  );
}

export async function startDiagnosticAttempt() {
  const [studentId, assessmentId] = await Promise.all([
    ensurePilotStudent(),
    ensurePilotAssessment(),
  ]);
  const db = getDb();

  const [existingAttempt] = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(
      and(
        eq(attempts.studentId, studentId),
        eq(attempts.assessmentId, assessmentId),
        eq(attempts.status, "in_progress"),
      ),
    )
    .orderBy(desc(attempts.startedAt))
    .limit(1);

  if (!existingAttempt) {
    await db.insert(attempts).values({
      assessmentId,
      studentId,
      status: "in_progress",
    });
  }

  redirect("/app/diagnostic/session");
}

export async function saveDiagnosticAnswer(attemptId: string, draft: DiagnosticAnswerDraft) {
  const studentId = await getPilotStudentId();
  if (!studentId) {
    throw new Error("Your pilot session has expired. Start the diagnostic again.");
  }

  const attempt = await getOwnedAttempt(attemptId, studentId);
  if (!attempt || attempt.status !== "in_progress") {
    throw new Error("This diagnostic can no longer be changed.");
  }

  await persistDraftAnswers(attempt, [draft]);
}

export async function submitDiagnosticAttempt(
  attemptId: string,
  drafts: DiagnosticAnswerDraft[],
) {
  const studentId = await getPilotStudentId();
  if (!studentId) {
    throw new Error("Your pilot session has expired. Start the diagnostic again.");
  }

  const attempt = await getOwnedAttempt(attemptId, studentId);
  if (!attempt) {
    throw new Error("Diagnostic attempt not found.");
  }

  if (attempt.status !== "in_progress") {
    redirect(`/app/results?attempt=${attempt.id}`);
  }

  await persistDraftAnswers(attempt, drafts);

  const db = getDb();
  const [assessmentQuestions, savedAnswers] = await Promise.all([
    db
      .select({
        id: questions.id,
        type: questions.type,
        correctAnswer: questions.correctAnswer,
        marks: questions.marks,
      })
      .from(questions)
      .where(eq(questions.assessmentId, attempt.assessmentId)),
    db
      .select({
        id: answers.id,
        questionId: answers.questionId,
        selectedOption: answers.selectedOption,
      })
      .from(answers)
      .where(eq(answers.attemptId, attempt.id)),
  ]);

  const answerByQuestionId = new Map(savedAnswers.map((answer) => [answer.questionId, answer]));
  let objectiveScore = 0;
  let needsTeacherReview = false;
  const now = new Date();

  await Promise.all(
    assessmentQuestions.map(async (question) => {
      const answer = answerByQuestionId.get(question.id);
      if (!answer) {
        return;
      }

      if (question.type === "multiple_choice") {
        const awardedMarks = answer.selectedOption === question.correctAnswer ? question.marks : 0;
        objectiveScore += awardedMarks;
        await db
          .update(answers)
          .set({ awardedMarks, isAutoMarked: true, updatedAt: now })
          .where(eq(answers.id, answer.id));
        return;
      }

      needsTeacherReview = true;
      await db
        .insert(writingReviews)
        .values({ answerId: answer.id, status: "pending" })
        .onConflictDoNothing({ target: writingReviews.answerId });
    }),
  );

  await db
    .update(attempts)
    .set({
      status: needsTeacherReview ? "awaiting_review" : "submitted",
      objectiveScore,
      finalScore: needsTeacherReview ? null : objectiveScore,
      submittedAt: now,
      updatedAt: now,
    })
    .where(eq(attempts.id, attempt.id));

  redirect(`/app/results?attempt=${attempt.id}`);
}
