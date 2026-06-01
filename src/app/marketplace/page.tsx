import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { CtaFooter } from "@/components/landing/showcase";
import { MarketAgentCard } from "@/components/marketplace/agent-card";
import { AGENT_PROFILES } from "@/lib/agents/profiles";

export const metadata: Metadata = {
  title: "Agent Marketplace — Agent Smith",
  description: "Hire specialised QA agents tuned for UX, security, mobile and conversion.",
};

export default function MarketplacePage() {
  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-matrix">
            Agent marketplace
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-fg">Hire specialised QA agents</h1>
          <p className="mt-3 text-fg-muted">
            Every audit runs on Agent Smith Core. Plug in named agents tuned for a specific dimension
            of quality — UX, security, mobile or conversion.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_PROFILES.map((agent) => (
            <MarketAgentCard key={agent.slug} agent={agent} />
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-fg-faint">
          Marketplace is in preview — premium agents are billed per deep audit. Core is always free.
        </p>
      </section>
      <CtaFooter />
    </main>
  );
}
