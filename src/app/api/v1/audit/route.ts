import { NextResponse } from "next/server";
import { after } from "next/server";
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

  // SSRF guard + rate limit
  try {
    const { assertPublicHttpUrl } = await import("@/lib/security/ssrf");
    await assertPublicHttpUrl(data.targetUrl);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "URL refusée" }, { status: 400 });
  }
  try {
    const { assertWithinRate } = await import("@/lib/security/rate-limit");
    await assertWithinRate(user.userId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Rate limit" }, { status: 429 });
  }

  // Credit pre-flight (the actual charge happens in executeAudit, refunded on
  // failure / simulated runs).
  const { hasCredits, costForAudit } = await import("@/lib/billing/credits");
  const cost = costForAudit(data.type);
  if (!(await hasCredits(user.userId, cost))) {
    return NextResponse.json(
      { error: `Crédits insuffisants — ${cost} requis. Rechargez sur /dashboard/billing.`, code: "insufficient_credits" },
      { status: 402 }
    );
  }

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

  const audit = await createAudit(user.userId, config, {
    type: data.type,
    persona: data.persona,
    customAgentSlug: data.customAgentSlug,
    presetSlug: data.presetSlug,
    allowWrites: data.allowWrites,
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://agent-smith-iota.vercel.app";

  // Async mode: queue + run after the response (Next after()). The cron drainer
  // (/api/queue/process) is a safety net. Caller polls GET /api/audits/:id.
  if (data.async) {
    const { prisma } = await import("@/lib/db/client");
    await prisma.audit.update({ where: { id: audit.id }, data: { status: "queued" } });
    after(async () => {
      const { runQueued } = await import("@/lib/audit/queue");
      await runQueued(audit.id).catch(() => {});
    });
    return NextResponse.json(
      {
        ok: true,
        id: audit.id,
        status: "queued",
        async: true,
        url: `${base}/dashboard/audits/${audit.id}`,
        statusUrl: `${base}/api/audits/${audit.id}`,
        pdfUrl: `${base}/api/audits/${audit.id}/export-pdf`,
      },
      { status: 202 }
    );
  }

  const result = await executeAudit(audit.id);

  const full = await getAuditWithRelations(audit.id, user.userId);
  const { computeRegression } = await import("@/lib/audit/diff");
  const regression = await computeRegression(audit.id).catch(() => null);

  return NextResponse.json(
    {
      ok: result.ok,
      id: audit.id,
      url: `${base}/dashboard/audits/${audit.id}`,
      pdfUrl: `${base}/api/audits/${audit.id}/export-pdf`,
      status: result.status,
      type: data.type,
      engine: full?.engine ?? null,
      simulated: full?.engine === "mock",
      summary: full?.summary ?? null,
      scores: parseScores(full?.scores),
      findings: (full?.findings ?? []).map(findingFromRow),
      pagesVisited: parseJson<PageVisit[]>(full?.pagesVisited, []),
      fixPrompt: full?.fixPrompt ?? null,
      journey: full?.journeyData ? parseJson(full.journeyData, null) : null,
      siteModel: full?.siteModel ? parseJson(full.siteModel, null) : null,
      workflow: full?.workflowData ? parseJson(full.workflowData, null) : null,
      strategy: full?.strategyData ? parseJson(full.strategyData, null) : null,
      regression,
      error: result.error,
    },
    { status: result.ok ? 200 : 500 }
  );
}
