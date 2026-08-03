import Link from "next/link";
import { Brand } from "@/app/components/Brand";

export default function AccessDisabledPage() {
  return (
    <main className="auth-page"><header className="auth-header container"><Brand /></header><section className="auth-stage"><div className="auth-configuration panel"><span className="eyebrow">ACCOUNT PAUSED</span><h1>This TestBench account is not active.</h1><p>Ask the academic lead to restore access if you believe this is a mistake.</p><Link className="button" href="/auth/sign-out">Sign out</Link></div></section></main>
  );
}
