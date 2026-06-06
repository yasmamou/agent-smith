import { prisma } from "@/lib/db/client";

/**
 * Credit accounting. Works WITHOUT Stripe — credits can be granted manually
 * (scripts/grant-credits.mjs) or on signup. Stripe (when STRIPE_SECRET_KEY is
 * set) simply calls grantCredits() from the webhook. Every movement is recorded
 * in the CreditTxn ledger; User.credits is the running balance.
 */

/** Credit cost per audit type. Authenticated write-path audits cost the most
 * (real browser + login + form-driving). */
export const AUDIT_COST: Record<string, number> = {
  technical: 1,
  custom: 1,
  persona: 2,
  authenticated: 3,
};

export function costForAudit(type: string | null | undefined): number {
  return AUDIT_COST[type || "technical"] ?? 1;
}

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  return u?.credits ?? 0;
}

export async function hasCredits(userId: string, amount: number): Promise<boolean> {
  return (await getBalance(userId)) >= amount;
}

export async function getLedger(userId: string, limit = 50) {
  return prisma.creditTxn.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Add credits (signup bonus, manual grant, or Stripe purchase). */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  meta?: Record<string, unknown>
): Promise<number> {
  if (amount <= 0) throw new Error("grant amount must be positive");
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });
    await tx.creditTxn.create({
      data: {
        userId,
        delta: amount,
        balance: u.credits,
        reason,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
    return u.credits;
  });
}

/**
 * Spend credits atomically. Throws InsufficientCreditsError if the balance would
 * go negative — the conditional update prevents races/double-spend.
 */
export class InsufficientCreditsError extends Error {
  constructor(public needed: number, public available: number) {
    super(`Crédits insuffisants : ${needed} requis, ${available} disponibles.`);
    this.name = "InsufficientCreditsError";
  }
}

export async function chargeCredits(
  userId: string,
  amount: number,
  reason: string,
  auditId?: string
): Promise<number> {
  if (amount <= 0) return getBalance(userId);
  return prisma.$transaction(async (tx) => {
    // Atomic guarded decrement: only succeeds if balance >= amount.
    const res = await tx.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    });
    if (res.count === 0) {
      const u = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
      throw new InsufficientCreditsError(amount, u?.credits ?? 0);
    }
    const u = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
    const balance = u?.credits ?? 0;
    await tx.creditTxn.create({
      data: { userId, delta: -amount, balance, reason, auditId: auditId ?? null },
    });
    return balance;
  });
}

/** Give back credits (e.g. mock fallback / failed run that was pre-charged). */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  auditId?: string
): Promise<number> {
  if (amount <= 0) return getBalance(userId);
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });
    await tx.creditTxn.create({
      data: { userId, delta: amount, balance: u.credits, reason, auditId: auditId ?? null },
    });
    return u.credits;
  });
}
