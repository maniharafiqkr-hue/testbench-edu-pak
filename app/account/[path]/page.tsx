import { AccountView } from "@neondatabase/auth-ui";
import { accountViewPaths } from "@neondatabase/auth-ui/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/app/components/Brand";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!(Object.values(accountViewPaths) as string[]).includes(path)) notFound();

  return (
    <main className="auth-page">
      <header className="auth-header container"><Brand /><Link href="/app/home">Return to TestBench</Link></header>
      <section className="auth-stage"><AccountView path={path} /></section>
    </main>
  );
}
