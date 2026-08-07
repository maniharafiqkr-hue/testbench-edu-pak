"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { ensurePilotTeacher } from "@/db/pilot-teacher";
import {
  answers,
  attempts,
  assessmentQuestions,
  questionRevisions,
  repairItemReviews,
  repairPlanItems,
  repairPlans,
  skillProgressEvents,
  writingReviews,
} from "@/db/schema";
import { getReviewCriteria } from "@/lib/review-rubrics";
import { completeAttemptLearningLoop } from "@/lib/learning-loop";
import {
  isLegacyStaffAccessAvailable,
  recordAuditEvent,
  requireStaffAccess,
  REVIEW_ROLES,
} from "@/lib/accounts";
import {
  clearTeacherSession,
  createTeacherSession,
  isTeacherAccessConfigured,
  teacherAccessCodeMatches,
} from "@/lib/teacher-session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fieldText(formData: FormData, name: string, maximumLength = 1600) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

export async function loginTeacher(formData: FormData) {
  if (!isTeacherAccessConfigured()) {
    redirect("/staff/login?error=configuration");
  }

  const accessCode = fieldText(formData, "accessCode", 200);
  if (!teacherAccessCodeMatches(accessCode)) {
    redirect("/staff/login?error=invalid");
  }
  if (!await isLegacyStaffAccessAvailable()) {
    redirect("/staff/login?error=legacy-retired");
  }

  await Promise.all([ensurePilotTeacher(), createTeacherSession()]);
  redirect("/staff");
}

export async function logoutTeacher() {
  await clearTeacherSession();
  redirect("/staff/login");
}

export async function returnWritingReview(formData: FormData) {
  const staff = await requireStaffAccess(REVIEW_ROLES);

  const reviewId = fieldText(formData, "reviewId", 40);
  if (!UUID_PATTERN.test(reviewId)) {
    redirect("/staff?error=invalid-review");
  }

  const strength = fieldText(formData, "strength");
  const priorityImprovement = fieldText(formData, "priorityImprovement");
  const rewriteInstruction = fieldText(formData, "rewriteInstruction");
  if (strength.length < 8 || priorityImprovement.length < 8 || rewriteInstruction.length < 8) {
    redirect(`/staff/reviews/${reviewId}?error=feedback`);
  }

  const db = getDb();
  const [review] = await db
    .select({
      answerId: writingReviews.answerId,
      attemptId: answers.attemptId,
      maximumMarks: assessmentQuestions.marks,
      questionType: questionRevisions.responseType,
      section: assessmentQuestions.section,
    })
    .from(writingReviews)
    .innerJoin(answers, eq(answers.id, writingReviews.answerId))
    .innerJoin(assessmentQuestions, eq(assessmentQuestions.id, answers.assessmentQuestionId))
    .innerJoin(questionRevisions, eq(questionRevisions.id, assessmentQuestions.questionRevisionId))
    .where(eq(writingReviews.id, reviewId))
    .limit(1);

  if (!review) {
    redirect("/staff?error=missing-review");
  }

  const criteria = getReviewCriteria(review.questionType, review.section, review.maximumMarks);
  const rubric: Record<string, number> = {};
  let awardedMarks = 0;

  for (const criterion of criteria) {
    const rawScore = Number(formData.get(`rubric_${criterion.key}`));
    if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > criterion.maximum) {
      redirect(`/staff/reviews/${reviewId}?error=rubric`);
    }
    rubric[criterion.key] = rawScore;
    awardedMarks += rawScore;
  }

  if (awardedMarks > review.maximumMarks) {
    redirect(`/staff/reviews/${reviewId}?error=rubric`);
  }

  const reviewerId = staff.user.id;
  const returnedAt = new Date();

  await db
    .update(answers)
    .set({ awardedMarks, isAutoMarked: false, updatedAt: returnedAt })
    .where(eq(answers.id, review.answerId));

  await db
    .update(writingReviews)
    .set({
      priorityImprovement,
      returnedAt,
      reviewerId,
      rewriteInstruction,
      rubric,
      status: "returned",
      strength,
      updatedAt: returnedAt,
    })
    .where(eq(writingReviews.id, reviewId));

  const attemptReviews = await db
    .select({ status: writingReviews.status })
    .from(writingReviews)
    .innerJoin(answers, eq(answers.id, writingReviews.answerId))
    .where(eq(answers.attemptId, review.attemptId));

  const allWritingReturned = attemptReviews.length > 0
    && attemptReviews.every((row) => row.status === "returned");

  if (allWritingReturned) {
    const scoredAnswers = await db
      .select({ awardedMarks: answers.awardedMarks })
      .from(answers)
      .where(eq(answers.attemptId, review.attemptId));
    const finalScore = scoredAnswers.reduce((total, row) => total + (row.awardedMarks ?? 0), 0);

    await db
      .update(attempts)
      .set({ finalScore, returnedAt, status: "returned", updatedAt: returnedAt })
      .where(eq(attempts.id, review.attemptId));

    await completeAttemptLearningLoop(review.attemptId);
  } else {
    await db
      .update(attempts)
      .set({ status: "awaiting_review", updatedAt: returnedAt })
      .where(and(eq(attempts.id, review.attemptId), eq(attempts.status, "awaiting_review")));
  }

  await recordAuditEvent({
    actorUserId: reviewerId,
    action: "writing_review.returned",
    entityType: "writing_review",
    entityId: reviewId,
    metadata: { awardedMarks, attemptId: review.attemptId },
  });

  redirect("/staff?returned=1");
}

