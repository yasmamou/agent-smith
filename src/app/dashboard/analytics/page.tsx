"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, Plus, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

interface Site { id: string; domain: string; key: string }
interface Metrics {
  domain: string; visits: number; uniques: number; newVisitors: number; totalVisits: number;
  conversions: { event: string; count: number }[];
  topPages: { label: string; count: number }[];
  topReferrers: { label: string; count: number }[];
  countries: { label: string; count: number }[];
  devices: { label: string; count: number }[];
  series: { day: string; visits: number }[];
}

const BASE = typeof window !== "undefined" ? window.location.origin : "https://agent-smith-iota.vercel.app";

export default function AnalyticsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSites = useCallback(async () => {
    const d = await fetch("/api/analytics/sites").then((r) => r.json()).catch(() => ({ sites: [] }));
    setSites(d.sites || []);
    if (!active && d.sites?.[0]) setActive(d.sites[0].key);
  }, [active]);

  useEffect(() => { loadSites(); }, [loadSites]);

  useEffect(() => {
    if (!active) { setMetrics(null); return; }
    fetch(`/api/analytics?site=${active}&days=7`).then((r) => r.json()).then(setMetrics).catch(() => {});
  }, [active]);

  async function addSite(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    const d = await fetch("/api/analytics/sites", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain }),
    }).then((r) => r.json()).catch(() => null);
    setLoading(false);
    setDomain("");
    if (d?.site) { await loadSites(); setActive(d.site.key); }
  }

  const activeSite = sites.find((s) => s.key === active);
  const snippet = activeSite
    ? `<script defer data-key="${activeSite.key}" src="${BASE}/track.js"></script>`
    : "";

  const maxSeries = Math.max(1, ...(metrics?.series.map((s) => s.visits) ?? [1]));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
        <BarChart3 className="size-6 text-matrix" /> Visibilité (Analytics)
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Colle le snippet sur ton site → vois tes visites, visiteurs uniques, sources et conversions ici. Sans cookie, respectueux de la vie privée.
      </p>

      {/* Site selector + add */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {sites.map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              active === s.key ? "border-matrix bg-matrix/10 text-matrix" : "border-border text-fg-muted hover:text-fg"
            }`}
          >
            <Globe className="size-3.5" /> {s.domain}
          </button>
        ))}
        <form onSubmit={addSite} className="inline-flex items-center gap-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mon-site.com"
            className="w-40 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm text-fg outline-none focus:border-matrix"
          />
          <Button size="sm" type="submit" disabled={loading}><Plus className="size-4" /> Ajouter</Button>
        </form>
      </div>

      {!activeSite && (
        <div className="glass mt-8 rounded-2xl p-10 text-center text-fg-muted">
          Ajoute ton premier site pour commencer à mesurer ta visibilité.
        </div>
      )}

      {activeSite && (
        <>
          {/* Snippet */}
          <div className="glass mt-5 rounded-2xl p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">Snippet (à coller dans le &lt;head&gt;)</span>
              <CopyButton text={snippet} label="Copier" />
            </div>
            <code className="block overflow-auto rounded-lg border border-border bg-bg/60 px-3 py-2 font-mono text-xs text-matrix-bright">{snippet}</code>
            <p className="mt-2 text-xs text-fg-faint">Conversions : appelle <code className="text-fg-muted">window.agentsmith(&apos;signup&apos;)</code> ou <code className="text-fg-muted">(&apos;pay&apos;)</code> aux moments clés.</p>
          </div>

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Visites (7j)" value={metrics?.visits} />
            <Kpi label="Visiteurs uniques" value={metrics?.uniques} />
            <Kpi label="Nouveaux (7j)" value={metrics?.newVisitors} />
            <Kpi label="Visites (total)" value={metrics?.totalVisits} />
          </div>

          {/* Series */}
          <div className="glass mt-4 rounded-2xl p-5">
            <p className="mb-3 text-sm font-semibold text-fg">Visites · 7 derniers jours</p>
            <div className="flex h-32 items-end gap-2">
              {metrics?.series.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-matrix/70" style={{ height: `${Math.max(2, (d.visits / maxSeries) * 100)}%` }} title={`${d.visits}`} />
                  <span className="text-[10px] text-fg-faint">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown lists */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <List title="D'où ils viennent (sources)" rows={metrics?.topReferrers} />
            <List title="Pages les plus vues" rows={metrics?.topPages} />
            <List title="Pays" rows={metrics?.countries} />
            <List title="Appareils" rows={metrics?.devices} />
          </div>

          {/* Conversions */}
          <div className="glass mt-4 rounded-2xl p-5">
            <p className="mb-2 text-sm font-semibold text-fg">Conversions (events)</p>
            {metrics && metrics.conversions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {metrics.conversions.map((c) => (
                  <span key={c.event} className="rounded-lg border border-matrix-dim/50 bg-matrix/5 px-3 py-1 text-sm text-matrix">
                    {c.event}: <b>{c.count}</b>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-fg-faint">Aucune conversion suivie. Appelle <code>window.agentsmith(&apos;signup&apos;)</code> pour en tracker.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value?: number }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-2xl font-bold text-fg">{value ?? "—"}</p>
      <p className="text-xs text-fg-faint">{label}</p>
    </div>
  );
}

function List({ title, rows }: { title: string; rows?: { label: string; count: number }[] }) {
  const max = Math.max(1, ...(rows?.map((r) => r.count) ?? [1]));
  return (
    <div className="glass rounded-2xl p-5">
      <p className="mb-3 text-sm font-semibold text-fg">{title}</p>
      {rows && rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="relative">
              <div className="absolute inset-y-0 left-0 rounded bg-matrix/10" style={{ width: `${(r.count / max) * 100}%` }} />
              <div className="relative flex items-center justify-between px-2 py-1 text-sm">
                <span className="truncate text-fg-muted">{r.label}</span>
                <span className="ml-2 font-mono text-xs text-fg">{r.count}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-fg-faint">Pas encore de données.</p>
      )}
    </div>
  );
}
