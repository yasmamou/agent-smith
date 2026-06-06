import { prisma } from "@/lib/db/client";
import { parseScores } from "@/lib/db/audits";

export interface RegressionDiff {
  previousId: string;
  previousAt: string;
  scoreDelta: number; // current.overall - previous.overall
  previousOverall: number;
  currentOverall: number;
  newFindings: { title: string; severity: string }[]; // appeared this run
  fixedFindings: { title: string; severity: string }[]; // gone since last run
  status: "improved" | "regressed" | "stable";
}

const key = (t: string) => t.trim().toLowerCase();

/**
 * Compare a completed audit to the previous completed audit for the SAME user +
 * target URL. Powers the "did this deploy break anything?" digest. Returns null
 * if there's no prior run to compare against.
 */
export async function computeRegression(auditId: string): Promise<RegressionDiff | null> {
  const current = await prisma.audit.findUnique({
    where: { id: auditId },
    include: { findings: { select: { title: true, severity: true } } },
  });
  if (!current || current.status !== "completed") return null;

  const previous = await prisma.audit.findFirst({
    where: {
      userId: current.userId,
      targetUrl: current.targetUrl,
      status: "completed",
      id: { not: current.id },
      createdAt: { lt: current.createdAt },
    },
    orderBy: { createdAt: "desc" },
    include: { findings: { select: { title: true, severity: true } } },
  });
  if (!previous) return null;

  const curOverall = parseScores(current.scores)?.overall ?? 0;
  const prevOverall = parseScores(previous.scores)?.overall ?? 0;

  const curKeys = new Map(current.findings.map((f) => [key(f.title), f]));
  const prevKeys = new Map(previous.findings.map((f) => [key(f.title), f]));

  const newFindings = current.findings.filter((f) => !prevKeys.has(key(f.title))).map((f) => ({ title: f.title, severity: f.severity }));
  const fixedFindings = previous.findings.filter((f) => !curKeys.has(key(f.title))).map((f) => ({ title: f.title, severity: f.severity }));

  const scoreDelta = curOverall - prevOverall;
  const status: RegressionDiff["status"] =
    scoreDelta > 2 || (fixedFindings.length > newFindings.length) ? "improved"
    : scoreDelta < -2 || (newFindings.length > fixedFindings.length) ? "regressed"
    : "stable";

  return {
    previousId: previous.id,
    previousAt: previous.completedAt?.toISOString() ?? previous.createdAt.toISOString(),
    scoreDelta,
    previousOverall: prevOverall,
    currentOverall: curOverall,
    newFindings,
    fixedFindings,
    status,
  };
}
