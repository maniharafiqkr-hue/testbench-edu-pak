import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/app/components/Brand";
import { getDb } from "@/db";
import { staffInvitations } from "@/db/schema";
import { getCurrentAppUser, ROLE_LABELS } from "@/lib/accounts";
import { acceptStaffInvitation } from "./actions";

export const dynamic = "force-dynamic";

function maskedEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(name.length - 2, 6)))}@${domain}`;
}

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ token }, { error }] = await Promise.all([params, searchParams]);
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) notFound();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [[invitation], user] = await Promise.all([
    getDb().select().from(staffInvitations).where(eq(staffInvitations.tokenHash, tokenHash)).limit(1),
    getCurrentAppUser(),
  ]);
  if (!invitation) notFound();
  const returnPath = `/invite/${token}`;
  const usable = invitation.status === "pending" && invitation.expiresAt > new Date();

  return (
    <main className="auth-page">
      <header className="auth-header container"><Brand /><Link href="/">TestBench home</Link></header>
      <section className="auth-stage">
        <div className="invitation-card panel">
          <span className="eyebrow">STAFF INVITATION</span>
          <h1>Join the TestBench English team.</h1>
          <div className="invitation-summary"><span>Invited account</span><strong>{maskedEmail(invitation.email)}</strong><span>Assigned role</span><strong>{ROLE_LABELS[invitation.role]}</strong></div>
          {!usable || error === "invalid" ? <div className="form-alert form-alert-error">This invitation is no longer available. Ask the academic lead for a new link.</div> : null}
          {error === "expired" ? <div className="form-alert form-alert-error">This invitation expired after seven days.</div> : null}
          {error === "email" ? <div className="form-alert form-alert-error">Sign in with {maskedEmail(invitation.email)} to accept this invitation.</div> : null}
          {usable && !user ? <div className="invitation-actions"><Link className="button" href={`/auth/sign-in?redirectTo=${encodeURIComponent(returnPath)}`}>Sign in to accept</Link><Link className="button button-secondary" href={`/auth/sign-up?redirectTo=${encodeURIComponent(returnPath)}`}>Create invited account</Link></div> : null}
          {usable && user ? (
            <form action={acceptStaffInvitation}>
              <input name="token" type="hidden" value={token} />
              <p>Signed in as <strong>{user.email}</strong></p>
              <button className="button" type="submit">Accept staff role</button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
