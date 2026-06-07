"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Dict } from "@/lib/i18n";

interface TeaserFinding { title: string; severity: string; category: string; recommendedFix: string }
interface Teaser {
  ok: boolean;
  engine: string | null;
  simulated: boolean;
  overall: number;
  scores: { functional: number; ui: number; ux: number; security: number; performance: number } | null;
  findings: TeaserFinding[];
  hiddenCount: number;
}

const sevColor: Record<string, string> = {
  critical: "text-critical", high: "text-high", medium: "text-medium", low: "text-low", info: "text-fg-faint",
};

export function TryAudit({ t }: { t: Dict }) {
  const tr = t.hero;
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Teaser | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    let target = url.trim();
    if (!target) return;
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    setLoading(true);
    try {
      const res = await fetch("/api/public/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: target }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || tr.auditFail); return; }
      setResult(d);
    } catch {
      setError(tr.netErr);
    } finally {
      setLoading(false);
    }
  }

  const signupHref = url.trim()
    ? `/signup?next=${encodeURIComponent(`/dashboard/audits/new?url=${encodeURIComponent(url.trim())}`)}`
    : "/signup";

  return (
    <div className="mt-8">
      <form onSubmit={run} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          type="text"
          inputMode="url"
          placeholder={tr.placeholder}
          className="min-w-0 flex-1 rounded-xl border border-border bg-bg-elevated px-4 py-3 font-mono text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-matrix"
        />
        <Button size="lg" type="submit" disabled={loading} className="shrink-0">
          {loading ? <><Loader2 className="animate-spin" /> {tr.auditing}</> : <>{tr.button} <ArrowRight /></>}
        </Button>
      </form>
      <p className="mt-2 text-xs text-fg-faint">{tr.hint}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        {tr.trust.map((item) => (
          <li key={item} className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-matrix" /> {item}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-border-bright bg-bg-elevated/60 p-5 backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-fg-faint">{tr.previewLabel}</span>
              <span className="flex items-baseline gap-1">
                <span className="text-3xl font-bold" style={{ color: scoreColor(result.overall) }}>{result.overall}</span>
                <span className="text-sm text-fg-faint">/100</span>
              </span>
            </div>

            {result.simulated && (
              <p className="mt-2 rounded-lg border border-medium/40 bg-medium/10 px-3 py-1.5 text-xs text-medium">
                {tr.simulated}
              </p>
            )}

            {result.scores && (
              <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                {([["Fonct.", result.scores.functional], ["UI", result.scores.ui], ["UX", result.scores.ux], ["Sécu.", result.scores.security], ["Perf", result.scores.performance]] as const).map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-border bg-bg/40 py-2">
                    <div className="text-sm font-semibold" style={{ color: scoreColor(v) }}>{v}</div>
                    <div className="text-[10px] text-fg-faint">{l}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-2">
              {result.findings.map((f, i) => (
                <div key={i} className="rounded-lg border border-border bg-bg/40 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`text-xs font-bold uppercase ${sevColor[f.severity] || "text-fg-faint"}`}>{f.severity}</span>
                    <span className="font-medium text-fg">{f.title}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">{f.recommendedFix}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-matrix-dim/40 bg-matrix/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-fg-muted">
                {result.hiddenCount > 0
                  ? <><strong className="text-fg">+{result.hiddenCount} {tr.teaserMore}</strong> — {tr.teaserReady}</>
                  : tr.teaserReady}
              </span>
              <Link href={signupHref} className="shrink-0">
                <Button>
                  <ShieldCheck className="size-4" /> {tr.viewFull}
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function scoreColor(v: number): string {
  if (v >= 80) return "var(--color-matrix)";
  if (v >= 60) return "var(--color-medium)";
  return "var(--color-high)";
}
