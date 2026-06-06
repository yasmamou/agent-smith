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

  const system =
    "Tu es un partner produit/growth senior (style YC). Tu analyses une plateforme web AU-DELÀ des bugs techniques : positionnement, proposition de valeur, activation (time-to-wow), rétention, monétisation, acquisition/viralité, confiance, mesure. Sois concret, spécifique au produit observé, et priorise par effet de levier. Pas de généralités creuses.";

  const prompt = `Analyse stratégique de ce produit.

MODÈLE DU SITE (inféré):
- type: ${siteModel?.appType ?? "?"}
- but: ${siteModel?.purpose ?? "?"}
- audience: ${siteModel?.audience ?? "?"}
- parcours principal: ${siteModel?.primaryWorkflow?.name ?? "?"} — ${siteModel?.primaryWorkflow?.goal ?? ""}

PAGES OBSERVÉES:
${pages || "(aucune)"}

SIGNAUX UX/FONCTIONNELS RELEVÉS:
${uxSignals || "(aucun)"}

Réponds en JSON STRICT, en français:
{
  "thesis": "un paragraphe: lecture stratégique du produit (où se joue la croissance)",
  "topPriority": "LE move à plus fort levier, en une phrase actionnable",
  "recommendations": [
    {
      "title": "titre court",
      "lever": "positioning|activation|retention|monetization|acquisition|trust|analytics",
      "observation": "ce qui a été observé qui motive la reco",
      "action": "action concrète à faire",
      "impact": "high|medium|low"
    }
  ]
}
Donne 5 à 8 recommandations, triées par impact décroissant.`;

  const raw = await aiComplete(prompt, { system, json: true, maxTokens: 1600 });
  const parsed = parseAiJson<StrategyResult | null>(raw, null);
  if (!parsed || !Array.isArray(parsed.recommendations) || !parsed.recommendations.length) return null;

  // sanitize
  parsed.recommendations = parsed.recommendations.slice(0, 8).map((r) => ({
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
