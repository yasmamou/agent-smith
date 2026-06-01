export interface Plan {
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    tagline: "Kick the tyres on a single deploy.",
    features: ["1 Quick Scan", "Core agent (Agent Smith)", "Functional + security-light", "Markdown export"],
    cta: "Start free",
  },
  {
    name: "Starter",
    price: "€10",
    period: "/month",
    tagline: "For solo builders shipping weekly.",
    features: ["30 scans / month", "Standard + Deep Scan", "All 7 logical agents", "Fix prompt for Claude/Cursor", "Email support"],
    cta: "Choose Starter",
  },
  {
    name: "Pro",
    price: "€29",
    period: "/month",
    tagline: "For serious indie SaaS & small teams.",
    features: ["150 scans / month", "Up to 10 simulated agents", "Premium marketplace agents", "Priority queue", "Markdown + JSON export"],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "€99",
    period: "/month",
    tagline: "For teams treating QA as a system.",
    features: ["600 scans / month", "All premium agents included", "Shared workspace & history", "Scheduled re-audits", "Export + API access"],
    cta: "Choose Team",
  },
];
