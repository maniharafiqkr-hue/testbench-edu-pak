import Link from "next/link";
import { AppUserMenu } from "@/app/components/AppUserMenu";
import { Brand } from "@/app/components/Brand";
import { requireStaffAccess } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function AuthorLandingPage({ searchParams }: { searchParams: Promise<{ accepted?: string }> }) {
  const access = await requireStaffAccess(["question_author", "academic_lead", "admin"]);
  const { accepted } = await searchParams;
  return (
    <main className="staff-page">
      <header className="staff-header container"><Brand /><div><span>{access.user.displayName}</span><AppUserMenu user={access.user} /></div></header>
      <div className="container staff-title"><div><span className="eyebrow">QUESTION AUTHOR</span><h1>Assessment author workspace</h1><p>Your account is ready for the English assessment-building phase.</p></div>{["academic_lead", "admin"].includes(access.user.role) ? <Link className="button button-secondary" href="/staff/users">Manage staff</Link> : null}</div>
      {accepted === "1" ? <div className="container form-alert form-alert-success">Your staff invitation was accepted successfully.</div> : null}
      <section className="container panel author-ready-card"><span className="card-kicker">ACCOUNT FOUNDATION COMPLETE</span><h2>Your author role is active.</h2><p>The next product milestone will add syllabus blueprints, question-bank authoring, marking schemes, moderation, and publishing controls here.</p><Link className="button" href="/">View student site</Link></section>
    </main>
  );
}
