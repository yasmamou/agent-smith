import { prisma } from "./client";
import type { AuditReport, AuditConfig, AuditStatus, Finding, AuditScores } from "@/types";

/**
 * DB access for audits. Credentials are NEVER persisted in clear — only the
 * boolean `hasCredentials` is stored.
 */

export async function createAudit(userId: string, config: AuditConfig) {
  return prisma.audit.create({
    data: {
      userId,
      targetUrl: config.targetUrl,
      mode: config.mode,
      agentsCount: config.agentsCount,
      durationMin: config.durationMinutes,
      instructions: config.instructions || null,
      whitelistNotes: config.whitelistNotes || null,
      hasCredentials: !!(config.login || config.password || config.apiKey),
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
