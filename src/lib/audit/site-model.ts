import type { SiteModel } from "@/types";
import type { CrawlResult } from "./crawl-types";
import { aiEnabled, aiComplete, parseAiJson } from "@/lib/ai/provider";
import { safeHost } from "@/lib/utils";

/**
 * Infer WHAT the site is and its primary user workflow — one cheap LLM call on
 * data already collected by the crawl. This de-genericises the whole report:
 * findings, summary and the workflow test are anchored to the real app, not a
 * one-size-fits-all checklist. Returns null when AI is unavailable.
 */
export async function inferSiteModel(crawl: CrawlResult): Promise<SiteModel | null> {
  if (!aiEnabled() || !crawl.reachable || !crawl.pages.length) return null;

  const snapshot = crawl.pages
    .slice(0, 10)
    .map((p) => {
      const path = (() => {
        try {
          return new URL(p.url).pathname;
        } catch {
          return p.url;
        }
      })();
      return `- ${path} — "${(p.title || "").slice(0, 60)}" (forms:${p.forms}, buttons:${p.buttons})`;
    })
    .join("\n");

  const prompt =
    `Tu analyses un site web pour en déduire sa nature et son parcours utilisateur principal.\n` +
    `Hôte : ${safeHost(crawl.target)}\nPages observées :\n${snapshot}\n\n` +
    `Réponds STRICTEMENT en JSON (rien d'autre) avec ce schéma :\n` +
    `{"appType":"...","purpose":"phrase courte","audience":"...","primaryWorkflow":{"name":"...","goal":"ce qu'un utilisateur veut accomplir","entryPath":"un des chemins ci-dessus","successSignal":"un mot/texte court qui prouve que le but est atteint OU un fragment d'URL"}}\n` +
    `Le successSignal doit être un texte court réellement présent quand le but est atteint (ex: "Confirmation", "Merci", "/dashboard", "Résultat").`;

  const raw = await aiComplete(prompt, { json: true, maxTokens: 350 });
  const model = parseAiJson<SiteModel | null>(raw, null);
  if (!model || !model.primaryWorkflow) return null;
  // sanitise
  model.appType = (model.appType || "site web").slice(0, 60);
  model.purpose = (model.purpose || "").slice(0, 200);
  model.audience = (model.audience || "").slice(0, 80);
  model.primaryWorkflow.entryPath = (model.primaryWorkflow.entryPath || "/").slice(0, 120);
  model.primaryWorkflow.successSignal = (model.primaryWorkflow.successSignal || "").slice(0, 80);
  return model;
}
