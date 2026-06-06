import { NextResponse } from "next/server";
import { getStripe, webhookConfigured } from "@/lib/billing/stripe";
import { grantCredits } from "@/lib/billing/credits";
import { prisma } from "@/lib/db/client";

// Stripe needs the raw body for signature verification.
export const runtime = "nodejs";

/**
 * Stripe webhook → grants credits on a completed checkout. Idempotent: each
 * Stripe event id is recorded in the ledger meta and skipped if seen again.
 */
export async function POST(req: Request) {
  const stripe = await getStripe();
  if (!stripe || !webhookConfigured()) {
    return NextResponse.json({ error: "billing disabled" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    return NextResponse.json(
      { error: `signature: ${e instanceof Error ? e.message : "invalid"}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as import("stripe").Stripe.Checkout.Session;
    const userId = s.metadata?.userId || s.client_reference_id || "";
    const credits = parseInt(s.metadata?.credits || "0", 10);

    if (userId && credits > 0) {
      // Idempotency: skip if this checkout session was already granted.
      const seen = await prisma.creditTxn.findFirst({
        where: { userId, reason: "purchase", meta: { contains: s.id } },
        select: { id: true },
      });
      if (!seen) {
        await grantCredits(userId, credits, "purchase", {
          stripeSession: s.id,
          packId: s.metadata?.packId,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
