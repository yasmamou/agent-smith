import Link from "next/link";
import {
  Compass,
  MousePointerClick,
  Eye,
  Palette,
  ShieldCheck,
  Gauge,
  Wand2,
  FileText,
  GitBranch,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Card } from "@/components/ui/card";
import { AGENT_PROFILES } from "@/lib/agents/profiles";
import type { Dict } from "@/lib/i18n";

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-matrix">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-fg-muted">{sub}</p>}
    </div>
  );
}

const STEP_ICONS = [GitBranch, Zap, FileText];

/* ---------------- How it works ---------------- */
export function HowItWorks({ t }: { t: Dict }) {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading eyebrow={t.how.eyebrow} title={t.how.title} sub={t.how.sub} />
      <div className="grid gap-5 md:grid-cols-3">
        {t.how.steps.map((s, i) => {
          const Icon = STEP_ICONS[i] ?? GitBranch;
          return (
            <Reveal key={s.title} delay={i * 0.08}>
              <Card className="h-full">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg border border-matrix-dim/50 bg-matrix/5 text-matrix">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-fg-faint">0{i + 1}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-fg">{s.title}</h3>
                <p className="text-sm text-fg-muted">{s.body}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

const AGENT_ICONS = [Compass, MousePointerClick, Eye, Palette, ShieldCheck, Gauge, Wand2];

/* ---------------- Features (the 7 agents) ---------------- */
export function Features({ t }: { t: Dict }) {
  return (
    <section id="features" className="border-y border-border/60 bg-bg-elevated/30 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading eyebrow={t.features.eyebrow} title={t.features.title} sub={t.features.sub} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.agents.map((a, i) => {
            const Icon = AGENT_ICONS[i] ?? Compass;
            return (
              <Reveal key={a.name} delay={(i % 3) * 0.06}>
                <Card className="h-full transition-colors hover:border-matrix-dim">
                  <Icon className="mb-3 size-6 text-matrix" />
                  <h3 className="mb-1.5 font-mono text-sm font-semibold text-fg">{a.name}</h3>
                  <p className="text-sm text-fg-muted">{a.body}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Marketplace teaser ---------------- */
export function AgentsTeaser({ t }: { t: Dict }) {
  return (
    <section id="agents" className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading eyebrow={t.agentsTeaser.eyebrow} title={t.agentsTeaser.title} sub={t.agentsTeaser.sub} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENT_PROFILES.map((a, i) => (
          <Reveal key={a.slug} delay={(i % 3) * 0.06}>
            <Card className="h-full">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl">{a.avatar}</span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  style={{ color: a.accent, borderColor: `${a.accent}55` }}
                >
                  {a.price}
                </span>
              </div>
              <h3 className="font-semibold text-fg">{a.name}</h3>
              <p className="mt-1 text-xs text-fg-faint">{a.specialty}</p>
              <p className="mt-2 line-clamp-3 text-sm text-fg-muted">{a.testingStyle}</p>
            </Card>
          </Reveal>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/marketplace" className="text-sm font-medium text-matrix hover:text-matrix-bright">
          {t.agentsTeaser.browse}
        </Link>
      </div>
    </section>
  );
}
