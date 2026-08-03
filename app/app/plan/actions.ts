"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import {
  attempts,
  repairItemReviews,
  repairPlanItems,
  repairPlans,
  skillProgressEvents,
} from "@/db/schema";
import { completeAttemptLearningLoop, type RepairActivityContent } from "@/lib/learning-loop";
import { requireStudentUser } from "@/lib/accounts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fieldText(formData: FormData, name: string, maximumLength = 4000) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

async function ownedItem(itemId: string) {
  const studentId = (await requireStudentUser()).id;
  if (!UUID_PATTERN.test(itemId)) return null;

  const db = getDb();
  const [item] = await db
    .select({
      completedAt: repairPlanItems.completedAt,
      content: repairPlanItems.content,
      kind: repairPlanItems.kind,
      planId: repairPlanItems.planId,
      position: repairPlanItems.position,
      skillId: repairPlanItems.skillId,
      sourceAttemptId: repairPlans.sourceAttemptId,
      studentId: repairPlans.studentId,
      unlocksAt: repairPlanItems.unlocksAt,
    })
    .from(repairPlanItems)
    .innerJoin(repairPlans, eq(repairPlans.id, repairPlanItems.planId))
    .where(and(eq(repairPlanItems.id, itemId), eq(repairPlans.studentId, studentId)))
    .limit(1);

  if (!item) return null;
  const planItems = await db
    .select({ completedAt: repairPlanItems.completedAt, position: repairPlanItems.position })
    .from(repairPlanItems)
    .where(eq(repairPlanItems.planId, item.planId))
    .orderBy(asc(repairPlanItems.position));
  const prerequisiteIncomplete = planItems.some(
    (candidate) => candidate.position < item.position && !candidate.completedAt,
  );

  return { ...item, prerequisiteIncomplete };
}

async function refreshPlan(planId: string) {
  const db = getDb();
  const items = await db
    .select({ completedAt: repairPlanItems.completedAt })
    .from(repairPlanItems)
    .where(eq(repairPlanItems.planId, planId));
  if (items.length > 0 && items.every((item) => item.completedAt)) {
    const now = new Date();
    await db.update(repairPlans).set({ status: "completed", updatedAt: now }).where(eq(repairPlans.id, planId));
  }
}

async function recordCompletion(itemId: string, item: NonNullable<Awaited<ReturnType<typeof ownedItem>>>, source: string) {
  if (!item.skillId) return;
  const db = getDb();
  const now = new Date();
  await db
    .insert(skillProgressEvents)
    .values({
      studentId: item.studentId,
      skillId: item.skillId,
      referenceKey: `repair:${itemId}`,
      source,
      score: 1,
      maximumScore: 1,
      level: "secure",
    })
    .onConflictDoUpdate({
      target: skillProgressEvents.referenceKey,
      set: { source, score: 1, maximumScore: 1, level: "secure", updatedAt: now },
    });
}

export async function buildRepairPlan(formData: FormData) {
  const studentId = (await requireStudentUser()).id;
  const attemptId = fieldText(formData, "attemptId", 40);
  if (!UUID_PATTERN.test(attemptId)) redirect("/app/diagnostic");

  const [attempt] = await getDb()
    .select({ id: attempts.id })
    .from(attempts)
    .where(and(eq(attempts.id, attemptId), eq(attempts.studentId, studentId), eq(attempts.status, "returned")))
    .limit(1);
  if (!attempt) redirect("/app/results");

  await completeAttemptLearningLoop(attempt.id);
  revalidatePath("/app/plan");
  revalidatePath("/app/home");
  revalidatePath("/app/progress");
  redirect("/app/plan?built=1");
}

export async function completeReviewActivity(formData: FormData) {
  const itemId = fieldText(formData, "itemId", 40);
  const item = await ownedItem(itemId);
  if (!item || item.kind !== "review") redirect("/app/plan");
  if (item.prerequisiteIncomplete) redirect(`/app/plan/${itemId}?error=locked`);

  const now = new Date();
  await getDb().update(repairPlanItems).set({
    awardedMarks: 1,
    completedAt: now,
    submittedAt: now,
    updatedAt: now,
  }).where(eq(repairPlanItems.id, itemId));
  await recordCompletion(itemId, item, "feedback_review");
  revalidatePath("/app/plan");
  redirect("/app/plan?completed=1");
}

export async function submitKnowledgeActivity(formData: FormData) {
  const itemId = fieldText(formData, "itemId", 40);
  const selectedOption = fieldText(formData, "selectedOption", 600);
  const item = await ownedItem(itemId);
  if (!item || (item.kind !== "practice" && item.kind !== "retest")) redirect("/app/plan");
  if (item.prerequisiteIncomplete || (item.unlocksAt && item.unlocksAt > new Date())) {
    redirect(`/app/plan/${itemId}?error=locked`);
  }

  const content = item.content as RepairActivityContent | null;
  const correct = Boolean(selectedOption && content?.correctAnswer === selectedOption);
  const now = new Date();
  await getDb().update(repairPlanItems).set({
    awardedMarks: correct ? 1 : 0,
    completedAt: correct ? now : null,
    selectedOption,
    submittedAt: now,
    updatedAt: now,
  }).where(eq(repairPlanItems.id, itemId));

  if (!correct) {
    revalidatePath(`/app/plan/${itemId}`);
    redirect(`/app/plan/${itemId}?answer=incorrect`);
  }

  await recordCompletion(itemId, item, item.kind);
  await refreshPlan(item.planId);
  revalidatePath("/app/plan");
  revalidatePath("/app/home");
  revalidatePath("/app/progress");
  revalidatePath("/app/results");
  redirect(`/app/plan/${itemId}?answer=correct`);
}

export async function submitRewriteActivity(formData: FormData) {
  const itemId = fieldText(formData, "itemId", 40);
  const response = fieldText(formData, "response", 8000);
  const item = await ownedItem(itemId);
  if (!item || item.kind !== "rewrite") redirect("/app/plan");
  if (item.prerequisiteIncomplete) redirect(`/app/plan/${itemId}?error=locked`);
  if (response.length < 40) redirect(`/app/plan/${itemId}?error=rewrite-length`);

  const now = new Date();
  const db = getDb();
  await db.update(repairPlanItems).set({
    awardedMarks: null,
    completedAt: null,
    response,
    submittedAt: now,
    updatedAt: now,
  }).where(eq(repairPlanItems.id, itemId));
  await db
    .insert(repairItemReviews)
    .values({ itemId, status: "pending" })
    .onConflictDoUpdate({
      target: repairItemReviews.itemId,
      set: { achieved: null, feedback: null, returnedAt: null, status: "pending", updatedAt: now },
    });

  revalidatePath("/app/plan");
  revalidatePath("/staff");
  redirect(`/app/plan/${itemId}?submitted=1`);
}
