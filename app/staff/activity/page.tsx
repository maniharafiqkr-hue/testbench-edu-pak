import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Brand } from "@/app/components/Brand";
import { getDb } from "@/db";
import { auditEvents, users } from "@/db/schema";
import { requireStaffManager } from "@/lib/accounts";

export const dynamic = "force-dynamic";

function timestamp(date: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(date);
}

export default async function ActivityPage() {
  await requireStaffManager();
  const events = await getDb()
    .select({
      action: auditEvents.action,
      actorEmail: users.email,
      actorName: users.displayName,
      createdAt: auditEvents.createdAt,
      entityId: auditEvents.entityId,
      entityType: auditEvents.entityType,
      id: auditEvents.id,
      metadata: auditEvents.metadata,
    })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorUserId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(100);

  return (
    <main className="staff-page">
      <header className="staff-header container"><Brand /><Link href="/staff/users">Staff accounts</Link></header>
      <div className="container staff-title"><div><span className="eyebrow">AUDIT TRAIL</span><h1>Account and review activity</h1><p>The latest identity, access, and marking changes in TestBench.</p></div></div>
      <section className="container panel audit-list">
        {events.length ? events.map((event) => (
          <article key={event.id}>
            <time>{timestamp(event.createdAt)} PKT</time>
            <div><strong>{event.action.replaceAll(".", " ")}</strong><span>{event.actorName ?? "System"}{event.actorEmail ? ` · ${event.actorEmail}` : ""}</span></div>
            <div><span>{event.entityType}</span><small>{event.entityId ?? "—"}</small></div>
            <code>{event.metadata ? JSON.stringify(event.metadata) : "{}"}</code>
          </article>
        )) : <p className="panel-note">Audit events will appear as accounts and reviews are used.</p>}
      </section>
    </main>
  );
}
