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

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-matrix">{eyebrow}</p>
      <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-fg-muted">{sub}</p>}
    </div>
  );
}

/* ---------------- How it works ---------------- */
export function HowItWorks() {
  const steps = [
    {
      icon: GitBranch,
      title: "Paste your URL",
      body: "Drop the link to your deployed app. Add optional login, IP/API-key whitelist notes and special instructions.",
    },
    {
      icon: Zap,
      title: "Agents go to work",
      body: "A swarm of QA agents explores pages, clicks buttons, tests forms and records every error, slow load and weak spot.",
    },
    {
      icon: FileText,
      title: "Get an actionable report",
      body: "Scores, prioritised findings, screenshots, UX suggestions — and a fix prompt ready to paste into Claude Code or Cursor.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading
        eyebrow="How it works"
        title="From URL to fix prompt in one pass"
        sub="No setup, no scripts. Agent Smith treats every deploy like a release candidate."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <Card className="h-full">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg border border-matrix-dim/50 bg-matrix/5 text-matrix">
                  <s.icon className="size-5" />
                </span>
                <span className="font-mono text-xs text-fg-faint">0{i + 1}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-fg">{s.title}</h3>
              <p className="text-sm text-fg-muted">{s.body}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Features (the 7 agents) ---------------- */
export function Features() {
  const agents = [
    { icon: Compass, name: "ExplorerAgent", body: "Discovers pages, links, buttons and forms — maps your whole surface." },
    { icon: MousePointerClick, name: "FunctionalQAAgent", body: "Tests buttons & forms, catches console + network errors and bad routes." },
    { icon: Eye, name: "UXAgent", body: "Scores clarity, friction, onboarding, empty states and visual hierarchy." },
    { icon: Palette, name: "UIAgent", body: "Checks responsive, contrast, alt text and design consistency." },
    { icon: ShieldCheck, name: "SecurityLightAgent", body: "Passive review of headers, cookies, CSP & HTTPS. No aggressive scanning." },
    { icon: Gauge, name: "PerformanceAgent", body: "Measures load times, flags slow pages and failing network requests." },
    { icon: Wand2, name: "PromptFixAgent", body: "Turns every finding into one ready-to-paste fix prompt for your AI IDE." },
  ];
  return (
    <section id="features" className="border-y border-border/60 bg-bg-elevated/30 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="The agent swarm"
          title="Seven specialised agents, one report"
          sub="Each agent owns a dimension of quality. Together they cover what a human QA pass would — automatically."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a, i) => (
            <Reveal key={a.name} delay={(i % 3) * 0.06}>
              <Card className="h-full transition-colors hover:border-matrix-dim">
                <a.icon className="mb-3 size-6 text-matrix" />
                <h3 className="mb-1.5 font-mono text-sm font-semibold text-fg">{a.name}</h3>
                <p className="text-sm text-fg-muted">{a.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Marketplace teaser ---------------- */
export function AgentsTeaser() {
  return (
    <section id="agents" className="mx-auto max-w-6xl px-5 py-20">
      <SectionHeading
        eyebrow="Agent marketplace"
        title="Hire specialised agents on demand"
        sub="Beyond the core, plug in named agents tuned for UX, security, mobile or conversion."
      />
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
          Browse the full marketplace →
        </Link>
      </div>
    </section>
  );
}
