import type { CrawlResult } from "@/lib/audit/crawl-types";
import type { SiteModel, StrategyResult, Finding } from "@/types";
import { aiComplete, parseAiJson, aiEnabled } from "@/lib/ai/provider";

/**
 * Advisor agents — AI brains that go BEYOND technical bugs. Three lenses share
 * one engine and one output shape (thesis / topPriority / recommendations):
 *   - strategy → Agent Néo   (product / growth)
 *   - sales    → Agent Trinity (conversion / sales funnel / CRO)
 *   - design   → Agent Oracle  (visual design / UI craft)
 * AI-driven (Claude preferred); returns null when no AI key is configured.
 */
export type AdvisorLens = "strategy" | "sales" | "design" | "ceo" | "seo" | "analytics";

interface LensConfig {
  agentName: string;
  system: string;
  task: string;
  checklist: string;
  levers: string;
}

const LENSES: Record<AdvisorLens, LensConfig> = {
  strategy: {
    agentName: "Agent Néo",
    system:
      "Tu es un partner produit/growth senior (style YC). Tu analyses une plateforme web AU-DELÀ des bugs techniques. Tu travailles avec une CHECKLIST de dimensions et tu passes le produit en revue sur CHACUNE, en ne retenant que celles où il y a un vrai levier. Sois concret, spécifique au produit observé, priorise par impact. Pas de généralités creuses.",
    task: "Analyse stratégique de ce produit, dimension par dimension.",
    checklist: `- positioning (proposition de valeur, clarté du message, segment ciblé)
- activation (time-to-wow, onboarding, premier succès)
- retention (raison de revenir, boucles, cycle de vie)
- monetization (modèle, pricing, paywall, willingness-to-pay)
- acquisition (SEO/découvrabilité, viralité, partage)
- i18n (LANGUE & internationalisation : mono-langue ? marchés ratés ?)
- accessibility (a11y : contraste, labels, clavier, lecteurs d'écran)
- trust (preuve sociale, crédibilité, transparence)
- legal (RGPD/GDPR, mentions légales, cookies, confidentialité)
- mobile (responsive, tap targets) · analytics (mesure du funnel) · support (aide, FAQ) · performance`,
    levers: "positioning|activation|retention|monetization|acquisition|i18n|accessibility|trust|legal|mobile|analytics|support|performance",
  },
  sales: {
    agentName: "Agent Trinity",
    system:
      "Tu es un expert CRO/sales (optimisation du taux de conversion) senior. Tu regardes une page/un site UNIQUEMENT sous l'angle VENTE : transformer un visiteur en lead puis en client. Tu donnes des recommandations concrètes et actionnables (« mets ça plutôt que ça », « ce tunnel plutôt que celui-là »), avec des idées de test A/B. Spécifique au produit, priorise par impact sur la conversion. Pas de blabla.",
    task: "Bilan SALES / CONVERSION (CRO) de ce site : où on perd des ventes et comment convertir plus.",
    checklist: `- hero-clarity (promesse claire en 5s : quoi, pour qui, bénéfice)
- cta (libellé, contraste, position, nombre, répétition ; un seul CTA primaire)
- social-proof (témoignages, logos, chiffres, avis, études de cas)
- trust (garanties, sécurité, « sans CB », réassurance, FAQ d'objections)
- funnel (étapes du tunnel : moins d'étapes = plus de conversion ; ordre valeur→friction)
- friction (formulaires trop longs, champs inutiles, signup prématuré)
- offer-pricing (présentation des prix, ancrage, plan recommandé, urgence/rareté honnête)
- value-prop (bénéfices vs fonctionnalités, avant/après, ROI)
- lead-capture (capter l'email tôt, lead magnet, retargeting)
- urgency (raisons d'agir maintenant, sans dark patterns)`,
    levers: "hero-clarity|cta|social-proof|trust|funnel|friction|offer-pricing|value-prop|lead-capture|urgency",
  },
  analytics: {
    agentName: "Agent Tank",
    system:
      "Tu es un expert mesure/analytics & growth-ops. Tu regardes si le produit SAIT qui sont ses utilisateurs et comment ils arrivent. Tu détectes l'absence d'instrumentation et tu dis EXACTEMENT quoi mesurer (pageviews, sources d'acquisition, funnel, conversions, rétention) et quel dashboard de visibilité construire. Termine toujours en proposant : « Agent Smith peut héberger ton dashboard de visibilité — ajoute le snippet ». Concret et priorisé.",
    task: "Audit de MESURE / VISIBILITÉ : qui sont les users, par où ils arrivent, qu'est-ce qui n'est pas mesuré, et quel dashboard construire.",
    checklist: `- instrumentation (y a-t-il un tracker ? pageviews, events ? sinon c'est l'aveugle)
- acquisition (sources/canaux : SEO, social, referral, direct — sait-on d'où viennent les users ?)
- funnel (étapes visite → signup → activation → paiement ; où mesurer le drop-off)
- conversions (events clés à tracker : signup, pay, action de valeur)
- personas (segments d'utilisateurs, pays, appareil — qui sont-ils vraiment ?)
- retention (nouveaux vs récurrents, cohortes)
- north-star (LA métrique à suivre en continu)
- dashboard (quel tableau de bord de visibilité monter ; proposer celui d'Agent Smith)`,
    levers: "instrumentation|acquisition|funnel|conversions|personas|retention|north-star|dashboard",
  },
  seo: {
    agentName: "Agent Link",
    system:
      "Tu es un expert SEO + GEO/AEO senior. Tu couvres DEUX fronts : (1) SEO Google classique (mots-clés, on-page, technique, contenu, mots-clés des concurrents) et (2) GEO/AEO = être cité/recommandé par les LLM (ChatGPT, Claude, Perplexity, Google AI Overviews) via llms.txt, données structurées et contenu citable. Sois concret et actionnable. Pour les mots-clés/concurrents, propose des cibles précises (primaires, secondaires, longue traîne) en notant que ce sont des ESTIMATIONS (brancher une API SEO pour les volumes réels).",
    task: "Audit SEO + GEO/AEO de ce site : on-page, technique, mots-clés/concurrents, et visibilité dans les réponses des LLM.",
    checklist: `- onpage (title 50-60 car., meta description 150-160, H1 unique, hiérarchie Hn)
- keywords (mots-clés cibles primaires/secondaires/longue traîne pour ce produit)
- competitors (sur quels mots-clés les concurrents se positionnent ; angles à prendre)
- content (pages/articles à créer pour capter l'intention de recherche ; content gaps)
- technical (robots.txt, sitemap.xml, canonical, vitesse, mobile, indexabilité)
- structured-data (JSON-LD schema.org : Organization, Product, FAQ, SoftwareApplication)
- social-meta (Open Graph + Twitter cards pour le partage)
- geo-aeo (être cité par les LLM : llms.txt, réponses factuelles claires, autorité, mentions)
- international (hreflang si multilingue)`,
    levers: "onpage|keywords|competitors|content|technical|structured-data|social-meta|geo-aeo|international",
  },
  ceo: {
    agentName: "Agent Morpheus",
    system:
      "Tu es le CEO/fondateur de ce produit (vision exécutive). Tu ne listes PAS des tâches : tu ARBITRES. Tu décides où mettre l'énergie ce trimestre, ce qu'il faut construire / tuer / reporter, où sont le plus gros risque et le plus gros pari. Tu raisonnes business : marché, avantage défendable (moat), unit economics, focus. Tranché, peu d'items, à fort enjeu. Pas de généralités.",
    task: "Revue CEO de ce produit : LA priorité du trimestre, les arbitrages, les risques et le pari à faire.",
    checklist: `- focus (LA chose à faire ce trimestre ; ce qu'on arrête / reporte)
- market (taille, segment à posséder, timing)
- moat (avantage défendable, ce qui est dur à copier, données/réseau)
- business-model (unit economics, marge, CAC/LTV, pricing power)
- risk (le risque #1 qui peut tuer le produit ; dépendances)
- bet (le pari à fort upside à tenter maintenant)
- build-vs-kill (fonctionnalités à doubler / à supprimer)
- team-ops (ce qu'il faut pour exécuter : recrutement, partenariats)
- north-star (LA métrique qui compte)`,
    levers: "focus|market|moat|business-model|risk|bet|build-vs-kill|team-ops|north-star",
  },
  design: {
    agentName: "Agent Oracle",
    system:
      "Tu es un directeur artistique / designer UI senior (niveau Linear, Stripe, Vercel). Tu juges le CRAFT visuel d'une interface et tu proposes des améliorations graphiques concrètes : hiérarchie, espacement/rythme, typographie, palette/contraste, cohérence, profondeur, états, motion. Donne des recommandations précises et applicables (valeurs, échelles, do/don't). Spécifique à la page observée.",
    task: "Critique DESIGN / UI de ce site et propositions graphiques concrètes pour un rendu plus pro.",
    checklist: `- visual-hierarchy (ce que l'œil voit en premier ; tailles/poids/contraste de texte)
- spacing (rythme vertical, densité, marges cohérentes, échelle d'espacement)
- typography (échelle typographique, paires de polices, line-height, longueur de ligne)
- color (palette, accent unique, contraste AA/AAA, usage du gris)
- consistency (composants, rayons, ombres, boutons homogènes)
- depth (profondeur, élévation, glassmorphism/ombres dosées)
- imagery (illustrations, captures, icônes cohérentes, vides illustrés)
- states (hover/focus/active/empty/loading soignés)
- motion (micro-interactions discrètes, transitions)
- responsive-polish (rendu mobile, breakpoints, tap targets)`,
    levers: "visual-hierarchy|spacing|typography|color|consistency|depth|imagery|states|motion|responsive-polish",
  },
};

