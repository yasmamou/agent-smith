"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Coins, Zap, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Pack { id: string; credits: number; amount: number; label: string }
interface Txn { id: string; delta: number; balance: number; reason: string; createdAt: string }
interface BillingData {
  balance: number;
  ledger: Txn[];
  packs: Pack[];
  cost: Record<string, number>;
  stripeEnabled: boolean;
}

const COST_LABELS: Record<string, string> = {
  technical: "Audit technique",
  custom: "Agent marketplace",
  persona: "Parcours persona",
  authenticated: "Audit authentifié (write-path)",
};

export default function BillingPage() {
  const params = useSearchParams();
  const [data, setData] = useState<BillingData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/billing").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  async function buy(packId: string) {
    setBusy(packId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const d = await res.json();
      if (res.ok && d.url) { window.location.href = d.url; return; }
      alert(d.error || "Paiement indisponible pour le moment.");
    } finally {
      setBusy(null);
    }
  }

  const paid = params.get("paid") === "1";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
        <Coins className="size-6 text-matrix" /> Crédits &amp; facturation
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Chaque audit consomme des crédits. Les runs simulés ou échoués sont automatiquement remboursés.
      </p>

      {paid && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-matrix-dim/50 bg-matrix/5 px-4 py-3 text-sm text-matrix">
          <Check className="size-4" /> Paiement reçu — tes crédits ont été ajoutés.
        </div>
      )}

      {/* Balance */}
      <div className="glass-bright mt-6 flex items-center justify-between rounded-2xl p-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-fg-faint">Solde</p>
          <p className="mt-1 text-4xl font-bold text-matrix-bright">
            {data ? data.balance : "…"} <span className="text-lg font-normal text-fg-faint">crédits</span>
          </p>
        </div>
        <Zap className="size-10 text-matrix/40" />
      </div>

      {/* Cost table */}
      {data && (
        <div className="glass mt-4 rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-faint">Coût par audit</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data.cost).map(([type, c]) => (
              <div key={type} className="flex items-center justify-between rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm">
                <span className="text-fg-muted">{COST_LABELS[type] || type}</span>
                <span className="font-mono text-matrix">{c} cr.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Packs */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-faint">Recharger</h2>
        {data && !data.stripeEnabled && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-medium/40 bg-medium/5 px-4 py-3 text-sm text-fg-muted">
            <Info className="mt-0.5 size-4 shrink-0 text-medium" />
            <span>
              Le paiement en ligne n&apos;est pas encore activé (clé Stripe manquante). Les packs s&apos;activeront
              automatiquement dès qu&apos;une clé sera configurée. En attendant, les crédits peuvent être octroyés manuellement.
            </span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {data?.packs.map((p) => (
            <div key={p.id} className="glass flex flex-col rounded-2xl p-5">
              <p className="text-3xl font-bold text-fg">{p.credits}</p>
              <p className="text-xs text-fg-faint">crédits</p>
              <p className="mt-3 text-lg font-semibold text-matrix">{(p.amount / 100).toFixed(2)} €</p>
              <Button
                className="mt-4 w-full"
                variant={data.stripeEnabled ? "primary" : "outline"}
                disabled={!data.stripeEnabled || busy === p.id}
                onClick={() => buy(p.id)}
              >
                {busy === p.id ? "…" : data.stripeEnabled ? "Acheter" : "Bientôt"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Ledger */}
      {data && data.ledger.length > 0 && (
        <div className="glass mt-6 rounded-2xl p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-faint">Historique</h2>
          <div className="divide-y divide-border">
            {data.ledger.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="text-fg-muted">{reasonLabel(t.reason)}</span>
                  <span className="ml-2 text-xs text-fg-faint">{new Date(t.createdAt).toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={t.delta >= 0 ? "font-mono text-matrix" : "font-mono text-fg-muted"}>
                    {t.delta >= 0 ? "+" : ""}{t.delta}
                  </span>
                  <span className="w-10 text-right font-mono text-xs text-fg-faint">{t.balance}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function reasonLabel(reason: string): string {
  if (reason === "signup") return "Bonus de bienvenue";
  if (reason === "purchase") return "Achat de crédits";
  if (reason === "grant") return "Octroi";
  if (reason.startsWith("audit:")) return `Audit — ${COST_LABELS[reason.slice(6)] || reason.slice(6)}`;
  if (reason.startsWith("refund:")) return `Remboursement (${reason.slice(7)})`;
  return reason;
}
