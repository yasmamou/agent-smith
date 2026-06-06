import Link from "next/link";
import { Plus, Link2, ScanSearch, FileCode } from "lucide-react";
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
        <div className="glass rounded-2xl px-6 py-14">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold text-fg">Lance ton premier audit 🎯</h2>
            <p className="mt-1.5 text-sm text-fg-muted">
              Trois étapes, ~30 secondes. Tu repars avec un rapport scoré et un prompt correctif prêt à coller dans Claude Code.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              { icon: Link2, n: 1, t: "Colle l'URL", d: "L'app déployée que tu veux auditer (la tienne, ou une que tu es autorisé à tester)." },
              { icon: ScanSearch, n: 2, t: "Les agents explorent", d: "Crawl réel : ils cliquent, testent les formulaires, jouent le parcours, et notent." },
              { icon: FileCode, n: 3, t: "Rapport + fix prompt", d: "Scores, findings avec preuves, et un prompt correctif prêt pour Claude Code / Cursor." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-bg-elevated/40 p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-full bg-matrix/15 text-xs font-bold text-matrix">{s.n}</span>
                  <s.icon className="size-4 text-matrix" />
                </div>
                <p className="mt-2 text-sm font-semibold text-fg">{s.t}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href="/dashboard/audits/new">
              <Button size="lg"><Plus /> Lancer mon premier audit</Button>
            </Link>
            <Link href="/dashboard/api" className="text-xs text-fg-faint underline-offset-4 hover:text-fg hover:underline">
              ou branche-le à chaque déploiement (webhook / API / Claude Code) →
            </Link>
          </div>
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
