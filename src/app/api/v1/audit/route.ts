import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth/resolve";
import { createAudit, getAuditWithRelations, parseScores, parseJson, findingFromRow } from "@/lib/db/audits";
import { executeAudit } from "@/lib/audit/run-service";
import { createAuditSchema } from "@/lib/validation";
import type { AuditConfig, PageVisit } from "@/types";

export const maxDuration = 300;

/**
 * One-call programmatic audit for Claude Code / CI / MCP.
 * Auth: `Authorization: Bearer <apiKey>` (or session cookie).
 * Body: { targetUrl, type?, persona?, mode?, login?, password?, instructions? }
 * Creates, runs synchronously, and returns the full report + fix prompt.
 */
export async function POST(req: Request) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized — provide Authorization: Bearer <apiKey>" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  // tolerate missing `authorized` for programmatic callers (they accept ToS via key use)
  const parsed = createAuditSchema.safeParse({ authorized: true, ...body });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const config: AuditConfig = {
    targetUrl: data.targetUrl,
    mode: data.mode,
    agentsCount: data.agentsCount,
    durationMinutes: data.durationMinutes,
    instructions: data.instructions,
    login: data.login,
    password: data.password,
    apiKey: data.apiKey,
  };

  const audit = await createAudit(user.userId, config, { type: data.type, persona: data.persona });
  const result = await executeAudit(audit.id);

  const full = await getAuditWithRelations(audit.id, user.userId);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://agent-smith-iota.vercel.app";

  return NextResponse.json(
    {
      ok: result.ok,
      id: audit.id,
      url: `${base}/dashboard/audits/${audit.id}`,
      pdfUrl: `${base}/api/audits/${audit.id}/export-pdf`,
      status: result.status,
      type: data.type,
      engine: full?.engine ?? null,
      summary: full?.summary ?? null,
      scores: parseScores(full?.scores),
      findings: (full?.findings ?? []).map(findingFromRow),
      pagesVisited: parseJson<PageVisit[]>(full?.pagesVisited, []),
      fixPrompt: full?.fixPrompt ?? null,
      journey: full?.journeyData ? parseJson(full.journeyData, null) : null,
      error: result.error,
    },
    { status: result.ok ? 200 : 500 }
  );
}
