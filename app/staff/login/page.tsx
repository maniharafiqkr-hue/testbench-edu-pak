import { redirect } from "next/navigation";
import { Brand } from "@/app/components/Brand";
import { hasTeacherSession, isTeacherAccessConfigured } from "@/lib/teacher-session";
import { loginTeacher } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function TeacherLoginPage({ searchParams }: Props) {
  if (await hasTeacherSession()) {
    redirect("/staff");
  }

  const configured = isTeacherAccessConfigured();
  const { error } = await searchParams;

  return (
    <main className="staff-login-page">
      <section className="staff-login-card panel">
        <Brand />
        <span className="eyebrow">TEACHER ACCESS</span>
        <h1>Review student writing</h1>
        <p>Enter the private pilot access code to open the marking workspace.</p>

        {!configured || error === "configuration" ? (
          <div className="form-alert">
            Teacher access is not configured yet. Add a secure <strong>TEACHER_ACCESS_CODE</strong>
            to the Vercel project before inviting a reviewer.
          </div>
        ) : null}
        {error === "invalid" ? (
          <div className="form-alert form-alert-error">That access code is not valid.</div>
        ) : null}

        <form action={loginTeacher} className="staff-login-form">
          <label htmlFor="accessCode">Pilot access code</label>
          <input
            autoComplete="current-password"
            disabled={!configured}
            id="accessCode"
            minLength={12}
            name="accessCode"
            required
            type="password"
          />
          <button className="button" disabled={!configured} type="submit">Open teacher workspace</button>
        </form>
        <small>Access expires after 12 hours. Student responses remain hidden until sign-in.</small>
      </section>
    </main>
  );
}
