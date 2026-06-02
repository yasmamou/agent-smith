import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/landing/navbar";
import { CtaFooter } from "@/components/landing/showcase";
import { MarketAgentCard } from "@/components/marketplace/agent-card";
import { CustomAgentCard } from "@/components/marketplace/custom-agent-card";
import { AGENT_PROFILES } from "@/lib/agents/profiles";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = {
  title: "Agent Marketplace — Agent Smith",
  description: "Hire specialised QA agents tuned for UX, security, mobile and conversion.",
};

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const session = await getSession();
  const customAgents = session
    ? await prisma.customAgent.findMany({ where: { userId: session.userId }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-6xl px-5 py-16">
        {session && (
          <div className="mb-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-fg">Tes agents</h2>
                <p className="text-sm text-fg-muted">Crée des agents sur mesure (cybersécurité, UX, QA…).</p>
              </div>
              <Link href="/dashboard/agents/new">
                <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-matrix px-4 text-sm font-semibold text-black">
                  <Plus className="size-4" /> Créer un agent
                </span>
              </Link>
            </div>
            {customAgents.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {customAgents.map((a) => (
                  <CustomAgentCard
                    key={a.id}
                    slug={a.slug}
                    name={a.name}
                    specialty={a.specialty}
                    description={a.description}
                    avatar={a.avatar}
                    accent={a.accent}
                    checks={JSON.parse(a.checks || "[]")}
                  />
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl px-6 py-10 text-center text-sm text-fg-muted">
                Aucun agent perso encore. Clique « Créer un agent » pour en bâtir un (ex. ton agent Cybersécurité).
              </div>
            )}
            <div className="matrix-divider my-12" />
          </div>
        )}
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
