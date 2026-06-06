import { prisma } from "@/lib/db/client";

/**
 * Browser concurrency pool — a DB-backed, serverless-safe semaphore.
 *
 * Browserbase's free tier allows ~1 concurrent session, so launching two real
 * browsers at once makes one fail (→ mock fallback). We model the limit as a
 * fixed set of slot rows. Acquiring a slot is a single guarded UPDATE, which is
 * atomic at the DB level, so two concurrent serverless invocations can never
 * claim the same slot. If no slot frees within the wait window, the caller
 * decides what to do (the audit engine falls back to mock; authenticated audits
 * fail loudly rather than fake a result).
 */

function maxSlots(): number {
  const n = parseInt(process.env.BROWSER_CONCURRENCY || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Default lease length — generous so it never expires mid-audit (run cap 300s). */
const LEASE_MS = 330_000;
const POLL_MS = 2500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lazily ensure the N slot rows exist (idempotent). */
async function ensureSlots(n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    const id = `slot-${i}`;
    await prisma.browserSlot.upsert({
      where: { id },
      create: { id },
      update: {}, // never disturb a held slot
    });
  }
}

export interface SlotHandle {
  id: string;
  release: () => Promise<void>;
}

/**
 * Try to claim a free slot once (no waiting). Returns a handle or null.
 * The guarded updateMany only succeeds on a slot that is free or whose lease has
 * expired — atomic, so no double-claim across invocations.
 */
async function tryClaim(holder: string): Promise<SlotHandle | null> {
  const n = maxSlots();
  const now = new Date();
  const until = new Date(now.getTime() + LEASE_MS);
  for (let i = 0; i < n; i++) {
    const id = `slot-${i}`;
    const res = await prisma.browserSlot.updateMany({
      where: { id, OR: [{ heldUntil: null }, { heldUntil: { lt: now } }] },
      data: { holder, heldUntil: until },
    });
    if (res.count === 1) {
      return { id, release: () => releaseSlot(id) };
    }
  }
  return null;
}

export async function releaseSlot(id: string): Promise<void> {
  await prisma.browserSlot
    .updateMany({ where: { id }, data: { holder: null, heldUntil: null } })
    .catch(() => {});
}

/**
 * Acquire a slot, waiting up to `maxWaitMs` (polling). Returns null on timeout.
 */
export async function acquireSlot(
  holder: string,
  maxWaitMs = 150_000
): Promise<SlotHandle | null> {
  await ensureSlots(maxSlots());
  const deadline = Date.now() + maxWaitMs;
  // first attempt immediately, then poll
  for (;;) {
    const h = await tryClaim(holder);
    if (h) return h;
    if (Date.now() >= deadline) return null;
    await sleep(POLL_MS);
  }
}

/** How many slots are currently free (best-effort snapshot, for the queue drainer). */
export async function freeSlotCount(): Promise<number> {
  await ensureSlots(maxSlots());
  const now = new Date();
  const held = await prisma.browserSlot.count({
    where: { heldUntil: { gte: now } },
  });
  return Math.max(0, maxSlots() - held);
}
