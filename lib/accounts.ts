import "server-only";

import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { ensurePilotTeacher } from "@/db/pilot-teacher";
import {
  attempts,
  auditEvents,
  repairPlans,
  skillProgressEvents,
  users,
} from "@/db/schema";
import { auth, isAuthConfigured } from "@/lib/auth/server";
import { clearPilotStudent, getPilotStudentId } from "@/lib/pilot-session";
import { hasTeacherSession } from "@/lib/teacher-session";

export type AppUser = typeof users.$inferSelect;
export type AppRole = AppUser["role"];

export const STAFF_ROLES: AppRole[] = [
  "teacher",
  "question_author",
  "reviewer",
  "academic_lead",
  "admin",
];
export const REVIEW_ROLES: AppRole[] = ["teacher", "reviewer", "academic_lead", "admin"];
export const STAFF_MANAGER_ROLES: AppRole[] = ["academic_lead", "admin"];

export const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  teacher: "Teacher",
  question_author: "Question author",
  reviewer: "Reviewer",
  academic_lead: "Academic lead",
  admin: "Administrator",
};

type AuthIdentity = { id: string; email: string; name: string };

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function getAuthIdentity(): Promise<AuthIdentity | null> {
  if (!isAuthConfigured()) return null;
  const { data } = await auth.getSession();
  const authUser = data?.user;
  if (!authUser?.id || !authUser.email) return null;

  const email = normalizedEmail(authUser.email);
  return {
    id: String(authUser.id),
    email,
    name: authUser.name?.trim().slice(0, 160) || email.split("@")[0] || "TestBench user",
  };
}

export async function recordAuditEvent(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await getDb().insert(auditEvents).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action.slice(0, 120),
    entityType: input.entityType.slice(0, 80),
    entityId: input.entityId?.slice(0, 160) ?? null,
    metadata: input.metadata,
  });
}

async function loadCurrentAppUser(): Promise<AppUser | null> {
  const identity = await getAuthIdentity();
  if (!identity) return null;

  const db = getDb();
  const [linkedUser] = await db
    .select()
    .from(users)
    .where(eq(users.authProviderId, identity.id))
    .limit(1);
  const [emailUser] = linkedUser ? [] : await db
    .select()
    .from(users)
    .where(eq(users.email, identity.email))
    .limit(1);
  const existing = linkedUser ?? emailUser;
  const now = new Date();

  if (existing) {
    if (existing.authProviderId && existing.authProviderId !== identity.id) {
      throw new Error("This TestBench email is already linked to another authentication account.");
    }
    const displayName = existing.displayName === "Pilot student" ? identity.name : existing.displayName;
    const shouldRefreshSignIn = !existing.lastSignedInAt
      || now.getTime() - existing.lastSignedInAt.getTime() >= 15 * 60 * 1000;
    const shouldUpdate = !existing.authProviderId
      || existing.email !== identity.email
      || existing.displayName !== displayName
      || shouldRefreshSignIn;
    if (!shouldUpdate) return existing;

    const [updated] = await db
      .update(users)
      .set({
        authProviderId: identity.id,
        displayName,
        email: identity.email,
        lastSignedInAt: shouldRefreshSignIn ? now : existing.lastSignedInAt,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning();
    if (!existing.authProviderId) {
      await recordAuditEvent({
        actorUserId: updated.id,
        action: "account.linked",
        entityType: "user",
        entityId: updated.id,
      });
    }
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      authProviderId: identity.id,
      displayName: identity.name,
      email: identity.email,
      lastSignedInAt: now,
      role: "student",
    })
    .returning();
  await recordAuditEvent({
    actorUserId: created.id,
    action: "account.created",
    entityType: "user",
    entityId: created.id,
  });
  return created;
}

export const getCurrentAppUser = cache(loadCurrentAppUser);

export async function requireAuthenticatedUser() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/auth/sign-in");
  if (!user.isActive) redirect("/access-disabled");
  return user;
}

export async function requireStudentUser() {
  const user = await requireAuthenticatedUser();
  if (user.role !== "student") redirect("/staff/entry");
  if (!user.profileCompletedAt || !user.gradeLevel || !user.board) redirect("/onboarding");
  return user;
}

