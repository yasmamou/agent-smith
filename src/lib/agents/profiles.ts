import type { AgentProfile } from "@/types";

/**
 * Agent marketplace catalogue.
 * Used by the seed script and rendered directly by the marketplace page
 * (so it works even before the DB is provisioned).
 */
export const AGENT_PROFILES: AgentProfile[] = [
  {
    slug: "agent-smith-core",
    name: "Agent Smith",
    tagline: "Your AI QA agent after every vibe-coded deploy",
    specialty: "Full-spectrum autonomous QA",
    testingStyle:
      "Crawls the whole surface, stress-tests flows, and compiles a single actionable report. The baseline every audit runs on.",
    price: "Included",
    priceNote: "in every plan",
    rating: 4.9,
    reviews: 1284,
    accent: "#18e26a",
    avatar: "🕶️",
    premium: false,
    focus: ["functional", "ui", "ux", "security", "performance"],
  },
  {
    slug: "agent-mouni",
    name: "Agent Mouni",
    tagline: "UX & quality engineering, human-in-the-loop",
    specialty: "UX / QE with human review",
    testingStyle:
      "Pairs automated exploration with heuristic UX scoring — onboarding clarity, friction points, empty states and microcopy.",
    price: "€12",
    priceNote: "per deep audit",
    rating: 4.8,
    reviews: 342,
    accent: "#4dff95",
    avatar: "🧭",
    premium: true,
    focus: ["ux", "ui"],
  },
  {
    slug: "agent-karim",
    name: "Agent Karim",
    tagline: "Security-minded QA, zero aggression",
    specialty: "Passive security review",
    testingStyle:
      "Inspects headers, cookies, CSP, auth surfaces and error leakage. Strictly non-destructive — no brute force, no exploitation.",
    price: "€15",
    priceNote: "per deep audit",
    rating: 4.9,
    reviews: 218,
    accent: "#3dc5ff",
    avatar: "🛡️",
    premium: true,
    focus: ["security", "functional"],
  },
  {
    slug: "agent-lina",
    name: "Agent Lina",
    tagline: "Mobile-first QA across viewports",
    specialty: "Responsive & mobile QA",
    testingStyle:
      "Replays flows across phone, tablet and desktop viewports. Catches tap targets, overflow, viewport bugs and layout shift.",
    price: "€10",
    priceNote: "per deep audit",
    rating: 4.7,
    reviews: 176,
    accent: "#ffd23d",
    avatar: "📱",
    premium: true,
    focus: ["ui", "ux", "performance"],
  },
  {
    slug: "agent-theo",
    name: "Agent Theo",
    tagline: "Conversion & funnel QA",
    specialty: "Funnel / conversion QA",
    testingStyle:
      "Walks signup, checkout and activation funnels end-to-end, flagging drop-off traps, dead CTAs and trust gaps.",
    price: "€14",
    priceNote: "per deep audit",
    rating: 4.8,
    reviews: 203,
    accent: "#ff8a3d",
    avatar: "📈",
    premium: true,
    focus: ["ux", "functional"],
  },
];

export function getAgentProfile(slug: string) {
  return AGENT_PROFILES.find((a) => a.slug === slug);
}
