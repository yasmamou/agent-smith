import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getBalance, getLedger, AUDIT_COST } from "@/lib/billing/credits";
import { CREDIT_PACKS, stripeEnabled } from "@/lib/billing/stripe";

/** Account billing snapshot: balance, recent ledger, packs, per-type cost. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [balance, ledger] = await Promise.all([
    getBalance(session.userId),
    getLedger(session.userId, 30),
  ]);

  return NextResponse.json({
    balance,
    ledger,
    packs: CREDIT_PACKS,
    cost: AUDIT_COST,
    stripeEnabled: stripeEnabled(),
  });
}
