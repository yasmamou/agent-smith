"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Finding } from "@/types";
import { SeverityBadge, CategoryBadge } from "@/components/severity-badge";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

export function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass overflow-hidden rounded-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <SeverityBadge severity={finding.severity} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{finding.title}</span>
        <CategoryBadge category={finding.category} className="hidden sm:inline-flex" />
        <ChevronDown className={cn("size-4 shrink-0 text-fg-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border px-4 py-4 text-sm">
          <Field label="Description">{finding.description}</Field>
          <Field label="Evidence">
            <pre className="overflow-auto rounded-lg border border-border bg-bg/60 p-3 font-mono text-xs text-fg-muted">
              {finding.evidence}
            </pre>
          </Field>
          <Field label="Reproduction steps">
            <ol className="list-decimal space-y-1 pl-5 text-fg-muted">
              {finding.reproductionSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Probable cause">{finding.probableCause}</Field>
            <Field label="Recommended fix">{finding.recommendedFix}</Field>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-fg-faint">
                Fix prompt block
              </span>
              <CopyButton text={finding.fixPromptBlock} size="sm" variant="ghost" />
            </div>
            <pre className="overflow-auto rounded-lg border border-matrix-dim/30 bg-matrix/5 p-3 font-mono text-xs text-fg-muted">
              {finding.fixPromptBlock}
            </pre>
          </div>
          <p className="text-xs text-fg-faint">Found by {finding.agent}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-faint">{label}</p>
      <div className="text-fg-muted">{children}</div>
    </div>
  );
}
