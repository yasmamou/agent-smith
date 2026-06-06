import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { parseScores, parseJson, findingFromRow } from "@/lib/db/audits";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import type { Finding } from "@/types";

export const dynamic = "force-dynamic";

const sevColor: Record<string, string> = {
  critical: "text-critical", high: "text-high", medium: "text-medium", low: "text-low", info: "text-fg-faint",
};
function scoreColor(v: number) { return v >= 80 ? "var(--color-matrix)" : v >= 60 ? "var(--color-medium)" : "var(--color-high)"; }

export default async function SharedReportPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const audit = await prisma.audit
    .findFirst({ where: { shareId, status: "completed" }, include: { findings: true } })
    .catch(() => null);
  if (!audit) notFound();

  const scores = parseScores(audit.scores);
  const findings: Finding[] = audit.findings.map(findingFromRow);
  const host = safeHost(audit.targetUrl);
  const ranked = [...findings].sort((a, b) => sev(b.severity) - sev(a.severity));

  return (
    <main className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Logo href="/" />
          <Link href="/"><Button size="sm"><ShieldCheck className="size-4" /> Audit your site</Button></Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10">
        <p className="text-xs uppercase tracking-wide text-fg-faint">Rapport public · lecture seule</p>
        <h1 className="mt-1 font-mono text-2xl text-fg">{host}</h1>
        <p className="mt-1 text-sm text-fg-muted capitalize">
          {audit.mode} scan · {audit.engine} engine{audit.engine === "mock" ? " ⚠️ (simulé)" : ""}
        </p>

        {/* Scores */}
        {scores && (
          <div className="glass-bright mt-6 flex flex-wrap items-center gap-8 rounded-2xl p-6">
            <div className="text-center">
              <div className="text-5xl font-bold" style={{ color: scoreColor(scores.overall) }}>{scores.overall}</div>
              <div className="text-xs text-fg-faint">/100 global</div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-5">
              {([["Fonctionnel", scores.functional], ["UI", scores.ui], ["UX", scores.ux], ["Sécurité", scores.security], ["Performance", scores.performance]] as const).map(([l, v]) => (
                <div key={l}>
                  <div className="text-lg font-semibold" style={{ color: scoreColor(v) }}>{v}</div>
                  <div className="text-[11px] text-fg-faint">{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {audit.summary && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-fg-muted">{audit.summary}</p>
        )}

        {/* Findings */}
        <h2 className="mt-8 text-lg font-semibold text-fg">Findings ({findings.length})</h2>
        <div className="mt-3 space-y-3">
          {ranked.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-bg-elevated/40 p-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase ${sevColor[f.severity] || "text-fg-faint"}`}>{f.severity}</span>
                <span className="text-xs uppercase tracking-wide text-fg-faint">{f.category}</span>
                <span className="font-medium text-fg">{f.title}</span>
              </div>
              {f.recommendedFix && <p className="mt-1.5 text-sm text-fg-muted">{f.recommendedFix}</p>}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-matrix-dim/40 bg-matrix/5 p-8 text-center">
          <h3 className="text-lg font-semibold text-fg">Audite ton app en 30 secondes</h3>
          <p className="max-w-md text-sm text-fg-muted">
            Agent Smith explore ton site, teste les parcours, et te rend un rapport scoré + un prompt correctif prêt
            à coller dans Claude Code ou Cursor.
          </p>
          <Link href="/"><Button size="lg">Lancer un audit gratuit <ArrowRight /></Button></Link>
        </div>
      </div>
    </main>
  );
}

function sev(s: string): number { return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[s] ?? 0; }
function safeHost(u: string) { try { return new URL(u).host; } catch { return u; } }
