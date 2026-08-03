"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  claimPilotLearningData,
  recordAuditEvent,
  requireAuthenticatedUser,
} from "@/lib/accounts";

const GRADES = ["grade_9", "grade_10", "o_level", "a_level"] as const;

function textField(formData: FormData, name: string, max: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function saveStudentProfile(formData: FormData) {
  const user = await requireAuthenticatedUser();
  if (user.role !== "student") redirect("/staff");

  const displayName = textField(formData, "displayName", 160);
  const gradeLevel = textField(formData, "gradeLevel", 30);
  const board = textField(formData, "board", 120);
  const schoolName = textField(formData, "schoolName", 200);
  const returnTo = textField(formData, "returnTo", 30);
  if (displayName.length < 2 || !GRADES.includes(gradeLevel as (typeof GRADES)[number]) || board.length < 2) {
    redirect(`${returnTo === "profile" ? "/app/profile" : "/onboarding"}?error=profile`);
  }

  const now = new Date();
  const [updated] = await getDb()
    .update(users)
    .set({
      board,
      displayName,
      gradeLevel: gradeLevel as (typeof GRADES)[number],
      profileCompletedAt: now,
      schoolName: schoolName || null,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))
    .returning();
  const claimed = await claimPilotLearningData(updated);
  await recordAuditEvent({
    actorUserId: user.id,
    action: user.profileCompletedAt ? "profile.updated" : "profile.completed",
    entityType: "user",
    entityId: user.id,
    metadata: { board, gradeLevel, schoolProvided: Boolean(schoolName) },
  });

  revalidatePath("/app/home");
  revalidatePath("/app/profile");
  if (returnTo === "profile") redirect("/app/profile?saved=1");
  redirect(`/app/home?claimed=${claimed.attempts}`);
}
