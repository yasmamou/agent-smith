import { prisma } from "./client";
import type { AuditReport, AuditConfig, AuditStatus, Finding, AuditScores } from "@/types";

/**
 * DB access for audits. Credentials are NEVER persisted in clear — only the
 * boolean `hasCredentials` is stored.
 */

export async function createAudit(
  userId: string,
  config: AuditConfig,
  extra?: { type?: string; persona?: string; customAgentSlug?: string }
) {
  const type = extra?.type || "technical";
  const hasCreds = !!(config.login && config.password);

  // Custom marketplace agent → snapshot its config onto the audit.
  let agentConfig: string | null = null;
  if (type === "custom" && extra?.customAgentSlug) {
    const agent = await prisma.customAgent.findFirst({
      where: { slug: extra.customAgentSlug, userId },
    });
    if (agent) {
      agentConfig = JSON.stringify({
        name: agent.name,
        specialty: agent.specialty,
        checks: JSON.parse(agent.checks || "[]"),
        aiInstructions: agent.aiInstructions || undefined,
        accent: agent.accent,
        avatar: agent.avatar,
      });
    }
  }
  // For authenticated audits, store credentials ENCRYPTED (AES-GCM) — used only
  // at run time, never in clear, cleared after the run.
  let credEnc: string | null = null;
  if (type === "authenticated" && hasCreds) {
    const { encryptJson } = await import("@/lib/security/crypto");
    credEnc = encryptJson({ email: config.login, password: config.password });
  }
  return prisma.audit.create({
    data: {
      userId,
      targetUrl: config.targetUrl,
      type,
      persona: extra?.persona || null,
      mode: config.mode,
      agentsCount: config.agentsCount,
      durationMin: config.durationMinutes,
      instructions: config.instructions || null,
      whitelistNotes: config.whitelistNotes || null,
      hasCredentials: !!(config.login || config.password || config.apiKey),
      credEnc,
      agentConfig,
      status: "pending",
    },
  });
}

export async function setAuditStatus(id: string, status: AuditStatus, errorMessage?: string) {
  return prisma.audit.update({
    where: { id },
    data: {
      status,
      errorMessage: errorMessage ?? null,
      ...(status === "running" ? { startedAt: new Date() } : {}),
      ...(status === "completed" || status === "failed" ? { completedAt: new Date() } : {}),
    },
  });
}

export async function persistReport(auditId: string, report: AuditReport) {
  await prisma.$transaction([
    prisma.auditFinding.deleteMany({ where: { auditId } }),
    prisma.auditScreenshot.deleteMany({ where: { auditId } }),
    prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "completed",
        engine: report.engine,
        scores: JSON.stringify(report.scores),
        pagesVisited: JSON.stringify(report.pagesVisited),
        timeline: JSON.stringify(report.timeline),
        uxSuggestions: JSON.stringify(report.uxSuggestions),
        summary: report.summary,
        reportMarkdown: report.reportMarkdown,
        fixPrompt: report.fixPrompt,
        siteModel: report.siteModel ? JSON.stringify(report.siteModel) : null,
        workflowData: report.workflow ? JSON.stringify(report.workflow) : null,
        completedAt: new Date(),
      },
    }),
    prisma.auditFinding.createMany({
      data: report.findings.map((f) => ({
        auditId,
        title: f.title,
        severity: f.severity,
        category: f.category,
        description: f.description,
        evidence: f.evidence,
        reproductionSteps: JSON.stringify(f.reproductionSteps),
        probableCause: f.probableCause,
        recommendedFix: f.recommendedFix,
        fixPromptBlock: f.fixPromptBlock,
        agent: f.agent,
      })),
    }),
    prisma.auditScreenshot.createMany({
      data: report.screenshots.map((s) => ({
        auditId,
        label: s.label,
        page: s.page,
        src: s.src,
        caption: s.caption || null,
      })),
    }),
  ]);
}

export async function persistJourney(
  auditId: string,
  journey: import("@/lib/journey/types").JourneyResult
) {
  const scores = {
    overall: journey.experienceScore,
    functional: journey.experienceScore,
    ui: journey.experienceScore,
    ux: journey.experienceScore,
    security: journey.experienceScore,
    performance: journey.experienceScore,
  };
  await prisma.$transaction([
    prisma.auditScreenshot.deleteMany({ where: { auditId } }),
    prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "completed",
        engine: "playwright",
        scores: JSON.stringify(scores),
        summary: journey.narrative,
        journeyData: JSON.stringify(journey),
        completedAt: new Date(),
      },
    }),
    prisma.auditScreenshot.createMany({
      data: journey.steps
        .filter((s) => s.screenshot)
        .map((s) => ({
          auditId,
          label: `${s.index}. ${s.title}`,
          page: s.url,
          src: s.screenshot!,
          caption: `${s.status} · ${s.rating}/5`,
        })),
    }),
  ]);
}

export async function listAudits(userId: string) {
  return prisma.audit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { findings: true } } },
  });
}

export async function getAuditWithRelations(id: string, userId: string) {
  return prisma.audit.findFirst({
    where: { id, userId },
    include: {
      findings: true,
      screenshots: true,
    },
  });
}

// ---- JSON field parsers (SQLite stores JSON as strings) ----

export function parseScores(s?: string | null): AuditScores | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as AuditScores;
  } catch {
    return null;
  }
}

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function findingFromRow(row: {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string;
  reproductionSteps: string;
  probableCause: string;
  recommendedFix: string;
  fixPromptBlock: string;
  agent: string;
}): Finding {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity as Finding["severity"],
    category: row.category as Finding["category"],
    description: row.description,
    evidence: row.evidence,
    reproductionSteps: parseJson<string[]>(row.reproductionSteps, []),
    probableCause: row.probableCause,
    recommendedFix: row.recommendedFix,
    fixPromptBlock: row.fixPromptBlock,
    agent: row.agent,
  };
}
