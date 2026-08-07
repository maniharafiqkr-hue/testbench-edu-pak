import { StudentProfileForm } from "@/app/components/StudentProfileForm";
import { StudentShell } from "@/app/components/StudentShell";
import { requireStudentUser } from "@/lib/accounts";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireStudentUser();
  const { error, saved } = await searchParams;
  return (
    <StudentShell current="profile" kicker="ACCOUNT & CURRICULUM" title="Your student profile">
      <section className="profile-card panel">
        <div><span className="eyebrow">LEARNING PROFILE</span><h2>Keep your course details current.</h2><p>Your level and examination board determine which curriculum and assessment blueprint TestBench should use.</p></div>
        {saved === "1" ? <div className="form-alert form-alert-success">Your profile was updated.</div> : null}
        {error === "profile" ? <div className="form-alert form-alert-error">Check the required profile fields.</div> : null}
        {error === "board-grade" ? <div className="form-alert form-alert-error">That board does not offer the selected level. Check both selections and try again.</div> : null}
        <StudentProfileForm returnTo="profile" user={user} />
        <Link className="text-link" href="/account/security">Password, sessions, and account security</Link>
      </section>
    </StudentShell>
  );
}
