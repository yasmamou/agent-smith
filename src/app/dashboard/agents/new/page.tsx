"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ShieldAlert, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SPECIALTIES, CHECKS, defaultChecksFor } from "@/lib/agents/catalog";
import type { Category } from "@/types";

const CATS: { key: Category; label: string }[] = [
  { key: "functional", label: "Fonctionnel" },
  { key: "ui", label: "UI" },
  { key: "ux", label: "UX" },
  { key: "security", label: "Sécurité" },
  { key: "performance", label: "Performance" },
];

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState(SPECIALTIES[0].key);
  const [checks, setChecks] = useState<string[]>(defaultChecksFor(SPECIALTIES[0].key));
  const [aiInstructions, setAiInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickSpecialty(key: string) {
    setSpecialty(key);
    setChecks(defaultChecksFor(key)); // pre-fill base checks
  }
  function toggle(id: string) {
    setChecks((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function save() {
    setError(null);
    if (name.trim().length < 2) return setError("Donne un nom à ton agent.");
    if (checks.length === 0) return setError("Sélectionne au moins un check.");
    setLoading(true);
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, specialty, checks, aiInstructions: aiInstructions || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error || "Création impossible.");
    router.push("/marketplace");
    router.refresh();
  }

  const activeSelected = checks.filter((id) => CHECKS.find((c) => c.id === id)?.type === "active");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-fg">
        <Sparkles className="size-6 text-matrix" /> Créer un agent
      </h1>
      <p className="mt-1 text-sm text-fg-muted">
        Choisis une spécialité (les checks de base se chargent), ajuste, ajoute des instructions IA, et sauvegarde.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <Label htmlFor="name">Nom de l&apos;agent</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent Medi" />
        </div>

        <div>
          <Label>Spécialité</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {SPECIALTIES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => pickSpecialty(s.key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  specialty === s.key ? "border-matrix bg-matrix/5" : "border-border bg-bg-elevated hover:border-border-bright"
                )}
              >
                <span className="text-xl">{s.avatar}</span>
                <p className="mt-1 text-sm font-semibold text-fg">{s.label}</p>
                <p className="text-xs text-fg-faint">{s.blurb}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Checks ({checks.length} sélectionnés)</Label>
          <div className="space-y-4">
            {CATS.map((cat) => {
              const list = CHECKS.filter((c) => c.category === cat.key);
              if (!list.length) return null;
              return (
                <div key={cat.key}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-faint">{cat.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.map((c) => {
                      const on = checks.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggle(c.id)}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                            on ? "border-matrix-dim bg-matrix/5" : "border-border bg-bg-elevated hover:border-border-bright"
                          )}
                        >
                          <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded border", on ? "border-matrix bg-matrix text-black" : "border-border-bright")}>
                            {on && <Check className="size-3" />}
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                              {c.label}
                              {c.type === "active" && (
                                <span className="rounded bg-high/15 px-1 text-[10px] font-semibold text-high">ACTIF</span>
                              )}
                            </span>
                            <span className="block text-xs text-fg-faint">{c.description}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {activeSelected.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-high/40 bg-high/10 p-3 text-sm text-fg-muted">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-high" />
            <span>
              {activeSelected.length} check(s) <strong className="text-high">actif(s)</strong> sélectionné(s) (sondes
              SQL/XSS). Non destructifs, mais à <strong>lancer uniquement sur des sites que tu es autorisé à tester</strong>.
            </span>
          </div>
        )}

        <div>
          <Label htmlFor="ai">Instructions IA (optionnel)</Label>
          <Textarea
            id="ai"
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            placeholder="Ex. Concentre-toi sur les fuites de données et les en-têtes ; ton direct, priorité aux risques exploitables."
          />
        </div>

        {error && <p className="rounded-lg border border-critical/40 bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

        <Button size="lg" className="w-full" onClick={save} disabled={loading}>
          {loading ? "Création…" : "Créer l'agent"}
        </Button>
      </div>
    </div>
  );
}