export type StaffAccess = { user: AppUser; legacy: boolean };

async function hasLinkedStaffAccount() {
  const [linkedStaff] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.authProviderId), inArray(users.role, STAFF_ROLES), eq(users.isActive, true)))
    .limit(1);
  return Boolean(linkedStaff);
}

export async function isLegacyStaffAccessAvailable() {
  return !await hasLinkedStaffAccount();
}

export async function getStaffAccess(allowedRoles: AppRole[] = STAFF_ROLES): Promise<StaffAccess | null> {
  const accountUser = await getCurrentAppUser();
  if (accountUser) {
    return accountUser.isActive && allowedRoles.includes(accountUser.role)
      ? { user: accountUser, legacy: false }
      : null;
  }

  if (!(await hasTeacherSession()) || await hasLinkedStaffAccount()) return null;
  const pilotTeacherId = await ensurePilotTeacher();
  const [pilotTeacher] = await getDb().select().from(users).where(eq(users.id, pilotTeacherId)).limit(1);
  return pilotTeacher && allowedRoles.includes(pilotTeacher.role)
    ? { user: pilotTeacher, legacy: true }
    : null;
}

export async function requireStaffAccess(allowedRoles: AppRole[] = STAFF_ROLES) {
  const access = await getStaffAccess(allowedRoles);
  if (!access) redirect("/staff/login?error=account-access");
  return access;
}

export async function requireStaffManager() {
  const access = await getStaffAccess(STAFF_MANAGER_ROLES);
  if (access) return access;

  // The private pilot code may create the first named academic-lead account.
  if (!await getCurrentAppUser() && await hasTeacherSession() && !await hasLinkedStaffAccount()) {
    const pilotTeacherId = await ensurePilotTeacher();
    const [pilotTeacher] = await getDb().select().from(users).where(eq(users.id, pilotTeacherId)).limit(1);
    if (pilotTeacher) return { user: pilotTeacher, legacy: true };
  }
  redirect("/staff?error=permission");
}

export async function claimPilotLearningData(student: AppUser) {
  if (student.role !== "student") return { attempts: 0, plans: 0, events: 0 };
  const pilotStudentId = await getPilotStudentId();
  if (!pilotStudentId || pilotStudentId === student.id) return { attempts: 0, plans: 0, events: 0 };

  const db = getDb();
  const [pilotStudent] = await db
    .select({ email: users.email, id: users.id, role: users.role })
    .from(users)
    .where(and(eq(users.id, pilotStudentId), isNull(users.authProviderId)))
    .limit(1);
  if (!pilotStudent || pilotStudent.role !== "student" || !pilotStudent.email.endsWith("@testbench.local")) {
    await clearPilotStudent();
    return { attempts: 0, plans: 0, events: 0 };
  }

  const [attemptRows, planRows, eventRows] = await Promise.all([
    db.select({ id: attempts.id }).from(attempts).where(eq(attempts.studentId, pilotStudentId)),
    db.select({ id: repairPlans.id }).from(repairPlans).where(eq(repairPlans.studentId, pilotStudentId)),
    db.select({ id: skillProgressEvents.id }).from(skillProgressEvents).where(eq(skillProgressEvents.studentId, pilotStudentId)),
  ]);
  const now = new Date();
  await db.update(attempts).set({ studentId: student.id, updatedAt: now }).where(eq(attempts.studentId, pilotStudentId));
  await db.update(repairPlans).set({ studentId: student.id, updatedAt: now }).where(eq(repairPlans.studentId, pilotStudentId));
  await db.update(skillProgressEvents).set({ studentId: student.id, updatedAt: now }).where(eq(skillProgressEvents.studentId, pilotStudentId));
  await db.update(users).set({ isActive: false, updatedAt: now }).where(eq(users.id, pilotStudentId));
  await clearPilotStudent();

  const result = { attempts: attemptRows.length, plans: planRows.length, events: eventRows.length };
  await recordAuditEvent({
    actorUserId: student.id,
    action: "pilot_data.claimed",
    entityType: "user",
    entityId: student.id,
    metadata: result,
  });
  return result;
}
