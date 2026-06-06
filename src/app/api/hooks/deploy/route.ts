import { NextResponse } from "next/server";
import { after } from "next/server";
import { resolveUser } from "@/lib/auth/resolve";
import { createAudit } from "@/lib/db/audits";
import type { AuditConfig } from "@/types";

export const maxDuration = 300;

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://agent-smith-iota.vercel.app";

/**
 * Post-deploy webhook. Wire it into a GitHub Action / Vercel Deploy Notification /
 * CI step so every deployment auto-audits the target and produces a regression
 * digest (vs the previous run). Auth: Authorization: Bearer <apiKey>.
 *
 *   curl -X POST $BASE/api/hooks/deploy \
 *     -H "Authorization: Bearer $AGENT_SMITH_API_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"targetUrl":"https://my-app.com"}'
 *
 * Runs asynchronously (returns immediately); poll statusUrl or read the diff via
 * GET /api/audits/:id.
 */
export async function POST(req: Request) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized — provide Authorization: Bearer <apiKey>" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  // Accept {targetUrl}; also tolerate Vercel's deploy payload shape.
  const targetUrl = String(
    body?.targetUrl || body?.deployment?.url || body?.url || ""
  ).trim();
  const normalized = targetUrl && !/^https?:\/\//i.test(targetUrl) ? `https://${targetUrl}` : targetUrl;

  if (!/^https?:\/\//i.test(normalized)) {
    return NextResponse.json({ error: "Provide { targetUrl } (https://…)." }, { status: 400 });
  }

  try {
    const { assertPublicHttpUrl } = await import("@/lib/security/ssrf");
    await assertPublicHttpUrl(normalized);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "URL refusée" }, { status: 400 });
  }

  const { hasCredits, costForAudit } = await import("@/lib/billing/credits");
  const cost = costForAudit("technical");
  if (!(await hasCredits(user.userId, cost))) {
    return NextResponse.json({ error: "Crédits insuffisants.", code: "insufficient_credits" }, { status: 402 });
  }

  const config: AuditConfig = { targetUrl: normalized, mode: "standard", agentsCount: 5, durationMinutes: 15 };
  const audit = await createAudit(user.userId, config, { type: "technical", source: "deploy-hook" });

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
      url: `${BASE}/dashboard/audits/${audit.id}`,
      statusUrl: `${BASE}/api/audits/${audit.id}`,
    },
    { status: 202 }
  );
}
