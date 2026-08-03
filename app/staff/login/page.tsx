import { redirect } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/app/components/Brand";
import { getStaffAccess, isLegacyStaffAccessAvailable } from "@/lib/accounts";
import { isTeacherAccessConfigured } from "@/lib/teacher-session";
import { loginTeacher } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function TeacherLoginPage({ searchParams }: Props) {
  if (await getStaffAccess()) {
    redirect("/staff/entry");
  }

  const configured = isTeacherAccessConfigured();
  const legacyAvailable = configured && await isLegacyStaffAccessAvailable();
  const { error } = await searchParams;

  return (
    <main className="staff-login-page">
      <section className="staff-login-card panel">
        <Brand />
        <span className="eyebrow">TEACHER ACCESS</span>
        <h1>Review student writing</h1>
        <p>Sign in with your invited staff account. The pilot code remains available only while the first named staff account is being created.</p>

        <Link className="button" href="/auth/sign-in?redirectTo=/staff/entry">Sign in with staff account</Link>

        {error === "account-access" ? <div className="form-alert form-alert-error">This account does not have permission to review student work. Ask the academic lead to check its role.</div> : null}

        <div className="staff-login-divider"><span>Temporary pilot access</span></div>

        {!configured || error === "configuration" ? (
          <div className="form-alert">
            Teacher access is not configured yet. Add a secure <strong>TEACHER_ACCESS_CODE</strong>
            to the Vercel project before inviting a reviewer.
          </div>
        ) : null}
        {error === "invalid" ? (
          <div className="form-alert form-alert-error">That access code is not valid.</div>
        ) : null}
        {!legacyAvailable || error === "legacy-retired" ? (
          configured ? <div className="form-alert">The shared pilot code has retired. Use an invited staff account to continue.</div> : null
        ) : (
          <>
            <form action={loginTeacher} className="staff-login-form">
              <label htmlFor="accessCode">Pilot access code</label>
              <input
                autoComplete="current-password"
                id="accessCode"
                minLength={12}
                name="accessCode"
                required
                type="password"
              />
              <button className="button" type="submit">Open teacher workspace</button>
            </form>
            <small>Access expires after 12 hours. Student responses remain hidden until sign-in.</small>
          </>
        )}
      </section>
    </main>
  );
}