export async function generateStrategy(
  crawl: CrawlResult,
  siteModel: SiteModel | null,
  findings: Finding[]
): Promise<StrategyResult | null> {
  return generateAdvice("strategy", crawl, siteModel, findings);
}

export async function generateAdvice(
  lens: AdvisorLens,
  crawl: CrawlResult,
  siteModel: SiteModel | null,
  findings: Finding[]
): Promise<StrategyResult | null> {
  if (!aiEnabled()) return null;
  const cfg = LENSES[lens] ?? LENSES.strategy;

  const pages = crawl.pages.slice(0, 8).map((p) => `- ${p.url} — "${p.title}"`).join("\n");
  const uxSignals = findings
    .filter((f) => f.category === "ux" || f.category === "functional" || f.category === "ui")
    .slice(0, 10)
    .map((f) => `- [${f.severity}/${f.category}] ${f.title}`)
    .join("\n");
  const langHint = detectLanguages(crawl);

  // For the SEO lens, gather REAL on-page/technical signals to ground the advice.
  let seoBlock = "";
  if (lens === "seo") {
    try {
      const { gatherSeoSignals, summarizeSeo } = await import("@/lib/seo/signals");
      const signals = await gatherSeoSignals(crawl.target);
      seoBlock = `\n\nSIGNAUX SEO/GEO RÉELS (observés):\n${summarizeSeo(signals)}`;
    } catch {
      /* signals are a bonus — proceed without them */
    }
  }

  const prompt = `${cfg.task}

MODÈLE DU SITE (inféré):
- type: ${siteModel?.appType ?? "?"}
- but: ${siteModel?.purpose ?? "?"}
- audience: ${siteModel?.audience ?? "?"}
- parcours principal: ${siteModel?.primaryWorkflow?.name ?? "?"} — ${siteModel?.primaryWorkflow?.goal ?? ""}

PAGES OBSERVÉES:
${pages || "(aucune)"}

SIGNAUX RELEVÉS (UX/UI/fonctionnel):
${uxSignals || "(aucun)"}

INDICE LANGUE/I18N: ${langHint}${seoBlock}

CHECKLIST À PASSER EN REVUE (évalue chacune, retiens celles à fort levier) :
${cfg.checklist}

Réponds en JSON STRICT, en français:
{
  "thesis": "un paragraphe: lecture d'ensemble sous cet angle",
  "topPriority": "LE move à plus fort levier, en une phrase actionnable",
  "recommendations": [
    {
      "title": "titre court",
      "lever": "<une dimension de la checklist>",
      "observation": "ce qui a été observé qui motive la reco",
      "action": "action concrète à faire (precise, « mets X plutôt que Y »)",
      "impact": "high|medium|low"
    }
  ]
}
Donne 6 à 10 recommandations couvrant des dimensions VARIÉES, triées par impact décroissant.
Dimensions autorisées pour "lever": ${cfg.levers}.`;

  const raw = await aiComplete(prompt, { system: cfg.system, json: true, maxTokens: 2200 });
  const parsed = parseAiJson<StrategyResult | null>(raw, null);
  if (!parsed || !Array.isArray(parsed.recommendations) || !parsed.recommendations.length) return null;

  parsed.recommendations = parsed.recommendations.slice(0, 10).map((r) => ({
    title: String(r.title || "").slice(0, 120),
    lever: String(r.lever || cfg.levers.split("|")[0]),
    observation: String(r.observation || "").slice(0, 400),
    action: String(r.action || "").slice(0, 400),
    impact: (["high", "medium", "low"].includes(r.impact) ? r.impact : "medium") as "high" | "medium" | "low",
  }));
  parsed.thesis = String(parsed.thesis || "").slice(0, 800);
  parsed.topPriority = String(parsed.topPriority || "").slice(0, 300);
  parsed.lens = lens;
  parsed.agentName = cfg.agentName;
  return parsed;
}

/** Best-effort i18n signal for the prompt (no reliable lang attr in the crawl). */
function detectLanguages(crawl: CrawlResult): string {
  const cl = crawl.headers["content-language"];
  const langPaths = new Set<string>();
  for (const p of crawl.pages) {
    const m = p.url.match(/\/([a-z]{2})(?:[-_][a-z]{2})?(?:\/|$)/i);
    if (m && ["fr", "en", "es", "de", "it", "pt", "nl", "ar", "zh", "ja"].includes(m[1].toLowerCase())) {
      langPaths.add(m[1].toLowerCase());
    }
  }
  if (cl) return `en-tête content-language="${cl}"${langPaths.size > 1 ? ` + chemins multilingues (${[...langPaths].join(", ")})` : ""}`;
  if (langPaths.size > 1) return `chemins multilingues détectés (${[...langPaths].join(", ")}) — semble multilingue`;
  return "aucun signal multilingue détecté (probablement mono-langue) — évaluer la détection de locale + la traduction";
}
