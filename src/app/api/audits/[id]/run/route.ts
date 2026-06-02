import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { setAuditStatus, persistReport, persistJourney } from "@/lib/db/audits";
import { runAudit } from "@/lib/audit/engine";
import { runPersonaJourney } from "@/lib/journey/runner";
import { getPersona, PERSONAS } from "@/lib/journey/personas";
import type { AuditConfig, AuditMode } from "@/types";

// Audits can run for a while (real crawl). Allow up to 5 minutes.
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const audit = await prisma.audit.findFirst({ where: { id, userId: session.userId } });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (audit.status === "running") {
    return NextResponse.json({ ok: true, status: "running" });
  }

  await setAuditStatus(id, "running");

  try {
    // ---- Persona / authenticated journey ----
    if (audit.type === "persona" || audit.type === "authenticated") {
      const persona = getPersona(audit.persona || "") ?? PERSONAS[0];
      const journey = await runPersonaJourney(audit.targetUrl, persona, {});
      await persistJourney(id, journey);
      return NextResponse.json({
        ok: true,
        status: "completed",
        type: audit.type,
        experienceScore: journey.experienceScore,
        gated: journey.gated,
      });
    }

    // ---- Technical QA audit ----
    const config: AuditConfig = {
      targetUrl: audit.targetUrl,
      mode: audit.mode as AuditMode,
      agentsCount: audit.agentsCount,
      durationMinutes: audit.durationMin,
      instructions: audit.instructions ?? undefined,
      whitelistNotes: audit.whitelistNotes ?? undefined,
    };
    const report = await runAudit(config);
    await persistReport(id, report);
    return NextResponse.json({
      ok: true,
      status: "completed",
      scores: report.scores,
      engine: report.engine,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed";
    await setAuditStatus(id, "failed", message);
    return NextResponse.json({ ok: false, status: "failed", error: message }, { status: 500 });
  }
}
