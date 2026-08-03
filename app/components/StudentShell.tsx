import Link from "next/link";
import { UserButton } from "@neondatabase/auth-ui";
import { Brand } from "./Brand";

type StudentShellProps = {
  current: "home" | "practice" | "plan" | "progress" | "profile";
  title: string;
  kicker?: string;
  children: React.ReactNode;
};

const navigation = [
  ["home", "Home", "/app/home"],
  ["practice", "Practice", "/app/diagnostic"],
  ["plan", "My plan", "/app/plan"],
  ["progress", "Progress", "/app/progress"],
  ["profile", "Profile", "/app/profile"],
] as const;

export function StudentShell({ current, title, kicker, children }: StudentShellProps) {
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Brand />
        <nav aria-label="Student navigation">
          {navigation.map(([id, label, href]) => (
            <Link className={current === id ? "active" : ""} href={href} key={id}>{label}</Link>
          ))}
        </nav>
        <div className="sidebar-help">
          <span>Need help?</span>
          <p>Report a question or ask about your result.</p>
          <a href="mailto:support@testbench.pk">Contact support</a>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div>
            <span className="mobile-brand"><Brand /></span>
            {kicker && <p>{kicker}</p>}
            <h1>{title}</h1>
          </div>
          <div className="exam-countdown"><span>Board exam</span><strong>214 days</strong></div>
          <div className="account-button" aria-label="Open account menu"><UserButton /></div>
        </header>
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}
