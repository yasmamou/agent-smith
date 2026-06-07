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
    checks: ["console-errors","network-errors","broken-links","form-labels","bad-status","viewport-meta","contrast","img-alt","heading-hierarchy","empty-states","first-run","https","security-headers","insecure-cookies","tech-leak","slow-pages"],
    aiInstructions: "Audit complet et équilibré ; priorise les blocages fonctionnels et les risques de sécurité.",
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
    checks: ["heading-hierarchy","empty-states","first-run","viewport-meta","contrast","img-alt","form-labels"],
    aiInstructions: "Concentre-toi sur la clarté, la friction d'onboarding, les états vides et la microcopie. Ton orienté conversion/UX.",
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
    checks: ["https","security-headers","insecure-cookies","tech-leak","sql-injection","xss-reflected"],
    aiInstructions: "Priorité aux risques exploitables, fuites de données et durcissement des en-têtes. Sondes actives non destructives.",
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
    checks: ["viewport-meta","contrast","img-alt","slow-pages","first-run"],
    aiInstructions: "Optique mobile-first : responsive, contraste, lisibilité, performance perçue.",
  },
  {
    slug: "agent-neo",
    name: "Agent Néo",
    tagline: "Stratège produit & plateforme — au-delà des bugs",
    specialty: "Stratégie produit / growth",
    testingStyle:
      "Lit le produit comme un partner growth : proposition de valeur, activation (time-to-wow), rétention, monétisation, acquisition/viralité, confiance et mesure. Rend un plan priorisé par levier, pas une liste de bugs.",
    price: "€19",
    priceNote: "par analyse",
    rating: 4.9,
    reviews: 87,
    accent: "#b388ff",
    avatar: "🧠",
    premium: true,
    focus: ["ux", "functional"],
    checks: ["first-run", "empty-states", "heading-hierarchy", "form-labels", "broken-links"],
    aiInstructions:
      "Analyse stratégique produit/plateforme : positionnement, activation, rétention, monétisation, acquisition, confiance, mesure. Priorise par effet de levier.",
    advisor: "strategy",
  },
  {
    slug: "agent-link",
    name: "Agent Link",
    tagline: "SEO + GEO — Google & visibilité dans les LLM",
    specialty: "SEO / GEO-AEO (référencement)",
    testingStyle:
      "Audit SEO Google (mots-clés, on-page, technique, mots-clés des concurrents) ET GEO/AEO : être cité par les LLM (ChatGPT, Claude, Perplexity) via llms.txt, données structurées et contenu citable. Analyse les vrais signaux de la page.",
    price: "€19",
    priceNote: "par analyse",
    rating: 4.8,
    reviews: 52,
    accent: "#7c5cff",
    avatar: "🔗",
    premium: true,
    focus: ["functional", "ux"],
    checks: ["heading-hierarchy", "broken-links", "slow-pages"],
    aiInstructions: "Audit SEO + GEO/AEO : on-page, technique, mots-clés/concurrents, données structurées, llms.txt, citabilité par les LLM.",
    advisor: "seo",
  },
  {
    slug: "agent-morpheus",
    name: "Agent Morpheus",
    tagline: "Vision CEO — arbitrages & priorité du trimestre",
    specialty: "Direction / CEO (vision exécutive)",
    testingStyle:
      "Raisonne comme le fondateur : LA priorité du trimestre, ce qu'il faut construire/tuer/reporter, le marché, l'avantage défendable (moat), les unit economics, le risque #1 et le pari à fort upside. Tranché.",
    price: "€24",
    priceNote: "par analyse",
    rating: 5,
    reviews: 33,
    accent: "#c9a24b",
    avatar: "🕴️",
    premium: true,
    focus: ["functional", "ux"],
    checks: ["first-run", "empty-states", "broken-links"],
    aiInstructions: "Revue CEO : focus trimestriel, build/kill, marché, moat, unit economics, risque #1, pari, north-star.",
    advisor: "ceo",
  },
  {
    slug: "agent-trinity",
    name: "Agent Trinity",
    tagline: "Conversion & vente — le bilan CRO",
    specialty: "Sales / CRO (taux de conversion)",
    testingStyle:
      "Regarde le site sous l'angle VENTE : clarté du hero, CTA, preuve sociale, tunnel, friction, pricing, urgence. Dit concrètement « mets ça plutôt que ça » et propose des tests A/B pour convertir plus.",
    price: "€19",
    priceNote: "par analyse",
    rating: 4.9,
    reviews: 64,
    accent: "#ff5db1",
    avatar: "💎",
    premium: true,
    focus: ["ux", "functional"],
    checks: ["first-run", "empty-states", "heading-hierarchy", "broken-links"],
    aiInstructions: "Bilan conversion/CRO : hero, CTA, preuve sociale, tunnel, friction, pricing, urgence. Actionnable.",
    advisor: "sales",
  },
  {
    slug: "agent-oracle",
    name: "Agent Oracle",
    tagline: "Design & craft UI — niveau Linear/Stripe",
    specialty: "Design / UI (direction artistique)",
    testingStyle:
      "Juge le craft visuel : hiérarchie, espacement, typographie, palette/contraste, cohérence, profondeur, états et motion. Propose des améliorations graphiques précises (valeurs, échelles, do/don't).",
    price: "€19",
    priceNote: "par analyse",
    rating: 4.8,
    reviews: 41,
    accent: "#5bd1ff",
    avatar: "🔮",
    premium: true,
    focus: ["ui", "ux"],
    checks: ["contrast", "heading-hierarchy", "viewport-meta", "img-alt", "first-run"],
    aiInstructions: "Critique design/UI : hiérarchie, espacement, typo, couleur, cohérence, profondeur, états, motion. Précis et applicable.",
    advisor: "design",
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
    checks: ["first-run","empty-states","broken-links","form-labels","console-errors","network-errors"],
    aiInstructions: "Audit du funnel : pièges de drop-off, CTA morts, frictions d'inscription/checkout, signaux de confiance.",
  },
];

/** A preset → a custom-agent config shape (for running/forking). */
export function presetAgentConfig(slug: string) {
  const p = getAgentProfile(slug);
  if (!p) return null;
  return {
    name: p.name,
    specialty: p.focus[0] || "functional",
    checks: p.checks ?? [],
    aiInstructions: p.aiInstructions,
    accent: p.accent,
    avatar: p.avatar,
    advisor: p.advisor,
  };
}

export function getAgentProfile(slug: string) {
  return AGENT_PROFILES.find((a) => a.slug === slug);
}
