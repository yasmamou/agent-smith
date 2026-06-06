import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import {
  getAuditWithRelations,
  parseScores,
  parseJson,
  findingFromRow,
} from "@/lib/db/audits";
import { AuditDetail, type AuditDetailData } from "@/components/audit/audit-detail";
import type { PageVisit, AuditStatus } from "@/types";

export const dynamic = "force-dynamic";

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) notFound();

  const audit = await getAuditWithRelations(id, session.userId);
  if (!audit) notFound();

  const initial: AuditDetailData = {
    id: audit.id,
    targetUrl: audit.targetUrl,
    status: audit.status as AuditStatus,
    mode: audit.mode,
    agentsCount: audit.agentsCount,
    engine: audit.engine,
    hasCredentials: audit.hasCredentials,
    summary: audit.summary,
    scores: parseScores(audit.scores),
    pagesVisited: parseJson<PageVisit[]>(audit.pagesVisited, []),
    uxSuggestions: parseJson<string[]>(audit.uxSuggestions, []),
    fixPrompt: audit.fixPrompt,
    reportMarkdown: audit.reportMarkdown,
    findings: audit.findings.map(findingFromRow),
    screenshots: audit.screenshots.map((s) => ({
      id: s.id,
      label: s.label,
      page: s.page,
      src: s.src,
      caption: s.caption ?? undefined,
    })),
    createdAt: audit.createdAt.toISOString(),
    completedAt: audit.completedAt?.toISOString() ?? null,
    type: audit.type,
    persona: audit.persona,
    journeyData: audit.journeyData ? parseJson<import("@/lib/journey/types").JourneyResult | null>(audit.journeyData, null) : null,
    siteModel: audit.siteModel ? parseJson<import("@/types").SiteModel | null>(audit.siteModel, null) : null,
    workflow: audit.workflowData ? parseJson<import("@/types").WorkflowResult | null>(audit.workflowData, null) : null,
  };

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Back to audits
      </Link>
      <Suspense fallback={<div className="text-fg-muted">Loading…</div>}>
        <AuditDetail initial={initial} />
      </Suspense>
    </div>
  );
}
