"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { staffInvitations, users } from "@/db/schema";
import {
  type AppRole,
  recordAuditEvent,
  requireStaffManager,
  STAFF_ROLES,
} from "@/lib/accounts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string, max = 320) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function createStaffInvitation(formData: FormData) {
  const access = await requireStaffManager();
  const email = field(formData, "email").toLowerCase();
  const role = field(formData, "role", 40) as AppRole;
  if (!email.includes("@") || !STAFF_ROLES.includes(role)) redirect("/staff/users?error=invitation");
  if (access.legacy && !["academic_lead", "admin"].includes(role)) {
    redirect("/staff/users?error=bootstrap-role");
  }

  const db = getDb();
  const [linked] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (linked?.id) redirect("/staff/users?error=existing-user");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  await db
    .update(staffInvitations)
    .set({ status: "revoked", updatedAt: now })
    .where(and(eq(staffInvitations.email, email), eq(staffInvitations.status, "pending")));
  const [invitation] = await db.insert(staffInvitations).values({
    email,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    invitedByUserId: access.user.id,
    role,
    tokenHash,
  }).returning({ id: staffInvitations.id });
  await recordAuditEvent({
    actorUserId: access.user.id,
    action: "staff_invitation.created",
    entityType: "staff_invitation",
    entityId: invitation.id,
    metadata: { email, role },
  });
  redirect(`/staff/users?created=${encodeURIComponent(token)}`);
}

export async function revokeStaffInvitation(formData: FormData) {
  const access = await requireStaffManager();
  if (access.legacy) redirect("/staff/users?error=permission");
  const invitationId = field(formData, "invitationId", 40);
  if (!UUID_PATTERN.test(invitationId)) redirect("/staff/users?error=invitation");
  await getDb().update(staffInvitations).set({ status: "revoked", updatedAt: new Date() })
    .where(and(eq(staffInvitations.id, invitationId), eq(staffInvitations.status, "pending")));
  await recordAuditEvent({ actorUserId: access.user.id, action: "staff_invitation.revoked", entityType: "staff_invitation", entityId: invitationId });
  revalidatePath("/staff/users");
}

export async function updateStaffRole(formData: FormData) {
  const access = await requireStaffManager();
  if (access.legacy) redirect("/staff/users?error=permission");
  const userId = field(formData, "userId", 40);
  const role = field(formData, "role", 40) as AppRole;
  if (!UUID_PATTERN.test(userId) || !STAFF_ROLES.includes(role) || userId === access.user.id) {
    redirect("/staff/users?error=role");
  }
  await getDb().update(users).set({ role, updatedAt: new Date() })
    .where(and(eq(users.id, userId), ne(users.role, "student")));
  await recordAuditEvent({ actorUserId: access.user.id, action: "staff_role.updated", entityType: "user", entityId: userId, metadata: { role } });
  revalidatePath("/staff/users");
}

export async function setStaffActive(formData: FormData) {
  const access = await requireStaffManager();
  if (access.legacy) redirect("/staff/users?error=permission");
  const userId = field(formData, "userId", 40);
  const active = field(formData, "active", 5) === "true";
  if (!UUID_PATTERN.test(userId) || userId === access.user.id) redirect("/staff/users?error=status");
  await getDb().update(users).set({ isActive: active, updatedAt: new Date() })
    .where(and(eq(users.id, userId), ne(users.role, "student")));
  await recordAuditEvent({ actorUserId: access.user.id, action: active ? "staff_account.activated" : "staff_account.deactivated", entityType: "user", entityId: userId });
  revalidatePath("/staff/users");
}