export async function returnRewriteReview(formData: FormData) {
  const staff = await requireStaffAccess(REVIEW_ROLES);
  const reviewId = fieldText(formData, "reviewId", 40);
  if (!UUID_PATTERN.test(reviewId)) redirect("/staff?error=invalid-rewrite-review");
  const achievedValue = fieldText(formData, "achieved", 10);
  const feedback = fieldText(formData, "feedback");
  if (!["yes", "no"].includes(achievedValue) || feedback.length < 8) {
    redirect(`/staff/rewrites/${reviewId}?error=feedback`);
  }

  const db = getDb();
  const [review] = await db
    .select({
      itemId: repairItemReviews.itemId,
      planId: repairPlanItems.planId,
      skillId: repairPlanItems.skillId,
      sourceAttemptId: repairPlans.sourceAttemptId,
      studentId: repairPlans.studentId,
    })
    .from(repairItemReviews)
    .innerJoin(repairPlanItems, eq(repairPlanItems.id, repairItemReviews.itemId))
    .innerJoin(repairPlans, eq(repairPlans.id, repairPlanItems.planId))
    .where(eq(repairItemReviews.id, reviewId))
    .limit(1);
  if (!review) redirect("/staff?error=missing-rewrite-review");

  const reviewerId = staff.user.id;
  const achieved = achievedValue === "yes";
  const returnedAt = new Date();
  await db.update(repairItemReviews).set({
    achieved,
    feedback,
    returnedAt,
    reviewerId,
    status: "returned",
    updatedAt: returnedAt,
  }).where(eq(repairItemReviews.id, reviewId));
  await db.update(repairPlanItems).set({
    awardedMarks: achieved ? 1 : 0,
    completedAt: achieved ? returnedAt : null,
    updatedAt: returnedAt,
  }).where(eq(repairPlanItems.id, review.itemId));

  if (achieved && review.skillId) {
    await db
      .insert(skillProgressEvents)
      .values({
        studentId: review.studentId,
        skillId: review.skillId,
        referenceKey: `repair:${review.itemId}`,
        source: "teacher_confirmed_rewrite",
        score: 1,
        maximumScore: 1,
        level: "secure",
      })
      .onConflictDoUpdate({
        target: skillProgressEvents.referenceKey,
        set: {
          source: "teacher_confirmed_rewrite",
          score: 1,
          maximumScore: 1,
          level: "secure",
          updatedAt: returnedAt,
        },
      });
  }

  await recordAuditEvent({
    actorUserId: reviewerId,
    action: "rewrite_review.returned",
    entityType: "repair_item_review",
    entityId: reviewId,
    metadata: { achieved, studentId: review.studentId },
  });

  redirect("/staff?rewriteReturned=1");
}
