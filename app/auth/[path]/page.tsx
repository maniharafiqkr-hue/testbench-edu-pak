import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/app/components/Brand";
import { isAuthConfigured } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

function safeReturnPath(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/onboarding";
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const [{ path }, { redirectTo }] = await Promise.all([params, searchParams]);
  if (!(Object.values(authViewPaths) as string[]).includes(path)) notFound();

  return (
    <main className="auth-page">
      <header className="auth-header container">
        <Brand />
        <Link href="/">Back to TestBench</Link>
      </header>
      <section className="auth-stage">
        {!isAuthConfigured() ? (
          <div className="auth-configuration panel">
            <span className="eyebrow">ACCOUNT SETUP</span>
            <h1>Authentication needs two deployment settings.</h1>
            <p>Add <strong>NEON_AUTH_BASE_URL</strong> and <strong>NEON_AUTH_COOKIE_SECRET</strong> before opening accounts.</p>
          </div>
        ) : <AuthView path={path} redirectTo={safeReturnPath(redirectTo)} />}
      </section>
    </main>
  );
}
