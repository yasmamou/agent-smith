"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Zap, Gauge, Radar, ShieldAlert, ChevronRight, Lock, ScanSearch, Footprints, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PERSONAS } from "@/lib/journey/personas";
import { getAgentProfile } from "@/lib/agents/profiles";
import type { AuditMode } from "@/types";

const MODES: { key: AuditMode; label: string; desc: string; icon: typeof Zap }[] = [
  { key: "quick", label: "Quick Scan", desc: "~3 pages, fastest signal", icon: Zap },
  { key: "standard", label: "Standard", desc: "~5 pages, balanced", icon: Gauge },
  { key: "deep", label: "Deep Scan", desc: "up to 8 pages, thorough", icon: Radar },
];

const TYPES = [
  { key: "technical", label: "Audit technique", desc: "7 agents QA : fonctionnel, UI, UX, sécurité, perf", icon: ScanSearch },
  { key: "persona", label: "Parcours utilisateur", desc: "Un agent-persona suit le funnel et note l'expérience", icon: Footprints },
  { key: "authenticated", label: "Audit authentifié", desc: "L'agent se connecte et teste les features (QCM) — IA", icon: KeyRound },
] as const;

type AuditType = (typeof TYPES)[number]["key"];

export default function NewAuditPage() {
  const router = useRouter();
  const [auditType, setAuditType] = useState<AuditType>("technical");
  const [persona, setPersona] = useState(PERSONAS[0].slug);
  const [mode, setMode] = useState<AuditMode>("standard");
  const [agentsCount, setAgentsCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [authorized, setAuthorized] = useState(false);
  const [authInvalid, setAuthInvalid] = useState(false);
  const authRef = useRef<HTMLLabelElement>(null);
  const [allowWrites, setAllowWrites] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentSlug, setAgentSlug] = useState<string | null>(null);
  const [presetSlug, setPresetSlug] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>("");

  // ?agent=<slug> → custom agent · ?preset=<slug> → official marketplace agent
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const preset = qs.get("preset");
    if (preset) {
      setPresetSlug(preset);
      const p = getAgentProfile(preset);
      if (p) setAgentName(p.name);
      return;
    }
    const slug = qs.get("agent");
    if (!slug) return;
    setAgentSlug(slug);
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => {
        const a = (d.agents || []).find((x: { slug: string }) => x.slug === slug);
        if (a) setAgentName(a.name);
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!authorized) {
      setAuthInvalid(true);
      setError("Coche la case « I'm authorized to test this site » en bas du formulaire pour lancer l'audit.");
      authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const form = new FormData(e.currentTarget);
    if (auditType === "authenticated" && (!String(form.get("login") || "") || !String(form.get("password") || ""))) {
      setShowAdvanced(true);
      setError("Un audit authentifié nécessite un email + mot de passe de test.");
      return;
    }
    setLoading(true);
    const payload = {
      targetUrl: String(form.get("targetUrl") || "").trim(),
      type: agentSlug || presetSlug ? "custom" : auditType,
      customAgentSlug: agentSlug || undefined,
      presetSlug: presetSlug || undefined,
      persona: !agentSlug && !presetSlug && auditType !== "technical" ? persona : undefined,
      allowWrites,
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

        {/* Custom/preset agent banner */}
        {(agentSlug || presetSlug) && (
          <div className="flex items-center justify-between rounded-xl border border-matrix-dim/50 bg-matrix/5 px-4 py-3">
            <span className="text-sm text-fg">
              🤖 Audit avec l&apos;agent <strong className="text-matrix">{agentName || "personnalisé"}</strong>
              {presetSlug && <span className="ml-2 text-xs text-fg-faint">(officiel)</span>}
            </span>
            <button
              type="button"
              onClick={() => { setAgentSlug(null); setPresetSlug(null); setAgentName(""); }}
              className="text-xs text-fg-faint hover:text-fg"
            >
              retirer
            </button>
          </div>
        )}

        {/* Audit type */}
        <div className={cn((agentSlug || presetSlug) && "hidden")}>
          <Label>Type d&apos;audit</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setAuditType(t.key)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  auditType === t.key
                    ? "border-matrix bg-matrix/5 shadow-[0_0_24px_-10px_var(--color-matrix)]"
                    : "border-border bg-bg-elevated hover:border-border-bright"
                )}
              >
                <t.icon className={cn("mb-2 size-5", auditType === t.key ? "text-matrix" : "text-fg-muted")} />
                <p className="text-sm font-semibold text-fg">{t.label}</p>
                <p className="mt-0.5 text-xs text-fg-faint">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Persona picker (persona & authenticated audits) */}
        {auditType !== "technical" && (
          <div>
            <Label>Persona à incarner</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setPersona(p.slug)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    persona === p.slug
                      ? "border-matrix bg-matrix/5"
                      : "border-border bg-bg-elevated hover:border-border-bright"
                  )}
                >
                  <span className="text-xl">{p.avatar}</span>
                  <p className="mt-1 text-sm font-semibold text-fg">{p.name.split(" — ")[0]}</p>
                  <p className="text-xs text-fg-faint">{p.name.split(" — ")[1] || ""}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode */}
        <div className={cn(auditType === "persona" && "opacity-60")}>
          <Label>Test mode {auditType === "persona" && <span className="text-fg-faint">(audit technique)</span>}</Label>
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

        {/* Interactive workflow (write-path) */}
        {auditType !== "persona" && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-elevated/40 p-4">
            <input
              type="checkbox"
              checked={allowWrites}
              onChange={(e) => setAllowWrites(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-matrix)]"
            />
            <span className="text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                <Footprints className="size-4 text-matrix" /> Tester le workflow en mode interactif
              </span>
              <br />
              L&apos;agent IA remplit les formulaires et soumet (données de test) pour exécuter le vrai parcours
              métier — pas seulement naviguer. À réserver à <strong>tes propres sites</strong> (données de test créées).
            </span>
          </label>
        )}

        {/* Advanced */}
        <div className="rounded-xl border border-border bg-bg-elevated/40">
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm text-fg-muted hover:text-fg"
          >
            <span className="inline-flex items-center gap-2">
              <Lock className="size-4" /> Identifiants &amp; accès{" "}
              {auditType === "authenticated" ? (
                <span className="text-high">(requis pour l&apos;audit authentifié)</span>
              ) : (
                "(optionnel)"
              )}
            </span>
            <ChevronRight className={cn("size-4 transition-transform", (showAdvanced || auditType === "authenticated") && "rotate-90")} />
          </button>
          {(showAdvanced || auditType === "authenticated") && (
            <div className="space-y-4 border-t border-border px-4 py-4">
              <p className="rounded-lg border border-matrix-dim/30 bg-matrix/5 px-3 py-2 text-xs text-fg-muted">
                {auditType === "authenticated"
                  ? "Utilise un compte de TEST dédié. Les identifiants sont chiffrés (AES-GCM), utilisés seulement pour ce run, puis effacés."
                  : "Les identifiants ne sont jamais stockés en clair ni loggés. Seul un indicateur « a des identifiants » est conservé."}
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

        {/* Authorization (required gate) */}
        <label
          ref={authRef}
          htmlFor="authorized"
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
            authInvalid
              ? "border-critical bg-critical/10 ring-1 ring-critical/50"
              : "border-border bg-bg-elevated/40"
          )}
        >
          <input
            id="authorized"
            name="authorized"
            type="checkbox"
            required
            aria-label="I'm authorized to test this site"
            checked={authorized}
            onChange={(e) => { setAuthorized(e.target.checked); if (e.target.checked) setAuthInvalid(false); }}
            className="mt-0.5 size-4 accent-[var(--color-matrix)]"
          />
          <span className="text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1.5 font-medium text-fg">
              <ShieldAlert className={cn("size-4", authInvalid ? "text-critical" : "text-medium")} /> I&apos;m authorized to test this site.
              <span className="text-critical">*</span>
            </span>
            <br />
            Agent Smith performs passive, non-destructive checks only — no brute force, injection or
            exploitation.
            {authInvalid && (
              <span className="mt-1 block font-medium text-critical">Requis — coche cette case pour lancer l&apos;audit.</span>
            )}
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
