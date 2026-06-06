import { prisma } from "@/lib/db/client";

/**
 * Cheap DB-backed rate limit: cap audits per user per rolling minute.
 * Prevents a runaway CI/agent loop from draining Browserbase + LLM budget.
 */
export async function assertWithinRate(userId: string, maxPerMinute = 8): Promise<void> {
  const since = new Date(Date.now() - 60_000);
  const n = await prisma.audit.count({ where: { userId, createdAt: { gte: since } } });
  if (n >= maxPerMinute) {
    throw new Error("Trop d'audits lancés en peu de temps — réessaie dans une minute.");
  }
}
