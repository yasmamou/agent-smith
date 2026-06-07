import type { AuditConfig, AuditReport, Finding, ScreenshotRef } from "@/types";
import type { CrawlResult } from "./crawl-types";
import { mockCrawl } from "./mock";
import { ANALYSIS_AGENTS } from "@/lib/agents/registry";
import {
  computeScores,
  toPageVisits,
  buildFixPrompt,
  buildUxSuggestions,
  buildTimeline,
  buildMarkdown,
} from "./report";
import { generateSummary } from "@/lib/ai/anthropic";
import { makeScreenshot } from "./screenshots";
import { formatDate } from "@/lib/utils";
import { aiEnabled } from "@/lib/ai/provider";
import type { SiteModel, WorkflowResult } from "@/types";

async function crawl(config: AuditConfig): Promise<CrawlResult> {
  const forced = process.env.AUDIT_ENGINE?.toLowerCase();
  const hasRemoteBrowser = !!(process.env.BROWSER_CDP_URL || process.env.BROWSERBASE_API_KEY);
  // A configured remote browser (self-hosted CDP or Browserbase) overrides a
  // lingering mock flag.
  if (forced === "mock" && !hasRemoteBrowser) return mockCrawl(config);

  // Try the REAL browser engine everywhere (local: full playwright; serverless:
  // playwright-core + @sparticuz/chromium). Fall back to the mock crawl on any
  // failure so an audit always completes.
  try {
    const { playwrightCrawl } = await import("./playwright-runner");
    const result = await playwrightCrawl(config);
    if (result.reachable && result.pages.length) return result;
    // unreachable with the real engine — keep the real result so we report it
    if (forced === "playwright") return result;
  } catch (err) {
    if (forced === "playwright") throw err;
    // otherwise fall through to the deterministic mock
  }
  return mockCrawl(config);
}

function buildScreenshots(crawl: CrawlResult, findings: Finding[]): ScreenshotRef[] {
  const shots: ScreenshotRef[] = [];
  const pages = crawl.pages.slice(0, 4);
  for (const p of pages) {
    const issue = findings.find((f) => f.evidence.includes(p.url));
    const isForm = p.forms > 0;
    const isError = p.statusCode >= 400;
    shots.push(
      makeScreenshot({
        url: p.url,
        title: p.title,
        variant: isError ? "error" : isForm ? "form" : "default",
        annotation: issue
          ? `${issue.severity.toUpperCase()}: ${issue.title}`
          : isError
            ? `HTTP ${p.statusCode}`
            : undefined,
        annotationColor: isError ? "#ff4d4d" : "#ff8a3d",
      })
    );
  }
  // a mobile shot for good measure
  if (crawl.pages[0]) {
    shots.push(
      makeScreenshot({
        url: crawl.pages[0].url,
        title: `${crawl.pages[0].title} (mobile)`,
        variant: "mobile",
        annotation: crawl.pages[0].hasViewportMeta ? undefined : "Missing viewport meta",
        annotationColor: "#ff8a3d",
      })
    );
  }
  return shots;
}

export interface RunAuditOptions {
  /** active security probe ids to run (sql-injection, xss-reflected) */
  activeCheckIds?: string[];
  /** restrict findings to these categories (custom-agent focus) */
  categoryFilter?: Set<import("@/types").Category>;
  /** extra focus instructions for the AI summary (custom agent) */
  aiInstructions?: string;
  /** set false to skip the agentic workflow test (e.g. lighter custom audits) */
  runWorkflow?: boolean;
  /** test credentials → write-path workflow (the agent logs in first) */
  creds?: { email: string; password: string };
  /** allow form writes without login (owned site, no auth) */
  allowWrites?: boolean;
  /** also produce a strategic platform analysis (Agent Néo / strategist) */
  strategy?: boolean;
  /** advisor lens: strategy (Néo) | sales (Trinity) | design (Oracle) | ceo (Morpheus) */
  advisor?: "strategy" | "sales" | "design" | "ceo" | "seo";
}

/**
 * runAudit — the core entry point. Orchestrates crawl → agents → scoring →
 * report. Always returns a complete AuditReport (never throws for normal
 * audit conditions; unreachable targets are reported as findings).
 */
