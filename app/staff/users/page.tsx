import { and, desc, inArray, ne } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { Brand } from "@/app/components/Brand";
import { getDb } from "@/db";
import { staffInvitations, users } from "@/db/schema";
import { type AppRole, ROLE_LABELS, STAFF_ROLES, requireStaffManager } from "@/lib/accounts";
import { createStaffInvitation, revokeStaffInvitation, setStaffActive, updateStaffRole } from "./actions";

export const dynamic = "force-dynamic";

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(date);
}

export default async function StaffUsersPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const access = await requireStaffManager();
  const { created, error } = await searchParams;
  const db = getDb();
  const [staff, invitations] = await Promise.all([
    db.select().from(users).where(and(inArray(users.role, STAFF_ROLES), ne(users.email, "pilot-english-teacher@testbench.local"))).orderBy(users.displayName),
    db.select().from(staffInvitations).orderBy(desc(staffInvitations.createdAt)),
  ]);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "testbench-edu-pak.vercel.app";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const invitationUrl = created ? `${protocol}://${host}/invite/${created}` : null;
  const inviteRoles: AppRole[] = access.legacy ? ["academic_lead", "admin"] : STAFF_ROLES;

  return (
    <main className="staff-page">
      <header className="staff-header container"><Brand /><div><span>{access.user.displayName}</span><Link href="/staff">Marking workspace</Link></div></header>
      <div className="container staff-title"><div><span className="eyebrow">ACCESS & ROLES</span><h1>Staff accounts</h1><p>Invite named teachers and control who can author, review, or manage TestBench.</p></div><div className="staff-title-actions"><Link className="button button-secondary" href="/staff/activity">View audit log</Link></div></div>

      {invitationUrl ? <div className="container invitation-created form-alert form-alert-success"><strong>Invitation created.</strong><p>Copy this private link and send it only to the invited teacher:</p><code>{invitationUrl}</code></div> : null}
      {error ? <div className="container form-alert form-alert-error">{error === "bootstrap-role" ? "The pilot code can only create the first academic lead or administrator account." : error === "existing-user" ? "That email already has a TestBench account." : "The requested staff change could not be completed."}</div> : null}

      <section className="container staff-admin-grid">
        <article className="panel staff-invite-panel">
          <span className="card-kicker">NEW STAFF MEMBER</span><h2>Create a seven-day invitation</h2>
          <form action={createStaffInvitation} className="profile-form">
            <label><span>Email address</span><input autoComplete="email" name="email" required type="email" /></label>
            <label><span>Initial role</span><select defaultValue={access.legacy ? "academic_lead" : "reviewer"} name="role">
              {inviteRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select></label>
            <button className="button" type="submit">Create invitation link</button>
          </form>
          {access.legacy ? <p className="panel-note">Create the first named academic lead. Once accepted, the shared pilot code retires automatically.</p> : null}
        </article>

        <article className="panel role-guide"><span className="card-kicker">ROLE GUIDE</span><h2>Keep access intentional</h2><div><strong>Question author</strong><p>Builds assessment questions and marking materials.</p></div><div><strong>Reviewer</strong><p>Reviews questions and student writing.</p></div><div><strong>Academic lead</strong><p>Approves content and manages staff access.</p></div><div><strong>Administrator</strong><p>Full operational access.</p></div></article>
      </section>

      <section className="container panel staff-directory">
        <div className="panel-heading"><div><span className="card-kicker">ACTIVE DIRECTORY</span><h2>Named staff accounts</h2></div><span>{staff.length} accounts</span></div>
        {staff.length ? <div className="staff-user-list">{staff.map((member) => <article key={member.id}><div><strong>{member.displayName}</strong><span>{member.email}</span><small>{member.authProviderId ? "Account linked" : "Awaiting account link"}</small></div><form action={updateStaffRole}><input name="userId" type="hidden" value={member.id} /><select defaultValue={member.role} disabled={access.legacy || member.id === access.user.id} name="role">{STAFF_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select><button className="text-button" disabled={access.legacy || member.id === access.user.id} type="submit">Save role</button></form><form action={setStaffActive}><input name="userId" type="hidden" value={member.id} /><input name="active" type="hidden" value={String(!member.isActive)} /><button className="text-button" disabled={access.legacy || member.id === access.user.id} type="submit">{member.isActive ? "Deactivate" : "Reactivate"}</button></form></article>)}</div> : <p className="panel-note">No named staff account has been linked yet.</p>}
      </section>

      <section className="container panel staff-directory">
        <div className="panel-heading"><div><span className="card-kicker">INVITATION HISTORY</span><h2>Recent invitations</h2></div></div>
        {invitations.length ? <div className="staff-user-list">{invitations.map((invitation) => <article key={invitation.id}><div><strong>{invitation.email}</strong><span>{ROLE_LABELS[invitation.role]}</span><small>Expires {dateLabel(invitation.expiresAt)}</small></div><span className={`queue-status queue-status-${invitation.status}`}>{invitation.status}</span>{invitation.status === "pending" && !access.legacy ? <form action={revokeStaffInvitation}><input name="invitationId" type="hidden" value={invitation.id} /><button className="text-button" type="submit">Revoke</button></form> : <span />}</article>)}</div> : <p className="panel-note">No staff invitations yet.</p>}
      </section>
    </main>
  );
}
