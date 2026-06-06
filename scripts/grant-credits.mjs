#!/usr/bin/env node
/**
 * Manually grant audit credits to a user (no Stripe needed).
 *
 *   node scripts/grant-credits.mjs <email> <amount> [reason]
 *
 * Example:
 *   node scripts/grant-credits.mjs yasmamou@hotmail.fr 100 "manual top-up"
 */
import { PrismaClient } from "@prisma/client";

const [, , email, amountArg, reason = "grant"] = process.argv;
const amount = parseInt(amountArg, 10);

if (!email || !Number.isFinite(amount) || amount <= 0) {
  console.error("Usage: node scripts/grant-credits.mjs <email> <amount> [reason]");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, credits: true } });
  if (!user) {
    console.error(`No user with email ${email}`);
    process.exit(1);
  }
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: user.id },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });
    await tx.creditTxn.create({
      data: { userId: user.id, delta: amount, balance: u.credits, reason },
    });
    return u.credits;
  });
  console.log(`✅ Granted ${amount} credits to ${email}. New balance: ${updated}`);
} finally {
  await prisma.$disconnect();
}
