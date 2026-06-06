"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

interface ShareData { url: string; badgeUrl: string; markdown: string; html: string }

export function ShareButton({ auditId }: { auditId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShareData | null>(null);

  async function enable() {
    setLoading(true);
    try {
      const res = await fetch(`/api/audits/${auditId}/share`, { method: "POST" });
      const d = await res.json();
      if (res.ok) { setData(d); setOpen(true); }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => (data ? setOpen((o) => !o) : enable())} disabled={loading} title="Partager / badge">
        <Share2 /> {loading ? "…" : "Partager"}
      </Button>

      {open && data && (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] rounded-xl border border-border-bright bg-bg-elevated p-4 shadow-2xl">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Check className="size-4 text-matrix" /> Lien public activé
          </div>
          <p className="mt-1 text-xs text-fg-faint">Lecture seule — scores + findings, sans tes identifiants.</p>

          <label className="mt-3 block text-xs text-fg-muted">Lien</label>
          <div className="flex items-center gap-2">
            <input readOnly value={data.url} className="min-w-0 flex-1 truncate rounded-lg border border-border bg-bg/60 px-2 py-1.5 font-mono text-xs text-fg" />
            <CopyButton text={data.url} label="Copier" />
          </div>

          <label className="mt-3 block text-xs text-fg-muted">Badge (preview)</label>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.badgeUrl} alt="badge" className="mt-1 h-5" />

          <label className="mt-3 block text-xs text-fg-muted">Badge Markdown (README)</label>
          <div className="flex items-center gap-2">
            <input readOnly value={data.markdown} className="min-w-0 flex-1 truncate rounded-lg border border-border bg-bg/60 px-2 py-1.5 font-mono text-xs text-fg" />
            <CopyButton text={data.markdown} label="Copier" />
          </div>
        </div>
      )}
    </div>
  );
}
