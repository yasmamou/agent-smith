import type { CrawlResult } from "@/lib/audit/crawl-types";
import type { SiteModel, StrategyResult, Finding } from "@/types";
import { aiComplete, parseAiJson, aiEnabled } from "@/lib/ai/provider";

/**
 * Strategic platform advisor — the "Agent Néo" brain. Goes beyond technical bugs:
 * reads the product through the inferred site-model + what the crawl actually saw,
 * and proposes product/business levers (positioning, activation, retention,
 * monetization, acquisition, trust, analytics). AI-driven (Claude preferred);
 * returns null when no AI key is configured.
 */
export async function generateStrategy(
  crawl: CrawlResult,
  siteModel: SiteModel | null,
  findings: Finding[]
): Promise<StrategyResult | null> {
  if (!aiEnabled()) return null;

  const pages = crawl.pages.slice(0, 8).map((p) => `- ${p.url} — "${p.title}"`).join("\n");
  const uxSignals = findings
    .filter((f) => f.category === "ux" || f.category === "functional")
    .slice(0, 8)
    .map((f) => `- [${f.severity}] ${f.title}`)
    .join("\n");

  const langHint = detectLanguages(crawl);

  const system =
    "Tu es un partner produit/growth senior (style YC). Tu analyses une plateforme web AU-DELÀ des bugs techniques. Tu travailles avec une CHECKLIST de dimensions et tu passes le produit en revue sur CHACUNE, en ne retenant que celles où il y a un vrai levier. Sois concret, spécifique au produit observé, priorise par impact. Pas de généralités creuses.";

  const prompt = `Analyse stratégique de ce produit, dimension par dimension.

MODÈLE DU SITE (inféré):
- type: ${siteModel?.appType ?? "?"}
- but: ${siteModel?.purpose ?? "?"}
- audience: ${siteModel?.audience ?? "?"}
- parcours principal: ${siteModel?.primaryWorkflow?.name ?? "?"} — ${siteModel?.primaryWorkflow?.goal ?? ""}

PAGES OBSERVÉES:
${pages || "(aucune)"}

SIGNAUX UX/FONCTIONNELS RELEVÉS:
${uxSignals || "(aucun)"}

INDICE LANGUE/I18N: ${langHint}

CHECKLIST DES DIMENSIONS À PASSER EN REVUE (évalue chacune, retiens celles à fort levier) :
- positioning (proposition de valeur, clarté du message, segment ciblé)
- activation (time-to-wow, onboarding, premier succès)
- retention (raison de revenir, boucles, cycle de vie)
- monetization (modèle, pricing, paywall, willingness-to-pay)
- acquisition (SEO/découvrabilité, viralité, partage, référencement)
- i18n (LANGUE & internationalisation : le produit est-il mono-langue ? rate-t-il des marchés faute de traduction / de détection de locale ?)
- accessibility (a11y : contraste, labels, navigation clavier, lecteurs d'écran)
- trust (preuve sociale, crédibilité, transparence, sécurité perçue)
- legal (RGPD/GDPR, mentions légales, cookies, confidentialité)
- mobile (expérience responsive, tap targets)
- analytics (mesure du funnel, instrumentation)
- support (aide, FAQ, contact, documentation)
- performance (budget de perf, vitesse perçue)

Réponds en JSON STRICT, en français:
{
  "thesis": "un paragraphe: lecture stratégique du produit (où se joue la croissance)",
  "topPriority": "LE move à plus fort levier, en une phrase actionnable",
  "recommendations": [
    {
      "title": "titre court",
      "lever": "<une dimension de la checklist ci-dessus>",
      "observation": "ce qui a été observé qui motive la reco",
      "action": "action concrète à faire",
      "impact": "high|medium|low"
    }
  ]
}
Donne 6 à 10 recommandations couvrant des dimensions VARIÉES (n'oublie pas i18n, accessibilité et légal s'ils sont pertinents), triées par impact décroissant.`;

  const raw = await aiComplete(prompt, { system, json: true, maxTokens: 2200 });
  const parsed = parseAiJson<StrategyResult | null>(raw, null);
  if (!parsed || !Array.isArray(parsed.recommendations) || !parsed.recommendations.length) return null;

  // sanitize
  parsed.recommendations = parsed.recommendations.slice(0, 10).map((r) => ({
    title: String(r.title || "").slice(0, 120),
    lever: String(r.lever || "positioning"),
    observation: String(r.observation || "").slice(0, 400),
    action: String(r.action || "").slice(0, 400),
    impact: (["high", "medium", "low"].includes(r.impact) ? r.impact : "medium") as "high" | "medium" | "low",
  }));
  parsed.thesis = String(parsed.thesis || "").slice(0, 800);
  parsed.topPriority = String(parsed.topPriority || "").slice(0, 300);
  return parsed;
}

/** Best-effort i18n signal for the strategy prompt (no reliable lang attr in the crawl). */
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
  return "aucun signal multilingue détecté (probablement mono-langue) — évaluer la détection de locale + la traduction pour ouvrir d'autres marchés";
}
