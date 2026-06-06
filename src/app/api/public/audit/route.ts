import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { runAudit } from "@/lib/audit/engine";
import type { AuditConfig } from "@/types";

// A quick anonymous audit can still drive a real browser — allow time.
export const maxDuration = 120;

const MAX_PER_IP_PER_HOUR = 5;
const CACHE_MINUTES = 30;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  return (xff.split(",")[0] || req.headers.get("x-real-ip") || "anon").trim();
}

/**
 * Public, no-signup "try it free" audit from the landing page.
 * Runs a QUICK technical audit and returns a TEASER (scores + top 2 findings +
 * hidden count). No credits, no persistence of the full report — the full report,
 * fix prompt, workflow test and history require an account. Guarded by SSRF +
 * per-IP rate limit + short cache.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const targetUrl = String(body?.targetUrl || "").trim();

  if (!/^https?:\/\//i.test(targetUrl)) {
    return NextResponse.json({ error: "Entre une URL valide (https://…)." }, { status: 400 });
  }

  // SSRF guard
  try {
    const { assertPublicHttpUrl } = await import("@/lib/security/ssrf");
    await assertPublicHttpUrl(targetUrl);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "URL refusée" }, { status: 400 });
  }

  const ip = clientIp(req);
  const now = Date.now();

  // Cache: reuse a recent result for the same URL (any IP) to save browser time.
  const cached = await prisma.publicAudit
    .findFirst({
      where: { targetUrl, createdAt: { gte: new Date(now - CACHE_MINUTES * 60_000) } },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);
  if (cached) {
    return NextResponse.json({
      ok: true,
      cached: true,
      engine: cached.engine,
      simulated: cached.engine === "mock",
      overall: cached.overall,
      scores: cached.scores ? JSON.parse(cached.scores) : null,
      ...(cached.teaser ? JSON.parse(cached.teaser) : { findings: [], hiddenCount: 0 }),
    });
  }

  // Per-IP rate limit
  const recent = await prisma.publicAudit
    .count({ where: { ip, createdAt: { gte: new Date(now - 60 * 60_000) } } })
    .catch(() => 0);
  if (recent >= MAX_PER_IP_PER_HOUR) {
    return NextResponse.json(
      { error: "Limite atteinte (essai gratuit). Crée un compte pour des audits illimités.", code: "rate_limited" },
      { status: 429 }
    );
  }

  const config: AuditConfig = {
    targetUrl,
    mode: "quick",
    agentsCount: 3,
    durationMinutes: 5,
  };

  // Quick crawl + heuristic agents only — no AI workflow/strategy (cheap & fast).
  const report = await runAudit(config, { runWorkflow: false });

  const ranked = [...report.findings].sort((a, b) => sev(b.severity) - sev(a.severity));
  const top = ranked.slice(0, 2).map((f) => ({
    title: f.title,
    severity: f.severity,
    category: f.category,
    recommendedFix: f.recommendedFix.slice(0, 160),
  }));
  const teaser = { findings: top, hiddenCount: Math.max(0, report.findings.length - top.length) };

  // Persist the teaser only (rate-limit + cache + analytics). No full report.
  await prisma.publicAudit
    .create({
      data: {
        ip,
        targetUrl,
        engine: report.engine,
        overall: report.scores.overall,
        scores: JSON.stringify(report.scores),
        teaser: JSON.stringify(teaser),
      },
    })
    .catch(() => {});

  return NextResponse.json({
    ok: true,
    cached: false,
    engine: report.engine,
    simulated: report.engine === "mock",
    overall: report.scores.overall,
    scores: report.scores,
    ...teaser,
  });
}

function sev(s: string): number {
  return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[s] ?? 0;
}
