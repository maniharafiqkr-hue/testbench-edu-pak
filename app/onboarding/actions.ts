"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { boardLevels, boards, users } from "@/db/schema";
import {
  claimPilotLearningData,
  recordAuditEvent,
  requireAuthenticatedUser,
} from "@/lib/accounts";
import {
  findEducationBoard,
  supportedGradeLevels,
  type SupportedGradeLevel,
} from "@/lib/education-boards";

function textField(formData: FormData, name: string, max: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function saveStudentProfile(formData: FormData) {
  const user = await requireAuthenticatedUser();
  if (user.role !== "student") redirect("/staff");

  const displayName = textField(formData, "displayName", 160);
  const gradeLevel = textField(formData, "gradeLevel", 30);
  const boardCode = textField(formData, "boardCode", 80);
  const schoolName = textField(formData, "schoolName", 200);
  const isSelfStudy = formData.get("isSelfStudy") === "yes";
  const returnTo = textField(formData, "returnTo", 30);
  const returnPath = returnTo === "profile" ? "/app/profile" : "/onboarding";
  const selectedBoard = findEducationBoard(boardCode);
  const supportedGrade = supportedGradeLevels.includes(gradeLevel as SupportedGradeLevel);
  if (displayName.length < 2 || !supportedGrade || !selectedBoard) {
    redirect(`${returnPath}?error=profile`);
  }
  const selectedGrade = gradeLevel as SupportedGradeLevel;
  if (!selectedBoard.gradeLevels.includes(selectedGrade)) {
    redirect(`${returnPath}?error=board-grade`);
  }

  const now = new Date();
  const db = getDb();
  const [savedBoard] = await db
    .insert(boards)
    .values({
      code: selectedBoard.code,
      name: selectedBoard.name,
      region: selectedBoard.region,
      shortName: selectedBoard.shortName,
      sortOrder: selectedBoard.sortOrder,
      sourceUrl: selectedBoard.sourceUrl,
      systemType: selectedBoard.systemType,
    })
    .onConflictDoUpdate({
      target: boards.code,
      set: {
        isActive: true,
        name: selectedBoard.name,
        region: selectedBoard.region,
        shortName: selectedBoard.shortName,
        sortOrder: selectedBoard.sortOrder,
        sourceUrl: selectedBoard.sourceUrl,
        systemType: selectedBoard.systemType,
        updatedAt: now,
      },
    })
    .returning({ id: boards.id });

  await Promise.all(selectedBoard.gradeLevels.map((level) => db
    .insert(boardLevels)
    .values({ boardId: savedBoard.id, gradeLevel: level })
    .onConflictDoNothing({ target: [boardLevels.boardId, boardLevels.gradeLevel] })));

  const [updated] = await db
    .update(users)
    .set({
      board: selectedBoard.shortName,
      boardId: savedBoard.id,
      displayName,
      gradeLevel: selectedGrade,
      isSelfStudy,
      profileCompletedAt: now,
      schoolName: isSelfStudy ? null : schoolName || null,
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
    metadata: {
      boardCode: selectedBoard.code,
      gradeLevel: selectedGrade,
      isSelfStudy,
      schoolProvided: !isSelfStudy && Boolean(schoolName),
    },
  });

  revalidatePath("/app/home");
  revalidatePath("/app/profile");
  if (returnTo === "profile") redirect("/app/profile?saved=1");
  redirect(`/app/home?claimed=${claimed.attempts}`);
}
