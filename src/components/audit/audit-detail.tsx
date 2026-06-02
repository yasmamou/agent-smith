"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Download,
  RotateCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import type { Finding, AuditScores, PageVisit, ScreenshotRef, AuditStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { ScoreRing, ScoreBar } from "@/components/score-ring";
import { FindingCard } from "@/components/audit/finding-card";
import { CopyButton } from "@/components/copy-button";
import { MatrixRain } from "@/components/matrix-rain";
import { SeverityBadge } from "@/components/severity-badge";
import { safeHost, cn } from "@/lib/utils";
import type { JourneyResult } from "@/lib/journey/types";

export interface AuditDetailData {
  id: string;
  targetUrl: string;
  status: AuditStatus;
  mode: string;
  agentsCount: number;
  engine: string | null;
  hasCredentials: boolean;
  summary: string | null;
  scores: AuditScores | null;
  pagesVisited: PageVisit[];
  uxSuggestions: string[];
  fixPrompt: string | null;
  reportMarkdown: string | null;
  findings: Finding[];
  screenshots: ScreenshotRef[];
  createdAt: string;
  completedAt: string | null;
  type?: string;
  persona?: string | null;
  journeyData?: JourneyResult | null;
}

const AGENT_STEPS = [
  "ExplorerAgent — mapping pages, buttons & forms",
  "FunctionalQAAgent — testing flows, console & network",
  "UIAgent — responsive, contrast & consistency",
  "UXAgent — clarity, friction & hierarchy",
  "SecurityLightAgent — headers, cookies & CSP (passive)",
  "PerformanceAgent — load times & network health",
  "PromptFixAgent — compiling the fix prompt",
];

export function AuditDetail({ initial }: { initial: AuditDetailData }) {
  const router = useRouter();
  const params = useSearchParams();
  const [audit, setAudit] = useState(initial);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    setStep(0);
    setError(null);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, AGENT_STEPS.length - 1)), 750);
    try {
      const res = await fetch(`/api/audits/${audit.id}/run`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Audit failed");
      const full = await fetch(`/api/audits/${audit.id}`).then((r) => r.json());
      setStep(AGENT_STEPS.length - 1);
      setTimeout(() => {
        setAudit(full.audit);
        setRunning(false);
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
      setRunning(false);
    } finally {
      clearInterval(timer);
    }
  }, [audit.id]);

  useEffect(() => {
    if (started.current) return;
    const autostart = params.get("autostart") === "1";
    if ((audit.status === "pending" && autostart) || audit.status === "running") {
      started.current = true;
      run();
    }
  }, [audit.status, params, run]);

  async function remove() {
    if (!confirm("Delete this audit?")) return;
    await fetch(`/api/audits/${audit.id}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  if (running) return <RunningView host={safeHost(audit.targetUrl)} step={step} />;

  if (audit.status !== "completed" || !audit.scores) {
    return (
      <PendingView
        host={safeHost(audit.targetUrl)}
        status={audit.status}
        error={error}
        onRun={run}
      />
    );
  }

  if (audit.type === "persona" && audit.journeyData) {
    return <JourneyView audit={audit} journey={audit.journeyData} onRerun={run} onDelete={remove} />;
  }

  return (
    <ReportView audit={audit} onRerun={run} onDelete={remove} />
  );
}

/* ------------------- Persona journey view ------------------- */
function Stars({ r }: { r: number }) {
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  return (
    <span className="text-medium">
      {"★".repeat(full)}
      {half ? "½" : ""}
      <span className="text-fg-faint">{"☆".repeat(Math.max(0, 5 - full - (half ? 1 : 0)))}</span>
    </span>
  );
}

const JSTATUS: Record<string, string> = {
  success: "text-matrix",
  partial: "text-medium",
  gated: "text-high",
  blocked: "text-critical",
};

function JourneyView({
  audit,
  journey,
  onRerun,
  onDelete,
}: {
  audit: AuditDetailData;
  journey: JourneyResult;
  onRerun: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <a href={audit.targetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-mono text-lg text-fg hover:text-matrix">
            {safeHost(audit.targetUrl)} <ExternalLink className="size-4" />
          </a>
          <p className="mt-1 text-sm text-fg-muted">
            Parcours persona · {journey.personaAvatar} {journey.personaName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onRerun} title="Re-run"><RotateCw /></Button>
          <Button variant="ghost" onClick={onDelete} title="Delete"><Trash2 /></Button>
        </div>
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="glass-bright flex items-center gap-6 rounded-2xl p-6">
          <ScoreRing score={journey.experienceScore} label="Expérience" />
          <div className="text-center">
            <div className="text-2xl"><Stars r={journey.avgRating} /></div>
            <p className="mt-1 text-xs text-fg-faint">{journey.avgRating}/5 moyen</p>
            {journey.gated && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-high/40 bg-high/10 px-2 py-0.5 text-xs text-high">
                <ShieldAlert className="size-3.5" /> Features derrière compte
              </p>
            )}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-faint">Ressenti de l&apos;agent</h2>
          <p className="text-sm leading-relaxed text-fg-muted">{journey.narrative}</p>
          {journey.gatedNote && <p className="mt-3 rounded-lg border border-high/30 bg-high/5 px-3 py-2 text-xs text-fg-muted">{journey.gatedNote}</p>}
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-fg">Étapes du parcours</h2>
      <div className="space-y-4">
        {journey.steps.map((s) => (
          <div key={s.index} className="glass overflow-hidden rounded-xl sm:flex">
            {s.screenshot && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.screenshot} alt={s.title} className="w-full border-b border-border sm:w-72 sm:border-b-0 sm:border-r" />
            )}
            <div className="flex-1 p-4">
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-fg-faint">Étape {s.index}</span>
                <span className={cn("font-semibold uppercase", JSTATUS[s.status])}>{s.status}</span>
                <Stars r={s.rating} />
                <span className="text-fg-faint">{(s.loadMs / 1000).toFixed(1)}s</span>
              </div>
              <p className="font-semibold text-fg">{s.title}</p>
              <p className="text-xs text-fg-faint">{s.action}</p>
              <ul className="mt-2 space-y-1">
                {s.observations.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-fg-muted">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-matrix" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-fg-faint">
        <ShieldAlert className="size-3.5" />
        Parcours non-destructif. Tester uniquement des sites autorisés.
      </p>
    </motion.div>
  );
}

/* ------------------- Running (simulated progress) ------------------- */
function RunningView({ host, step }: { host: string; step: number }) {
  return (
    <div className="relative grid min-h-[60vh] place-items-center overflow-hidden rounded-2xl glass-bright p-8">
      <MatrixRain className="pointer-events-none absolute inset-0 h-full w-full" opacity={0.14} />
      <div className="relative w-full max-w-lg">
        <div className="mb-6 text-center">
          <span className="pulse-ring inline-grid size-14 place-items-center rounded-full border border-matrix bg-matrix/10 text-matrix">
            <Loader2 className="size-6 animate-spin" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-fg">Agents auditing {host}</h2>
          <p className="mt-1 text-sm text-fg-muted">Exploring, testing and compiling findings…</p>
        </div>
        <div className="space-y-2.5">
          {AGENT_STEPS.map((label, i) => {
            const state = i < step ? "done" : i === step ? "active" : "idle";
            return (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 font-mono text-[13px] transition-all",
                  state === "done" && "border-border bg-bg/40 text-fg-muted",
                  state === "active" && "border-matrix-dim bg-matrix/5 text-matrix",
                  state === "idle" && "border-border bg-bg/20 text-fg-faint opacity-50"
                )}
              >
                {state === "done" ? (
                  <CheckCircle2 className="size-4 text-matrix" />
                ) : state === "active" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="size-4 rounded-full border border-border" />
                )}
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------- Pending / failed ------------------- */
function PendingView({
  host,
  status,
  error,
  onRun,
}: {
  host: string;
  status: AuditStatus;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <div className="glass grid min-h-[50vh] place-items-center rounded-2xl p-8 text-center">
      <div>
        <h2 className="text-xl font-bold text-fg">
          {status === "failed" ? "Audit failed" : "Audit ready to run"}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
          {status === "failed"
            ? error || "Something went wrong while running this audit."
            : `Launch the agent swarm against ${host}.`}
        </p>
        {error && status !== "failed" && (
          <p className="mt-3 text-sm text-critical">{error}</p>
        )}
        <Button className="mt-6" onClick={onRun}>
          <RotateCw /> {status === "failed" ? "Retry audit" : "Run audit"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------- Report ------------------- */
const TABS = ["Findings", "Screenshots", "UX", "Pages", "Report"] as const;
type Tab = (typeof TABS)[number];

function ReportView({
  audit,
  onRerun,
  onDelete,
}: {
  audit: AuditDetailData;
  onRerun: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Findings");
  const scores = audit.scores!;
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 } as const;
  const findings = [...audit.findings].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <a
            href={audit.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono text-lg text-fg hover:text-matrix"
          >
            {safeHost(audit.targetUrl)}
            <ExternalLink className="size-4" />
          </a>
          <p className="mt-1 text-sm text-fg-muted capitalize">
            {audit.mode} scan · {audit.agentsCount} agents · {audit.engine} engine
            {audit.hasCredentials && " · authenticated"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {audit.fixPrompt && (
            <CopyButton text={audit.fixPrompt} label="Copy fix prompt" copiedLabel="Copied!" variant="primary" size="md" />
          )}
          <a href={`/api/audits/${audit.id}/export`}>
            <Button variant="secondary">
              <Download /> Export
            </Button>
          </a>
          <Button variant="ghost" onClick={onRerun} title="Re-run">
            <RotateCw />
          </Button>
          <Button variant="ghost" onClick={onDelete} title="Delete">
            <Trash2 />
          </Button>
        </div>
      </div>

      {/* Scores + summary */}
      <div className="mb-6 grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="glass-bright flex items-center gap-6 rounded-2xl p-6">
          <ScoreRing score={scores.overall} />
          <div className="w-44 space-y-2.5">
            <ScoreBar label="Functional" score={scores.functional} />
            <ScoreBar label="UI" score={scores.ui} />
            <ScoreBar label="UX" score={scores.ux} />
            <ScoreBar label="Security" score={scores.security} />
            <ScoreBar label="Performance" score={scores.performance} />
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-faint">
            Executive summary
          </h2>
          <p className="text-sm leading-relaxed text-fg-muted">{audit.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["critical", "high", "medium", "low"] as const).map((s) =>
              counts[s] ? (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <SeverityBadge severity={s} />
                  <span className="text-sm text-fg-muted">{counts[s]}</span>
                </span>
              ) : null
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t ? "text-fg" : "text-fg-muted hover:text-fg"
            )}
          >
            {t}
            {t === "Findings" && (
              <span className="ml-1.5 rounded-full bg-surface px-1.5 text-xs text-fg-faint">
                {findings.length}
              </span>
            )}
            {tab === t && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-matrix"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Findings" && (
        <div className="space-y-2.5">
          {findings.length === 0 && (
            <p className="text-sm text-fg-muted">No issues found — clean run. 🎉</p>
          )}
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      )}

      {tab === "Screenshots" && (
        <div className="grid gap-5 sm:grid-cols-2">
          {audit.screenshots.map((s) => (
            <figure key={s.id} className="glass overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.label} className="w-full border-b border-border" />
              <figcaption className="px-4 py-3 text-xs">
                <span className="text-fg">{s.label}</span>
                {s.caption && <span className="ml-2 text-high">{s.caption}</span>}
                <span className="mt-0.5 block truncate font-mono text-fg-faint">{s.page}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {tab === "UX" && (
        <div className="glass rounded-2xl p-6">
          <h3 className="mb-3 font-semibold text-fg">UX suggestions</h3>
          <ul className="space-y-2.5">
            {audit.uxSuggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-fg-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-matrix" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "Pages" && (
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-faint">
                <th className="px-4 py-3 font-medium">Page</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Load</th>
                <th className="px-4 py-3 text-center font-medium">Console</th>
                <th className="px-4 py-3 text-center font-medium">Network</th>
              </tr>
            </thead>
            <tbody>
              {audit.pagesVisited.map((p, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-fg">{p.url}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={p.statusCode >= 400 ? "text-critical" : "text-matrix"}>
                      {p.statusCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-fg-muted">{(p.loadMs / 1000).toFixed(1)}s</td>
                  <td className="px-4 py-3 text-center text-fg-muted">{p.consoleErrors}</td>
                  <td className="px-4 py-3 text-center text-fg-muted">{p.networkErrors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Report" && (
        <div className="glass rounded-2xl p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-fg">Full report (Markdown)</h3>
            <div className="flex gap-2">
              {audit.reportMarkdown && <CopyButton text={audit.reportMarkdown} label="Copy" />}
              <a href={`/api/audits/${audit.id}/export`}>
                <Button variant="secondary" size="sm">
                  <Download /> Download .md
                </Button>
              </a>
            </div>
          </div>
          <pre className="max-h-[600px] overflow-auto rounded-lg border border-border bg-bg/60 p-4 font-mono text-xs leading-relaxed text-fg-muted">
            {audit.reportMarkdown}
          </pre>
        </div>
      )}

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-fg-faint">
        <ShieldAlert className="size-3.5" />
        Passive audit only. Always ensure you are authorized to test the target.
      </p>
    </motion.div>
  );
}
