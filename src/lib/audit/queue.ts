import { prisma } from "@/lib/db/client";
import { executeAudit } from "./run-service";
import { freeSlotCount } from "@/lib/browser/pool";

/**
 * DB-backed audit queue. Async callers create an audit in the `queued` state;
 * it is then run either:
 *   - immediately, in the same request via Next's after() (low latency), or
 *   - by the cron drainer /api/queue/process (safety net for anything missed).
 *
 * Concurrency is bounded by the browser pool (BROWSER_CONCURRENCY), so the drainer
 * only starts a run when a slot is free and otherwise leaves it for the next tick.
 */

/** Atomically claim the oldest queued audit (flip queued → running). */
export async function claimNextQueued(): Promise<string | null> {
  const next = await prisma.audit.findFirst({
    where: { status: "queued" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!next) return null;
  const res = await prisma.audit.updateMany({
    where: { id: next.id, status: "queued" },
    data: { status: "running", startedAt: new Date() },
  });
  return res.count === 1 ? next.id : null;
}

/** Run a single queued audit by id (used by after() right after enqueue). */
export async function runQueued(id: string): Promise<void> {
  // Claim it if still queued; if another worker already took it, skip.
  const res = await prisma.audit.updateMany({
    where: { id, status: "queued" },
    data: { status: "running", startedAt: new Date() },
  });
  if (res.count !== 1) return;
  await executeAudit(id);
}

/**
 * Drain queued audits while browser slots are free and there's time budget.
 * Returns how many it ran. Safe to call concurrently (claims are atomic).
 */
export async function drainQueue(budgetMs = 270_000): Promise<{ processed: number; remaining: number }> {
  const start = Date.now();
  let processed = 0;
  while (Date.now() - start < budgetMs) {
    if ((await freeSlotCount()) <= 0) break; // a run is in flight elsewhere
    const id = await claimNextQueued();
    if (!id) break; // nothing queued
    await executeAudit(id); // holds a slot for its duration
    processed++;
  }
  const remaining = await prisma.audit.count({ where: { status: "queued" } });
  return { processed, remaining };
}
