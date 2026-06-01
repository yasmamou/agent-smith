import Link from "next/link";
import { Plus, Radar } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { listAudits, parseScores } from "@/lib/db/audits";
import { Button } from "@/components/ui/button";
import { AuditCard } from "@/components/dashboard/audit-card";
import type { AuditStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const audits = session ? await listAudits(session.userId) : [];

  const completed = audits.filter((a) => a.status === "completed");
  const avg =
    completed.length > 0
      ? Math.round(
          completed.reduce((s, a) => s + (parseScores(a.scores)?.overall ?? 0), 0) / completed.length
        )
      : null;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">Audits</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {audits.length} total · {completed.length} completed
            {avg !== null && ` · avg score ${avg}/100`}
          </p>
        </div>
        <Link href="/dashboard/audits/new">
          <Button>
            <Plus /> New audit
          </Button>
        </Link>
      </div>

      {audits.length === 0 ? (
        <div className="glass grid place-items-center rounded-2xl px-6 py-20 text-center">
          <Radar className="mb-4 size-10 text-matrix" />
          <h2 className="text-lg font-semibold text-fg">No audits yet</h2>
          <p className="mt-1 max-w-sm text-sm text-fg-muted">
            Paste a URL and let the agent swarm explore your app. You&apos;ll get a scored report and a
            ready-to-paste fix prompt.
          </p>
          <Link href="/dashboard/audits/new" className="mt-6">
            <Button>
              <Plus /> Run your first audit
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audits.map((a) => (
            <AuditCard
              key={a.id}
              id={a.id}
              targetUrl={a.targetUrl}
              status={a.status as AuditStatus}
              mode={a.mode}
              createdAt={a.createdAt}
              scores={parseScores(a.scores)}
              findingsCount={a._count.findings}
              engine={a.engine}
            />
          ))}
        </div>
      )}
    </div>
  );
}
