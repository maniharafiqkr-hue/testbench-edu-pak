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
        <p>Your level and examination board help us match you with the right English curriculum and assessment pattern.</p>
        {error === "profile" ? <div className="form-alert form-alert-error">Add your name, level, and a recognised examination board to continue.</div> : null}
        {error === "board-grade" ? <div className="form-alert form-alert-error">That board does not offer the selected level. Check both selections and try again.</div> : null}
        <StudentProfileForm returnTo="onboarding" user={user} />
        <small>Studying independently? Select the checkbox and you can leave the school field blank.</small>
      </section>
    </main>
  );
}
