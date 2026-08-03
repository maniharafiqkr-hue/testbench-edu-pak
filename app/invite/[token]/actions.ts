"use server";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { staffInvitations, users } from "@/db/schema";
import { recordAuditEvent, requireAuthenticatedUser, STAFF_ROLES } from "@/lib/accounts";

export async function acceptStaffInvitation(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const rawToken = formData.get("token");
  const token = typeof rawToken === "string" ? rawToken.slice(0, 100) : "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) redirect("/staff/login?error=invalid-invitation");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = getDb();
  const [invitation] = await db.select().from(staffInvitations).where(eq(staffInvitations.tokenHash, tokenHash)).limit(1);
  if (!invitation || invitation.status !== "pending") redirect(`/invite/${token}?error=invalid`);
  if (invitation.expiresAt <= new Date()) {
    await db.update(staffInvitations).set({ status: "expired", updatedAt: new Date() }).where(eq(staffInvitations.id, invitation.id));
    redirect(`/invite/${token}?error=expired`);
  }
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) redirect(`/invite/${token}?error=email`);
  if (!STAFF_ROLES.includes(invitation.role)) redirect(`/invite/${token}?error=invalid`);

  const now = new Date();
  await db.update(users).set({ role: invitation.role, updatedAt: now }).where(eq(users.id, user.id));
  await db.update(staffInvitations).set({
    acceptedAt: now,
    acceptedByUserId: user.id,
    status: "accepted",
    updatedAt: now,
  }).where(eq(staffInvitations.id, invitation.id));
  await recordAuditEvent({
    actorUserId: user.id,
    action: "staff_invitation.accepted",
    entityType: "staff_invitation",
    entityId: invitation.id,
    metadata: { role: invitation.role },
  });
  redirect(invitation.role === "question_author" ? "/staff/author?accepted=1" : "/staff?accepted=1");
}
