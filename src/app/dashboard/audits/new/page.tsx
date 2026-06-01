"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Gauge, Radar, ShieldAlert, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AuditMode } from "@/types";

const MODES: { key: AuditMode; label: string; desc: string; icon: typeof Zap }[] = [
  { key: "quick", label: "Quick Scan", desc: "~3 pages, fastest signal", icon: Zap },
  { key: "standard", label: "Standard", desc: "~5 pages, balanced", icon: Gauge },
  { key: "deep", label: "Deep Scan", desc: "up to 8 pages, thorough", icon: Radar },
];

export default function NewAuditPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuditMode>("standard");
  const [agentsCount, setAgentsCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [authorized, setAuthorized] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!authorized) {
      setError("Please confirm you are authorized to test this site.");
      return;
    }
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const payload = {
      targetUrl: String(form.get("targetUrl") || "").trim(),
      mode,
      agentsCount,
      durationMinutes,
      instructions: String(form.get("instructions") || "") || undefined,
      whitelistNotes: String(form.get("whitelistNotes") || "") || undefined,
      login: String(form.get("login") || "") || undefined,
      password: String(form.get("password") || "") || undefined,
      apiKey: String(form.get("apiKey") || "") || undefined,
      authorized: true as const,
    };

    const res = await fetch("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create the audit.");
      return;
    }
    router.push(`/dashboard/audits/${data.id}?autostart=1`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-fg">New audit</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Point Agent Smith at a deployed app you own or are authorized to test.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-7">
        {/* URL */}
        <div>
          <Label htmlFor="targetUrl">Target URL</Label>
          <Input
            id="targetUrl"
            name="targetUrl"
            type="url"
            required
            placeholder="https://my-app.vercel.app"
            className="font-mono"
          />
        </div>

        {/* Mode */}
        <div>
          <Label>Test mode</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  mode === m.key
                    ? "border-matrix bg-matrix/5 shadow-[0_0_24px_-10px_var(--color-matrix)]"
                    : "border-border bg-bg-elevated hover:border-border-bright"
                )}
              >
                <m.icon className={cn("mb-2 size-5", mode === m.key ? "text-matrix" : "text-fg-muted")} />
                <p className="text-sm font-semibold text-fg">{m.label}</p>
                <p className="mt-0.5 text-xs text-fg-faint">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Agents + duration */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label>Simulated agents</Label>
            <div className="flex gap-2">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAgentsCount(n)}
                  className={cn(
                    "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                    agentsCount === n
                      ? "border-matrix bg-matrix/5 text-matrix"
                      : "border-border bg-bg-elevated text-fg-muted hover:border-border-bright"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Target duration</Label>
            <div className="flex gap-2">
              {[5, 15, 30].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setDurationMinutes(n)}
                  className={cn(
                    "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                    durationMinutes === n
                      ? "border-matrix bg-matrix/5 text-matrix"
                      : "border-border bg-bg-elevated text-fg-muted hover:border-border-bright"
                  )}
                >
                  {n}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div>
          <Label htmlFor="instructions">Special instructions (optional)</Label>
          <Textarea
            id="instructions"
            name="instructions"
            placeholder="e.g. focus on the signup → checkout funnel; the dashboard needs login."
          />
        </div>

        {/* Advanced */}
        <div className="rounded-xl border border-border bg-bg-elevated/40">
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm text-fg-muted hover:text-fg"
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="size-4" /> Credentials &amp; access (optional)
            </span>
            <ChevronRight className={cn("size-4 transition-transform", showAdvanced && "rotate-90")} />
          </button>
          {showAdvanced && (
            <div className="space-y-4 border-t border-border px-4 py-4">
              <p className="rounded-lg border border-matrix-dim/30 bg-matrix/5 px-3 py-2 text-xs text-fg-muted">
                Credentials are used only for this run and are <strong>never stored in clear</strong> or
                logged. Only a &quot;has credentials&quot; flag is saved.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="login">Login / email</Label>
                  <Input id="login" name="login" autoComplete="off" placeholder="qa@my-app.com" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" autoComplete="off" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <Label htmlFor="apiKey">API key (optional)</Label>
                <Input id="apiKey" name="apiKey" autoComplete="off" placeholder="sk_…" />
              </div>
              <div>
                <Label htmlFor="whitelistNotes">Whitelist / IP notes</Label>
                <Textarea
                  id="whitelistNotes"
                  name="whitelistNotes"
                  placeholder="e.g. allowlist the audit runner IP; bypass WAF for /api/*"
                />
              </div>
            </div>
          )}
        </div>

        {/* Authorization */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-elevated/40 p-4">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => setAuthorized(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--color-matrix)]"
          />
          <span className="text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-fg">
              <ShieldAlert className="size-4 text-medium" /> I&apos;m authorized to test this site.
            </span>
            <br />
            Agent Smith performs passive, non-destructive checks only — no brute force, injection or
            exploitation.
          </span>
        </label>

        {error && (
          <p className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Launch audit"}
        </Button>
      </form>
    </div>
  );
}
