import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { ScoreBar } from "@/components/score-ring";
import { SeverityBadge } from "@/components/severity-badge";
import { PricingTable } from "@/components/pricing-table";
import { CopyButton } from "@/components/copy-button";
import { Logo } from "@/components/logo";

const SAMPLE_PROMPT = `You are a senior engineer working on the project behind my-saas.app.
An automated QA audit (Agent Smith) found the issues below. Fix them WITHOUT
breaking existing functionality, in priority order.

### 1. [HIGH · security] Missing 5 recommended security headers
- Fix: add CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.

### 2. [HIGH · functional] JavaScript console errors on /dashboard
- Fix: guard undefined access in the projects list; wrap the fetch in try/catch.

### 3. [MEDIUM · performance] /dashboard loads in 4.1s
- Fix: code-split the chart bundle and lazy-load below-the-fold widgets.`;

export function SampleReport() {
  return (
    <section id="sample" className="border-y border-border/60 bg-bg-elevated/30 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-matrix">Sample report</p>
          <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            The report you actually act on
          </h2>
          <p className="mt-3 text-fg-muted">
            Scores per dimension, prioritised findings, and a fix prompt engineered for your AI IDE.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="glass-bright h-full rounded-2xl p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-fg-faint">Target</p>
                  <p className="font-mono text-sm text-fg">my-saas.app</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-matrix text-glow">74</p>
                  <p className="text-[10px] uppercase tracking-wider text-fg-faint">/ 100</p>
                </div>
              </div>
              <div className="space-y-3">
                <ScoreBar label="Functional" score={62} />
                <ScoreBar label="UI" score={81} />
                <ScoreBar label="UX" score={88} />
                <ScoreBar label="Security" score={58} />
                <ScoreBar label="Performance" score={73} />
              </div>
              <div className="mt-6 space-y-2.5">
                {[
                  { s: "high" as const, t: "Missing security headers (CSP, HSTS)" },
                  { s: "high" as const, t: "Console errors on /dashboard" },
                  { s: "medium" as const, t: "/dashboard loads in 4.1s" },
                  { s: "low" as const, t: "Low-contrast text on /pricing" },
                ].map((f) => (
                  <div
                    key={f.t}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg/40 px-3 py-2"
                  >
                    <SeverityBadge severity={f.s} />
                    <span className="text-sm text-fg-muted">{f.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="glass-bright flex h-full flex-col rounded-2xl p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-fg">Fix prompt for Claude Code / Cursor</h3>
                <CopyButton text={SAMPLE_PROMPT} />
              </div>
              <pre className="flex-1 overflow-auto rounded-lg border border-border bg-bg/60 p-4 font-mono text-[12px] leading-relaxed text-fg-muted">
                {SAMPLE_PROMPT}
              </pre>
              <p className="mt-3 text-xs text-fg-faint">
                Paste straight into your AI IDE and let it fix the issues in one pass.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-matrix">Pricing</p>
        <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Start free. Scale when it ships value.
        </h2>
        <p className="mt-3 text-fg-muted">No credit card to try. Cancel anytime.</p>
      </div>
      <PricingTable />
    </section>
  );
}

export function CtaFooter() {
  return (
    <>
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="glass-bright relative overflow-hidden rounded-3xl px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              Ship it. Then let Agent Smith test it.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-fg-muted">
              Your next deploy deserves a QA pass. Run your first audit in under a minute.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-matrix px-7 font-semibold text-black shadow-[0_0_30px_-6px_var(--color-matrix)] transition-colors hover:bg-matrix-bright"
            >
              Run your first audit
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 sm:flex-row">
          <Logo />
          <p className="text-xs text-fg-faint">
            © {new Date().getFullYear()} Agent Smith. Test only sites you own or are authorized to test.
          </p>
          <div className="flex gap-5 text-xs text-fg-muted">
            <Link href="/marketplace" className="hover:text-fg">Marketplace</Link>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
            <a href="#pricing" className="hover:text-fg">Pricing</a>
          </div>
        </div>
      </footer>
    </>
  );
}
