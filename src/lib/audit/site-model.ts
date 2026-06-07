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

  // The actual visible text of the entry/home page — THE signal for what the
  // product really is (without it the model guesses from the domain name).
  const homeText = (crawl.pages.find((p) => p.textExcerpt && p.textExcerpt.length > 40)?.textExcerpt || "").slice(0, 900);

  const prompt =
    `Tu analyses un site web pour en déduire sa nature et son parcours utilisateur principal.\n` +
    `Hôte : ${safeHost(crawl.target)}\nPages observées :\n${snapshot}\n\n` +
    `CONTENU RÉEL DE LA PAGE D'ACCUEIL (texte visible) :\n"""${homeText || "(aucun texte exploitable)"}"""\n\n` +
    `RÈGLE ABSOLUE : déduis la nature du produit UNIQUEMENT à partir du contenu réel ci-dessus, jamais du nom de domaine ni d'une supposition. Si le contenu est insuffisant, mets appType="indéterminé". N'invente jamais un secteur.\n\n` +
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
