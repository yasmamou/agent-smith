import { prisma } from "@/lib/db/client";
import { setAuditStatus, persistReport, persistJourney } from "@/lib/db/audits";
import { runAudit } from "./engine";
import { runPersonaJourney } from "@/lib/journey/runner";
import { getPersona, PERSONAS } from "@/lib/journey/personas";
import type { AuditConfig, AuditMode } from "@/types";

export interface RunResult {
  ok: boolean;
  status: "completed" | "failed";
  type: string;
  scores?: unknown;
  engine?: string;
  experienceScore?: number;
  gated?: boolean;
  error?: string;
}

/**
 * Execute an audit (technical | persona | authenticated) and persist results.
 * Shared by the web run route and the programmatic /api/v1/audit endpoint.
 */
export async function executeAudit(auditId: string): Promise<RunResult> {
  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) return { ok: false, status: "failed", type: "unknown", error: "not found" };

  await setAuditStatus(auditId, "running");

  try {
    // Persona journey (public funnel UX, keyword-driven personas).
    if (audit.type === "persona") {
      const persona = getPersona(audit.persona || "") ?? PERSONAS[0];
      const journey = await runPersonaJourney(audit.targetUrl, persona, {});
      await persistJourney(auditId, journey);
      return { ok: true, status: "completed", type: audit.type, experienceScore: journey.experienceScore, gated: journey.gated };
    }

    // Authenticated audit = full technical audit + WRITE-PATH workflow test:
    // the agent logs in with the test account and drives the real workflow.
    if (audit.type === "authenticated") {
      let creds: { email: string; password: string } | undefined;
      if (audit.credEnc) {
        const { decryptJson } = await import("@/lib/security/crypto");
        creds = decryptJson<{ email: string; password: string }>(audit.credEnc) ?? undefined;
      }
      const config: AuditConfig = {
        targetUrl: audit.targetUrl,
        mode: audit.mode as AuditMode,
        agentsCount: audit.agentsCount,
        durationMinutes: audit.durationMin,
        instructions: audit.instructions ?? undefined,
      };
      const report = await runAudit(config, { creds });
      await persistReport(auditId, report);
      await prisma.audit.update({ where: { id: auditId }, data: { credEnc: null } }).catch(() => {});
      return { ok: true, status: "completed", type: audit.type, scores: report.scores, engine: report.engine };
    }

    const config: AuditConfig = {
      targetUrl: audit.targetUrl,
      mode: audit.mode as AuditMode,
      agentsCount: audit.agentsCount,
      durationMinutes: audit.durationMin,
      instructions: audit.instructions ?? undefined,
      whitelistNotes: audit.whitelistNotes ?? undefined,
    };

    // Custom marketplace agent: focus categories + active checks + AI angle.
    let opts = {};
    if (audit.type === "custom" && audit.agentConfig) {
      try {
        const cfg = JSON.parse(audit.agentConfig) as { checks?: string[]; aiInstructions?: string };
        const checks = cfg.checks ?? [];
        const { categoriesForChecks, activeChecks } = await import("@/lib/agents/catalog");
        opts = {
          activeCheckIds: activeChecks(checks).map((c) => c.id),
          categoryFilter: categoriesForChecks(checks),
          aiInstructions: cfg.aiInstructions || undefined,
        };
      } catch {
        /* fall back to a full technical audit */
      }
    }

    const report = await runAudit(config, opts);
    await persistReport(auditId, report);
    return { ok: true, status: "completed", type: audit.type, scores: report.scores, engine: report.engine };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed";
    await setAuditStatus(auditId, "failed", message);
    return { ok: false, status: "failed", type: audit.type, error: message };
  }
}
