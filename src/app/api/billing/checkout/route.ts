import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStripe, getPack, baseUrl, stripeEnabled } from "@/lib/billing/stripe";

/**
 * Start a Stripe Checkout for a credit pack. Returns the hosted checkout URL.
 * If Stripe isn't configured yet, returns 503 — the credit system still works
 * via manual grants, so this never blocks the rest of the app.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!stripeEnabled()) {
    return NextResponse.json(
      { error: "Paiement non configuré (STRIPE_SECRET_KEY manquante). Les crédits restent disponibles via octroi manuel.", code: "billing_disabled" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const pack = getPack(body?.packId);
  if (!pack) return NextResponse.json({ error: "Pack inconnu" }, { status: 400 });

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe indisponible", code: "billing_disabled" }, { status: 503 });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: pack.amount,
          product_data: { name: `Agent Smith — ${pack.label}` },
        },
      },
    ],
    // Identify the buyer + what to grant in the webhook.
    client_reference_id: session.userId,
    metadata: { userId: session.userId, packId: pack.id, credits: String(pack.credits) },
    success_url: `${baseUrl()}/dashboard/billing?paid=1`,
    cancel_url: `${baseUrl()}/dashboard/billing?canceled=1`,
  });

  return NextResponse.json({ url: checkout.url });
}
