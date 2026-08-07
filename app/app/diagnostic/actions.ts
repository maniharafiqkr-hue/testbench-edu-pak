"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ensurePilotAssessment } from "@/db/pilot-assessment";
import { getDb } from "@/db";
import {
  answers,
  assessments,
  assessmentQuestions,
  assessmentVersions,
  attempts,
  questionItems,
  questionRevisions,
  writingReviews,
} from "@/db/schema";
import { requireStudentUser } from "@/lib/accounts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RESPONSE_LENGTH = 5_000;

export type DiagnosticAnswerDraft = {
  assessmentQuestionId: string;
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
      assessmentVersionId: attempts.assessmentVersionId,
      status: attempts.status,
      startedAt: attempts.startedAt,
      durationMinutes: assessmentVersions.durationMinutes,
    })
    .from(attempts)
    .innerJoin(assessmentVersions, eq(attempts.assessmentVersionId, assessmentVersions.id))
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

  const uniqueDrafts = [...new Map(drafts.map((draft) => [draft.assessmentQuestionId, draft])).values()];
  if (uniqueDrafts.some((draft) => !UUID_PATTERN.test(draft.assessmentQuestionId))) {
    throw new Error("An answer contains an invalid question identifier.");
  }

  const db = getDb();
  const versionQuestions = await db
    .select({
      id: assessmentQuestions.id,
      legacyQuestionId: questionItems.legacyQuestionId,
      type: questionRevisions.responseType,
      options: questionRevisions.options,
      questionRevisionId: questionRevisions.id,
    })
    .from(assessmentQuestions)
    .innerJoin(questionRevisions, eq(assessmentQuestions.questionRevisionId, questionRevisions.id))
    .innerJoin(questionItems, eq(questionRevisions.questionItemId, questionItems.id))
    .where(
      and(
        eq(assessmentQuestions.assessmentVersionId, attempt.assessmentVersionId),
        inArray(
          assessmentQuestions.id,
          uniqueDrafts.map((draft) => draft.assessmentQuestionId),
        ),
      ),
    );

  if (versionQuestions.length !== uniqueDrafts.length) {
    throw new Error("One or more answers do not belong to this diagnostic.");
  }

  const questionById = new Map(versionQuestions.map((question) => [question.id, question]));
  const now = new Date();

  await Promise.all(
    uniqueDrafts.map((draft) => {
      const question = questionById.get(draft.assessmentQuestionId);
      if (!question) {
        throw new Error("Question not found.");
      }

      const value = draft.value.slice(0, MAX_RESPONSE_LENGTH);
      const selectedOption = question.type === "multiple_choice" && value ? value : null;
      const response = question.type === "multiple_choice" || !value ? null : value;

      if (selectedOption && !question.options?.some((option) => option.id === selectedOption)) {
        throw new Error("The selected answer is not a valid option.");
      }

      return db
        .insert(answers)
        .values({
          assessmentQuestionId: question.id,
          assessmentVersionId: attempt.assessmentVersionId,
          attemptId: attempt.id,
          questionId: question.legacyQuestionId,
          questionRevisionId: question.questionRevisionId,
          response,
          selectedOption,
          isFlagged: Boolean(draft.isFlagged),
        })
        .onConflictDoUpdate({
          target: [answers.attemptId, answers.assessmentQuestionId],
          set: {
            assessmentVersionId: attempt.assessmentVersionId,
            questionRevisionId: question.questionRevisionId,
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
    requireStudentUser().then((student) => student.id),
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
    const [assessmentVersion] = await db
      .select({ id: assessmentVersions.id })
      .from(assessments)
      .innerJoin(
        assessmentVersions,
        and(
          eq(assessmentVersions.assessmentId, assessments.id),
          eq(assessmentVersions.versionNumber, assessments.currentVersionNumber),
        ),
      )
      .where(eq(assessments.id, assessmentId))
      .limit(1);

    if (!assessmentVersion) {
      throw new Error("The current diagnostic version is unavailable.");
    }

    await db.insert(attempts).values({
      assessmentId,
      assessmentVersionId: assessmentVersion.id,
      studentId,
      status: "in_progress",
    });
  }

  redirect("/app/diagnostic/session");
}

export async function saveDiagnosticAnswer(attemptId: string, draft: DiagnosticAnswerDraft) {
  const studentId = (await requireStudentUser()).id;

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
  const studentId = (await requireStudentUser()).id;

  const attempt = await getOwnedAttempt(attemptId, studentId);
  if (!attempt) {
    throw new Error("Diagnostic attempt not found.");
  }

  if (attempt.status !== "in_progress") {
    redirect(`/app/results?attempt=${attempt.id}`);
  }

  await persistDraftAnswers(attempt, drafts);

  const db = getDb();
  const [versionQuestions, savedAnswers] = await Promise.all([
    db
      .select({
        id: assessmentQuestions.id,
        type: questionRevisions.responseType,
        answerKey: questionRevisions.answerKey,
        marks: assessmentQuestions.marks,
      })
      .from(assessmentQuestions)
      .innerJoin(questionRevisions, eq(assessmentQuestions.questionRevisionId, questionRevisions.id))
      .where(eq(assessmentQuestions.assessmentVersionId, attempt.assessmentVersionId)),
    db
      .select({
        id: answers.id,
        assessmentQuestionId: answers.assessmentQuestionId,
        selectedOption: answers.selectedOption,
      })
      .from(answers)
      .where(eq(answers.attemptId, attempt.id)),
  ]);

  const answerByQuestionId = new Map(savedAnswers.map((answer) => [answer.assessmentQuestionId, answer]));
  let objectiveScore = 0;
  let needsTeacherReview = false;
  const now = new Date();

  await Promise.all(
    versionQuestions.map(async (question) => {
      const answer = answerByQuestionId.get(question.id);
      if (!answer) {
        return;
      }

      if (question.type === "multiple_choice") {
        const awardedMarks = answer.selectedOption === question.answerKey?.correctOptionId ? question.marks : 0;
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
