import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createAudit, listAudits } from "@/lib/db/audits";
import { createAuditSchema } from "@/lib/validation";
import type { AuditConfig } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const audits = await listAudits(session.userId);
  return NextResponse.json({ audits });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createAuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
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
    await assertWithinRate(session.userId);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Rate limit" }, { status: 429 });
  }

  // Credentials are accepted but NEVER persisted in clear (see README §security).
  const config: AuditConfig = {
    targetUrl: data.targetUrl,
    mode: data.mode,
    agentsCount: data.agentsCount,
    durationMinutes: data.durationMinutes,
    instructions: data.instructions,
    whitelistNotes: data.whitelistNotes,
    login: data.login,
    password: data.password,
    apiKey: data.apiKey,
  };

  const audit = await createAudit(session.userId, config, {
    type: data.type,
    persona: data.persona,
    customAgentSlug: data.customAgentSlug,
    allowWrites: data.allowWrites,
  });
  return NextResponse.json({ ok: true, id: audit.id });
}
