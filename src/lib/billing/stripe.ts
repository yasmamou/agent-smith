/**
 * Stripe billing — OPTIONAL. The whole credit system works without it.
 * As soon as STRIPE_SECRET_KEY (+ STRIPE_WEBHOOK_SECRET) is set in the env,
 * checkout + webhook light up automatically. No code change required.
 *
 * The `stripe` package is imported dynamically so a missing key (or even a
 * missing package) never breaks the build or the rest of the app.
 */

export interface CreditPack {
  id: string;
  credits: number;
  /** price in euro cents */
  amount: number;
  label: string;
}

/** Buyable credit packs. Stripe Checkout is created with inline price_data so no
 * dashboard product setup is needed — only the secret key. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", credits: 20, amount: 900, label: "Starter — 20 crédits" },
  { id: "pro", credits: 100, amount: 3900, label: "Pro — 100 crédits" },
  { id: "team", credits: 500, amount: 14900, label: "Team — 500 crédits" },
];

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function webhookConfigured(): boolean {
  return !!process.env.STRIPE_WEBHOOK_SECRET;
}

/** Lazily build a Stripe client; returns null if not configured/installed. */
export async function getStripe(): Promise<import("stripe").Stripe | null> {
  if (!stripeEnabled()) return null;
  try {
    const mod = await import("stripe");
    const Stripe = (mod.default ?? mod) as unknown as typeof import("stripe").Stripe;
    return new Stripe(process.env.STRIPE_SECRET_KEY!);
  } catch {
    // package not installed — billing stays disabled gracefully
    return null;
  }
}

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://agent-smith-iota.vercel.app";
}
