import { redirect } from "next/navigation";
import { Brand } from "@/app/components/Brand";
import { StudentProfileForm } from "@/app/components/StudentProfileForm";
import { requireAuthenticatedUser } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireAuthenticatedUser();
  if (user.role !== "student") redirect("/staff/entry");
  if (user.profileCompletedAt && user.gradeLevel && user.board) redirect("/app/home");
  const { error } = await searchParams;

  return (
    <main className="onboarding-page">
      <header className="auth-header container"><Brand /><span>Secure student account</span></header>
      <section className="onboarding-card panel">
        <span className="eyebrow">WELCOME TO TESTBENCH</span>
        <h1>Set up your English profile.</h1>
        <p>This helps us show the correct curriculum and keeps every attempt, teacher review, and repair plan under your account.</p>
        {error === "profile" ? <div className="form-alert form-alert-error">Add your name, level, and board to continue.</div> : null}
        <StudentProfileForm returnTo="onboarding" user={user} />
        <small>If you already used the pilot diagnostic on this browser, that work will be moved into this account automatically.</small>
      </section>
    </main>
  );
}
