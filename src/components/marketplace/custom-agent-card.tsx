"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCheck } from "@/lib/agents/catalog";

export function CustomAgentCard({
  slug,
  name,
  specialty,
  description,
  avatar,
  accent,
  checks,
}: {
  slug: string;
  name: string;
  specialty: string;
  description: string | null;
  avatar: string;
  accent: string;
  checks: string[];
}) {
  const router = useRouter();
  const activeCount = checks.filter((c) => getCheck(c)?.type === "active").length;

  async function remove() {
    if (!confirm(`Supprimer l'agent « ${name} » ?`)) return;
    await fetch(`/api/agents/${slug}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="glass flex h-full flex-col rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <span
          className="grid size-12 place-items-center rounded-xl border text-2xl"
          style={{ borderColor: `${accent}55`, background: `${accent}11` }}
        >
          {avatar}
        </span>
        <button onClick={remove} className="text-fg-faint hover:text-critical" title="Supprimer">
          <Trash2 className="size-4" />
        </button>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-fg">{name}</h3>
      <p className="text-xs uppercase tracking-wide" style={{ color: accent }}>
        {specialty}
      </p>
      {description && <p className="mt-2 text-sm text-fg-muted">{description}</p>}
      <p className="mt-3 flex-1 text-xs text-fg-faint">
        {checks.length} check(s){activeCount ? ` · ${activeCount} actif(s)` : ""}
      </p>
      <Link href={`/dashboard/audits/new?agent=${slug}`} className="mt-4">
        <Button className="w-full">
          <Play /> Lancer un audit
        </Button>
      </Link>
    </div>
  );
}
