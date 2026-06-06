import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAuditWithRelations, parseScores, parseJson, findingFromRow } from "@/lib/db/audits";
import type { PageVisit, TimelineEvent } from "@/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const audit = await getAuditWithRelations(id, session.userId);
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    audit: {
      id: audit.id,
      targetUrl: audit.targetUrl,
      status: audit.status,
      type: audit.type,
      persona: audit.persona,
      journeyData: audit.journeyData ? parseJson(audit.journeyData, null) : null,
      siteModel: audit.siteModel ? parseJson(audit.siteModel, null) : null,
      workflow: audit.workflowData ? parseJson(audit.workflowData, null) : null,
      mode: audit.mode,
      agentsCount: audit.agentsCount,
      durationMin: audit.durationMin,
      engine: audit.engine,
      hasCredentials: audit.hasCredentials,
      summary: audit.summary,
      scores: parseScores(audit.scores),
      pagesVisited: parseJson<PageVisit[]>(audit.pagesVisited, []),
      timeline: parseJson<TimelineEvent[]>(audit.timeline, []),
      uxSuggestions: parseJson<string[]>(audit.uxSuggestions, []),
      fixPrompt: audit.fixPrompt,
      reportMarkdown: audit.reportMarkdown,
      createdAt: audit.createdAt,
      completedAt: audit.completedAt,
      findings: audit.findings.map(findingFromRow),
      screenshots: audit.screenshots,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const audit = await getAuditWithRelations(id, session.userId);
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { prisma } = await import("@/lib/db/client");
  await prisma.audit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
