"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, GitFork } from "lucide-react";
import type { AgentProfile } from "@/types";
import { Button } from "@/components/ui/button";

export function MarketAgentCard({ agent }: { agent: AgentProfile }) {
  const router = useRouter();
  const [forking, setForking] = useState(false);

  async function fork() {
    setForking(true);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${agent.name} (copie)`,
        specialty: agent.focus[0] || "functional",
        description: agent.tagline,
        checks: agent.checks ?? [],
        aiInstructions: agent.aiInstructions,
        avatar: agent.avatar,
      }),
    });
    setForking(false);
    if (res.status === 401) { router.push("/login?next=/marketplace"); return; }
    if (res.ok) router.push("/marketplace");
    router.refresh();
  }
  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6 transition-colors hover:border-border-bright">
      <div className="flex items-start justify-between">
        <span
          className="grid size-12 place-items-center rounded-xl border text-2xl"
          style={{ borderColor: `${agent.accent}55`, background: `${agent.accent}11` }}
        >
          {agent.avatar}
        </span>
        {agent.premium ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ color: agent.accent, borderColor: `${agent.accent}55` }}
          >
            Premium
          </span>
        ) : (
          <span className="rounded-full border border-matrix-dim/50 bg-matrix/5 px-2 py-0.5 text-[11px] font-medium text-matrix">
            Core
          </span>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-fg">{agent.name}</h3>
      <p className="text-sm text-matrix-dim">{agent.tagline}</p>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fg-faint">{agent.specialty}</p>
      <p className="mt-1.5 flex-1 text-sm text-fg-muted">{agent.testingStyle}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {agent.focus.map((f) => (
          <span
            key={f}
            className="rounded-md border border-border-bright bg-bg-elevated px-2 py-0.5 text-[11px] capitalize text-fg-muted"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-1.5 text-sm">
          <Star className="size-4 fill-medium text-medium" />
          <span className="font-medium text-fg">{agent.rating.toFixed(1)}</span>
          <span className="text-fg-faint">({agent.reviews})</span>
        </div>
        <div className="text-right">
          <span className="text-sm font-semibold text-fg">{agent.price}</span>
          <span className="ml-1 text-xs text-fg-faint">{agent.priceNote}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href={`/dashboard/audits/new?preset=${agent.slug}`} className="flex-1">
          <Button variant={agent.premium ? "outline" : "primary"} className="w-full">
            Lancer un audit
          </Button>
        </Link>
        <Button variant="ghost" onClick={fork} disabled={forking} title="Forker en agent perso éditable">
          <GitFork /> {forking ? "…" : "Forker"}
        </Button>
      </div>
    </div>
  );
}