export async function runAudit(config: AuditConfig, opts: RunAuditOptions = {}): Promise<AuditReport> {
  const crawlResult = await crawl(config);

  // Run every analysis agent over the crawl.
  let findings: Finding[] = [];
  for (const agent of ANALYSIS_AGENTS) {
    try {
      findings.push(...agent.run(crawlResult));
    } catch {
      // an agent failing must never sink the whole audit
    }
  }

  // Active security probes (custom agents only — authorization required).
  if (opts.activeCheckIds?.length) {
    try {
      const { runActiveChecks } = await import("@/lib/agents/active-checks");
      findings.push(...(await runActiveChecks(crawlResult, opts.activeCheckIds)));
    } catch {
      /* active checks must never sink the audit */
    }
  }

  // Custom-agent focus: keep only findings in the agent's categories.
  if (opts.categoryFilter && opts.categoryFilter.size) {
    findings = findings.filter((f) => opts.categoryFilter!.has(f.category));
  }

  // ---- Intelligence layer: understand the app + TEST its primary workflow ----
  // Only on a real browser engine with AI configured (never on the mock).
  let siteModel: SiteModel | null = null;
  let workflow: WorkflowResult | null = null;
  if (crawlResult.engine === "playwright" && aiEnabled() && opts.runWorkflow !== false) {
    try {
      const { inferSiteModel } = await import("./site-model");
      siteModel = await inferSiteModel(crawlResult);
      if (siteModel) {
        const { runWorkflowTest } = await import("@/lib/journey/workflow-runner");
        workflow = await runWorkflowTest(config.targetUrl, siteModel, { creds: opts.creds, allowWrites: opts.allowWrites });
      }
    } catch {
      /* the intelligence layer must never sink the core audit */
    }
  }

  // ---- Advisor layer (Néo strategy / Trinity sales / Oracle design) ----
  let strategy: import("@/types").StrategyResult | null = null;
  const advisorLens = opts.advisor ?? (opts.strategy ? "strategy" : undefined);
  if (advisorLens && aiEnabled() && crawlResult.engine === "playwright") {
    try {
      const { generateAdvice } = await import("@/lib/strategy/advisor");
      strategy = await generateAdvice(advisorLens, crawlResult, siteModel, findings);
    } catch {
      /* advisor is additive — never sink the audit */
    }
  }

  const scores = computeScores(findings);
  // Workflow-health: a blocked/failed primary workflow drags the overall score
  // (a site can be "well built" yet not actually work). Skipped = no effect.
  if (workflow && workflow.status !== "skipped") {
    workflow.health = workflow.status === "pass" ? 100 : workflow.status === "blocked" ? 60 : 15;
    scores.overall = Math.round(scores.overall * 0.7 + workflow.health * 0.3);
  }
  const pages = toPageVisits(crawlResult);
  const uxSuggestions = buildUxSuggestions(findings);
  const fixPrompt = buildFixPrompt(findings, config);
  const timeline = buildTimeline(crawlResult, findings);
  const screenshots = buildScreenshots(crawlResult, findings);
  const focus = [
    opts.aiInstructions,
    siteModel ? `Type d'app : ${siteModel.appType}. Workflow principal : ${siteModel.primaryWorkflow.name}.` : "",
    workflow ? `Test du workflow « ${workflow.goal} » : ${workflow.status}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  let summary = await generateSummary(findings, scores, config, focus || undefined);
  // Honesty: never present simulated results as real.
  if (crawlResult.engine === "mock") {
    summary =
      "⚠️ AUDIT SIMULÉ — le navigateur réel était indisponible (quota/échec), ces résultats sont générés de façon déterministe et NE reflètent PAS le site réel. " +
      summary;
  }
  const date = formatDate(new Date());

  const reportMarkdown = buildMarkdown({
    config,
    scores,
    summary,
    findings,
    uxSuggestions,
    pages,
    fixPrompt,
    engine: crawlResult.engine,
    date,
  });

  return {
    summary,
    scores,
    findings,
    uxSuggestions,
    securityFindings: findings.filter((f) => f.category === "security"),
    performanceFindings: findings.filter((f) => f.category === "performance"),
    pagesVisited: pages,
    screenshots,
    timeline,
    fixPrompt,
    reportMarkdown,
    engine: crawlResult.engine,
    siteModel,
    workflow,
    strategy,
  };
}
